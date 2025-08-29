import EnhancedArticle from '../../models/EnhancedArticle.js';
import Fact from '../../models/Fact.js';
import StoryCluster from '../../models/StoryCluster.js';
import ChatConversation from '../../models/ChatConversation.js';

/**
 * TemporalQueryService
 * Advanced temporal and semantic search across news data
 * Provides complex querying capabilities for the RAG system
 */
class TemporalQueryService {
  constructor() {
    this.config = {
      defaultLimit: 20,
      maxLimit: 100,
      cacheEnabled: true,
      cacheTimeout: 300000, // 5 minutes
      aggregationTimeout: 30000 // 30 seconds
    };
    
    // Query cache
    this.queryCache = new Map();
  }

  /**
   * Query articles by date range with advanced filtering
   * @param {Object} params - Query parameters
   * @returns {Object} Query results with articles and metadata
   */
  async queryByDateRange(params) {
    const {
      startDate,
      endDate,
      category,
      sources = [],
      bias = [],
      factTypes = [],
      verificationStatus = [],
      granularity = 'day',
      limit = this.config.defaultLimit,
      offset = 0,
      sortBy = 'publishedAt',
      sortOrder = 'desc'
    } = params;
    
    console.log(`📅 Querying articles from ${startDate} to ${endDate}`);
    
    try {
      // Build the query
      const query = this.buildDateRangeQuery({
        startDate,
        endDate,
        category,
        sources,
        bias,
        factTypes,
        verificationStatus
      });
      
      // Execute the query
      const articles = await EnhancedArticle.find(query)
        .sort({ [`temporalData.${sortBy}`]: sortOrder === 'desc' ? -1 : 1 })
        .skip(offset)
        .limit(Math.min(limit, this.config.maxLimit))
        .populate('storyCluster')
        .lean();
      
      // Get total count for pagination
      const totalCount = await EnhancedArticle.countDocuments(query);
      
      // Aggregate temporal data
      const temporalAggregation = await this.aggregateTemporalData(
        query,
        granularity,
        startDate,
        endDate
      );
      
      // Extract and aggregate facts
      const factAggregation = await this.aggregateFactsFromArticles(articles);
      
      // Calculate bias distribution
      const biasDistribution = this.calculateBiasDistribution(articles);
      
      return {
        articles,
        metadata: {
          totalCount,
          returnedCount: articles.length,
          offset,
          limit,
          dateRange: { startDate, endDate },
          granularity
        },
        aggregations: {
          temporal: temporalAggregation,
          facts: factAggregation,
          bias: biasDistribution
        },
        pagination: {
          hasMore: offset + articles.length < totalCount,
          nextOffset: offset + articles.length,
          totalPages: Math.ceil(totalCount / limit),
          currentPage: Math.floor(offset / limit) + 1
        }
      };
      
    } catch (error) {
      console.error(`❌ Error in date range query: ${error.message}`);
      throw error;
    }
  }

  /**
   * Query facts by temporal criteria
   * @param {Object} params - Query parameters
   * @returns {Object} Facts and analysis
   */
  async queryFactsByTime(params) {
    const {
      startDate,
      endDate,
      factTypes = [],
      importance,
      verificationStatus,
      trending = false,
      disputed = false,
      limit = this.config.defaultLimit,
      offset = 0
    } = params;
    
    console.log(`📊 Querying facts from ${startDate} to ${endDate}`);
    
    try {
      // Build fact query
      const query = {
        'timeline.firstReported': {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
      
      if (factTypes.length > 0) {
        query['classification.subtype'] = { $in: factTypes };
      }
      
      if (importance) {
        query['classification.importance'] = { $gte: importance };
      }
      
      if (verificationStatus) {
        query['verificationHistory.status'] = verificationStatus;
      }
      
      if (trending) {
        query['relevanceScore.trend'] = { $in: ['RISING', 'VIRAL'] };
      }
      
      if (disputed) {
        query['flags.isDisputed'] = true;
      }
      
      // Execute query
      const facts = await Fact.find(query)
        .sort({ 'timeline.firstReported': -1 })
        .skip(offset)
        .limit(Math.min(limit, this.config.maxLimit))
        .populate('sourceArticles.articleId', 'title source publishedAt')
        .lean();
      
      // Get total count
      const totalCount = await Fact.countDocuments(query);
      
      // Build fact timeline
      const timeline = this.buildFactTimeline(facts);
      
      // Analyze fact verification
      const verificationAnalysis = this.analyzeFactVerification(facts);
      
      // Group facts by type
      const factsByType = this.groupFactsByType(facts);
      
      return {
        facts,
        metadata: {
          totalCount,
          returnedCount: facts.length,
          offset,
          limit,
          dateRange: { startDate, endDate }
        },
        analysis: {
          timeline,
          verification: verificationAnalysis,
          byType: factsByType,
          topEntities: this.extractTopEntities(facts),
          consensusRate: this.calculateConsensusRate(facts)
        },
        pagination: {
          hasMore: offset + facts.length < totalCount,
          nextOffset: offset + facts.length
        }
      };
      
    } catch (error) {
      console.error(`❌ Error querying facts: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get story clusters by date range
   * @param {Object} params - Query parameters
   * @returns {Object} Story clusters and analysis
   */
  async getStoryClusters(params) {
    const {
      startDate,
      endDate,
      category,
      minImportance = 5,
      controversial = false,
      limit = this.config.defaultLimit,
      offset = 0
    } = params;
    
    console.log(`🔗 Querying story clusters from ${startDate} to ${endDate}`);
    
    try {
      const query = {
        'timespan.start': {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };
      
      if (category) {
        query['classification.category'] = category;
      }
      
      if (minImportance) {
        query['classification.importance'] = { $gte: minImportance };
      }
      
      if (controversial) {
        query['controversy.level'] = { $in: ['MODERATE', 'HIGH', 'EXTREME'] };
      }
      
      // Execute query
      const clusters = await StoryCluster.find(query)
        .sort({ 'metrics.trending_score': -1 })
        .skip(offset)
        .limit(Math.min(limit, this.config.maxLimit))
        .populate('articles', 'title source publishedAt')
        .lean();
      
      // Get total count
      const totalCount = await StoryCluster.countDocuments(query);
      
      // Analyze narrative distribution
      const narrativeAnalysis = this.analyzeNarrativeDistribution(clusters);
      
      // Calculate controversy metrics
      const controversyMetrics = this.calculateControversyMetrics(clusters);
      
      return {
        clusters,
        metadata: {
          totalCount,
          returnedCount: clusters.length,
          offset,
          limit,
          dateRange: { startDate, endDate }
        },
        analysis: {
          narratives: narrativeAnalysis,
          controversy: controversyMetrics,
          topStories: this.identifyTopStories(clusters),
          sourceDiversity: this.calculateSourceDiversity(clusters)
        },
        pagination: {
          hasMore: offset + clusters.length < totalCount,
          nextOffset: offset + clusters.length
        }
      };
      
    } catch (error) {
      console.error(`❌ Error querying story clusters: ${error.message}`);
      throw error;
    }
  }

  /**
   * Perform temporal aggregation on articles
   */
  async aggregateTemporalData(query, granularity, startDate, endDate) {
    try {
      const pipeline = [
        { $match: query },
        {
          $group: {
            _id: this.getTemporalGroupKey(granularity),
            count: { $sum: 1 },
            articles: { $push: '$_id' },
            sources: { $addToSet: '$source.name' },
            categories: { $addToSet: '$category' },
            avgImportance: { $avg: '$extractedFacts.importance' }
          }
        },
        { $sort: { _id: 1 } }
      ];
      
      const aggregation = await EnhancedArticle.aggregate(pipeline);
      
      // Fill in missing time periods
      const filledAggregation = this.fillTemporalGaps(
        aggregation,
        granularity,
        startDate,
        endDate
      );
      
      return filledAggregation;
      
    } catch (error) {
      console.error('Error in temporal aggregation:', error.message);
      return [];
    }
  }

  /**
   * Get the appropriate temporal grouping key
   */
  getTemporalGroupKey(granularity) {
    switch (granularity) {
      case 'hour':
        return {
          year: { $year: '$temporalData.publishedAt' },
          month: { $month: '$temporalData.publishedAt' },
          day: { $dayOfMonth: '$temporalData.publishedAt' },
          hour: { $hour: '$temporalData.publishedAt' }
        };
      case 'day':
        return '$temporalData.publishDate';
      case 'week':
        return '$temporalData.publishWeek';
      case 'month':
        return '$temporalData.publishMonth';
      case 'year':
        return '$temporalData.publishYear';
      default:
        return '$temporalData.publishDate';
    }
  }

  /**
   * Fill gaps in temporal aggregation
   */
  fillTemporalGaps(aggregation, granularity, startDate, endDate) {
    const filled = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const current = new Date(start);
    const aggregationMap = new Map(aggregation.map(a => [a._id, a]));
    
    while (current <= end) {
      const key = this.getTemporalKey(current, granularity);
      const data = aggregationMap.get(key) || {
        _id: key,
        count: 0,
        articles: [],
        sources: [],
        categories: [],
        avgImportance: 0
      };
      
      filled.push(data);
      
      // Increment current date based on granularity
      this.incrementDate(current, granularity);
    }
    
    return filled;
  }

  /**
   * Get temporal key for a date
   */
  getTemporalKey(date, granularity) {
    switch (granularity) {
      case 'hour':
        return {
          year: date.getFullYear(),
          month: date.getMonth() + 1,
          day: date.getDate(),
          hour: date.getHours()
        };
      case 'day':
        return date.toISOString().split('T')[0];
      case 'week':
        const oneJan = new Date(date.getFullYear(), 0, 1);
        const weekNumber = Math.ceil((((date - oneJan) / 86400000) + oneJan.getDay() + 1) / 7);
        return `${date.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
      case 'month':
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      case 'year':
        return date.getFullYear();
      default:
        return date.toISOString().split('T')[0];
    }
  }

  /**
   * Increment date based on granularity
   */
  incrementDate(date, granularity) {
    switch (granularity) {
      case 'hour':
        date.setHours(date.getHours() + 1);
        break;
      case 'day':
        date.setDate(date.getDate() + 1);
        break;
      case 'week':
        date.setDate(date.getDate() + 7);
        break;
      case 'month':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'year':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }
  }

  /**
   * Aggregate facts from articles
   */
  async aggregateFactsFromArticles(articles) {
    const facts = {
      total: 0,
      byType: {},
      verified: 0,
      disputed: 0,
      topFacts: []
    };
    
    articles.forEach(article => {
      if (article.extractedFacts) {
        facts.total += article.extractedFacts.length;
        
        article.extractedFacts.forEach(fact => {
          // Count by type
          facts.byType[fact.factType] = (facts.byType[fact.factType] || 0) + 1;
          
          // Count verification status
          if (fact.verificationStatus === 'VERIFIED') facts.verified++;
          if (fact.verificationStatus === 'DISPUTED') facts.disputed++;
          
          // Collect top facts by importance
          if (fact.importance >= 8) {
            facts.topFacts.push({
              statement: fact.statement,
              importance: fact.importance,
              type: fact.factType,
              articleTitle: article.title
            });
          }
        });
      }
    });
    
    // Sort and limit top facts
    facts.topFacts.sort((a, b) => b.importance - a.importance);
    facts.topFacts = facts.topFacts.slice(0, 10);
    
    return facts;
  }

  /**
   * Calculate bias distribution
   */
  calculateBiasDistribution(articles) {
    const distribution = {
      left: 0,
      'center-left': 0,
      center: 0,
      'center-right': 0,
      right: 0,
      neutral: 0,
      unanalyzed: 0
    };
    
    articles.forEach(article => {
      const bias = article.biasAnalysis?.overall_bias;
      if (bias) {
        distribution[bias] = (distribution[bias] || 0) + 1;
      } else {
        distribution.unanalyzed++;
      }
    });
    
    // Calculate percentages
    const total = articles.length;
    const percentages = {};
    Object.keys(distribution).forEach(key => {
      percentages[key] = total > 0 ? (distribution[key] / total * 100).toFixed(1) : 0;
    });
    
    return {
      counts: distribution,
      percentages,
      dominantBias: Object.keys(distribution).reduce((a, b) => 
        distribution[a] > distribution[b] ? a : b
      )
    };
  }

  /**
   * Build fact timeline
   */
  buildFactTimeline(facts) {
    const timeline = [];
    
    facts.forEach(fact => {
      timeline.push({
        date: fact.timeline.firstReported,
        type: 'FACT_REPORTED',
        factId: fact.factId,
        statement: fact.statement,
        importance: fact.classification.importance
      });
      
      // Add verification events
      fact.verificationHistory.forEach(verification => {
        timeline.push({
          date: verification.date,
          type: 'VERIFICATION',
          factId: fact.factId,
          status: verification.status,
          verifiedBy: verification.verifiedBy
        });
      });
    });
    
    // Sort chronologically
    timeline.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    return timeline;
  }

  /**
   * Analyze fact verification
   */
  analyzeFactVerification(facts) {
    const analysis = {
      total: facts.length,
      verified: 0,
      unverified: 0,
      disputed: 0,
      debunked: 0,
      verificationRate: 0,
      averageConfidence: 0,
      bySource: {}
    };
    
    let totalConfidence = 0;
    
    facts.forEach(fact => {
      // Get latest verification status
      const latestVerification = fact.verificationHistory[fact.verificationHistory.length - 1];
      
      if (latestVerification) {
        switch (latestVerification.status) {
          case 'VERIFIED':
            analysis.verified++;
            break;
          case 'UNVERIFIED':
            analysis.unverified++;
            break;
          case 'DISPUTED':
            analysis.disputed++;
            break;
          case 'DEBUNKED':
            analysis.debunked++;
            break;
        }
        
        // Track by source
        const source = latestVerification.verifiedBy;
        if (source) {
          if (!analysis.bySource[source]) {
            analysis.bySource[source] = { verified: 0, disputed: 0, total: 0 };
          }
          analysis.bySource[source].total++;
          if (latestVerification.status === 'VERIFIED') {
            analysis.bySource[source].verified++;
          }
          if (latestVerification.status === 'DISPUTED') {
            analysis.bySource[source].disputed++;
          }
        }
        
        if (latestVerification.confidence) {
          totalConfidence += latestVerification.confidence;
        }
      }
    });
    
    analysis.verificationRate = facts.length > 0 ? analysis.verified / facts.length : 0;
    analysis.averageConfidence = facts.length > 0 ? totalConfidence / facts.length : 0;
    
    return analysis;
  }

  /**
   * Group facts by type
   */
  groupFactsByType(facts) {
    const grouped = {};
    
    facts.forEach(fact => {
      const type = fact.classification.subtype || fact.classification.type;
      if (!grouped[type]) {
        grouped[type] = {
          count: 0,
          facts: [],
          avgImportance: 0
        };
      }
      
      grouped[type].count++;
      grouped[type].facts.push({
        factId: fact.factId,
        statement: fact.statement,
        importance: fact.classification.importance
      });
    });
    
    // Calculate average importance
    Object.keys(grouped).forEach(type => {
      const totalImportance = grouped[type].facts.reduce((sum, f) => sum + f.importance, 0);
      grouped[type].avgImportance = grouped[type].count > 0 
        ? totalImportance / grouped[type].count 
        : 0;
      
      // Keep only top 3 facts per type
      grouped[type].facts = grouped[type].facts
        .sort((a, b) => b.importance - a.importance)
        .slice(0, 3);
    });
    
    return grouped;
  }

  /**
   * Extract top entities from facts
   */
  extractTopEntities(facts) {
    const entityCounts = {};
    
    facts.forEach(fact => {
      fact.entities?.forEach(entity => {
        const key = `${entity.name}:${entity.type}`;
        if (!entityCounts[key]) {
          entityCounts[key] = {
            name: entity.name,
            type: entity.type,
            count: 0,
            facts: []
          };
        }
        entityCounts[key].count++;
        entityCounts[key].facts.push(fact.factId);
      });
    });
    
    // Sort by count and return top 10
    return Object.values(entityCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }

  /**
   * Calculate consensus rate
   */
  calculateConsensusRate(facts) {
    if (facts.length === 0) return 0;
    
    const consensusSum = facts.reduce((sum, fact) => {
      return sum + (fact.consensus?.agreementLevel || 0);
    }, 0);
    
    return consensusSum / facts.length;
  }

  /**
   * Build date range query
   */
  buildDateRangeQuery(params) {
    const query = {
      'temporalData.publishedAt': {
        $gte: new Date(params.startDate),
        $lte: new Date(params.endDate)
      }
    };
    
    if (params.category) {
      query.category = params.category;
    }
    
    if (params.sources && params.sources.length > 0) {
      query['source.name'] = { $in: params.sources };
    }
    
    if (params.bias && params.bias.length > 0) {
      query['biasAnalysis.overall_bias'] = { $in: params.bias };
    }
    
    if (params.factTypes && params.factTypes.length > 0) {
      query['extractedFacts.factType'] = { $in: params.factTypes };
    }
    
    if (params.verificationStatus && params.verificationStatus.length > 0) {
      query['extractedFacts.verificationStatus'] = { $in: params.verificationStatus };
    }
    
    return query;
  }

  /**
   * Analyze narrative distribution across clusters
   */
  analyzeNarrativeDistribution(clusters) {
    const distribution = {
      left: 0,
      'center-left': 0,
      center: 0,
      'center-right': 0,
      right: 0,
      neutral: 0
    };
    
    const narratives = [];
    
    clusters.forEach(cluster => {
      cluster.narrativeSpectrum?.forEach(narrative => {
        distribution[narrative.bias_position] = 
          (distribution[narrative.bias_position] || 0) + narrative.source_count;
        
        narratives.push({
          clusterId: cluster.clusterId,
          title: cluster.title,
          bias: narrative.bias_position,
          narrative: narrative.key_narrative,
          strength: narrative.strength
        });
      });
    });
    
    // Sort narratives by strength
    narratives.sort((a, b) => b.strength - a.strength);
    
    return {
      distribution,
      topNarratives: narratives.slice(0, 10),
      dominantBias: Object.keys(distribution).reduce((a, b) => 
        distribution[a] > distribution[b] ? a : b
      )
    };
  }

  /**
   * Calculate controversy metrics
   */
  calculateControversyMetrics(clusters) {
    const metrics = {
      totalClusters: clusters.length,
      controversial: 0,
      averagePolarization: 0,
      mostControversial: null,
      controversyBreakdown: {
        NONE: 0,
        LOW: 0,
        MODERATE: 0,
        HIGH: 0,
        EXTREME: 0
      }
    };
    
    let totalPolarization = 0;
    let maxPolarization = 0;
    
    clusters.forEach(cluster => {
      const level = cluster.controversy?.level || 'NONE';
      metrics.controversyBreakdown[level]++;
      
      if (level !== 'NONE') {
        metrics.controversial++;
      }
      
      const polarization = cluster.controversy?.polarization_index || 0;
      totalPolarization += polarization;
      
      if (polarization > maxPolarization) {
        maxPolarization = polarization;
        metrics.mostControversial = {
          clusterId: cluster.clusterId,
          title: cluster.title,
          polarization,
          level
        };
      }
    });
    
    metrics.averagePolarization = clusters.length > 0 
      ? totalPolarization / clusters.length 
      : 0;
    
    return metrics;
  }

  /**
   * Identify top stories from clusters
   */
  identifyTopStories(clusters) {
    return clusters
      .map(cluster => ({
        clusterId: cluster.clusterId,
        title: cluster.title,
        importance: cluster.classification.importance,
        trendingScore: cluster.metrics.trending_score,
        articleCount: cluster.metrics.total_articles,
        sourceCount: cluster.metrics.unique_sources,
        combinedScore: (
          cluster.classification.importance * 2 +
          cluster.metrics.trending_score / 10 +
          Math.min(cluster.metrics.total_articles, 10) +
          Math.min(cluster.metrics.unique_sources, 5)
        )
      }))
      .sort((a, b) => b.combinedScore - a.combinedScore)
      .slice(0, 5);
  }

  /**
   * Calculate source diversity
   */
  calculateSourceDiversity(clusters) {
    const allSources = new Set();
    let totalSources = 0;
    
    clusters.forEach(cluster => {
      cluster.sources?.forEach(source => {
        allSources.add(source.name);
        totalSources++;
      });
    });
    
    return {
      uniqueSources: allSources.size,
      totalSources,
      averageSourcesPerStory: clusters.length > 0 
        ? totalSources / clusters.length 
        : 0,
      diversityScore: allSources.size / Math.max(totalSources, 1)
    };
  }

  /**
   * Search across all temporal data
   */
  async searchTemporal(searchQuery, options = {}) {
    console.log(`🔍 Temporal search for: "${searchQuery}"`);
    
    const results = {
      articles: [],
      facts: [],
      clusters: [],
      totalResults: 0
    };
    
    try {
      // Search articles
      const articleResults = await EnhancedArticle.find({
        $text: { $search: searchQuery }
      })
      .limit(options.limit || 10)
      .sort({ score: { $meta: 'textScore' } })
      .lean();
      
      results.articles = articleResults;
      
      // Search facts
      const factResults = await Fact.find({
        $text: { $search: searchQuery }
      })
      .limit(options.limit || 10)
      .sort({ score: { $meta: 'textScore' } })
      .lean();
      
      results.facts = factResults;
      
      // Search clusters
      const clusterResults = await StoryCluster.find({
        $text: { $search: searchQuery }
      })
      .limit(options.limit || 10)
      .sort({ score: { $meta: 'textScore' } })
      .lean();
      
      results.clusters = clusterResults;
      
      results.totalResults = 
        results.articles.length + 
        results.facts.length + 
        results.clusters.length;
      
      console.log(`   Found ${results.totalResults} total results`);
      
      return results;
      
    } catch (error) {
      console.error(`Error in temporal search: ${error.message}`);
      throw error;
    }
  }
}

// Export singleton instance
export default new TemporalQueryService();