import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

/**
 * LocalLLMClient
 * Node.js client for the Python LLM microservice running gemma-3-1b-it
 * Replaces external Gemini API calls with local inference
 */
class LocalLLMClient {
  constructor() {
    this.baseURL = process.env.LLM_SERVICE_URL || 'http://localhost:8001';
    this.timeout = parseInt(process.env.LLM_REQUEST_TIMEOUT) || 60000;
    this.initialized = false;
    
    // Create axios instance
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    // Metrics
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageLatency: 0
    };
    
    // Response cache
    this.cache = new Map();
    this.cacheTimeout = 3600000; // 1 hour
  }

  /**
   * Check if the LLM service is available
   */
  async checkHealth() {
    try {
      const response = await this.client.get('/');
      this.initialized = response.data.model_loaded === true;
      return {
        available: true,
        ...response.data
      };
    } catch (error) {
      console.error('LLM service health check failed:', error.message);
      return {
        available: false,
        error: error.message
      };
    }
  }

  /**
   * Initialize and verify connection
   */
  async initialize() {
    console.log('🔌 Connecting to Local LLM Service...');
    
    const maxRetries = 5;
    let retries = 0;
    
    while (retries < maxRetries) {
      const health = await this.checkHealth();
      
      if (health.available && health.model_loaded) {
        console.log('✅ Connected to LLM Service');
        console.log(`   Model: ${health.model}`);
        console.log(`   Device: ${health.device}`);
        this.initialized = true;
        return true;
      }
      
      if (health.available && !health.model_loaded) {
        console.log('   ⏳ Waiting for model to load...');
      } else {
        console.log(`   ⚠️ LLM service not available (attempt ${retries + 1}/${maxRetries})`);
      }
      
      retries++;
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    console.error('❌ Failed to connect to LLM service');
    return false;
  }

  /**
   * Generate text using the local model
   * @param {String} prompt - Input prompt
   * @param {Object} options - Generation options
   * @returns {Object} Generated text and metadata
   */
  async generate(prompt, options = {}) {
    const startTime = Date.now();
    
    try {
      // Check cache
      const cacheKey = this.getCacheKey('generate', prompt, options);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.metrics.successfulRequests++;
        return cached;
      }
      
      // Make request
      const response = await this.client.post('/generate', {
        prompt,
        max_tokens: options.maxTokens || 512,
        temperature: options.temperature || 0.7,
        top_p: options.topP || 0.95,
        top_k: options.topK || 40,
        stream: false
      });
      
      // Update metrics
      this.updateMetrics(true, Date.now() - startTime);
      
      // Cache response
      this.addToCache(cacheKey, response.data);
      
      return response.data;
      
    } catch (error) {
      this.updateMetrics(false, Date.now() - startTime);
      console.error('Generation error:', error.message);
      throw error;
    }
  }

  /**
   * Extract facts from text
   * @param {String} text - Text to analyze
   * @param {Object} options - Extraction options
   * @returns {Array} Extracted facts
   */
  async extractFacts(text, options = {}) {
    const startTime = Date.now();
    
    try {
      // Check cache
      const cacheKey = this.getCacheKey('facts', text, options);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.metrics.successfulRequests++;
        return cached;
      }
      
      const response = await this.client.post('/extract_facts', {
        text: text.substring(0, 3000), // Limit text length
        max_facts: options.maxFacts || 20
      });
      
      // Update metrics
      this.updateMetrics(true, Date.now() - startTime);
      
      // Cache response
      this.addToCache(cacheKey, response.data);
      
      return response.data;
      
    } catch (error) {
      this.updateMetrics(false, Date.now() - startTime);
      console.error('Fact extraction error:', error.message);
      
      // Return empty result on error
      return {
        facts: [],
        processing_time: 0,
        error: error.message
      };
    }
  }

  /**
   * Analyze bias in text
   * @param {String} text - Text to analyze
   * @returns {Object} Bias analysis
   */
  async analyzeBias(text) {
    const startTime = Date.now();
    
    try {
      // Check cache
      const cacheKey = this.getCacheKey('bias', text);
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        this.metrics.successfulRequests++;
        return cached;
      }
      
      const response = await this.client.post('/analyze_bias', {
        text: text.substring(0, 2000)
      });
      
      // Update metrics
      this.updateMetrics(true, Date.now() - startTime);
      
      // Cache response
      this.addToCache(cacheKey, response.data);
      
      return response.data;
      
    } catch (error) {
      this.updateMetrics(false, Date.now() - startTime);
      console.error('Bias analysis error:', error.message);
      
      // Return default analysis on error
      return {
        overall_bias: 'CENTER',
        confidence: 0,
        linguistic_indicators: [],
        emotional_tone: 'NEUTRAL',
        processing_time: 0,
        error: error.message
      };
    }
  }

  /**
   * Verify a fact against sources
   * @param {String} fact - Fact to verify
   * @param {Array} sources - Source articles
   * @returns {Object} Verification result
   */
  async verifyFact(fact, sources = []) {
    const startTime = Date.now();
    
    try {
      // Prepare sources for API
      const sourcesData = sources.slice(0, 5).map(s => ({
        name: s.source?.name || 'Unknown',
        content: (s.content || s.description || '').substring(0, 500)
      }));
      
      const response = await this.client.post('/verify_fact', {
        fact,
        sources: sourcesData
      });
      
      // Update metrics
      this.updateMetrics(true, Date.now() - startTime);
      
      return response.data;
      
    } catch (error) {
      this.updateMetrics(false, Date.now() - startTime);
      console.error('Fact verification error:', error.message);
      
      // Return unverified status on error
      return {
        status: 'UNVERIFIED',
        confidence: 0,
        explanation: 'Verification service unavailable',
        conflicts: [],
        processing_time: 0,
        error: error.message
      };
    }
  }

  /**
   * Summarize text
   * @param {String} text - Text to summarize
   * @param {Number} maxLength - Maximum summary length
   * @returns {Object} Summary
   */
  async summarize(text, maxLength = 200) {
    const startTime = Date.now();
    
    try {
      const response = await this.client.post('/summarize', {
        text: text.substring(0, 3000),
        max_length: maxLength
      });
      
      // Update metrics
      this.updateMetrics(true, Date.now() - startTime);
      
      return response.data;
      
    } catch (error) {
      this.updateMetrics(false, Date.now() - startTime);
      console.error('Summarization error:', error.message);
      
      return {
        summary: '',
        processing_time: 0,
        error: error.message
      };
    }
  }

  /**
   * Extract entities from text
   * @param {String} text - Text to analyze
   * @returns {Object} Extracted entities
   */
  async extractEntities(text) {
    const startTime = Date.now();
    
    try {
      const response = await this.client.post('/extract_entities', {
        text: text.substring(0, 2000)
      });
      
      // Update metrics
      this.updateMetrics(true, Date.now() - startTime);
      
      return response.data;
      
    } catch (error) {
      this.updateMetrics(false, Date.now() - startTime);
      console.error('Entity extraction error:', error.message);
      
      return {
        entities: [],
        processing_time: 0,
        error: error.message
      };
    }
  }

  /**
   * Generate structured JSON output
   * @param {String} prompt - Prompt requesting JSON
   * @param {Object} options - Generation options
   * @returns {Object} Parsed JSON response
   */
  async generateJSON(prompt, options = {}) {
    try {
      // Add JSON instruction to prompt
      const jsonPrompt = `${prompt}\n\nRespond with valid JSON only.`;
      
      const response = await this.generate(jsonPrompt, {
        ...options,
        temperature: 0.3 // Lower temperature for structured output
      });
      
      // Try to parse JSON from response
      try {
        const jsonStr = response.text.trim();
        return JSON.parse(jsonStr);
      } catch (parseError) {
        console.warn('Failed to parse JSON response:', parseError);
        return null;
      }
      
    } catch (error) {
      console.error('JSON generation error:', error.message);
      return null;
    }
  }

  /**
   * Get service metrics
   * @returns {Object} Service metrics
   */
  async getMetrics() {
    try {
      const response = await this.client.get('/metrics');
      
      return {
        service: response.data,
        client: {
          ...this.metrics,
          cacheSize: this.cache.size,
          successRate: this.metrics.totalRequests > 0
            ? (this.metrics.successfulRequests / this.metrics.totalRequests * 100).toFixed(2) + '%'
            : '0%'
        }
      };
      
    } catch (error) {
      return {
        service: { error: error.message },
        client: this.metrics
      };
    }
  }

  /**
   * Helper methods
   */
  
  getCacheKey(operation, input, options = {}) {
    const inputHash = this.hashString(input.substring(0, 200));
    const optionsHash = this.hashString(JSON.stringify(options));
    return `${operation}_${inputHash}_${optionsHash}`;
  }
  
  hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
  
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    if (cached) {
      this.cache.delete(key);
    }
    return null;
  }
  
  addToCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.cache.size > 100) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      for (let i = 0; i < 20; i++) {
        this.cache.delete(entries[i][0]);
      }
    }
  }
  
  updateMetrics(success, latency) {
    this.metrics.totalRequests++;
    if (success) {
      this.metrics.successfulRequests++;
    } else {
      this.metrics.failedRequests++;
    }
    
    this.metrics.averageLatency = (
      (this.metrics.averageLatency * (this.metrics.totalRequests - 1) + latency) /
      this.metrics.totalRequests
    );
  }

  /**
   * Clear cache
   */
  clearCache() {
    this.cache.clear();
    console.log('✓ LLM client cache cleared');
  }
}

// Export singleton instance
const localLLMClient = new LocalLLMClient();
export default localLLMClient;

// Also export the class for testing
export { LocalLLMClient };