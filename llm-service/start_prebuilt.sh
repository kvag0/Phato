#!/bin/bash

# Alternative start script using pre-built wheels to avoid compilation

echo "=================================================="
echo "   Phato LLM Service Launcher (Pre-built Version)"
echo "=================================================="

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Upgrade pip
pip install --upgrade pip

echo ""
echo "Installing dependencies with pre-built wheels..."
echo ""

# Install dependencies using pre-built wheels where available
pip install --no-cache-dir \
    fastapi==0.109.0 \
    uvicorn==0.27.0 \
    pydantic==2.5.3 \
    python-multipart==0.0.6

# Install PyTorch CPU version (smaller, no CUDA required)
pip install --no-cache-dir \
    torch==2.1.2+cpu \
    -f https://download.pytorch.org/whl/torch_stable.html

# Install transformers without unnecessary dependencies
pip install --no-cache-dir \
    transformers==4.36.2 \
    --no-deps

# Install required dependencies for transformers
pip install --no-cache-dir \
    huggingface-hub \
    numpy \
    regex \
    requests \
    tqdm \
    safetensors \
    tokenizers

# Try to install accelerate (optional, for faster inference)
pip install --no-cache-dir accelerate 2>/dev/null || echo "Accelerate not installed (optional)"

echo ""
echo "=================================================="
echo "   Dependencies installed successfully!"
echo "=================================================="
echo ""

# Check if models directory exists
if [ ! -d "models" ]; then
    mkdir -p models
    echo "Created models directory for caching"
fi

echo "Starting FastAPI server on port 8001..."
echo "The server will download models on first use (~3GB)"
echo ""
echo "Access the API at: http://localhost:8001"
echo "API Documentation: http://localhost:8001/docs"
echo ""

# Start the FastAPI server
python app.py