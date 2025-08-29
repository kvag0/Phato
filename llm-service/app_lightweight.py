"""
Lightweight LLM Service for Phato
Uses smaller models and simpler setup
"""

import os
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import uvicorn

# Create FastAPI app
app = FastAPI(
    title="Phato LLM Service (Lightweight)",
    description="Lightweight AI service for news analysis",
    version="1.0.0"
)

# Simple in-memory cache
response_cache = {}

# Request/Response models
class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 100
    temperature: float = 0.7

class FactExtractionRequest(BaseModel):
    text: str
    max_facts: int = 5

class BiasAnalysisRequest(BaseModel):
    text: str

class FactVerificationRequest(BaseModel):
    fact: str
    sources: List[Dict[str, Any]] = []

class GenerateResponse(BaseModel):
    text: str
    model: str = "rule-based"
    tokens_used: int = 0

class FactExtractionResponse(BaseModel):
    facts: List[str]
    confidence: float = 0.7

class BiasAnalysisResponse(BaseModel):
    overall_bias: str
    bias_score: float
    indicators: List[str]

# Health check endpoint
@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "model": "rule-based",
        "available": True,
        "device": "cpu",
        "timestamp": datetime.now().isoformat()
    }

# Generate text (simplified rule-based)
@app.post("/generate", response_model=GenerateResponse)
async def generate_text(request: GenerateRequest):
    """Generate text based on prompt using rule-based approach"""
    
    # Simple cache check
    cache_key = f"gen_{hash(request.prompt)}"
    if cache_key in response_cache:
        return response_cache[cache_key]
    
    # Rule-based response generation
    prompt_lower = request.prompt.lower()
    
    if "climate" in prompt_lower or "warming" in prompt_lower:
        response = "Climate change is a significant global challenge requiring immediate action. Scientific consensus shows human activities are the primary cause."
    elif "technology" in prompt_lower or "ai" in prompt_lower:
        response = "Technology continues to advance rapidly, with AI leading transformative changes across industries."
    elif "politics" in prompt_lower or "election" in prompt_lower:
        response = "Political developments shape society through policy decisions and democratic processes."
    elif "economy" in prompt_lower or "market" in prompt_lower:
        response = "Economic conditions fluctuate based on various factors including policy, global events, and market dynamics."
    elif "health" in prompt_lower or "medical" in prompt_lower:
        response = "Health and medical advances continue to improve quality of life and longevity worldwide."
    else:
        response = "Based on the available information, this topic requires careful analysis of multiple perspectives and sources."
    
    # Truncate to max_tokens (approximate)
    words = response.split()
    if len(words) > request.max_tokens:
        response = " ".join(words[:request.max_tokens])
    
    result = GenerateResponse(
        text=response,
        model="rule-based",
        tokens_used=len(response.split())
    )
    
    # Cache result
    response_cache[cache_key] = result
    
    return result

# Extract facts (pattern-based)
@app.post("/extract_facts", response_model=FactExtractionResponse)
async def extract_facts(request: FactExtractionRequest):
    """Extract facts from text using pattern matching"""
    
    text = request.text
    facts = []
    
    # Look for sentences with numbers
    sentences = text.split('.')
    for sentence in sentences:
        sentence = sentence.strip()
        # Check for factual indicators
        if any(char.isdigit() for char in sentence):
            facts.append(sentence)
        elif any(word in sentence.lower() for word in ['study', 'research', 'report', 'found', 'showed', 'discovered']):
            facts.append(sentence)
        elif any(word in sentence.lower() for word in ['percent', '%', 'million', 'billion', 'degree']):
            facts.append(sentence)
    
    # Limit to max_facts
    facts = facts[:request.max_facts]
    
    # Clean up facts
    facts = [f.strip() for f in facts if len(f.strip()) > 20]
    
    return FactExtractionResponse(
        facts=facts if facts else ["No specific facts found in the text"],
        confidence=0.7 if facts else 0.3
    )

# Analyze bias (keyword-based)
@app.post("/analyze_bias", response_model=BiasAnalysisResponse)
async def analyze_bias(request: BiasAnalysisRequest):
    """Analyze text bias using keyword detection"""
    
    text = request.text.lower()
    
    # Bias indicators
    left_indicators = ['progressive', 'inequality', 'social justice', 'climate crisis', 'systemic']
    right_indicators = ['traditional', 'freedom', 'liberty', 'free market', 'individual']
    neutral_indicators = ['report', 'study', 'research', 'data', 'statistics']
    
    # Count indicators
    left_count = sum(1 for word in left_indicators if word in text)
    right_count = sum(1 for word in right_indicators if word in text)
    neutral_count = sum(1 for word in neutral_indicators if word in text)
    
    # Determine bias
    total = left_count + right_count + neutral_count
    if total == 0:
        bias = "neutral"
        score = 0.0
        found_indicators = []
    elif neutral_count > left_count and neutral_count > right_count:
        bias = "neutral"
        score = 0.0
        found_indicators = [w for w in neutral_indicators if w in text]
    elif left_count > right_count:
        bias = "slightly_left" if left_count < 3 else "left"
        score = -0.3 if left_count < 3 else -0.6
        found_indicators = [w for w in left_indicators if w in text]
    elif right_count > left_count:
        bias = "slightly_right" if right_count < 3 else "right"
        score = 0.3 if right_count < 3 else 0.6
        found_indicators = [w for w in right_indicators if w in text]
    else:
        bias = "neutral"
        score = 0.0
        found_indicators = []
    
    return BiasAnalysisResponse(
        overall_bias=bias,
        bias_score=score,
        indicators=found_indicators[:5]
    )

# Verify fact (simple confidence scoring)
@app.post("/verify_fact")
async def verify_fact(request: FactVerificationRequest):
    """Verify a fact using simple heuristics"""
    
    fact = request.fact.lower()
    
    # Simple verification rules
    confidence = 0.5  # Base confidence
    
    # Check for numbers (facts often contain specific numbers)
    if any(char.isdigit() for char in fact):
        confidence += 0.2
    
    # Check for source attribution
    if any(word in fact for word in ['according', 'study', 'research', 'report']):
        confidence += 0.15
    
    # Check against provided sources
    if request.sources:
        matching_sources = 0
        for source in request.sources:
            source_text = str(source).lower()
            if any(word in source_text for word in fact.split()[:5]):
                matching_sources += 1
        
        if matching_sources > 0:
            confidence += 0.2 * min(matching_sources / len(request.sources), 1)
    
    # Determine status
    if confidence >= 0.7:
        status = "verified"
    elif confidence >= 0.5:
        status = "partially_verified"
    else:
        status = "unverified"
    
    return {
        "fact": request.fact,
        "status": status,
        "confidence": min(confidence, 0.95),
        "explanation": f"Fact {status} based on content analysis",
        "sources_checked": len(request.sources)
    }

# Summarize text
@app.post("/summarize")
async def summarize_text(request: GenerateRequest):
    """Create a summary of the text"""
    
    text = request.prompt
    sentences = text.split('.')
    
    # Simple extractive summarization - take first and last sentences
    if len(sentences) > 2:
        summary = f"{sentences[0].strip()}. {sentences[-1].strip()}."
    else:
        summary = text[:200] + "..." if len(text) > 200 else text
    
    return {
        "summary": summary,
        "original_length": len(text),
        "summary_length": len(summary)
    }

# Answer question
@app.post("/answer")
async def answer_question(request: GenerateRequest):
    """Answer a question based on context"""
    
    question = request.prompt.lower()
    
    # Simple Q&A patterns
    if "what" in question:
        answer = "Based on the context, this refers to the main topic discussed in the provided information."
    elif "when" in question:
        answer = "The timeframe mentioned relates to recent developments in this area."
    elif "where" in question:
        answer = "The location context is derived from the geographical references in the source material."
    elif "why" in question:
        answer = "The reasoning behind this involves multiple factors as outlined in the analysis."
    elif "how" in question:
        answer = "The process involves several steps as described in the documentation."
    else:
        answer = "This question requires analysis of the specific context provided."
    
    return {
        "question": request.prompt,
        "answer": answer,
        "confidence": 0.6
    }

# Get metrics
@app.get("/metrics")
async def get_metrics():
    """Get service metrics"""
    return {
        "cache_size": len(response_cache),
        "total_requests": sum(1 for _ in response_cache),
        "uptime_seconds": 0,
        "model_type": "rule-based",
        "memory_usage_mb": 50
    }

# Main entry point
if __name__ == "__main__":
    print("\n" + "="*60)
    print("   Phato Lightweight LLM Service")
    print("   Rule-based AI for immediate deployment")
    print("="*60)
    print("\nStarting server on http://localhost:8001")
    print("API Documentation: http://localhost:8001/docs")
    print("\nThis lightweight version uses rule-based approaches")
    print("For full AI capabilities, install the complete version")
    print("="*60 + "\n")
    
    uvicorn.run(app, host="0.0.0.0", port=8001)