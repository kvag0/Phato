#!/usr/bin/env node

/**
 * Comprehensive Test Suite for Phato Backend
 * Tests all components from Phases 1-3 and LLM integration
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import chalk from 'chalk';

// Load environment variables
dotenv.config();

// Import all models (Phase 1)
import EnhancedArticle from '../src/models/EnhancedArticle.js';
import Fact from '../src/models/Fact.js';
import ChatConversation from '../src/models/ChatConversation.js';
import StoryCluster from '../src/models/StoryCluster.js';

// Import temporal services (Phase 2)
import { TemporalFactExtractor } from '../src/services/temporal/TemporalFactExtractor.js';
import { FactEvolutionTracker } from '../src/services/temporal/FactEvolutionTracker.js';
import { TemporalQueryService } from '../src/services/temporal/TemporalQueryService.js';
import { TemporalFactVerifier } from '../src/services/temporal/TemporalFactVerifier.js';

// Import vector services (Phase 3)
import embeddingService from '../src/services/vector/EmbeddingService.js';
import hybridSearchService from '../src/services/vector/HybridSearchService.js';
import vectorSyncService from '../src/services/vector/VectorSyncService.js';
import vectorDB from '../src/config/vectorDB.js';

// Import LLM client
import localLLMClient from '../src/services/llm/LocalLLMClient.js';

// Test configuration
const TEST_CONFIG = {
  skipLongTests: process.env.SKIP_LONG_TESTS === 'true',
  skipLLMTests: process.env.SKIP_LLM_TESTS === 'true',
  skipVectorTests: process.env.SKIP_VECTOR_TESTS === 'true',
  verbose: process.env.VERBOSE === 'true'
};

// Test results tracking
const testResults = {
  passed: 0,
  failed: 0,
  skipped: 0,
  errors: []
};

// Utility functions
function log(message, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  const prefix = `[${timestamp}]`;
  
  switch(type) {
    case 'success':
      console.log(chalk.green(`${prefix} ✅ ${message}`));
      break;
    case 'error':
      console.log(chalk.red(`${prefix} ❌ ${message}`));
      break;
    case 'warning':
      console.log(chalk.yellow(`${prefix} ⚠️  ${message}`));
      break;
    case 'info':
      console.log(chalk.blue(`${prefix} ℹ️  ${message}`));
      break;
    case 'section':
      console.log(chalk.cyan.bold(`\n${'='.repeat(60)}`));
      console.log(chalk.cyan.bold(`${prefix} ${message}`));
      console.log(chalk.cyan.bold(`${'='.repeat(60)}\n`));
      break;
    default:
      console.log(`${prefix} ${message}`);
  }
}

async function runTest(name, testFn) {
  try {
    log(`Running: ${name}`);
    await testFn();
    testResults.passed++;
    log(`${name}`, 'success');
    return true;
  } catch (error) {
    testResults.failed++;
    testResults.errors.push({ test: name, error: error.message });
    log(`${name}: ${error.message}`, 'error');
    if (TEST_CONFIG.verbose) {
      console.error(error);
    }
    return false;
  }
}

// =============================================================================
// PHASE 1: DATABASE MODELS TESTS
// =============================================================================

async function testDatabaseConnection() {
  log('Testing MongoDB Connection', 'section');
  
  await runTest('Connect to MongoDB', async () => {
    if (mongoose.connection.readyState !== 1) {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/phato-test');
    }
    if (mongoose.connection.readyState !== 1) {
      throw new Error('Failed to connect to MongoDB');
    }
  });
}

async function testEnhancedArticleModel() {
  log('Testing Enhanced Article Model', 'section');
  
  const testArticle = {
    title: 'Test Article for Comprehensive Testing',
    description: 'This is a test article to validate all model fields',
    content: 'The content of this article discusses various topics including climate change, technology advances, and political developments. It contains multiple facts and claims that need verification.',
    url: 'https://example.com/test-article',
    source: {
      id: 'test-source',
      name: 'Test News Source'
    },
    author: 'Test Author',
    publishedAt: new Date(),
    category: 'technology'
  };
  
  let createdArticle;
  
  await runTest('Create Enhanced Article', async () => {
    createdArticle = await EnhancedArticle.create(testArticle);
    if (!createdArticle._id) {
      throw new Error('Article created without ID');
    }
    if (!createdArticle.temporalData) {
      throw new Error('Temporal data not generated');
    }
  });
  
  await runTest('Temporal fields auto-calculation', async () => {
    if (!createdArticle.temporalData.publishDate) {
      throw new Error('publishDate not calculated');
    }
    if (!createdArticle.temporalData.publishMonth) {
      throw new Error('publishMonth not calculated');
    }
    if (!createdArticle.temporalData.publishYear) {
      throw new Error('publishYear not calculated');
    }
  });
  
  await runTest('Content hash generation', async () => {
    if (!createdArticle.contentHash) {
      throw new Error('Content hash not generated');
    }
  });
  
  await runTest('Query by date range', async () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    const articles = await EnhancedArticle.findByDateRange(yesterday, tomorrow);
    if (articles.length === 0) {
      throw new Error('Date range query returned no results');
    }
  });
  
  // Cleanup
  if (createdArticle) {
    await EnhancedArticle.deleteOne({ _id: createdArticle._id });
  }
  
  return createdArticle;
}

async function testFactModel() {
  log('Testing Fact Model', 'section');
  
  const testFact = {
    factId: uuidv4(),
    statement: 'Global temperatures have risen by 1.1 degrees Celsius since pre-industrial times',
    context: 'Climate change report 2024',
    sourceArticles: [],
    classification: {
      type: 'STATISTICAL',
      category: 'climate',
      importance: 8
    },
    entities: [
      { name: 'Global Temperature', type: 'METRIC' }
    ],
    timeline: {
      firstReported: new Date(),
      lastUpdated: new Date()
    }
  };
  
  let createdFact;
  
  await runTest('Create Fact', async () => {
    createdFact = await Fact.create(testFact);
    if (!createdFact.factId) {
      throw new Error('Fact created without ID');
    }
  });
  
  await runTest('Fact temporal indexing', async () => {
    if (!createdFact.temporalIndex) {
      throw new Error('Temporal index not created');
    }
  });
  
  // Cleanup
  if (createdFact) {
    await Fact.deleteOne({ factId: createdFact.factId });
  }
}

async function testChatConversationModel() {
  log('Testing Chat Conversation Model', 'section');
  
  const testConversation = {
    conversationId: uuidv4(),
    userId: 'test-user-' + uuidv4(),
    messages: [
      {
        role: 'user',
        content: 'What are the latest news about climate change?',
        timestamp: new Date()
      },
      {
        role: 'assistant',
        content: 'Here are the latest climate change developments...',
        timestamp: new Date(),
        retrievalData: {
          sourcesUsed: 3,
          factsReferenced: ['fact1', 'fact2']
        }
      }
    ]
  };
  
  let createdConversation;
  
  await runTest('Create Chat Conversation', async () => {
    createdConversation = await ChatConversation.create(testConversation);
    if (!createdConversation.conversationId) {
      throw new Error('Conversation created without ID');
    }
  });
  
  // Cleanup
  if (createdConversation) {
    await ChatConversation.deleteOne({ conversationId: createdConversation.conversationId });
  }
}

async function testStoryClusterModel() {
  log('Testing Story Cluster Model', 'section');
  
  const testCluster = {
    clusterId: uuidv4(),
    title: 'Major Climate Summit 2024',
    articles: [],
    mainEntities: [
      { name: 'UN', type: 'ORG', relevance: 0.9 }
    ],
    timespan: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      end: new Date(),
      peak: new Date()
    },
    metrics: {
      total_articles: 5,
      unique_sources: 3
    }
  };
  
  let createdCluster;
  
  await runTest('Create Story Cluster', async () => {
    createdCluster = await StoryCluster.create(testCluster);
    if (!createdCluster.clusterId) {
      throw new Error('Cluster created without ID');
    }
  });
  
  // Cleanup
  if (createdCluster) {
    await StoryCluster.deleteOne({ clusterId: createdCluster.clusterId });
  }
}

// =============================================================================
// PHASE 2: TEMPORAL SERVICES TESTS
// =============================================================================

async function testTemporalServices() {
  log('Testing Temporal Services', 'section');
  
  // Note: These services require Gemini API or local LLM to be configured
  
  await runTest('Initialize Temporal Query Service', async () => {
    const queryService = new TemporalQueryService();
    if (!queryService) {
      throw new Error('Failed to create Temporal Query Service');
    }
  });
  
  if (!TEST_CONFIG.skipLLMTests) {
    await runTest('Initialize Temporal Fact Extractor', async () => {
      const extractor = new TemporalFactExtractor();
      if (!extractor) {
        throw new Error('Failed to create Temporal Fact Extractor');
      }
    });
    
    await runTest('Initialize Fact Evolution Tracker', async () => {
      const tracker = new FactEvolutionTracker();
      if (!tracker) {
        throw new Error('Failed to create Fact Evolution Tracker');
      }
    });
    
    await runTest('Initialize Temporal Fact Verifier', async () => {
      const verifier = new TemporalFactVerifier();
      if (!verifier) {
        throw new Error('Failed to create Temporal Fact Verifier');
      }
    });
  } else {
    log('Skipping LLM-dependent temporal service tests', 'warning');
    testResults.skipped += 3;
  }
}

// =============================================================================
// PHASE 3: VECTOR SERVICES TESTS
// =============================================================================

async function testVectorServices() {
  log('Testing Vector Services', 'section');
  
  if (TEST_CONFIG.skipVectorTests) {
    log('Skipping vector service tests', 'warning');
    testResults.skipped += 5;
    return;
  }
  
  // Test Embedding Service
  await runTest('Initialize Embedding Service', async () => {
    await embeddingService.initialize();
    if (!embeddingService.initialized) {
      throw new Error('Embedding service not initialized');
    }
  });
  
  await runTest('Generate test embedding', async () => {
    const testText = 'This is a test sentence for embedding generation.';
    const embedding = await embeddingService.generateEmbedding(testText);
    
    if (!embedding || !Array.isArray(embedding)) {
      throw new Error('Invalid embedding generated');
    }
    
    if (embedding.length !== 1024) { // BGE-large dimension
      throw new Error(`Unexpected embedding dimension: ${embedding.length}`);
    }
    
    log(`Embedding generated: dimension=${embedding.length}`, 'info');
  });
  
  // Test Vector DB
  await runTest('Check Pinecone connection', async () => {
    const connected = await vectorDB.testConnection();
    if (!connected) {
      throw new Error('Failed to connect to Pinecone');
    }
  });
  
  // Test Hybrid Search Service
  await runTest('Initialize Hybrid Search Service', async () => {
    await hybridSearchService.initialize();
    log('Hybrid Search Service initialized', 'info');
  });
  
  // Test Vector Sync Service
  await runTest('Check Vector Sync Status', async () => {
    const status = await vectorSyncService.checkSyncStatus();
    log(`Vector sync status: ${status.database.total} documents, ${status.vectors.totalVectors} vectors`, 'info');
  });
}

// =============================================================================
// LLM SERVICE TESTS
// =============================================================================

async function testLLMService() {
  log('Testing Local LLM Service', 'section');
  
  if (TEST_CONFIG.skipLLMTests) {
    log('Skipping LLM service tests', 'warning');
    testResults.skipped += 6;
    return;
  }
  
  // Check if Python service is running
  await runTest('Check LLM service health', async () => {
    const health = await localLLMClient.checkHealth();
    if (!health.available) {
      throw new Error('LLM service not available. Please start the Python service first.');
    }
    log(`LLM service status: ${health.model} on ${health.device}`, 'info');
  });
  
  await runTest('Initialize LLM client', async () => {
    const initialized = await localLLMClient.initialize();
    if (!initialized) {
      throw new Error('Failed to initialize LLM client');
    }
  });
  
  await runTest('Test text generation', async () => {
    const response = await localLLMClient.generate('Summarize: The sun is a star.', {
      maxTokens: 50
    });
    
    if (!response.text) {
      throw new Error('No text generated');
    }
    
    log(`Generated text: ${response.text.substring(0, 100)}...`, 'info');
  });
  
  await runTest('Test fact extraction', async () => {
    const testText = 'The global temperature has risen by 1.1 degrees Celsius since 1880. Scientists predict a 2 degree increase by 2050.';
    const result = await localLLMClient.extractFacts(testText);
    
    if (!result.facts || result.facts.length === 0) {
      throw new Error('No facts extracted');
    }
    
    log(`Extracted ${result.facts.length} facts`, 'info');
  });
  
  await runTest('Test bias analysis', async () => {
    const testText = 'The government must take immediate action to address this crisis.';
    const result = await localLLMClient.analyzeBias(testText);
    
    if (!result.overall_bias) {
      throw new Error('No bias analysis returned');
    }
    
    log(`Bias detected: ${result.overall_bias} (confidence: ${result.confidence})`, 'info');
  });
  
  await runTest('Test entity extraction', async () => {
    const testText = 'President Biden met with Chancellor Scholz in Berlin on January 15th.';
    const result = await localLLMClient.extractEntities(testText);
    
    if (!result.entities || result.entities.length === 0) {
      throw new Error('No entities extracted');
    }
    
    log(`Extracted ${result.entities.length} entities`, 'info');
  });
}

// =============================================================================
// INTEGRATION TESTS
// =============================================================================

async function testIntegration() {
  log('Testing Service Integration', 'section');
  
  if (TEST_CONFIG.skipLongTests) {
    log('Skipping integration tests', 'warning');
    testResults.skipped += 2;
    return;
  }
  
  // Test article processing pipeline
  await runTest('End-to-end article processing', async () => {
    // Create test article
    const article = await EnhancedArticle.create({
      title: 'Integration Test Article',
      content: 'This article discusses climate change impacts. Global temperatures have risen significantly.',
      source: { name: 'Test Source' },
      publishedAt: new Date()
    });
    
    try {
      // Generate embedding (if embeddings are available)
      if (embeddingService.initialized) {
        const embedding = await embeddingService.embedArticle(article);
        if (!embedding.values || embedding.values.length !== 1024) {
          throw new Error('Invalid article embedding');
        }
      }
      
      // Extract facts (if LLM is available)
      if (!TEST_CONFIG.skipLLMTests) {
        const factExtractor = new TemporalFactExtractor();
        const facts = await factExtractor.extractFactsFromArticle(article);
        log(`Extracted ${facts.factsExtracted} facts from article`, 'info');
      }
      
    } finally {
      // Cleanup
      await EnhancedArticle.deleteOne({ _id: article._id });
    }
  });
  
  // Test search functionality
  await runTest('Search pipeline test', async () => {
    if (!embeddingService.initialized) {
      throw new Error('Embedding service not available for search test');
    }
    
    const searchQuery = 'climate change';
    const results = await hybridSearchService.search(searchQuery, {
      limit: 5,
      type: 'article'
    });
    
    log(`Search returned ${results.results.length} results`, 'info');
  });
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runAllTests() {
  console.log(chalk.magenta.bold('\n' + '='.repeat(60)));
  console.log(chalk.magenta.bold('   PHATO BACKEND COMPREHENSIVE TEST SUITE'));
  console.log(chalk.magenta.bold('='.repeat(60) + '\n'));
  
  const startTime = Date.now();
  
  try {
    // Phase 1: Database Models
    await testDatabaseConnection();
    await testEnhancedArticleModel();
    await testFactModel();
    await testChatConversationModel();
    await testStoryClusterModel();
    
    // Phase 2: Temporal Services
    await testTemporalServices();
    
    // Phase 3: Vector Services
    await testVectorServices();
    
    // LLM Service
    await testLLMService();
    
    // Integration Tests
    await testIntegration();
    
  } catch (error) {
    log(`Critical error: ${error.message}`, 'error');
  } finally {
    // Cleanup and close connections
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      log('MongoDB connection closed', 'info');
    }
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Print test results
  console.log(chalk.magenta.bold('\n' + '='.repeat(60)));
  console.log(chalk.magenta.bold('   TEST RESULTS'));
  console.log(chalk.magenta.bold('='.repeat(60) + '\n'));
  
  console.log(chalk.green(`✅ Passed: ${testResults.passed}`));
  console.log(chalk.red(`❌ Failed: ${testResults.failed}`));
  console.log(chalk.yellow(`⏭️  Skipped: ${testResults.skipped}`));
  console.log(chalk.blue(`⏱️  Duration: ${duration}s`));
  
  if (testResults.errors.length > 0) {
    console.log(chalk.red('\nFailed Tests:'));
    testResults.errors.forEach(err => {
      console.log(chalk.red(`  - ${err.test}: ${err.error}`));
    });
  }
  
  const successRate = testResults.passed > 0 
    ? ((testResults.passed / (testResults.passed + testResults.failed)) * 100).toFixed(1)
    : 0;
  
  console.log(chalk.cyan(`\n📊 Success Rate: ${successRate}%`));
  
  // Exit with appropriate code
  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Handle errors
process.on('unhandledRejection', (error) => {
  log(`Unhandled rejection: ${error.message}`, 'error');
  process.exit(1);
});

// Run tests
runAllTests();