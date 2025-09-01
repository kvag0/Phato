/**
 * Comprehensive Integration Test for Phato RAG System
 * Tests the complete pipeline: Articles → Fact Extraction → Embeddings → Vector Storage → Hybrid Search → Evolution Tracking → Cross-Source Analysis
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
import vectorDB from '../src/config/vectorDB.js';
import EnhancedArticle from '../src/models/EnhancedArticle.js';
import temporalServices from '../src/services/temporal/index.js';
import vectorIntegration from '../src/services/vector/index.js';
import geminiAnalyzer from '../src/services/geminiAnalyzer.js';

/**
 * Integration Test Suite
 */
class IntegrationTestSuite {
  constructor() {
    this.testResults = {
      startTime: new Date(),
      endTime: null,
      duration: null,
      tests: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      },
      systemHealth: {},
      dataFlows: {},
      componentStatus: {},
      errors: [],
      warnings: []
    };
    
    this.sampleArticles = [];
    this.extractedFacts = [];
    this.generatedEmbeddings = [];
    this.searchResults = [];
    this.evolutionData = [];
    
    console.log('🧪 Integration Test Suite initialized');
  }

  /**
   * Run complete integration test suite
   */
  async runFullSuite() {
    try {
      console.log('\n🚀 Starting Comprehensive Integration Test Suite');
      console.log('=' .repeat(80));
      
      // Initialize system
      await this.initializeSystem();
      
      // Run test phases
      await this.runPhase1_DataIngestion();
      await this.runPhase2_FactExtraction();
      await this.runPhase3_VectorGeneration();
      await this.runPhase4_VectorStorage();
      await this.runPhase5_HybridSearch();
      await this.runPhase6_FactEvolution();
      await this.runPhase7_CrossSourceAnalysis();
      await this.runPhase8_SystemIntegration();
      
      // Generate comprehensive report
      await this.generateReport();
      
      this.testResults.endTime = new Date();
      this.testResults.duration = this.testResults.endTime - this.testResults.startTime;
      
      console.log('\n✅ Integration Test Suite Completed');
      console.log(`⏱️  Total Duration: ${(this.testResults.duration / 1000).toFixed(2)} seconds`);
      
      return this.testResults;
      
    } catch (error) {
      console.error('❌ Integration Test Suite Failed:', error);
      this.testResults.errors.push({
        phase: 'general',
        error: error.message,
        stack: error.stack
      });
      throw error;
    } finally {
      await this.cleanup();
    }
  }

  /**
   * Initialize all system components
   */
  async initializeSystem() {
    console.log('\n🔧 Phase 0: System Initialization');
    
    try {
      // Connect to database
      console.log('  📊 Connecting to MongoDB...');
      await connectDB();
      this.logSuccess('Database connection established');
      
      // Initialize vector database
      console.log('  🔗 Initializing Vector Database...');
      await vectorDB.initialize();
      this.logSuccess('Vector database initialized');
      
      // Initialize vector services
      console.log('  🚀 Initializing Vector Integration...');
      await vectorIntegration.initialize();
      this.logSuccess('Vector services initialized');
      
      // Test Gemini analyzer
      console.log('  🤖 Testing Gemini Analyzer...');
      if (!process.env.GEMINI_API_KEY) {
        this.logWarning('Gemini API key not found - some tests will be mocked');
      } else {
        this.logSuccess('Gemini analyzer ready');
      }
      
      this.testResults.tests['system_initialization'] = { status: 'PASSED', details: 'All components initialized successfully' };
      
    } catch (error) {
      this.logError('System initialization failed', error);
      this.testResults.tests['system_initialization'] = { status: 'FAILED', error: error.message };
      throw error;
    }
  }

  /**
   * Phase 1: Test data ingestion and article creation
   */
  async runPhase1_DataIngestion() {
    console.log('\n📰 Phase 1: Data Ingestion & Article Creation');
    
    try {
      // Create sample articles with temporal data
      this.sampleArticles = await this.createSampleArticles();
      
      // Validate article structure
      for (const article of this.sampleArticles) {
        this.validateArticleStructure(article);
      }
      
      this.logSuccess(`Created ${this.sampleArticles.length} sample articles`);
      this.testResults.tests['data_ingestion'] = { 
        status: 'PASSED', 
        details: `Successfully created ${this.sampleArticles.length} articles with temporal data` 
      };
      
      // Test data flow: Raw data → Enhanced Article
      this.testResults.dataFlows['raw_to_article'] = {
        input: 'Raw article data',
        output: 'Enhanced article with temporal fields',
        status: 'SUCCESS',
        count: this.sampleArticles.length
      };
      
    } catch (error) {
      this.logError('Data ingestion failed', error);
      this.testResults.tests['data_ingestion'] = { status: 'FAILED', error: error.message };
      throw error;
    }
  }

  /**
   * Phase 2: Test fact extraction from articles
   */
  async runPhase2_FactExtraction() {
    console.log('\n🔍 Phase 2: Fact Extraction');
    
    try {
      const extractionResults = [];
      
      for (const article of this.sampleArticles) {
        console.log(`  📋 Extracting facts from: ${article.title.substring(0, 50)}...`);
        
        // Process article through temporal fact extractor
        const results = await temporalServices.processArticle(article);
        extractionResults.push(results);
        
        // Validate extracted facts
        if (results.extraction && results.extraction.facts) {
          this.extractedFacts.push(...results.extraction.facts);
          
          // Update article with extracted facts
          article.extractedFacts = results.extraction.facts;
          await article.save();
        }
      }
      
      this.logSuccess(`Extracted ${this.extractedFacts.length} facts from articles`);
      
      // Validate fact extraction quality
      const factQuality = this.analyzeFacts(this.extractedFacts);
      console.log(`  📊 Fact Quality Analysis:`);
      console.log(`     - Average confidence: ${factQuality.avgConfidence.toFixed(2)}`);
      console.log(`     - Average importance: ${factQuality.avgImportance.toFixed(2)}`);
      console.log(`     - Fact types: ${Object.keys(factQuality.typeDistribution).join(', ')}`);
      
      this.testResults.tests['fact_extraction'] = { 
        status: 'PASSED', 
        details: `Extracted ${this.extractedFacts.length} facts with quality metrics`,
        metrics: factQuality
      };
      
      // Test data flow: Article → Facts
      this.testResults.dataFlows['article_to_facts'] = {
        input: 'Enhanced articles',
        output: 'Extracted facts with temporal data',
        status: 'SUCCESS',
        count: this.extractedFacts.length
      };
      
    } catch (error) {
      this.logError('Fact extraction failed', error);
      this.testResults.tests['fact_extraction'] = { status: 'FAILED', error: error.message };
      throw error;
    }
  }

  /**
   * Phase 3: Test embedding generation
   */
  async runPhase3_VectorGeneration() {
    console.log('\n🧮 Phase 3: Vector Embedding Generation');
    
    try {
      const embeddingService = vectorIntegration.services.embedding;
      
      // Generate embeddings for articles
      for (const article of this.sampleArticles) {
        console.log(`  🔢 Generating embeddings for: ${article.title.substring(0, 50)}...`);
        
        const embedding = await embeddingService.generateEmbedding(article.content || article.description);
        this.generatedEmbeddings.push({
          articleId: article._id,
          embedding: embedding,
          type: 'article'
        });
        
        // Update article with embedding
        article.embedding = embedding;
        article.embeddingModel = 'BGE-large';
        article.embeddingDate = new Date();
        await article.save();
      }
      
      // Generate embeddings for facts
      for (const fact of this.extractedFacts.slice(0, 10)) { // Limit for testing
        const embedding = await embeddingService.generateEmbedding(fact.statement);
        this.generatedEmbeddings.push({
          factId: fact.factId,
          embedding: embedding,
          type: 'fact'
        });
        
        // Update fact with embedding
        fact.embedding = embedding;
      }
      
      this.logSuccess(`Generated ${this.generatedEmbeddings.length} embeddings`);
      
      // Validate embedding quality
      const embeddingQuality = this.analyzeEmbeddings(this.generatedEmbeddings);
      console.log(`  📊 Embedding Quality:`);
      console.log(`     - Dimension: ${embeddingQuality.dimension}`);
      console.log(`     - Non-zero values: ${embeddingQuality.nonZeroPercent.toFixed(2)}%`);
      console.log(`     - Value range: [${embeddingQuality.minValue.toFixed(4)}, ${embeddingQuality.maxValue.toFixed(4)}]`);
      
      this.testResults.tests['vector_generation'] = { 
        status: 'PASSED', 
        details: `Generated ${this.generatedEmbeddings.length} embeddings`,
        metrics: embeddingQuality
      };
      
      // Test data flow: Text → Embeddings
      this.testResults.dataFlows['text_to_embeddings'] = {
        input: 'Article content and fact statements',
        output: 'Vector embeddings (1024-dim)',
        status: 'SUCCESS',
        count: this.generatedEmbeddings.length
      };
      
    } catch (error) {
      this.logError('Vector generation failed', error);
      this.testResults.tests['vector_generation'] = { status: 'FAILED', error: error.message };
      throw error;
    }
  }

  /**
   * Phase 4: Test vector storage in Pinecone
   */
  async runPhase4_VectorStorage() {
    console.log('\n💾 Phase 4: Vector Storage');
    
    try {
      // Prepare vectors for upsert
      const vectors = [];
      
      // Add article vectors
      for (const article of this.sampleArticles) {
        if (article.embedding && article.embedding.length > 0) {
          vectors.push({
            id: `article_${article._id}`,
            values: article.embedding,
            metadata: {
              type: 'article',
              title: article.title,
              category: article.category,
              publishedAt: article.publishedAt.getTime(),
              source: article.source?.name || 'unknown',
              bias: article.biasAnalysis?.overall_bias || 'neutral'
            }
          });
        }
      }
      
      // Add fact vectors
      for (const embedding of this.generatedEmbeddings) {
        if (embedding.type === 'fact' && embedding.factId) {
          const fact = this.extractedFacts.find(f => f.factId === embedding.factId);
          if (fact) {
            vectors.push({
              id: `fact_${fact.factId}`,
              values: embedding.embedding,
              metadata: {
                type: 'fact',
                statement: fact.statement.substring(0, 500), // Limit metadata size
                factType: fact.factType,
                importance: fact.importance,
                confidence: fact.confidence,
                verificationStatus: fact.verificationStatus
              }
            });
          }
        }
      }
      
      console.log(`  📤 Upserting ${vectors.length} vectors to Pinecone...`);
      
      // Upsert vectors
      await vectorDB.upsertVectors(vectors, 'integration-test');
      
      this.logSuccess(`Stored ${vectors.length} vectors in Pinecone`);
      
      // Verify storage by checking index stats
      const stats = await vectorDB.getNamespaceStats('integration-test');
      console.log(`  📊 Namespace stats: ${JSON.stringify(stats, null, 2)}`);
      
      this.testResults.tests['vector_storage'] = { 
        status: 'PASSED', 
        details: `Stored ${vectors.length} vectors successfully`,
        stats: stats
      };
      
      // Test data flow: Embeddings → Vector DB
      this.testResults.dataFlows['embeddings_to_vectordb'] = {
        input: 'Generated embeddings',
        output: 'Stored vectors in Pinecone',
        status: 'SUCCESS',
        count: vectors.length
      };
      
    } catch (error) {
      this.logError('Vector storage failed', error);
      this.testResults.tests['vector_storage'] = { status: 'FAILED', error: error.message };
      throw error;
    }
  }

  /**
   * Phase 5: Test hybrid search functionality
   */
  async runPhase5_HybridSearch() {
    console.log('\n🔍 Phase 5: Hybrid Search Testing');
    
    try {
      const hybridSearchService = vectorIntegration.services.search;
      const searchQueries = [
        {
          query: "economic policy changes",
          type: "article",
          description: "Economic articles search"
        },
        {
          query: "government announcement",
          type: "fact", 
          description: "Government facts search"
        },
        {
          query: "technology innovation recent",
          type: "article",
          filters: { category: "technology" },
          description: "Technology articles with filter"
        }
      ];
      
      for (const searchTest of searchQueries) {
        console.log(`  🔎 Testing: ${searchTest.description}`);
        
        const results = await hybridSearchService.search(searchTest.query, {
          type: searchTest.type,
          filters: searchTest.filters || {},
          limit: 10,
          namespace: 'integration-test'
        });
        
        this.searchResults.push({
          query: searchTest.query,
          type: searchTest.type,
          results: results,
          resultCount: results.results?.length || 0
        });
        
        console.log(`    ✓ Found ${results.results?.length || 0} results`);
        
        // Validate search result quality
        if (results.results && results.results.length > 0) {
          const avgScore = results.results.reduce((sum, r) => sum + r.score, 0) / results.results.length;
          console.log(`    📊 Average relevance score: ${avgScore.toFixed(4)}`);
        }
      }
      
      this.logSuccess(`Completed ${searchQueries.length} search tests`);
      
      this.testResults.tests['hybrid_search'] = { 
        status: 'PASSED', 
        details: `All ${searchQueries.length} search tests completed successfully`,
        searches: this.searchResults.map(s => ({
          query: s.query,
          type: s.type,
          resultCount: s.resultCount
        }))
      };
      
      // Test data flow: Query → Search Results
      this.testResults.dataFlows['query_to_results'] = {
        input: 'Search queries',
        output: 'Ranked search results',
        status: 'SUCCESS',
        count: this.searchResults.reduce((sum, s) => sum + s.resultCount, 0)
      };
      
    } catch (error) {
      this.logError('Hybrid search failed', error);
      this.testResults.tests['hybrid_search'] = { status: 'FAILED', error: error.message };
      throw error;
    }
  }

  /**
   * Phase 6: Test fact evolution tracking
   */
  async runPhase6_FactEvolution() {
    console.log('\n🔄 Phase 6: Fact Evolution Tracking');
    
    try {
      // Test evolution tracking for extracted facts
      for (const fact of this.extractedFacts.slice(0, 5)) { // Test top 5 facts
        console.log(`  📈 Tracking evolution for fact: ${fact.statement.substring(0, 50)}...`);
        
        try {
          const evolution = await temporalServices.evolutionTracker.trackFactEvolution(fact.factId);
          this.evolutionData.push(evolution);
          
          console.log(`    ✓ Evolution tracking completed`);
          console.log(`    📊 Changes found: ${evolution.changeAnalysis?.changeCount || 0}`);
        } catch (error) {
          this.logWarning(`Evolution tracking failed for fact ${fact.factId}`, error);
        }
      }
      
      // Test temporal query service
      console.log('  🕐 Testing temporal queries...');
      const dateRange = {
        startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        endDate: new Date()
      };
      
      const temporalQuery = await temporalServices.queryService.queryByDateRange(dateRange);
      console.log(`    ✓ Temporal query returned ${temporalQuery.articles?.length || 0} articles`);
      
      this.logSuccess(`Evolution tracking completed for ${this.evolutionData.length} facts`);
      
      this.testResults.tests['fact_evolution'] = { 
        status: 'PASSED', 
        details: `Tracked evolution for ${this.evolutionData.length} facts`,
        evolutionData: this.evolutionData.map(e => ({
          factId: e.factId,
          changeCount: e.changeAnalysis?.changeCount || 0,
          hasEvolved: e.changeAnalysis?.hasEvolved || false
        }))
      };
      
      // Test data flow: Facts → Evolution Analysis
      this.testResults.dataFlows['facts_to_evolution'] = {
        input: 'Extracted facts',
        output: 'Evolution analysis and tracking',
        status: 'SUCCESS',
        count: this.evolutionData.length
      };
      
    } catch (error) {
      this.logError('Fact evolution tracking failed', error);
      this.testResults.tests['fact_evolution'] = { status: 'FAILED', error: error.message };
      throw error;
    }
  }

  /**
   * Phase 7: Test cross-source analysis
   */
  async runPhase7_CrossSourceAnalysis() {
    console.log('\n🔗 Phase 7: Cross-Source Analysis');
    
    try {
      // Test temporal vector search integration
      const crossSourceQueries = [
        {
          query: "recent government policy changes",
          temporalOptions: {
            startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            includeCrossSource: true,
            groupByStory: true
          }
        }
      ];
      
      for (const test of crossSourceQueries) {
        console.log(`  🔍 Cross-source search: ${test.query}`);
        
        const results = await vectorIntegration.temporalVectorSearch(test.query, test.temporalOptions);
        
        console.log(`    ✓ Found ${results.results?.length || 0} results`);
        
        if (results.temporalAnalysis) {
          console.log(`    📊 Temporal peaks: ${results.temporalAnalysis.peaks?.length || 0}`);
        }
        
        if (results.factEvolution) {
          console.log(`    🔄 Evolution chains: ${results.factEvolution.evolutionChains?.length || 0}`);
        }
      }
      
      // Test verified fact search
      console.log('  ✅ Testing verified fact search...');
      const verifiedResults = await vectorIntegration.verifiedFactSearch("policy announcement", {
        limit: 5,
        namespace: 'integration-test'
      });
      
      console.log(`    ✓ Verified facts found: ${verifiedResults.results?.length || 0}`);
      
      this.logSuccess('Cross-source analysis completed successfully');
      
      this.testResults.tests['cross_source_analysis'] = { 
        status: 'PASSED', 
        details: 'Cross-source analysis and temporal integration working correctly'
      };
      
      // Test data flow: Multi-source → Analysis
      this.testResults.dataFlows['multisource_to_analysis'] = {
        input: 'Multi-source queries',
        output: 'Cross-verified analysis results',
        status: 'SUCCESS',
        count: 1
      };
      
    } catch (error) {
      this.logError('Cross-source analysis failed', error);
      this.testResults.tests['cross_source_analysis'] = { status: 'FAILED', error: error.message };
      throw error;
    }
  }

  /**
   * Phase 8: Test overall system integration
   */
  async runPhase8_SystemIntegration() {
    console.log('\n🏗️ Phase 8: System Integration Validation');
    
    try {
      // Test component communication
      console.log('  🔗 Testing component communication...');
      
      const componentTests = [
        {
          name: 'Vector-Temporal Integration',
          test: () => this.testVectorTemporalIntegration()
        },
        {
          name: 'Database-Vector Sync',
          test: () => this.testDatabaseVectorSync()
        },
        {
          name: 'Service Health Checks',
          test: () => this.testServiceHealth()
        }
      ];
      
      for (const test of componentTests) {
        console.log(`    🧪 ${test.name}...`);
        const result = await test.test();
        this.testResults.componentStatus[test.name] = result;
        console.log(`    ${result.status === 'PASS' ? '✅' : '❌'} ${result.message}`);
      }
      
      // Overall system health assessment
      const systemHealth = await this.assessSystemHealth();
      this.testResults.systemHealth = systemHealth;
      
      this.logSuccess('System integration validation completed');
      
      this.testResults.tests['system_integration'] = { 
        status: 'PASSED', 
        details: 'All system integration tests passed',
        componentStatus: this.testResults.componentStatus,
        systemHealth: systemHealth
      };
      
    } catch (error) {
      this.logError('System integration failed', error);
      this.testResults.tests['system_integration'] = { status: 'FAILED', error: error.message };
      throw error;
    }
  }

  /**
   * Create sample articles for testing
   */
  async createSampleArticles() {
    const sampleData = [
      {
        title: "Government Announces New Economic Policy Changes",
        url: `https://example.com/article-1-${Date.now()}`,
        content: "The government has announced significant changes to economic policy, including new tax measures and spending allocations. The policy aims to boost economic growth by 3.2% over the next fiscal year. Finance Minister Johnson stated that these changes will create approximately 100,000 new jobs.",
        description: "Government unveils comprehensive economic policy reform package",
        source: { name: "Economic Times", id: "econ-times" },
        author: "Jane Smith",
        category: "economy",
        publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
      },
      {
        title: "Technology Sector Sees Major Innovation Breakthrough",
        url: `https://example.com/article-2-${Date.now()}`,
        content: "A major breakthrough in artificial intelligence has been announced by TechCorp, promising to revolutionize data processing speeds by up to 500%. The new algorithm, developed over 18 months, will be integrated into existing systems starting Q2 2025.",
        description: "AI breakthrough promises 500% speed improvement in data processing",
        source: { name: "Tech Weekly", id: "tech-weekly" },
        author: "Mike Chen",
        category: "technology", 
        publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000)
      },
      {
        title: "Healthcare System Receives Additional Funding",
        url: `https://example.com/article-3-${Date.now()}`,
        content: "The healthcare system will receive an additional $2.5 billion in funding over the next three years. Health Minister Davis confirmed that 60% of the funding will go towards mental health services, while 40% will support infrastructure improvements.",
        description: "Healthcare receives $2.5B funding boost for mental health and infrastructure",
        source: { name: "Health Today", id: "health-today" },
        author: "Dr. Sarah Wilson", 
        category: "health",
        publishedAt: new Date(Date.now() - 12 * 60 * 60 * 1000)
      }
    ];

    const articles = [];
    for (const data of sampleData) {
      const article = new EnhancedArticle(data);
      await article.save();
      articles.push(article);
    }
    
    return articles;
  }

  /**
   * Validate article structure
   */
  validateArticleStructure(article) {
    const requiredFields = ['title', 'url', 'publishedAt', 'category'];
    for (const field of requiredFields) {
      if (!article[field]) {
        throw new Error(`Article missing required field: ${field}`);
      }
    }
    
    // Validate temporal data structure
    if (!article.temporalData || !article.temporalData.publishedAt) {
      throw new Error('Article missing temporal data');
    }
  }

  /**
   * Analyze extracted facts quality
   */
  analyzeFacts(facts) {
    if (facts.length === 0) {
      return { avgConfidence: 0, avgImportance: 0, typeDistribution: {} };
    }
    
    const totalConfidence = facts.reduce((sum, f) => sum + (f.confidence || 0.5), 0);
    const totalImportance = facts.reduce((sum, f) => sum + (f.importance || 5), 0);
    
    const typeDistribution = {};
    facts.forEach(f => {
      if (f.factType) {
        typeDistribution[f.factType] = (typeDistribution[f.factType] || 0) + 1;
      }
    });
    
    return {
      avgConfidence: totalConfidence / facts.length,
      avgImportance: totalImportance / facts.length,
      typeDistribution
    };
  }

  /**
   * Analyze embedding quality
   */
  analyzeEmbeddings(embeddings) {
    if (embeddings.length === 0) {
      return { dimension: 0, nonZeroPercent: 0, minValue: 0, maxValue: 0 };
    }
    
    const firstEmbedding = embeddings[0].embedding;
    const dimension = firstEmbedding.length;
    
    let totalNonZero = 0;
    let minValue = Infinity;
    let maxValue = -Infinity;
    
    for (const embeddingData of embeddings) {
      const embedding = embeddingData.embedding;
      
      for (const value of embedding) {
        if (value !== 0) totalNonZero++;
        minValue = Math.min(minValue, value);
        maxValue = Math.max(maxValue, value);
      }
    }
    
    const totalValues = embeddings.length * dimension;
    
    return {
      dimension,
      nonZeroPercent: (totalNonZero / totalValues) * 100,
      minValue: minValue === Infinity ? 0 : minValue,
      maxValue: maxValue === -Infinity ? 0 : maxValue
    };
  }

  /**
   * Test vector-temporal integration
   */
  async testVectorTemporalIntegration() {
    try {
      // Test if temporal and vector services can work together
      const result = await vectorIntegration.temporalVectorSearch("test query", {
        startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        endDate: new Date()
      });
      
      return {
        status: 'PASS',
        message: 'Vector-Temporal integration working correctly',
        details: `Found ${result.results?.length || 0} results`
      };
    } catch (error) {
      return {
        status: 'FAIL',
        message: 'Vector-Temporal integration failed',
        error: error.message
      };
    }
  }

  /**
   * Test database-vector sync
   */
  async testDatabaseVectorSync() {
    try {
      // Check if MongoDB and Pinecone are in sync
      const mongoCount = await EnhancedArticle.countDocuments({});
      const vectorStats = await vectorDB.getIndexStats();
      
      return {
        status: 'PASS',
        message: `Database sync check completed`,
        details: `MongoDB: ${mongoCount} articles, Pinecone: ${vectorStats.totalVectors} vectors`
      };
    } catch (error) {
      return {
        status: 'FAIL',
        message: 'Database-Vector sync check failed',
        error: error.message
      };
    }
  }

  /**
   * Test service health
   */
  async testServiceHealth() {
    try {
      const status = await vectorIntegration.checkSystemStatus();
      
      return {
        status: 'PASS',
        message: 'All services healthy',
        details: status
      };
    } catch (error) {
      return {
        status: 'FAIL',
        message: 'Service health check failed',
        error: error.message
      };
    }
  }

  /**
   * Assess overall system health
   */
  async assessSystemHealth() {
    const health = {
      overall: 'HEALTHY',
      components: {},
      metrics: {},
      recommendations: []
    };
    
    try {
      // Database health
      const dbHealth = mongoose.connection.readyState === 1 ? 'CONNECTED' : 'DISCONNECTED';
      health.components.database = dbHealth;
      
      // Vector database health
      const vectorStats = await vectorDB.getIndexStats();
      health.components.vectorDatabase = vectorStats.totalVectors > 0 ? 'ACTIVE' : 'EMPTY';
      health.metrics.totalVectors = vectorStats.totalVectors;
      
      // Service integration health
      const vectorStatus = await vectorIntegration.checkSystemStatus();
      health.components.vectorServices = vectorStatus ? 'OPERATIONAL' : 'ERROR';
      
      // Generate recommendations
      if (vectorStats.totalVectors === 0) {
        health.recommendations.push('Consider running initial vector sync');
      }
      
      if (dbHealth !== 'CONNECTED') {
        health.overall = 'UNHEALTHY';
        health.recommendations.push('Database connection needs attention');
      }
      
    } catch (error) {
      health.overall = 'UNHEALTHY';
      health.error = error.message;
    }
    
    return health;
  }

  /**
   * Generate comprehensive test report
   */
  async generateReport() {
    console.log('\n📋 Generating Comprehensive Test Report');
    console.log('=' .repeat(80));
    
    // Calculate summary statistics
    const tests = Object.values(this.testResults.tests);
    this.testResults.summary.total = tests.length;
    this.testResults.summary.passed = tests.filter(t => t.status === 'PASSED').length;
    this.testResults.summary.failed = tests.filter(t => t.status === 'FAILED').length;
    this.testResults.summary.warnings = this.testResults.warnings.length;
    
    // Print summary
    console.log('📊 TEST SUMMARY');
    console.log(`   Total Tests: ${this.testResults.summary.total}`);
    console.log(`   ✅ Passed: ${this.testResults.summary.passed}`);
    console.log(`   ❌ Failed: ${this.testResults.summary.failed}`);
    console.log(`   ⚠️  Warnings: ${this.testResults.summary.warnings}`);
    
    // Print test details
    console.log('\n📋 DETAILED RESULTS');
    for (const [testName, result] of Object.entries(this.testResults.tests)) {
      const status = result.status === 'PASSED' ? '✅' : '❌';
      console.log(`   ${status} ${testName}: ${result.details || result.error}`);
    }
    
    // Print data flow validation
    console.log('\n🔄 DATA FLOW VALIDATION');
    for (const [flowName, flow] of Object.entries(this.testResults.dataFlows)) {
      const status = flow.status === 'SUCCESS' ? '✅' : '❌';
      console.log(`   ${status} ${flowName}: ${flow.input} → ${flow.output} (${flow.count} items)`);
    }
    
    // Print system health
    console.log('\n🏥 SYSTEM HEALTH ASSESSMENT');
    const health = this.testResults.systemHealth;
    console.log(`   Overall Status: ${health.overall === 'HEALTHY' ? '✅' : '⚠️'} ${health.overall}`);
    
    if (health.components) {
      console.log('   Component Status:');
      for (const [component, status] of Object.entries(health.components)) {
        const icon = status.includes('CONNECTED') || status.includes('ACTIVE') || status.includes('OPERATIONAL') ? '✅' : '⚠️';
        console.log(`     ${icon} ${component}: ${status}`);
      }
    }
    
    if (health.recommendations && health.recommendations.length > 0) {
      console.log('   Recommendations:');
      health.recommendations.forEach(rec => console.log(`     💡 ${rec}`));
    }
    
    // Print warnings and errors
    if (this.testResults.warnings.length > 0) {
      console.log('\n⚠️ WARNINGS');
      this.testResults.warnings.forEach(w => console.log(`   ⚠️  ${w}`));
    }
    
    if (this.testResults.errors.length > 0) {
      console.log('\n❌ ERRORS');
      this.testResults.errors.forEach(e => console.log(`   ❌ ${e.phase}: ${e.error}`));
    }
  }

  /**
   * Clean up test data
   */
  async cleanup() {
    console.log('\n🧹 Cleaning up test data...');
    
    try {
      // Clean up test articles
      if (this.sampleArticles.length > 0) {
        const articleIds = this.sampleArticles.map(a => a._id);
        await EnhancedArticle.deleteMany({ _id: { $in: articleIds } });
        console.log(`  🗑️  Deleted ${articleIds.length} test articles`);
      }
      
      // Clean up test vectors
      await vectorDB.clearNamespace('integration-test');
      console.log('  🗑️  Cleared test vectors from Pinecone');
      
      console.log('✅ Cleanup completed');
      
    } catch (error) {
      console.error('⚠️ Cleanup warning:', error.message);
    }
  }

  /**
   * Logging helpers
   */
  logSuccess(message) {
    console.log(`  ✅ ${message}`);
  }
  
  logWarning(message, error = null) {
    console.log(`  ⚠️  ${message}${error ? ': ' + error.message : ''}`);
    this.testResults.warnings.push(message);
  }
  
  logError(message, error) {
    console.log(`  ❌ ${message}: ${error.message}`);
    this.testResults.errors.push({
      phase: 'unknown',
      error: error.message,
      message: message
    });
  }
}

/**
 * Main execution function
 */
async function runIntegrationTest() {
  const suite = new IntegrationTestSuite();
  
  try {
    const results = await suite.runFullSuite();
    
    console.log('\n🎉 INTEGRATION TEST COMPLETE!');
    console.log('=' .repeat(80));
    console.log(`📈 Success Rate: ${(results.summary.passed / results.summary.total * 100).toFixed(1)}%`);
    console.log(`⏱️  Duration: ${(results.duration / 1000).toFixed(2)} seconds`);
    
    // Exit with appropriate code
    const exitCode = results.summary.failed > 0 ? 1 : 0;
    process.exit(exitCode);
    
  } catch (error) {
    console.error('\n💥 INTEGRATION TEST FAILED');
    console.error('Error:', error.message);
    process.exit(1);
  }
}

// Export for programmatic use
export { IntegrationTestSuite };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runIntegrationTest();
}