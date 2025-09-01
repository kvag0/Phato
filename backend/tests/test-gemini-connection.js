/**
 * Specific Gemini API Connection Test
 */

import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Load environment variables
dotenv.config();

async function testGeminiConnection() {
  console.log('🤖 Testing Gemini API Connection...\n');
  
  try {
    // Check if API key is set
    const apiKey = process.env.GEMINI_API_KEY;
    console.log(`📋 API Key Status: ${apiKey ? '✅ Set' : '❌ Not set'}`);
    
    if (!apiKey) {
      console.log('❌ GEMINI_API_KEY environment variable is not set');
      return false;
    }
    
    console.log(`📏 API Key Length: ${apiKey.length} characters`);
    console.log(`🔑 API Key Preview: ${apiKey.substring(0, 10)}...${apiKey.substring(apiKey.length - 5)}`);
    
    // Initialize Gemini AI
    console.log('\n🔄 Initializing Gemini AI...');
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try different model names
    const modelNames = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro'];
    let model = null;
    let workingModel = null;
    
    for (const modelName of modelNames) {
      try {
        console.log(`🔄 Trying model: ${modelName}`);
        model = genAI.getGenerativeModel({ model: modelName });
        
        // Test with a simple call
        const testResult = await model.generateContent('Say "test" if you can respond');
        const testResponse = await testResult.response;
        const testText = testResponse.text().trim();
        
        if (testText) {
          workingModel = modelName;
          console.log(`✅ Model ${modelName} is working`);
          break;
        }
      } catch (error) {
        console.log(`❌ Model ${modelName} failed: ${error.message}`);
        continue;
      }
    }
    
    if (!workingModel) {
      throw new Error('No working Gemini model found');
    }
    
    console.log(`✅ Gemini AI initialized successfully with model: ${workingModel}`);
    
    // Test basic API call
    console.log('\n🔄 Testing basic API call...');
    const prompt = 'Return only the word "SUCCESS" if this API call works.';
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text().trim();
    
    console.log(`📝 API Response: "${text}"`);
    
    if (text.includes('SUCCESS')) {
      console.log('✅ Gemini API connection successful!');
      
      // Test fact extraction prompt
      console.log('\n🔄 Testing fact extraction prompt...');
      const factPrompt = `
      Extract one simple fact from this text and return it as JSON:
      "The Federal Reserve raised interest rates by 0.25% today."
      
      Return format:
      {
        "statement": "extracted fact",
        "confidence": 0.95
      }`;
      
      const factResult = await model.generateContent(factPrompt);
      const factResponse = await factResult.response;
      const factText = factResponse.text().trim();
      
      console.log(`📊 Fact Extraction Response:\n${factText}`);
      
      try {
        // Try to parse as JSON
        const cleanText = factText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
        const parsed = JSON.parse(cleanText);
        console.log('✅ JSON parsing successful');
        console.log(`📋 Extracted Statement: "${parsed.statement}"`);
        console.log(`🎯 Confidence: ${parsed.confidence}`);
      } catch (parseError) {
        console.log('⚠️  JSON parsing failed, but API call succeeded');
        console.log(`Parse error: ${parseError.message}`);
      }
      
      return true;
    } else {
      console.log(`⚠️  API connected but returned unexpected response: ${text}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ Gemini API connection failed: ${error.message}`);
    
    if (error.message.includes('API_KEY_INVALID')) {
      console.log('🔧 The API key appears to be invalid');
    } else if (error.message.includes('PERMISSION_DENIED')) {
      console.log('🔧 Permission denied - check API key permissions');
    } else if (error.message.includes('QUOTA_EXCEEDED')) {
      console.log('🔧 API quota exceeded');
    } else {
      console.log('🔧 Check network connection and API key validity');
    }
    
    return false;
  }
}

// Run test
if (import.meta.url === `file://${process.argv[1]}`) {
  testGeminiConnection()
    .then(success => {
      console.log(`\n${success ? '✅ All tests passed!' : '❌ Tests failed'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

export default testGeminiConnection;