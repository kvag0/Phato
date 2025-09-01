import express from 'express';
// A importação do modelo 'ChatConversation' foi removida.
// Os controladores corretos já estão a ser importados.
import { 
    askQuestion, 
    getConversations, 
    getConversationById, 
    deleteConversation 
} from '../controllers/chatbotController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
/**
 * @route POST /api/chat/message
 * @desc Send a message to the RAG chatbot
 * @body {string} message - User message
 * @body {string} conversationId - Optional conversation ID
 * @body {string} userId - User ID
 * @body {object} options - Optional chat options
 */
router.post('/message', async (req, res) => {
  try {
    const { 
      message, 
      conversationId, 
      userId = 'anonymous',
      options = {} 
    } = req.body;

    // Validate input
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Message is required and must be a string'
      });
    }

    if (message.length > 1000) {
      return res.status(400).json({
        success: false,
        error: 'Message too long (max 1000 characters)'
      });
    }

    // Process chat message
    const response = await ragChatbotService.chat({
      message,
      userId,
      conversationId,
      options
    });

    res.json({
      success: true,
      data: response
    });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process chat message',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

/**
 * @route GET /api/chat/conversation/:conversationId
 * @desc Get conversation history
 * @param {string} conversationId - Conversation ID
 */
router.get('/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;

    const history = await ragChatbotService.getConversationHistory(conversationId);

    if (!history) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      data: history
    });

  } catch (error) {
    console.error('Error fetching conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversation history'
    });
  }
});

/**
 * @route DELETE /api/chat/conversation/:conversationId
 * @desc Clear conversation history
 * @param {string} conversationId - Conversation ID
 */
router.delete('/conversation/:conversationId', async (req, res) => {
  try {
    const { conversationId } = req.params;

    const cleared = await ragChatbotService.clearConversation(conversationId);

    if (!cleared) {
      return res.status(404).json({
        success: false,
        error: 'Conversation not found'
      });
    }

    res.json({
      success: true,
      message: 'Conversation cleared successfully'
    });

  } catch (error) {
    console.error('Error clearing conversation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to clear conversation'
    });
  }
});

/**
 * @route GET /api/chat/conversations/:userId
 * @desc Get all conversations for a user
 * @param {string} userId - User ID
 * @query {number} limit - Max conversations to return (default: 10)
 */
router.get('/conversations/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 10 } = req.query;

    const conversations = await ChatConversation.find({ userId })
      .sort({ lastActivity: -1 })
      .limit(parseInt(limit))
      .select('conversationId metadata.startTime messages lastActivity')
      .lean();

    // Format response
    const formattedConversations = conversations.map(conv => ({
      conversationId: conv.conversationId,
      startTime: conv.metadata?.startTime,
      lastActivity: conv.lastActivity,
      messageCount: conv.messages?.length || 0,
      preview: conv.messages?.[0]?.content?.substring(0, 100)
    }));

    res.json({
      success: true,
      data: formattedConversations
    });

  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch conversations'
    });
  }
});

/**
 * @route POST /api/chat/fact-check
 * @desc Fact-check a statement using the news database
 * @body {string} statement - Statement to fact-check
 * @body {array} sources - Optional source articles for context
 */
router.post('/fact-check', async (req, res) => {
  try {
    const { statement, sources = [] } = req.body;

    if (!statement || typeof statement !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Statement is required and must be a string'
      });
    }

    // Use chatbot service to fact-check
    const response = await ragChatbotService.chat({
      message: `Fact check: ${statement}`,
      userId: 'fact-check-api',
      conversationId: uuidv4(),
      options: {
        factCheckMode: true
      }
    });

    res.json({
      success: true,
      data: {
        statement,
        factCheck: response.factCheck,
        sources: response.sources,
        confidence: response.factCheck?.results?.[0]?.confidence || 0
      }
    });

  } catch (error) {
    console.error('Fact-check error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fact-check statement'
    });
  }
});

/**
 * @route POST /api/chat/analyze-bias
 * @desc Analyze bias in a text or set of articles
 * @body {string} text - Text to analyze
 * @body {array} articleIds - Optional article IDs to analyze
 */
router.post('/analyze-bias', async (req, res) => {
  try {
    const { text, articleIds = [] } = req.body;

    if (!text && articleIds.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Either text or articleIds is required'
      });
    }

    // Use chatbot service for bias analysis
    const response = await ragChatbotService.chat({
      message: `Analyze bias in: ${text || 'the provided articles'}`,
      userId: 'bias-analysis-api',
      conversationId: uuidv4(),
      options: {
        biasAnalysisMode: true,
        articleIds
      }
    });

    res.json({
      success: true,
      data: {
        biasAnalysis: response.biasAnalysis,
        sources: response.sources,
        recommendation: response.biasAnalysis?.warning || 
          'Consider checking multiple sources for balanced perspective'
      }
    });

  } catch (error) {
    console.error('Bias analysis error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to analyze bias'
    });
  }
});

/**
 * @route GET /api/chat/suggestions
 * @desc Get conversation starter suggestions based on trending topics
 */
router.get('/suggestions', async (req, res) => {
  try {
    // Get trending topics from recent articles
    const EnhancedArticle = (await import('../models/EnhancedArticle.js')).default;
    
    const recentArticles = await EnhancedArticle.find({
      publishedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) }
    })
      .sort({ 'metrics.importance': -1 })
      .limit(10)
      .select('title category')
      .lean();

    // Generate suggestions based on trending topics
    const suggestions = [
      'What are the latest developments in climate change?',
      'Tell me about recent technology breakthroughs',
      'What\'s happening in global politics today?',
      'Are there any major economic updates?',
      'What health news should I know about?'
    ];

    // Add dynamic suggestions based on recent articles
    if (recentArticles.length > 0) {
      const topCategories = [...new Set(recentArticles.map(a => a.category))];
      topCategories.slice(0, 3).forEach(category => {
        suggestions.push(`What's new in ${category}?`);
      });
    }

    res.json({
      success: true,
      data: suggestions.slice(0, 8)
    });

  } catch (error) {
    console.error('Error generating suggestions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate suggestions'
    });
  }
});

/**
 * @route GET /api/chat/metrics
 * @desc Get chatbot service metrics
 */
router.get('/metrics', async (req, res) => {
  try {
    const metrics = ragChatbotService.getMetrics();

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Error fetching metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch metrics'
    });
  }
});

export default router;