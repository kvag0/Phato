/**
 * Temporal Services Integration
 * Central hub for all temporal services in the Phato RAG system
 */

import TemporalFactExtractor from './TemporalFactExtractor.js';
import FactEvolutionTracker from './FactEvolutionTracker.js';
import TemporalQueryService from './TemporalQueryService.js';
import TemporalFactVerifier from './TemporalFactVerifier.js';

/**
 * TemporalServices - Unified interface for temporal operations
 */
class TemporalServices {
  constructor() {
    this.factExtractor = TemporalFactExtractor;
    this.evolutionTracker = FactEvolutionTracker;
    this.queryService = TemporalQueryService;
    this.factVerifier = TemporalFactVerifier;
    
    console.log('✨ Temporal Services initialized');
  }

  /**
   * Process a new article through the complete temporal pipeline
   * @param {Object} article - Article to process
   * @returns {Object} Processing results
   */
  async processArticle(article) {
    console.log(`\n🔄 Processing article through temporal pipeline: ${article.title?.substring(0, 50)}...`);
    
    const results = {
      extraction: null,
      evolution: [],
      verification: [],
      clustering: null,
      errors: []
    };
    
    try {
      // Step 1: Extract facts
      console.log('1️⃣ Extracting facts...');
      results.extraction = await this.factExtractor.extractFactsFromArticle(article);
      
      // Step 2: Track evolution for extracted facts
      console.log('2️⃣ Tracking fact evolution...');
      for (const fact of results.extraction.facts.slice(0, 5)) { // Limit to top 5 facts
        try {
          const evolution = await this.evolutionTracker.trackFactEvolution(fact.factId);
          results.evolution.push(evolution);
        } catch (error) {
          results.errors.push({ stage: 'evolution', factId: fact.factId, error: error.message });
        }
      }
      
      // Step 3: Verify important facts
      console.log('3️⃣ Verifying important facts...');
      const importantFacts = results.extraction.facts
        .filter(f => f.importance >= 7)
        .slice(0, 3); // Top 3 important facts
      
      for (const fact of importantFacts) {
        try {
          const verification = await this.factVerifier.verifyFactAcrossTime(fact.factId);
          results.verification.push(verification);
        } catch (error) {
          results.errors.push({ stage: 'verification', factId: fact.factId, error: error.message });
        }
      }
      
      console.log('✅ Article processing complete');
      
    } catch (error) {
      console.error('❌ Error processing article:', error.message);
      results.errors.push({ stage: 'general', error: error.message });
    }
    
    return results;
  }

  /**
   * Perform comprehensive temporal analysis for a date range
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {Object} options - Analysis options
   * @returns {Object} Analysis results
   */
  async analyzeTimeRange(startDate, endDate, options = {}) {
    console.log(`\n📊 Analyzing time range: ${startDate} to ${endDate}`);
    
    const analysis = {
      articles: null,
      facts: null,
      clusters: null,
      evolution: null,
      verification: null,
      summary: {}
    };
    
    try {
      // Query articles
      console.log('📰 Querying articles...');
      analysis.articles = await this.queryService.queryByDateRange({
        startDate,
        endDate,
        ...options
      });
      
      // Query facts
      console.log('📊 Querying facts...');
      analysis.facts = await this.queryService.queryFactsByTime({
        startDate,
        endDate,
        ...options
      });
      
      // Get story clusters
      console.log('🔗 Getting story clusters...');
      analysis.clusters = await this.queryService.getStoryClusters({
        startDate,
        endDate,
        ...options
      });
      
      // Track evolution for top facts
      if (options.includeEvolution) {
        console.log('🔄 Tracking fact evolution...');
        const topFactIds = analysis.facts.facts
          .slice(0, options.evolutionLimit || 10)
          .map(f => f.factId);
        
        analysis.evolution = await this.evolutionTracker.analyzeEvolutionPatterns(topFactIds);
      }
      
      // Verify disputed facts
      if (options.includeVerification) {
        console.log('✅ Verifying disputed facts...');
        const disputedFactIds = analysis.facts.facts
          .filter(f => f.flags?.isDisputed)
          .slice(0, options.verificationLimit || 10)
          .map(f => f.factId);
        
        analysis.verification = await this.factVerifier.verifyMultipleFacts(disputedFactIds);
      }
      
      // Generate summary
      analysis.summary = this.generateAnalysisSummary(analysis);
      
      console.log('✅ Time range analysis complete');
      
    } catch (error) {
      console.error('❌ Error in time range analysis:', error.message);
      throw error;
    }
    
    return analysis;
  }

  /**
   * Search across all temporal data
   * @param {String} query - Search query
   * @param {Object} options - Search options
   * @returns {Object} Search results
   */
  async search(query, options = {}) {
    console.log(`\n🔍 Temporal search: "${query}"`);
    
    try {
      const results = await this.queryService.searchTemporal(query, options);
      
      // Enhance results with temporal context
      if (options.includeContext) {
        results.articles = await this.enhanceWithTemporalContext(results.articles);
        results.facts = await this.enhanceFactsWithEvolution(results.facts);
      }
      
      return results;
      
    } catch (error) {
      console.error('❌ Error in temporal search:', error.message);
      throw error;
    }
  }

  /**
   * Run continuous monitoring and processing
   * @param {Object} options - Monitoring options
   */
  async runContinuousMonitoring(options = {}) {
    console.log('\n🔄 Starting continuous temporal monitoring...');
    
    const interval = options.interval || 3600000; // Default 1 hour
    const processNewArticles = options.processNewArticles !== false;
    const verifyFacts = options.verifyFacts !== false;
    const trackEvolution = options.trackEvolution !== false;
    
    const monitor = async () => {
      console.log(`\n⏰ Running monitoring cycle at ${new Date().toISOString()}`);
      
      try {
        // Process new articles
        if (processNewArticles) {
          const recentArticles = await this.queryService.queryByDateRange({
            startDate: new Date(Date.now() - interval),
            endDate: new Date(),
            limit: 20
          });
          
          for (const article of recentArticles.articles) {
            if (!article.extractedFacts || article.extractedFacts.length === 0) {
              await this.processArticle(article);
            }
          }
        }
        
        // Verify recent facts
        if (verifyFacts) {
          await this.factVerifier.continuousVerification({
            days: 1,
            limit: 20
          });
        }
        
        // Track evolution
        if (trackEvolution) {
          await this.evolutionTracker.trackEvolutionForPeriod(
            new Date(Date.now() - 24 * 60 * 60 * 1000),
            new Date(),
            { limit: 20 }
          );
        }
        
        console.log('✅ Monitoring cycle complete');
        
      } catch (error) {
        console.error('❌ Error in monitoring cycle:', error.message);
      }
    };
    
    // Run immediately
    await monitor();
    
    // Set up interval
    if (options.continuous) {
      setInterval(monitor, interval);
      console.log(`⏰ Monitoring scheduled every ${interval / 1000 / 60} minutes`);
    }
  }

  /**
   * Generate analysis summary
   */
  generateAnalysisSummary(analysis) {
    const summary = {
      dateRange: {
        start: analysis.articles?.metadata?.dateRange?.startDate,
        end: analysis.articles?.metadata?.dateRange?.endDate
      },
      totals: {
        articles: analysis.articles?.metadata?.totalCount || 0,
        facts: analysis.facts?.metadata?.totalCount || 0,
        clusters: analysis.clusters?.metadata?.totalCount || 0
      },
      factAnalysis: {
        verified: analysis.facts?.analysis?.verification?.verified || 0,
        disputed: analysis.facts?.analysis?.verification?.disputed || 0,
        verificationRate: analysis.facts?.analysis?.verification?.verificationRate || 0
      },
      biasDistribution: analysis.articles?.aggregations?.bias?.percentages || {},
      topStories: analysis.clusters?.analysis?.topStories || [],
      narrativeAnalysis: {
        dominantBias: analysis.clusters?.analysis?.narratives?.dominantBias,
        controversialStories: analysis.clusters?.analysis?.controversy?.controversial || 0
      }
    };
    
    if (analysis.evolution) {
      summary.evolution = {
        corrections: analysis.evolution.corrections,
        updates: analysis.evolution.updates,
        contradictions: analysis.evolution.contradictions,
        averageEvolutionCount: analysis.evolution.averageEvolutionCount
      };
    }
    
    if (analysis.verification) {
      summary.verification = {
        verified: analysis.verification.verified?.length || 0,
        disputed: analysis.verification.disputed?.length || 0,
        unverified: analysis.verification.unverified?.length || 0
      };
    }
    
    return summary;
  }

  /**
   * Enhance articles with temporal context
   */
  async enhanceWithTemporalContext(articles) {
    const enhanced = [];
    
    for (const article of articles) {
      const context = {
        ...article,
        temporalContext: {
          daysSincePublished: Math.floor((Date.now() - new Date(article.publishedAt)) / (24 * 60 * 60 * 1000)),
          relevantFacts: article.extractedFacts?.filter(f => f.importance >= 7).length || 0,
          verifiedFacts: article.extractedFacts?.filter(f => f.verificationStatus === 'VERIFIED').length || 0
        }
      };
      enhanced.push(context);
    }
    
    return enhanced;
  }

  /**
   * Enhance facts with evolution data
   */
  async enhanceFactsWithEvolution(facts) {
    const enhanced = [];
    
    for (const fact of facts.slice(0, 10)) { // Limit to avoid overload
      try {
        const evolution = await this.evolutionTracker.trackFactEvolution(fact.factId);
        enhanced.push({
          ...fact,
          evolution: {
            hasEvolved: evolution.changeAnalysis.hasEvolved,
            changeCount: evolution.changeAnalysis.changeCount,
            primaryChangeType: evolution.changeAnalysis.primaryChangeType
          }
        });
      } catch (error) {
        enhanced.push(fact);
      }
    }
    
    return enhanced;
  }

  /**
   * Get service statistics
   */
  getStatistics() {
    return {
      services: {
        factExtractor: 'Active',
        evolutionTracker: 'Active',
        queryService: 'Active',
        factVerifier: 'Active'
      },
      cache: {
        factExtractor: this.factExtractor.factCache.size,
        queryService: this.queryService.queryCache.size
      },
      configuration: {
        factExtractor: this.factExtractor.config,
        evolutionTracker: this.evolutionTracker.config,
        queryService: this.queryService.config,
        factVerifier: this.factVerifier.config
      }
    };
  }

  /**
   * Clear all service caches
   */
  clearCaches() {
    this.factExtractor.clearCache();
    this.queryService.queryCache.clear();
    console.log('✅ All service caches cleared');
  }
}

// Export services
export {
  TemporalFactExtractor,
  FactEvolutionTracker,
  TemporalQueryService,
  TemporalFactVerifier
};

// Export unified service
const temporalServices = new TemporalServices();
export default temporalServices;