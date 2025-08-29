import embeddingService from './EmbeddingService.js';
import qdrantDB from '../../config/qdrantDB.js';
import EnhancedArticle from '../../models/EnhancedArticle.js';
import Fact from '../../models/Fact.js';
import StoryCluster from '../../models/StoryCluster.js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

/**
 * HybridSearchService
 * Combines semantic vector search with traditional keyword search
 * Provides comprehensive search capabilities for the RAG system
 */
class HybridSearchService {
  constructor() {
    // Service configuration
    this.config = {
      vectorWeight: 0.6,        // Weight for semantic search (0-1)
      keywordWeight: 0.4,       // Weight for keyword search (0-1)
      defaultTopK: 20,          // Default number of results
      maxResults: 100,          // Maximum results to return
      minScore: 0.3,            // Minimum relevance score
      reranking: true,          // Enable result reranking
      crossSourceBoost: 1.2,    // Boost for cross-source matches
      factBoost: 1.3,           // Boost for fact-based matches
      temporalDecay: 0.95,      // Daily decay factor for older content
      maxTemporalDays: 30      // Maximum days for temporal decay
    };
    
    // Gemini for query enhancement
    this.genAI = null;
    this.model = null;
    
    // Search metrics
    this.metrics = {
      totalSearches: 0,
      averageLatency: 0,
      cacheHits: 0,
      cacheMisses: 0,
      vectorSearches: 0,
      keywordSearches: 0,
      hybridSearches: 0
    };
    
    // Result cache
    this.searchCache = new Map();
    this.cacheTimeout = 300000; // 5 minutes
  }

  /**
   * Initialize the service
   */
  async initialize() {
    try {
      console.log('🚀 Initializing Hybrid Search Service...');
      
      // Initialize vector database (Qdrant)
      await qdrantDB.initialize();
      
      // Initialize embedding service
      await embeddingService.initialize();
      
      // Initialize Gemini for query enhancement
      if (process.env.GEMINI_API_KEY) {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
        console.log('   ✓ Gemini query enhancement ready');
      }
      
      console.log('✅ Hybrid Search Service initialized');
      
    } catch (error) {
      console.error('❌ Error initializing Hybrid Search Service:', error);
      throw error;
    }
  }

  /**
   * Main search function - combines vector and keyword search
   * @param {String} query - Search query
   * @param {Object} options - Search options
   * @returns {Object} Search results with metadata
   */
  async search(query, options = {}) {
    const startTime = Date.now();
    
    try {
      this.metrics.totalSearches++;
      
      // Check cache
      const cacheKey = this.createCacheKey(query, options);
      const cached = this.getCachedResult(cacheKey);
      if (cached) {
        this.metrics.cacheHits++;
        return cached;
      }
      
      this.metrics.cacheMisses++;
      
      // Parse search options
      const searchOptions = this.parseSearchOptions(options);
      
      // Enhance query if Gemini is available
      const enhancedQuery = await this.enhanceQuery(query, searchOptions);
      
      // Determine search strategy
      const strategy = this.determineSearchStrategy(enhancedQuery, searchOptions);
      
      let results;
      
      switch (strategy) {
        case 'vector':
          results = await this.vectorSearch(enhancedQuery, searchOptions);
          this.metrics.vectorSearches++;
          break;
          
        case 'keyword':
          results = await this.keywordSearch(enhancedQuery, searchOptions);
          this.metrics.keywordSearches++;
          break;
          
        case 'hybrid':
        default:
          results = await this.hybridSearch(enhancedQuery, searchOptions);
          this.metrics.hybridSearches++;
          break;
      }
      
      // Post-process results
      results = await this.postProcessResults(results, enhancedQuery, searchOptions);
      
      // Cache results
      this.cacheResult(cacheKey, results);
      
      // Update metrics
      const latency = Date.now() - startTime;
      this.updateMetrics(latency);
      
      return {
        query: query,
        enhancedQuery: enhancedQuery,
        strategy: strategy,
        results: results,
        metadata: {
          totalResults: results.length,
          searchTime: latency,
          filters: searchOptions.filters,
          timestamp: new Date()
        }
      };
      
    } catch (error) {
      console.error('Error in search:', error);
      throw error;
    }
  }

  /**
   * Hybrid search combining vector and keyword approaches
   * @param {Object} query - Enhanced query object
   * @param {Object} options - Search options
   * @returns {Array} Combined and ranked results
   */
  async hybridSearch(query, options) {
    try {
      console.log('🔍 Performing hybrid search...');
      
      // Perform both searches in parallel
      const [vectorResults, keywordResults] = await Promise.all([
        this.vectorSearch(query, options),
        this.keywordSearch(query, options)
      ]);
      
      // Combine and deduplicate results
      const combinedResults = this.combineResults(vectorResults, keywordResults);
      
      // Apply hybrid scoring
      const scoredResults = this.applyHybridScoring(combinedResults, query, options);
      
      // Sort by final score
      scoredResults.sort((a, b) => b.score - a.score);
      
      // Apply limit
      const limit = options.limit || this.config.defaultTopK;
      return scoredResults.slice(0, limit);
      
    } catch (error) {
      console.error('Error in hybrid search:', error);
      throw error;
    }
  }

  /**
   * Vector-based semantic search
   * @param {Object} query - Enhanced query object
   * @param {Object} options - Search options
   * @returns {Array} Vector search results
   */
  async vectorSearch(query, options) {
    try {
      // Generate query embedding
      const queryEmbedding = await embeddingService.generateEmbedding(query.text);
      
      // Build Pinecone filter
      const filter = this.buildVectorFilter(options.filters);
      
      // Query Qdrant vector database
      const vectorMatches = await qdrantDB.search(queryEmbedding, {
        limit: options.limit || this.config.defaultTopK * 2, // Get more for filtering
        filter: filter,
        namespace: options.namespace || '',
        withPayload: true
      });
      
      // Fetch full documents from MongoDB
      const results = await this.fetchDocuments(vectorMatches, options.type);
      
      // Add vector scores
      results.forEach((result, i) => {
        result.vectorScore = vectorMatches[i].score;
        result.searchType = 'vector';
      });
      
      return results;
      
    } catch (error) {
      console.error('Error in vector search:', error);
      return [];
    }
  }

  /**
   * Traditional keyword-based search
   * @param {Object} query - Enhanced query object
   * @param {Object} options - Search options
   * @returns {Array} Keyword search results
   */
  async keywordSearch(query, options) {
    try {
      // Build MongoDB query
      const mongoQuery = this.buildMongoQuery(query, options);
      
      // Determine collection based on type
      let Model;
      switch (options.type) {
        case 'fact':
          Model = Fact;
          break;
        case 'cluster':
          Model = StoryCluster;
          break;
        case 'article':
        default:
          Model = EnhancedArticle;
          break;
      }
      
      // Execute search with text score
      const results = await Model
        .find(mongoQuery.filter, { score: { $meta: 'textScore' } })
        .sort({ score: { $meta: 'textScore' } })
        .limit(options.limit || this.config.defaultTopK * 2)
        .lean();
      
      // Add keyword scores
      results.forEach(result => {
        result.keywordScore = result.score || 0;
        result.searchType = 'keyword';
        delete result.score; // Remove MongoDB's text score field
      });
      
      return results;
      
    } catch (error) {
      console.error('Error in keyword search:', error);
      return [];
    }
  }

  /**
   * Enhance query using AI
   * @param {String} query - Original query
   * @param {Object} options - Search options
   * @returns {Object} Enhanced query object
   */
  async enhanceQuery(query, options) {
    try {
      if (!this.model) {
        return { text: query, original: query };
      }
      
      const prompt = `Enhance this search query for news and fact retrieval. 
      Original query: "${query}"
      
      Provide:
      1. Expanded query with synonyms and related terms
      2. Key entities to search for
      3. Temporal context if any
      4. Potential fact types to look for
      
      Return as JSON: {
        "expanded": "enhanced query text",
        "entities": ["entity1", "entity2"],
        "temporal": "time context or null",
        "factTypes": ["type1", "type2"]
      }`;
      
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      // Parse AI response
      const enhanced = this.parseAIResponse(response);
      
      return {
        text: enhanced.expanded || query,
        original: query,
        entities: enhanced.entities || [],
        temporal: enhanced.temporal,
        factTypes: enhanced.factTypes || []
      };
      
    } catch (error) {
      console.warn('Query enhancement failed, using original:', error.message);
      return { text: query, original: query };
    }
  }

  /**
   * Combine results from vector and keyword search
   * @param {Array} vectorResults - Results from vector search
   * @param {Array} keywordResults - Results from keyword search
   * @returns {Array} Combined results with metadata
   */
  combineResults(vectorResults, keywordResults) {
    const resultMap = new Map();
    
    // Add vector results
    vectorResults.forEach(result => {
      const id = result._id?.toString() || result.id;
      resultMap.set(id, {
        ...result,
        vectorScore: result.vectorScore || 0,
        keywordScore: 0,
        sources: ['vector']
      });
    });
    
    // Add/merge keyword results
    keywordResults.forEach(result => {
      const id = result._id?.toString() || result.id;
      
      if (resultMap.has(id)) {
        // Merge with existing result
        const existing = resultMap.get(id);
        existing.keywordScore = result.keywordScore || 0;
        existing.sources.push('keyword');
      } else {
        // Add new result
        resultMap.set(id, {
          ...result,
          vectorScore: 0,
          keywordScore: result.keywordScore || 0,
          sources: ['keyword']
        });
      }
    });
    
    return Array.from(resultMap.values());
  }

  /**
   * Apply hybrid scoring algorithm
   * @param {Array} results - Combined results
   * @param {Object} query - Enhanced query
   * @param {Object} options - Search options
   * @returns {Array} Results with hybrid scores
   */
  applyHybridScoring(results, query, options) {
    return results.map(result => {
      // Base hybrid score
      let score = (
        result.vectorScore * this.config.vectorWeight +
        result.keywordScore * this.config.keywordWeight
      );
      
      // Apply boosts
      score = this.applyScoreBoosts(score, result, query, options);
      
      // Apply temporal decay
      score = this.applyTemporalDecay(score, result);
      
      // Apply relevance threshold
      if (score < this.config.minScore) {
        result.filtered = true;
      }
      
      result.score = score;
      result.scoreBreakdown = {
        vector: result.vectorScore,
        keyword: result.keywordScore,
        hybrid: score,
        boosts: this.calculateBoosts(result, query, options),
        temporalFactor: this.calculateTemporalFactor(result)
      };
      
      return result;
    });
  }

  /**
   * Apply score boosts based on various factors
   * @param {Number} baseScore - Base hybrid score
   * @param {Object} result - Result document
   * @param {Object} query - Enhanced query
   * @param {Object} options - Search options
   * @returns {Number} Boosted score
   */
  applyScoreBoosts(baseScore, result, query, options) {
    let score = baseScore;
    
    // Cross-source boost
    if (result.sources && result.sources.length > 1) {
      score *= this.config.crossSourceBoost;
    }
    
    // Fact-based boost
    if (result.extractedFacts && result.extractedFacts.length > 0) {
      const factRelevance = this.calculateFactRelevance(result.extractedFacts, query);
      score *= (1 + factRelevance * (this.config.factBoost - 1));
    }
    
    // Entity match boost
    if (query.entities && query.entities.length > 0) {
      const entityScore = this.calculateEntityScore(result, query.entities);
      score *= (1 + entityScore * 0.2);
    }
    
    // Verification status boost
    if (result.verificationStatus === 'VERIFIED') {
      score *= 1.1;
    }
    
    // Importance boost
    if (result.importance) {
      score *= (1 + result.importance / 20);
    }
    
    return score;
  }

  /**
   * Apply temporal decay to scores
   * @param {Number} score - Current score
   * @param {Object} result - Result document
   * @returns {Number} Score with temporal decay applied
   */
  applyTemporalDecay(score, result) {
    if (!result.publishedAt && !result.temporalData?.publishedAt) {
      return score;
    }
    
    const publishDate = new Date(result.publishedAt || result.temporalData.publishedAt);
    const now = new Date();
    const daysDiff = Math.floor((now - publishDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 0) {
      return score; // No decay for today's content
    }
    
    if (daysDiff > this.config.maxTemporalDays) {
      // Apply maximum decay
      return score * Math.pow(this.config.temporalDecay, this.config.maxTemporalDays);
    }
    
    // Apply daily decay
    return score * Math.pow(this.config.temporalDecay, daysDiff);
  }

  /**
   * Post-process search results
   * @param {Array} results - Raw search results
   * @param {Object} query - Enhanced query
   * @param {Object} options - Search options
   * @returns {Array} Processed results
   */
  async postProcessResults(results, query, options) {
    // Filter out low-score results
    let processedResults = results.filter(r => !r.filtered);
    
    // Apply reranking if enabled
    if (this.config.reranking && this.model) {
      processedResults = await this.rerankResults(processedResults, query);
    }
    
    // Add snippets and highlights
    processedResults = this.addSnippetsAndHighlights(processedResults, query);
    
    // Group by story if requested
    if (options.groupByStory) {
      processedResults = await this.groupByStory(processedResults);
    }
    
    // Add cross-source analysis if available
    if (options.includeCrossSource) {
      processedResults = await this.addCrossSourceAnalysis(processedResults);
    }
    
    return processedResults;
  }

  /**
   * Build vector search filter for Qdrant
   * @param {Object} filters - Filter criteria
   * @returns {Object} Pinecone filter object
   */
  buildVectorFilter(filters) {
    if (!filters) return {};
    
    const pineconeFilter = {};
    
    // Date range filter
    if (filters.startDate || filters.endDate) {
      pineconeFilter.publishedAt = {};
      if (filters.startDate) {
        pineconeFilter.publishedAt.$gte = new Date(filters.startDate).getTime();
      }
      if (filters.endDate) {
        pineconeFilter.publishedAt.$lte = new Date(filters.endDate).getTime();
      }
    }
    
    // Category filter
    if (filters.category) {
      pineconeFilter.category = filters.category;
    }
    
    // Source filter
    if (filters.sources && filters.sources.length > 0) {
      pineconeFilter.source = { $in: filters.sources };
    }
    
    // Bias filter
    if (filters.bias) {
      pineconeFilter.bias = filters.bias;
    }
    
    // Type filter
    if (filters.type) {
      pineconeFilter.type = filters.type;
    }
    
    // Importance filter
    if (filters.minImportance) {
      pineconeFilter.importance = { $gte: filters.minImportance };
    }
    
    return pineconeFilter;
  }

  /**
   * Build MongoDB query
   * @param {Object} query - Enhanced query
   * @param {Object} options - Search options
   * @returns {Object} MongoDB query object
   */
  buildMongoQuery(query, options) {
    const mongoQuery = {
      filter: {},
      options: {}
    };
    
    // Text search
    if (query.text) {
      mongoQuery.filter.$text = { $search: query.text };
    }
    
    // Date range filter
    if (options.filters?.startDate || options.filters?.endDate) {
      mongoQuery.filter['temporalData.publishedAt'] = {};
      if (options.filters.startDate) {
        mongoQuery.filter['temporalData.publishedAt'].$gte = new Date(options.filters.startDate);
      }
      if (options.filters.endDate) {
        mongoQuery.filter['temporalData.publishedAt'].$lte = new Date(options.filters.endDate);
      }
    }
    
    // Category filter
    if (options.filters?.category) {
      mongoQuery.filter.category = options.filters.category;
    }
    
    // Source filter
    if (options.filters?.sources && options.filters.sources.length > 0) {
      mongoQuery.filter['source.name'] = { $in: options.filters.sources };
    }
    
    // Entity filter
    if (query.entities && query.entities.length > 0) {
      mongoQuery.filter['entities.name'] = { $in: query.entities };
    }
    
    // Fact type filter
    if (query.factTypes && query.factTypes.length > 0) {
      mongoQuery.filter['extractedFacts.factType'] = { $in: query.factTypes };
    }
    
    // Verification status filter
    if (options.filters?.verificationStatus) {
      mongoQuery.filter['extractedFacts.verificationStatus'] = options.filters.verificationStatus;
    }
    
    return mongoQuery;
  }

  /**
   * Fetch full documents from MongoDB based on vector matches
   * @param {Array} vectorMatches - Pinecone search results
   * @param {String} type - Document type
   * @returns {Array} Full documents
   */
  async fetchDocuments(vectorMatches, type = 'article') {
    if (!vectorMatches || vectorMatches.length === 0) {
      return [];
    }
    
    const ids = vectorMatches.map(match => {
      // Extract ID from vector match
      const id = match.id;
      if (id.startsWith('fact_')) return id.replace('fact_', '');
      if (id.startsWith('cluster_')) return id.replace('cluster_', '');
      return id;
    });
    
    let Model;
    let idField;
    
    switch (type) {
      case 'fact':
        Model = Fact;
        idField = 'factId';
        break;
      case 'cluster':
        Model = StoryCluster;
        idField = 'clusterId';
        break;
      case 'article':
      default:
        Model = EnhancedArticle;
        idField = '_id';
        break;
    }
    
    // Fetch documents
    const documents = await Model.find({ [idField]: { $in: ids } }).lean();
    
    // Create ID map for ordering
    const idMap = new Map();
    documents.forEach(doc => {
      const docId = doc[idField]?.toString() || doc._id?.toString();
      idMap.set(docId, doc);
    });
    
    // Return in order of vector matches
    return ids.map(id => idMap.get(id)).filter(doc => doc !== undefined);
  }

  /**
   * Calculate fact relevance score
   * @param {Array} facts - Extracted facts
   * @param {Object} query - Enhanced query
   * @returns {Number} Relevance score (0-1)
   */
  calculateFactRelevance(facts, query) {
    if (!facts || facts.length === 0) return 0;
    
    let relevanceScore = 0;
    let factCount = 0;
    
    facts.forEach(fact => {
      // Check if fact type matches query
      if (query.factTypes && query.factTypes.includes(fact.factType)) {
        relevanceScore += 0.3;
        factCount++;
      }
      
      // Check if fact contains query entities
      if (query.entities && fact.entities) {
        const entityOverlap = query.entities.filter(e => 
          fact.entities.some(fe => fe.name.toLowerCase().includes(e.toLowerCase()))
        ).length;
        
        if (entityOverlap > 0) {
          relevanceScore += 0.2 * (entityOverlap / query.entities.length);
          factCount++;
        }
      }
      
      // Check verification status
      if (fact.verificationStatus === 'VERIFIED') {
        relevanceScore += 0.1;
        factCount++;
      }
    });
    
    return factCount > 0 ? Math.min(1, relevanceScore / factCount) : 0;
  }

  /**
   * Calculate entity match score
   * @param {Object} result - Result document
   * @param {Array} queryEntities - Entities from query
   * @returns {Number} Entity score (0-1)
   */
  calculateEntityScore(result, queryEntities) {
    if (!result.entities || !queryEntities) return 0;
    
    const resultEntities = result.entities.map(e => e.name.toLowerCase());
    const matches = queryEntities.filter(qe => 
      resultEntities.some(re => re.includes(qe.toLowerCase()))
    );
    
    return matches.length / queryEntities.length;
  }

  /**
   * Add snippets and highlights to results
   * @param {Array} results - Search results
   * @param {Object} query - Enhanced query
   * @returns {Array} Results with snippets
   */
  addSnippetsAndHighlights(results, query) {
    const queryTerms = query.text.toLowerCase().split(/\s+/);
    
    return results.map(result => {
      // Create snippet from content
      let content = result.content || result.description || result.statement || '';
      let snippet = content.substring(0, 300);
      
      // Highlight query terms
      queryTerms.forEach(term => {
        const regex = new RegExp(`(${term})`, 'gi');
        snippet = snippet.replace(regex, '**$1**');
      });
      
      result.snippet = snippet + (content.length > 300 ? '...' : '');
      
      // Add key facts as highlights
      if (result.extractedFacts && result.extractedFacts.length > 0) {
        result.highlights = result.extractedFacts
          .slice(0, 3)
          .map(f => f.statement.substring(0, 100));
      }
      
      return result;
    });
  }

  /**
   * Helper methods
   */
  
  parseSearchOptions(options) {
    return {
      type: options.type || 'article',
      filters: options.filters || {},
      limit: Math.min(options.limit || this.config.defaultTopK, this.config.maxResults),
      groupByStory: options.groupByStory || false,
      includeCrossSource: options.includeCrossSource || false,
      namespace: options.namespace || ''
    };
  }
  
  determineSearchStrategy(query, options) {
    // Use hybrid by default for best results
    if (options.strategy) {
      return options.strategy;
    }
    
    // Use vector for semantic queries
    if (query.text.includes('similar to') || query.text.includes('like')) {
      return 'vector';
    }
    
    // Use keyword for exact matches
    if (query.text.includes('"') || query.text.includes('exact')) {
      return 'keyword';
    }
    
    return 'hybrid';
  }
  
  parseAIResponse(response) {
    try {
      // Extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (error) {
      console.warn('Failed to parse AI response:', error);
    }
    return {};
  }
  
  createCacheKey(query, options) {
    return `${query}_${JSON.stringify(options)}`;
  }
  
  getCachedResult(key) {
    const cached = this.searchCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }
    if (cached) {
      this.searchCache.delete(key);
    }
    return null;
  }
  
  cacheResult(key, data) {
    this.searchCache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (this.searchCache.size > 100) {
      const entries = Array.from(this.searchCache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      for (let i = 0; i < 20; i++) {
        this.searchCache.delete(entries[i][0]);
      }
    }
  }
  
  updateMetrics(latency) {
    this.metrics.averageLatency = (
      (this.metrics.averageLatency * (this.metrics.totalSearches - 1) + latency) /
      this.metrics.totalSearches
    );
  }
  
  calculateBoosts(result, query, options) {
    const boosts = [];
    
    if (result.sources?.length > 1) {
      boosts.push({ type: 'crossSource', value: this.config.crossSourceBoost });
    }
    
    if (result.extractedFacts?.length > 0) {
      boosts.push({ type: 'facts', value: this.config.factBoost });
    }
    
    if (result.verificationStatus === 'VERIFIED') {
      boosts.push({ type: 'verified', value: 1.1 });
    }
    
    return boosts;
  }
  
  calculateTemporalFactor(result) {
    if (!result.publishedAt && !result.temporalData?.publishedAt) {
      return 1;
    }
    
    const publishDate = new Date(result.publishedAt || result.temporalData.publishedAt);
    const now = new Date();
    const daysDiff = Math.floor((now - publishDate) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 0) return 1;
    if (daysDiff > this.config.maxTemporalDays) {
      return Math.pow(this.config.temporalDecay, this.config.maxTemporalDays);
    }
    
    return Math.pow(this.config.temporalDecay, daysDiff);
  }

  /**
   * Rerank results using AI
   * @param {Array} results - Initial results
   * @param {Object} query - Enhanced query
   * @returns {Array} Reranked results
   */
  async rerankResults(results, query) {
    try {
      if (results.length <= 5) {
        return results; // No need to rerank small result sets
      }
      
      const prompt = `Rerank these search results for the query: "${query.original}"
      
      Results to rank (showing titles and snippets):
      ${results.slice(0, 20).map((r, i) => 
        `${i + 1}. ${r.title || r.statement || 'Untitled'}: ${r.snippet || ''}`
      ).join('\n')}
      
      Return the numbers of the top 10 most relevant results in order, as a comma-separated list.`;
      
      const result = await this.model.generateContent(prompt);
      const response = result.response.text();
      
      // Parse ranking
      const rankings = response.match(/\d+/g)?.map(n => parseInt(n) - 1) || [];
      
      if (rankings.length > 0) {
        // Reorder based on AI ranking
        const reranked = rankings
          .filter(i => i >= 0 && i < results.length)
          .map(i => results[i]);
        
        // Add remaining results
        const remaining = results.filter((r, i) => !rankings.includes(i));
        
        return [...reranked, ...remaining];
      }
      
    } catch (error) {
      console.warn('Reranking failed:', error.message);
    }
    
    return results;
  }

  /**
   * Group results by story cluster
   * @param {Array} results - Search results
   * @returns {Array} Grouped results
   */
  async groupByStory(results) {
    try {
      // Get unique cluster IDs
      const clusterIds = [...new Set(results
        .filter(r => r.storyCluster)
        .map(r => r.storyCluster))];
      
      if (clusterIds.length === 0) {
        return results;
      }
      
      // Fetch cluster information
      const clusters = await StoryCluster.find({
        clusterId: { $in: clusterIds }
      }).lean();
      
      // Create cluster map
      const clusterMap = new Map();
      clusters.forEach(cluster => {
        clusterMap.set(cluster.clusterId, cluster);
      });
      
      // Group results
      const grouped = new Map();
      const ungrouped = [];
      
      results.forEach(result => {
        if (result.storyCluster && clusterMap.has(result.storyCluster)) {
          if (!grouped.has(result.storyCluster)) {
            grouped.set(result.storyCluster, {
              cluster: clusterMap.get(result.storyCluster),
              articles: []
            });
          }
          grouped.get(result.storyCluster).articles.push(result);
        } else {
          ungrouped.push(result);
        }
      });
      
      // Format grouped results
      const groupedResults = Array.from(grouped.values()).map(group => ({
        type: 'story_group',
        cluster: group.cluster,
        articles: group.articles,
        score: Math.max(...group.articles.map(a => a.score))
      }));
      
      // Combine grouped and ungrouped
      return [...groupedResults, ...ungrouped].sort((a, b) => b.score - a.score);
      
    } catch (error) {
      console.error('Error grouping by story:', error);
      return results;
    }
  }

  /**
   * Add cross-source analysis to results
   * @param {Array} results - Search results
   * @returns {Array} Results with cross-source data
   */
  async addCrossSourceAnalysis(results) {
    try {
      // Group by story cluster for cross-source analysis
      const storyGroups = new Map();
      
      results.forEach(result => {
        const clusterId = result.storyCluster || 'no_cluster';
        if (!storyGroups.has(clusterId)) {
          storyGroups.set(clusterId, []);
        }
        storyGroups.get(clusterId).push(result);
      });
      
      // Add cross-source data
      return results.map(result => {
        const clusterId = result.storyCluster || 'no_cluster';
        const groupArticles = storyGroups.get(clusterId);
        
        if (groupArticles.length > 1) {
          // Calculate cross-source metrics
          const sources = [...new Set(groupArticles.map(a => a.source?.name))];
          const biases = [...new Set(groupArticles.map(a => a.biasAnalysis?.overall_bias))];
          
          result.crossSourceAnalysis = {
            totalSources: sources.length,
            sources: sources,
            biasSpectrum: biases,
            narrativeDiversity: biases.length / 5, // Normalize to 0-1
            relatedArticles: groupArticles.length - 1
          };
        }
        
        return result;
      });
      
    } catch (error) {
      console.error('Error adding cross-source analysis:', error);
      return results;
    }
  }

  /**
   * Get search metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.searchCache.size,
      cacheHitRate: this.metrics.totalSearches > 0
        ? (this.metrics.cacheHits / this.metrics.totalSearches * 100).toFixed(2) + '%'
        : '0%',
      searchDistribution: {
        vector: this.metrics.vectorSearches,
        keyword: this.metrics.keywordSearches,
        hybrid: this.metrics.hybridSearches
      }
    };
  }

  /**
   * Clear search cache
   */
  clearCache() {
    this.searchCache.clear();
    console.log('✓ Search cache cleared');
  }
}

// Export singleton instance
const hybridSearchService = new HybridSearchService();
export default hybridSearchService;

// Also export the class for testing
export { HybridSearchService };