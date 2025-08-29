# Frontend Integration Guide for Phato Backend

## 🎯 Overview

This guide provides everything frontend developers need to integrate with the Phato backend API, including setup, best practices, and common patterns.

## 🚀 Quick Setup

### 1. Prerequisites
Ensure these services are running:
```bash
# Check MongoDB connection
curl http://localhost:3000/api/health

# Check LLM service
curl http://localhost:8001/

# Check Qdrant vector database
curl http://localhost:6333/collections
```

### 2. Backend Services Status
The backend provides multiple AI-powered services:

| Service | Port | Purpose | Status Check |
|---------|------|---------|--------------|
| Backend API | 3000 | Main REST API | `/api/health` |
| LLM Service | 8001 | Text generation & analysis | `/` |
| Qdrant | 6333 | Vector search | `/collections` |
| MongoDB | 27017 | Data persistence | Via backend health |

## 🏗️ Architecture Overview

```
Frontend Application
        ↓
    REST API (Port 3000)
        ↓
    ┌───────────────────────────┐
    │     Backend Services      │
    ├───────────────────────────┤
    │ • News Aggregation        │
    │ • RAG Chatbot            │
    │ • Semantic Search        │
    │ • Bias Analysis          │
    │ • Fact Extraction        │
    └───────────────────────────┘
        ↓           ↓           ↓
    MongoDB    Qdrant    LLM Service
```

## 📦 Core Features for Frontend

### 1. News Feed Component
```javascript
// Example: Fetching paginated news
const NewsFeeed = () => {
  const [articles, setArticles] = useState([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);

  const fetchNews = async (pageNum) => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3000/api/news?page=${pageNum}&limit=20`
      );
      const data = await response.json();
      
      if (data.success) {
        setArticles(prev => [...prev, ...data.data]);
        setHasMore(pageNum < data.pagination.pages);
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNews(page);
  }, [page]);

  return (
    <div>
      {articles.map(article => (
        <ArticleCard key={article._id} article={article} />
      ))}
      {hasMore && (
        <button onClick={() => setPage(p => p + 1)}>
          Load More
        </button>
      )}
    </div>
  );
};
```

### 2. AI-Powered Chat Component
```javascript
// Example: RAG Chatbot integration
const ChatInterface = () => {
  const [messages, setMessages] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (message) => {
    setLoading(true);
    
    // Add user message to UI immediately
    setMessages(prev => [...prev, {
      role: 'user',
      content: message,
      timestamp: new Date()
    }]);

    try {
      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          userId: getUserId(), // Your user ID logic
          conversationId,
          options: {
            includeFactCheck: true,
            includeBiasAnalysis: true
          }
        })
      });

      const data = await response.json();
      
      if (data.success) {
        // Update conversation ID for future messages
        if (!conversationId) {
          setConversationId(data.data.conversationId);
        }

        // Add AI response
        setMessages(prev => [...prev, {
          role: 'assistant',
          content: data.data.response,
          sources: data.data.sources,
          facts: data.data.facts,
          timestamp: new Date()
        }]);
      }
    } catch (error) {
      console.error('Chat error:', error);
      // Show error message to user
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="chat-container">
      <div className="messages">
        {messages.map((msg, idx) => (
          <ChatMessage key={idx} message={msg} />
        ))}
      </div>
      <div className="input-area">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter' && !loading) {
              sendMessage(input);
              setInput('');
            }
          }}
          placeholder="Ask about recent news..."
          disabled={loading}
        />
      </div>
    </div>
  );
};
```

### 3. Semantic Search Component
```javascript
// Example: Intelligent search with debouncing
const SearchInterface = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);

  // Debounced search function
  const performSearch = useMemo(
    () => debounce(async (searchQuery) => {
      if (searchQuery.length < 2) return;
      
      setLoading(true);
      try {
        const response = await fetch('http://localhost:3000/api/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query: searchQuery,
            strategy: 'hybrid', // Use AI-powered hybrid search
            limit: 20
          })
        });
        
        const data = await response.json();
        if (data.success) {
          setResults(data.data.results);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300),
    []
  );

  // Autocomplete suggestions
  const fetchSuggestions = useMemo(
    () => debounce(async (input) => {
      if (input.length < 2) return;
      
      try {
        const response = await fetch(
          `http://localhost:3000/api/search/autocomplete?q=${input}&limit=5`
        );
        const data = await response.json();
        if (data.success) {
          setSuggestions(data.data.suggestions);
        }
      } catch (error) {
        console.error('Autocomplete error:', error);
      }
    }, 200),
    []
  );

  useEffect(() => {
    performSearch(query);
    fetchSuggestions(query);
  }, [query]);

  return (
    <div className="search-container">
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search news with AI..."
      />
      
      {suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map(suggestion => (
            <div
              key={suggestion}
              onClick={() => setQuery(suggestion)}
              className="suggestion-item"
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
      
      {loading && <div>Searching...</div>}
      
      <div className="results">
        {results.map(result => (
          <SearchResult key={result._id} item={result} />
        ))}
      </div>
    </div>
  );
};
```

### 4. Bias Analysis Visualization
```javascript
// Example: Showing bias distribution
const BiasAnalysisView = ({ articleId }) => {
  const [biasData, setBiasData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchBiasAnalysis = async () => {
      try {
        const response = await fetch(
          `http://localhost:3000/api/news/${articleId}?includeBias=true`
        );
        const data = await response.json();
        
        if (data.success && data.data.biasAnalysis) {
          setBiasData(data.data.biasAnalysis);
        }
      } catch (error) {
        console.error('Failed to fetch bias analysis:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchBiasAnalysis();
  }, [articleId]);

  if (loading) return <div>Analyzing bias...</div>;
  if (!biasData) return <div>No bias analysis available</div>;

  const getBiasColor = (bias) => {
    const colors = {
      'FAR_LEFT': '#0066CC',
      'LEFT': '#3399FF',
      'CENTER_LEFT': '#66B2FF',
      'CENTER': '#808080',
      'CENTER_RIGHT': '#FF9999',
      'RIGHT': '#FF6666',
      'FAR_RIGHT': '#CC0000'
    };
    return colors[bias] || '#808080';
  };

  return (
    <div className="bias-analysis">
      <h3>Bias Analysis</h3>
      <div className="bias-indicator">
        <div 
          className="bias-marker"
          style={{ 
            backgroundColor: getBiasColor(biasData.overall_bias)
          }}
        >
          {biasData.overall_bias}
        </div>
        <div className="confidence">
          Confidence: {(biasData.confidence * 100).toFixed(0)}%
        </div>
      </div>
      
      {biasData.linguistic_indicators && (
        <div className="indicators">
          <h4>Linguistic Indicators:</h4>
          <ul>
            {biasData.linguistic_indicators.map((indicator, idx) => (
              <li key={idx}>{indicator}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
```

### 5. Story Clusters View
```javascript
// Example: Displaying related articles in clusters
const StoryClusterView = ({ clusterId }) => {
  const [cluster, setCluster] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCluster = async () => {
      try {
        const response = await fetch(
          `http://localhost:3000/api/news/cluster/${clusterId}`
        );
        const data = await response.json();
        
        if (data.success) {
          setCluster(data.data);
        }
      } catch (error) {
        console.error('Failed to fetch cluster:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchCluster();
  }, [clusterId]);

  if (loading) return <div>Loading story cluster...</div>;
  if (!cluster) return <div>Cluster not found</div>;

  return (
    <div className="story-cluster">
      <h2>{cluster.title}</h2>
      <p>{cluster.description}</p>
      
      <div className="cluster-stats">
        <span>{cluster.articleCount} articles</span>
        <span>•</span>
        <span>
          {new Date(cluster.timeRange.start).toLocaleDateString()} - 
          {new Date(cluster.timeRange.end).toLocaleDateString()}
        </span>
      </div>
      
      <div className="bias-distribution">
        <h3>Perspective Distribution</h3>
        <div className="distribution-chart">
          {Object.entries(cluster.biasDistribution).map(([bias, count]) => (
            <div key={bias} className="bias-bar">
              <span>{bias}</span>
              <div 
                className="bar"
                style={{ 
                  width: `${(count / cluster.articleCount) * 100}%` 
                }}
              >
                {count}
              </div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="cluster-articles">
        <h3>Articles in this Story</h3>
        {cluster.articles.map(article => (
          <ArticleCard key={article._id} article={article} />
        ))}
      </div>
    </div>
  );
};
```

## 🔐 Authentication Setup

### Token Management
```javascript
// utils/auth.js
const TOKEN_KEY = 'phato_auth_token';

export const authService = {
  // Store token after login
  setToken: (token) => {
    localStorage.setItem(TOKEN_KEY, token);
  },

  // Get token for requests
  getToken: () => {
    return localStorage.getItem(TOKEN_KEY);
  },

  // Remove token on logout
  removeToken: () => {
    localStorage.removeItem(TOKEN_KEY);
  },

  // Check if user is authenticated
  isAuthenticated: () => {
    return !!localStorage.getItem(TOKEN_KEY);
  }
};

// API interceptor for authenticated requests
export const authenticatedFetch = async (url, options = {}) => {
  const token = authService.getToken();
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  const response = await fetch(url, {
    ...options,
    headers
  });
  
  // Handle token expiration
  if (response.status === 401) {
    authService.removeToken();
    window.location.href = '/login';
    throw new Error('Session expired');
  }
  
  return response;
};
```

## 🎨 UI/UX Best Practices

### 1. Loading States
```javascript
const LoadingSpinner = () => (
  <div className="spinner">
    <div className="spinner-circle"></div>
    <p>Loading intelligent news analysis...</p>
  </div>
);

const SkeletonLoader = () => (
  <div className="skeleton">
    <div className="skeleton-title"></div>
    <div className="skeleton-text"></div>
    <div className="skeleton-text"></div>
  </div>
);
```

### 2. Error Handling
```javascript
const ErrorBoundary = ({ children }) => {
  const [error, setError] = useState(null);

  const handleError = (error) => {
    console.error('UI Error:', error);
    setError(error.message);
  };

  if (error) {
    return (
      <div className="error-container">
        <h2>Something went wrong</h2>
        <p>{error}</p>
        <button onClick={() => setError(null)}>Try Again</button>
      </div>
    );
  }

  return children;
};
```

### 3. Real-time Updates
```javascript
// WebSocket connection for real-time news
const useNewsWebSocket = () => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3000');
    
    ws.onopen = () => {
      console.log('WebSocket connected');
      setConnected(true);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch(data.type) {
        case 'news:new':
          // Handle new article
          break;
        case 'cluster:formed':
          // Handle new cluster
          break;
        case 'chat:response':
          // Handle chat response
          break;
      }
    };
    
    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
    };
    
    ws.onclose = () => {
      setConnected(false);
      // Implement reconnection logic
    };
    
    setSocket(ws);
    
    return () => {
      ws.close();
    };
  }, []);

  return { socket, connected };
};
```

## 📊 State Management Patterns

### Redux Example
```javascript
// store/newsSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';

export const fetchNews = createAsyncThunk(
  'news/fetch',
  async ({ page, category }) => {
    const response = await fetch(
      `http://localhost:3000/api/news?page=${page}&category=${category}`
    );
    return response.json();
  }
);

const newsSlice = createSlice({
  name: 'news',
  initialState: {
    articles: [],
    loading: false,
    error: null,
    pagination: null
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNews.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchNews.fulfilled, (state, action) => {
        state.loading = false;
        state.articles = action.payload.data;
        state.pagination = action.payload.pagination;
      })
      .addCase(fetchNews.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      });
  }
});
```

### Context API Example
```javascript
// contexts/NewsContext.js
const NewsContext = createContext();

export const NewsProvider = ({ children }) => {
  const [news, setNews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    category: null,
    source: null,
    dateRange: null
  });

  const fetchNews = useCallback(async () => {
    setLoading(true);
    try {
      const queryParams = new URLSearchParams();
      if (filters.category) queryParams.append('category', filters.category);
      if (filters.source) queryParams.append('source', filters.source);
      
      const response = await fetch(
        `http://localhost:3000/api/news?${queryParams}`
      );
      const data = await response.json();
      
      if (data.success) {
        setNews(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch news:', error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchNews();
  }, [fetchNews]);

  return (
    <NewsContext.Provider value={{
      news,
      loading,
      filters,
      setFilters,
      refreshNews: fetchNews
    }}>
      {children}
    </NewsContext.Provider>
  );
};

export const useNews = () => useContext(NewsContext);
```

## 🚀 Performance Optimization

### 1. Image Optimization
```javascript
const OptimizedImage = ({ src, alt, width, height }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);

  return (
    <div className="image-container">
      {isLoading && <div className="image-placeholder" />}
      <img
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setError(true);
          setIsLoading(false);
        }}
        style={{ display: isLoading ? 'none' : 'block' }}
      />
      {error && <div className="image-error">Failed to load image</div>}
    </div>
  );
};
```

### 2. Virtual Scrolling
```javascript
import { FixedSizeList } from 'react-window';

const VirtualNewsList = ({ articles }) => {
  const Row = ({ index, style }) => (
    <div style={style}>
      <ArticleCard article={articles[index]} />
    </div>
  );

  return (
    <FixedSizeList
      height={800}
      itemCount={articles.length}
      itemSize={200}
      width="100%"
    >
      {Row}
    </FixedSizeList>
  );
};
```

### 3. Request Caching
```javascript
// utils/cache.js
class APICache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes default
    this.cache = new Map();
    this.ttl = ttl;
  }

  set(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;
    
    if (Date.now() - item.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }
    
    return item.data;
  }

  clear() {
    this.cache.clear();
  }
}

const apiCache = new APICache();

export const cachedFetch = async (url, options = {}) => {
  const cacheKey = `${url}${JSON.stringify(options)}`;
  
  // Check cache first
  const cached = apiCache.get(cacheKey);
  if (cached) return cached;
  
  // Fetch if not cached
  const response = await fetch(url, options);
  const data = await response.json();
  
  // Cache successful responses
  if (response.ok) {
    apiCache.set(cacheKey, data);
  }
  
  return data;
};
```

## 📱 Mobile Responsiveness

### Responsive Hooks
```javascript
const useResponsive = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      const width = window.innerWidth;
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setIsDesktop(width >= 1024);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  return { isMobile, isTablet, isDesktop };
};

// Usage
const NewsFeed = () => {
  const { isMobile } = useResponsive();
  const articlesPerPage = isMobile ? 10 : 20;
  
  // Adjust UI based on device
};
```

## 🧪 Testing Integration

### API Mocking for Tests
```javascript
// __tests__/api.test.js
import { rest } from 'msw';
import { setupServer } from 'msw/node';

const server = setupServer(
  rest.get('/api/news', (req, res, ctx) => {
    return res(
      ctx.json({
        success: true,
        data: [
          {
            _id: 'test1',
            title: 'Test Article',
            description: 'Test description'
          }
        ],
        pagination: {
          page: 1,
          limit: 20,
          total: 1,
          pages: 1
        }
      })
    );
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

test('fetches news articles', async () => {
  const response = await fetch('/api/news');
  const data = await response.json();
  
  expect(data.success).toBe(true);
  expect(data.data).toHaveLength(1);
});
```

## 🔍 Debugging Tips

### API Response Logging
```javascript
// Enable in development only
if (process.env.NODE_ENV === 'development') {
  // Log all API responses
  const originalFetch = window.fetch;
  window.fetch = async (...args) => {
    console.log('API Request:', args[0]);
    const response = await originalFetch(...args);
    const clonedResponse = response.clone();
    
    try {
      const data = await clonedResponse.json();
      console.log('API Response:', data);
    } catch (e) {
      console.log('API Response (non-JSON):', clonedResponse);
    }
    
    return response;
  };
}
```

## 📚 Additional Resources

- [API Documentation](./API_ENDPOINTS_COMPLETE.md)
- [Backend Setup](./BACKEND_SETUP.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [WebSocket Events](./WEBSOCKET_EVENTS.md)

## 🤝 Support

For issues or questions about frontend integration:
1. Check the API health endpoint first
2. Verify all services are running
3. Check browser console for errors
4. Review network tab for API responses
5. Contact backend team with specific error messages

---

*Last updated: January 2025*
*Backend Version: 1.0.0*
*API Version: v1*