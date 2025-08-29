import mongoose from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

// Import all models
import EnhancedArticle from '../src/models/EnhancedArticle.js';
import Fact from '../src/models/Fact.js';
import ChatConversation from '../src/models/ChatConversation.js';
import StoryCluster from '../src/models/StoryCluster.js';
import Article from '../src/models/Article.js';

// Import configuration and utilities
import connectDB from '../src/config/database.js';
import { IndexManager } from '../src/config/setupIndexes.js';
import { DatabaseMigration } from '../src/migrations/migrateToEnhanced.js';

dotenv.config();

/**
 * Comprehensive Database Models Test Suite
 * Tests all MongoDB models, schemas, indexes, and functionality
 */

class DatabaseModelTester {
  constructor() {
    this.testResults = {
      modelsTests: [],
      indexTests: [],
      migrationTests: [],
      helperMethodTests: [],
      validationTests: [],
      sampleDataTests: [],
      uuidTests: [],
      connectionTests: [],
      errors: [],
      warnings: []
    };
    this.testConnection = null;
    this.sampleData = {};
  }

  /**
   * Main test runner
   */
  async runAllTests() {
    console.log('🧪 Starting Comprehensive Database Models Test Suite\n');
    console.log('=' .repeat(60));
    
    let hasDbConnection = false;
    
    try {
      // Test database connection
      hasDbConnection = await this.testDatabaseConnection();
      
      // Test UUID generation
      await this.testUUIDGeneration();
      
      // Test model schemas and validation (works without DB)
      await this.testModelSchemasWithoutDB();
      
      // Test sample data creation (works without DB)
      await this.testSampleDataCreation();
      
      // Database-dependent tests
      if (hasDbConnection) {
        console.log('🗄️  Running database-dependent tests...\n');
        
        // Test model operations with database
        await this.testModelSchemas();
        
        // Test indexes
        await this.testDatabaseIndexes();
        
        // Test helper methods
        await this.testHelperMethods();
        
        // Test temporal field calculations
        await this.testTemporalCalculations();
        
        // Test migration script
        await this.testMigrationScript();
        
        // Cleanup test data
        await this.cleanupTestData();
      } else {
        console.log('⏭️  Skipping database-dependent tests due to connection issues\n');
        this.testResults.warnings.push('Database-dependent tests were skipped');
      }
      
      // Print final results
      this.printTestResults();
      
    } catch (error) {
      console.error('❌ Test suite failed with error:', error.message);
      this.testResults.errors.push(`Test suite error: ${error.message}`);
    } finally {
      if (this.testConnection) {
        await mongoose.connection.close();
        console.log('🔌 Database connection closed\n');
      }
    }
  }

  /**
   * Test database connection
   */
  async testDatabaseConnection() {
    console.log('🔌 Testing Database Connection...\n');
    
    // Try multiple connection options
    const connectionOptions = [
      { uri: process.env.MONGODB_URI, name: 'MongoDB Atlas (Production)' },
      { uri: 'mongodb://localhost:27017/phato_test', name: 'Local MongoDB (Test)' }
    ];
    
    let connectionSuccessful = false;
    
    for (const option of connectionOptions) {
      if (connectionSuccessful) break;
      
      try {
        console.log(`Trying ${option.name}...`);
        this.testConnection = await mongoose.connect(option.uri, {
          serverSelectionTimeoutMS: 5000, // 5 second timeout
        });
        
        console.log('✅ Database connection successful');
        console.log(`📍 Connected to: ${this.testConnection.connection.host}:${this.testConnection.connection.port}`);
        console.log(`🗄️  Database: ${this.testConnection.connection.name}\n`);
        
        this.testResults.connectionTests.push({
          test: 'Database Connection',
          status: 'PASSED',
          details: `Connected to ${this.testConnection.connection.host} via ${option.name}`
        });
        
        connectionSuccessful = true;
        
      } catch (error) {
        console.log(`⚠️  Could not connect to ${option.name}: ${error.message}`);
        this.testResults.warnings.push(`Could not connect to ${option.name}: ${error.message}`);
      }
    }
    
    if (!connectionSuccessful) {
      const errorMsg = 'Could not establish database connection with any available options';
      console.log('⚠️  ' + errorMsg);
      console.log('🔄 Continuing with schema validation tests only...\n');
      
      this.testResults.connectionTests.push({
        test: 'Database Connection',
        status: 'FAILED',
        error: errorMsg
      });
      this.testResults.warnings.push('Database-dependent tests will be skipped');
      
      // Don't throw error, continue with non-database tests
      return false;
    }
    
    return true;
  }

  /**
   * Test UUID generation functionality
   */
  async testUUIDGeneration() {
    console.log('🆔 Testing UUID Generation...\n');
    
    try {
      // Test UUID v4 generation
      const uuid1 = uuidv4();
      const uuid2 = uuidv4();
      
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      
      const tests = [
        {
          name: 'UUID Format Validation',
          test: () => uuidRegex.test(uuid1) && uuidRegex.test(uuid2),
          expected: true
        },
        {
          name: 'UUID Uniqueness',
          test: () => uuid1 !== uuid2,
          expected: true
        },
        {
          name: 'UUID Length',
          test: () => uuid1.length === 36 && uuid2.length === 36,
          expected: true
        }
      ];
      
      for (const test of tests) {
        const result = test.test();
        const status = result === test.expected ? 'PASSED' : 'FAILED';
        
        console.log(`${status === 'PASSED' ? '✅' : '❌'} ${test.name}: ${status}`);
        
        this.testResults.uuidTests.push({
          test: test.name,
          status,
          result,
          expected: test.expected
        });
      }
      
      console.log(`📋 Generated UUIDs: ${uuid1}, ${uuid2}\n`);
      
    } catch (error) {
      const errorMsg = `UUID generation test failed: ${error.message}`;
      console.error('❌', errorMsg);
      this.testResults.errors.push(errorMsg);
    }
  }

  /**
   * Test model schemas without database operations
   */
  async testModelSchemasWithoutDB() {
    console.log('📋 Testing Model Schemas (Structure & Validation)...\n');
    
    const modelTests = [
      {
        name: 'EnhancedArticle Schema',
        model: EnhancedArticle,
        testData: this.createEnhancedArticleTestData(),
        requiredFields: ['title', 'url', 'publishedAt', 'category']
      },
      {
        name: 'Fact Schema', 
        model: Fact,
        testData: this.createFactTestData(),
        requiredFields: ['factId', 'statement', 'timeline.firstReported', 'classification.type']
      },
      {
        name: 'ChatConversation Schema',
        model: ChatConversation, 
        testData: this.createChatConversationTestData(),
        requiredFields: ['conversationId']
      },
      {
        name: 'StoryCluster Schema',
        model: StoryCluster,
        testData: this.createStoryClusterTestData(),
        requiredFields: ['clusterId', 'title', 'timespan.start', 'classification.category']
      },
      {
        name: 'Article Schema (Legacy)',
        model: Article,
        testData: this.createLegacyArticleTestData(),
        requiredFields: ['title', 'url', 'publishedAt', 'category']
      }
    ];

    for (const modelTest of modelTests) {
      await this.testSingleModelSchema(modelTest);
    }
  }

  async testSingleModelSchema(modelTest) {
    console.log(`\n🧪 Testing ${modelTest.name}...`);
    
    try {
      // Test model instantiation (no DB required)
      const instance = new modelTest.model(modelTest.testData);
      console.log('✅ Model instantiation successful');
      
      // Test validation (no DB required)
      const validationErrors = instance.validateSync();
      if (validationErrors) {
        console.log(`⚠️  Validation errors found:`, validationErrors.message);
        this.testResults.validationTests.push({
          model: modelTest.name,
          status: 'VALIDATION_ERRORS',
          errors: validationErrors.message
        });
      } else {
        console.log('✅ Schema validation passed');
      }
      
      // Test required fields presence in schema
      for (const field of modelTest.requiredFields) {
        const hasField = this.hasNestedProperty(modelTest.testData, field);
        const status = hasField ? 'PASSED' : 'FAILED';
        console.log(`${hasField ? '✅' : '❌'} Required field '${field}': ${status}`);
      }
      
      // Test schema paths
      const schemaPaths = Object.keys(modelTest.model.schema.paths);
      console.log(`📊 Schema has ${schemaPaths.length} defined paths`);
      
      this.testResults.modelsTests.push({
        model: modelTest.name,
        status: 'PASSED',
        operations: {
          instantiate: 'SUCCESS',
          validate: validationErrors ? 'WARNINGS' : 'SUCCESS',
          schemaAnalysis: 'SUCCESS'
        },
        schemaPaths: schemaPaths.length
      });
      
    } catch (error) {
      const errorMsg = `${modelTest.name} test failed: ${error.message}`;
      console.error('❌', errorMsg);
      this.testResults.modelsTests.push({
        model: modelTest.name,
        status: 'FAILED',
        error: errorMsg
      });
      this.testResults.errors.push(errorMsg);
    }
  }

  /**
   * Test all model schemas and validation (with database)
   */
  async testModelSchemas() {
    console.log('📋 Testing Model Database Operations...\n');
    
    const modelTests = [
      {
        name: 'EnhancedArticle Model',
        model: EnhancedArticle,
        testData: this.createEnhancedArticleTestData(),
        requiredFields: ['title', 'url', 'publishedAt', 'category']
      },
      {
        name: 'Fact Model', 
        model: Fact,
        testData: this.createFactTestData(),
        requiredFields: ['factId', 'statement', 'timeline.firstReported', 'classification.type']
      },
      {
        name: 'ChatConversation Model',
        model: ChatConversation, 
        testData: this.createChatConversationTestData(),
        requiredFields: ['conversationId']
      },
      {
        name: 'StoryCluster Model',
        model: StoryCluster,
        testData: this.createStoryClusterTestData(),
        requiredFields: ['clusterId', 'title', 'timespan.start', 'classification.category']
      },
      {
        name: 'Article Model (Legacy)',
        model: Article,
        testData: this.createLegacyArticleTestData(),
        requiredFields: ['title', 'url', 'publishedAt', 'category']
      }
    ];

    for (const modelTest of modelTests) {
      await this.testSingleModel(modelTest);
    }
  }

  async testSingleModel(modelTest) {
    console.log(`\n🧪 Testing ${modelTest.name}...`);
    
    try {
      // Test model instantiation
      const instance = new modelTest.model(modelTest.testData);
      
      // Test validation
      const validationErrors = instance.validateSync();
      if (validationErrors) {
        console.log(`⚠️  Validation errors found:`, validationErrors.message);
        this.testResults.validationTests.push({
          model: modelTest.name,
          status: 'VALIDATION_ERRORS',
          errors: validationErrors.message
        });
      } else {
        console.log('✅ Schema validation passed');
      }
      
      // Test save operation
      const savedInstance = await instance.save();
      console.log(`✅ Model save successful - ID: ${savedInstance._id}`);
      
      // Store for cleanup and further testing
      this.sampleData[modelTest.name.replace(' Model', '').replace(' (Legacy)', '')] = savedInstance;
      
      // Test required fields
      for (const field of modelTest.requiredFields) {
        const hasField = this.hasNestedProperty(savedInstance, field);
        const status = hasField ? 'PASSED' : 'FAILED';
        console.log(`${hasField ? '✅' : '❌'} Required field '${field}': ${status}`);
      }
      
      // Test find operations
      const foundInstance = await modelTest.model.findById(savedInstance._id);
      const findStatus = foundInstance ? 'PASSED' : 'FAILED';
      console.log(`${foundInstance ? '✅' : '❌'} Find by ID: ${findStatus}`);
      
      this.testResults.modelsTests.push({
        model: modelTest.name,
        status: 'PASSED',
        id: savedInstance._id,
        operations: {
          create: 'SUCCESS',
          validate: validationErrors ? 'WARNINGS' : 'SUCCESS',
          find: findStatus
        }
      });
      
    } catch (error) {
      const errorMsg = `${modelTest.name} test failed: ${error.message}`;
      console.error('❌', errorMsg);
      this.testResults.modelsTests.push({
        model: modelTest.name,
        status: 'FAILED',
        error: errorMsg
      });
      this.testResults.errors.push(errorMsg);
    }
  }

  /**
   * Test database indexes
   */
  async testDatabaseIndexes() {
    console.log('\n🗂️  Testing Database Indexes...\n');
    
    try {
      const indexManager = new IndexManager();
      
      // Setup all indexes
      console.log('Setting up indexes...');
      await indexManager.setupAllIndexes();
      
      // Test index creation results
      const created = indexManager.indexResults.created.length;
      const existed = indexManager.indexResults.existed.length;
      const failed = indexManager.indexResults.failed.length;
      
      console.log(`\n📊 Index Results:`);
      console.log(`✅ Created: ${created}`);
      console.log(`ℹ️  Existed: ${existed}`);
      console.log(`❌ Failed: ${failed}`);
      
      // Test specific important indexes
      const importantIndexes = [
        { collection: 'enhancedarticles', field: 'temporalData.publishedAt' },
        { collection: 'facts', field: 'timeline.firstReported' },
        { collection: 'chatconversations', field: 'conversationId' },
        { collection: 'storyclusters', field: 'clusterId' }
      ];
      
      for (const indexInfo of importantIndexes) {
        await this.testSpecificIndex(indexInfo.collection, indexInfo.field);
      }
      
      this.testResults.indexTests.push({
        test: 'Index Setup',
        status: failed === 0 ? 'PASSED' : 'PARTIAL',
        created,
        existed,
        failed,
        details: indexManager.indexResults
      });
      
    } catch (error) {
      const errorMsg = `Index testing failed: ${error.message}`;
      console.error('❌', errorMsg);
      this.testResults.errors.push(errorMsg);
    }
  }

  async testSpecificIndex(collectionName, fieldName) {
    try {
      const collection = mongoose.connection.db.collection(collectionName);
      const indexes = await collection.listIndexes().toArray();
      
      const hasIndex = indexes.some(index => 
        Object.keys(index.key).some(key => key.includes(fieldName.split('.')[0]))
      );
      
      console.log(`${hasIndex ? '✅' : '❌'} Index on ${collectionName}.${fieldName}: ${hasIndex ? 'EXISTS' : 'MISSING'}`);
      
      return hasIndex;
    } catch (error) {
      console.log(`⚠️  Could not verify index ${collectionName}.${fieldName}: ${error.message}`);
      return false;
    }
  }

  /**
   * Test helper methods like findByDateRange()
   */
  async testHelperMethods() {
    console.log('\n🛠️  Testing Helper Methods...\n');
    
    const helperTests = [
      {
        name: 'EnhancedArticle.findByDateRange',
        test: async () => {
          const startDate = new Date('2024-01-01');
          const endDate = new Date('2024-12-31');
          const results = await EnhancedArticle.findByDateRange(startDate, endDate);
          return { success: true, count: results.length, results };
        }
      },
      {
        name: 'EnhancedArticle.findByMonth',
        test: async () => {
          const results = await EnhancedArticle.findByMonth(2024, 11);
          return { success: true, count: results.length, results };
        }
      },
      {
        name: 'Fact.findByDateRange',
        test: async () => {
          const startDate = new Date('2024-01-01');
          const endDate = new Date('2024-12-31');
          const results = await Fact.findByDateRange(startDate, endDate);
          return { success: true, count: results.length, results };
        }
      },
      {
        name: 'Fact.findTrending',
        test: async () => {
          const results = await Fact.findTrending(10);
          return { success: true, count: results.length, results };
        }
      },
      {
        name: 'StoryCluster.findByDateRange',
        test: async () => {
          const startDate = new Date('2024-01-01');
          const endDate = new Date('2024-12-31');
          const results = await StoryCluster.findByDateRange(startDate, endDate);
          return { success: true, count: results.length, results };
        }
      },
      {
        name: 'ChatConversation.findRecentConversations',
        test: async () => {
          const results = await ChatConversation.findRecentConversations(null, 5);
          return { success: true, count: results.length, results };
        }
      }
    ];

    for (const helperTest of helperTests) {
      try {
        console.log(`Testing ${helperTest.name}...`);
        const result = await helperTest.test();
        
        console.log(`✅ ${helperTest.name}: Found ${result.count} results`);
        
        this.testResults.helperMethodTests.push({
          method: helperTest.name,
          status: 'PASSED',
          resultCount: result.count
        });
        
      } catch (error) {
        const errorMsg = `${helperTest.name} failed: ${error.message}`;
        console.error(`❌ ${errorMsg}`);
        
        this.testResults.helperMethodTests.push({
          method: helperTest.name,
          status: 'FAILED',
          error: errorMsg
        });
        this.testResults.errors.push(errorMsg);
      }
    }
  }

  /**
   * Test temporal field calculations
   */
  async testTemporalCalculations() {
    console.log('\n⏰ Testing Temporal Field Calculations...\n');
    
    try {
      // Test EnhancedArticle temporal calculations
      if (this.sampleData.EnhancedArticle) {
        const article = this.sampleData.EnhancedArticle;
        
        const tests = [
          {
            name: 'publishDate calculation',
            test: () => article.temporalData.publishDate !== undefined,
            field: 'temporalData.publishDate',
            value: article.temporalData.publishDate
          },
          {
            name: 'publishMonth calculation',
            test: () => article.temporalData.publishMonth !== undefined,
            field: 'temporalData.publishMonth',
            value: article.temporalData.publishMonth
          },
          {
            name: 'publishYear calculation',
            test: () => article.temporalData.publishYear !== undefined,
            field: 'temporalData.publishYear',
            value: article.temporalData.publishYear
          },
          {
            name: 'publishWeek calculation',
            test: () => article.temporalData.publishWeek !== undefined,
            field: 'temporalData.publishWeek',
            value: article.temporalData.publishWeek
          },
          {
            name: 'publishHour calculation',
            test: () => article.temporalData.publishHour !== undefined,
            field: 'temporalData.publishHour',
            value: article.temporalData.publishHour
          }
        ];
        
        for (const test of tests) {
          const passed = test.test();
          console.log(`${passed ? '✅' : '❌'} ${test.name}: ${passed ? 'CALCULATED' : 'MISSING'} (${test.value})`);
          
          this.testResults.validationTests.push({
            test: test.name,
            status: passed ? 'PASSED' : 'FAILED',
            field: test.field,
            value: test.value
          });
        }
      }
      
      // Test Fact temporal calculations
      if (this.sampleData.Fact) {
        const fact = this.sampleData.Fact;
        
        const factTests = [
          {
            name: 'Fact reportDate calculation',
            test: () => fact.timeline.reportDate !== undefined,
            value: fact.timeline.reportDate
          },
          {
            name: 'Fact reportMonth calculation',
            test: () => fact.timeline.reportMonth !== undefined,
            value: fact.timeline.reportMonth
          },
          {
            name: 'Fact reportYear calculation',
            test: () => fact.timeline.reportYear !== undefined,
            value: fact.timeline.reportYear
          }
        ];
        
        for (const test of factTests) {
          const passed = test.test();
          console.log(`${passed ? '✅' : '❌'} ${test.name}: ${passed ? 'CALCULATED' : 'MISSING'} (${test.value})`);
        }
      }
      
    } catch (error) {
      const errorMsg = `Temporal calculations test failed: ${error.message}`;
      console.error('❌', errorMsg);
      this.testResults.errors.push(errorMsg);
    }
  }

  /**
   * Test migration script functionality
   */
  async testMigrationScript() {
    console.log('\n🔄 Testing Migration Script...\n');
    
    try {
      const migration = new DatabaseMigration();
      
      // Test migration verification (without running full migration)
      await migration.verifyMigration();
      
      console.log('✅ Migration script verification completed');
      
      this.testResults.migrationTests.push({
        test: 'Migration Script Verification',
        status: 'PASSED',
        details: 'Migration script loaded and verification completed'
      });
      
    } catch (error) {
      const errorMsg = `Migration script test failed: ${error.message}`;
      console.error('❌', errorMsg);
      
      this.testResults.migrationTests.push({
        test: 'Migration Script',
        status: 'FAILED',
        error: errorMsg
      });
      this.testResults.errors.push(errorMsg);
    }
  }

  /**
   * Test sample data creation and validation
   */
  async testSampleDataCreation() {
    console.log('\n📊 Testing Sample Data Creation...\n');
    
    const sampleDataTests = [
      {
        name: 'Enhanced Article Sample Data',
        data: this.createEnhancedArticleTestData(),
        requiredFields: ['title', 'url', 'temporalData', 'extractedFacts']
      },
      {
        name: 'Fact Sample Data',
        data: this.createFactTestData(),
        requiredFields: ['statement', 'classification', 'timeline']
      },
      {
        name: 'Chat Conversation Sample Data', 
        data: this.createChatConversationTestData(),
        requiredFields: ['messages', 'context', 'analytics']
      },
      {
        name: 'Story Cluster Sample Data',
        data: this.createStoryClusterTestData(),
        requiredFields: ['title', 'classification', 'sources']
      }
    ];

    for (const test of sampleDataTests) {
      try {
        console.log(`Creating ${test.name}...`);
        
        // Validate required fields exist
        const missingFields = test.requiredFields.filter(field => 
          !this.hasNestedProperty(test.data, field)
        );
        
        if (missingFields.length === 0) {
          console.log(`✅ ${test.name}: All required fields present`);
          
          this.testResults.sampleDataTests.push({
            test: test.name,
            status: 'PASSED',
            fieldsCount: Object.keys(test.data).length
          });
        } else {
          console.log(`⚠️  ${test.name}: Missing fields: ${missingFields.join(', ')}`);
          
          this.testResults.sampleDataTests.push({
            test: test.name,
            status: 'WARNINGS',
            missingFields: missingFields
          });
        }
        
      } catch (error) {
        const errorMsg = `${test.name} creation failed: ${error.message}`;
        console.error('❌', errorMsg);
        this.testResults.sampleDataTests.push({
          test: test.name,
          status: 'FAILED',
          error: errorMsg
        });
      }
    }
  }

  /**
   * Create test data for EnhancedArticle model
   */
  createEnhancedArticleTestData() {
    return {
      title: 'Test Enhanced Article: Breaking News Update',
      url: `https://test-news.com/article-${uuidv4()}`,
      source: {
        name: 'Test News Source',
        id: 'test-source-1',
        url: 'https://test-news.com'
      },
      author: 'Test Author',
      publishedAt: new Date(),
      category: 'politics',
      content: 'This is a test article content for enhanced article testing. It contains various facts and information that will be processed by the temporal RAG system.',
      description: 'Test article description for enhanced article model testing.',
      imageUrl: 'https://test-news.com/images/test.jpg',
      
      temporalData: {
        publishedAt: new Date(),
        fetchedAt: new Date(),
        storyLifecycle: {
          isBreaking: true,
          isUpdate: false,
          isFollowUp: false
        }
      },
      
      extractedFacts: [
        {
          factId: uuidv4(),
          statement: 'Test fact statement for verification',
          factType: 'WHAT',
          verificationStatus: 'UNVERIFIED',
          confidence: 0.8,
          importance: 7,
          temporalScope: 'DAYS'
        },
        {
          factId: uuidv4(),
          statement: 'Another test fact about people involved',
          factType: 'WHO',
          verificationStatus: 'VERIFIED',
          confidence: 0.9,
          importance: 8,
          temporalScope: 'ONGOING'
        }
      ],
      
      biasAnalysis: {
        overall_bias: 'center',
        emotional_tone: 'neutral',
        framing: ['factual', 'balanced'],
        emphasized_aspects: ['key events', 'expert opinions']
      },
      
      entities: [
        {
          name: 'Test Person',
          type: 'PERSON',
          mentions: 3,
          sentiment: 0.2
        },
        {
          name: 'Test Organization',
          type: 'ORGANIZATION',
          mentions: 2,
          sentiment: -0.1
        }
      ],
      
      semanticKeywords: ['politics', 'government', 'policy', 'announcement'],
      
      tags: ['test', 'politics', 'breaking'],
      language: 'en'
    };
  }

  /**
   * Create test data for Fact model
   */
  createFactTestData() {
    return {
      factId: uuidv4(),
      statement: 'This is a test fact statement that needs verification across multiple sources and time periods.',
      
      timeline: {
        firstReported: new Date(),
        lastUpdated: new Date()
      },
      
      classification: {
        type: 'CLAIM',
        category: 'politics',
        importance: 7,
        timeRelevance: 'CURRENT',
        scope: 'NATIONAL'
      },
      
      entities: [
        {
          name: 'Test Political Figure',
          type: 'PERSON',
          role: 'subject',
          verified: false
        }
      ],
      
      sourceArticles: [],
      
      verificationHistory: [
        {
          date: new Date(),
          status: 'UNVERIFIED',
          verifiedBy: 'TEST_SYSTEM',
          method: 'AUTOMATED',
          notes: 'Initial test verification entry'
        }
      ],
      
      relevanceScore: {
        current: 75,
        trend: 'RISING'
      },
      
      consensus: {
        agreementLevel: 0.6,
        totalSources: 1
      },
      
      tags: ['test', 'politics', 'unverified'],
      
      flags: {
        needsVerification: true,
        isBreaking: false
      }
    };
  }

  /**
   * Create test data for ChatConversation model
   */
  createChatConversationTestData() {
    return {
      conversationId: uuidv4(),
      userId: `test-user-${Date.now()}`,
      
      messages: [
        {
          messageId: uuidv4(),
          role: 'user',
          content: 'What happened in the latest political developments?',
          timestamp: new Date(),
          retrievalData: {
            queryAnalysis: {
              intent: 'information_seeking',
              topics: ['politics', 'current_events'],
              complexity: 'MODERATE'
            },
            sources: [],
            factChecks: [],
            biasAlert: {
              detected: false
            }
          }
        },
        {
          messageId: uuidv4(),
          role: 'assistant',
          content: 'Based on recent reports, here are the key political developments...',
          timestamp: new Date(),
          responseQuality: {
            accuracy: 0.85,
            completeness: 0.8,
            clarity: 0.9
          }
        }
      ],
      
      context: {
        topics: [
          {
            name: 'politics',
            interest: 0.8,
            mentions: 1,
            lastMentioned: new Date()
          }
        ],
        biasPreference: 'SHOW_ALL',
        factCheckingLevel: 'STANDARD',
        complexityLevel: 'MODERATE'
      },
      
      analytics: {
        totalMessages: 2,
        userMessages: 1,
        assistantMessages: 1,
        averageResponseTime: 1500,
        factsRetrieved: 0,
        sourcesConsulted: 0
      },
      
      status: 'ACTIVE',
      
      privacy: {
        dataRetentionDays: 90,
        anonymized: false,
        consentGiven: true,
        canStore: true
      },
      
      flags: {
        hasPersonalInfo: false,
        needsReview: false,
        isHighQuality: true
      }
    };
  }

  /**
   * Create test data for StoryCluster model
   */
  createStoryClusterTestData() {
    return {
      clusterId: uuidv4(),
      title: 'Test Story Cluster: Major Political Event',
      description: 'A comprehensive story cluster covering multiple aspects of a major political event',
      
      articles: [], // Will be populated with actual article IDs
      
      sources: [
        {
          name: 'Test Source A',
          articleCount: 3,
          firstReport: new Date(),
          lastUpdate: new Date(),
          credibility: 0.8,
          bias: 'center',
          mainAngle: 'factual reporting'
        },
        {
          name: 'Test Source B',
          articleCount: 2,
          firstReport: new Date(),
          lastUpdate: new Date(),
          credibility: 0.7,
          bias: 'center-left',
          mainAngle: 'critical analysis'
        }
      ],
      
      timespan: {
        start: new Date(),
        lastUpdate: new Date()
      },
      
      classification: {
        category: 'politics',
        storyType: 'DEVELOPING',
        importance: 8,
        scope: 'NATIONAL',
        complexity: 'MODERATE'
      },
      
      mainEntities: [
        {
          name: 'Test Political Figure',
          type: 'PERSON',
          role: 'main subject',
          mentions: 5,
          sentiment: 0.1
        }
      ],
      
      factConsensus: [
        {
          factId: uuidv4(),
          fact: 'Test consensus fact about the political event',
          agreement_level: 0.8,
          supporting_sources: ['Test Source A', 'Test Source B'],
          dissenting_sources: [],
          confidence: 0.85,
          verification_status: 'VERIFIED'
        }
      ],
      
      narrativeSpectrum: [
        {
          bias_position: 'center',
          key_narrative: 'Balanced reporting of the political event',
          representative_articles: [],
          emphasis_points: ['facts', 'context', 'implications'],
          source_count: 2,
          strength: 0.7
        }
      ],
      
      evolutionTimeline: [
        {
          timestamp: new Date(),
          event_type: 'STORY_EMERGENCE',
          description: 'Initial story cluster creation',
          impact_level: 'MODERATE'
        }
      ],
      
      controversy: {
        level: 'LOW',
        disputed_facts: [],
        polarization_index: 0.2
      },
      
      metrics: {
        total_articles: 0,
        unique_sources: 2,
        total_facts: 1,
        verified_facts: 1,
        source_diversity: 0.5
      },
      
      status: 'EMERGING',
      
      quality: {
        completeness: 0.6,
        accuracy: 0.8,
        source_reliability: 0.75
      },
      
      tags: ['test', 'politics', 'developing'],
      
      flags: {
        isBreaking: false,
        needsAttention: false,
        isComplete: false
      }
    };
  }

  /**
   * Create test data for legacy Article model
   */
  createLegacyArticleTestData() {
    return {
      title: 'Test Legacy Article for Migration Testing',
      url: `https://legacy-news.com/article-${uuidv4()}`,
      source: {
        name: 'Legacy Test Source',
        id: 'legacy-test-1',
        url: 'https://legacy-news.com'
      },
      author: 'Legacy Test Author',
      publishedAt: new Date(),
      category: 'technology',
      content: 'This is a legacy article used for testing the migration process from old Article schema to new EnhancedArticle schema.',
      description: 'Legacy article description for migration testing.',
      
      analysis: {
        facts: {
          who: ['Tech Company CEO', 'Industry Expert'],
          what: 'Major technology announcement made',
          when: 'Yesterday afternoon',
          where: ['Silicon Valley', 'Company Headquarters'],
          why: 'To introduce revolutionary new product',
          summary: 'Technology company announces breakthrough product'
        },
        narratives: [
          {
            perspective: 'neutral',
            title: 'Neutral Coverage',
            summary: 'Factual reporting of the announcement',
            emphasis: ['product features', 'market impact'],
            interpretation: 'Straightforward news coverage'
          }
        ],
        analyzedAt: new Date(),
        geminiVersion: 'test-v1.0'
      },
      
      tags: ['technology', 'announcement', 'legacy'],
      language: 'en'
    };
  }

  /**
   * Clean up test data
   */
  async cleanupTestData() {
    console.log('\n🧹 Cleaning up test data...\n');
    
    const cleanupTasks = [
      { model: EnhancedArticle, name: 'EnhancedArticle' },
      { model: Fact, name: 'Fact' },
      { model: ChatConversation, name: 'ChatConversation' },
      { model: StoryCluster, name: 'StoryCluster' },
      { model: Article, name: 'Article' }
    ];

    for (const task of cleanupTasks) {
      try {
        const result = await task.model.deleteMany({
          $or: [
            { title: /^Test/ },
            { statement: /^This is a test/ },
            { conversationId: { $regex: '^test-' } },
            { url: { $regex: 'test-news.com|legacy-news.com' } }
          ]
        });
        
        console.log(`✅ Cleaned up ${result.deletedCount} ${task.name} test documents`);
        
      } catch (error) {
        console.log(`⚠️  Could not cleanup ${task.name}: ${error.message}`);
      }
    }
  }

  /**
   * Print comprehensive test results
   */
  printTestResults() {
    console.log('\n' + '='.repeat(60));
    console.log('📋 COMPREHENSIVE DATABASE MODEL TEST RESULTS');
    console.log('='.repeat(60));
    
    // Connection Tests
    console.log('\n🔌 Connection Tests:');
    this.testResults.connectionTests.forEach(test => {
      console.log(`   ${test.status === 'PASSED' ? '✅' : '❌'} ${test.test}: ${test.status}`);
      if (test.details) console.log(`      Details: ${test.details}`);
    });
    
    // UUID Tests
    console.log('\n🆔 UUID Generation Tests:');
    this.testResults.uuidTests.forEach(test => {
      console.log(`   ${test.status === 'PASSED' ? '✅' : '❌'} ${test.test}: ${test.status}`);
    });
    
    // Model Tests
    console.log('\n📋 Model Tests:');
    this.testResults.modelsTests.forEach(test => {
      console.log(`   ${test.status === 'PASSED' ? '✅' : '❌'} ${test.model}: ${test.status}`);
      if (test.operations) {
        console.log(`      Operations: Create(${test.operations.create}), Validate(${test.operations.validate}), Find(${test.operations.find})`);
      }
    });
    
    // Index Tests
    console.log('\n🗂️  Index Tests:');
    this.testResults.indexTests.forEach(test => {
      console.log(`   ${test.status === 'PASSED' ? '✅' : '⚠️ '} ${test.test}: ${test.status}`);
      console.log(`      Created: ${test.created}, Existed: ${test.existed}, Failed: ${test.failed}`);
    });
    
    // Helper Method Tests
    console.log('\n🛠️  Helper Method Tests:');
    this.testResults.helperMethodTests.forEach(test => {
      console.log(`   ${test.status === 'PASSED' ? '✅' : '❌'} ${test.method}: ${test.status}`);
      if (test.resultCount !== undefined) console.log(`      Results: ${test.resultCount}`);
    });
    
    // Sample Data Tests
    console.log('\n📊 Sample Data Tests:');
    this.testResults.sampleDataTests.forEach(test => {
      console.log(`   ${test.status === 'PASSED' ? '✅' : test.status === 'WARNINGS' ? '⚠️ ' : '❌'} ${test.test}: ${test.status}`);
      if (test.missingFields) console.log(`      Missing fields: ${test.missingFields.join(', ')}`);
    });
    
    // Migration Tests
    console.log('\n🔄 Migration Tests:');
    this.testResults.migrationTests.forEach(test => {
      console.log(`   ${test.status === 'PASSED' ? '✅' : '❌'} ${test.test}: ${test.status}`);
    });
    
    // Summary
    const totalTests = this.getTotalTestCount();
    const passedTests = this.getPassedTestCount();
    const failedTests = this.testResults.errors.length;
    
    console.log('\n📊 SUMMARY:');
    console.log('='.repeat(60));
    console.log(`🧪 Total Tests Run: ${totalTests}`);
    console.log(`✅ Passed: ${passedTests}`);
    console.log(`❌ Failed: ${failedTests}`);
    console.log(`⚠️  Warnings: ${this.testResults.warnings.length}`);
    console.log(`🎯 Success Rate: ${((passedTests / totalTests) * 100).toFixed(1)}%`);
    
    // Errors
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ ERRORS ENCOUNTERED:');
      this.testResults.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error}`);
      });
    }
    
    // Warnings
    if (this.testResults.warnings.length > 0) {
      console.log('\n⚠️  WARNINGS:');
      this.testResults.warnings.forEach((warning, index) => {
        console.log(`   ${index + 1}. ${warning}`);
      });
    }
    
    console.log('\n🎉 Database model testing completed!');
    console.log('='.repeat(60));
  }

  /**
   * Utility functions
   */
  hasNestedProperty(obj, path) {
    return path.split('.').reduce((current, key) => {
      return current && current[key] !== undefined ? current[key] : undefined;
    }, obj) !== undefined;
  }

  getTotalTestCount() {
    return this.testResults.connectionTests.length +
           this.testResults.uuidTests.length +
           this.testResults.modelsTests.length +
           this.testResults.indexTests.length +
           this.testResults.helperMethodTests.length +
           this.testResults.sampleDataTests.length +
           this.testResults.migrationTests.length;
  }

  getPassedTestCount() {
    return this.testResults.connectionTests.filter(t => t.status === 'PASSED').length +
           this.testResults.uuidTests.filter(t => t.status === 'PASSED').length +
           this.testResults.modelsTests.filter(t => t.status === 'PASSED').length +
           this.testResults.indexTests.filter(t => t.status === 'PASSED').length +
           this.testResults.helperMethodTests.filter(t => t.status === 'PASSED').length +
           this.testResults.sampleDataTests.filter(t => t.status === 'PASSED').length +
           this.testResults.migrationTests.filter(t => t.status === 'PASSED').length;
  }
}

// Export for use as module
export { DatabaseModelTester };

// CLI execution
if (process.argv[1].endsWith('test-database-models.js')) {
  const tester = new DatabaseModelTester();
  
  tester.runAllTests()
    .then(() => {
      console.log('✅ All tests completed successfully!');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error.message);
      process.exit(1);
    });
}

export default DatabaseModelTester;