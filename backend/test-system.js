#!/usr/bin/env node

/**
 * System Test for Phato Backend
 * Tests all components systematically
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';

// Load environment variables
dotenv.config();

console.log('\n========================================');
console.log('   PHATO SYSTEM TEST');
console.log('========================================\n');

const results = {
  passed: [],
  failed: [],
  warnings: []
};

// Test MongoDB Connection
async function testMongoDB() {
  console.log('📦 Testing MongoDB Connection...');
  try {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      results.warnings.push('MONGODB_URI not configured');
      console.log('  ⚠️  MONGODB_URI not configured');
      return false;
    }
    
    await mongoose.connect(uri);
    console.log('  ✅ Connected to MongoDB');
    results.passed.push('MongoDB connection');
    
    // Test models
    const { default: EnhancedArticle } = await import('./src/models/EnhancedArticle.js');
    const { default: Fact } = await import('./src/models/Fact.js');
    const { default: ChatConversation } = await import('./src/models/ChatConversation.js');
    const { default: StoryCluster } = await import('./src/models/StoryCluster.js');
    
    // Create test article
    const testArticle = await EnhancedArticle.create({
      title: 'Test Article ' + Date.now(),
      content: 'Test content',
      source: { name: 'Test' },
      publishedAt: new Date()
    });
    
    console.log('  ✅ EnhancedArticle model works');
    console.log(`     - Temporal data: ${testArticle.temporalData ? 'YES' : 'NO'}`);
    console.log(`     - Content hash: ${testArticle.contentHash ? 'YES' : 'NO'}`);
    results.passed.push('EnhancedArticle model');
    
    // Cleanup
    await EnhancedArticle.deleteOne({ _id: testArticle._id });
    
    // Test Fact model
    const testFact = await Fact.create({
      factId: uuidv4(),
      statement: 'Test fact',
      classification: { type: 'CLAIM' }
    });
    console.log('  ✅ Fact model works');
    results.passed.push('Fact model');
    await Fact.deleteOne({ factId: testFact.factId });
    
    // Test ChatConversation
    const testChat = await ChatConversation.create({
      conversationId: uuidv4(),
      userId: 'test-user',
      messages: []
    });
    console.log('  ✅ ChatConversation model works');
    results.passed.push('ChatConversation model');
    await ChatConversation.deleteOne({ conversationId: testChat.conversationId });
    
    // Test StoryCluster
    const testCluster = await StoryCluster.create({
      clusterId: uuidv4(),
      title: 'Test cluster'
    });
    console.log('  ✅ StoryCluster model works');
    results.passed.push('StoryCluster model');
    await StoryCluster.deleteOne({ clusterId: testCluster.clusterId });
    
    await mongoose.disconnect();
    return true;
    
  } catch (error) {
    console.log(`  ❌ MongoDB error: ${error.message}`);
    results.failed.push(`MongoDB: ${error.message}`);
    return false;
  }
}

// Test Local LLM Service
async function testLLMService() {
  console.log('\n🤖 Testing Local LLM Service...');
  try {
    const { default: localLLMClient } = await import('./src/services/llm/LocalLLMClient.js');
    
    const health = await localLLMClient.checkHealth();
    if (!health.available) {
      console.log('  ⚠️  LLM service not running (start with: cd llm-service && ./start.sh)');
      results.warnings.push('LLM service not running');
      return false;
    }
    
    console.log(`  ✅ LLM service available: ${health.model}`);
    results.passed.push('LLM service connection');
    
    // Test generation
    const response = await localLLMClient.generate('Hello', { maxTokens: 10 });
    if (response.text) {
      console.log('  ✅ Text generation works');
      results.passed.push('LLM text generation');
    }
    
    return true;
    
  } catch (error) {
    console.log(`  ⚠️  LLM service error: ${error.message}`);
    results.warnings.push(`LLM: ${error.message}`);
    return false;
  }
}

// Test Embedding Service
async function testEmbeddingService() {
  console.log('\n🔤 Testing Embedding Service...');
  try {
    const { default: embeddingService } = await import('./src/services/vector/EmbeddingService.js');
    
    console.log('  ⏳ Initializing embedding service (may download model on first run)...');
    await embeddingService.initialize();
    
    const testText = 'Test embedding';
    const embedding = await embeddingService.generateEmbedding(testText);
    
    if (embedding && embedding.length === 1024) {
      console.log('  ✅ Embedding service works (BAAI/bge-large-en-v1.5)');
      console.log(`     - Dimension: ${embedding.length}`);
      console.log(`     - Model: ${embeddingService.modelName}`);
      results.passed.push('Embedding service');
      return true;
    } else {
      throw new Error('Invalid embedding dimension');
    }
    
  } catch (error) {
    console.log(`  ❌ Embedding error: ${error.message}`);
    results.failed.push(`Embeddings: ${error.message}`);
    return false;
  }
}

// Test Vector Database
async function testVectorDB() {
  console.log('\n📊 Testing Vector Database (Pinecone)...');
  try {
    if (!process.env.PINECONE_API_KEY) {
      console.log('  ⚠️  PINECONE_API_KEY not configured');
      results.warnings.push('Pinecone not configured');
      return false;
    }
    
    const { default: vectorDB } = await import('./src/config/vectorDB.js');
    
    const connected = await vectorDB.testConnection();
    if (connected) {
      console.log('  ✅ Pinecone connection works');
      results.passed.push('Pinecone connection');
      
      const stats = await vectorDB.getIndexStats();
      console.log(`     - Vectors: ${stats.totalVectors}`);
      console.log(`     - Dimension: ${stats.dimension}`);
      return true;
    }
    
  } catch (error) {
    console.log(`  ⚠️  Vector DB error: ${error.message}`);
    results.warnings.push(`Pinecone: ${error.message}`);
    return false;
  }
}

// Test Temporal Services
async function testTemporalServices() {
  console.log('\n⏰ Testing Temporal Services...');
  try {
    // Import services with default exports
    const { default: factExtractor } = await import('./src/services/temporal/TemporalFactExtractor.js');
    const { default: evolutionTracker } = await import('./src/services/temporal/FactEvolutionTracker.js');
    const { default: queryService } = await import('./src/services/temporal/TemporalQueryService.js');
    const { default: factVerifier } = await import('./src/services/temporal/TemporalFactVerifier.js');
    
    console.log('  ✅ Temporal services loaded');
    results.passed.push('Temporal services');
    
    // Test query service (doesn't need LLM)
    const articles = await queryService.getArticlesByDateRange(
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      new Date()
    );
    console.log(`     - Query service: Found ${articles.length} articles`);
    
    return true;
    
  } catch (error) {
    console.log(`  ⚠️  Temporal services error: ${error.message}`);
    results.warnings.push(`Temporal: ${error.message}`);
    return false;
  }
}

// Check environment configuration
async function checkEnvironment() {
  console.log('\n🔧 Environment Configuration:');
  
  const requiredVars = [
    'MONGODB_URI',
    'PINECONE_API_KEY',
    'PINECONE_ENVIRONMENT',
    'NEWS_API_KEY'
  ];
  
  const optionalVars = [
    'GEMINI_API_KEY',
    'GUARDIAN_API_KEY',
    'NYT_API_KEY',
    'LLM_SERVICE_URL'
  ];
  
  console.log('  Required:');
  for (const varName of requiredVars) {
    const configured = process.env[varName] ? '✅' : '❌';
    console.log(`    ${configured} ${varName}`);
    if (!process.env[varName]) {
      results.warnings.push(`Missing ${varName}`);
    }
  }
  
  console.log('  Optional:');
  for (const varName of optionalVars) {
    const configured = process.env[varName] ? '✅' : '⚪';
    console.log(`    ${configured} ${varName}`);
  }
}

// Main test runner
async function runTests() {
  const startTime = Date.now();
  
  try {
    // Check environment
    await checkEnvironment();
    
    // Run tests
    await testMongoDB();
    await testLLMService();
    await testEmbeddingService();
    await testVectorDB();
    await testTemporalServices();
    
  } catch (error) {
    console.error('\n❌ Critical error:', error.message);
    results.failed.push(`Critical: ${error.message}`);
  }
  
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  
  // Print summary
  console.log('\n========================================');
  console.log('   TEST SUMMARY');
  console.log('========================================\n');
  
  console.log(`✅ Passed: ${results.passed.length}`);
  if (results.passed.length > 0) {
    results.passed.forEach(test => console.log(`   - ${test}`));
  }
  
  if (results.failed.length > 0) {
    console.log(`\n❌ Failed: ${results.failed.length}`);
    results.failed.forEach(test => console.log(`   - ${test}`));
  }
  
  if (results.warnings.length > 0) {
    console.log(`\n⚠️  Warnings: ${results.warnings.length}`);
    results.warnings.forEach(warning => console.log(`   - ${warning}`));
  }
  
  console.log(`\n⏱️  Duration: ${duration}s`);
  
  // Recommendations
  if (results.warnings.length > 0) {
    console.log('\n📝 Recommendations:');
    
    if (results.warnings.some(w => w.includes('MONGODB_URI'))) {
      console.log('  1. Configure MongoDB connection in .env file');
    }
    
    if (results.warnings.some(w => w.includes('LLM service'))) {
      console.log('  2. Start LLM service: cd llm-service && ./start.sh');
    }
    
    if (results.warnings.some(w => w.includes('Pinecone'))) {
      console.log('  3. Sign up for Pinecone and add API key to .env');
    }
  }
  
  process.exit(results.failed.length > 0 ? 1 : 0);
}

// Run tests
runTests().catch(console.error);