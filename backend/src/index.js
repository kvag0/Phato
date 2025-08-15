import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database.js';
import articleRoutes from './routes/articleRoutes.js';
import chatbotRoutes from './routes/chatbotRoutes.js';



dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

connectDB();

// Configure CORS to work with ngrok and other origins
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [];
    const defaultOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'];
    const allOrigins = [...allowedOrigins, ...defaultOrigins];
    
    // Allow requests with no origin (like mobile apps or Postman)
    if (!origin) return callback(null, true);
    
    // Allow any ngrok URL
    if (origin.includes('.ngrok.io') || origin.includes('.ngrok-free.app')) {
      return callback(null, true);
    }
    
    // Check if origin is in allowed list
    if (allOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else if (process.env.ALLOW_ALL_ORIGINS === 'true') {
      // Development mode - allow all origins
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'ngrok-skip-browser-warning']
};

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Phato Backend API'
  });
});

app.use('/api/articles', articleRoutes);

app.use('/api/chatbot', chatbotRoutes);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error'
  });
});

// DENTRO DE phato/backend/src/index.js

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT} and listening on all interfaces`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});