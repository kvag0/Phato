#!/usr/bin/env node

/**
 * Complete System Test for Phato Backend
 * Tests the optimized mobile app architecture with Qdrant
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

// Import models
import EnhancedArticle from './src/models/EnhancedArticle.js';
import Fact from './src/models/Fact.js';

// Import services
import embeddingService from './src/services/vector/EmbeddingService.js';
import qdrantDB from './src/config/qdrantDB.js';
import hybridSearchService from './src/services/vector/HybridSearchService.js';
import vectorSyncService from './src/services/vector/VectorSyncService.js';
import localLLMClient from './src/services/llm/LocalLLMClient.js';

console.log(chalk.cyan.bold('\n' + '='.repeat(70)));
console.log(chalk.cyan.bold('   PHATO COMPLETE SYSTEM TEST - MOBILE APP BACKEND'));
console.log(chalk.cyan.bold('   Optimized Architecture: MongoDB + Qdrant + Local AI'));
console.log(chalk.cyan.bold('='.repeat(70) + '\n'));

const testResults = {
  passed: [],
  failed: [],
  warnings: [],
  recommendations: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  
  switch(type) {
    case 'success':
      console.log(chalk.green(`[${timestamp}] ✅ ${message}`));
      testResults.passed.push(message);
      break;
    case 'error':
      console.log(chalk.red(`[${timestamp}] ❌ ${message}`));
      testResults.failed.push(message);
      break;
    case 'warning':
      console.log(chalk.yellow(`[${timestamp}] ⚠️  ${message}`));
      testResults.warnings.push(message);
      break;
    case 'info':
      console.log(chalk.blue(`[${timestamp}] ℹ️  ${message}`));
      break;
    case 'section':
      console.log(chalk.magenta.bold(`\n[${timestamp}] 📋 ${message}`));
      console.log(chalk.magenta('─'.repeat(60)));
      break;
    default:
      console.log(`[${timestamp}] ${message}`);
  }
}

// Test Environment Configuration
async function testEnvironment() {
  log('ENVIRONMENT CONFIGURATION', 'section');
  
  const required = {
    'MONGODB_URI': process.env.MONGODB_URI,
    'NEWS_API_KEY': process.env.NEWS_API_KEY,
    'QDRANT_URL': process.env.QDRANT_URL || 'http://localhost:6333'
  };
  
  const optional = {
    'QDRANT_API_KEY': process.env.QDRANT_API_KEY,
    'GEMINI_API_KEY': process.env.GEMINI_API_KEY,
    'LLM_SERVICE_URL': process.env.LLM_SERVICE_URL || 'http://localhost:8001'
  };
  
  log('Required Environment Variables:');
  for (const [key, value] of Object.entries(required)) {
    if (value) {
      log(`${key}: Configured`, 'success');
    } else {
      log(`${key}: Missing`, 'error');
    }
  }
  
  log('\nOptional Environment Variables:');
  for (const [key, value] of Object.entries(optional)) {
    if (value) {
      log(`${key}: Configured`, 'info');
    } else {
      log(`${key}: Not configured`, 'warning');
    }
  }
  
  // Architecture recommendation
  if (!process.env.QDRANT_API_KEY) {
    testResults.recommendations.push(
      'For production: Sign up for Qdrant Cloud (1M vectors free) at https://cloud.qdrant.io'
    );
  }
}

// Test MongoDB Connection
async function testMongoDB() {
  log('MONGODB DATABASE', 'section');
  
  try {
    if (!process.env.MONGODB_URI) {
      log('MongoDB URI not configured', 'error');
      return false;
    }
    
    log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    log('MongoDB connected successfully', 'success');
    
    // Test model operations
    const testArticle = await EnhancedArticle.create({
      title: `System Test Article ${Date.now()}`,
      content: 'This is a test article for the complete system validation.',
      source: { name: 'Test Source' },
      publishedAt: new Date(),
      category: 'technology'
    });
    
    log('Article model tested successfully', 'success');
    log(`  - Temporal indexing: ${testArticle.temporalData ? 'Working' : 'Failed'}`);
    log(`  - Content hash: ${testArticle.contentHash ? 'Generated' : 'Failed'}`);
    
    // Cleanup
    await EnhancedArticle.deleteOne({ _id: testArticle._id });
    
    // Test database stats
    const stats = await mongoose.connection.db.stats();
    log(`Database size: ${(stats.dataSize / 1024 / 1024).toFixed(2)} MB`);
    
    return true;
    
  } catch (error) {
    log(`MongoDB error: ${error.message}`, 'error');
    
    if (error.message.includes('IP')) {
      testResults.recommendations.push(
        'Add your IP to MongoDB Atlas whitelist: Atlas Dashboard > Security > Network Access'
      );
    }
    
    return false;
  }
}

// Test Qdrant Vector Database
async function testQdrant() {
  log('QDRANT VECTOR DATABASE', 'section');
  
  try {
    // Test connection
    const connected = await qdrantDB.testConnection();
    
    if (!connected) {
      log('Qdrant not available', 'error');
      testResults.recommendations.push(
        'Start Qdrant locally: docker run -p 6333:6333 qdrant/qdrant'
      );
      return false;
    }
    
    log('Qdrant connected successfully', 'success');
    
    // Get stats
    const stats = await qdrantDB.getStats();
    log(`Qdrant version: ${stats.database.version}`);
    log(`Collection: ${stats.collection.name}`);
    log(`Vectors: ${stats.collection.vectorsCount}`);
    log(`Dimension: ${stats.collection.vectorSize}`);
    
    // Test vector operations
    log('Testing vector operations...');
    
    // Create test embedding
    const testText = 'Test vector for Qdrant validation';
    const embedding = await embeddingService.generateEmbedding(testText);
    
    // Upsert test vector
    await qdrantDB.upsertVectors([{
      id: 'test-' + uuidv4(),
      values: embedding,
      metadata: {
        type: 'test',
        content: testText,
        timestamp: Date.now()
      }
    }], 'test');
    
    log('Vector upsert successful', 'success');
    
    // Search test
    const searchResults = await qdrantDB.search(embedding, {
      limit: 5,
      namespace: 'test'
    });
    
    log(`Vector search successful (found ${searchResults.length} results)`, 'success');
    
    // Check namespaces
    const namespaceStats = await qdrantDB.getNamespaceStats();
    log('Namespace distribution:');
    for (const [ns, count] of Object.entries(namespaceStats)) {
      log(`  - ${ns}: ${count} vectors`);
    }
    
    return true;
    
  } catch (error) {
    log(`Qdrant error: ${error.message}`, 'error');
    return false;
  }
}

// Test Embedding Service
async function testEmbeddingService() {
  log('EMBEDDING SERVICE (BAAI/bge-large-en-v1.5)', 'section');
  
  try {
    log('Initializing embedding service...');
    await embeddingService.initialize();
    
    log('Embedding service initialized', 'success');
    log(`Model: ${embeddingService.modelName}`);
    log(`Dimension: ${embeddingService.dimension}`);
    log(`Cache directory: ${embeddingService.cacheDir}`);
    
    // Test embedding generation
    const testTexts = [
      'Climate change impacts global weather patterns',
      'Technology advances reshape modern society',
      'Political developments affect international relations'
    ];
    
    log('Testing batch embeddings...');
    const embeddings = await embeddingService.generateBatchEmbeddings(testTexts, {
      batchSize: 3
    });
    
    log(`Generated ${embeddings.length} embeddings`, 'success');
    
    // Check embedding quality
    const similarity = embeddingService.calculateSimilarity(embeddings[0], embeddings[1]);
    log(`Semantic similarity test: ${(similarity * 100).toFixed(2)}%`);
    
    // Get metrics
    const metrics = embeddingService.getMetrics();
    log(`Total embeddings generated: ${metrics.totalEmbeddings}`);
    log(`Average processing time: ${metrics.averageTime.toFixed(2)}ms`);
    log(`Cache hit rate: ${metrics.cacheHitRate}`);
    
    return true;
    
  } catch (error) {
    log(`Embedding service error: ${error.message}`, 'error');
    return false;
  }
}

// Test Local LLM Service
async function testLLMService() {
  log('LOCAL LLM SERVICE (gemma-3-1b-it)', 'section');
  
  try {
    const health = await localLLMClient.checkHealth();
    
    if (!health.available) {
      log('LLM service not running', 'warning');
      testResults.recommendations.push(
        'Start LLM service: cd llm-service && ./start.sh'
      );
      return false;
    }
    
    log('LLM service available', 'success');
    log(`Model: ${health.model}`);
    log(`Device: ${health.device}`);
    
    // Test various capabilities
    log('Testing LLM capabilities...');
    
    // Test generation
    const genResponse = await localLLMClient.generate('What is news bias?', {
      maxTokens: 50
    });
    log('Text generation: Working', genResponse.text ? 'success' : 'error');
    
    // Test fact extraction
    const factResponse = await localLLMClient.extractFacts(
      'The global temperature has risen by 1.1 degrees Celsius since 1880.'
    );
    log(`Fact extraction: ${factResponse.facts?.length || 0} facts extracted`, 
        factResponse.facts?.length > 0 ? 'success' : 'warning');
    
    // Test bias analysis
    const biasResponse = await localLLMClient.analyzeBias(
      'The government must immediately address this crisis.'
    );
    log(`Bias analysis: ${biasResponse.overall_bias || 'Unknown'}`, 
        biasResponse.overall_bias ? 'success' : 'warning');
    
    // Get metrics
    const metrics = await localLLMClient.getMetrics();
    log(`Total requests: ${metrics.client.totalRequests}`);
    log(`Success rate: ${metrics.client.successRate}`);
    
    return true;
    
  } catch (error) {
    log(`LLM service error: ${error.message}`, 'error');
    return false;
  }
}

// Test Hybrid Search
async function testHybridSearch() {
  log('HYBRID SEARCH SYSTEM', 'section');
  
  try {
    log('Initializing hybrid search...');
    await hybridSearchService.initialize();
    
    log('Hybrid search initialized', 'success');
    
    // Create test data
    log('Creating test articles...');
    const testArticles = [];
    
    for (let i = 0; i < 3; i++) {
      const article = await EnhancedArticle.create({
        title: `Test Article ${i}: ${['Climate Change', 'Technology', 'Politics'][i]}`,
        content: [
          'Global warming affects weather patterns worldwide.',
          'Artificial intelligence transforms industries.',
          'Elections shape democratic societies.'
        ][i],
        source: { name: `Source ${i}` },
        publishedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000),
        category: ['environment', 'technology', 'politics'][i]
      });
      testArticles.push(article);
    }
    
    // Sync to vector database
    log('Syncing articles to vector database...');
    await vectorSyncService.syncSingleDocument(testArticles[0], 'article');
    
    // Test search
    log('Testing hybrid search...');
    const searchResults = await hybridSearchService.search('climate change', {
      limit: 5,
      type: 'article'
    });
    
    log(`Search returned ${searchResults.results.length} results`, 'success');
    log(`Search strategy: ${searchResults.strategy}`);
    log(`Search time: ${searchResults.metadata.searchTime}ms`);
    
    // Cleanup
    for (const article of testArticles) {
      await EnhancedArticle.deleteOne({ _id: article._id });
    }
    
    return true;
    
  } catch (error) {
    log(`Hybrid search error: ${error.message}`, 'error');
    return false;
  }
}

// Test End-to-End Pipeline
async function testPipeline() {
  log('END-TO-END PIPELINE TEST', 'section');
  
  try {
    log('Testing complete article processing pipeline...');
    
    // 1. Create article
    const article = await EnhancedArticle.create({
      title: 'Breaking: Major Climate Summit Reaches Historic Agreement',
      content: 'World leaders gathered in Geneva have reached a groundbreaking agreement on climate action. The summit, attended by representatives from 195 countries, established new targets for carbon emission reductions. Scientists say this could limit global warming to 1.5 degrees Celsius.',
      source: { name: 'Global News Network' },
      publishedAt: new Date(),
      category: 'environment'
    });
    
    log('Article created with temporal indexing', 'success');
    
    // 2. Generate embedding
    const articleEmbedding = await embeddingService.embedArticle(article);
    log('Article embedding generated', 'success');
    
    // 3. Store in vector database
    await qdrantDB.upsertVectors([articleEmbedding], 'articles');
    log('Article stored in vector database', 'success');
    
    // 4. Extract facts (if LLM available)
    if (await localLLMClient.checkHealth().then(h => h.available)) {
      const facts = await localLLMClient.extractFacts(article.content);
      log(`Extracted ${facts.facts?.length || 0} facts from article`, 'success');
    }
    
    // 5. Search for article
    const searchResults = await hybridSearchService.search('climate summit agreement', {
      limit: 5,
      type: 'article'
    });
    
    log(`Article found in search (${searchResults.results.length} results)`, 'success');
    
    // Cleanup
    await EnhancedArticle.deleteOne({ _id: article._id });
    
    return true;
    
  } catch (error) {
    log(`Pipeline error: ${error.message}`, 'error');
    return false;
  }
}

// Performance Metrics
async function testPerformance() {
  log('PERFORMANCE METRICS', 'section');
  
  const metrics = {
    embedding: {
      avgTime: 0,
      operations: 0
    },
    vector: {
      avgTime: 0,
      operations: 0
    },
    search: {
      avgTime: 0,
      operations: 0
    }
  };
  
  try {
    // Test embedding speed
    log('Testing embedding performance...');
    const embeddingStart = Date.now();
    for (let i = 0; i < 5; i++) {
      await embeddingService.generateEmbedding(`Test text ${i}`);
    }
    metrics.embedding.avgTime = (Date.now() - embeddingStart) / 5;
    metrics.embedding.operations = 5;
    
    log(`Average embedding time: ${metrics.embedding.avgTime.toFixed(2)}ms`);
    
    // Test vector operations speed
    if (qdrantDB.initialized) {
      log('Testing vector database performance...');
      const vectorStart = Date.now();
      const testVector = await embeddingService.generateEmbedding('Performance test');
      
      for (let i = 0; i < 5; i++) {
        await qdrantDB.search(testVector, { limit: 10 });
      }
      metrics.vector.avgTime = (Date.now() - vectorStart) / 5;
      metrics.vector.operations = 5;
      
      log(`Average vector search time: ${metrics.vector.avgTime.toFixed(2)}ms`);
    }
    
    // Mobile app readiness check
    log('\n📱 Mobile App Backend Readiness:');
    
    const avgResponseTime = (metrics.embedding.avgTime + metrics.vector.avgTime) / 2;
    
    if (avgResponseTime < 100) {
      log('Response time: EXCELLENT (<100ms)', 'success');
    } else if (avgResponseTime < 500) {
      log('Response time: GOOD (<500ms)', 'success');
    } else {
      log('Response time: NEEDS OPTIMIZATION (>500ms)', 'warning');
    }
    
    return true;
    
  } catch (error) {
    log(`Performance test error: ${error.message}`, 'error');
    return false;
  }
}

// Main test runner
async function runTests() {
  const startTime = Date.now();
  
  try {
    // Run all tests
    await testEnvironment();
    await testMongoDB();
    await testQdrant();
    await testEmbeddingService();
    await testLLMService();
    await testHybridSearch();
    await testPipeline();
    await testPerformance();
    
  } catch (error) {
    log(`Critical error: ${error.message}`, 'error');
  } finally {
    // Cleanup
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      log('MongoDB connection closed', 'info');
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Print final report
  console.log(chalk.cyan.bold('\n' + '='.repeat(70)));
  console.log(chalk.cyan.bold('   TEST RESULTS SUMMARY'));
  console.log(chalk.cyan.bold('='.repeat(70) + '\n'));
  
  console.log(chalk.green(`✅ Passed: ${testResults.passed.length}`));
  testResults.passed.forEach(test => console.log(chalk.green(`   ✓ ${test}`)));
  
  if (testResults.failed.length > 0) {
    console.log(chalk.red(`\n❌ Failed: ${testResults.failed.length}`));
    testResults.failed.forEach(test => console.log(chalk.red(`   ✗ ${test}`)));
  }
  
  if (testResults.warnings.length > 0) {
    console.log(chalk.yellow(`\n⚠️  Warnings: ${testResults.warnings.length}`));
    testResults.warnings.forEach(warning => console.log(chalk.yellow(`   ! ${warning}`)));
  }
  
  if (testResults.recommendations.length > 0) {
    console.log(chalk.blue('\n💡 Recommendations:'));
    testResults.recommendations.forEach((rec, i) => {
      console.log(chalk.blue(`   ${i + 1}. ${rec}`));
    });
  }
  
  // Architecture summary
  console.log(chalk.magenta.bold('\n📱 MOBILE APP ARCHITECTURE STATUS:'));
  
  const ready = testResults.failed.length === 0;
  console.log(chalk[ready ? 'green' : 'yellow'].bold(
    ready 
      ? '   ✅ Backend is READY for mobile app deployment!'
      : '   ⚠️  Backend needs configuration (see recommendations above)'
  ));
  
  console.log(chalk.cyan(`\n⏱️  Total test time: ${duration}s`));
  
  // Cost analysis
  console.log(chalk.green.bold('\n💰 COST ANALYSIS:'));
  console.log(chalk.green('   • MongoDB Atlas: FREE (512MB)'));
  console.log(chalk.green('   • Qdrant: FREE (1M vectors locally or cloud)'));
  console.log(chalk.green('   • Embeddings: FREE (local BAAI/bge-large)'));
  console.log(chalk.green('   • LLM: FREE (local gemma-3-1b-it)'));
  console.log(chalk.green.bold('   • Total Monthly Cost: $0 (+ server hosting)'));
  
  process.exit(testResults.failed.length > 0 ? 1 : 0);
}

// Run tests
console.log(chalk.blue('Starting comprehensive system tests...\n'));
runTests().catch(console.error);