#!/usr/bin/env node

/**
 * Vector Services Test Runner
 * 
 * This script runs comprehensive tests for the vector database and embedding services.
 * It checks for required dependencies, environment configuration, and runs all tests.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

console.log('🚀 Vector Services Test Runner');
console.log('================================\n');

/**
 * Check if required dependencies are installed
 */
function checkDependencies() {
  console.log('📦 Checking dependencies...');
  
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  const requiredDeps = [
    '@xenova/transformers',
    '@pinecone-database/pinecone', 
    'jest'
  ];
  
  const installedDeps = {
    ...packageJson.dependencies,
    ...packageJson.devDependencies
  };
  
  const missing = requiredDeps.filter(dep => !installedDeps[dep]);
  
  if (missing.length > 0) {
    console.error(`❌ Missing dependencies: ${missing.join(', ')}`);
    console.log('Run: npm install');
    process.exit(1);
  }
  
  console.log('✅ All required dependencies found\n');
}

/**
 * Check environment configuration
 */
function checkEnvironment() {
  console.log('🔧 Checking environment configuration...');
  
  // Check for .env file
  if (!fs.existsSync('.env')) {
    console.warn('⚠️  No .env file found. Using environment variables or defaults.');
  }
  
  // Check critical environment variables
  const envChecks = [
    {
      name: 'PINECONE_API_KEY',
      value: process.env.PINECONE_API_KEY,
      required: false,
      message: 'Pinecone vector database tests will be limited'
    },
    {
      name: 'EMBEDDINGS_MODEL',
      value: process.env.EMBEDDINGS_MODEL || 'BAAI/bge-large-en-v1.5',
      required: true,
      message: 'Should be BAAI/bge-large-en-v1.5'
    },
    {
      name: 'EMBEDDINGS_DIMENSION',
      value: process.env.EMBEDDINGS_DIMENSION || '1024',
      required: true,
      message: 'Should be 1024 for BGE-large model'
    },
    {
      name: 'EMBEDDINGS_CACHE_DIR',
      value: process.env.EMBEDDINGS_CACHE_DIR || './models',
      required: true,
      message: 'Directory for model cache'
    }
  ];
  
  envChecks.forEach(check => {
    if (check.value) {
      console.log(`   ✅ ${check.name}: ${check.value}`);
    } else if (check.required) {
      console.error(`   ❌ ${check.name}: Not set (${check.message})`);
    } else {
      console.warn(`   ⚠️  ${check.name}: Not set (${check.message})`);
    }
  });
  
  // Ensure models directory exists
  const modelsDir = process.env.EMBEDDINGS_CACHE_DIR || './models';
  if (!fs.existsSync(modelsDir)) {
    console.log(`📁 Creating models directory: ${modelsDir}`);
    fs.mkdirSync(modelsDir, { recursive: true });
  }
  
  console.log('');
}

/**
 * Check system resources
 */
async function checkSystemResources() {
  console.log('💻 Checking system resources...');
  
  try {
    // Check available memory (rough estimate)
    const os = await import('os');
    const totalMem = os.totalmem();
    const freeMem = os.freemem();
    
    console.log(`   Total memory: ${(totalMem / 1024 / 1024 / 1024).toFixed(2)} GB`);
    console.log(`   Free memory: ${(freeMem / 1024 / 1024 / 1024).toFixed(2)} GB`);
    
    if (freeMem < 2 * 1024 * 1024 * 1024) { // Less than 2GB
      console.warn('⚠️  Low memory detected. Model download and loading may be slow.');
    }
  } catch (error) {
    console.warn('   Could not check memory information');
  }
  
  // Check disk space in models directory
  const modelsDir = process.env.EMBEDDINGS_CACHE_DIR || './models';
  try {
    const stats = fs.statSync(modelsDir);
    console.log(`   Models directory: ${modelsDir}`);
  } catch (error) {
    console.warn(`   Could not check models directory: ${error.message}`);
  }
  
  console.log('');
}

/**
 * Run the tests
 */
function runTests() {
  console.log('🧪 Starting vector services tests...');
  console.log('This may take several minutes for first-time model download.\n');
  
  const testProcess = spawn('npm', ['test', 'tests/test-vector-services.js'], {
    stdio: 'inherit',
    shell: true
  });
  
  testProcess.on('close', (code) => {
    console.log(`\n🏁 Tests completed with exit code: ${code}`);
    
    if (code === 0) {
      console.log('✅ All tests passed successfully!');
      
      // Show next steps
      console.log('\n📋 Next Steps:');
      console.log('1. Review the test results above');
      console.log('2. Check model download and file sizes');
      console.log('3. Verify Pinecone connection status');
      console.log('4. Test embedding generation performance');
      console.log('5. Validate search functionality');
      
    } else {
      console.log('❌ Some tests failed. Check the output above for details.');
    }
    
    process.exit(code);
  });
  
  testProcess.on('error', (error) => {
    console.error('❌ Failed to start tests:', error.message);
    process.exit(1);
  });
}

/**
 * Main execution
 */
async function main() {
  try {
    checkDependencies();
    checkEnvironment();
    await checkSystemResources();
    runTests();
  } catch (error) {
    console.error('❌ Test runner failed:', error.message);
    process.exit(1);
  }
}

// Handle process signals
process.on('SIGINT', () => {
  console.log('\n🛑 Test execution interrupted by user');
  process.exit(1);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Test execution terminated');
  process.exit(1);
});

// Run the main function
main();