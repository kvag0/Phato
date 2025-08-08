import Article from '../models/Article.js';
import newsAggregator from '../services/newsAggregator.js';
import geminiAnalyzer from '../services/geminiAnalyzer.js';

export const getArticles = async (req, res) => {
  try {
    const { category = 'world', page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const articles = await Article.find({ category })
      .sort({ publishedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Article.countDocuments({ category });

    res.json({
      success: true,
      data: articles,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getArticleById = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const fetchAndStoreArticles = async (req, res) => {
  try {
    const { category = 'world' } = req.body;
    
    const freshArticles = await newsAggregator.aggregateNews(category);
    
    const storedArticles = [];
    const errors = [];

    for (const articleData of freshArticles) {
      try {
        const existingArticle = await Article.findOne({ url: articleData.url });
        
        if (!existingArticle) {
          const analysis = await geminiAnalyzer.analyzeArticle(articleData);
          
          const article = new Article({
            ...articleData,
            analysis
          });
          
          await article.save();
          storedArticles.push(article);
        }
      } catch (error) {
        errors.push({ article: articleData.title, error: error.message });
      }
    }

    res.json({
      success: true,
      data: {
        fetched: freshArticles.length,
        stored: storedArticles.length,
        errors: errors.length,
        errorDetails: errors
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const analyzeArticle = async (req, res) => {
  try {
    const article = await Article.findById(req.params.id);
    
    if (!article) {
      return res.status(404).json({
        success: false,
        error: 'Article not found'
      });
    }

    const analysis = await geminiAnalyzer.analyzeArticle(article);
    
    article.analysis = analysis;
    await article.save();

    res.json({
      success: true,
      data: article
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getCategories = async (req, res) => {
  try {
    const categories = [
      { id: 'economy', name: 'Economy', icon: '💰' },
      { id: 'politics', name: 'Politics', icon: '🏛️' },
      { id: 'health', name: 'Health', icon: '🏥' },
      { id: 'environment', name: 'Environment', icon: '🌍' },
      { id: 'technology', name: 'Technology', icon: '💻' },
      { id: 'world', name: 'World News', icon: '🌐' }
    ];

    const categoryCounts = await Article.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    const countsMap = Object.fromEntries(
      categoryCounts.map(c => [c._id, c.count])
    );

    const categoriesWithCounts = categories.map(cat => ({
      ...cat,
      articleCount: countsMap[cat.id] || 0
    }));

    res.json({
      success: true,
      data: categoriesWithCounts
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};