# Local LLM Integration with gemma-3-1b-it

## 🎯 Overview

This document describes the integration of **google/gemma-3-1b-it** as a local LLM service, replacing external API calls (Gemini) with on-premises inference for complete data sovereignty and cost control.

## 🏗️ Architecture

```
┌─────────────────────────────────────┐
│     Node.js Backend (Port 3000)     │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  LocalLLMClient.js            │  │
│  │  - Manages HTTP requests      │  │
│  │  - Caching & retries          │  │
│  │  - Response parsing           │  │
│  └────────────┬─────────────────┘  │
│                │                     │
└────────────────┼─────────────────────┘
                 │ HTTP/REST
                 ↓
┌─────────────────────────────────────┐
│   Python LLM Service (Port 8001)    │
│                                     │
│  ┌──────────────────────────────┐  │
│  │  FastAPI Application          │  │
│  │  - REST API endpoints         │  │
│  │  - Request validation         │  │
│  └────────────┬─────────────────┘  │
│                │                     │
│  ┌──────────────────────────────┐  │
│  │  gemma-3-1b-it Model          │  │
│  │  - Local inference            │  │
│  │  - GPU/CPU support            │  │
│  │  - 8-bit quantization option  │  │
│  └──────────────────────────────┘  │
└─────────────────────────────────────┘
```

## 📦 Components

### 1. Python LLM Service (`/llm-service/app.py`)

**Features:**
- FastAPI-based REST API
- Automatic model download from Hugging Face
- GPU/CPU inference support
- 8-bit quantization for memory efficiency
- Response caching
- CORS support for cross-origin requests

**Endpoints:**
- `GET /` - Health check and status
- `POST /generate` - General text generation
- `POST /extract_facts` - Fact extraction from news
- `POST /analyze_bias` - Bias analysis
- `POST /verify_fact` - Fact verification
- `POST /summarize` - Text summarization
- `POST /extract_entities` - Entity extraction
- `GET /metrics` - Service metrics

### 2. Node.js Client (`/backend/src/services/llm/LocalLLMClient.js`)

**Features:**
- HTTP client for Python service
- Automatic retries and health checks
- Response caching (1 hour TTL)
- Error handling and fallbacks
- Performance metrics tracking

**Methods:**
- `initialize()` - Connect and verify service
- `generate()` - General text generation
- `extractFacts()` - Extract facts from articles
- `analyzeBias()` - Analyze ideological bias
- `verifyFact()` - Verify facts against sources
- `summarize()` - Summarize articles
- `extractEntities()` - Extract named entities

### 3. Updated Temporal Services

**Modified Files:**
- `TemporalFactExtractor.js` - Now uses local LLM for fact extraction
- All temporal services can now use the local LLM client

## 🚀 Installation & Setup

### Prerequisites

- Python 3.8+ 
- Node.js 18+
- 4GB+ RAM (8GB recommended)
- Optional: CUDA-capable GPU for faster inference

### Step 1: Install Python Service

```bash
cd /home/rafa/Phato/llm-service

# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start the service
python app.py
# OR use the startup script
./start.sh
```

### Step 2: Configure Node.js Backend

Add to your `.env` file:
```env
# Local LLM Service
LLM_SERVICE_URL=http://localhost:8001
LLM_REQUEST_TIMEOUT=60000
```

### Step 3: First Run

On first run, the Python service will:
1. Download the gemma-3-1b-it model (~3GB)
2. Store it in the Hugging Face cache
3. Load the model into memory
4. Run a test generation

**Note:** First startup may take 5-10 minutes for model download.

## 📊 Model Specifications

**Model:** google/gemma-3-1b-it
- **Parameters:** 3 billion
- **Type:** Instruction-tuned
- **Context Length:** 8192 tokens
- **License:** Gemma Terms of Use
- **Disk Space:** ~3GB (FP16), ~1.5GB (INT8)
- **RAM Usage:** 
  - FP16: ~6GB
  - INT8 (quantized): ~2-3GB

## 🎯 API Usage Examples

### Fact Extraction
```javascript
const facts = await localLLMClient.extractFacts(articleText, {
  maxFacts: 20
});

// Response:
{
  facts: [
    {
      statement: "The temperature rose by 2 degrees",
      type: "STATISTICAL",
      confidence: 0.85,
      entities: ["temperature"]
    }
  ],
  processing_time: 1.23
}
```

### Bias Analysis
```javascript
const bias = await localLLMClient.analyzeBias(articleText);

// Response:
{
  overall_bias: "CENTER_LEFT",
  confidence: 0.75,
  linguistic_indicators: ["emphasis on social issues"],
  emotional_tone: "NEUTRAL",
  processing_time: 0.89
}
```

### Fact Verification
```javascript
const verification = await localLLMClient.verifyFact(
  "The event occurred on January 1st",
  [source1, source2, source3]
);

// Response:
{
  status: "VERIFIED",
  confidence: 0.92,
  explanation: "Confirmed by multiple sources",
  conflicts: [],
  processing_time: 1.45
}
```

## ⚙️ Performance Optimization

### Memory Management

**For Limited RAM (< 8GB):**
The service automatically uses 8-bit quantization if GPU memory is less than 8GB:

```python
bnb_config = BitsAndBytesConfig(
    load_in_8bit=True,
    bnb_8bit_compute_dtype=torch.float16
)
```

### Caching Strategy

Both services implement caching:
- **Python Service:** In-memory cache for responses
- **Node.js Client:** 1-hour TTL cache
- **Cache Key:** Hash of prompt + options

### Batch Processing

For multiple requests:
```javascript
const articles = [...]; // Array of articles
const results = await Promise.all(
  articles.map(a => localLLMClient.extractFacts(a.content))
);
```

## 🔍 Monitoring

### Python Service Metrics
```bash
curl http://localhost:8001/metrics
```

Returns:
- Model status
- Memory usage
- CUDA availability
- Processing statistics

### Node.js Client Metrics
```javascript
const metrics = await localLLMClient.getMetrics();
console.log(metrics);
```

## 🐛 Troubleshooting

### Issue: Model download fails
**Solution:** Check internet connection and Hugging Face availability. Manual download:
```bash
python -c "from transformers import AutoModelForCausalLM; AutoModelForCausalLM.from_pretrained('google/gemma-3-1b-it')"
```

### Issue: Out of memory errors
**Solution:** Enable 8-bit quantization or reduce batch size. The service auto-detects low memory.

### Issue: Slow inference
**Solution:** 
- Use GPU if available
- Enable 8-bit quantization
- Reduce max_tokens
- Implement request batching

### Issue: Connection refused
**Solution:** Ensure Python service is running:
```bash
ps aux | grep app.py
# If not running:
cd /home/rafa/Phato/llm-service && ./start.sh
```

## 🔐 Security Considerations

1. **Local Processing:** All data stays on-premises
2. **No External APIs:** Complete data sovereignty
3. **Network Isolation:** Can run in air-gapped environments
4. **Access Control:** Implement authentication if exposing service

## 📈 Benefits vs External APIs

| Aspect | Local gemma-3-1b-it | External APIs (Gemini) |
|--------|-------------------|----------------------|
| **Cost** | One-time setup | Per-token pricing |
| **Privacy** | Complete control | Data sent externally |
| **Latency** | ~1-2s per request | Network dependent |
| **Availability** | Always available | Internet required |
| **Customization** | Full control | Limited |
| **Scale** | Hardware limited | Unlimited |

## 🎯 Use Cases in Phato

1. **Fact Extraction:** Extract verifiable facts from news articles
2. **Bias Detection:** Identify ideological perspectives
3. **Cross-Source Verification:** Verify facts across multiple sources
4. **Content Summarization:** Generate concise summaries
5. **Entity Recognition:** Extract people, places, organizations
6. **Temporal Analysis:** Identify time-based facts

## 🚦 Production Deployment

### Recommended Setup
```yaml
# docker-compose.yml
services:
  llm-service:
    build: ./llm-service
    ports:
      - "8001:8001"
    environment:
      - CUDA_VISIBLE_DEVICES=0
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]
```

### Process Management
```bash
# Using PM2
pm2 start llm-service/app.py --interpreter python3 --name llm-service
pm2 save
pm2 startup
```

## 📝 Summary

The integration of gemma-3-1b-it provides Phato with:
- ✅ **Complete data sovereignty** - No external API calls
- ✅ **Cost predictability** - No per-token charges
- ✅ **Consistent performance** - No rate limits
- ✅ **Privacy compliance** - Data never leaves your infrastructure
- ✅ **Offline capability** - Works without internet

This solution aligns perfectly with Phato's commitment to truth and transparency while maintaining complete control over the AI inference pipeline.

---

*Last Updated: 2025-08-21*