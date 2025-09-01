import express from 'express';
import { hybridSearch, getSimilarArticles } from '../controllers/chatbotController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

/**
 * @route POST /api/search
 * @desc Main search endpoint with hybrid search capabilities
 * @body {string} query - Search query
 * @body {object} filters - Search filters
 * @body {number} limit - Max results (default: 20)
 * @body {string} strategy - Search strategy (hybrid, semantic, keyword)
 */
router.post('/', async (req, res) => {
  try {
    const { 
      query, 
      filters = {}, 
      limit = 20,
      strategy = 'hybrid'
    } = req.body;

    // Validate input
    if (!query || typeof query !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Query is required and must be a string'
      });
    }

    if (query.length > 500) {
      return res.status(400).json({
        success: false,
        error: 'Query too long (max 500 characters)'
      });
    }

    // Perform search
    const searchResults = await hybridSearchService.search(query, {
      ...filters,
      limit: Math.min(limit, 100),
      strategy
    });

    // Enhance results with additional data
    const enhancedResults = await Promise.all(
      searchResults.results.map(async (result) => {
        // Get cluster info if available
        const cluster = await StoryCluster.findOne({
          articles: result._id
        }).select('id title articleCount').lean();

        return {
          ...result,
          cluster: cluster ? {
            id: cluster.id,
            title: cluster.title,
            articleCount: cluster.articleCount
          } : null
        };
      })
    );

    res.json({
      success: true,
      data: {
        results: enhancedResults,
        total: searchResults.total || enhancedResults.length,
        metadata: searchResults.metadata
      }
    });

  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform search'
    });
  }
});

/**
 * @route POST /api/search/semantic
 * @desc Pure semantic search using vector embeddings
 * @body {string} query - Search query
 * @body {number} limit - Max results
 * @body {object} filters - Optional filters
 */
router.post('/semantic', async (req, res) => {
  try {
    const { query, limit = 20, filters = {} } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    // Force semantic search strategy
    const searchResults = await hybridSearchService.search(query, {
      ...filters,
      limit: Math.min(limit, 100),
      strategy: 'semantic'
    });

    res.json({
      success: true,
      data: searchResults
    });

  } catch (error) {
    console.error('Semantic search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform semantic search'
    });
  }
});

/**
 * @route GET /api/search/similar/:id
 * @desc Find similar articles using vector similarity
 * @param {string} id - Article ID
 * @query {number} limit - Max results (default: 10)
 */
router.get('/similar/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 10 } = req.query;

    // Get the article
    const article = await EnhancedArticle.findById(id);
    
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    // Find similar articles
    const similarResults = await hybridSearchService.findSimilar(
      article._id.toString(),
      {
        limit: Math.min(parseInt(limit), 50),
        type: 'article'
      }
    );

    res.json({
      success: true,
      data: {
        sourceArticle: {
          id: article._id,
          title: article.title
        },
        similar: similarResults.results
      }
    });

  } catch (error) {
    console.error('Similar search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to find similar articles'
    });
  }
});

/**
 * @route POST /api/search/temporal
 * @desc Search with temporal constraints
 * @body {string} query - Search query
 * @body {string} startDate - Start date (ISO string)
 * @body {string} endDate - End date (ISO string)
 * @body {string} granularity - Time granularity
 */
router.post('/temporal', async (req, res) => {
  try {
    const { 
      query, 
      startDate, 
      endDate,
      granularity = 'day',
      limit = 20
    } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    // Build temporal filter
    const temporalFilter = {};
    if (startDate) temporalFilter.startDate = new Date(startDate);
    if (endDate) temporalFilter.endDate = new Date(endDate);

    // Perform temporal search
    const results = await temporalQueryService.queryByTimeRange(
      temporalFilter.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      temporalFilter.endDate || new Date(),
      { 
        query,
        limit: Math.min(limit, 100),
        granularity 
      }
    );

    res.json({
      success: true,
      data: results
    });

  } catch (error) {
    console.error('Temporal search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform temporal search'
    });
  }
});

/**
 * @route POST /api/search/facts
 * @desc Search for specific facts across articles
 * @body {string} query - Fact query
 * @body {object} filters - Optional filters
 */
router.post('/facts', async (req, res) => {
  try {
    const { query, filters = {} } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    // Search for facts
    const factQuery = {
      $or: [
        { statement: new RegExp(query, 'i') },
        { 'context.summary': new RegExp(query, 'i') }
      ]
    };

    if (filters.verificationStatus) {
      factQuery.verificationStatus = filters.verificationStatus;
    }

    if (filters.minConfidence) {
      factQuery['confidence.overall'] = { $gte: filters.minConfidence };
    }

    const facts = await Fact.find(factQuery)
      .sort({ 'confidence.overall': -1 })
      .limit(20)
      .populate('sources.articleId', 'title source publishedAt')
      .lean();

    res.json({
      success: true,
      data: facts
    });

  } catch (error) {
    console.error('Fact search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search facts'
    });
  }
});

/**
 * @route GET /api/search/autocomplete
 * @desc Get search suggestions based on partial query
 * @query {string} q - Partial query
 * @query {number} limit - Max suggestions (default: 5)
 */
router.get('/autocomplete', async (req, res) => {
  try {
    const { q, limit = 5 } = req.query;

    if (!q || q.length < 2) {
      return res.status(400).json({
        success: false,
        error: 'Query must be at least 2 characters'
      });
    }

    // Get suggestions from article titles
    const suggestions = await EnhancedArticle.find({
      title: new RegExp(q, 'i')
    })
      .select('title')
      .limit(parseInt(limit))
      .lean();

    // Extract unique keywords
    const keywords = new Set();
    suggestions.forEach(article => {
      const words = article.title.toLowerCase().split(' ');
      words.forEach(word => {
        if (word.startsWith(q.toLowerCase()) && word.length > 2) {
          keywords.add(word);
        }
      });
    });

    res.json({
      success: true,
      data: {
        suggestions: Array.from(keywords).slice(0, parseInt(limit)),
        titles: suggestions.map(s => s.title)
      }
    });

  } catch (error) {
    console.error('Autocomplete error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get suggestions'
    });
  }
});

/**
 * @route POST /api/search/advanced
 * @desc Advanced search with multiple criteria
 * @body {object} criteria - Complex search criteria
 */
router.post('/advanced', async (req, res) => {
  try {
    const { criteria = {} } = req.body;

    // Build MongoDB query
    const query = {};

    // Text search
    if (criteria.text) {
      query.$text = { $search: criteria.text };
    }

    // Category filter
    if (criteria.categories && criteria.categories.length > 0) {
      query.category = { $in: criteria.categories };
    }

    // Source filter
    if (criteria.sources && criteria.sources.length > 0) {
      query['source.name'] = { $in: criteria.sources };
    }

    // Date range
    if (criteria.dateFrom || criteria.dateTo) {
      query.publishedAt = {};
      if (criteria.dateFrom) query.publishedAt.$gte = new Date(criteria.dateFrom);
      if (criteria.dateTo) query.publishedAt.$lte = new Date(criteria.dateTo);
    }

    // Importance threshold
    if (criteria.minImportance) {
      query['metrics.importance'] = { $gte: criteria.minImportance };
    }

    // Bias filter
    if (criteria.biasTypes && criteria.biasTypes.length > 0) {
      query['biasAnalysis.overall_bias'] = { $in: criteria.biasTypes };
    }

    // Execute search
    const results = await EnhancedArticle.find(query)
      .sort(criteria.sortBy || { publishedAt: -1 })
      .limit(Math.min(criteria.limit || 50, 100))
      .select('-content -extractedFacts')
      .lean();

    res.json({
      success: true,
      data: {
        results,
        total: results.length,
        criteria
      }
    });

  } catch (error) {
    console.error('Advanced search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform advanced search'
    });
  }
});

/**
 * @route GET /api/search/trending
 * @desc Get trending search terms
 */
router.get('/trending', async (req, res) => {
  try {
    // In a production system, you would track actual search queries
    // For now, we'll extract trending topics from recent articles
    
    const recentArticles = await EnhancedArticle.find({
      publishedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
      .select('title category metrics.importance')
      .sort({ 'metrics.importance': -1 })
      .limit(100)
      .lean();

    // Extract common words/phrases
    const wordFrequency = {};
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for']);

    recentArticles.forEach(article => {
      const words = article.title.toLowerCase().split(/\s+/);
      words.forEach(word => {
        word = word.replace(/[^a-z0-9]/g, '');
        if (word.length > 3 && !stopWords.has(word)) {
          wordFrequency[word] = (wordFrequency[word] || 0) + 1;
        }
      });
    });

    // Get top trending terms
    const trending = Object.entries(wordFrequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([term, count]) => ({ term, count }));

    res.json({
      success: true,
      data: trending
    });

  } catch (error) {
    console.error('Trending search error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get trending searches'
    });
  }
});

export default router;