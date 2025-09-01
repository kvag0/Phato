import express from 'express';
import { askQuestion, getConversations, getConversationById, deleteConversation } from '../controllers/chatbotController.js';
import { protect } from '../middleware/auth.js';

// A linha que importava 'ChatConversation.js' foi removida.

const router = express.Router();

/**
 * @route GET /api/news
 * @desc Get latest news articles with pagination and filters
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 20, max: 100)
 * @query {string} category - Filter by category
 * @query {string} source - Filter by source name
 * @query {string} dateFrom - Start date (ISO string)
 * @query {string} dateTo - End date (ISO string)
 * @query {string} sortBy - Sort field (date, importance, relevance)
 * @query {string} order - Sort order (asc, desc)
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      source,
      dateFrom,
      dateTo,
      sortBy = 'publishedAt',
      order = 'desc'
    } = req.query;

    // Build query
    const query = {};
    
    if (category) {
      query.category = category.toLowerCase();
    }
    
    if (source) {
      query['source.name'] = new RegExp(source, 'i');
    }
    
    if (dateFrom || dateTo) {
      query.publishedAt = {};
      if (dateFrom) query.publishedAt.$gte = new Date(dateFrom);
      if (dateTo) query.publishedAt.$lte = new Date(dateTo);
    }

    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = Math.min(parseInt(limit), 100);

    // Execute query
    const [articles, total] = await Promise.all([
      EnhancedArticle.find(query)
        .sort({ [sortBy]: order === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-content -extractedFacts -biasAnalysis')
        .lean(),
      EnhancedArticle.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: articles,
      pagination: {
        page: parseInt(page),
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum)
      }
    });

  } catch (error) {
    console.error('Error fetching news:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch news articles'
    });
  }
});

/**
 * @route GET /api/news/trending
 * @desc Get trending news based on importance and cluster size
 * @query {number} limit - Number of trending articles (default: 10)
 * @query {string} timeframe - Timeframe (today, week, month)
 */
router.get('/trending', async (req, res) => {
  try {
    const { limit = 10, timeframe = 'today' } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();
    
    switch (timeframe) {
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(now.getMonth() - 1);
        break;
      default: // today
        startDate.setHours(0, 0, 0, 0);
    }

    // Find trending articles
    const articles = await EnhancedArticle.find({
      publishedAt: { $gte: startDate },
      'metrics.importance': { $gte: 0.7 }
    })
      .sort({ 'metrics.importance': -1, 'metrics.engagement': -1 })
      .limit(parseInt(limit))
      .select('-content -extractedFacts')
      .lean();

    // Get related clusters
    const articleIds = articles.map(a => a._id);
    const clusters = await StoryCluster.find({
      articles: { $in: articleIds }
    }).select('id title articleCount').lean();

    // Enhance articles with cluster info
    const enhancedArticles = articles.map(article => {
      const cluster = clusters.find(c => 
        c.articles.some(id => id.toString() === article._id.toString())
      );
      return {
        ...article,
        cluster: cluster ? {
          id: cluster.id,
          title: cluster.title,
          articleCount: cluster.articleCount
        } : null
      };
    });

    res.json({
      success: true,
      data: enhancedArticles,
      timeframe,
      period: {
        from: startDate.toISOString(),
        to: now.toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching trending news:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch trending news'
    });
  }
});

/**
 * @route GET /api/news/:id
 * @desc Get single article by ID with full details
 * @param {string} id - Article ID
 * @query {boolean} includeFacts - Include extracted facts
 * @query {boolean} includeBias - Include bias analysis
 * @query {boolean} includeRelated - Include related articles
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      includeFacts = false, 
      includeBias = false,
      includeRelated = false 
    } = req.query;

    // Build projection
    const projection = {};
    if (!includeFacts) projection.extractedFacts = 0;
    if (!includeBias) projection.biasAnalysis = 0;

    // Get article
    const article = await EnhancedArticle.findById(id)
      .select(projection)
      .lean();

    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    // Get related articles if requested
    let relatedArticles = [];
    if (includeRelated) {
      // Find by cluster
      const cluster = await StoryCluster.findOne({
        articles: article._id
      }).select('articles').lean();

      if (cluster) {
        relatedArticles = await EnhancedArticle.find({
          _id: { 
            $in: cluster.articles,
            $ne: article._id
          }
        })
          .limit(5)
          .select('title source publishedAt url')
          .lean();
      }
    }

    // Get fact verification if facts included
    let factVerification = null;
    if (includeFacts && article.extractedFacts?.length > 0) {
      const factIds = article.extractedFacts.map(f => f.factId).filter(Boolean);
      if (factIds.length > 0) {
        const facts = await Fact.find({
          _id: { $in: factIds }
        }).select('statement verificationStatus confidence').lean();
        factVerification = facts;
      }
    }

    res.json({
      success: true,
      data: {
        ...article,
        relatedArticles,
        factVerification
      }
    });

  } catch (error) {
    console.error('Error fetching article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch article'
    });
  }
});

/**
 * @route GET /api/news/cluster/:clusterId
 * @desc Get all articles in a story cluster
 * @param {string} clusterId - Cluster ID
 */
router.get('/cluster/:clusterId', async (req, res) => {
  try {
    const { clusterId } = req.params;

    // Get cluster
    const cluster = await StoryCluster.findOne({ id: clusterId })
      .populate({
        path: 'articles',
        select: 'title source publishedAt url biasAnalysis.overall_bias'
      })
      .lean();

    if (!cluster) {
      return res.status(404).json({
        success: false,
        error: 'Story cluster not found'
      });
    }

    // Analyze narrative spectrum
    const biasDistribution = {};
    cluster.articles.forEach(article => {
      if (article.biasAnalysis?.overall_bias) {
        const bias = article.biasAnalysis.overall_bias;
        biasDistribution[bias] = (biasDistribution[bias] || 0) + 1;
      }
    });

    res.json({
      success: true,
      data: {
        id: cluster.id,
        title: cluster.title,
        description: cluster.description,
        articleCount: cluster.articleCount,
        articles: cluster.articles,
        narrativeSpectrum: cluster.narrativeSpectrum,
        biasDistribution,
        timeRange: cluster.timeRange,
        lastUpdated: cluster.lastUpdated
      }
    });

  } catch (error) {
    console.error('Error fetching cluster:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch story cluster'
    });
  }
});

/**
 * @route GET /api/news/temporal/timeline
 * @desc Get news timeline for temporal analysis
 * @query {string} startDate - Start date (ISO string)
 * @query {string} endDate - End date (ISO string)
 * @query {string} granularity - Time granularity (hour, day, week, month)
 * @query {string} category - Filter by category
 */
router.get('/temporal/timeline', async (req, res) => {
  try {
    const {
      startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate = new Date().toISOString(),
      granularity = 'day',
      category
    } = req.query;

    // Build aggregation pipeline
    const match = {
      publishedAt: {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      }
    };

    if (category) {
      match.category = category;
    }

    // Define date format based on granularity
    const dateFormats = {
      hour: '%Y-%m-%d %H:00',
      day: '%Y-%m-%d',
      week: '%Y-W%V',
      month: '%Y-%m'
    };

    const pipeline = [
      { $match: match },
      {
        $group: {
          _id: {
            $dateToString: {
              format: dateFormats[granularity] || dateFormats.day,
              date: '$publishedAt'
            }
          },
          count: { $sum: 1 },
          categories: { $addToSet: '$category' },
          avgImportance: { $avg: '$metrics.importance' },
          sources: { $addToSet: '$source.name' }
        }
      },
      { $sort: { _id: 1 } }
    ];

    const timeline = await EnhancedArticle.aggregate(pipeline);

    res.json({
      success: true,
      data: timeline,
      metadata: {
        startDate,
        endDate,
        granularity,
        totalPeriods: timeline.length
      }
    });

  } catch (error) {
    console.error('Error generating timeline:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate timeline'
    });
  }
});

/**
 * @route POST /api/news/:id/analyze
 * @desc Analyze article for bias and facts
 * @param {string} id - Article ID
 */
router.post('/:id/analyze', async (req, res) => {
  try {
    const { id } = req.params;

    // Get article
    const article = await EnhancedArticle.findById(id);
    
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    // Check if LLM service is available
    const llmHealth = await localLLMClient.checkHealth();
    
    if (!llmHealth.available) {
      return res.status(503).json({
        success: false,
        error: 'Analysis service temporarily unavailable'
      });
    }

    // Perform analysis
    const [biasAnalysis, factExtraction] = await Promise.all([
      localLLMClient.analyzeBias(article.content),
      localLLMClient.extractFacts(article.content)
    ]);

    // Update article with analysis
    article.biasAnalysis = biasAnalysis;
    article.extractedFacts = factExtraction.facts?.map(fact => ({
      statement: fact,
      confidence: 0.8,
      extractedAt: new Date()
    })) || [];

    await article.save();

    res.json({
      success: true,
      data: {
        articleId: article._id,
        biasAnalysis,
        extractedFacts: article.extractedFacts,
        analyzedAt: new Date()
      }
    });

  } catch (error) {
    console.error('Error analyzing article:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze article'
    });
  }
});

/**
 * @route GET /api/news/categories
 * @desc Get available news categories with counts
 */
router.get('/categories', async (req, res) => {
  try {
    const categories = await EnhancedArticle.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          latestArticle: { $max: '$publishedAt' }
        }
      },
      {
        $project: {
          category: '$_id',
          count: 1,
          latestArticle: 1,
          _id: 0
        }
      },
      { $sort: { count: -1 } }
    ]);

    res.json({
      success: true,
      data: categories
    });

  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch categories'
    });
  }
});

/**
 * @route GET /api/news/sources
 * @desc Get available news sources with statistics
 */
router.get('/sources', async (req, res) => {
  try {
    const sources = await EnhancedArticle.aggregate([
      {
        $group: {
          _id: '$source.name',
          count: { $sum: 1 },
          categories: { $addToSet: '$category' },
          avgBias: { $avg: { $ifNull: ['$biasAnalysis.bias_score', 0] } },
          latestArticle: { $max: '$publishedAt' }
        }
      },
      {
        $project: {
          source: '$_id',
          count: 1,
          categories: 1,
          avgBias: { $round: ['$avgBias', 2] },
          latestArticle: 1,
          _id: 0
        }
      },
      { $sort: { count: -1 } },
      { $limit: 50 }
    ]);

    res.json({
      success: true,
      data: sources
    });

  } catch (error) {
    console.error('Error fetching sources:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch sources'
    });
  }
});

export default router;