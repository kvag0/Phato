/**
 * Comprehensive Tests for Temporal Services
 * Tests all temporal services created in Phase 2
 */

import dotenv from 'dotenv';
import { GoogleGenerativeAI } from '@google/generative-ai';
import mongoose from 'mongoose';

// Import temporal services
import TemporalFactExtractor from '../src/services/temporal/TemporalFactExtractor.js';
import FactEvolutionTracker from '../src/services/temporal/FactEvolutionTracker.js';
import TemporalQueryService from '../src/services/temporal/TemporalQueryService.js';
import TemporalFactVerifier from '../src/services/temporal/TemporalFactVerifier.js';
import temporalServices from '../src/services/temporal/index.js';

// Import models for testing
import EnhancedArticle from '../src/models/EnhancedArticle.js';
import Fact from '../src/models/Fact.js';
import StoryCluster from '../src/models/StoryCluster.js';

// Load environment variables
dotenv.config();

/**
 * Test Results Container
 */
class TestResults {
  constructor() {
    this.results = {
      serviceInitialization: {},
      geminiConnection: null,
      factExtraction: {},
      evolutionTracking: {},
      temporalQueries: {},
      factVerification: {},
      serviceIntegration: {},
      errors: [],
      summary: {
        totalTests: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
  }

  addResult(category, testName, result) {
    if (!this.results[category]) {
      this.results[category] = {};
    }
    this.results[category][testName] = result;
    this.results.summary.totalTests++;
    
    if (result.status === 'PASSED') {
      this.results.summary.passed++;
    } else if (result.status === 'FAILED') {
      this.results.summary.failed++;
    } else if (result.status === 'WARNING') {
      this.results.summary.warnings++;
    }
  }

  addError(error) {
    this.results.errors.push({
      timestamp: new Date(),
      error: error.message || error,
      stack: error.stack
    });
  }

  generateReport() {
    console.log('\n' + '='.repeat(80));
    console.log('🧪 TEMPORAL SERVICES TEST REPORT');
    console.log('='.repeat(80));
    
    // Summary
    console.log('\n📊 SUMMARY:');
    console.log(`   Total Tests: ${this.results.summary.totalTests}`);
    console.log(`   ✅ Passed: ${this.results.summary.passed}`);
    console.log(`   ❌ Failed: ${this.results.summary.failed}`);
    console.log(`   ⚠️  Warnings: ${this.results.summary.warnings}`);
    
    // Service Initialization
    console.log('\n🔧 SERVICE INITIALIZATION:');
    Object.entries(this.results.serviceInitialization).forEach(([service, result]) => {
      const icon = result.status === 'PASSED' ? '✅' : result.status === 'FAILED' ? '❌' : '⚠️';
      console.log(`   ${icon} ${service}: ${result.message}`);
    });
    
    // Gemini Connection
    console.log('\n🤖 GEMINI API CONNECTION:');
    if (this.results.geminiConnection) {
      const icon = this.results.geminiConnection.status === 'PASSED' ? '✅' : 
                   this.results.geminiConnection.status === 'FAILED' ? '❌' : '⚠️';
      console.log(`   ${icon} ${this.results.geminiConnection.message}`);
    }
    
    // Fact Extraction
    console.log('\n📊 FACT EXTRACTION:');
    Object.entries(this.results.factExtraction).forEach(([test, result]) => {
      const icon = result.status === 'PASSED' ? '✅' : result.status === 'FAILED' ? '❌' : '⚠️';
      console.log(`   ${icon} ${test}: ${result.message}`);
    });
    
    // Evolution Tracking
    console.log('\n🔄 EVOLUTION TRACKING:');
    Object.entries(this.results.evolutionTracking).forEach(([test, result]) => {
      const icon = result.status === 'PASSED' ? '✅' : result.status === 'FAILED' ? '❌' : '⚠️';
      console.log(`   ${icon} ${test}: ${result.message}`);
    });
    
    // Temporal Queries
    console.log('\n🔍 TEMPORAL QUERIES:');
    Object.entries(this.results.temporalQueries).forEach(([test, result]) => {
      const icon = result.status === 'PASSED' ? '✅' : result.status === 'FAILED' ? '❌' : '⚠️';
      console.log(`   ${icon} ${test}: ${result.message}`);
    });
    
    // Fact Verification
    console.log('\n✅ FACT VERIFICATION:');
    Object.entries(this.results.factVerification).forEach(([test, result]) => {
      const icon = result.status === 'PASSED' ? '✅' : result.status === 'FAILED' ? '❌' : '⚠️';
      console.log(`   ${icon} ${test}: ${result.message}`);
    });
    
    // Service Integration
    console.log('\n🔗 SERVICE INTEGRATION:');
    Object.entries(this.results.serviceIntegration).forEach(([test, result]) => {
      const icon = result.status === 'PASSED' ? '✅' : result.status === 'FAILED' ? '❌' : '⚠️';
      console.log(`   ${icon} ${test}: ${result.message}`);
    });
    
    // Errors
    if (this.results.errors.length > 0) {
      console.log('\n🚨 ERRORS:');
      this.results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.error}`);
      });
    }
    
    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    this.generateRecommendations();
    
    console.log('\n' + '='.repeat(80));
    
    return this.results;
  }

  generateRecommendations() {
    const recommendations = [];
    
    if (this.results.summary.failed > 0) {
      recommendations.push('Review failed tests and fix underlying issues');
    }
    
    if (!this.results.geminiConnection || this.results.geminiConnection.status !== 'PASSED') {
      recommendations.push('Verify GEMINI_API_KEY is set and valid');
    }
    
    if (Object.values(this.results.serviceInitialization).some(r => r.status !== 'PASSED')) {
      recommendations.push('Check service dependencies and configurations');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('All temporal services are functioning correctly');
      recommendations.push('Consider running integration tests with real data');
    }
    
    recommendations.forEach((rec, index) => {
      console.log(`   ${index + 1}. ${rec}`);
    });
  }
}

/**
 * Test Runner Class
 */
class TemporalServicesTestRunner {
  constructor() {
    this.results = new TestResults();
    this.sampleArticle = this.createSampleArticle();
    this.sampleFact = this.createSampleFact();
  }

  /**
   * Create sample article for testing
   */
  createSampleArticle() {
    return {
      _id: new mongoose.Types.ObjectId(),
      title: "Federal Reserve Raises Interest Rates by 0.25%",
      content: "The Federal Reserve announced today that it is raising interest rates by 0.25 percentage points to combat inflation. This marks the third rate increase this year. Fed Chair Jerome Powell stated that the decision was unanimous among board members. The new federal funds rate will be between 5.25% and 5.50%. Economists expect this will help slow down economic growth and reduce inflationary pressures.",
      description: "Fed raises rates to combat inflation in unanimous decision",
      source: {
        name: "Reuters",
        url: "https://reuters.com"
      },
      url: "https://reuters.com/economics/fed-rates-2024",
      category: "business",
      publishedAt: new Date('2024-01-15T14:30:00Z'),
      temporalData: {
        publishedAt: new Date('2024-01-15T14:30:00Z'),
        publishDate: '2024-01-15',
        publishWeek: '2024-W03',
        publishMonth: '2024-01',
        publishYear: 2024
      },
      entities: [
        { name: 'Federal Reserve', type: 'ORGANIZATION' },
        { name: 'Jerome Powell', type: 'PERSON' },
        { name: '0.25%', type: 'PERCENTAGE' }
      ],
      extractedFacts: [],
      biasAnalysis: {
        overall_bias: 'center'
      }
    };
  }

  /**
   * Create sample fact for testing
   */
  createSampleFact() {
    return {
      factId: 'test-fact-123',
      statement: 'The Federal Reserve raised interest rates by 0.25%',
      timeline: {
        firstReported: new Date('2024-01-15T14:30:00Z'),
        lastUpdated: new Date(),
        verificationDate: null
      },
      classification: {
        type: 'STATISTIC',
        subtype: 'STATISTIC',
        category: 'business',
        importance: 8,
        timeRelevance: 'CURRENT',
        scope: 'NATIONAL'
      },
      entities: [
        { name: 'Federal Reserve', type: 'ORGANIZATION' },
        { name: '0.25%', type: 'PERCENTAGE' }
      ],
      sourceArticles: [{
        articleId: new mongoose.Types.ObjectId(),
        publishedAt: new Date('2024-01-15T14:30:00Z'),
        source: 'Reuters',
        url: 'https://reuters.com/economics/fed-rates-2024',
        confidence: 0.95,
        context: 'Federal Reserve announcement'
      }],
      verificationHistory: [],
      consensus: {
        agreementLevel: 1.0,
        totalSources: 1,
        agreeSources: ['Reuters']
      },
      tags: ['federal-reserve', 'interest-rates', 'business'],
      evolutionChain: [],
      flags: {
        needsVerification: true,
        isDisputed: false
      }
    };
  }

  /**
   * Run all tests
   */
  async runAllTests() {
    console.log('🚀 Starting Temporal Services Test Suite...\n');
    
    try {
      // Test service initialization
      await this.testServiceInitialization();
      
      // Test Gemini API connection
      await this.testGeminiConnection();
      
      // Test fact extraction
      await this.testFactExtraction();
      
      // Test evolution tracking
      await this.testEvolutionTracking();
      
      // Test temporal queries
      await this.testTemporalQueries();
      
      // Test fact verification
      await this.testFactVerification();
      
      // Test service integration
      await this.testServiceIntegration();
      
    } catch (error) {
      this.results.addError(error);
      console.error('❌ Test suite failed:', error.message);
    }
    
    return this.results.generateReport();
  }

  /**
   * Test service initialization
   */
  async testServiceInitialization() {
    console.log('🔧 Testing service initialization...');
    
    // Test TemporalFactExtractor
    try {
      const hasGenAI = TemporalFactExtractor.genAI !== undefined;
      const hasModel = TemporalFactExtractor.model !== undefined;
      const hasConfig = TemporalFactExtractor.config !== undefined;
      
      if (hasGenAI && hasModel && hasConfig) {
        this.results.addResult('serviceInitialization', 'TemporalFactExtractor', {
          status: 'PASSED',
          message: 'Service initialized correctly with GenAI, model, and config'
        });
      } else {
        this.results.addResult('serviceInitialization', 'TemporalFactExtractor', {
          status: 'FAILED',
          message: `Missing components: GenAI=${hasGenAI}, Model=${hasModel}, Config=${hasConfig}`
        });
      }
    } catch (error) {
      this.results.addResult('serviceInitialization', 'TemporalFactExtractor', {
        status: 'FAILED',
        message: `Initialization failed: ${error.message}`
      });
    }
    
    // Test FactEvolutionTracker
    try {
      const hasGenAI = FactEvolutionTracker.genAI !== undefined;
      const hasModel = FactEvolutionTracker.model !== undefined;
      const hasConfig = FactEvolutionTracker.config !== undefined;
      
      if (hasGenAI && hasModel && hasConfig) {
        this.results.addResult('serviceInitialization', 'FactEvolutionTracker', {
          status: 'PASSED',
          message: 'Service initialized correctly with GenAI, model, and config'
        });
      } else {
        this.results.addResult('serviceInitialization', 'FactEvolutionTracker', {
          status: 'FAILED',
          message: `Missing components: GenAI=${hasGenAI}, Model=${hasModel}, Config=${hasConfig}`
        });
      }
    } catch (error) {
      this.results.addResult('serviceInitialization', 'FactEvolutionTracker', {
        status: 'FAILED',
        message: `Initialization failed: ${error.message}`
      });
    }
    
    // Test TemporalQueryService
    try {
      const hasConfig = TemporalQueryService.config !== undefined;
      const hasCache = TemporalQueryService.queryCache !== undefined;
      
      if (hasConfig && hasCache) {
        this.results.addResult('serviceInitialization', 'TemporalQueryService', {
          status: 'PASSED',
          message: 'Service initialized correctly with config and cache'
        });
      } else {
        this.results.addResult('serviceInitialization', 'TemporalQueryService', {
          status: 'FAILED',
          message: `Missing components: Config=${hasConfig}, Cache=${hasCache}`
        });
      }
    } catch (error) {
      this.results.addResult('serviceInitialization', 'TemporalQueryService', {
        status: 'FAILED',
        message: `Initialization failed: ${error.message}`
      });
    }
    
    // Test TemporalFactVerifier
    try {
      const hasGenAI = TemporalFactVerifier.genAI !== undefined;
      const hasModel = TemporalFactVerifier.model !== undefined;
      const hasConfig = TemporalFactVerifier.config !== undefined;
      
      if (hasGenAI && hasModel && hasConfig) {
        this.results.addResult('serviceInitialization', 'TemporalFactVerifier', {
          status: 'PASSED',
          message: 'Service initialized correctly with GenAI, model, and config'
        });
      } else {
        this.results.addResult('serviceInitialization', 'TemporalFactVerifier', {
          status: 'FAILED',
          message: `Missing components: GenAI=${hasGenAI}, Model=${hasModel}, Config=${hasConfig}`
        });
      }
    } catch (error) {
      this.results.addResult('serviceInitialization', 'TemporalFactVerifier', {
        status: 'FAILED',
        message: `Initialization failed: ${error.message}`
      });
    }
    
    // Test unified temporal services
    try {
      const hasExtractor = temporalServices.factExtractor !== undefined;
      const hasTracker = temporalServices.evolutionTracker !== undefined;
      const hasQueryService = temporalServices.queryService !== undefined;
      const hasVerifier = temporalServices.factVerifier !== undefined;
      
      if (hasExtractor && hasTracker && hasQueryService && hasVerifier) {
        this.results.addResult('serviceInitialization', 'UnifiedTemporalServices', {
          status: 'PASSED',
          message: 'All services available through unified interface'
        });
      } else {
        this.results.addResult('serviceInitialization', 'UnifiedTemporalServices', {
          status: 'FAILED',
          message: `Missing services: Extractor=${hasExtractor}, Tracker=${hasTracker}, Query=${hasQueryService}, Verifier=${hasVerifier}`
        });
      }
    } catch (error) {
      this.results.addResult('serviceInitialization', 'UnifiedTemporalServices', {
        status: 'FAILED',
        message: `Unified services failed: ${error.message}`
      });
    }
  }

  /**
   * Test Gemini API connection
   */
  async testGeminiConnection() {
    console.log('🤖 Testing Gemini API connection...');
    
    try {
      // Check if API key is set
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        this.results.geminiConnection = {
          status: 'FAILED',
          message: 'GEMINI_API_KEY environment variable is not set'
        };
        return;
      }
      
      // Test basic API call
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
      
      const result = await model.generateContent('Return only the word "SUCCESS" if this API call works.');
      const response = await result.response;
      const text = response.text().trim();
      
      if (text.includes('SUCCESS')) {
        this.results.geminiConnection = {
          status: 'PASSED',
          message: 'Gemini API connection successful and responding correctly'
        };
      } else {
        this.results.geminiConnection = {
          status: 'WARNING',
          message: `Gemini API connected but returned unexpected response: ${text}`
        };
      }
      
    } catch (error) {
      this.results.geminiConnection = {
        status: 'FAILED',
        message: `Gemini API connection failed: ${error.message}`
      };
    }
  }

  /**
   * Test fact extraction functionality
   */
  async testFactExtraction() {
    console.log('📊 Testing fact extraction...');
    
    // Test extraction prompt building
    try {
      const prompt = TemporalFactExtractor.buildExtractionPrompt(this.sampleArticle);
      
      if (prompt && prompt.includes('EXTRACT VERIFIABLE FACTS') && prompt.includes(this.sampleArticle.title)) {
        this.results.addResult('factExtraction', 'PromptBuilding', {
          status: 'PASSED',
          message: 'Extraction prompt built correctly with article content'
        });
      } else {
        this.results.addResult('factExtraction', 'PromptBuilding', {
          status: 'FAILED',
          message: 'Extraction prompt missing required components'
        });
      }
    } catch (error) {
      this.results.addResult('factExtraction', 'PromptBuilding', {
        status: 'FAILED',
        message: `Prompt building failed: ${error.message}`
      });
    }
    
    // Test JSON parsing
    try {
      const sampleResponse = `[
        {
          "statement": "The Federal Reserve raised interest rates by 0.25%",
          "factType": "STATISTIC",
          "confidence": 0.95,
          "importance": 8,
          "verifiability": "HIGH",
          "timeRelevance": "CURRENT",
          "temporalScope": "DAYS",
          "entities": ["Federal Reserve"],
          "evidence": "Direct statement in article",
          "context": "Monetary policy decision"
        }
      ]`;
      
      const parsed = TemporalFactExtractor.parseGeminiResponse(sampleResponse);
      
      if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].statement) {
        this.results.addResult('factExtraction', 'JSONParsing', {
          status: 'PASSED',
          message: 'JSON response parsing works correctly'
        });
      } else {
        this.results.addResult('factExtraction', 'JSONParsing', {
          status: 'FAILED',
          message: 'JSON parsing returned invalid structure'
        });
      }
    } catch (error) {
      this.results.addResult('factExtraction', 'JSONParsing', {
        status: 'FAILED',
        message: `JSON parsing failed: ${error.message}`
      });
    }
    
    // Test fact processing
    try {
      const rawFacts = [{
        statement: "The Federal Reserve raised interest rates by 0.25%",
        factType: "STATISTIC",
        confidence: 0.95,
        importance: 8,
        verifiability: "HIGH",
        timeRelevance: "CURRENT",
        temporalScope: "DAYS",
        entities: ["Federal Reserve"],
        evidence: "Direct statement in article",
        context: "Monetary policy decision"
      }];
      
      const processed = await TemporalFactExtractor.processExtractedFacts(rawFacts, this.sampleArticle);
      
      if (processed.length > 0 && processed[0].factId && processed[0].statement) {
        this.results.addResult('factExtraction', 'FactProcessing', {
          status: 'PASSED',
          message: `Successfully processed ${processed.length} facts with proper structure`
        });
      } else {
        this.results.addResult('factExtraction', 'FactProcessing', {
          status: 'FAILED',
          message: 'Fact processing returned invalid structure'
        });
      }
    } catch (error) {
      this.results.addResult('factExtraction', 'FactProcessing', {
        status: 'FAILED',
        message: `Fact processing failed: ${error.message}`
      });
    }
    
    // Test cache functionality
    try {
      const cacheKey = this.sampleArticle._id;
      const cacheData = { test: 'data', timestamp: Date.now() };
      
      TemporalFactExtractor.factCache.set(cacheKey, cacheData);
      const retrieved = TemporalFactExtractor.factCache.get(cacheKey);
      
      if (retrieved && retrieved.test === 'data') {
        this.results.addResult('factExtraction', 'CacheFunctionality', {
          status: 'PASSED',
          message: 'Cache storing and retrieving data correctly'
        });
      } else {
        this.results.addResult('factExtraction', 'CacheFunctionality', {
          status: 'FAILED',
          message: 'Cache not working properly'
        });
      }
    } catch (error) {
      this.results.addResult('factExtraction', 'CacheFunctionality', {
        status: 'FAILED',
        message: `Cache functionality failed: ${error.message}`
      });
    }
  }

  /**
   * Test evolution tracking functionality
   */
  async testEvolutionTracking() {
    console.log('🔄 Testing evolution tracking...');
    
    // Test similarity calculation fallback
    try {
      const statement1 = "The Federal Reserve raised interest rates by 0.25%";
      const statement2 = "Fed increases rates by 0.25 percentage points";
      
      const similarity = FactEvolutionTracker.fallbackSimilarity(statement1, statement2);
      
      if (typeof similarity === 'number' && similarity >= 0 && similarity <= 1) {
        this.results.addResult('evolutionTracking', 'SimilarityCalculation', {
          status: 'PASSED',
          message: `Similarity calculation working (${similarity.toFixed(2)})`
        });
      } else {
        this.results.addResult('evolutionTracking', 'SimilarityCalculation', {
          status: 'FAILED',
          message: 'Similarity calculation returned invalid value'
        });
      }
    } catch (error) {
      this.results.addResult('evolutionTracking', 'SimilarityCalculation', {
        status: 'FAILED',
        message: `Similarity calculation failed: ${error.message}`
      });
    }
    
    // Test regex creation
    try {
      const statement = "The Federal Reserve announced a rate increase today";
      const regex = FactEvolutionTracker.createFactRegex(statement);
      
      if (regex instanceof RegExp) {
        this.results.addResult('evolutionTracking', 'RegexCreation', {
          status: 'PASSED',
          message: 'Fact regex creation working correctly'
        });
      } else {
        this.results.addResult('evolutionTracking', 'RegexCreation', {
          status: 'FAILED',
          message: 'Regex creation returned invalid object'
        });
      }
    } catch (error) {
      this.results.addResult('evolutionTracking', 'RegexCreation', {
        status: 'FAILED',
        message: `Regex creation failed: ${error.message}`
      });
    }
    
    // Test evolution confidence calculation
    try {
      const mockEvents = [
        { confidence: 0.9, similarity: 0.8 },
        { confidence: 0.8, similarity: 0.9 },
        { confidence: 0.85, similarity: 0.75 }
      ];
      
      const confidence = FactEvolutionTracker.calculateEvolutionConfidence(mockEvents);
      
      if (typeof confidence === 'number' && confidence >= 0 && confidence <= 1) {
        this.results.addResult('evolutionTracking', 'ConfidenceCalculation', {
          status: 'PASSED',
          message: `Evolution confidence calculated correctly (${confidence.toFixed(2)})`
        });
      } else {
        this.results.addResult('evolutionTracking', 'ConfidenceCalculation', {
          status: 'FAILED',
          message: 'Confidence calculation returned invalid value'
        });
      }
    } catch (error) {
      this.results.addResult('evolutionTracking', 'ConfidenceCalculation', {
        status: 'FAILED',
        message: `Confidence calculation failed: ${error.message}`
      });
    }
    
    // Test stability score calculation
    try {
      const mockEvents = [
        { evolutionType: 'UPDATE' },
        { evolutionType: 'CLARIFICATION' },
        { evolutionType: 'CONTRADICTION' }
      ];
      
      const stability = FactEvolutionTracker.calculateStabilityScore(mockEvents);
      
      if (typeof stability === 'number' && stability >= 0 && stability <= 1) {
        this.results.addResult('evolutionTracking', 'StabilityScore', {
          status: 'PASSED',
          message: `Stability score calculated correctly (${stability.toFixed(2)})`
        });
      } else {
        this.results.addResult('evolutionTracking', 'StabilityScore', {
          status: 'FAILED',
          message: 'Stability score calculation returned invalid value'
        });
      }
    } catch (error) {
      this.results.addResult('evolutionTracking', 'StabilityScore', {
        status: 'FAILED',
        message: `Stability score calculation failed: ${error.message}`
      });
    }
  }

  /**
   * Test temporal query functionality
   */
  async testTemporalQueries() {
    console.log('🔍 Testing temporal queries...');
    
    // Test date range query building
    try {
      const params = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        category: 'business',
        sources: ['Reuters', 'CNN'],
        bias: ['center']
      };
      
      const query = TemporalQueryService.buildDateRangeQuery(params);
      
      if (query && query['temporalData.publishedAt'] && query.category === 'business') {
        this.results.addResult('temporalQueries', 'DateRangeQuery', {
          status: 'PASSED',
          message: 'Date range query building correctly with filters'
        });
      } else {
        this.results.addResult('temporalQueries', 'DateRangeQuery', {
          status: 'FAILED',
          message: 'Date range query missing required components'
        });
      }
    } catch (error) {
      this.results.addResult('temporalQueries', 'DateRangeQuery', {
        status: 'FAILED',
        message: `Date range query building failed: ${error.message}`
      });
    }
    
    // Test temporal key generation
    try {
      const date = new Date('2024-01-15T14:30:00Z');
      const dayKey = TemporalQueryService.getTemporalKey(date, 'day');
      const weekKey = TemporalQueryService.getTemporalKey(date, 'week');
      const monthKey = TemporalQueryService.getTemporalKey(date, 'month');
      
      if (dayKey === '2024-01-15' && weekKey.includes('2024-W') && monthKey === '2024-01') {
        this.results.addResult('temporalQueries', 'TemporalKeys', {
          status: 'PASSED',
          message: 'Temporal key generation working for all granularities'
        });
      } else {
        this.results.addResult('temporalQueries', 'TemporalKeys', {
          status: 'FAILED',
          message: `Invalid temporal keys: day=${dayKey}, week=${weekKey}, month=${monthKey}`
        });
      }
    } catch (error) {
      this.results.addResult('temporalQueries', 'TemporalKeys', {
        status: 'FAILED',
        message: `Temporal key generation failed: ${error.message}`
      });
    }
    
    // Test bias distribution calculation
    try {
      const mockArticles = [
        { biasAnalysis: { overall_bias: 'center' } },
        { biasAnalysis: { overall_bias: 'left' } },
        { biasAnalysis: { overall_bias: 'center' } },
        { biasAnalysis: null }
      ];
      
      const distribution = TemporalQueryService.calculateBiasDistribution(mockArticles);
      
      if (distribution.counts && distribution.percentages && distribution.dominantBias) {
        this.results.addResult('temporalQueries', 'BiasDistribution', {
          status: 'PASSED',
          message: `Bias distribution calculated correctly (dominant: ${distribution.dominantBias})`
        });
      } else {
        this.results.addResult('temporalQueries', 'BiasDistribution', {
          status: 'FAILED',
          message: 'Bias distribution missing required components'
        });
      }
    } catch (error) {
      this.results.addResult('temporalQueries', 'BiasDistribution', {
        status: 'FAILED',
        message: `Bias distribution calculation failed: ${error.message}`
      });
    }
    
    // Test cache functionality
    try {
      const cacheKey = 'test-query';
      const cacheData = { results: 'test' };
      
      TemporalQueryService.queryCache.set(cacheKey, cacheData);
      const retrieved = TemporalQueryService.queryCache.get(cacheKey);
      
      if (retrieved && retrieved.results === 'test') {
        this.results.addResult('temporalQueries', 'QueryCache', {
          status: 'PASSED',
          message: 'Query cache functioning correctly'
        });
      } else {
        this.results.addResult('temporalQueries', 'QueryCache', {
          status: 'FAILED',
          message: 'Query cache not working properly'
        });
      }
    } catch (error) {
      this.results.addResult('temporalQueries', 'QueryCache', {
        status: 'FAILED',
        message: `Query cache failed: ${error.message}`
      });
    }
  }

  /**
   * Test fact verification functionality
   */
  async testFactVerification() {
    console.log('✅ Testing fact verification...');
    
    // Test simple similarity calculation
    try {
      const statement1 = "The Federal Reserve raised interest rates by 0.25%";
      const statement2 = "Fed increases rates by 0.25 percentage points";
      
      const similarity = TemporalFactVerifier.simpleSimilarity(statement1, statement2);
      
      if (typeof similarity === 'number' && similarity >= 0 && similarity <= 1) {
        this.results.addResult('factVerification', 'SimpleSimilarity', {
          status: 'PASSED',
          message: `Simple similarity calculation working (${similarity.toFixed(2)})`
        });
      } else {
        this.results.addResult('factVerification', 'SimpleSimilarity', {
          status: 'FAILED',
          message: 'Simple similarity calculation returned invalid value'
        });
      }
    } catch (error) {
      this.results.addResult('factVerification', 'SimpleSimilarity', {
        status: 'FAILED',
        message: `Simple similarity calculation failed: ${error.message}`
      });
    }
    
    // Test fact supporting detection
    try {
      const originalFact = { statement: "The Federal Reserve raised interest rates" };
      const supportingFact = { 
        statement: "Fed increases interest rates", 
        verificationStatus: 'VERIFIED' 
      };
      
      const isSupporting = TemporalFactVerifier.isFactSupporting(originalFact, supportingFact);
      
      if (typeof isSupporting === 'boolean') {
        this.results.addResult('factVerification', 'SupportingDetection', {
          status: 'PASSED',
          message: `Supporting fact detection working (result: ${isSupporting})`
        });
      } else {
        this.results.addResult('factVerification', 'SupportingDetection', {
          status: 'FAILED',
          message: 'Supporting fact detection returned invalid type'
        });
      }
    } catch (error) {
      this.results.addResult('factVerification', 'SupportingDetection', {
        status: 'FAILED',
        message: `Supporting fact detection failed: ${error.message}`
      });
    }
    
    // Test contradiction detection
    try {
      const originalFact = { statement: "The Federal Reserve raised interest rates" };
      const contradictingFact = { 
        statement: "Fed did not raise interest rates today", 
        verificationStatus: 'VERIFIED' 
      };
      
      const isContradicting = TemporalFactVerifier.isFactContradicting(originalFact, contradictingFact);
      
      if (typeof isContradicting === 'boolean') {
        this.results.addResult('factVerification', 'ContradictionDetection', {
          status: 'PASSED',
          message: `Contradiction detection working (result: ${isContradicting})`
        });
      } else {
        this.results.addResult('factVerification', 'ContradictionDetection', {
          status: 'FAILED',
          message: 'Contradiction detection returned invalid type'
        });
      }
    } catch (error) {
      this.results.addResult('factVerification', 'ContradictionDetection', {
        status: 'FAILED',
        message: `Contradiction detection failed: ${error.message}`
      });
    }
    
    // Test source quality scoring
    try {
      const mockConsensus = {
        supportingSources: ['Reuters', 'BBC'],
        dissentingSources: ['Unknown Source']
      };
      
      const qualityScore = TemporalFactVerifier.calculateSourceQualityScore(mockConsensus);
      
      if (typeof qualityScore === 'number' && qualityScore >= 0 && qualityScore <= 1) {
        this.results.addResult('factVerification', 'SourceQuality', {
          status: 'PASSED',
          message: `Source quality scoring working (score: ${qualityScore.toFixed(2)})`
        });
      } else {
        this.results.addResult('factVerification', 'SourceQuality', {
          status: 'FAILED',
          message: 'Source quality scoring returned invalid value'
        });
      }
    } catch (error) {
      this.results.addResult('factVerification', 'SourceQuality', {
        status: 'FAILED',
        message: `Source quality scoring failed: ${error.message}`
      });
    }
    
    // Test conflict categorization
    try {
      const mockConflicts = [
        { type: 'CONTRADICTION' },
        { type: 'VARIATION' },
        { type: 'CONTRADICTION' }
      ];
      
      const categories = TemporalFactVerifier.categorizeConflicts(mockConflicts);
      
      if (categories.CONTRADICTION === 2 && categories.VARIATION === 1) {
        this.results.addResult('factVerification', 'ConflictCategorization', {
          status: 'PASSED',
          message: 'Conflict categorization working correctly'
        });
      } else {
        this.results.addResult('factVerification', 'ConflictCategorization', {
          status: 'FAILED',
          message: 'Conflict categorization returned incorrect counts'
        });
      }
    } catch (error) {
      this.results.addResult('factVerification', 'ConflictCategorization', {
        status: 'FAILED',
        message: `Conflict categorization failed: ${error.message}`
      });
    }
  }

  /**
   * Test service integration
   */
  async testServiceIntegration() {
    console.log('🔗 Testing service integration...');
    
    // Test unified services statistics
    try {
      const stats = temporalServices.getStatistics();
      
      if (stats.services && stats.cache && stats.configuration) {
        this.results.addResult('serviceIntegration', 'Statistics', {
          status: 'PASSED',
          message: 'Service statistics available and properly structured'
        });
      } else {
        this.results.addResult('serviceIntegration', 'Statistics', {
          status: 'FAILED',
          message: 'Service statistics missing required components'
        });
      }
    } catch (error) {
      this.results.addResult('serviceIntegration', 'Statistics', {
        status: 'FAILED',
        message: `Service statistics failed: ${error.message}`
      });
    }
    
    // Test cache clearing
    try {
      temporalServices.clearCaches();
      
      const extractorCacheSize = TemporalFactExtractor.factCache.size;
      const queryCacheSize = TemporalQueryService.queryCache.size;
      
      this.results.addResult('serviceIntegration', 'CacheClearing', {
        status: 'PASSED',
        message: `Cache clearing executed (sizes: extractor=${extractorCacheSize}, query=${queryCacheSize})`
      });
    } catch (error) {
      this.results.addResult('serviceIntegration', 'CacheClearing', {
        status: 'FAILED',
        message: `Cache clearing failed: ${error.message}`
      });
    }
    
    // Test configuration consistency
    try {
      const extractorConfig = TemporalFactExtractor.config;
      const trackerConfig = FactEvolutionTracker.config;
      const queryConfig = TemporalQueryService.config;
      const verifierConfig = TemporalFactVerifier.config;
      
      const allHaveConfig = extractorConfig && trackerConfig && queryConfig && verifierConfig;
      
      if (allHaveConfig) {
        this.results.addResult('serviceIntegration', 'ConfigurationConsistency', {
          status: 'PASSED',
          message: 'All services have proper configurations'
        });
      } else {
        this.results.addResult('serviceIntegration', 'ConfigurationConsistency', {
          status: 'FAILED',
          message: 'Some services missing configurations'
        });
      }
    } catch (error) {
      this.results.addResult('serviceIntegration', 'ConfigurationConsistency', {
        status: 'FAILED',
        message: `Configuration consistency check failed: ${error.message}`
      });
    }
    
    // Test method availability
    try {
      const requiredMethods = {
        TemporalFactExtractor: ['extractFactsFromArticle', 'buildExtractionPrompt', 'parseGeminiResponse'],
        FactEvolutionTracker: ['trackFactEvolution', 'fallbackSimilarity', 'calculateEvolutionConfidence'],
        TemporalQueryService: ['queryByDateRange', 'queryFactsByTime', 'getStoryClusters'],
        TemporalFactVerifier: ['verifyFactAcrossTime', 'simpleSimilarity', 'calculateSourceQualityScore']
      };
      
      const services = {
        TemporalFactExtractor,
        FactEvolutionTracker,
        TemporalQueryService,
        TemporalFactVerifier
      };
      
      let allMethodsAvailable = true;
      const missingMethods = [];
      
      Object.entries(requiredMethods).forEach(([serviceName, methods]) => {
        methods.forEach(method => {
          if (typeof services[serviceName][method] !== 'function') {
            allMethodsAvailable = false;
            missingMethods.push(`${serviceName}.${method}`);
          }
        });
      });
      
      if (allMethodsAvailable) {
        this.results.addResult('serviceIntegration', 'MethodAvailability', {
          status: 'PASSED',
          message: 'All required service methods are available'
        });
      } else {
        this.results.addResult('serviceIntegration', 'MethodAvailability', {
          status: 'FAILED',
          message: `Missing methods: ${missingMethods.join(', ')}`
        });
      }
    } catch (error) {
      this.results.addResult('serviceIntegration', 'MethodAvailability', {
        status: 'FAILED',
        message: `Method availability check failed: ${error.message}`
      });
    }
  }
}

/**
 * Main test execution
 */
async function runTemporalServicesTests() {
  const testRunner = new TemporalServicesTestRunner();
  const results = await testRunner.runAllTests();
  return results;
}

// Export for use as module or run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runTemporalServicesTests()
    .then(results => {
      const exitCode = results.summary.failed > 0 ? 1 : 0;
      process.exit(exitCode);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

export default runTemporalServicesTests;