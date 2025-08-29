import { QdrantClient } from '@qdrant/qdrant-js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Qdrant Vector Database Configuration
 * Optimized for mobile app backend with cloud deployment
 * Free tier: 1M vectors (10x more than Pinecone!)
 */
class QdrantDBConfig {
  constructor() {
    this.client = null;
    this.collectionName = process.env.QDRANT_COLLECTION || 'phato-news';
    this.dimension = parseInt(process.env.EMBEDDINGS_DIMENSION) || 768; // BGE-base dimension
    this.initialized = false;
    
    // Configuration
    this.config = {
      // Use Qdrant Cloud for production, local for development
      url: process.env.QDRANT_URL || 'http://localhost:6333',
      apiKey: process.env.QDRANT_API_KEY || null,
      https: process.env.QDRANT_URL?.startsWith('https') || false,
      
      // Collection settings
      vectorSize: this.dimension,
      distance: 'Cosine', // Best for normalized embeddings
      
      // Performance settings
      onDiskPayload: true, // Save memory
      indexingThreshold: 20000, // Optimize for up to 20K vectors
      
      // Namespaces for different content types
      namespaces: {
        articles: 'articles',
        facts: 'facts',
        clusters: 'clusters'
      }
    };
    
    // Metrics
    this.metrics = {
      totalVectors: 0,
      collections: [],
      operations: {
        upserts: 0,
        searches: 0,
        deletes: 0
      }
    };
  }

  /**
   * Initialize Qdrant client and collection
   */
  async initialize() {
    if (this.initialized) {
      console.log('✓ Qdrant already initialized');
      return this.client;
    }

    try {
      console.log('🚀 Initializing Qdrant vector database...');
      console.log(`   URL: ${this.config.url}`);
      console.log(`   Collection: ${this.collectionName}`);
      
      // Initialize Qdrant client
      this.client = new QdrantClient({
        url: this.config.url,
        apiKey: this.config.apiKey,
        https: this.config.https
      });
      
      // Check connection
      const info = await this.client.api('GET', '/');
      const version = info?.data?.version || info?.version || 'unknown';
      console.log(`   ✓ Connected to Qdrant v${version}`);
      
      // Check or create collection
      await this.ensureCollection();
      
      // Get collection info
      const collectionInfo = await this.getCollectionInfo();
      console.log(`   📊 Collection stats:`);
      console.log(`      Vectors: ${collectionInfo.vectorsCount}`);
      console.log(`      Dimension: ${collectionInfo.vectorSize}`);
      console.log(`      Status: ${collectionInfo.status}`);
      
      this.initialized = true;
      console.log('✅ Qdrant initialized successfully');
      
      return this.client;
      
    } catch (error) {
      // If connection fails, provide helpful setup instructions
      if (error.message?.includes('ECONNREFUSED')) {
        console.error('❌ Qdrant not running. Start it with:');
        console.error('   Local: docker run -p 6333:6333 qdrant/qdrant');
        console.error('   OR');
        console.error('   Cloud: Sign up at https://cloud.qdrant.io');
      } else {
        console.error('❌ Error initializing Qdrant:', error.message);
      }
      throw error;
    }
  }

  /**
   * Ensure collection exists with proper configuration
   */
  async ensureCollection() {
    try {
      // Check if collection exists
      const collections = await this.client.getCollections();
      const exists = collections.collections?.some(c => c.name === this.collectionName);
      
      if (!exists) {
        console.log(`   📝 Creating collection: ${this.collectionName}`);
        
        // Create collection with optimal settings for news/facts
        await this.client.createCollection(this.collectionName, {
          vectors: {
            size: this.config.vectorSize,
            distance: this.config.distance
          },
          optimizers_config: {
            default_segment_number: 2,
            indexing_threshold: this.config.indexingThreshold
          },
          replication_factor: 1, // Can increase for production
          on_disk_payload: this.config.onDiskPayload
        });
        
        // Create payload indexes for filtering
        await this.createIndexes();
        
        console.log(`   ✅ Collection '${this.collectionName}' created`);
      } else {
        console.log(`   ✓ Using existing collection: ${this.collectionName}`);
      }
      
    } catch (error) {
      console.error('Error ensuring collection:', error);
      throw error;
    }
  }

  /**
   * Create indexes for efficient filtering
   */
  async createIndexes() {
    try {
      // Index for filtering by type
      await this.client.createPayloadIndex(this.collectionName, {
        field_name: 'type',
        field_schema: 'keyword'
      });
      
      // Index for filtering by date
      await this.client.createPayloadIndex(this.collectionName, {
        field_name: 'publishedAt',
        field_schema: 'integer'
      });
      
      // Index for filtering by source
      await this.client.createPayloadIndex(this.collectionName, {
        field_name: 'source',
        field_schema: 'keyword'
      });
      
      // Index for filtering by category
      await this.client.createPayloadIndex(this.collectionName, {
        field_name: 'category',
        field_schema: 'keyword'
      });
      
      // Index for importance scoring
      await this.client.createPayloadIndex(this.collectionName, {
        field_name: 'importance',
        field_schema: 'integer'
      });
      
      console.log('   ✓ Payload indexes created');
      
    } catch (error) {
      // Indexes might already exist, that's ok
      if (!error.message?.includes('already exists')) {
        console.warn('   ⚠️  Some indexes may not have been created:', error.message);
      }
    }
  }

  /**
   * Get collection information
   */
  async getCollectionInfo() {
    try {
      const info = await this.client.getCollection(this.collectionName);
      
      return {
        name: this.collectionName,
        vectorsCount: info.vectors_count || 0,
        vectorSize: info.config?.params?.vectors?.size || this.dimension,
        status: info.status || 'unknown',
        indexedVectorsCount: info.indexed_vectors_count || 0,
        pointsCount: info.points_count || 0
      };
      
    } catch (error) {
      console.error('Error getting collection info:', error);
      return {
        name: this.collectionName,
        vectorsCount: 0,
        vectorSize: this.dimension,
        status: 'error'
      };
    }
  }

  /**
   * Upsert vectors with metadata
   * @param {Array} vectors - Array of vector objects with id, values, and metadata
   * @param {String} namespace - Optional namespace (stored as metadata)
   */
  async upsertVectors(vectors, namespace = '') {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Convert to Qdrant format
      const points = vectors.map(vector => ({
        id: this.generateId(vector.id),
        vector: vector.values,
        payload: {
          ...vector.metadata,
          namespace: namespace || 'default',
          _originalId: vector.id,
          _timestamp: Date.now()
        }
      }));
      
      // Upsert in batches of 100
      const batchSize = 100;
      const results = [];
      
      for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);
        
        const response = await this.client.upsert(this.collectionName, {
          wait: true,
          points: batch
        });
        
        results.push(response);
        this.metrics.operations.upserts += batch.length;
        
        console.log(`   ✓ Upserted batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(points.length / batchSize)}`);
      }
      
      return results;
      
    } catch (error) {
      console.error('Error upserting vectors:', error);
      throw error;
    }
  }

  /**
   * Search vectors
   * @param {Array} queryVector - Query vector
   * @param {Object} options - Search options
   */
  async search(queryVector, options = {}) {
    if (!this.initialized) {
      await this.initialize();
    }

    const {
      limit = 10,
      namespace = '',
      filter = {},
      scoreThreshold = 0.0,
      withPayload = true,
      withVector = false
    } = options;

    try {
      // Build Qdrant filter
      const qdrantFilter = this.buildQdrantFilter(filter, namespace);
      
      // Perform search
      const searchResult = await this.client.search(this.collectionName, {
        vector: queryVector,
        limit,
        filter: qdrantFilter,
        score_threshold: scoreThreshold,
        with_payload: withPayload,
        with_vector: withVector
      });
      
      this.metrics.operations.searches++;
      
      // Convert to common format
      return searchResult.map(result => ({
        id: result.payload?._originalId || result.id,
        score: result.score,
        metadata: result.payload || {}
      }));
      
    } catch (error) {
      console.error('Error searching vectors:', error);
      throw error;
    }
  }

  /**
   * Delete vectors
   * @param {Array} ids - Vector IDs to delete
   * @param {String} namespace - Optional namespace
   */
  async deleteVectors(ids, namespace = '') {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      // Convert IDs to Qdrant format
      const qdrantIds = ids.map(id => this.generateId(id));
      
      // Delete with optional namespace filter
      const filter = namespace ? {
        must: [{ key: 'namespace', match: { value: namespace } }]
      } : undefined;
      
      await this.client.delete(this.collectionName, {
        wait: true,
        points: qdrantIds,
        filter
      });
      
      this.metrics.operations.deletes += ids.length;
      console.log(`✓ Deleted ${ids.length} vectors`);
      
      return true;
      
    } catch (error) {
      console.error('Error deleting vectors:', error);
      throw error;
    }
  }

  /**
   * Clear all vectors in a namespace
   * @param {String} namespace - Namespace to clear
   */
  async clearNamespace(namespace) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      await this.client.delete(this.collectionName, {
        wait: true,
        filter: {
          must: [{ key: 'namespace', match: { value: namespace } }]
        }
      });
      
      console.log(`✓ Cleared namespace: ${namespace}`);
      return true;
      
    } catch (error) {
      console.error('Error clearing namespace:', error);
      throw error;
    }
  }

  /**
   * Build Qdrant filter from options
   */
  buildQdrantFilter(filters, namespace = '') {
    const conditions = [];
    
    // Namespace filter
    if (namespace) {
      conditions.push({
        key: 'namespace',
        match: { value: namespace }
      });
    }
    
    // Type filter
    if (filters.type) {
      conditions.push({
        key: 'type',
        match: { value: filters.type }
      });
    }
    
    // Date range filter
    if (filters.startDate || filters.endDate) {
      const dateConditions = {};
      if (filters.startDate) {
        dateConditions.gte = new Date(filters.startDate).getTime();
      }
      if (filters.endDate) {
        dateConditions.lte = new Date(filters.endDate).getTime();
      }
      conditions.push({
        key: 'publishedAt',
        range: dateConditions
      });
    }
    
    // Category filter
    if (filters.category) {
      conditions.push({
        key: 'category',
        match: { value: filters.category }
      });
    }
    
    // Source filter
    if (filters.sources && filters.sources.length > 0) {
      conditions.push({
        key: 'source',
        match: { any: filters.sources }
      });
    }
    
    // Bias filter
    if (filters.bias) {
      conditions.push({
        key: 'bias',
        match: { value: filters.bias }
      });
    }
    
    // Verification status filter
    if (filters.verificationStatus) {
      conditions.push({
        key: 'verificationStatus',
        match: { value: filters.verificationStatus }
      });
    }
    
    // Minimum importance filter
    if (filters.minImportance) {
      conditions.push({
        key: 'importance',
        range: { gte: filters.minImportance }
      });
    }
    
    return conditions.length > 0 ? { must: conditions } : undefined;
  }

  /**
   * Generate consistent ID for Qdrant (must be UUID or integer)
   */
  generateId(id) {
    // If already a valid UUID, use it
    if (typeof id === 'string' && id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
      return id;
    }
    
    // Convert string to a stable UUID-like format
    // This is a simple hash - in production, use a proper UUID library
    const hash = id.split('').reduce((acc, char) => {
      return ((acc << 5) - acc) + char.charCodeAt(0);
    }, 0);
    
    // Format as UUID-like string
    const hex = Math.abs(hash).toString(16).padStart(32, '0');
    return `${hex.substr(0, 8)}-${hex.substr(8, 4)}-${hex.substr(12, 4)}-${hex.substr(16, 4)}-${hex.substr(20, 12)}`;
  }

  /**
   * Get collection statistics
   */
  async getStats() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const info = await this.getCollectionInfo();
      const health = await this.client.api('GET', '/');
      
      return {
        database: {
          version: health.data?.version || 'unknown',
          status: 'connected',
          url: this.config.url
        },
        collection: info,
        metrics: this.metrics,
        namespaces: await this.getNamespaceStats()
      };
      
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        database: { status: 'error' },
        collection: { vectorsCount: 0 },
        metrics: this.metrics
      };
    }
  }

  /**
   * Get namespace statistics
   */
  async getNamespaceStats() {
    try {
      const namespaces = ['articles', 'facts', 'clusters', 'default'];
      const stats = {};
      
      for (const ns of namespaces) {
        const result = await this.client.count(this.collectionName, {
          exact: true,
          filter: {
            must: [{ key: 'namespace', match: { value: ns } }]
          }
        });
        
        stats[ns] = result.count || 0;
      }
      
      return stats;
      
    } catch (error) {
      console.error('Error getting namespace stats:', error);
      return {};
    }
  }

  /**
   * Test connection to Qdrant
   */
  async testConnection() {
    try {
      console.log('🔌 Testing Qdrant connection...');
      
      // Try to connect
      const health = await this.client.api('GET', '/');
      
      console.log('✅ Qdrant connection successful');
      console.log(`   Version: ${health.data?.version || 'unknown'}`);
      
      // Initialize if not already done
      if (!this.initialized) {
        await this.initialize();
      }
      
      const info = await this.getCollectionInfo();
      console.log(`   Collection: ${this.collectionName}`);
      console.log(`   Vectors: ${info.vectorsCount}`);
      console.log(`   Dimension: ${info.vectorSize}`);
      
      return true;
      
    } catch (error) {
      console.error('❌ Qdrant connection failed:', error.message);
      
      if (error.message?.includes('ECONNREFUSED')) {
        console.log('\n📝 To start Qdrant locally:');
        console.log('   docker run -p 6333:6333 qdrant/qdrant');
        console.log('\n📝 Or use Qdrant Cloud (1M vectors free):');
        console.log('   1. Sign up at https://cloud.qdrant.io');
        console.log('   2. Create a cluster');
        console.log('   3. Add to .env:');
        console.log('      QDRANT_URL=https://xxx.qdrant.io');
        console.log('      QDRANT_API_KEY=your_api_key');
      }
      
      return false;
    }
  }

  /**
   * Optimize collection for better performance
   */
  async optimizeCollection() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log('🔧 Optimizing collection...');
      
      // Update collection optimizer settings
      await this.client.updateCollection(this.collectionName, {
        optimizers_config: {
          indexing_threshold: 20000,
          memmap_threshold: 50000,
          default_segment_number: 2,
          max_segment_size: 200000
        }
      });
      
      console.log('✅ Collection optimized');
      return true;
      
    } catch (error) {
      console.error('Error optimizing collection:', error);
      return false;
    }
  }

  /**
   * Backup collection data
   */
  async createSnapshot() {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      console.log('📸 Creating collection snapshot...');
      
      const result = await this.client.createSnapshot(this.collectionName);
      
      console.log(`✅ Snapshot created: ${result.name}`);
      return result;
      
    } catch (error) {
      console.error('Error creating snapshot:', error);
      throw error;
    }
  }
}

// Export singleton instance
const qdrantDB = new QdrantDBConfig();
export default qdrantDB;

// Also export the class for testing
export { QdrantDBConfig };