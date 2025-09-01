import embeddingService from './EmbeddingService.js';
import hybridSearchService from './HybridSearchService.js';
import vectorSyncService from './VectorSyncService.js';
import qdrantDB from '../../config/qdrantDB.js';

// Import temporal services for integration
import TemporalQueryService from '../temporal/TemporalQueryService.js';
import TemporalFactVerifier from '../temporal/TemporalFactVerifier.js';

/**
 * Vector Services Integration Module
 * Combines vector search with temporal services for enhanced RAG capabilities
 */
class VectorServicesIntegration {
  constructor() {
    this.initialized = false;
    this.services = {
      embedding: embeddingService,
      search: hybridSearchService,
      sync: vectorSyncService,
      vectorDB: qdrantDB
    };
  }

  /**
   * Initialize all vector services
   */
  async initialize() {
    if (this.initialized) {
      console.log('✓ Vector services already initialized');
      return;
    }

    try {
      console.log('🚀 Initializing Vector Services Integration...');
      
      // Initialize core services
      await qdrantDB.initialize();
      await embeddingService.initialize();
      await hybridSearchService.initialize();
      await vectorSyncService.initialize();
      
      this.initialized = true;
      console.log('✅ Vector Services Integration ready');
      
      // Run initial sync check
      await this.checkSystemStatus();
      
    } catch (error) {
      console.error('❌ Error initializing vector services:', error);
      throw error;
    }
  }

  /**
   * Enhanced temporal search with vector capabilities
   * @param {String} query - Search query
   * @param {Object} temporalOptions - Temporal search options
   * @returns {Object} Combined search results
   */
  async temporalVectorSearch(query, temporalOptions = {}) {
    try {
      console.log('🔍 Performing temporal vector search...');
      
      // Parse temporal context from query
      const temporalContext = await this.extractTemporalContext(query);
      
      // Combine temporal and vector search options
      const searchOptions = {
        filters: {
          ...temporalOptions.filters,
          startDate: temporalContext.startDate || temporalOptions.startDate,
          endDate: temporalContext.endDate || temporalOptions.endDate
        },
        type: temporalOptions.type || 'article',
        limit: temporalOptions.limit || 20,
        groupByStory: temporalOptions.groupByStory !== false,
        includeCrossSource: temporalOptions.includeCrossSource !== false
      };
      
      // Perform hybrid search with temporal filters
      const searchResults = await hybridSearchService.search(query, searchOptions);
      
      // Enhance with temporal analysis
      if (searchResults.results && searchResults.results.length > 0) {
        searchResults.temporalAnalysis = await this.addTemporalAnalysis(searchResults.results);
        searchResults.factEvolution = await this.trackFactEvolution(searchResults.results);
      }
      
      return searchResults;
      
    } catch (error) {
      console.error('Error in temporal vector search:', error);
      throw error;
    }
  }

  /**
   * Fact-based semantic search with verification
   * @param {String} factQuery - Fact to search for
   * @param {Object} options - Search options
   * @returns {Object} Verified fact search results
   */
  async verifiedFactSearch(factQuery, options = {}) {
    try {
      console.log('📋 Searching for verified facts...');
      
      // Search for facts
      const factResults = await hybridSearchService.search(factQuery, {
        ...options,
        type: 'fact',
        filters: {
          ...options.filters,
          verificationStatus: 'VERIFIED'
        }
      });
      
      // Cross-verify facts
      if (factResults.results && factResults.results.length > 0) {
        const verifier = TemporalFactVerifier;
        
        for (const fact of factResults.results) {
          // Get cross-source verification
          const verification = await verifier.verifyFactAcrossSources(
            fact.statement,
            fact.sourceArticles || []
          );
          
          fact.crossSourceVerification = verification;
        }
      }
      
      return factResults;
      
    } catch (error) {
      console.error('Error in verified fact search:', error);
      throw error;
    }
  }

  /**
   * Story cluster search with narrative analysis
   * @param {String} query - Search query
   * @param {Object} options - Search options
   * @returns {Object} Story clusters with narrative spectrum
   */
  async storyClusterSearch(query, options = {}) {
    try {
      console.log('🔗 Searching story clusters...');
      
      // Search for clusters
      const clusterResults = await hybridSearchService.search(query, {
        ...options,
        type: 'cluster',
        includeCrossSource: true
      });
      
      // Enhance with narrative analysis
      if (clusterResults.results && clusterResults.results.length > 0) {
        for (const cluster of clusterResults.results) {
          // Add narrative spectrum visualization
          cluster.narrativeVisualization = this.visualizeNarrativeSpectrum(cluster.narrativeSpectrum);
          
          // Add controversy indicators
          cluster.controversyIndicators = this.analyzeControversy(cluster);
        }
      }
      
      return clusterResults;
      
    } catch (error) {
      console.error('Error in story cluster search:', error);
      throw error;
    }
  }

  /**
   * Extract temporal context from query
   * @param {String} query - Search query
   * @returns {Object} Temporal context
   */
  async extractTemporalContext(query) {
    const context = {
      startDate: null,
      endDate: null,
      granularity: null
    };
    
    // Pattern matching for temporal expressions
    const patterns = {
      today: /today|current|now/i,
      yesterday: /yesterday/i,
      thisWeek: /this week/i,
      lastWeek: /last week/i,
      thisMonth: /this month/i,
      lastMonth: /last month/i,
      thisYear: /this year|2025/i,
      dateRange: /from\s+(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/i,
      specificDate: /on\s+(\d{4}-\d{2}-\d{2})/i,
      lastNDays: /last\s+(\d+)\s+days?/i
    };
    
    const now = new Date();
    
    // Check patterns
    if (patterns.today.test(query)) {
      context.startDate = new Date(now.setHours(0, 0, 0, 0));
      context.endDate = new Date(now.setHours(23, 59, 59, 999));
      context.granularity = 'day';
    } else if (patterns.yesterday.test(query)) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      context.startDate = new Date(yesterday.setHours(0, 0, 0, 0));
      context.endDate = new Date(yesterday.setHours(23, 59, 59, 999));
      context.granularity = 'day';
    } else if (patterns.thisWeek.test(query)) {
      const startOfWeek = new Date(now);
      startOfWeek.setDate(now.getDate() - now.getDay());
      context.startDate = new Date(startOfWeek.setHours(0, 0, 0, 0));
      context.endDate = now;
      context.granularity = 'week';
    } else if (patterns.lastNDays.test(query)) {
      const match = query.match(patterns.lastNDays);
      const days = parseInt(match[1]);
      context.startDate = new Date(now);
      context.startDate.setDate(context.startDate.getDate() - days);
      context.endDate = now;
      context.granularity = days <= 7 ? 'day' : 'week';
    }
    
    return context;
  }

  /**
   * Add temporal analysis to search results
   * @param {Array} results - Search results
   * @returns {Object} Temporal analysis
   */
  async addTemporalAnalysis(results) {
    try {
      const queryService = TemporalQueryService;
      
      // Group results by time period
      const timeGroups = {};
      
      for (const result of results) {
        const date = result.publishedAt || result.temporalData?.publishedAt;
        if (!date) continue;
        
        const dateObj = new Date(date);
        const dateKey = dateObj.toISOString().split('T')[0];
        
        if (!timeGroups[dateKey]) {
          timeGroups[dateKey] = [];
        }
        timeGroups[dateKey].push(result);
      }
      
      // Analyze temporal patterns
      const analysis = {
        timeline: Object.keys(timeGroups).sort(),
        distribution: timeGroups,
        peaks: this.identifyPeaks(timeGroups),
        trends: await this.analyzeTrends(results),
        evolution: await queryService.getStoryEvolution(results)
      };
      
      return analysis;
      
    } catch (error) {
      console.error('Error in temporal analysis:', error);
      return null;
    }
  }

  /**
   * Track fact evolution across results
   * @param {Array} results - Search results
   * @returns {Object} Fact evolution data
   */
  async trackFactEvolution(results) {
    try {
      const facts = [];
      
      // Extract facts from results
      for (const result of results) {
        if (result.extractedFacts && result.extractedFacts.length > 0) {
          facts.push(...result.extractedFacts);
        }
      }
      
      if (facts.length === 0) {
        return null;
      }
      
      // Group facts by similarity
      const factGroups = this.groupSimilarFacts(facts);
      
      // Track evolution
      const evolution = {
        totalFacts: facts.length,
        uniqueFacts: factGroups.length,
        evolutionChains: [],
        consensus: {}
      };
      
      for (const group of factGroups) {
        if (group.length > 1) {
          // Sort by date
          group.sort((a, b) => new Date(a.firstReported) - new Date(b.firstReported));
          
          // Create evolution chain
          evolution.evolutionChains.push({
            original: group[0].statement,
            variations: group.map(f => ({
              statement: f.statement,
              date: f.firstReported,
              source: f.source
            })),
            consensusLevel: this.calculateConsensus(group)
          });
        }
      }
      
      return evolution;
      
    } catch (error) {
      console.error('Error tracking fact evolution:', error);
      return null;
    }
  }

  /**
   * Visualize narrative spectrum
   * @param {Array} narrativeSpectrum - Narrative spectrum data
   * @returns {Object} Visualization data
   */
  visualizeNarrativeSpectrum(narrativeSpectrum) {
    if (!narrativeSpectrum || narrativeSpectrum.length === 0) {
      return null;
    }
    
    const visualization = {
      spectrum: [],
      balance: 0,
      diversity: 0
    };
    
    // Map narratives to spectrum positions
    const biasMap = {
      'FAR_LEFT': -2,
      'LEFT': -1,
      'CENTER_LEFT': -0.5,
      'CENTER': 0,
      'CENTER_RIGHT': 0.5,
      'RIGHT': 1,
      'FAR_RIGHT': 2
    };
    
    for (const narrative of narrativeSpectrum) {
      visualization.spectrum.push({
        position: biasMap[narrative.bias] || 0,
        narrative: narrative.key_narrative,
        sources: narrative.sources,
        strength: narrative.sources.length
      });
    }
    
    // Calculate balance
    const positions = visualization.spectrum.map(n => n.position);
    visualization.balance = positions.reduce((a, b) => a + b, 0) / positions.length;
    
    // Calculate diversity
    const uniquePositions = [...new Set(positions)];
    visualization.diversity = uniquePositions.length / Object.keys(biasMap).length;
    
    return visualization;
  }

  /**
   * Analyze controversy indicators
   * @param {Object} cluster - Story cluster
   * @returns {Object} Controversy analysis
   */
  analyzeControversy(cluster) {
    const indicators = {
      level: cluster.controversy?.level || 'NONE',
      score: 0,
      factors: []
    };
    
    // Check narrative divergence
    if (cluster.narrativeSpectrum && cluster.narrativeSpectrum.length > 3) {
      indicators.score += 2;
      indicators.factors.push('High narrative divergence');
    }
    
    // Check fact conflicts
    if (cluster.controversy?.conflicting_facts > 0) {
      indicators.score += cluster.controversy.conflicting_facts;
      indicators.factors.push(`${cluster.controversy.conflicting_facts} conflicting facts`);
    }
    
    // Check source disagreement
    if (cluster.metrics?.narrative_variance > 0.5) {
      indicators.score += 1;
      indicators.factors.push('High source disagreement');
    }
    
    // Determine controversy level
    if (indicators.score >= 5) {
      indicators.level = 'HIGH';
    } else if (indicators.score >= 3) {
      indicators.level = 'MEDIUM';
    } else if (indicators.score >= 1) {
      indicators.level = 'LOW';
    }
    
    return indicators;
  }

  /**
   * Identify temporal peaks in results
   * @param {Object} timeGroups - Results grouped by time
   * @returns {Array} Peak periods
   */
  identifyPeaks(timeGroups) {
    const peaks = [];
    const counts = Object.entries(timeGroups).map(([date, items]) => ({
      date,
      count: items.length
    }));
    
    if (counts.length === 0) return peaks;
    
    // Calculate average
    const average = counts.reduce((sum, c) => sum + c.count, 0) / counts.length;
    const threshold = average * 1.5; // 50% above average
    
    // Find peaks
    counts.forEach((point, i) => {
      if (point.count >= threshold) {
        // Check if it's a local maximum
        const prevCount = i > 0 ? counts[i - 1].count : 0;
        const nextCount = i < counts.length - 1 ? counts[i + 1].count : 0;
        
        if (point.count >= prevCount && point.count >= nextCount) {
          peaks.push({
            date: point.date,
            count: point.count,
            significance: (point.count / average).toFixed(2)
          });
        }
      }
    });
    
    return peaks;
  }

  /**
   * Analyze trends in results
   * @param {Array} results - Search results
   * @returns {Object} Trend analysis
   */
  async analyzeTrends(results) {
    const trends = {
      temporal: 'stable',
      importance: 'stable',
      verification: 'improving'
    };
    
    if (results.length < 3) return trends;
    
    // Sort by date
    const sorted = [...results].sort((a, b) => {
      const dateA = new Date(a.publishedAt || a.temporalData?.publishedAt);
      const dateB = new Date(b.publishedAt || b.temporalData?.publishedAt);
      return dateA - dateB;
    });
    
    // Analyze temporal trend
    const recentCount = sorted.slice(-Math.floor(sorted.length / 3)).length;
    const oldCount = sorted.slice(0, Math.floor(sorted.length / 3)).length;
    
    if (recentCount > oldCount * 1.2) {
      trends.temporal = 'increasing';
    } else if (recentCount < oldCount * 0.8) {
      trends.temporal = 'decreasing';
    }
    
    // Analyze importance trend
    const recentImportance = sorted.slice(-3).reduce((sum, r) => sum + (r.importance || 5), 0) / 3;
    const oldImportance = sorted.slice(0, 3).reduce((sum, r) => sum + (r.importance || 5), 0) / 3;
    
    if (recentImportance > oldImportance * 1.1) {
      trends.importance = 'increasing';
    } else if (recentImportance < oldImportance * 0.9) {
      trends.importance = 'decreasing';
    }
    
    return trends;
  }

  /**
   * Group similar facts together
   * @param {Array} facts - Facts to group
   * @returns {Array} Grouped facts
   */
  groupSimilarFacts(facts) {
    const groups = [];
    const processed = new Set();
    
    for (let i = 0; i < facts.length; i++) {
      if (processed.has(i)) continue;
      
      const group = [facts[i]];
      processed.add(i);
      
      for (let j = i + 1; j < facts.length; j++) {
        if (processed.has(j)) continue;
        
        // Simple similarity check (can be enhanced)
        const similarity = this.calculateFactSimilarity(facts[i], facts[j]);
        if (similarity > 0.7) {
          group.push(facts[j]);
          processed.add(j);
        }
      }
      
      groups.push(group);
    }
    
    return groups;
  }

  /**
   * Calculate similarity between two facts
   * @param {Object} fact1 - First fact
   * @param {Object} fact2 - Second fact
   * @returns {Number} Similarity score (0-1)
   */
  calculateFactSimilarity(fact1, fact2) {
    // Simple word overlap similarity (can be enhanced with embeddings)
    const words1 = new Set(fact1.statement.toLowerCase().split(/\s+/));
    const words2 = new Set(fact2.statement.toLowerCase().split(/\s+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Calculate consensus level for fact group
   * @param {Array} factGroup - Group of similar facts
   * @returns {Number} Consensus level (0-1)
   */
  calculateConsensus(factGroup) {
    if (factGroup.length <= 1) return 1;
    
    const verifiedCount = factGroup.filter(f => f.verificationStatus === 'VERIFIED').length;
    const disputedCount = factGroup.filter(f => f.verificationStatus === 'DISPUTED').length;
    
    const consensus = (verifiedCount - disputedCount) / factGroup.length;
    return Math.max(0, Math.min(1, (consensus + 1) / 2));
  }

  /**
   * Check system status
   * @returns {Object} System status
   */
  async checkSystemStatus() {
    try {
      const status = {
        vector: {
          initialized: this.initialized,
          services: {}
        },
        sync: await vectorSyncService.checkSyncStatus(),
        embedding: embeddingService.getMetrics(),
        search: hybridSearchService.getMetrics()
      };
      
      // Check service status
      for (const [name, service] of Object.entries(this.services)) {
        status.vector.services[name] = {
          initialized: service.initialized || false
        };
      }
      
      return status;
      
    } catch (error) {
      console.error('Error checking system status:', error);
      return null;
    }
  }

  /**
   * Run initial sync
   * @param {Object} options - Sync options
   */
  async runInitialSync(options = {}) {
    console.log('🔄 Running initial vector sync...');
    return await vectorSyncService.fullSync(options);
  }

  /**
   * Start auto-sync
   * @param {Number} interval - Sync interval
   */
  startAutoSync(interval) {
    vectorSyncService.startAutoSync(interval);
  }

  /**
   * Stop auto-sync
   */
  stopAutoSync() {
    vectorSyncService.stopAutoSync();
  }
}

// Create and export integration instance
const vectorIntegration = new VectorServicesIntegration();

// Export individual services and integration
export {
  embeddingService,
  hybridSearchService,
  vectorSyncService,
  qdrantDB,
  vectorIntegration
};

// Default export
export default vectorIntegration;