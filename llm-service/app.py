"""
FastAPI LLM Service using google/gemma-3-1b-it model
Provides local inference for fact extraction, bias analysis, and text generation
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any
import torch
# Disable Dynamo for Python 3.12+ compatibility  
try:
    import torch._dynamo
    torch._dynamo.config.suppress_errors = True
    torch._dynamo.reset()
except Exception:
    pass  # Ignore if Dynamo is not available

from transformers import AutoTokenizer, AutoModelForCausalLM, BitsAndBytesConfig
import json
import time
import os
from dotenv import load_dotenv
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize FastAPI app
app = FastAPI(
    title="Phato LLM Service",
    description="Local inference service using gemma-3-1b-it model",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request/Response models
class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = Field(default=512, ge=1, le=2048)
    temperature: float = Field(default=0.7, ge=0.1, le=2.0)
    top_p: float = Field(default=0.95, ge=0.1, le=1.0)
    top_k: int = Field(default=40, ge=1, le=100)
    stream: bool = False

class GenerateResponse(BaseModel):
    text: str
    tokens_generated: int
    time_taken: float
    model: str = "gemma-3-1b-it"

class FactExtractionRequest(BaseModel):
    text: str
    max_facts: int = Field(default=20, ge=1, le=50)

class Fact(BaseModel):
    statement: str
    type: str
    confidence: float
    entities: List[str]

class FactExtractionResponse(BaseModel):
    facts: List[Fact]
    processing_time: float

class BiasAnalysisRequest(BaseModel):
    text: str

class BiasAnalysisResponse(BaseModel):
    overall_bias: str
    confidence: float
    linguistic_indicators: List[str]
    emotional_tone: str
    processing_time: float

class VerifyFactRequest(BaseModel):
    fact: str
    sources: List[Dict[str, str]]

class VerifyFactResponse(BaseModel):
    status: str  # VERIFIED, DISPUTED, UNVERIFIED, FALSE
    confidence: float
    explanation: str
    conflicts: List[str]
    processing_time: float

class SummarizeRequest(BaseModel):
    text: str
    max_length: int = Field(default=200, ge=50, le=500)

class EntityExtractionRequest(BaseModel):
    text: str

class Entity(BaseModel):
    name: str
    type: str
    context: str

# Global model variables
model = None
tokenizer = None
device = None
executor = ThreadPoolExecutor(max_workers=4)

def load_model():
    """Load the gemma-3-1b-it model"""
    global model, tokenizer, device
    
    logger.info("Loading gemma-3-1b-it model...")
    
    # Force CPU to avoid Dynamo issues with Python 3.12
    device = torch.device("cpu")
    logger.info(f"Using device: {device} (forced CPU for Python 3.12 compatibility)")
    
    # Model configuration for memory efficiency
    model_id = "google/gemma-3-1b-it"
    
    # Load tokenizer with compatibility fix
    try:
        tokenizer = AutoTokenizer.from_pretrained(
            model_id, 
            use_fast=False  # Use slow tokenizer to avoid compatibility issues
        )
    except Exception as e:
        logger.warning(f"Failed to load fast tokenizer: {e}")
        logger.info("Trying with slow tokenizer...")
        tokenizer = AutoTokenizer.from_pretrained(
            model_id, 
            use_fast=False,
            legacy=True
        )
    
    # Load model for CPU (avoid Dynamo issues)
    logger.info("Loading model for CPU (avoiding Dynamo compilation)")
    model = AutoModelForCausalLM.from_pretrained(
        model_id,
        torch_dtype=torch.float32,
        device_map=None
    )
    model = model.to(device)
    
    model.eval()
    logger.info("Model loaded successfully!")
    
    # Test the model
    test_generation()

def test_generation():
    """Test the model with a simple generation"""
    try:
        test_prompt = "Summarize: The sun is a star."
        inputs = tokenizer(test_prompt, return_tensors="pt").to(device)
        
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=50,
                temperature=0.7,
                do_sample=True
            )
        
        response = tokenizer.decode(outputs[0], skip_special_tokens=True)
        logger.info(f"Test generation successful: {response[:100]}")
    except Exception as e:
        logger.error(f"Test generation failed: {e}")

@app.on_event("startup")
async def startup_event():
    """Initialize model on startup"""
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(executor, load_model)

@app.get("/")
async def root():
    """Health check endpoint"""
    return {
        "status": "online",
        "model": "gemma-3-1b-it",
        "device": str(device) if device else "not loaded",
        "endpoints": {
            "generate": "/generate",
            "extract_facts": "/extract_facts",
            "analyze_bias": "/analyze_bias",
            "verify_fact": "/verify_fact",
            "summarize": "/summarize",
            "extract_entities": "/extract_entities"
        }
    }

@app.post("/generate", response_model=GenerateResponse)
async def generate(request: GenerateRequest):
    """Generate text using the model"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    start_time = time.time()
    
    try:
        # Prepare input
        inputs = tokenizer(request.prompt, return_tensors="pt", truncation=True, max_length=2048).to(device)
        
        # Generate
        with torch.no_grad():
            outputs = model.generate(
                **inputs,
                max_new_tokens=request.max_tokens,
                temperature=request.temperature,
                top_p=request.top_p,
                top_k=request.top_k,
                do_sample=True,
                pad_token_id=tokenizer.eos_token_id
            )
        
        # Decode output
        generated_text = tokenizer.decode(outputs[0], skip_special_tokens=True)
        
        # Remove the input prompt from the output
        if generated_text.startswith(request.prompt):
            generated_text = generated_text[len(request.prompt):].strip()
        
        time_taken = time.time() - start_time
        
        return GenerateResponse(
            text=generated_text,
            tokens_generated=len(outputs[0]) - len(inputs.input_ids[0]),
            time_taken=time_taken
        )
        
    except Exception as e:
        logger.error(f"Generation error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/extract_facts", response_model=FactExtractionResponse)
async def extract_facts(request: FactExtractionRequest):
    """Extract facts from text"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    start_time = time.time()
    
    try:
        # Prepare prompt for fact extraction
        prompt = f"""Extract key facts from the following text. For each fact, provide:
- statement: The fact statement
- type: Type of fact (STATISTICAL, EVENT, QUOTE, CLAIM, RELATIONSHIP, TEMPORAL, GEOGRAPHIC, FINANCIAL, SCIENTIFIC)
- confidence: Confidence level (0.0-1.0)
- entities: Key entities mentioned

Text: {request.text[:1500]}

Respond with a JSON array of facts only:
[{{"statement": "...", "type": "...", "confidence": 0.9, "entities": ["..."]}}]

Facts:"""

        # Generate response
        gen_request = GenerateRequest(
            prompt=prompt,
            max_tokens=800,
            temperature=0.3  # Lower temperature for more consistent JSON
        )
        
        response = await generate(gen_request)
        
        # Parse JSON from response
        try:
            # Extract JSON from the response
            json_str = response.text.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:]
            if json_str.endswith("```"):
                json_str = json_str[:-3]
            
            facts_data = json.loads(json_str)
            
            # Ensure it's a list
            if not isinstance(facts_data, list):
                facts_data = [facts_data]
            
            # Convert to Fact objects
            facts = []
            for fact_data in facts_data[:request.max_facts]:
                facts.append(Fact(
                    statement=fact_data.get("statement", ""),
                    type=fact_data.get("type", "CLAIM"),
                    confidence=float(fact_data.get("confidence", 0.5)),
                    entities=fact_data.get("entities", [])
                ))
            
        except json.JSONDecodeError:
            logger.warning("Failed to parse JSON, returning empty facts")
            facts = []
        
        processing_time = time.time() - start_time
        
        return FactExtractionResponse(
            facts=facts,
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Fact extraction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze_bias", response_model=BiasAnalysisResponse)
async def analyze_bias(request: BiasAnalysisRequest):
    """Analyze bias in text"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    start_time = time.time()
    
    try:
        prompt = f"""Analyze the bias in this text. Consider:
- Political bias: FAR_LEFT, LEFT, CENTER_LEFT, CENTER, CENTER_RIGHT, RIGHT, FAR_RIGHT
- Linguistic indicators (loaded language, framing)
- Emotional tone: POSITIVE, NEGATIVE, NEUTRAL, MIXED

Text: {request.text[:1000]}

Respond with JSON only:
{{"overall_bias": "...", "confidence": 0.8, "linguistic_indicators": ["..."], "emotional_tone": "..."}}

Analysis:"""

        gen_request = GenerateRequest(
            prompt=prompt,
            max_tokens=300,
            temperature=0.4
        )
        
        response = await generate(gen_request)
        
        # Parse JSON response
        try:
            json_str = response.text.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:]
            if json_str.endswith("```"):
                json_str = json_str[:-3]
            
            analysis = json.loads(json_str)
            
        except json.JSONDecodeError:
            # Default response if parsing fails
            analysis = {
                "overall_bias": "CENTER",
                "confidence": 0.5,
                "linguistic_indicators": [],
                "emotional_tone": "NEUTRAL"
            }
        
        processing_time = time.time() - start_time
        
        return BiasAnalysisResponse(
            overall_bias=analysis.get("overall_bias", "CENTER"),
            confidence=float(analysis.get("confidence", 0.5)),
            linguistic_indicators=analysis.get("linguistic_indicators", []),
            emotional_tone=analysis.get("emotional_tone", "NEUTRAL"),
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Bias analysis error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/verify_fact", response_model=VerifyFactResponse)
async def verify_fact(request: VerifyFactRequest):
    """Verify a fact against sources"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    start_time = time.time()
    
    try:
        # Prepare source context
        source_context = "\n".join([
            f"Source {i+1} ({s.get('name', 'Unknown')}): {s.get('content', '')[:300]}"
            for i, s in enumerate(request.sources[:5])
        ])
        
        prompt = f"""Verify this fact based on the provided sources:
Fact: {request.fact}

Sources:
{source_context}

Determine:
- status: VERIFIED (confirmed by sources), DISPUTED (conflicting info), UNVERIFIED (insufficient info), or FALSE (contradicted)
- confidence: 0.0-1.0
- explanation: Brief explanation
- conflicts: List any conflicting information

Respond with JSON only:
{{"status": "...", "confidence": 0.8, "explanation": "...", "conflicts": ["..."]}}

Verification:"""

        gen_request = GenerateRequest(
            prompt=prompt,
            max_tokens=400,
            temperature=0.3
        )
        
        response = await generate(gen_request)
        
        # Parse JSON response
        try:
            json_str = response.text.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:]
            if json_str.endswith("```"):
                json_str = json_str[:-3]
            
            verification = json.loads(json_str)
            
        except json.JSONDecodeError:
            verification = {
                "status": "UNVERIFIED",
                "confidence": 0.0,
                "explanation": "Unable to verify",
                "conflicts": []
            }
        
        processing_time = time.time() - start_time
        
        return VerifyFactResponse(
            status=verification.get("status", "UNVERIFIED"),
            confidence=float(verification.get("confidence", 0.0)),
            explanation=verification.get("explanation", ""),
            conflicts=verification.get("conflicts", []),
            processing_time=processing_time
        )
        
    except Exception as e:
        logger.error(f"Fact verification error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/summarize")
async def summarize(request: SummarizeRequest):
    """Summarize text"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    start_time = time.time()
    
    try:
        prompt = f"""Summarize this text in {request.max_length} characters or less. Focus on key facts and main points:

{request.text[:2000]}

Summary:"""

        gen_request = GenerateRequest(
            prompt=prompt,
            max_tokens=request.max_length // 4,  # Rough token estimate
            temperature=0.5
        )
        
        response = await generate(gen_request)
        
        # Truncate if necessary
        summary = response.text[:request.max_length]
        
        processing_time = time.time() - start_time
        
        return {
            "summary": summary,
            "processing_time": processing_time
        }
        
    except Exception as e:
        logger.error(f"Summarization error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/extract_entities")
async def extract_entities(request: EntityExtractionRequest):
    """Extract named entities from text"""
    if model is None:
        raise HTTPException(status_code=503, detail="Model not loaded")
    
    start_time = time.time()
    
    try:
        prompt = f"""Extract all named entities from this text. Include:
- People (PERSON)
- Organizations (ORG)
- Locations (LOCATION)
- Dates (DATE)
- Events (EVENT)

Text: {request.text[:1000]}

Respond with JSON array only:
[{{"name": "...", "type": "...", "context": "..."}}]

Entities:"""

        gen_request = GenerateRequest(
            prompt=prompt,
            max_tokens=500,
            temperature=0.3
        )
        
        response = await generate(gen_request)
        
        # Parse JSON response
        try:
            json_str = response.text.strip()
            if json_str.startswith("```json"):
                json_str = json_str[7:]
            if json_str.endswith("```"):
                json_str = json_str[:-3]
            
            entities_data = json.loads(json_str)
            
            if not isinstance(entities_data, list):
                entities_data = [entities_data]
            
            entities = [
                Entity(
                    name=e.get("name", ""),
                    type=e.get("type", "UNKNOWN"),
                    context=e.get("context", "")
                )
                for e in entities_data
            ]
            
        except json.JSONDecodeError:
            entities = []
        
        processing_time = time.time() - start_time
        
        return {
            "entities": entities,
            "processing_time": processing_time
        }
        
    except Exception as e:
        logger.error(f"Entity extraction error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/metrics")
async def get_metrics():
    """Get service metrics"""
    return {
        "model": "gemma-3-1b-it",
        "device": str(device) if device else "not loaded",
        "model_loaded": model is not None,
        "cuda_available": torch.cuda.is_available(),
        "memory_usage": {
            "cuda": torch.cuda.memory_allocated() if torch.cuda.is_available() else 0,
            "cuda_cached": torch.cuda.memory_reserved() if torch.cuda.is_available() else 0
        }
    }

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("LLM_SERVICE_PORT", 8001))
    uvicorn.run(app, host="0.0.0.0", port=port)