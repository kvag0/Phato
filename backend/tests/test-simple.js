/**
 * Simple Integration Test - Basic System Validation
 * Tests core functionality without heavy dependencies
 */

import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Setup environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Import system components
import connectDB from '../src/config/database.js';
import EnhancedArticle from '../src/models/EnhancedArticle.js';

/**
 * Simple Integration Test
 */
async function runSimpleTest() {
  console.log('🧪 Running Simple Integration Test');
  console.log('='.repeat(50));
  
  try {
    // Test 1: Database Connection
    console.log('📊 Testing database connection...');
    await connectDB();
    console.log('✅ Database connected successfully');
    
    // Test 2: Article Model
    console.log('📰 Testing article model...');
    const testArticle = new EnhancedArticle({
      title: "Test Article for Simple Integration",
      url: `https://test.com/article-${Date.now()}`,
      content: "This is a test article to validate the basic model functionality.",
      description: "Test article for simple integration test",
      source: { name: "Test Source", id: "test-source" },
      author: "Test Author",
      category: "world",
      publishedAt: new Date()
    });
    
    await testArticle.save();
    console.log('✅ Article created successfully');
    console.log(`   Article ID: ${testArticle._id}`);
    console.log(`   Temporal Data: ${JSON.stringify(testArticle.temporalData, null, 2)}`);
    
    // Test 3: Article Retrieval
    console.log('🔍 Testing article retrieval...');
    const retrievedArticle = await EnhancedArticle.findById(testArticle._id);
    if (retrievedArticle) {
      console.log('✅ Article retrieved successfully');
    } else {
      throw new Error('Article not found');
    }
    
    // Test 4: Temporal Queries
    console.log('🕐 Testing temporal queries...');
    const today = new Date();
    const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
    
    const recentArticles = await EnhancedArticle.findByDateRange(yesterday, today);
    console.log(`✅ Found ${recentArticles.length} articles from last 24 hours`);
    
    // Test 5: Model Validation
    console.log('✔️  Testing model validation...');
    try {
      const invalidArticle = new EnhancedArticle({
        title: "Invalid Article",
        // Missing required fields
      });
      await invalidArticle.save();
      throw new Error('Validation should have failed');
    } catch (error) {
      if (error.message.includes('validation')) {
        console.log('✅ Model validation working correctly');
      } else {
        throw error;
      }
    }
    
    // Cleanup
    console.log('🧹 Cleaning up...');
    await EnhancedArticle.findByIdAndDelete(testArticle._id);
    console.log('✅ Test data cleaned up');
    
    console.log('\n🎉 Simple Integration Test PASSED');
    console.log('='.repeat(50));
    console.log('✅ Database connectivity: WORKING');
    console.log('✅ Article model: WORKING'); 
    console.log('✅ Temporal data: WORKING');
    console.log('✅ Query functions: WORKING');
    console.log('✅ Validation: WORKING');
    
    process.exit(0);
    
  } catch (error) {
    console.error('\n❌ Simple Integration Test FAILED');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    // Close database connection
    if (mongoose.connection.readyState === 1) {
      await mongoose.connection.close();
      console.log('📊 Database connection closed');
    }
  }
}

// Run test
runSimpleTest();