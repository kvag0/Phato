import embeddingService from './EmbeddingService.js';
import qdrantDB from '../../config/qdrantDB.js';
import EnhancedArticle from '../../models/EnhancedArticle.js';
import Fact from '../../models/Fact.js';
import StoryCluster from '../../models/StoryCluster.js';
import dotenv from 'dotenv';

dotenv.config();

/**
 * VectorSyncService
 * Synchronizes MongoDB data with Pinecone vector database
 * Handles initial sync, updates, and maintenance
 */
class VectorSyncService {
  constructor() {
    this.config = {
      batchSize: 100,              // Documents to process per batch
      embeddingBatchSize: 32,       // Embeddings per batch
      syncInterval: 3600000,        // Auto-sync interval (1 hour)
      maxRetries: 3,                // Max retries for failed operations
      retryDelay: 5000,             // Delay between retries
      namespaces: {
        articles: 'articles',
        facts: 'facts',
        clusters: 'clusters'
      }
    };
    
    this.syncStatus = {
      isRunning: false,
      lastSync: null,
      totalSynced: 0,
      errors: [],
      progress: {}
    };
    
    this.autoSyncTimer = null;
  }

  /**
   * Initialize the sync service
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Vector Sync Service...');
      
      // Initialize dependencies
      await qdrantDB.initialize();
      await embeddingService.initialize();
      
      console.log('✅ Vector Sync Service initialized');
      
      // Check sync status
      await this.checkSyncStatus();
      
    } catch (error) {
      console.error('❌ Error initializing Vector Sync Service:', error);
      throw error;
    }
  }

  /**
   * Perform full sync of all collections
   * @param {Object} options - Sync options
   * @returns {Object} Sync results
   */
  async fullSync(options = {}) {
    if (this.syncStatus.isRunning) {
      console.log('⚠️ Sync already in progress');
      return { error: 'Sync already in progress' };
    }
    
    console.log('🔄 Starting full vector database sync...');
    this.syncStatus.isRunning = true;
    this.syncStatus.errors = [];
    
    const startTime = Date.now();
    const results = {
      articles: { synced: 0, failed: 0 },
      facts: { synced: 0, failed: 0 },
      clusters: { synced: 0, failed: 0 },
      totalTime: 0
    };
    
    try {
      // Sync articles
      if (options.includeArticles !== false) {
        console.log('\n📰 Syncing articles...');
        const articleResults = await this.syncArticles(options);
        results.articles = articleResults;
      }
      
      // Sync facts
      if (options.includeFacts !== false) {
        console.log('\n📋 Syncing facts...');
        const factResults = await this.syncFacts(options);
        results.facts = factResults;
      }
      
      // Sync clusters
      if (options.includeClusters !== false) {
        console.log('\n🔗 Syncing story clusters...');
        const clusterResults = await this.syncClusters(options);
        results.clusters = clusterResults;
      }
      
      results.totalTime = Date.now() - startTime;
      
      // Update sync status
      this.syncStatus.lastSync = new Date();
      this.syncStatus.totalSynced = results.articles.synced + results.facts.synced + results.clusters.synced;
      
      console.log('\n✅ Full sync completed successfully!');
      console.log(`   Articles: ${results.articles.synced} synced, ${results.articles.failed} failed`);
      console.log(`   Facts: ${results.facts.synced} synced, ${results.facts.failed} failed`);
      console.log(`   Clusters: ${results.clusters.synced} synced, ${results.clusters.failed} failed`);
      console.log(`   Total time: ${(results.totalTime / 1000).toFixed(2)} seconds`);
      
      return results;
      
    } catch (error) {
      console.error('❌ Error during full sync:', error);
      this.syncStatus.errors.push({
        timestamp: new Date(),
        error: error.message,
        type: 'full_sync'
      });
      throw error;
      
    } finally {
      this.syncStatus.isRunning = false;
    }
  }

  /**
   * Sync articles to vector database
   * @param {Object} options - Sync options
   * @returns {Object} Sync results
   */
  async syncArticles(options = {}) {
    const results = { synced: 0, failed: 0, skipped: 0 };
    
    try {
      // Get total count
      const totalCount = await EnhancedArticle.countDocuments(options.filter || {});
      console.log(`   Found ${totalCount} articles to process`);
      
      if (totalCount === 0) {
        return results;
      }
      
      // Process in batches
      for (let skip = 0; skip < totalCount; skip += this.config.batchSize) {
        const batch = await EnhancedArticle
          .find(options.filter || {})
          .skip(skip)
          .limit(this.config.batchSize)
          .lean();
        
        const batchResults = await this.processBatch(batch, 'article');
        
        results.synced += batchResults.success;
        results.failed += batchResults.failed;
        results.skipped += batchResults.skipped;
        
        // Update progress
        const progress = Math.round((skip + batch.length) / totalCount * 100);
        this.syncStatus.progress.articles = progress;
        
        console.log(`   ✓ Processed batch ${Math.floor(skip / this.config.batchSize) + 1}/${Math.ceil(totalCount / this.config.batchSize)} (${progress}%)`);
      }
      
    } catch (error) {
      console.error('Error syncing articles:', error);
      this.syncStatus.errors.push({
        timestamp: new Date(),
        error: error.message,
        type: 'sync_articles'
      });
    }
    
    return results;
  }

  /**
   * Sync facts to vector database
   * @param {Object} options - Sync options
   * @returns {Object} Sync results
   */
  async syncFacts(options = {}) {
    const results = { synced: 0, failed: 0, skipped: 0 };
    
    try {
      // Get total count
      const totalCount = await Fact.countDocuments(options.filter || {});
      console.log(`   Found ${totalCount} facts to process`);
      
      if (totalCount === 0) {
        return results;
      }
      
      // Process in batches
      for (let skip = 0; skip < totalCount; skip += this.config.batchSize) {
        const batch = await Fact
          .find(options.filter || {})
          .skip(skip)
          .limit(this.config.batchSize)
          .lean();
        
        const batchResults = await this.processBatch(batch, 'fact');
        
        results.synced += batchResults.success;
        results.failed += batchResults.failed;
        results.skipped += batchResults.skipped;
        
        // Update progress
        const progress = Math.round((skip + batch.length) / totalCount * 100);
        this.syncStatus.progress.facts = progress;
        
        console.log(`   ✓ Processed batch ${Math.floor(skip / this.config.batchSize) + 1}/${Math.ceil(totalCount / this.config.batchSize)} (${progress}%)`);
      }
      
    } catch (error) {
      console.error('Error syncing facts:', error);
      this.syncStatus.errors.push({
        timestamp: new Date(),
        error: error.message,
        type: 'sync_facts'
      });
    }
    
    return results;
  }

  /**
   * Sync story clusters to vector database
   * @param {Object} options - Sync options
   * @returns {Object} Sync results
   */
  async syncClusters(options = {}) {
    const results = { synced: 0, failed: 0, skipped: 0 };
    
    try {
      // Get total count
      const totalCount = await StoryCluster.countDocuments(options.filter || {});
      console.log(`   Found ${totalCount} clusters to process`);
      
      if (totalCount === 0) {
        return results;
      }
      
      // Process in batches
      for (let skip = 0; skip < totalCount; skip += this.config.batchSize) {
        const batch = await StoryCluster
          .find(options.filter || {})
          .skip(skip)
          .limit(this.config.batchSize)
          .lean();
        
        const batchResults = await this.processBatch(batch, 'cluster');
        
        results.synced += batchResults.success;
        results.failed += batchResults.failed;
        results.skipped += batchResults.skipped;
        
        // Update progress
        const progress = Math.round((skip + batch.length) / totalCount * 100);
        this.syncStatus.progress.clusters = progress;
        
        console.log(`   ✓ Processed batch ${Math.floor(skip / this.config.batchSize) + 1}/${Math.ceil(totalCount / this.config.batchSize)} (${progress}%)`);
      }
      
    } catch (error) {
      console.error('Error syncing clusters:', error);
      this.syncStatus.errors.push({
        timestamp: new Date(),
        error: error.message,
        type: 'sync_clusters'
      });
    }
    
    return results;
  }

  /**
   * Process a batch of documents
   * @param {Array} batch - Documents to process
   * @param {String} type - Document type
   * @returns {Object} Batch results
   */
  async processBatch(batch, type) {
    const results = { success: 0, failed: 0, skipped: 0 };
    
    if (!batch || batch.length === 0) {
      return results;
    }
    
    try {
      // Generate embeddings for batch
      const embeddings = [];
      
      for (const doc of batch) {
        try {
          // Skip if already has embedding and not forcing update
          if (doc.embedding && doc.embedding.version === embeddingService.modelName) {
            results.skipped++;
            continue;
          }
          
          // Generate embedding based on type
          let embeddingData;
          
          switch (type) {
            case 'fact':
              embeddingData = await embeddingService.embedFact(doc);
              break;
            case 'cluster':
              embeddingData = await embeddingService.embedCluster(doc);
              break;
            case 'article':
            default:
              embeddingData = await embeddingService.embedArticle(doc);
              break;
          }
          
          embeddings.push(embeddingData);
          results.success++;
          
        } catch (error) {
          console.error(`Error processing document ${doc._id || doc.factId || doc.clusterId}:`, error.message);
          results.failed++;
        }
      }
      
      // Upsert embeddings to Qdrant
      if (embeddings.length > 0) {
        const namespace = this.config.namespaces[type + 's'] || '';
        await qdrantDB.upsertVectors(embeddings, namespace);
        
        // Update MongoDB documents with embedding status
        await this.updateEmbeddingStatus(batch, type);
      }
      
    } catch (error) {
      console.error('Error processing batch:', error);
      results.failed += batch.length - results.success - results.skipped;
    }
    
    return results;
  }

  /**
   * Update embedding status in MongoDB
   * @param {Array} documents - Documents to update
   * @param {String} type - Document type
   */
  async updateEmbeddingStatus(documents, type) {
    try {
      const updates = documents.map(doc => {
        const update = {
          embedding: {
            generated: true,
            version: embeddingService.modelName,
            updatedAt: new Date()
          }
        };
        
        let filter;
        switch (type) {
          case 'fact':
            filter = { factId: doc.factId };
            break;
          case 'cluster':
            filter = { clusterId: doc.clusterId };
            break;
          case 'article':
          default:
            filter = { _id: doc._id };
            break;
        }
        
        return { filter, update };
      });
      
      // Perform bulk update
      for (const { filter, update } of updates) {
        let Model;
        switch (type) {
          case 'fact':
            Model = Fact;
            break;
          case 'cluster':
            Model = StoryCluster;
            break;
          case 'article':
          default:
            Model = EnhancedArticle;
            break;
        }
        
        await Model.updateOne(filter, { $set: update });
      }
      
    } catch (error) {
      console.error('Error updating embedding status:', error);
    }
  }

  /**
   * Sync single document
   * @param {Object} document - Document to sync
   * @param {String} type - Document type
   * @returns {Boolean} Success status
   */
  async syncSingleDocument(document, type) {
    try {
      // Generate embedding
      let embeddingData;
      
      switch (type) {
        case 'fact':
          embeddingData = await embeddingService.embedFact(document);
          break;
        case 'cluster':
          embeddingData = await embeddingService.embedCluster(document);
          break;
        case 'article':
        default:
          embeddingData = await embeddingService.embedArticle(document);
          break;
      }
      
      // Upsert to Qdrant
      const namespace = this.config.namespaces[type + 's'] || '';
      await qdrantDB.upsertVectors([embeddingData], namespace);
      
      // Update MongoDB
      await this.updateEmbeddingStatus([document], type);
      
      return true;
      
    } catch (error) {
      console.error(`Error syncing single document:`, error);
      return false;
    }
  }

  /**
   * Incremental sync - sync only new or updated documents
   * @param {Object} options - Sync options
   * @returns {Object} Sync results
   */
  async incrementalSync(options = {}) {
    console.log('🔄 Starting incremental sync...');
    
    const lastSync = options.since || this.syncStatus.lastSync || new Date(Date.now() - 24 * 3600000);
    
    const filter = {
      $or: [
        { createdAt: { $gte: lastSync } },
        { updatedAt: { $gte: lastSync } },
        { 'embedding.generated': { $ne: true } }
      ]
    };
    
    // Merge with user filter
    if (options.filter) {
      filter.$and = [filter, options.filter];
    }
    
    return await this.fullSync({
      ...options,
      filter
    });
  }

  /**
   * Delete vectors for removed documents
   * @param {Array} ids - Document IDs to remove
   * @param {String} type - Document type
   * @returns {Boolean} Success status
   */
  async deleteVectors(ids, type) {
    try {
      const namespace = this.config.namespaces[type + 's'] || '';
      
      // Format IDs for Pinecone
      const vectorIds = ids.map(id => {
        switch (type) {
          case 'fact':
            return `fact_${id}`;
          case 'cluster':
            return `cluster_${id}`;
          default:
            return id.toString();
        }
      });
      
      await qdrantDB.deleteVectors(vectorIds, namespace);
      
      console.log(`✓ Deleted ${ids.length} vectors from ${type} namespace`);
      return true;
      
    } catch (error) {
      console.error('Error deleting vectors:', error);
      return false;
    }
  }

  /**
   * Check sync status and statistics
   * @returns {Object} Sync status and stats
   */
  async checkSyncStatus() {
    try {
      const stats = {
        database: {},
        vectors: {},
        syncStatus: this.syncStatus
      };
      
      // Get MongoDB counts
      stats.database.articles = await EnhancedArticle.countDocuments();
      stats.database.facts = await Fact.countDocuments();
      stats.database.clusters = await StoryCluster.countDocuments();
      stats.database.total = stats.database.articles + stats.database.facts + stats.database.clusters;
      
      // Get Qdrant stats
      const vectorStats = await qdrantDB.getStats();
      stats.vectors = vectorStats.collection;
      
      // Check sync coverage
      const articlesWithEmbedding = await EnhancedArticle.countDocuments({ 'embedding.generated': true });
      const factsWithEmbedding = await Fact.countDocuments({ 'embedding.generated': true });
      const clustersWithEmbedding = await StoryCluster.countDocuments({ 'embedding.generated': true });
      
      stats.coverage = {
        articles: stats.database.articles > 0 ? (articlesWithEmbedding / stats.database.articles * 100).toFixed(2) + '%' : '0%',
        facts: stats.database.facts > 0 ? (factsWithEmbedding / stats.database.facts * 100).toFixed(2) + '%' : '0%',
        clusters: stats.database.clusters > 0 ? (clustersWithEmbedding / stats.database.clusters * 100).toFixed(2) + '%' : '0%'
      };
      
      console.log('\n📊 Sync Status Report:');
      console.log('   Database Documents:');
      console.log(`     Articles: ${stats.database.articles}`);
      console.log(`     Facts: ${stats.database.facts}`);
      console.log(`     Clusters: ${stats.database.clusters}`);
      console.log('   Vector Coverage:');
      console.log(`     Articles: ${stats.coverage.articles}`);
      console.log(`     Facts: ${stats.coverage.facts}`);
      console.log(`     Clusters: ${stats.coverage.clusters}`);
      console.log('   Vector Database:');
      console.log(`     Total vectors: ${stats.vectors.totalVectors}`);
      console.log(`     Index fullness: ${(stats.vectors.indexFullness * 100).toFixed(2)}%`);
      
      return stats;
      
    } catch (error) {
      console.error('Error checking sync status:', error);
      return null;
    }
  }

  /**
   * Start automatic synchronization
   * @param {Number} interval - Sync interval in milliseconds
   */
  startAutoSync(interval = this.config.syncInterval) {
    if (this.autoSyncTimer) {
      console.log('⚠️ Auto-sync already running');
      return;
    }
    
    console.log(`🔄 Starting auto-sync with ${interval / 60000} minute interval`);
    
    // Run initial sync
    this.incrementalSync().catch(error => {
      console.error('Auto-sync error:', error);
    });
    
    // Set up recurring sync
    this.autoSyncTimer = setInterval(() => {
      this.incrementalSync().catch(error => {
        console.error('Auto-sync error:', error);
      });
    }, interval);
  }

  /**
   * Stop automatic synchronization
   */
  stopAutoSync() {
    if (this.autoSyncTimer) {
      clearInterval(this.autoSyncTimer);
      this.autoSyncTimer = null;
      console.log('✓ Auto-sync stopped');
    }
  }

  /**
   * Repair sync issues
   * @param {Object} options - Repair options
   * @returns {Object} Repair results
   */
  async repairSync(options = {}) {
    console.log('🔧 Running sync repair...');
    
    const results = {
      orphanedVectors: 0,
      missingEmbeddings: 0,
      outdatedEmbeddings: 0,
      repaired: 0
    };
    
    try {
      // Find documents without embeddings
      const missingArticles = await EnhancedArticle.find({
        $or: [
          { 'embedding.generated': { $ne: true } },
          { 'embedding.version': { $ne: embeddingService.modelName } }
        ]
      }).limit(1000);
      
      results.missingEmbeddings = missingArticles.length;
      
      if (missingArticles.length > 0 && options.fix) {
        console.log(`   Fixing ${missingArticles.length} missing embeddings...`);
        const syncResults = await this.processBatch(missingArticles, 'article');
        results.repaired += syncResults.success;
      }
      
      // Check for outdated embeddings
      const outdatedCount = await EnhancedArticle.countDocuments({
        'embedding.version': { $ne: embeddingService.modelName }
      });
      
      results.outdatedEmbeddings = outdatedCount;
      
      if (outdatedCount > 0 && options.updateOutdated) {
        console.log(`   Updating ${outdatedCount} outdated embeddings...`);
        const outdatedDocs = await EnhancedArticle.find({
          'embedding.version': { $ne: embeddingService.modelName }
        }).limit(100);
        
        const syncResults = await this.processBatch(outdatedDocs, 'article');
        results.repaired += syncResults.success;
      }
      
      console.log('\n✅ Sync repair completed:');
      console.log(`   Missing embeddings: ${results.missingEmbeddings}`);
      console.log(`   Outdated embeddings: ${results.outdatedEmbeddings}`);
      console.log(`   Repaired: ${results.repaired}`);
      
      return results;
      
    } catch (error) {
      console.error('Error during sync repair:', error);
      throw error;
    }
  }

  /**
   * Clear all vectors from a namespace
   * @param {String} namespace - Namespace to clear
   * @returns {Boolean} Success status
   */
  async clearNamespace(namespace) {
    try {
      await qdrantDB.clearNamespace(namespace);
      
      // Reset embedding status in MongoDB
      let Model;
      switch (namespace) {
        case this.config.namespaces.facts:
          Model = Fact;
          break;
        case this.config.namespaces.clusters:
          Model = StoryCluster;
          break;
        case this.config.namespaces.articles:
        default:
          Model = EnhancedArticle;
          break;
      }
      
      await Model.updateMany({}, {
        $unset: { embedding: 1 }
      });
      
      console.log(`✓ Cleared namespace: ${namespace}`);
      return true;
      
    } catch (error) {
      console.error('Error clearing namespace:', error);
      return false;
    }
  }

  /**
   * Get sync metrics
   */
  getMetrics() {
    return {
      status: this.syncStatus,
      autoSync: this.autoSyncTimer !== null,
      errors: this.syncStatus.errors.slice(-10) // Last 10 errors
    };
  }
}

// Export singleton instance
const vectorSyncService = new VectorSyncService();
export default vectorSyncService;

// Also export the class for testing
export { VectorSyncService };