import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import os from 'os';
import { 
  authenticate, 
  rateLimit, 
  corsOptions, 
  securityHeaders, 
  requestLogger 
} from './middleware/auth.js';

// Load environment variables
dotenv.config();

// Import routes
import newsRoutes from './routes/newsRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import searchRoutes from './routes/searchRoutes.js';
import authRoutes from './routes/authRoutes.js';

// Import services
import ragChatbotService from './services/chat/RAGChatbotService.js';
import hybridSearchService from './services/vector/HybridSearchService.js';
import embeddingService from './services/vector/EmbeddingService.js';
import qdrantDB from './config/qdrantDB.js';

// Create Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet()); // Security headers
app.use(compression()); // Response compression
app.use(cors(corsOptions)); // CORS
app.use(express.json({ limit: '10mb' })); // JSON parsing
app.use(express.urlencoded({ extended: true })); // URL encoding
app.use(requestLogger); // Request logging
app.use(securityHeaders); // Additional security

// Rate limiting
app.use('/api/', rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
}));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Detailed health check
app.get('/health/detailed', async (req, res) => {
  try {
    const checks = {
      mongodb: mongoose.connection.readyState === 1,
      qdrant: false,
      embeddings: false,
      llm: false
    };

    // Check Qdrant
    try {
      checks.qdrant = await qdrantDB.testConnection();
    } catch (error) {
      console.error('Qdrant health check failed:', error.message);
    }

    // Check embedding service
    try {
      checks.embeddings = embeddingService.initialized;
    } catch (error) {
      console.error('Embedding health check failed:', error.message);
    }

    // Check LLM service
    try {
      const { default: localLLMClient } = await import('./services/llm/LocalLLMClient.js');
      const llmHealth = await localLLMClient.checkHealth();
      checks.llm = llmHealth.available;
    } catch (error) {
      console.error('LLM health check failed:', error.message);
    }

    const allHealthy = Object.values(checks).every(v => v === true);

    res.status(allHealthy ? 200 : 503).json({
      success: allHealthy,
      status: allHealthy ? 'healthy' : 'degraded',
      services: checks,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      status: 'error',
      error: error.message
    });
  }
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/news', authenticate, newsRoutes);
app.use('/api/chat', authenticate, chatRoutes);
app.use('/api/search', authenticate, searchRoutes);

// API documentation endpoint
app.get('/api', (req, res) => {
  res.json({
    success: true,
    name: 'Phato API',
    version: '1.0.0',
    description: 'Truth-committed news aggregation with AI-powered analysis',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        guest: 'POST /api/auth/guest',
        refresh: 'POST /api/auth/refresh',
        me: 'GET /api/auth/me'
      },
      news: {
        list: 'GET /api/news',
        trending: 'GET /api/news/trending',
        article: 'GET /api/news/:id',
        cluster: 'GET /api/news/cluster/:clusterId',
        timeline: 'GET /api/news/temporal/timeline',
        analyze: 'POST /api/news/:id/analyze',
        categories: 'GET /api/news/categories',
        sources: 'GET /api/news/sources'
      },
      chat: {
        message: 'POST /api/chat/message',
        conversation: 'GET /api/chat/conversation/:conversationId',
        clear: 'DELETE /api/chat/conversation/:conversationId',
        userConversations: 'GET /api/chat/conversations/:userId',
        factCheck: 'POST /api/chat/fact-check',
        analyzeBias: 'POST /api/chat/analyze-bias',
        suggestions: 'GET /api/chat/suggestions',
        metrics: 'GET /api/chat/metrics'
      },
      search: {
        main: 'POST /api/search',
        semantic: 'POST /api/search/semantic',
        similar: 'GET /api/search/similar/:id',
        temporal: 'POST /api/search/temporal',
        facts: 'POST /api/search/facts',
        autocomplete: 'GET /api/search/autocomplete',
        advanced: 'POST /api/search/advanced',
        trending: 'GET /api/search/trending'
      }
    },
    documentation: '/api/docs',
    health: '/health',
    healthDetailed: '/health/detailed'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.path
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Initialize services and start server
async function startServer() {
  try {
    console.log('🚀 Starting Phato Backend Server...\n');

    // Connect to MongoDB
    console.log('📊 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB connected successfully');

    // Initialize Qdrant
    console.log('🔍 Initializing Qdrant vector database...');
    const qdrantConnected = await qdrantDB.initialize();
    if (qdrantConnected) {
      console.log('✅ Qdrant initialized successfully');
    } else {
      console.log('⚠️  Qdrant not available - vector search disabled');
    }

    // Initialize embedding service
    console.log('🧠 Initializing embedding service...');
    try {
      await embeddingService.initialize();
      console.log('✅ Embedding service initialized');
    } catch (error) {
      console.log('⚠️  Embedding service initialization failed:', error.message);
      console.log('   Continuing without embeddings - search functionality limited');
    }

    // Initialize hybrid search (will work without embeddings)
    console.log('🔎 Initializing hybrid search service...');
    try {
      await hybridSearchService.initialize();
      console.log('✅ Hybrid search service initialized');
    } catch (error) {
      console.log('⚠️  Hybrid search initialization failed:', error.message);
    }

    // Initialize chatbot service
    console.log('🤖 Initializing RAG chatbot service...');
    try {
      await ragChatbotService.initialize();
      console.log('✅ RAG chatbot service initialized');
    } catch (error) {
      console.log('⚠️  Chatbot initialization failed:', error.message);
    }

    // Start server
    app.listen(PORT, () => {
      console.log('\n' + '='.repeat(60));
      console.log('🎉 PHATO BACKEND SERVER RUNNING');
      console.log('='.repeat(60));
      console.log(`📍 Local:    http://localhost:${PORT}`);
      console.log(`📍 Network:  http://${getNetworkAddress()}:${PORT}`);
      console.log(`📍 API Docs: http://localhost:${PORT}/api`);
      console.log(`📍 Health:   http://localhost:${PORT}/health`);
      console.log('='.repeat(60));
      console.log('\n💡 Tips:');
      console.log('  - Test the API: curl http://localhost:3000/health');
      console.log('  - Get guest token: curl -X POST http://localhost:3000/api/auth/guest');
      
      if (process.env.NODE_ENV === 'development') {
        console.log('\n📧 Demo accounts:');
        console.log('  - demo@phato.app / demo123');
        console.log('  - admin@phato.app / admin123');
      }
      
      console.log('\n✨ Ready for mobile app connections!\n');
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Get network IP address
function getNetworkAddress() {
  const interfaces = os.networkInterfaces();
  
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  
  return 'localhost';
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  console.log('\n📛 SIGTERM received, shutting down gracefully...');
  
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed');
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n📛 SIGINT received, shutting down gracefully...');
  
  await mongoose.connection.close();
  console.log('✅ MongoDB connection closed');
  
  process.exit(0);
});

// Start the server
startServer().catch(console.error);

export default app;