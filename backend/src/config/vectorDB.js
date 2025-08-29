import { Pinecone } from '@pinecone-database/pinecone';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Vector Database Configuration
 * Sets up Pinecone for vector storage and retrieval
 */
class VectorDBConfig {
  constructor() {
    this.client = null;
    this.index = null;
    this.indexName = process.env.PINECONE_INDEX_NAME || 'phato-news';
    this.dimension = parseInt(process.env.EMBEDDINGS_DIMENSION) || 1024; // BGE-large dimension
    this.metric = 'cosine'; // Similarity metric
    this.initialized = false;
  }

  /**
   * Initialize Pinecone client and index
   */
  async initialize() {
    if (this.initialized) {
      console.log('✓ Vector DB already initialized');
      return this.index;
    }

    try {
      console.log('🚀 Initializing Pinecone vector database...');
      
      // Initialize Pinecone client
      this.client = new Pinecone({
        apiKey: process.env.PINECONE_API_KEY,
        environment: process.env.PINECONE_ENVIRONMENT
      });

      // Check if index exists
      const indexList = await this.client.listIndexes();
      const indexExists = indexList.indexes?.some(idx => idx.name === this.indexName);

      if (!indexExists) {
        console.log(`📝 Creating new Pinecone index: ${this.indexName}`);
        
        // Create index with BGE-large dimensions
        await this.client.createIndex({
          name: this.indexName,
          dimension: this.dimension,
          metric: this.metric,
          spec: {
            serverless: {
              cloud: 'aws',
              region: process.env.PINECONE_REGION || 'us-east-1'
            }
          }
        });

        // Wait for index to be ready
        await this.waitForIndexReady();
        
        console.log(`✅ Index '${this.indexName}' created successfully`);
      } else {
        console.log(`✓ Using existing index: ${this.indexName}`);
      }

      // Get index reference
      this.index = this.client.index(this.indexName);
      
      // Get index stats
      const stats = await this.getIndexStats();
      console.log(`📊 Index stats: ${stats.totalVectors} vectors, ${stats.dimension} dimensions`);
      
      this.initialized = true;
      return this.index;
      
    } catch (error) {
      console.error('❌ Error initializing Pinecone:', error);
      throw new Error(`Failed to initialize Pinecone: ${error.message}`);
    }
  }

  /**
   * Wait for index to be ready
   */
  async waitForIndexReady(maxWait = 60000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWait) {
      try {
        const description = await this.client.describeIndex(this.indexName);
        if (description.status?.ready) {
          return true;
        }
      } catch (error) {
        // Index might not be ready yet
      }
      
      console.log('   ⏳ Waiting for index to be ready...');
      await new Promise(resolve => setTimeout(resolve, 5000));
    }
    
    throw new Error('Index creation timeout');
  }

  /**
   * Get index statistics
   */
  async getIndexStats() {
    if (!this.index) {
      await this.initialize();
    }

    try {
      const stats = await this.index.describeIndexStats();
      return {
        totalVectors: stats.totalVectorCount || 0,
        dimension: stats.dimension || this.dimension,
        namespaces: stats.namespaces || {},
        indexFullness: stats.indexFullness || 0
      };
    } catch (error) {
      console.error('Error getting index stats:', error);
      return {
        totalVectors: 0,
        dimension: this.dimension,
        namespaces: {},
        indexFullness: 0
      };
    }
  }

  /**
   * Upsert vectors to index
   * @param {Array} vectors - Array of vector objects with id, values, and metadata
   * @param {String} namespace - Optional namespace for organization
   */
  async upsertVectors(vectors, namespace = '') {
    if (!this.index) {
      await this.initialize();
    }

    try {
      // Validate vector dimensions
      vectors.forEach(vector => {
        if (vector.values.length !== this.dimension) {
          throw new Error(`Vector dimension mismatch. Expected ${this.dimension}, got ${vector.values.length}`);
        }
      });

      // Upsert in batches of 100
      const batchSize = 100;
      const results = [];
      
      for (let i = 0; i < vectors.length; i += batchSize) {
        const batch = vectors.slice(i, i + batchSize);
        
        const response = await this.index.namespace(namespace).upsert(batch);
        results.push(response);
        
        console.log(`   ✓ Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(vectors.length / batchSize)}`);
      }
      
      return results;
      
    } catch (error) {
      console.error('Error upserting vectors:', error);
      throw error;
    }
  }

  /**
   * Query vectors from index
   * @param {Array} queryVector - Query vector values
   * @param {Object} options - Query options
   */
  async query(queryVector, options = {}) {
    if (!this.index) {
      await this.initialize();
    }

    const {
      topK = 10,
      namespace = '',
      filter = {},
      includeValues = false,
      includeMetadata = true
    } = options;

    try {
      // Validate query vector dimension
      if (queryVector.length !== this.dimension) {
        throw new Error(`Query vector dimension mismatch. Expected ${this.dimension}, got ${queryVector.length}`);
      }

      const queryRequest = {
        vector: queryVector,
        topK,
        includeValues,
        includeMetadata
      };

      if (Object.keys(filter).length > 0) {
        queryRequest.filter = filter;
      }

      const response = await this.index.namespace(namespace).query(queryRequest);
      
      return response.matches || [];
      
    } catch (error) {
      console.error('Error querying vectors:', error);
      throw error;
    }
  }

  /**
   * Delete vectors from index
   * @param {Array} ids - Vector IDs to delete
   * @param {String} namespace - Optional namespace
   */
  async deleteVectors(ids, namespace = '') {
    if (!this.index) {
      await this.initialize();
    }

    try {
      await this.index.namespace(namespace).deleteMany(ids);
      console.log(`✓ Deleted ${ids.length} vectors`);
      return true;
    } catch (error) {
      console.error('Error deleting vectors:', error);
      throw error;
    }
  }

  /**
   * Delete all vectors in a namespace
   * @param {String} namespace - Namespace to clear
   */
  async clearNamespace(namespace) {
    if (!this.index) {
      await this.initialize();
    }

    try {
      await this.index.namespace(namespace).deleteAll();
      console.log(`✓ Cleared namespace: ${namespace}`);
      return true;
    } catch (error) {
      console.error('Error clearing namespace:', error);
      throw error;
    }
  }

  /**
   * Create metadata filter for Pinecone query
   * @param {Object} filters - Filter criteria
   */
  createMetadataFilter(filters) {
    const pineconeFilter = {};

    // Date range filter
    if (filters.startDate || filters.endDate) {
      pineconeFilter.publishedAt = {};
      if (filters.startDate) {
        pineconeFilter.publishedAt.$gte = new Date(filters.startDate).getTime();
      }
      if (filters.endDate) {
        pineconeFilter.publishedAt.$lte = new Date(filters.endDate).getTime();
      }
    }

    // Category filter
    if (filters.category) {
      pineconeFilter.category = filters.category;
    }

    // Source filter
    if (filters.source) {
      pineconeFilter.source = filters.source;
    }

    // Bias filter
    if (filters.bias) {
      pineconeFilter.bias = filters.bias;
    }

    // Verification status filter
    if (filters.verificationStatus) {
      pineconeFilter.verificationStatus = filters.verificationStatus;
    }

    // Importance filter
    if (filters.minImportance) {
      pineconeFilter.importance = { $gte: filters.minImportance };
    }

    return pineconeFilter;
  }

  /**
   * Test connection to Pinecone
   */
  async testConnection() {
    try {
      console.log('🔌 Testing Pinecone connection...');
      
      await this.initialize();
      const stats = await this.getIndexStats();
      
      console.log('✅ Pinecone connection successful');
      console.log(`   Index: ${this.indexName}`);
      console.log(`   Vectors: ${stats.totalVectors}`);
      console.log(`   Dimension: ${stats.dimension}`);
      
      return true;
    } catch (error) {
      console.error('❌ Pinecone connection failed:', error.message);
      return false;
    }
  }

  /**
   * Get namespace statistics
   */
  async getNamespaceStats(namespace = '') {
    if (!this.index) {
      await this.initialize();
    }

    try {
      const stats = await this.index.describeIndexStats();
      
      if (namespace && stats.namespaces && stats.namespaces[namespace]) {
        return stats.namespaces[namespace];
      }
      
      return stats;
    } catch (error) {
      console.error('Error getting namespace stats:', error);
      return null;
    }
  }
}

// Export singleton instance
const vectorDB = new VectorDBConfig();
export default vectorDB;

// Also export the class for testing
export { VectorDBConfig };