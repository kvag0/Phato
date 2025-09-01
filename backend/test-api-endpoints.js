#!/usr/bin/env node

/**
 * API Endpoint Testing for Phato MVP
 * Tests all critical API endpoints
 */

import axios from 'axios';
import chalk from 'chalk';
import dotenv from 'dotenv';

dotenv.config();

const API_BASE = process.env.API_BASE_URL || 'http://localhost:3000';
const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  validateStatus: () => true // Don't throw on any status
});

let token = null;
let conversationId = null;
let articleId = null;

const tests = {
  passed: 0,
  failed: 0,
  skipped: 0
};

// Test utilities
function log(message, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  
  switch(type) {
    case 'success':
      console.log(chalk.green(`[${timestamp}] ✅ ${message}`));
      tests.passed++;
      break;
    case 'error':
      console.log(chalk.red(`[${timestamp}] ❌ ${message}`));
      tests.failed++;
      break;
    case 'skip':
      console.log(chalk.yellow(`[${timestamp}] ⏭️  ${message}`));
      tests.skipped++;
      break;
    case 'section':
      console.log(chalk.cyan.bold(`\n[${timestamp}] 📋 ${message}`));
      console.log(chalk.cyan('─'.repeat(60)));
      break;
    default:
      console.log(chalk.blue(`[${timestamp}] ℹ️  ${message}`));
  }
}

async function testEndpoint(name, request) {
  try {
    log(`Testing: ${name}`);
    const response = await request();
    
    if (response.status >= 200 && response.status < 300) {
      log(`${name} - Status ${response.status}`, 'success');
      return response.data;
    } else {
      log(`${name} - Status ${response.status}: ${response.data?.error || 'Unknown error'}`, 'error');
      return null;
    }
  } catch (error) {
    log(`${name} - Error: ${error.message}`, 'error');
    return null;
  }
}

// Test suites
async function testHealth() {
  log('HEALTH CHECKS', 'section');
  
  await testEndpoint('Basic Health', 
    () => api.get('/health')
  );
  
  await testEndpoint('Detailed Health', 
    () => api.get('/health/detailed')
  );
  
  await testEndpoint('API Info', 
    () => api.get('/api')
  );
}

async function testAuth() {
  log('AUTHENTICATION', 'section');
  
  // Get guest token
  const guestData = await testEndpoint('Guest Token', 
    () => api.post('/api/auth/guest')
  );
  
  if (guestData?.data?.token) {
    token = guestData.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    log('Token acquired and set');
  }
  
  // Test login with demo account
  const loginData = await testEndpoint('Demo Login', 
    () => api.post('/api/auth/login', {
      email: 'demo@phato.app',
      password: 'demo123'
    })
  );
  
  if (loginData?.data?.token) {
    token = loginData.data.token;
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    log('Logged in as demo user');
  }
  
  // Test current user
  await testEndpoint('Get Current User', 
    () => api.get('/api/auth/me')
  );
}

async function testNews() {
  log('NEWS ENDPOINTS', 'section');
  
  // Get latest news
  const newsData = await testEndpoint('Get Latest News', 
    () => api.get('/api/news', { params: { limit: 5 } })
  );
  
  if (newsData?.data?.length > 0) {
    articleId = newsData.data[0]._id;
    log(`Got ${newsData.data.length} articles`);
  }
  
  // Get trending
  await testEndpoint('Get Trending News', 
    () => api.get('/api/news/trending', { params: { limit: 5 } })
  );
  
  // Get single article
  if (articleId) {
    await testEndpoint('Get Single Article', 
      () => api.get(`/api/news/${articleId}`, { 
        params: { includeFacts: true, includeBias: true } 
      })
    );
  } else {
    log('Skip Single Article - No article ID', 'skip');
  }
  
  // Get categories
  await testEndpoint('Get Categories', 
    () => api.get('/api/news/categories')
  );
  
  // Get sources
  await testEndpoint('Get Sources', 
    () => api.get('/api/news/sources')
  );
  
  // Get timeline
  await testEndpoint('Get Timeline', 
    () => api.get('/api/news/temporal/timeline', {
      params: { granularity: 'day' }
    })
  );
}

async function testChat() {
  log('CHAT ENDPOINTS', 'section');
  
  // Send message
  const chatData = await testEndpoint('Send Chat Message', 
    () => api.post('/api/chat/message', {
      message: 'What are the latest technology news?',
      userId: 'test-user'
    })
  );
  
  if (chatData?.data?.conversationId) {
    conversationId = chatData.data.conversationId;
    log(`Conversation ID: ${conversationId}`);
  }
  
  // Get conversation
  if (conversationId) {
    await testEndpoint('Get Conversation', 
      () => api.get(`/api/chat/conversation/${conversationId}`)
    );
  } else {
    log('Skip Get Conversation - No conversation ID', 'skip');
  }
  
  // Fact check
  await testEndpoint('Fact Check', 
    () => api.post('/api/chat/fact-check', {
      statement: 'The Earth is warming due to human activities'
    })
  );
  
  // Analyze bias
  await testEndpoint('Analyze Bias', 
    () => api.post('/api/chat/analyze-bias', {
      text: 'The government must act immediately on climate change'
    })
  );
  
  // Get suggestions
  await testEndpoint('Get Chat Suggestions', 
    () => api.get('/api/chat/suggestions')
  );
  
  // Get metrics
  await testEndpoint('Get Chat Metrics', 
    () => api.get('/api/chat/metrics')
  );
}

async function testSearch() {
  log('SEARCH ENDPOINTS', 'section');
  
  // Main search
  await testEndpoint('Main Search', 
    () => api.post('/api/search', {
      query: 'climate change',
      limit: 5
    })
  );
  
  // Semantic search
  await testEndpoint('Semantic Search', 
    () => api.post('/api/search/semantic', {
      query: 'artificial intelligence impact',
      limit: 5
    })
  );
  
  // Similar articles
  if (articleId) {
    await testEndpoint('Find Similar Articles', 
      () => api.get(`/api/search/similar/${articleId}`, {
        params: { limit: 3 }
      })
    );
  } else {
    log('Skip Similar Articles - No article ID', 'skip');
  }
  
  // Temporal search
  await testEndpoint('Temporal Search', 
    () => api.post('/api/search/temporal', {
      query: 'elections',
      granularity: 'day'
    })
  );
  
  // Fact search
  await testEndpoint('Fact Search', 
    () => api.post('/api/search/facts', {
      query: 'climate'
    })
  );
  
  // Autocomplete
  await testEndpoint('Search Autocomplete', 
    () => api.get('/api/search/autocomplete', {
      params: { q: 'cli' }
    })
  );
  
  // Advanced search
  await testEndpoint('Advanced Search', 
    () => api.post('/api/search/advanced', {
      criteria: {
        text: 'technology',
        categories: ['technology'],
        minImportance: 0.5
      }
    })
  );
  
  // Trending searches
  await testEndpoint('Trending Searches', 
    () => api.get('/api/search/trending')
  );
}

async function testRateLimiting() {
  log('RATE LIMITING', 'section');
  
  log('Testing rate limits (10 rapid requests)...');
  let rateLimited = false;
  
  for (let i = 1; i <= 10; i++) {
    const response = await api.get('/api/news');
    
    if (response.status === 429) {
      log(`Rate limited at request ${i}`, 'success');
      rateLimited = true;
      
      // Check headers
      const limit = response.headers['x-ratelimit-limit'];
      const remaining = response.headers['x-ratelimit-remaining'];
      const reset = response.headers['x-ratelimit-reset'];
      
      log(`Rate limit: ${limit}, Remaining: ${remaining}, Reset: ${reset}`);
      break;
    }
  }
  
  if (!rateLimited) {
    log('No rate limiting triggered in 10 requests', 'skip');
  }
}

async function testErrorHandling() {
  log('ERROR HANDLING', 'section');
  
  // 404 endpoint
  await testEndpoint('404 Not Found', 
    () => api.get('/api/nonexistent')
  );
  
  // Invalid article ID
  await testEndpoint('Invalid Article ID', 
    () => api.get('/api/news/invalid-id-123')
  );
  
  // Missing required field
  await testEndpoint('Missing Required Field', 
    () => api.post('/api/chat/message', {})
  );
  
  // Invalid query
  await testEndpoint('Invalid Search Query', 
    () => api.post('/api/search', { query: '' })
  );
}

// Main test runner
async function runTests() {
  console.log(chalk.cyan.bold('\n' + '='.repeat(70)));
  console.log(chalk.cyan.bold('   PHATO API ENDPOINT TESTS'));
  console.log(chalk.cyan.bold('   Testing MVP Backend'));
  console.log(chalk.cyan.bold('='.repeat(70) + '\n'));
  
  console.log(chalk.blue(`API Base URL: ${API_BASE}`));
  console.log(chalk.blue(`Environment: ${process.env.NODE_ENV || 'development'}\n`));
  
  // Check if server is running
  try {
    await api.get('/health');
  } catch (error) {
    console.log(chalk.red('\n❌ Server is not running!'));
    console.log(chalk.yellow('Start the server with: npm start\n'));
    process.exit(1);
  }
  
  // Run test suites
  await testHealth();
  await testAuth();
  await testNews();
  await testChat();
  await testSearch();
  await testRateLimiting();
  await testErrorHandling();
  
  // Print summary
  console.log(chalk.cyan.bold('\n' + '='.repeat(70)));
  console.log(chalk.cyan.bold('   TEST SUMMARY'));
  console.log(chalk.cyan.bold('='.repeat(70) + '\n'));
  
  console.log(chalk.green(`✅ Passed: ${tests.passed}`));
  console.log(chalk.red(`❌ Failed: ${tests.failed}`));
  console.log(chalk.yellow(`⏭️  Skipped: ${tests.skipped}`));
  
  const total = tests.passed + tests.failed + tests.skipped;
  const successRate = ((tests.passed / (tests.passed + tests.failed)) * 100).toFixed(1);
  
  console.log(chalk.blue(`\nTotal Tests: ${total}`));
  console.log(chalk.blue(`Success Rate: ${successRate}%`));
  
  if (tests.failed === 0) {
    console.log(chalk.green.bold('\n🎉 All tests passed! API is ready for production!'));
  } else {
    console.log(chalk.yellow.bold(`\n⚠️  ${tests.failed} tests failed. Review the errors above.`));
  }
  
  console.log(chalk.cyan('\n' + '='.repeat(70) + '\n'));
  
  process.exit(tests.failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch(error => {
  console.error(chalk.red('Fatal error:'), error);
  process.exit(1);
});