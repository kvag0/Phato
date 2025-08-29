# Phato Temporal RAG Architecture Implementation

## 📋 Overview

This document outlines the comprehensive temporal RAG (Retrieval-Augmented Generation) architecture designed for Phato's truth-committed news chatbot. The system enables date-based news indexing, fact extraction with temporal tracking, and cross-source bias analysis over time.

## 🔄 What Changed

### 1. Database Schema Enhancements

#### Enhanced Article Schema
- **Added temporal indexing fields**: `publishDate`, `publishMonth`, `publishYear`, `publishWeek`, `publishHour`
- **Extended fact extraction**: Each article now extracts structured facts with unique IDs
- **Added bias analysis tracking**: Comprehensive bias detection with temporal context
- **Story lifecycle tracking**: Breaking news, updates, and follow-up identification
- **Cross-source clustering**: Articles grouped by story for multi-perspective analysis

#### New Fact Collection Schema
- **Dedicated fact storage**: Separate collection for facts with temporal tracking
- **Fact evolution chain**: Track how facts change over time across sources
- **Verification history**: Timeline of fact verification status changes
- **Cross-article references**: Facts linked to all articles that mention them
- **Temporal relevance scoring**: Dynamic relevance based on time and context

#### Chat Conversation Schema
- **RAG conversation storage**: Chat history with source attribution
- **Temporal context**: User preferences for time ranges and bias filtering
- **Fact-checking integration**: Real-time fact verification in conversations

### 2. New Services Architecture

#### Temporal Services
- **TemporalFactExtractor**: AI-powered fact extraction with date-based organization
- **FactEvolutionTracker**: Monitor how facts change across sources and time
- **TemporalQueryService**: Query system for date-range based searches
- **TemporalFactVerifier**: Cross-temporal fact verification system
- **TemporalBiasAnalyzer**: Track bias evolution over time for topics

#### RAG Services
- **RAGChatbotService**: Core chatbot with temporal context awareness
- **CrossSourceAnalyzer**: Identify same stories across different sources
- **BiasDetectionService**: Advanced ideological bias detection
- **EmbeddingService**: Vector embeddings for semantic search
- **StoryClusteringService**: Group related articles across sources

### 3. Enhanced Database Indexing

#### Temporal Indexes
```javascript
// Multi-granular temporal indexing
articleSchema.index({ 'temporalData.publishedAt': -1 });
articleSchema.index({ 'temporalData.publishDate': 1 });
articleSchema.index({ 'temporalData.publishMonth': 1 });
articleSchema.index({ 'temporalData.publishYear': 1, category: 1 });

// Fact-specific temporal indexes
articleSchema.index({ 'extractedFacts.firstReported': -1 });
articleSchema.index({ 'extractedFacts.factType': 1, 'extractedFacts.firstReported': -1 });
```

#### Performance Optimizations
- **Compound indexes** for complex temporal queries
- **Text search indexes** with weighted fields
- **Vector embeddings indexes** for semantic search
- **Geospatial indexes** for location-based news

### 4. New API Endpoints

#### Temporal Querying
- `GET /api/timeline` - Query news by date range with flexible granularity
- `GET /api/facts/by-date/{date}` - Get all facts reported on specific date
- `GET /api/facts/{factId}/evolution` - Track fact evolution over time

#### RAG Chatbot
- `POST /api/chat/chat` - Main chatbot interface with temporal context
- `GET /api/chat/conversations/{id}` - Retrieve chat history
- `POST /api/chat/fact-check` - Dedicated fact-checking endpoint

#### Bias Analysis
- `GET /api/bias/evolution` - Track bias trends over time for topics
- `GET /api/bias/timeline/{topic}` - Bias analysis timeline for specific topics

### 5. Vector Database Integration

#### Pinecone Setup
- **Article embeddings**: 1536-dimensional vectors for semantic search
- **Fact embeddings**: Separate vectors for fact-level semantic search
- **Metadata filtering**: Date, source, category, bias filtering in vector space

#### Hybrid Search
- **Semantic search**: Vector similarity for conceptual matching
- **Keyword search**: Traditional text search for exact terms
- **Temporal filtering**: Date-range filtering in vector queries
- **Bias-aware retrieval**: Filter results by ideological perspective

## ✅ Implementation To-Do List

### Phase 1: Database Foundation (Week 1-2)
- [ ] **Extend Article model** with temporal indexing fields
  - [ ] Add `temporalData` object with date granularities
  - [ ] Add `extractedFacts` array with fact tracking
  - [ ] Add `biasAnalysis` object with enhanced bias detection
  - [ ] Create database migration script

- [ ] **Create new Fact model**
  - [ ] Implement fact schema with temporal tracking
  - [ ] Add fact evolution chain tracking
  - [ ] Create verification history system
  - [ ] Set up fact indexing

- [ ] **Create ChatConversation model**
  - [ ] Design conversation storage schema
  - [ ] Add temporal context preferences
  - [ ] Implement source attribution tracking

- [ ] **Set up enhanced database indexes**
  - [ ] Create temporal compound indexes
  - [ ] Add full-text search indexes
  - [ ] Implement geospatial indexes
  - [ ] Test index performance

### Phase 2: Core Services (Week 3-4)
- [ ] **Implement TemporalFactExtractor**
  - [ ] Create Gemini-based fact extraction
  - [ ] Implement fact classification system
  - [ ] Add temporal relevance scoring
  - [ ] Test fact extraction accuracy

- [ ] **Build FactEvolutionTracker**
  - [ ] Implement fact change detection
  - [ ] Create evolution reason classification
  - [ ] Add impact analysis system
  - [ ] Test evolution tracking

- [ ] **Create TemporalQueryService**
  - [ ] Build date-range querying
  - [ ] Implement granularity options
  - [ ] Add aggregation pipelines
  - [ ] Optimize query performance

- [ ] **Develop TemporalFactVerifier**
  - [ ] Implement cross-source verification
  - [ ] Create consensus building algorithm
  - [ ] Add continuous verification system
  - [ ] Test verification accuracy

### Phase 3: Vector Database Integration (Week 5)
- [ ] **Set up Pinecone**
  - [ ] Create Pinecone account and index
  - [ ] Configure environment variables
  - [ ] Implement connection service
  - [ ] Test vector operations

- [ ] **Implement EmbeddingService**
  - [ ] Integrate OpenAI embeddings API
  - [ ] Create embedding generation for articles
  - [ ] Implement fact-level embeddings
  - [ ] Add batch processing for existing data

- [ ] **Build HybridSearchService**
  - [ ] Combine semantic and keyword search
  - [ ] Implement temporal filtering
  - [ ] Add bias-aware retrieval
  - [ ] Optimize search performance

### Phase 4: RAG Chatbot Development (Week 6-7)
- [ ] **Create RAGChatbotService**
  - [ ] Implement query analysis
  - [ ] Build context retrieval system
  - [ ] Create response generation
  - [ ] Add conversation memory

- [ ] **Implement CrossSourceAnalyzer**
  - [ ] Create story clustering algorithm
  - [ ] Build narrative spectrum analysis
  - [ ] Add missing context detection
  - [ ] Test cross-source accuracy

- [ ] **Build BiasDetectionService**
  - [ ] Implement linguistic bias detection
  - [ ] Create framing bias analysis
  - [ ] Add selection bias detection
  - [ ] Test bias classification accuracy

### Phase 5: Advanced Features (Week 8-9)
- [ ] **Implement TemporalBiasAnalyzer**
  - [ ] Create bias evolution tracking
  - [ ] Build polarization analysis
  - [ ] Add trend identification
  - [ ] Test temporal bias accuracy

- [ ] **Create StoryClusteringService**
  - [ ] Implement entity-based clustering
  - [ ] Add semantic similarity clustering
  - [ ] Create cluster updating system
  - [ ] Test clustering accuracy

- [ ] **Build continuous processing pipeline**
  - [ ] Implement automated fact verification
  - [ ] Create bias monitoring system
  - [ ] Add story clustering automation
  - [ ] Set up monitoring and alerts

### Phase 6: API Development (Week 10)
- [ ] **Create temporal API endpoints**
  - [ ] Implement timeline querying
  - [ ] Add fact evolution endpoints
  - [ ] Create bias analysis endpoints
  - [ ] Test API performance

- [ ] **Build chatbot API**
  - [ ] Implement chat interface
  - [ ] Add conversation management
  - [ ] Create fact-checking endpoint
  - [ ] Test chatbot accuracy

- [ ] **Add authentication and rate limiting**
  - [ ] Implement user authentication
  - [ ] Add API rate limiting
  - [ ] Create usage monitoring
  - [ ] Test security measures

### Phase 7: Testing & Optimization (Week 11-12)
- [ ] **Performance testing**
  - [ ] Load test temporal queries
  - [ ] Optimize database performance
  - [ ] Test vector search speed
  - [ ] Monitor memory usage

- [ ] **Accuracy testing**
  - [ ] Test fact extraction accuracy
  - [ ] Validate bias detection
  - [ ] Check temporal consistency
  - [ ] Verify cross-source matching

- [ ] **Integration testing**
  - [ ] Test end-to-end workflows
  - [ ] Validate chatbot responses
  - [ ] Check data consistency
  - [ ] Test error handling

### Phase 8: Deployment & Monitoring (Week 13-14)
- [ ] **Production deployment**
  - [ ] Set up production environment
  - [ ] Configure monitoring systems
  - [ ] Deploy database migrations
  - [ ] Test production performance

- [ ] **Monitoring setup**
  - [ ] Implement error tracking
  - [ ] Add performance monitoring
  - [ ] Create usage analytics
  - [ ] Set up alerting system

## 🛠️ Technical Requirements

### Dependencies to Add
```json
{
  "@pinecone-database/pinecone": "^1.1.0",
  "@xenova/transformers": "^2.6.0",
  "redis": "^4.6.0",
  "compromise": "^14.10.0",
  "sentiment": "^5.0.2",
  "natural": "^6.12.0",
  "langchain": "^0.0.180",
  "hnswlib-node": "^1.4.2"
}
```

### Environment Variables
```env
# Vector Database
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX_NAME=phato-news

# Local Embeddings Model
EMBEDDINGS_MODEL=BAAI/bge-large-en-v1.5
EMBEDDINGS_CACHE_DIR=./models
EMBEDDINGS_DIMENSION=1024

# Redis for caching
REDIS_URL=redis://localhost:6379

# Enhanced Gemini configuration
GEMINI_PRO_API_KEY=your_gemini_pro_key
```

### Infrastructure Requirements
- **MongoDB**: Enhanced with temporal indexes and fact collections
- **Pinecone**: Vector database for semantic search
- **Redis**: Caching layer for frequent queries
- **Local Embeddings**: BAAI/bge-large-en-v1.5 model for vector generation
- **Google Gemini**: Enhanced fact extraction and bias analysis
- **Node.js**: v18+ required for transformers.js

## 🎯 Success Metrics

### Accuracy Metrics
- **Fact extraction accuracy**: >90% for structured facts
- **Cross-source matching**: >85% for same-story identification
- **Bias classification accuracy**: >80% for ideological perspective
- **Temporal consistency**: >95% for date-based queries

### Performance Metrics
- **Query response time**: <2 seconds for temporal queries
- **Chatbot response time**: <5 seconds including RAG retrieval
- **Fact verification speed**: <10 seconds per fact
- **Vector search performance**: <1 second for semantic queries

### User Experience Metrics
- **Chatbot accuracy**: >85% helpful responses
- **Source attribution**: 100% of claims linked to sources
- **Bias transparency**: Clear bias labels for all sources
- **Temporal context**: Accurate time-based information

## 🚀 Expected Benefits

### For Truth-Committed Journalism
✅ **Complete fact tracking** from first report to verification  
✅ **Cross-source truth verification** with temporal consistency  
✅ **Bias transparency** across the ideological spectrum  
✅ **Comprehensive news timeline** for any topic or event  

### For User Experience
✅ **Intelligent chatbot** with access to entire news database  
✅ **Real-time fact checking** with source attribution  
✅ **Bias-aware responses** showing multiple perspectives  
✅ **Temporal context** for understanding news evolution  

### For Phato's Mission
✅ **Definitive truth platform** with verifiable facts  
✅ **Narrative separation** from factual reporting  
✅ **Ideological transparency** in news coverage  
✅ **Comprehensive coverage** across sources and time  

This implementation positions Phato as the definitive platform for truth-committed, temporally-aware news analysis with AI-powered insights.