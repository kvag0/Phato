# Phato Backend API

## Overview

The Phato backend is a Node.js-based REST API that aggregates news from multiple sources, processes them using AI analysis, and provides structured access to both factual content and different narrative perspectives.

## Features

- 📰 Multi-source news aggregation (NewsAPI, The Guardian, NYT)
- 🤖 AI-powered content analysis using Google Gemini
- 📊 Fact extraction using 5W1H framework
- 🎭 Multiple perspective narrative analysis
- 🗄️ MongoDB for data persistence
- 🔒 CORS-enabled for secure frontend communication
- 🚀 ES6 modules with modern JavaScript

## Prerequisites

- Node.js 18+ 
- MongoDB 6+
- API keys for:
  - Google Gemini AI (required)
  - At least one news source API (NewsAPI, Guardian, or NYT)

## Installation

1. Navigate to the backend directory:
```bash
cd backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
```

4. Configure your environment variables in `.env`:
```env
MONGODB_URI=mongodb://localhost:27017/phato
GEMINI_API_KEY=your_gemini_api_key
NEWS_API_KEY=your_newsapi_key
# ... other API keys
```

## Running the Application

### Development Mode
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

## API Endpoints

### Health Check
- `GET /health` - Check API status

### Articles
- `GET /api/articles` - Get paginated articles
  - Query params: `category`, `page`, `limit`
- `GET /api/articles/:id` - Get single article by ID
- `POST /api/articles/fetch` - Fetch and store new articles
  - Body: `{ "category": "world" }`
- `POST /api/articles/:id/analyze` - Re-analyze specific article

### Categories
- `GET /api/articles/categories` - Get all categories with article counts

## Available Categories

- `economy` - Economic news
- `politics` - Political news
- `health` - Health-related news
- `environment` - Environmental news
- `technology` - Tech news
- `world` - World news (default)

## Database Schema

The Article model includes:
- Core article data (title, URL, source, author, etc.)
- AI analysis results (facts and narratives)
- Metadata (timestamps, tags, language)

## AI Analysis Structure

### Facts (5W1H)
```json
{
  "who": ["People/organizations involved"],
  "what": "What happened",
  "when": "When it happened",
  "where": ["Locations"],
  "why": "Reason if stated",
  "summary": "Brief factual summary"
}
```

### Narratives
```json
[{
  "perspective": "political-leaning",
  "title": "Perspective headline",
  "summary": "Perspective summary",
  "emphasis": ["Key points"],
  "interpretation": "How facts are interpreted"
}]
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `MONGODB_URI` | MongoDB connection string | Yes |
| `GEMINI_API_KEY` | Google Gemini API key | Yes |
| `NEWS_API_KEY` | NewsAPI.org API key | No* |
| `GUARDIAN_API_KEY` | Guardian API key | No* |
| `NYT_API_KEY` | New York Times API key | No* |
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | No |
| `ALLOW_ALL_ORIGINS` | Allow all origins (dev only) | No |

*At least one news API key is recommended

## Development

### Project Structure
```
backend/
├── src/
│   ├── config/         # Database configuration
│   ├── controllers/    # Request handlers
│   ├── models/         # Database schemas
│   ├── routes/         # API routes
│   ├── services/       # Business logic
│   └── index.js        # Entry point
├── package.json
└── .env.example
```

### Testing
```bash
npm test
```

## Deployment

1. Set production environment variables
2. Ensure MongoDB is accessible
3. Run with process manager (PM2 recommended):
```bash
pm2 start src/index.js --name phato-backend
```

## API Rate Limits

Be aware of rate limits for external APIs:
- NewsAPI: 500 requests/day (free tier)
- Guardian: 5,000 requests/day
- NYT: 500 requests/day
- Gemini: Check Google AI Studio for limits
