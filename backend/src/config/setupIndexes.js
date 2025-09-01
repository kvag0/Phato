import mongoose from 'mongoose';
import connectDB from './database.js';
import EnhancedArticle from '../models/EnhancedArticle.js';
import Fact from '../models/Fact.js';
import ChatConversation from '../models/ChatConversation.js';
import StoryCluster from '../models/StoryCluster.js';

/**
 * Database Index Setup Script
 * Sets up all enhanced indexes for optimal query performance
 */

class IndexManager {
  constructor() {
    this.indexResults = {
      created: [],
      existed: [],
      failed: []
    };
  }

  async setupAllIndexes() {
    console.log('🚀 Starting enhanced database index setup...\n');
    
    try {
      await connectDB();
      
      // Setup indexes for each collection
      await this.setupEnhancedArticleIndexes();
      await this.setupFactIndexes();
      await this.setupChatConversationIndexes();
      await this.setupStoryClusterIndexes();
      
      // Create additional custom indexes
      await this.setupCustomIndexes();
      
      this.printResults();
      
    } catch (error) {
      console.error('❌ Error setting up indexes:', error);
      throw error;
    }
  }

  async setupEnhancedArticleIndexes() {
    console.log('📰 Setting up Enhanced Article indexes...');
    
    const collection = EnhancedArticle.collection;
    
    const indexes = [
      // Core temporal indexes
      { 'temporalData.publishedAt': -1 },
      { 'temporalData.publishDate': 1 },
      { 'temporalData.publishMonth': 1 },
      { 'temporalData.publishYear': 1 },
      { 'temporalData.publishWeek': 1 },
      { 'temporalData.publishHour': 1 },
      
      // Compound temporal indexes
      { 'temporalData.publishYear': 1, category: 1 },
      { category: 1, 'temporalData.publishedAt': -1, 'source.name': 1 },
      
      // Fact-specific indexes
      { 'extractedFacts.firstReported': -1 },
      { 'extractedFacts.factType': 1, 'extractedFacts.firstReported': -1 },
      { 'extractedFacts.verificationStatus': 1, 'extractedFacts.lastConfirmed': -1 },
      { 'extractedFacts.importance': -1 },
      
      // Bias analysis indexes
      { 'biasAnalysis.overall_bias': 1, 'temporalData.publishedAt': -1 },
      { 'biasAnalysis.emotional_tone': 1 },
      
      // Entity indexes
      { 'entities.name': 1, 'temporalData.publishedAt': -1 },
      { 'entities.type': 1 },
      { 'entities.sentiment': 1 },
      
      // Clustering and content indexes
      { storyCluster: 1 },
      { contentHash: 1 },
      { embedding: 1 }, // For vector similarity if using MongoDB vector search
      
      // Legacy compatibility indexes
      { publishedAt: -1 },
      { category: 1, publishedAt: -1 },
      { 'source.name': 1 },
      { tags: 1 },
      
      // Geographic indexes (2dsphere for location-based queries)
      { 'entities.location': '2dsphere' }
    ];
    
    // Full-text search index
    const textIndex = {
      title: 'text',
      description: 'text',
      content: 'text'
    };
    
    await this.createIndex(collection, textIndex, {
      weights: { title: 10, description: 5, content: 1 },
      name: 'enhanced_article_text_search'
    });
    
    // Create all other indexes
    for (const indexSpec of indexes) {
      await this.createIndex(collection, indexSpec);
    }
    
    console.log('✅ Enhanced Article indexes completed\n');
  }

  async setupFactIndexes() {
    console.log('📊 Setting up Fact indexes...');
    
    const collection = Fact.collection;
    
    const indexes = [
      // Core identifiers
      { factId: 1 },
      
      // Temporal indexes
      { 'timeline.firstReported': -1 },
      { 'timeline.lastUpdated': -1 },
      { 'timeline.reportDate': 1 },
      { 'timeline.reportMonth': 1 },
      { 'timeline.reportYear': 1 },
      { 'timeline.reportWeek': 1 },
      
      // Classification indexes
      { 'classification.type': 1, 'timeline.firstReported': -1 },
      { 'classification.category': 1, 'timeline.firstReported': -1 },
      { 'classification.timeRelevance': 1, 'timeline.firstReported': -1 },
      { 'classification.importance': -1, 'timeline.firstReported': -1 },
      { 'classification.scope': 1 },
      
      // Entity indexes
      { 'entities.name': 1 },
      { 'entities.type': 1 },
      
      // Verification indexes
      { 'verificationHistory.status': 1, 'verificationHistory.date': -1 },
      { 'verificationHistory.verifiedBy': 1 },
      
      // Relevance and quality indexes
      { 'relevanceScore.current': -1 },
      { 'relevanceScore.trend': 1 },
      { 'consensus.agreementLevel': -1 },
      
      // Article references
      { 'sourceArticles.articleId': 1 },
      { 'sourceArticles.publishedAt': -1 },
      
      // Geographic index
      { 'geography.locations.coordinates': '2dsphere' },
      
      // Flags for quick filtering
      { 'flags.isDisputed': 1 },
      { 'flags.needsVerification': 1 },
      { 'flags.isBreaking': 1 },
      { 'flags.isSensitive': 1 },
      
      // Related facts
      { 'relatedFacts.factId': 1 },
      { 'relatedFacts.relationship': 1 },
      
      // Tags
      { tags: 1 }
    ];
    
    // Text search index for fact statements
    const textIndex = { statement: 'text' };
    await this.createIndex(collection, textIndex, {
      name: 'fact_statement_text_search'
    });
    
    // Create all other indexes
    for (const indexSpec of indexes) {
      await this.createIndex(collection, indexSpec);
    }
    
    console.log('✅ Fact indexes completed\n');
  }

  async setupChatConversationIndexes() {
    console.log('💬 Setting up Chat Conversation indexes...');
    
    const collection = ChatConversation.collection;
    
    const indexes = [
      // Core identifiers
      { conversationId: 1 },
      { userId: 1 },
      { userFingerprint: 1 },
      
      // Temporal indexes
      { createdAt: -1 },
      { updatedAt: -1 },
      
      // Message indexes
      { 'messages.timestamp': -1 },
      { 'messages.role': 1 },
      { 'messages.messageId': 1 },
      
      // Context indexes
      { 'context.topics.name': 1 },
      { 'context.topics.lastMentioned': -1 },
      { 'context.preferredSources': 1 },
      { 'context.biasPreference': 1 },
      { 'context.factCheckingLevel': 1 },
      
      // Analytics indexes
      { 'analytics.averageUserRating': -1 },
      { 'analytics.totalMessages': -1 },
      { 'analytics.averageAccuracy': -1 },
      { 'analytics.biasAlertsTriggered': -1 },
      
      // Status and quality indexes
      { status: 1 },
      { 'conversationQuality.factualAccuracy': -1 },
      { 'conversationQuality.userSatisfaction': -1 },
      
      // Privacy and compliance indexes
      { 'privacy.dataRetentionDays': 1, createdAt: 1 },
      { 'privacy.anonymized': 1 },
      { 'privacy.canStore': 1 },
      
      // Flags
      { 'flags.needsReview': 1 },
      { 'flags.isHighQuality': 1 },
      { 'flags.isFlagged': 1 },
      { 'flags.hasSensitiveContent': 1 },
      
      // Archive
      { 'archivalInfo.archived': 1 },
      { 'archivalInfo.archivedAt': -1 }
    ];
    
    // Create all indexes
    for (const indexSpec of indexes) {
      await this.createIndex(collection, indexSpec);
    }
    
    console.log('✅ Chat Conversation indexes completed\n');
  }

  async setupStoryClusterIndexes() {
    console.log('🔗 Setting up Story Cluster indexes...');
    
    const collection = StoryCluster.collection;
    
    const indexes = [
      // Core identifier
      { clusterId: 1 },
      
      // Classification indexes
      { 'classification.category': 1, 'timespan.start': -1 },
      { 'classification.storyType': 1 },
      { 'classification.importance': -1 },
      { 'classification.scope': 1 },
      
      // Temporal indexes
      { 'timespan.start': -1 },
      { 'timespan.end': -1 },
      { 'timespan.lastUpdate': -1 },
      { 'timespan.peakActivity': -1 },
      
      // Entity indexes
      { 'mainEntities.name': 1 },
      { 'mainEntities.type': 1 },
      { 'mainEntities.mentions': -1 },
      
      // Consensus and narrative indexes
      { 'factConsensus.agreement_level': -1 },
      { 'factConsensus.verification_status': 1 },
      { 'narrativeSpectrum.bias_position': 1 },
      { 'narrativeSpectrum.strength': -1 },
      
      // Metrics indexes
      { 'metrics.total_articles': -1 },
      { 'metrics.unique_sources': -1 },
      { 'metrics.trending_score': -1 },
      { 'metrics.source_diversity': -1 },
      { 'metrics.fact_verification_rate': -1 },
      { 'metrics.narrative_balance': -1 },
      
      // Controversy indexes
      { 'controversy.level': 1 },
      { 'controversy.polarization_index': -1 },
      { 'controversy.bias_spread': -1 },
      
      // Geographic index
      { 'geography.primary_locations.coordinates': '2dsphere' },
      { 'geography.global_relevance': -1 },
      
      // Quality indexes
      { 'quality.overall_score': -1 },
      { 'quality.completeness': -1 },
      { 'quality.accuracy': -1 },
      { 'quality.source_reliability': -1 },
      
      // Status and flags
      { status: 1 },
      { 'flags.isBreaking': 1 },
      { 'flags.isTrending': 1 },
      { 'flags.isControversial': 1 },
      { 'flags.needsAttention': 1 },
      { 'flags.hasDisinformation': 1 },
      
      // Tags
      { tags: 1 },
      
      // Articles reference
      { articles: 1 },
      
      // Related clusters
      { 'relatedClusters.clusterId': 1 }
    ];
    
    // Text search index
    const textIndex = {
      title: 'text',
      description: 'text',
      summary: 'text'
    };
    
    await this.createIndex(collection, textIndex, {
      weights: { title: 10, description: 5, summary: 3 },
      name: 'story_cluster_text_search'
    });
    
    // Create all other indexes
    for (const indexSpec of indexes) {
      await this.createIndex(collection, indexSpec);
    }
    
    console.log('✅ Story Cluster indexes completed\n');
  }

  async setupCustomIndexes() {
    console.log('🔧 Setting up custom compound indexes...');
    
    // Custom compound indexes for complex queries
    const customIndexes = [
      // Cross-collection temporal analysis
      {
        collection: EnhancedArticle.collection,
        index: { 'temporalData.publishDate': 1, 'biasAnalysis.overall_bias': 1, 'classification.importance': -1 },
        name: 'temporal_bias_importance'
      },
      
      // Fact verification across time
      {
        collection: Fact.collection,
        index: { 'timeline.reportMonth': 1, 'classification.type': 1, 'verificationHistory.status': 1 },
        name: 'monthly_fact_verification'
      },
      
      // Story clustering performance
      {
        collection: StoryCluster.collection,
        index: { 'classification.category': 1, 'controversy.level': 1, 'metrics.trending_score': -1 },
        name: 'category_controversy_trending'
      },
      
      // Chat conversation analytics
      {
        collection: ChatConversation.collection,
        index: { 'context.biasPreference': 1, 'analytics.averageUserRating': -1, updatedAt: -1 },
        name: 'bias_preference_rating_time'
      },
      
      // Multi-dimensional article search
      {
        collection: EnhancedArticle.collection,
        index: { 
          'entities.name': 1, 
          'temporalData.publishWeek': 1, 
          'biasAnalysis.overall_bias': 1,
          'extractedFacts.verificationStatus': 1
        },
        name: 'entity_temporal_bias_verification'
      }
    ];
    
    for (const customIndex of customIndexes) {
      await this.createIndex(
        customIndex.collection, 
        customIndex.index, 
        { name: customIndex.name }
      );
    }
    
    console.log('✅ Custom indexes completed\n');
  }

  async createIndex(collection, indexSpec, options = {}) {
    try {
      const indexName = options.name || this.generateIndexName(indexSpec);
      
      // Check if index already exists
      const existingIndexes = await collection.listIndexes().toArray();
      const indexExists = existingIndexes.some(idx => 
        idx.name === indexName || 
        JSON.stringify(idx.key) === JSON.stringify(indexSpec)
      );
      
      if (indexExists) {
        this.indexResults.existed.push({
          collection: collection.collectionName,
          index: indexName,
          spec: indexSpec
        });
        return;
      }
      
      // Create the index
      await collection.createIndex(indexSpec, options);
      
      this.indexResults.created.push({
        collection: collection.collectionName,
        index: indexName,
        spec: indexSpec
      });
      
    } catch (error) {
      this.indexResults.failed.push({
        collection: collection.collectionName,
        index: this.generateIndexName(indexSpec),
        spec: indexSpec,
        error: error.message
      });
      
      console.warn(`⚠️  Failed to create index ${this.generateIndexName(indexSpec)} on ${collection.collectionName}:`, error.message);
    }
  }

  generateIndexName(indexSpec) {
    const keys = Object.keys(indexSpec);
    return keys.map(key => {
      const direction = indexSpec[key];
      if (direction === 1) return `${key}_asc`;
      if (direction === -1) return `${key}_desc`;
      if (direction === 'text') return `${key}_text`;
      if (direction === '2dsphere') return `${key}_geo`;
      return `${key}_${direction}`;
    }).join('_');
  }

  printResults() {
    console.log('\n📊 Index Setup Results:');
    console.log('========================');
    console.log(`✅ Created: ${this.indexResults.created.length} indexes`);
    console.log(`ℹ️  Already existed: ${this.indexResults.existed.length} indexes`);
    console.log(`❌ Failed: ${this.indexResults.failed.length} indexes\n`);
    
    if (this.indexResults.created.length > 0) {
      console.log('🆕 Newly Created Indexes:');
      this.indexResults.created.forEach(idx => {
        console.log(`   ${idx.collection}: ${idx.index}`);
      });
      console.log('');
    }
    
    if (this.indexResults.failed.length > 0) {
      console.log('❌ Failed Indexes:');
      this.indexResults.failed.forEach(idx => {
        console.log(`   ${idx.collection}: ${idx.index} - ${idx.error}`);
      });
      console.log('');
    }
    
    console.log('🎉 Database index setup completed!');
    console.log('Your Phato temporal RAG system is ready for optimal performance.\n');
  }

  async analyzeIndexUsage() {
    console.log('📈 Analyzing index usage...\n');
    
    const collections = [
      { name: 'EnhancedArticle', model: EnhancedArticle },
      { name: 'Fact', model: Fact },
      { name: 'ChatConversation', model: ChatConversation },
      { name: 'StoryCluster', model: StoryCluster }
    ];
    
    for (const collection of collections) {
      try {
        const stats = await collection.model.collection.stats();
        const indexes = await collection.model.collection.listIndexes().toArray();
        
        console.log(`📚 ${collection.name}:`);
        console.log(`   Documents: ${stats.count.toLocaleString()}`);
        console.log(`   Indexes: ${indexes.length}`);
        console.log(`   Storage Size: ${(stats.storageSize / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   Total Index Size: ${(stats.totalIndexSize / 1024 / 1024).toFixed(2)} MB\n`);
        
      } catch (error) {
        console.log(`⚠️  Could not get stats for ${collection.name}: ${error.message}\n`);
      }
    }
  }
}

// Export for use in other scripts
export { IndexManager };

// CLI execution
if (process.argv[1].endsWith('setupIndexes.js')) {
  const indexManager = new IndexManager();
  
  const command = process.argv[2];
  
  if (command === 'analyze') {
    indexManager.analyzeIndexUsage()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Error analyzing indexes:', error);
        process.exit(1);
      });
  } else {
    indexManager.setupAllIndexes()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Error setting up indexes:', error);
        process.exit(1);
      });
  }
}

export default IndexManager;