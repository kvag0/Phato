import mongoose from 'mongoose';
import connectDB from '../config/database.js';
import Article from '../models/Article.js';
import EnhancedArticle from '../models/EnhancedArticle.js';
import Fact from '../models/Fact.js';
import { v4 as uuidv4 } from 'uuid';

/**
 * Database Migration Script
 * Migrates existing Article data to Enhanced Article structure
 * Extracts facts and creates separate Fact documents
 */

class DatabaseMigration {
  constructor() {
    this.stats = {
      articlesProcessed: 0,
      articlesSuccess: 0,
      articlesFailed: 0,
      factsExtracted: 0,
      factsSaved: 0,
      factsFailed: 0,
      errors: []
    };
  }

  async runMigration() {
    console.log('🚀 Starting database migration to Enhanced Article structure...\n');
    
    try {
      await connectDB();
      
      // Get total count for progress tracking
      const totalArticles = await Article.countDocuments();
      console.log(`📊 Found ${totalArticles} articles to migrate\n`);
      
      if (totalArticles === 0) {
        console.log('ℹ️  No articles found to migrate.');
        return;
      }
      
      // Process articles in batches to avoid memory issues
      const batchSize = 100;
      const totalBatches = Math.ceil(totalArticles / batchSize);
      
      console.log(`📦 Processing in ${totalBatches} batches of ${batchSize} articles each\n`);
      
      for (let batch = 0; batch < totalBatches; batch++) {
        await this.processBatch(batch, batchSize);
        
        // Progress update
        const progress = ((batch + 1) / totalBatches * 100).toFixed(1);
        console.log(`📈 Progress: ${progress}% (Batch ${batch + 1}/${totalBatches})`);
      }
      
      // Final statistics
      this.printFinalStats();
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  async processBatch(batchIndex, batchSize) {
    const skip = batchIndex * batchSize;
    
    try {
      // Fetch batch of articles
      const articles = await Article.find()
        .skip(skip)
        .limit(batchSize)
        .lean(); // Use lean() for better performance
      
      console.log(`\n🔄 Processing batch ${batchIndex + 1}: ${articles.length} articles`);
      
      // Process each article in the batch
      for (const article of articles) {
        await this.migrateArticle(article);
      }
      
    } catch (error) {
      console.error(`❌ Error processing batch ${batchIndex + 1}:`, error.message);
      this.stats.errors.push(`Batch ${batchIndex + 1}: ${error.message}`);
    }
  }

  async migrateArticle(originalArticle) {
    this.stats.articlesProcessed++;
    
    try {
      // Check if article already migrated
      const existingEnhanced = await EnhancedArticle.findOne({ url: originalArticle.url });
      if (existingEnhanced) {
        console.log(`⏭️  Article already migrated: ${originalArticle.title.substring(0, 50)}...`);
        this.stats.articlesSuccess++;
        return;
      }
      
      // Transform to enhanced structure
      const enhancedArticle = await this.transformArticle(originalArticle);
      
      // Save enhanced article
      const savedArticle = await new EnhancedArticle(enhancedArticle).save();
      
      // Extract and save facts
      if (enhancedArticle.extractedFacts && enhancedArticle.extractedFacts.length > 0) {
        await this.extractAndSaveFacts(enhancedArticle.extractedFacts, savedArticle._id);
      }
      
      this.stats.articlesSuccess++;
      
      if (this.stats.articlesProcessed % 10 === 0) {
        console.log(`   ✅ Processed ${this.stats.articlesProcessed} articles...`);
      }
      
    } catch (error) {
      this.stats.articlesFailed++;
      const errorMsg = `Failed to migrate article "${originalArticle.title}": ${error.message}`;
      this.stats.errors.push(errorMsg);
      
      console.log(`❌ ${errorMsg}`);
    }
  }

  async transformArticle(original) {
    // Create enhanced article structure
    const enhanced = {
      // Copy original fields
      title: original.title,
      url: original.url,
      source: original.source,
      author: original.author,
      publishedAt: original.publishedAt,
      category: original.category,
      content: original.content,
      description: original.description,
      imageUrl: original.imageUrl,
      fetchedAt: original.fetchedAt,
      tags: original.tags || [],
      language: original.language || 'en',
      
      // Enhanced temporal data (calculated in pre-save hook)
      temporalData: {
        publishedAt: original.publishedAt,
        fetchedAt: original.fetchedAt || new Date(),
        lastUpdated: new Date(),
        storyLifecycle: {
          isBreaking: this.detectBreakingNews(original),
          isUpdate: false,
          isFollowUp: false
        }
      },
      
      // Transform existing analysis to enhanced structure
      extractedFacts: await this.extractFactsFromAnalysis(original.analysis),
      
      // Enhanced bias analysis
      biasAnalysis: this.transformBiasAnalysis(original.analysis),
      
      // Semantic analysis
      entities: this.extractEntities(original),
      semanticKeywords: this.extractKeywords(original),
      
      // Content hash for duplicate detection
      contentHash: this.generateContentHash(original.content || ''),
      
      // Preserve original analysis for compatibility
      analysis: original.analysis,
      
      // Timestamps
      createdAt: original.createdAt,
      updatedAt: new Date()
    };
    
    return enhanced;
  }

  async extractFactsFromAnalysis(analysis) {
    const extractedFacts = [];
    
    if (!analysis || !analysis.facts) {
      return extractedFacts;
    }
    
    const facts = analysis.facts;
    
    // Extract WHO facts
    if (facts.who && Array.isArray(facts.who)) {
      facts.who.forEach(who => {
        if (who && who.trim()) {
          extractedFacts.push({
            factId: uuidv4(),
            statement: who.trim(),
            factType: 'WHO',
            verificationStatus: 'UNVERIFIED',
            confidence: 0.7,
            importance: 6,
            temporalScope: 'ONGOING'
          });
        }
      });
    }
    
    // Extract WHAT facts
    if (facts.what && facts.what.trim()) {
      extractedFacts.push({
        factId: uuidv4(),
        statement: facts.what.trim(),
        factType: 'WHAT',
        verificationStatus: 'UNVERIFIED',
        confidence: 0.8,
        importance: 8,
        temporalScope: 'DAYS'
      });
    }
    
    // Extract WHEN facts
    if (facts.when && facts.when.trim()) {
      extractedFacts.push({
        factId: uuidv4(),
        statement: facts.when.trim(),
        factType: 'WHEN',
        verificationStatus: 'VERIFIED', // Time facts are usually verifiable
        confidence: 0.9,
        importance: 7,
        temporalScope: 'INSTANT'
      });
    }
    
    // Extract WHERE facts
    if (facts.where && Array.isArray(facts.where)) {
      facts.where.forEach(where => {
        if (where && where.trim()) {
          extractedFacts.push({
            factId: uuidv4(),
            statement: where.trim(),
            factType: 'WHERE',
            verificationStatus: 'VERIFIED',
            confidence: 0.9,
            importance: 7,
            temporalScope: 'ONGOING'
          });
        }
      });
    }
    
    // Extract WHY facts
    if (facts.why && facts.why.trim()) {
      extractedFacts.push({
        factId: uuidv4(),
        statement: facts.why.trim(),
        factType: 'WHY',
        verificationStatus: 'UNVERIFIED', // WHY facts are often interpretative
        confidence: 0.6,
        importance: 6,
        temporalScope: 'ONGOING'
      });
    }
    
    this.stats.factsExtracted += extractedFacts.length;
    return extractedFacts;
  }

  async extractAndSaveFacts(extractedFacts, articleId) {
    for (const factData of extractedFacts) {
      try {
        // Check if fact already exists (by statement similarity)
        const existingFact = await Fact.findOne({
          statement: { $regex: this.escapeRegex(factData.statement), $options: 'i' }
        });
        
        if (existingFact) {
          // Add this article as a source to existing fact
          const sourceExists = existingFact.sourceArticles.some(
            source => source.articleId.toString() === articleId.toString()
          );
          
          if (!sourceExists) {
            existingFact.sourceArticles.push({
              articleId: articleId,
              publishedAt: new Date(),
              confidence: factData.confidence,
              context: 'Migrated from original analysis'
            });
            await existingFact.save();
          }
        } else {
          // Create new fact
          const newFact = new Fact({
            factId: factData.factId,
            statement: factData.statement,
            timeline: {
              firstReported: new Date(),
              lastUpdated: new Date()
            },
            classification: {
              type: factData.factType,
              importance: factData.importance,
              timeRelevance: 'CURRENT'
            },
            sourceArticles: [{
              articleId: articleId,
              publishedAt: new Date(),
              confidence: factData.confidence,
              context: 'Migrated from original analysis'
            }],
            verificationHistory: [{
              date: new Date(),
              status: factData.verificationStatus,
              verifiedBy: 'MIGRATION_SCRIPT',
              method: 'AUTOMATED',
              notes: 'Migrated from original article analysis'
            }],
            relevanceScore: {
              current: 50,
              trend: 'STABLE'
            }
          });
          
          await newFact.save();
          this.stats.factsSaved++;
        }
        
      } catch (error) {
        this.stats.factsFailed++;
        console.log(`⚠️  Failed to save fact: ${factData.statement.substring(0, 50)}... - ${error.message}`);
      }
    }
  }

  transformBiasAnalysis(analysis) {
    const biasAnalysis = {
      analyzedAt: analysis?.analyzedAt || new Date(),
      geminiVersion: analysis?.geminiVersion || 'migration-v1'
    };
    
    // Transform narratives to bias analysis
    if (analysis?.narratives && Array.isArray(analysis.narratives)) {
      const perspectives = analysis.narratives.map(n => n.perspective).filter(Boolean);
      
      if (perspectives.length > 0) {
        // Use the most common perspective, or first one if tied
        const perspectiveCount = perspectives.reduce((acc, p) => {
          acc[p] = (acc[p] || 0) + 1;
          return acc;
        }, {});
        
        const dominantPerspective = Object.keys(perspectiveCount).reduce((a, b) => 
          perspectiveCount[a] > perspectiveCount[b] ? a : b
        );
        
        biasAnalysis.overall_bias = dominantPerspective;
        
        // Extract emphasis and framing
        biasAnalysis.framing = analysis.narratives.flatMap(n => n.emphasis || []);
        biasAnalysis.emphasized_aspects = analysis.narratives.map(n => n.summary).filter(Boolean);
      }
    }
    
    // Default values for new fields
    biasAnalysis.emotional_tone = this.detectEmotionalTone(analysis);
    
    return biasAnalysis;
  }

  extractEntities(article) {
    const entities = [];
    
    // Extract from title and content
    const text = `${article.title} ${article.description || ''} ${article.content || ''}`;
    
    // Simple entity extraction (would be replaced by proper NLP in production)
    const personMatches = text.match(/([A-Z][a-z]+ [A-Z][a-z]+)/g) || [];
    personMatches.forEach(match => {
      if (!entities.some(e => e.name === match)) {
        entities.push({
          name: match,
          type: 'PERSON',
          mentions: 1,
          sentiment: 0
        });
      }
    });
    
    // Extract organization mentions (simple approach)
    const orgKeywords = ['Company', 'Corp', 'Inc', 'LLC', 'Ltd', 'Organization', 'Agency', 'Department'];
    orgKeywords.forEach(keyword => {
      const regex = new RegExp(`([A-Z][a-zA-Z\\s]+ ${keyword})`, 'g');
      const matches = text.match(regex) || [];
      matches.forEach(match => {
        if (!entities.some(e => e.name === match)) {
          entities.push({
            name: match,
            type: 'ORGANIZATION',
            mentions: 1,
            sentiment: 0
          });
        }
      });
    });
    
    return entities.slice(0, 10); // Limit to top 10 entities
  }

  extractKeywords(article) {
    const text = `${article.title} ${article.description || ''}`.toLowerCase();
    
    // Simple keyword extraction
    const words = text.split(/\W+/).filter(word => 
      word.length > 3 && 
      !['this', 'that', 'with', 'have', 'will', 'been', 'from', 'they', 'were', 'said'].includes(word)
    );
    
    // Count frequency and return top keywords
    const wordCount = words.reduce((acc, word) => {
      acc[word] = (acc[word] || 0) + 1;
      return acc;
    }, {});
    
    return Object.keys(wordCount)
      .sort((a, b) => wordCount[b] - wordCount[a])
      .slice(0, 10);
  }

  generateContentHash(content) {
    // Simple hash generation (would use crypto.createHash in production)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  detectBreakingNews(article) {
    const breakingKeywords = ['breaking', 'urgent', 'alert', 'developing', 'just in'];
    const title = (article.title || '').toLowerCase();
    const description = (article.description || '').toLowerCase();
    
    return breakingKeywords.some(keyword => 
      title.includes(keyword) || description.includes(keyword)
    );
  }

  detectEmotionalTone(analysis) {
    if (!analysis || !analysis.narratives) return 'neutral';
    
    const narratives = analysis.narratives;
    const emotionalWords = narratives.flatMap(n => (n.emphasis || []).join(' ')).join(' ').toLowerCase();
    
    if (emotionalWords.includes('crisis') || emotionalWords.includes('disaster') || emotionalWords.includes('terrible')) {
      return 'negative';
    }
    if (emotionalWords.includes('great') || emotionalWords.includes('success') || emotionalWords.includes('positive')) {
      return 'positive';
    }
    if (emotionalWords.includes('shocking') || emotionalWords.includes('outrage') || emotionalWords.includes('scandal')) {
      return 'inflammatory';
    }
    
    return 'neutral';
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  printFinalStats() {
    console.log('\n📊 Migration Complete! Final Statistics:');
    console.log('========================================');
    console.log(`📰 Articles Processed: ${this.stats.articlesProcessed.toLocaleString()}`);
    console.log(`✅ Articles Successfully Migrated: ${this.stats.articlesSuccess.toLocaleString()}`);
    console.log(`❌ Articles Failed: ${this.stats.articlesFailed.toLocaleString()}`);
    console.log(`📊 Facts Extracted: ${this.stats.factsExtracted.toLocaleString()}`);
    console.log(`💾 Facts Saved: ${this.stats.factsSaved.toLocaleString()}`);
    console.log(`⚠️  Facts Failed: ${this.stats.factsFailed.toLocaleString()}`);
    
    const successRate = ((this.stats.articlesSuccess / this.stats.articlesProcessed) * 100).toFixed(1);
    console.log(`🎯 Success Rate: ${successRate}%`);
    
    if (this.stats.errors.length > 0) {
      console.log(`\n❌ Errors Encountered: ${this.stats.errors.length}`);
      console.log('Recent errors:');
      this.stats.errors.slice(-5).forEach(error => {
        console.log(`   • ${error}`);
      });
    }
    
    console.log('\n🎉 Your Phato database has been successfully migrated to the enhanced temporal structure!');
    console.log('You can now use advanced features like:');
    console.log('   • Temporal fact tracking');
    console.log('   • Cross-source analysis');
    console.log('   • Enhanced bias detection');
    console.log('   • RAG-based chatbot functionality\n');
  }

  async verifyMigration() {
    console.log('🔍 Verifying migration...\n');
    
    try {
      const originalCount = await Article.countDocuments();
      const enhancedCount = await EnhancedArticle.countDocuments();
      const factCount = await Fact.countDocuments();
      
      console.log(`📊 Verification Results:`);
      console.log(`   Original Articles: ${originalCount.toLocaleString()}`);
      console.log(`   Enhanced Articles: ${enhancedCount.toLocaleString()}`);
      console.log(`   Total Facts: ${factCount.toLocaleString()}`);
      
      const migrationRate = (enhancedCount / originalCount * 100).toFixed(1);
      console.log(`   Migration Coverage: ${migrationRate}%`);
      
      if (migrationRate >= 95) {
        console.log('✅ Migration verification successful!\n');
      } else {
        console.log('⚠️  Migration may be incomplete. Consider re-running for failed articles.\n');
      }
      
    } catch (error) {
      console.error('❌ Error during verification:', error.message);
    }
  }

  async cleanup(dryRun = true) {
    console.log(`🧹 ${dryRun ? 'Preview' : 'Starting'} cleanup of original articles...\n`);
    
    try {
      const originalArticles = await Article.find().select('_id url title').lean();
      let cleanupCount = 0;
      
      for (const original of originalArticles) {
        const enhanced = await EnhancedArticle.findOne({ url: original.url });
        
        if (enhanced) {
          if (!dryRun) {
            await Article.deleteOne({ _id: original._id });
          }
          cleanupCount++;
          
          if (cleanupCount % 100 === 0) {
            console.log(`   ${dryRun ? 'Would clean' : 'Cleaned'}: ${cleanupCount} articles...`);
          }
        }
      }
      
      console.log(`\n${dryRun ? '🔍 Cleanup Preview' : '✅ Cleanup Complete'}:`);
      console.log(`   ${cleanupCount} original articles ${dryRun ? 'would be' : 'were'} removed`);
      console.log(`   ${originalArticles.length - cleanupCount} articles need manual review\n`);
      
      if (dryRun) {
        console.log('Run with --cleanup parameter to perform actual cleanup.\n');
      }
      
    } catch (error) {
      console.error('❌ Error during cleanup:', error.message);
    }
  }
}

// Export for use in other scripts
export { DatabaseMigration };

// CLI execution
if (process.argv[1].endsWith('migrateToEnhanced.js')) {
  const migration = new DatabaseMigration();
  
  const command = process.argv[2];
  
  if (command === 'verify') {
    migration.verifyMigration()
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Verification failed:', error);
        process.exit(1);
      });
  } else if (command === 'cleanup-preview') {
    migration.cleanup(true)
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Cleanup preview failed:', error);
        process.exit(1);
      });
  } else if (command === 'cleanup') {
    migration.cleanup(false)
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Cleanup failed:', error);
        process.exit(1);
      });
  } else {
    migration.runMigration()
      .then(() => migration.verifyMigration())
      .then(() => process.exit(0))
      .catch(error => {
        console.error('Migration failed:', error);
        process.exit(1);
      });
  }
}

export default DatabaseMigration;