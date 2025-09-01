# 📚 Phato API Documentation

## 🚀 Base URL
```
Development: http://localhost:3000/api
Production: https://api.phato.app/api
```

## 🔐 Authentication

### Overview
The API supports three authentication methods:
1. **JWT Bearer Token** - For registered users
2. **API Key** - For programmatic access
3. **Guest Token** - For anonymous users

### Headers
```http
Authorization: Bearer <jwt_token>
X-API-Key: <api_key>
```

## 📍 Endpoints

### Authentication

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword",
  "name": "John Doe"
}

Response:
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    }
  }
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepassword"
}

Response:
{
  "success": true,
  "data": {
    "token": "jwt_token",
    "user": {
      "id": "user_id",
      "email": "user@example.com",
      "name": "John Doe",
      "role": "user"
    }
  }
}
```

#### Guest Access
```http
POST /api/auth/guest

Response:
{
  "success": true,
  "data": {
    "token": "guest_jwt_token",
    "user": {
      "id": "guest_uuid",
      "role": "guest"
    }
  }
}
```

### News Operations

#### Get Latest News
```http
GET /api/news?page=1&limit=20&category=technology

Query Parameters:
- page: Page number (default: 1)
- limit: Items per page (default: 20, max: 100)
- category: Filter by category
- source: Filter by source name
- dateFrom: Start date (ISO string)
- dateTo: End date (ISO string)
- sortBy: Sort field (date, importance, relevance)
- order: Sort order (asc, desc)

Response:
{
  "success": true,
  "data": [
    {
      "_id": "article_id",
      "title": "Article Title",
      "description": "Article description",
      "source": {
        "name": "Source Name"
      },
      "publishedAt": "2024-01-20T10:00:00Z",
      "category": "technology",
      "url": "https://example.com/article",
      "metrics": {
        "importance": 0.85
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

#### Get Trending News
```http
GET /api/news/trending?limit=10&timeframe=today

Query Parameters:
- limit: Number of articles (default: 10)
- timeframe: today, week, month

Response:
{
  "success": true,
  "data": [
    {
      "_id": "article_id",
      "title": "Trending Article",
      "cluster": {
        "id": "cluster_id",
        "title": "Story Title",
        "articleCount": 15
      }
    }
  ],
  "timeframe": "today",
  "period": {
    "from": "2024-01-20T00:00:00Z",
    "to": "2024-01-20T23:59:59Z"
  }
}
```

#### Get Single Article
```http
GET /api/news/{id}?includeFacts=true&includeBias=true&includeRelated=true

Query Parameters:
- includeFacts: Include extracted facts
- includeBias: Include bias analysis
- includeRelated: Include related articles

Response:
{
  "success": true,
  "data": {
    "_id": "article_id",
    "title": "Article Title",
    "content": "Full article content...",
    "extractedFacts": [...],
    "biasAnalysis": {...},
    "relatedArticles": [...],
    "factVerification": [...]
  }
}
```

### Chat & RAG

#### Send Chat Message
```http
POST /api/chat/message
Content-Type: application/json
Authorization: Bearer <token>

{
  "message": "What's happening in climate news?",
  "conversationId": "optional_conversation_id",
  "userId": "user_id",
  "options": {
    "factCheckMode": false
  }
}

Response:
{
  "success": true,
  "data": {
    "conversationId": "conversation_id",
    "response": "Based on recent news...",
    "sources": [
      {
        "id": "article_id",
        "title": "Article Title",
        "source": "News Source",
        "url": "https://...",
        "relevance": 0.92
      }
    ],
    "facts": [...],
    "factCheck": {...},
    "biasAnalysis": {...},
    "metadata": {
      "responseTime": 145,
      "contextArticles": 5,
      "queryType": "general"
    }
  }
}
```

#### Fact Check
```http
POST /api/chat/fact-check
Content-Type: application/json

{
  "statement": "The Earth's temperature has risen by 1.1°C since 1880",
  "sources": []
}

Response:
{
  "success": true,
  "data": {
    "statement": "...",
    "factCheck": {
      "checked": 1,
      "results": [
        {
          "fact": "...",
          "status": "verified",
          "confidence": 0.95,
          "explanation": "..."
        }
      ]
    },
    "sources": [...],
    "confidence": 0.95
  }
}
```

### Search

#### Main Search
```http
POST /api/search
Content-Type: application/json

{
  "query": "climate change policies",
  "filters": {
    "category": "environment",
    "startDate": "2024-01-01"
  },
  "limit": 20,
  "strategy": "hybrid"
}

Response:
{
  "success": true,
  "data": {
    "results": [...],
    "total": 45,
    "metadata": {
      "searchTime": 85,
      "strategy": "hybrid"
    }
  }
}
```

#### Semantic Search
```http
POST /api/search/semantic
Content-Type: application/json

{
  "query": "global warming effects on agriculture",
  "limit": 10
}
```

#### Find Similar Articles
```http
GET /api/search/similar/{articleId}?limit=10

Response:
{
  "success": true,
  "data": {
    "sourceArticle": {
      "id": "article_id",
      "title": "Original Article"
    },
    "similar": [...]
  }
}
```

#### Temporal Search
```http
POST /api/search/temporal
Content-Type: application/json

{
  "query": "elections",
  "startDate": "2024-01-01",
  "endDate": "2024-01-31",
  "granularity": "day"
}
```

#### Advanced Search
```http
POST /api/search/advanced
Content-Type: application/json

{
  "criteria": {
    "text": "climate",
    "categories": ["environment", "science"],
    "sources": ["BBC", "Reuters"],
    "dateFrom": "2024-01-01",
    "minImportance": 0.7,
    "biasTypes": ["neutral", "slightly_left"]
  }
}
```

## 🔒 Rate Limiting

- **Default**: 100 requests per 15 minutes per IP
- **Authenticated**: 500 requests per 15 minutes
- **API Key**: 1000 requests per 15 minutes

Headers in response:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 2024-01-20T10:15:00Z
```

## 📊 Response Format

### Success Response
```json
{
  "success": true,
  "data": {...}
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message",
  "details": "Additional error details (dev only)"
}
```

## 🌍 CORS

Allowed origins (configurable):
- `http://localhost:3000`
- `http://localhost:3001`
- `http://localhost:5173`
- Your mobile app domains

## 📱 Mobile SDK Examples

### React Native
```javascript
import axios from 'axios';

const API_BASE = 'https://api.phato.app';
const token = 'your_jwt_token';

// Setup axios instance
const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});

// Get news
const getNews = async () => {
  const response = await api.get('/api/news', {
    params: {
      page: 1,
      limit: 20,
      category: 'technology'
    }
  });
  return response.data;
};

// Send chat message
const sendMessage = async (message) => {
  const response = await api.post('/api/chat/message', {
    message,
    userId: 'user_id'
  });
  return response.data;
};
```

### Flutter
```dart
import 'package:http/http.dart' as http;
import 'dart:convert';

class PhatoAPI {
  final String baseUrl = 'https://api.phato.app';
  final String token;
  
  PhatoAPI(this.token);
  
  Future<Map> getNews({int page = 1, String? category}) async {
    final uri = Uri.parse('$baseUrl/api/news').replace(
      queryParameters: {
        'page': page.toString(),
        if (category != null) 'category': category,
      }
    );
    
    final response = await http.get(
      uri,
      headers: {
        'Authorization': 'Bearer $token',
      }
    );
    
    return json.decode(response.body);
  }
}
```

## 🔧 Health Checks

### Basic Health
```http
GET /health

Response:
{
  "success": true,
  "status": "healthy",
  "timestamp": "2024-01-20T10:00:00Z",
  "uptime": 3600,
  "environment": "production"
}
```

### Detailed Health
```http
GET /health/detailed

Response:
{
  "success": true,
  "status": "healthy",
  "services": {
    "mongodb": true,
    "qdrant": true,
    "embeddings": true,
    "llm": true
  },
  "timestamp": "2024-01-20T10:00:00Z"
}
```

## 🚨 Error Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 429 | Too Many Requests |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

## 📝 Examples

### Complete Chat Flow
```javascript
// 1. Get guest token
const { data: auth } = await fetch('/api/auth/guest', {
  method: 'POST'
}).then(r => r.json());

// 2. Send message
const { data: chat } = await fetch('/api/chat/message', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${auth.token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    message: 'What are the latest climate news?',
    userId: auth.user.id
  })
}).then(r => r.json());

// 3. Get conversation history
const { data: history } = await fetch(`/api/chat/conversation/${chat.conversationId}`, {
  headers: {
    'Authorization': `Bearer ${auth.token}`
  }
}).then(r => r.json());
```

### Search and Analyze
```javascript
// 1. Search for articles
const { data: search } = await fetch('/api/search', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    query: 'renewable energy',
    limit: 10
  })
}).then(r => r.json());

// 2. Analyze article for bias
const articleId = search.results[0]._id;
const { data: analysis } = await fetch(`/api/news/${articleId}/analyze`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  }
}).then(r => r.json());
```

## 🛠️ Development

### Test Accounts
```
Email: demo@phato.app
Password: demo123

Email: admin@phato.app
Password: admin123
```

### Postman Collection
Download the [Postman Collection](./phato-api.postman_collection.json) for easy testing.

### Rate Limit Testing
```bash
# Test rate limiting
for i in {1..110}; do
  curl -X GET "http://localhost:3000/api/news" \
    -H "Authorization: Bearer $TOKEN"
done
```

---

📧 **Support**: api@phato.app
🐛 **Issues**: [GitHub Issues](https://github.com/phato/backend/issues)
📖 **Updates**: [Changelog](./CHANGELOG.md)