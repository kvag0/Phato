import ChatConversation from '../../models/ChatConversation.js';
import hybridSearchService from '../vector/HybridSearchService.js';
import localLLMClient from '../llm/LocalLLMClient.js';
import temporalQueryService from '../temporal/TemporalQueryService.js';
import { v4 as uuidv4 } from 'uuid';
import dotenv from 'dotenv';

dotenv.config();

/**
 * RAG Chatbot Service
 * Core chatbot functionality with Retrieval-Augmented Generation
 * Provides context-aware responses using the news database
 */
class RAGChatbotService {
  constructor() {
    this.config = {
      maxContextArticles: 5,      // Maximum articles to include in context
      maxConversationHistory: 10, // Messages to maintain in context
      maxResponseLength: 500,      // Maximum response length
      minRelevanceScore: 0.3,      // Minimum relevance for context inclusion
      enableFactChecking: true,    // Auto fact-check responses
      enableBiasWarning: true,     // Warn about potential bias
      cacheTimeout: 300000         // 5 minutes cache
    };
    
    // Response cache
    this.responseCache = new Map();
    
    // Active sessions
    this.activeSessions = new Map();
    
    // Metrics
    this.metrics = {
      totalMessages: 0,
      avgResponseTime: 0,
      factChecksPerformed: 0,
      biasWarningsIssued: 0
    };
  }

  /**
   * Initialize the chatbot service
   */
  async initialize() {
    try {
      console.log('🤖 Initializing RAG Chatbot Service...');
      
      // Initialize required services
      await hybridSearchService.initialize();
      
      // Check LLM availability
      const llmHealth = await localLLMClient.checkHealth();
      if (!llmHealth.available) {
        console.warn('⚠️  LLM service not available - responses will be limited');
      }
      
      console.log('✅ RAG Chatbot Service initialized');
      return true;
      
    } catch (error) {
      console.error('❌ Error initializing chatbot:', error);
      throw error;
    }
  }

  /**
   * Process a chat message with RAG
   * @param {Object} params - Chat parameters
   * @returns {Object} Chat response with sources
   */
  async chat(params) {
    const {
      message,
      userId,
      conversationId = null,
      options = {}
    } = params;
    
    const startTime = Date.now();
    
    try {
      // Get or create conversation
      const conversation = await this.getOrCreateConversation(userId, conversationId);
      
      // Add user message to conversation
      await this.addMessageToConversation(conversation, 'user', message);
      
      // Analyze query intent
      const queryAnalysis = await this.analyzeQuery(message);
      
      // Retrieve relevant context
      const context = await this.retrieveContext(message, queryAnalysis, options);
      
      // Generate response using context
      const response = await this.generateResponse(message, context, conversation);
      
      // Fact-check if enabled
      if (this.config.enableFactChecking && response.facts) {
        response.factCheck = await this.factCheckResponse(response.facts, context.sources);
      }
      
      // Check for bias if enabled
      if (this.config.enableBiasWarning && context.sources) {
        response.biasAnalysis = await this.analyzeBias(context.sources);
      }
      
      // Add assistant response to conversation
      await this.addMessageToConversation(conversation, 'assistant', response.text, {
        sources: context.sources?.map(s => s._id),
        facts: response.facts,
        biasAnalysis: response.biasAnalysis
      });
      
      // Update metrics
      const responseTime = Date.now() - startTime;
      this.updateMetrics(responseTime, response);
      
      return {
        conversationId: conversation.conversationId,
        response: response.text,
        sources: context.sources?.map(s => ({
          id: s._id,
          title: s.title,
          source: s.source?.name,
          url: s.url,
          relevance: s.score
        })),
        facts: response.facts,
        factCheck: response.factCheck,
        biasAnalysis: response.biasAnalysis,
        metadata: {
          responseTime,
          contextArticles: context.sources?.length || 0,
          queryType: queryAnalysis.type
        }
      };
      
    } catch (error) {
      console.error('Chat error:', error);
      
      // Return a fallback response
      return {
        conversationId: conversationId || uuidv4(),
        response: "I apologize, but I'm having trouble processing your request. Please try rephrasing your question.",
        error: error.message,
        metadata: {
          responseTime: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Analyze the user's query to understand intent
   * @param {String} message - User message
   * @returns {Object} Query analysis
   */
  async analyzeQuery(message) {
    const analysis = {
      type: 'general',
      temporal: null,
      entities: [],
      topics: [],
      needsFactCheck: false,
      sentiment: 'neutral'
    };
    
    // Check for temporal queries
    const temporalPatterns = {
      today: /today|current|latest|now/i,
      recent: /recent|this week|past week/i,
      historical: /history|evolution|over time/i,
      specific: /\d{4}|\d{1,2}\/\d{1,2}/
    };
    
    for (const [type, pattern] of Object.entries(temporalPatterns)) {
      if (pattern.test(message)) {
        analysis.temporal = type;
        break;
      }
    }
    
    // Check for fact-checking intent
    if (/is it true|fact check|verify|accurate/i.test(message)) {
      analysis.needsFactCheck = true;
      analysis.type = 'fact_check';
    }
    
    // Check for bias analysis intent
    if (/bias|perspective|neutral|objective/i.test(message)) {
      analysis.type = 'bias_analysis';
    }
    
    // Extract potential entities (simple approach)
    const capitalWords = message.match(/[A-Z][a-z]+/g);
    if (capitalWords) {
      analysis.entities = capitalWords;
    }
    
    // Detect topics
    const topicKeywords = {
      politics: /election|government|president|congress|political/i,
      technology: /tech|AI|software|internet|digital/i,
      climate: /climate|environment|warming|carbon|sustainable/i,
      economy: /economy|market|inflation|recession|financial/i,
      health: /health|covid|vaccine|medical|disease/i
    };
    
    for (const [topic, pattern] of Object.entries(topicKeywords)) {
      if (pattern.test(message)) {
        analysis.topics.push(topic);
      }
    }
    
    return analysis;
  }

  /**
   * Retrieve relevant context for the query
   * @param {String} message - User message
   * @param {Object} queryAnalysis - Query analysis
   * @param {Object} options - Retrieval options
   * @returns {Object} Retrieved context
   */
  async retrieveContext(message, queryAnalysis, options = {}) {
    try {
      // Build search filters based on analysis
      const searchFilters = {
        limit: this.config.maxContextArticles
      };
      
      // Add temporal filter if detected
      if (queryAnalysis.temporal === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        searchFilters.filters = {
          startDate: today.toISOString()
        };
      } else if (queryAnalysis.temporal === 'recent') {
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        searchFilters.filters = {
          startDate: weekAgo.toISOString()
        };
      }
      
      // Add topic filter if detected
      if (queryAnalysis.topics.length > 0) {
        searchFilters.filters = {
          ...searchFilters.filters,
          category: queryAnalysis.topics[0]
        };
      }
      
      // Perform hybrid search
      const searchResults = await hybridSearchService.search(message, searchFilters);
      
      // Filter by relevance score
      const relevantSources = searchResults.results.filter(
        r => r.score >= this.config.minRelevanceScore
      );
      
      // Get additional context if fact-checking
      let facts = [];
      if (queryAnalysis.needsFactCheck && relevantSources.length > 0) {
        // Extract facts from top sources
        for (const source of relevantSources.slice(0, 3)) {
          if (source.extractedFacts) {
            facts.push(...source.extractedFacts);
          }
        }
      }
      
      return {
        sources: relevantSources,
        facts,
        queryAnalysis
      };
      
    } catch (error) {
      console.error('Context retrieval error:', error);
      return {
        sources: [],
        facts: [],
        queryAnalysis
      };
    }
  }

  /**
   * Generate response using retrieved context
   * @param {String} message - User message
   * @param {Object} context - Retrieved context
   * @param {Object} conversation - Conversation object
   * @returns {Object} Generated response
   */
  async generateResponse(message, context, conversation) {
    try {
      // Check if LLM is available
      const llmHealth = await localLLMClient.checkHealth();
      
      if (!llmHealth.available) {
        // Fallback to template-based response
        return this.generateTemplateResponse(message, context);
      }
      
      // Build prompt with context
      const prompt = this.buildRAGPrompt(message, context, conversation);
      
      // Generate response using LLM
      const llmResponse = await localLLMClient.generate(prompt, {
        maxTokens: this.config.maxResponseLength,
        temperature: 0.7
      });
      
      // Extract facts from response if any
      const facts = this.extractFactsFromResponse(llmResponse.text);
      
      return {
        text: llmResponse.text,
        facts,
        model: 'gemma-3-1b-it'
      };
      
    } catch (error) {
      console.error('Response generation error:', error);
      
      // Fallback to template response
      return this.generateTemplateResponse(message, context);
    }
  }

  /**
   * Build RAG prompt with context
   * @param {String} message - User message
   * @param {Object} context - Retrieved context
   * @param {Object} conversation - Conversation history
   * @returns {String} Formatted prompt
   */
  buildRAGPrompt(message, context, conversation) {
    let prompt = 'You are Phato AI, a truth-committed news assistant. ';
    prompt += 'Answer based on the provided context. Be objective and cite sources.\n\n';
    
    // Add context from retrieved articles
    if (context.sources && context.sources.length > 0) {
      prompt += 'CONTEXT:\n';
      context.sources.forEach((source, i) => {
        prompt += `[${i + 1}] ${source.title} (${source.source?.name})\n`;
        prompt += `${source.description || source.content?.substring(0, 200)}...\n\n`;
      });
    }
    
    // Add conversation history if available
    if (conversation.messages && conversation.messages.length > 2) {
      prompt += 'RECENT CONVERSATION:\n';
      const recentMessages = conversation.messages.slice(-4, -1);
      recentMessages.forEach(msg => {
        prompt += `${msg.role}: ${msg.content.substring(0, 100)}...\n`;
      });
      prompt += '\n';
    }
    
    // Add the current question
    prompt += `USER QUESTION: ${message}\n\n`;
    prompt += 'ASSISTANT RESPONSE (cite sources by number, be concise and factual):';
    
    return prompt;
  }

  /**
   * Generate template-based response (fallback)
   * @param {String} message - User message
   * @param {Object} context - Retrieved context
   * @returns {Object} Template response
   */
  generateTemplateResponse(message, context) {
    let responseText = '';
    
    if (context.sources && context.sources.length > 0) {
      const topSource = context.sources[0];
      
      if (context.queryAnalysis.type === 'fact_check') {
        responseText = `Based on the available information from ${topSource.source?.name}, `;
        responseText += `"${topSource.title}". `;
        responseText += topSource.description || topSource.content?.substring(0, 200);
        
        if (context.facts && context.facts.length > 0) {
          responseText += '\n\nKey facts found:\n';
          context.facts.slice(0, 3).forEach((fact, i) => {
            responseText += `${i + 1}. ${fact.statement}\n`;
          });
        }
      } else if (context.queryAnalysis.type === 'bias_analysis') {
        responseText = `Regarding bias analysis, I found relevant coverage from ${topSource.source?.name}. `;
        responseText += `The article "${topSource.title}" `;
        
        if (topSource.biasAnalysis) {
          responseText += `shows ${topSource.biasAnalysis.overall_bias} bias. `;
        }
        
        responseText += 'For a complete picture, you should compare multiple sources.';
      } else {
        // General response
        responseText = `Based on recent news from ${topSource.source?.name}, `;
        responseText += `"${topSource.title}". `;
        responseText += topSource.description || topSource.content?.substring(0, 200);
        
        if (context.sources.length > 1) {
          responseText += `\n\nI found ${context.sources.length} relevant articles on this topic.`;
        }
      }
    } else {
      responseText = "I couldn't find specific information about that in recent news. ";
      responseText += "Could you provide more details or try rephrasing your question?";
    }
    
    return {
      text: responseText,
      facts: context.facts || [],
      model: 'template'
    };
  }

  /**
   * Fact-check response
   * @param {Array} facts - Facts to check
   * @param {Array} sources - Source articles
   * @returns {Object} Fact check results
   */
  async factCheckResponse(facts, sources) {
    if (!facts || facts.length === 0) {
      return null;
    }
    
    try {
      const results = [];
      
      for (const fact of facts.slice(0, 5)) { // Limit to 5 facts
        const verification = await localLLMClient.verifyFact(fact.statement || fact, sources);
        
        results.push({
          fact: fact.statement || fact,
          status: verification.status,
          confidence: verification.confidence,
          explanation: verification.explanation
        });
      }
      
      this.metrics.factChecksPerformed += results.length;
      
      return {
        checked: results.length,
        results
      };
      
    } catch (error) {
      console.error('Fact checking error:', error);
      return null;
    }
  }

  /**
   * Analyze bias in sources
   * @param {Array} sources - Source articles
   * @returns {Object} Bias analysis
   */
  async analyzeBias(sources) {
    if (!sources || sources.length === 0) {
      return null;
    }
    
    try {
      const biasDistribution = {};
      let hasMultiplePerspectives = false;
      
      // Count bias distribution
      for (const source of sources) {
        if (source.biasAnalysis?.overall_bias) {
          const bias = source.biasAnalysis.overall_bias;
          biasDistribution[bias] = (biasDistribution[bias] || 0) + 1;
        }
      }
      
      // Check for multiple perspectives
      const biasTypes = Object.keys(biasDistribution);
      hasMultiplePerspectives = biasTypes.length > 1;
      
      // Generate warning if needed
      let warning = null;
      if (biasTypes.length === 1) {
        warning = `All sources show ${biasTypes[0]} bias. Consider checking other perspectives.`;
        this.metrics.biasWarningsIssued++;
      }
      
      return {
        distribution: biasDistribution,
        hasMultiplePerspectives,
        warning,
        sourcesAnalyzed: sources.length
      };
      
    } catch (error) {
      console.error('Bias analysis error:', error);
      return null;
    }
  }

  /**
   * Get or create conversation
   * @param {String} userId - User ID
   * @param {String} conversationId - Optional conversation ID
   * @returns {Object} Conversation object
   */
  async getOrCreateConversation(userId, conversationId = null) {
    try {
      if (conversationId) {
        // Try to get existing conversation
        let conversation = await ChatConversation.findOne({ conversationId });
        
        if (conversation) {
          return conversation;
        }
      }
      
      // Create new conversation
      const newConversation = await ChatConversation.create({
        conversationId: conversationId || uuidv4(),
        userId,
        messages: [],
        metadata: {
          startTime: new Date(),
          platform: 'api'
        }
      });
      
      return newConversation;
      
    } catch (error) {
      console.error('Conversation management error:', error);
      
      // Return in-memory conversation
      return {
        conversationId: conversationId || uuidv4(),
        userId,
        messages: []
      };
    }
  }

  /**
   * Add message to conversation
   * @param {Object} conversation - Conversation object
   * @param {String} role - Message role (user/assistant)
   * @param {String} content - Message content
   * @param {Object} metadata - Optional metadata
   */
  async addMessageToConversation(conversation, role, content, metadata = {}) {
    try {
      const message = {
        role,
        content,
        timestamp: new Date(),
        ...metadata
      };
      
      // Add to conversation
      if (conversation._id) {
        // Database conversation
        await ChatConversation.updateOne(
          { _id: conversation._id },
          {
            $push: {
              messages: {
                $each: [message],
                $slice: -this.config.maxConversationHistory
              }
            },
            $set: {
              lastActivity: new Date()
            }
          }
        );
      } else {
        // In-memory conversation
        if (!conversation.messages) {
          conversation.messages = [];
        }
        conversation.messages.push(message);
        
        // Limit history
        if (conversation.messages.length > this.config.maxConversationHistory) {
          conversation.messages = conversation.messages.slice(-this.config.maxConversationHistory);
        }
      }
      
    } catch (error) {
      console.error('Error adding message to conversation:', error);
    }
  }

  /**
   * Extract facts from response text
   * @param {String} text - Response text
   * @returns {Array} Extracted facts
   */
  extractFactsFromResponse(text) {
    const facts = [];
    
    // Look for numbered facts
    const numberedFacts = text.match(/\d+\.\s+[^.]+\./g);
    if (numberedFacts) {
      facts.push(...numberedFacts.map(f => f.replace(/^\d+\.\s+/, '')));
    }
    
    // Look for bullet points
    const bulletFacts = text.match(/[•·-]\s+[^.]+\./g);
    if (bulletFacts) {
      facts.push(...bulletFacts.map(f => f.replace(/^[•·-]\s+/, '')));
    }
    
    return facts.slice(0, 5); // Limit to 5 facts
  }

  /**
   * Update service metrics
   * @param {Number} responseTime - Response time in ms
   * @param {Object} response - Generated response
   */
  updateMetrics(responseTime, response) {
    this.metrics.totalMessages++;
    this.metrics.avgResponseTime = (
      (this.metrics.avgResponseTime * (this.metrics.totalMessages - 1) + responseTime) /
      this.metrics.totalMessages
    );
  }

  /**
   * Get conversation history
   * @param {String} conversationId - Conversation ID
   * @returns {Object} Conversation history
   */
  async getConversationHistory(conversationId) {
    try {
      const conversation = await ChatConversation.findOne({ conversationId });
      
      if (!conversation) {
        return null;
      }
      
      return {
        conversationId: conversation.conversationId,
        userId: conversation.userId,
        messages: conversation.messages.map(msg => ({
          role: msg.role,
          content: msg.content,
          timestamp: msg.timestamp
        })),
        startTime: conversation.metadata?.startTime,
        messageCount: conversation.messages.length
      };
      
    } catch (error) {
      console.error('Error retrieving conversation:', error);
      return null;
    }
  }

  /**
   * Clear conversation
   * @param {String} conversationId - Conversation ID
   */
  async clearConversation(conversationId) {
    try {
      await ChatConversation.updateOne(
        { conversationId },
        { $set: { messages: [] } }
      );
      
      return true;
      
    } catch (error) {
      console.error('Error clearing conversation:', error);
      return false;
    }
  }

  /**
   * Get service metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.responseCache.size,
      activeSessions: this.activeSessions.size
    };
  }
}

// Export singleton instance
const ragChatbotService = new RAGChatbotService();
export default ragChatbotService;

// Also export the class for testing
export { RAGChatbotService };