# Phato Backend API - Complete Documentation for Frontend Integration

## 🚀 Quick Start for Frontend Developers

### Base URLs
- **Backend API**: `http://localhost:3000`
- **LLM Service**: `http://localhost:8001`
- **Vector Database (Qdrant)**: `http://localhost:6333`

### Required Services
All services must be running for full functionality:
1. MongoDB (Atlas or local)
2. Qdrant Vector Database
3. LLM Service (Gemma-3-1b-it)
4. Backend API

## 📊 Complete API Endpoints

### 1. Health & Status
```
GET /api/health
```
**Response:**
```json
{
  "status": "healthy",
  "message": "Phato API is running",
  "timestamp": "2025-01-29T12:00:00.000Z",
  "services": {
    "database": "connected",
    "vectorDB": "connected",
    "llm": "available"
  }
}
```

### 2. News Endpoints

#### Get Latest News
```
GET /api/news
```
**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20, max: 100)
- `category` (string): Filter by category
- `source` (string): Filter by source name
- `dateFrom` (ISO string): Start date
- `dateTo` (ISO string): End date
- `sortBy` (string): Sort field (publishedAt, importance, relevance)
- `order` (string): Sort order (asc, desc)

**Example Request:**
```
GET /api/news?page=1&limit=10&category=technology&sortBy=publishedAt&order=desc
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "article_id",
      "title": "Article Title",
      "description": "Article description",
      "url": "https://source.com/article",
      "source": {
        "name": "Source Name",
        "url": "https://source.com"
      },
      "author": "Author Name",
      "publishedAt": "2025-01-29T12:00:00.000Z",
      "category": "technology",
      "metrics": {
        "importance": 0.85,
        "relevance": 0.92,
        "engagement": 0.76
      },
      "imageUrl": "https://image.url",
      "language": "en"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 250,
    "pages": 25
  }
}
```

#### Get Trending News
```
GET /api/news/trending
```
**Query Parameters:**
- `limit` (number): Number of results (default: 10)
- `timeframe` (string): today, week, month

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "article_id",
      "title": "Trending Article",
      "metrics": {
        "importance": 0.95
      },
      "cluster": {
        "id": "cluster_123",
        "title": "Story Cluster Title",
        "articleCount": 15
      }
    }
  ],
  "timeframe": "today",
  "period": {
    "from": "2025-01-29T00:00:00.000Z",
    "to": "2025-01-29T23:59:59.999Z"
  }
}
```

#### Get Single Article
```
GET /api/news/:id
```
**Query Parameters:**
- `includeFacts` (boolean): Include extracted facts
- `includeBias` (boolean): Include bias analysis
- `includeRelated` (boolean): Include related articles

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "article_id",
    "title": "Article Title",
    "content": "Full article content...",
    "extractedFacts": [
      {
        "statement": "Fact statement",
        "confidence": 0.85,
        "extractedAt": "2025-01-29T12:00:00.000Z"
      }
    ],
    "biasAnalysis": {
      "overall_bias": "CENTER",
      "bias_score": 0.2,
      "linguistic_indicators": ["neutral tone", "balanced sources"]
    },
    "relatedArticles": [
      {
        "_id": "related_id",
        "title": "Related Article",
        "source": { "name": "Source" },
        "publishedAt": "2025-01-29T12:00:00.000Z"
      }
    ]
  }
}
```

#### Get Story Cluster
```
GET /api/news/cluster/:clusterId
```
**Response:**
```json
{
  "success": true,
  "data": {
    "id": "cluster_123",
    "title": "Major Story Title",
    "description": "Story description",
    "articleCount": 25,
    "articles": [...],
    "narrativeSpectrum": {
      "left": ["Article IDs"],
      "center": ["Article IDs"],
      "right": ["Article IDs"]
    },
    "biasDistribution": {
      "LEFT": 8,
      "CENTER": 10,
      "RIGHT": 7
    },
    "timeRange": {
      "start": "2025-01-28T00:00:00.000Z",
      "end": "2025-01-29T23:59:59.999Z"
    }
  }
}
```

#### Analyze Article
```
POST /api/news/:id/analyze
```
**Purpose:** Re-analyze article for bias and facts using LLM

**Response:**
```json
{
  "success": true,
  "data": {
    "articleId": "article_id",
    "biasAnalysis": {
      "overall_bias": "CENTER_LEFT",
      "confidence": 0.75
    },
    "extractedFacts": [
      {
        "statement": "Extracted fact",
        "confidence": 0.9
      }
    ],
    "analyzedAt": "2025-01-29T12:00:00.000Z"
  }
}
```

### 3. Search Endpoints

#### Hybrid Search (Main Search)
```
POST /api/search
```
**Request Body:**
```json
{
  "query": "renewable energy",
  "filters": {
    "category": "environment",
    "startDate": "2025-01-01",
    "endDate": "2025-01-29"
  },
  "limit": 20,
  "strategy": "hybrid"  // Options: hybrid, semantic, keyword
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "results": [
      {
        "_id": "article_id",
        "title": "Article Title",
        "description": "Description",
        "score": 0.92,
        "cluster": {
          "id": "cluster_id",
          "title": "Cluster Title",
          "articleCount": 5
        }
      }
    ],
    "total": 156,
    "metadata": {
      "searchStrategy": "hybrid",
      "processingTime": 250
    }
  }
}
```

#### Semantic Search (AI-Powered)
```
POST /api/search/semantic
```
**Request Body:**
```json
{
  "query": "impact of climate change on agriculture",
  "limit": 20,
  "filters": {
    "category": "environment"
  }
}
```

#### Find Similar Articles
```
GET /api/search/similar/:articleId
```
**Query Parameters:**
- `limit` (number): Max results (default: 10)

**Response:**
```json
{
  "success": true,
  "data": {
    "sourceArticle": {
      "id": "article_id",
      "title": "Source Article"
    },
    "similar": [
      {
        "_id": "similar_id",
        "title": "Similar Article",
        "score": 0.89
      }
    ]
  }
}
```

#### Temporal Search
```
POST /api/search/temporal
```
**Request Body:**
```json
{
  "query": "elections",
  "startDate": "2025-01-01",
  "endDate": "2025-01-29",
  "granularity": "day",
  "limit": 20
}
```

#### Fact Search
```
POST /api/search/facts
```
**Request Body:**
```json
{
  "query": "climate temperature rise",
  "filters": {
    "verificationStatus": "VERIFIED",
    "minConfidence": 0.7
  }
}
```

#### Autocomplete
```
GET /api/search/autocomplete?q=clim&limit=5
```

**Response:**
```json
{
  "success": true,
  "data": {
    "suggestions": ["climate", "climate change"],
    "titles": ["Climate Crisis Report", "Climate Summit 2025"]
  }
}
```

### 4. Chat Endpoints (RAG Chatbot)

#### Send Chat Message
```
POST /api/chat
```
**Request Body:**
```json
{
  "message": "What are the latest developments in renewable energy?",
  "userId": "user_123",
  "conversationId": "conv_456",  // Optional, will create new if not provided
  "options": {
    "includeFactCheck": true,
    "includeBiasAnalysis": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv_456",
    "response": "Based on recent news, renewable energy developments include...",
    "sources": [
      {
        "id": "article_id",
        "title": "Solar Energy Breakthrough",
        "source": "TechNews",
        "url": "https://...",
        "relevance": 0.92
      }
    ],
    "facts": [
      "Solar efficiency increased by 15%",
      "Wind energy costs decreased 20%"
    ],
    "factCheck": {
      "checked": 2,
      "results": [
        {
          "fact": "Solar efficiency increased by 15%",
          "status": "VERIFIED",
          "confidence": 0.85
        }
      ]
    },
    "biasAnalysis": {
      "distribution": {
        "LEFT": 2,
        "CENTER": 3,
        "RIGHT": 1
      },
      "hasMultiplePerspectives": true
    },
    "metadata": {
      "responseTime": 1250,
      "contextArticles": 5,
      "queryType": "general"
    }
  }
}
```

#### Get Conversation History
```
GET /api/chat/history/:conversationId
```

**Response:**
```json
{
  "success": true,
  "data": {
    "conversationId": "conv_456",
    "userId": "user_123",
    "messages": [
      {
        "role": "user",
        "content": "What are the latest developments?",
        "timestamp": "2025-01-29T12:00:00.000Z"
      },
      {
        "role": "assistant",
        "content": "Based on recent news...",
        "timestamp": "2025-01-29T12:00:05.000Z"
      }
    ],
    "startTime": "2025-01-29T12:00:00.000Z",
    "messageCount": 10
  }
}
```

#### Clear Conversation
```
DELETE /api/chat/history/:conversationId
```

#### Get Chat Metrics
```
GET /api/chat/metrics
```

### 5. Authentication Endpoints

#### Login
```
POST /api/auth/login
```
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token_here",
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "name": "User Name"
  }
}
```

#### Register
```
POST /api/auth/register
```
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "User Name"
}
```

#### Verify Token
```
GET /api/auth/verify
```
**Headers:**
```
Authorization: Bearer jwt_token_here
```

### 6. Categories & Sources

#### Get Categories
```
GET /api/news/categories
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "category": "technology",
      "count": 156,
      "latestArticle": "2025-01-29T12:00:00.000Z"
    },
    {
      "category": "politics",
      "count": 234,
      "latestArticle": "2025-01-29T11:30:00.000Z"
    }
  ]
}
```

#### Get Sources
```
GET /api/news/sources
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "source": "BBC News",
      "count": 450,
      "categories": ["world", "politics", "technology"],
      "avgBias": 0.15,
      "latestArticle": "2025-01-29T12:00:00.000Z"
    }
  ]
}
```

### 7. Timeline & Temporal Analysis

#### Get News Timeline
```
GET /api/news/temporal/timeline
```
**Query Parameters:**
- `startDate` (ISO string): Start date
- `endDate` (ISO string): End date
- `granularity` (string): hour, day, week, month
- `category` (string): Filter by category

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "2025-01-29",
      "count": 45,
      "categories": ["technology", "politics"],
      "avgImportance": 0.72,
      "sources": ["BBC", "CNN", "Reuters"]
    }
  ],
  "metadata": {
    "startDate": "2025-01-22",
    "endDate": "2025-01-29",
    "granularity": "day",
    "totalPeriods": 7
  }
}
```

## 🔒 Authentication

### Required Headers
For protected endpoints, include:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Token Expiration
- Tokens expire after 24 hours
- Refresh tokens are valid for 7 days

## 📈 Rate Limiting

- **General Endpoints**: 100 requests per minute
- **Search Endpoints**: 30 requests per minute
- **Chat Endpoints**: 20 requests per minute
- **LLM Analysis**: 10 requests per minute

## 🎯 Response Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Missing or invalid authentication
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

## 🔄 WebSocket Events (Real-time)

Connect to: `ws://localhost:3000`

### Events
- `news:new` - New article added
- `news:updated` - Article updated
- `cluster:formed` - New story cluster created
- `chat:response` - Chat response ready

## 💡 Frontend Integration Tips

### 1. Error Handling
Always wrap API calls in try-catch blocks:
```javascript
try {
  const response = await fetch('/api/news');
  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }
  const data = await response.json();
  // Handle data
} catch (error) {
  console.error('API Error:', error);
  // Show user-friendly error message
}
```

### 2. Pagination
Use pagination for large datasets:
```javascript
const fetchNews = async (page = 1, limit = 20) => {
  const response = await fetch(`/api/news?page=${page}&limit=${limit}`);
  const data = await response.json();
  return {
    articles: data.data,
    hasMore: page < data.pagination.pages,
    totalPages: data.pagination.pages
  };
};
```

### 3. Search Debouncing
Debounce search requests:
```javascript
const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
};

const searchArticles = debounce(async (query) => {
  const response = await fetch('/api/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query })
  });
  return response.json();
}, 300);
```

### 4. Caching Strategy
Implement client-side caching:
```javascript
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

const fetchWithCache = async (url) => {
  const cached = cache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  
  const response = await fetch(url);
  const data = await response.json();
  
  cache.set(url, { data, timestamp: Date.now() });
  return data;
};
```

## 🧪 Testing Endpoints

Use these curl commands to test:

```bash
# Health check
curl http://localhost:3000/api/health

# Get latest news
curl http://localhost:3000/api/news

# Search
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"climate change"}'

# Chat
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"What is happening with renewable energy?","userId":"test"}'
```

## 📝 Environment Variables for Frontend

Create a `.env` file in your frontend:
```env
REACT_APP_API_URL=http://localhost:3000
REACT_APP_WS_URL=ws://localhost:3000
REACT_APP_API_TIMEOUT=30000
```

## 🚀 Performance Optimization

### Recommended Practices:
1. **Use pagination** for all list endpoints
2. **Implement infinite scroll** for news feeds
3. **Cache search results** for 5 minutes
4. **Lazy load** article content
5. **Use WebSocket** for real-time updates
6. **Compress images** before displaying
7. **Implement virtual scrolling** for long lists

## 📱 Mobile Considerations

- All endpoints support mobile app integration
- Use smaller page sizes for mobile (limit=10)
- Implement offline caching
- Use progressive loading
- Optimize image sizes based on device

## 🔗 Related Documentation

- [Backend Setup Guide](./BACKEND_SETUP.md)
- [LLM Integration](./LLM_INTEGRATION.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [WebSocket Events](./WEBSOCKET_EVENTS.md)