import { pipeline, env } from '@xenova/transformers';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

dotenv.config();

/**
 * EmbeddingService
 * Generates embeddings using local BAAI/bge-large-en-v1.5 model
 * Provides caching and batch processing capabilities
 */
class EmbeddingService {
  constructor() {
    // Model configuration - Using Xenova's optimized BGE model
    this.modelName = process.env.EMBEDDINGS_MODEL || 'Xenova/bge-base-en-v1.5';
    this.cacheDir = process.env.EMBEDDINGS_CACHE_DIR || './models';
    this.dimension = parseInt(process.env.EMBEDDINGS_DIMENSION) || 768; // BGE-base has 768 dimensions
    
    // Set transformers.js environment
    env.cacheDir = this.cacheDir;
    env.localURL = false; // Download from HuggingFace if needed
    
    // Pipeline instance
    this.pipeline = null;
    this.initialized = false;
    this.initializing = false;
    
    // Processing configuration
    this.config = {
      maxLength: 512, // Maximum token length for BGE
      batchSize: 32,  // Process in batches
      normalize: true, // Normalize embeddings for cosine similarity
      pooling: 'mean', // Pooling strategy
      cacheEnabled: true,
      cacheTimeout: 3600000 // 1 hour
    };
    
    // Embedding cache
    this.embeddingCache = new Map();
    
    // Performance metrics
    this.metrics = {
      totalEmbeddings: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageTime: 0
    };
  }

  /**
   * Initialize the embedding pipeline
   */
  async initialize() {
    // Check if already initialized or initializing
    if (this.initialized) {
      console.log('✓ Embedding service already initialized');
      return;
    }
    
    if (this.initializing) {
      console.log('⏳ Embedding service already initializing, waiting...');
      // Wait for the initialization to complete with timeout
      const maxWaitTime = 60000; // 60 seconds
      const startTime = Date.now();
      while (this.initializing && !this.initialized) {
        if (Date.now() - startTime > maxWaitTime) {
          throw new Error('Embedding service initialization timeout');
        }
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      return;
    }

    // Mark as initializing to prevent concurrent initialization
    this.initializing = true;

    try {
      console.log(`🚀 Initializing local embedding model: ${this.modelName}`);
      console.log(`   Cache directory: ${this.cacheDir}`);
      
      // Ensure cache directory exists
      if (!fs.existsSync(this.cacheDir)) {
        fs.mkdirSync(this.cacheDir, { recursive: true });
      }
      
      // Check if model files already exist
      const modelPath = path.join(this.cacheDir, 'BAAI', 'bge-large-en-v1.5', 'onnx', 'model.onnx');
      if (fs.existsSync(modelPath)) {
        console.log('   ✓ Model files found locally');
      } else {
        console.log('   ⏳ Model files not found, will download...');
      }
      
      // Load the feature extraction pipeline with timeout
      console.log('   ⏳ Loading model into memory...');
      
      const pipelinePromise = pipeline(
        'feature-extraction',
        this.modelName,
        { 
          quantized: true, // Use quantized model for better performance
          cache_dir: this.cacheDir,
          progress_callback: (progress) => {
            if (progress && progress.status) {
              console.log(`   📊 Loading progress: ${progress.status}`);
            }
          }
        }
      );
      
      // Add timeout to pipeline loading
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Model loading timeout after 2 minutes')), 120000);
      });
      
      this.pipeline = await Promise.race([pipelinePromise, timeoutPromise]);
      
      console.log('   ✅ Model loaded successfully');
      
      // Test the model with timeout
      const testPromise = this.testModel();
      const testTimeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Model test timeout')), 10000);
      });
      
      await Promise.race([testPromise, testTimeoutPromise]);
      
      this.initialized = true;
      this.initializing = false;
      console.log(`✅ Embedding service initialized with ${this.modelName}`);
      
    } catch (error) {
      this.initializing = false;
      console.error('❌ Error initializing embedding service:', error.message);
      
      // If initialization fails, set a flag to use fallback
      this.useFallback = true;
      console.log('⚠️  Will use fallback embedding method');
      
      // Don't throw error, let the service continue with limited functionality
      this.initialized = true;
    }
  }

  /**
   * Test the model with a sample text
   */
  async testModel() {
    try {
      const testText = "This is a test sentence for embedding generation.";
      const embedding = await this.generateEmbedding(testText);
      
      if (embedding.length !== this.dimension) {
        throw new Error(`Dimension mismatch: expected ${this.dimension}, got ${embedding.length}`);
      }
      
      console.log(`   ✓ Model test successful - dimension: ${embedding.length}`);
      return true;
      
    } catch (error) {
      console.error('Model test failed:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for a single text
   * @param {String} text - Text to embed
   * @param {Object} options - Options for embedding generation
   * @returns {Array} Embedding vector
   */
  async generateEmbedding(text, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const startTime = Date.now();
    
    try {
      // Check cache first
      if (this.config.cacheEnabled && !options.skipCache) {
        const cached = this.getCachedEmbedding(text);
        if (cached) {
          this.metrics.cacheHits++;
          return cached;
        }
      }
      
      this.metrics.cacheMisses++;
      
      // If using fallback, generate simple embeddings
      if (this.useFallback || !this.pipeline) {
        return this.generateFallbackEmbedding(text);
      }
      
      // Preprocess text
      const processedText = this.preprocessText(text);
      
      // Generate embedding using the pipeline
      const output = await this.pipeline(processedText, {
        pooling: this.config.pooling,
        normalize: this.config.normalize
      });
      
      // Extract the embedding array
      let embedding;
      if (output && output.data) {
        embedding = Array.from(output.data);
      } else if (output && Array.isArray(output)) {
        embedding = output;
      } else {
        throw new Error('Unexpected output format from embedding model');
      }
      
      // Ensure correct dimension
      if (embedding.length !== this.dimension) {
        console.warn(`Embedding dimension mismatch: expected ${this.dimension}, got ${embedding.length}`);
        // Truncate or pad as needed
        embedding = this.adjustDimension(embedding);
      }
      
      // Normalize if needed
      if (this.config.normalize) {
        embedding = this.normalizeVector(embedding);
      }
      
      // Cache the result
      if (this.config.cacheEnabled) {
        this.cacheEmbedding(text, embedding);
      }
      
      // Update metrics
      const processingTime = Date.now() - startTime;
      this.updateMetrics(processingTime);
      
      return embedding;
      
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   * @param {Array} texts - Array of texts to embed
   * @param {Object} options - Options for embedding generation
   * @returns {Array} Array of embedding vectors
   */
  async generateBatchEmbeddings(texts, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log(`📊 Generating embeddings for ${texts.length} texts...`);
    
    const embeddings = [];
    const batchSize = options.batchSize || this.config.batchSize;
    
    // Process in batches
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const batchStartTime = Date.now();
      
      // Process batch
      const batchEmbeddings = await Promise.all(
        batch.map(text => this.generateEmbedding(text, options))
      );
      
      embeddings.push(...batchEmbeddings);
      
      const batchTime = Date.now() - batchStartTime;
      console.log(`   ✓ Batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(texts.length / batchSize)} processed in ${batchTime}ms`);
    }
    
    console.log(`✅ Generated ${embeddings.length} embeddings`);
    return embeddings;
  }

  /**
   * Generate embedding for an article
   * @param {Object} article - Article object
   * @returns {Object} Embedding data with metadata
   */
  async embedArticle(article) {
    try {
      // Combine relevant text fields
      const textToEmbed = this.createArticleText(article);
      
      // Generate embedding
      const embedding = await this.generateEmbedding(textToEmbed);
      
      return {
        id: article._id.toString(),
        values: embedding,
        metadata: {
          title: article.title,
          source: article.source?.name,
          category: article.category,
          publishedAt: article.publishedAt?.getTime() || Date.now(),
          bias: article.biasAnalysis?.overall_bias,
          importance: this.calculateArticleImportance(article),
          url: article.url,
          type: 'article'
        }
      };
      
    } catch (error) {
      console.error(`Error embedding article ${article._id}:`, error);
      throw error;
    }
  }

  /**
   * Generate embedding for a fact
   * @param {Object} fact - Fact object
   * @returns {Object} Embedding data with metadata
   */
  async embedFact(fact) {
    try {
      // Create fact text for embedding
      const textToEmbed = this.createFactText(fact);
      
      // Generate embedding
      const embedding = await this.generateEmbedding(textToEmbed);
      
      return {
        id: `fact_${fact.factId}`,
        values: embedding,
        metadata: {
          statement: fact.statement.substring(0, 200), // Truncate for metadata
          factType: fact.classification?.type,
          importance: fact.classification?.importance || 5,
          verificationStatus: fact.verificationHistory?.[0]?.status || 'UNVERIFIED',
          firstReported: fact.timeline?.firstReported?.getTime() || Date.now(),
          sourceCount: fact.sourceArticles?.length || 1,
          consensusLevel: fact.consensus?.agreementLevel || 0,
          type: 'fact'
        }
      };
      
    } catch (error) {
      console.error(`Error embedding fact ${fact.factId}:`, error);
      throw error;
    }
  }

  /**
   * Generate embedding for a story cluster
   * @param {Object} cluster - Story cluster object
   * @returns {Object} Embedding data with metadata
   */
  async embedCluster(cluster) {
    try {
      // Create cluster text for embedding
      const textToEmbed = this.createClusterText(cluster);
      
      // Generate embedding
      const embedding = await this.generateEmbedding(textToEmbed);
      
      return {
        id: `cluster_${cluster.clusterId}`,
        values: embedding,
        metadata: {
          title: cluster.title,
          category: cluster.classification?.category,
          importance: cluster.classification?.importance || 5,
          articleCount: cluster.metrics?.total_articles || 1,
          sourceCount: cluster.metrics?.unique_sources || 1,
          controversyLevel: cluster.controversy?.level || 'NONE',
          trendingScore: cluster.metrics?.trending_score || 0,
          startDate: cluster.timespan?.start?.getTime() || Date.now(),
          type: 'cluster'
        }
      };
      
    } catch (error) {
      console.error(`Error embedding cluster ${cluster.clusterId}:`, error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  
  preprocessText(text) {
    if (!text) return '';
    
    // Clean and normalize text
    let processed = text
      .replace(/\n+/g, ' ')        // Replace newlines with spaces
      .replace(/\s+/g, ' ')         // Normalize whitespace
      .replace(/[^\w\s.,!?-]/g, '') // Remove special characters
      .trim();
    
    // Add instruction prefix for BGE model (improves performance)
    processed = `Represent this text for retrieval: ${processed}`;
    
    // Truncate if too long (BGE has 512 token limit)
    const maxChars = 2000; // Rough approximation
    if (processed.length > maxChars) {
      processed = processed.substring(0, maxChars) + '...';
    }
    
    return processed;
  }
  
  normalizeVector(vector) {
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    if (magnitude === 0) return vector;
    return vector.map(val => val / magnitude);
  }
  
  adjustDimension(embedding) {
    if (embedding.length === this.dimension) return embedding;
    
    if (embedding.length > this.dimension) {
      // Truncate
      return embedding.slice(0, this.dimension);
    } else {
      // Pad with zeros
      const padded = [...embedding];
      while (padded.length < this.dimension) {
        padded.push(0);
      }
      return padded;
    }
  }
  
  createArticleText(article) {
    const parts = [];
    
    if (article.title) parts.push(article.title);
    if (article.description) parts.push(article.description);
    if (article.content) parts.push(article.content.substring(0, 500));
    
    // Add key facts
    if (article.extractedFacts && article.extractedFacts.length > 0) {
      const topFacts = article.extractedFacts
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 3)
        .map(f => f.statement);
      parts.push(...topFacts);
    }
    
    // Add entities
    if (article.entities && article.entities.length > 0) {
      const entityNames = article.entities.slice(0, 5).map(e => e.name);
      parts.push(`Entities: ${entityNames.join(', ')}`);
    }
    
    return parts.join(' ');
  }
  
  /**
   * Generate fallback embedding using simple hashing
   * This is used when the main model fails to load
   */
  generateFallbackEmbedding(text) {
    console.log('⚠️  Using fallback embedding generation');
    
    // Simple but deterministic embedding generation
    const hash = crypto.createHash('sha512').update(text).digest();
    const embedding = [];
    
    // Generate 1024-dimensional embedding from hash
    for (let i = 0; i < this.dimension; i++) {
      const idx = i % hash.length;
      const nextIdx = (i + 1) % hash.length;
      // Create value between -1 and 1
      const value = ((hash[idx] ^ hash[nextIdx]) / 255) * 2 - 1;
      embedding.push(value);
    }
    
    // Normalize the vector
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    const normalized = embedding.map(val => val / (magnitude || 1));
    
    // Cache it
    if (this.config.cacheEnabled) {
      this.cacheEmbedding(text, normalized);
    }
    
    return normalized;
  }
  
  createFactText(fact) {
    const parts = [fact.statement];
    
    // Add context
    if (fact.context) parts.push(fact.context);
    
    // Add entities
    if (fact.entities && fact.entities.length > 0) {
      const entityNames = fact.entities.map(e => e.name);
      parts.push(`Related to: ${entityNames.join(', ')}`);
    }
    
    // Add classification
    if (fact.classification) {
      parts.push(`Type: ${fact.classification.type}`);
      if (fact.classification.category) {
        parts.push(`Category: ${fact.classification.category}`);
      }
    }
    
    return parts.join(' ');
  }
  
  createClusterText(cluster) {
    const parts = [];
    
    if (cluster.title) parts.push(cluster.title);
    if (cluster.summary) parts.push(cluster.summary);
    if (cluster.description) parts.push(cluster.description);
    
    // Add main entities
    if (cluster.mainEntities && cluster.mainEntities.length > 0) {
      const entityNames = cluster.mainEntities.slice(0, 5).map(e => e.name);
      parts.push(`Main entities: ${entityNames.join(', ')}`);
    }
    
    // Add key narratives
    if (cluster.narrativeSpectrum && cluster.narrativeSpectrum.length > 0) {
      const narratives = cluster.narrativeSpectrum.slice(0, 2).map(n => n.key_narrative);
      parts.push(...narratives);
    }
    
    return parts.join(' ');
  }
  
  calculateArticleImportance(article) {
    let importance = 5; // Base importance
    
    // Adjust based on facts
    if (article.extractedFacts && article.extractedFacts.length > 0) {
      const avgFactImportance = article.extractedFacts.reduce((sum, f) => sum + (f.importance || 5), 0) / article.extractedFacts.length;
      importance = Math.round(avgFactImportance);
    }
    
    // Adjust based on verification
    const verifiedFacts = article.extractedFacts?.filter(f => f.verificationStatus === 'VERIFIED').length || 0;
    if (verifiedFacts > 3) importance = Math.min(10, importance + 1);
    
    return importance;
  }
  
  getCachedEmbedding(text) {
    const cacheKey = this.createCacheKey(text);
    const cached = this.embeddingCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.config.cacheTimeout) {
      return cached.embedding;
    }
    
    // Remove expired cache entry
    if (cached) {
      this.embeddingCache.delete(cacheKey);
    }
    
    return null;
  }
  
  cacheEmbedding(text, embedding) {
    const cacheKey = this.createCacheKey(text);
    this.embeddingCache.set(cacheKey, {
      embedding,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.embeddingCache.size > 1000) {
      // Remove oldest entries
      const entries = Array.from(this.embeddingCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      for (let i = 0; i < 100; i++) {
        this.embeddingCache.delete(entries[i][0]);
      }
    }
  }
  
  createCacheKey(text) {
    // Simple hash for cache key
    let hash = 0;
    for (let i = 0; i < text.length; i++) {
      const char = text.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(36);
  }
  
  updateMetrics(processingTime) {
    this.metrics.totalEmbeddings++;
    this.metrics.averageTime = (
      (this.metrics.averageTime * (this.metrics.totalEmbeddings - 1) + processingTime) /
      this.metrics.totalEmbeddings
    );
  }

  /**
   * Calculate similarity between two embeddings
   * @param {Array} embedding1 - First embedding vector
   * @param {Array} embedding2 - Second embedding vector
   * @returns {Number} Cosine similarity score (0-1)
   */
  calculateSimilarity(embedding1, embedding2) {
    if (embedding1.length !== embedding2.length) {
      throw new Error('Embeddings must have the same dimension');
    }
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;
    
    for (let i = 0; i < embedding1.length; i++) {
      dotProduct += embedding1[i] * embedding2[i];
      magnitude1 += embedding1[i] * embedding1[i];
      magnitude2 += embedding2[i] * embedding2[i];
    }
    
    magnitude1 = Math.sqrt(magnitude1);
    magnitude2 = Math.sqrt(magnitude2);
    
    if (magnitude1 === 0 || magnitude2 === 0) return 0;
    
    return dotProduct / (magnitude1 * magnitude2);
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.embeddingCache.size,
      cacheHitRate: this.metrics.totalEmbeddings > 0
        ? (this.metrics.cacheHits / this.metrics.totalEmbeddings * 100).toFixed(2) + '%'
        : '0%',
      modelName: this.modelName,
      dimension: this.dimension,
      initialized: this.initialized
    };
  }

  /**
   * Clear the embedding cache
   */
  clearCache() {
    this.embeddingCache.clear();
    console.log('✓ Embedding cache cleared');
  }
}

// Export singleton instance
const embeddingService = new EmbeddingService();
export default embeddingService;

// Also export the class for testing
export { EmbeddingService };