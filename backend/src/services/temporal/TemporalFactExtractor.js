import localLLMClient from '../llm/LocalLLMClient.js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';
import EnhancedArticle from '../../models/EnhancedArticle.js';
import Fact from '../../models/Fact.js';
import StoryCluster from '../../models/StoryCluster.js';

dotenv.config();

/**
 * TemporalFactExtractor Service
 * Extracts structured facts from articles with temporal tracking
 * Uses local gemma-3-1b-it model for intelligent fact extraction and classification
 */
class TemporalFactExtractor {
  constructor() {
    this.llmClient = localLLMClient;
    
    // Fact extraction configuration
    this.config = {
      minConfidence: 0.5,
      maxFactsPerArticle: 50,
      enableCaching: true,
      cacheTimeout: 3600000, // 1 hour
      batchSize: 10
    };
    
    // Cache for extracted facts
    this.factCache = new Map();
  }

  /**
   * Extract facts from a single article
   * @param {Object} article - Enhanced article document
   * @returns {Object} Extracted facts and metadata
   */
  async extractFactsFromArticle(article, options = {}) {
    try {
      console.log(`📊 Extracting facts from: ${article.title?.substring(0, 50)}...`);
      
      // Check cache first
      if (this.config.enableCaching && this.factCache.has(article._id)) {
        const cached = this.factCache.get(article._id);
        if (Date.now() - cached.timestamp < this.config.cacheTimeout) {
          console.log('   ✓ Using cached facts');
          return cached.data;
        }
      }
      
      // Prepare article text for extraction
      const articleText = this.prepareArticleText(article);
      
      // Call local LLM for fact extraction
      const extractionResult = await this.llmClient.extractFacts(articleText, {
        maxFacts: this.config.maxFactsPerArticle
      });
      
      // Format extracted data
      const extractedData = {
        facts: extractionResult.facts || [],
        processingTime: extractionResult.processing_time || 0
      };
      
      // Process and structure facts
      const processedFacts = await this.processExtractedFacts(extractedData, article);
      
      // Update article with extracted facts
      await this.updateArticleWithFacts(article, processedFacts);
      
      // Save facts to database
      const savedFacts = await this.saveFactsToDatabase(processedFacts, article);
      
      // Cache results
      if (this.config.enableCaching) {
        this.factCache.set(article._id, {
          timestamp: Date.now(),
          data: { processedFacts, savedFacts }
        });
      }
      
      return {
        articleId: article._id,
        factsExtracted: processedFacts.length,
        factsSaved: savedFacts.length,
        facts: processedFacts,
        metadata: {
          extractionDate: new Date(),
          extractionMethod: 'LOCAL_GEMMA_3B',
          confidence: this.calculateOverallConfidence(processedFacts)
        }
      };
      
    } catch (error) {
      console.error(`❌ Error extracting facts from article: ${error.message}`);
      throw new Error(`Fact extraction failed: ${error.message}`);
    }
  }

  /**
   * Prepare article text for LLM processing
   */
  prepareArticleText(article) {
    const parts = [];
    
    // Add metadata
    parts.push(`Title: ${article.title || 'Untitled'}`);
    parts.push(`Source: ${article.source?.name || 'Unknown'}`);
    parts.push(`Category: ${article.category || 'General'}`);
    parts.push(`Published: ${article.publishedAt || new Date()}`);
    
    // Add main content
    if (article.content) {
      parts.push(`\nContent: ${article.content}`);
    } else if (article.description) {
      parts.push(`\nDescription: ${article.description}`);
    }
    
    return parts.join('\n');
  }

  /**
   * Build the extraction prompt for Gemini
   */
  buildExtractionPrompt(article) {
    return `
    EXTRACT VERIFIABLE FACTS from this news article for a truth-committed journalism platform.
    
    ARTICLE DETAILS:
    Title: ${article.title}
    Source: ${article.source?.name || 'Unknown'}
    Published: ${article.publishedAt}
    Category: ${article.category}
    
    CONTENT:
    ${article.content || article.description || ''}
    
    EXTRACT AND CLASSIFY each fact according to these categories:
    
    1. WHO FACTS (People, Organizations, Groups involved)
       - Extract full names, titles, roles
       - Identify relationships between entities
       - Note any affiliations or associations
    
    2. WHAT FACTS (Events, Actions, Decisions, Occurrences)
       - Specific events that happened
       - Actions taken by entities
       - Decisions made or announced
       - Observable occurrences
    
    3. WHEN FACTS (Dates, Times, Durations, Temporal References)
       - Specific dates and times
       - Duration of events
       - Temporal relationships (before/after/during)
       - Deadlines or future dates mentioned
    
    4. WHERE FACTS (Locations, Geographic Scope)
       - Specific locations (cities, countries, addresses)
       - Geographic scope of events
       - Virtual locations (websites, platforms)
    
    5. WHY FACTS (Reasons, Motivations, Causes)
       - Stated reasons for actions
       - Motivations mentioned
       - Causal relationships
       - Goals or objectives
    
    6. HOW FACTS (Methods, Processes, Mechanisms)
       - How something was done
       - Processes or procedures described
       - Methods or approaches used
    
    7. STATISTICS (Numbers, Percentages, Measurements)
       - Specific numbers mentioned
       - Percentages or ratios
       - Measurements or quantities
       - Financial figures
    
    8. QUOTES (Direct Statements from Sources)
       - Exact quotes from people
       - Official statements
       - Written communications quoted
    
    9. EVENTS (Specific Named Events)
       - Conferences, meetings, ceremonies
       - Incidents or accidents
       - Natural events or disasters
    
    For EACH FACT, provide:
    - statement: The fact as a clear, concise statement
    - factType: One of [WHO, WHAT, WHEN, WHERE, WHY, HOW, STATISTIC, QUOTE, EVENT]
    - confidence: 0.0-1.0 (how confident you are this is accurate)
    - importance: 1-10 (how important this fact is to the story)
    - verifiability: Can this be independently verified? (HIGH/MEDIUM/LOW)
    - timeRelevance: HISTORICAL/CURRENT/FUTURE/TIMELESS
    - temporalScope: INSTANT/HOURS/DAYS/WEEKS/MONTHS/YEARS/ONGOING
    - entities: List of entities (people, orgs, places) involved
    - evidence: Supporting evidence from the article
    - context: Brief context about the fact
    
    IMPORTANT GUIDELINES:
    - Only extract facts explicitly stated or strongly implied in the article
    - Do not infer facts not present in the content
    - Distinguish between claims and verified facts
    - Note when something is attributed to a source vs stated as fact
    - Identify potential bias in how facts are presented
    
    OUTPUT FORMAT: JSON array with all extracted facts
    
    Example structure:
    [
      {
        "statement": "The Federal Reserve raised interest rates by 0.25%",
        "factType": "STATISTIC",
        "confidence": 0.95,
        "importance": 9,
        "verifiability": "HIGH",
        "timeRelevance": "CURRENT",
        "temporalScope": "DAYS",
        "entities": ["Federal Reserve"],
        "evidence": "Direct statement in article",
        "context": "Part of monetary policy adjustment"
      }
    ]
    
    EXTRACT THE FACTS:`;
  }

  /**
   * Parse Gemini response and extract structured data
   */
  parseGeminiResponse(responseText) {
    try {
      // Clean the response text
      let cleanedText = responseText.trim();
      
      // Remove markdown code blocks if present
      cleanedText = cleanedText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
      
      // Parse JSON
      const data = JSON.parse(cleanedText);
      
      // Validate it's an array
      if (!Array.isArray(data)) {
        throw new Error('Response is not an array of facts');
      }
      
      return data;
      
    } catch (error) {
      console.error('Error parsing Gemini response:', error.message);
      console.log('Raw response:', responseText.substring(0, 500));
      
      // Attempt to extract JSON from text
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]);
        } catch (e) {
          console.error('Failed to extract JSON from response');
        }
      }
      
      return [];
    }
  }

  /**
   * Process and enhance extracted facts
   */
  async processExtractedFacts(extractedData, article) {
    const processedFacts = [];
    
    for (const rawFact of extractedData) {
      try {
        // Skip low-confidence facts
        if (rawFact.confidence < this.config.minConfidence) {
          continue;
        }
        
        // Generate unique fact ID
        const factId = uuidv4();
        
        // Process and enhance the fact
        const processedFact = {
          factId,
          statement: this.cleanStatement(rawFact.statement),
          factType: this.validateFactType(rawFact.factType),
          
          // Temporal data
          firstReported: article.publishedAt || new Date(),
          lastConfirmed: new Date(),
          verificationStatus: this.determineVerificationStatus(rawFact),
          
          // Quality metrics
          confidence: Math.min(1, Math.max(0, rawFact.confidence || 0.5)),
          importance: Math.min(10, Math.max(1, rawFact.importance || 5)),
          
          // Classification
          verifiability: rawFact.verifiability || 'MEDIUM',
          timeRelevance: rawFact.timeRelevance || 'CURRENT',
          temporalScope: rawFact.temporalScope || 'DAYS',
          
          // Supporting data
          entities: this.extractEntities(rawFact.entities || []),
          evidence: Array.isArray(rawFact.evidence) ? rawFact.evidence : [rawFact.evidence || ''],
          context: rawFact.context || '',
          
          // Source tracking
          sourceHistory: [{
            source: article.source?.name || 'Unknown',
            reportedAt: article.publishedAt || new Date(),
            confidence: rawFact.confidence || 0.5,
            context: rawFact.context || 'Extracted from article'
          }],
          
          // Relevance period
          relevancePeriod: this.calculateRelevancePeriod(rawFact, article)
        };
        
        processedFacts.push(processedFact);
        
      } catch (error) {
        console.warn(`   ⚠️ Failed to process fact: ${error.message}`);
      }
    }
    
    // Limit to maximum facts per article
    return processedFacts.slice(0, this.config.maxFactsPerArticle);
  }

  /**
   * Update article with extracted facts
   */
  async updateArticleWithFacts(article, facts) {
    try {
      const enhancedArticle = await EnhancedArticle.findById(article._id);
      
      if (!enhancedArticle) {
        console.warn('Article not found for fact update');
        return;
      }
      
      // Add extracted facts to article
      enhancedArticle.extractedFacts = facts.map(fact => ({
        factId: fact.factId,
        statement: fact.statement,
        factType: fact.factType,
        firstReported: fact.firstReported,
        lastConfirmed: fact.lastConfirmed,
        verificationStatus: fact.verificationStatus,
        confidence: fact.confidence,
        importance: fact.importance,
        temporalScope: fact.temporalScope,
        evidence: fact.evidence,
        embedding: [] // Will be populated by embedding service
      }));
      
      // Extract and update entities
      const allEntities = facts.flatMap(f => f.entities || []);
      enhancedArticle.entities = this.deduplicateEntities(allEntities);
      
      // Extract semantic keywords
      enhancedArticle.semanticKeywords = this.extractSemanticKeywords(facts);
      
      await enhancedArticle.save();
      console.log(`   ✓ Updated article with ${facts.length} facts`);
      
    } catch (error) {
      console.error(`Error updating article with facts: ${error.message}`);
    }
  }

  /**
   * Save facts to the dedicated Fact collection
   */
  async saveFactsToDatabase(facts, article) {
    const savedFacts = [];
    
    for (const factData of facts) {
      try {
        // Check if fact already exists (by similar statement)
        let existingFact = await this.findExistingFact(factData.statement);
        
        if (existingFact) {
          // Update existing fact with new source
          await this.updateExistingFact(existingFact, factData, article);
          savedFacts.push(existingFact);
        } else {
          // Create new fact
          const newFact = await this.createNewFact(factData, article);
          savedFacts.push(newFact);
        }
        
      } catch (error) {
        console.warn(`   ⚠️ Failed to save fact: ${factData.statement.substring(0, 50)}...`);
      }
    }
    
    console.log(`   ✓ Saved ${savedFacts.length} facts to database`);
    return savedFacts;
  }

  /**
   * Find existing similar fact in database
   */
  async findExistingFact(statement) {
    // First try exact match
    let fact = await Fact.findOne({ statement });
    
    if (!fact) {
      // Try fuzzy match (simplified for now)
      const keywords = statement.toLowerCase().split(' ')
        .filter(word => word.length > 4)
        .slice(0, 3);
      
      if (keywords.length > 0) {
        const regex = new RegExp(keywords.join('.*'), 'i');
        fact = await Fact.findOne({ statement: regex });
      }
    }
    
    return fact;
  }

  /**
   * Update existing fact with new source
   */
  async updateExistingFact(existingFact, newFactData, article) {
    // Check if this source already reported this fact
    const sourceExists = existingFact.sourceArticles.some(
      source => source.articleId?.toString() === article._id?.toString()
    );
    
    if (!sourceExists) {
      existingFact.sourceArticles.push({
        articleId: article._id,
        publishedAt: article.publishedAt || new Date(),
        source: article.source?.name || 'Unknown',
        url: article.url,
        confidence: newFactData.confidence,
        context: newFactData.context
      });
      
      // Update verification history if confidence is high
      if (newFactData.confidence > 0.8) {
        existingFact.verificationHistory.push({
          date: new Date(),
          status: newFactData.verificationStatus,
          verifiedBy: article.source?.name || 'Unknown',
          method: 'AI',
          evidence: newFactData.evidence,
          confidence: newFactData.confidence
        });
      }
      
      // Update consensus
      existingFact.consensus.totalSources = existingFact.sourceArticles.length;
      
      // Recalculate relevance
      await existingFact.calculateRelevance();
      
      await existingFact.save();
    }
    
    return existingFact;
  }

  /**
   * Create a new fact document
   */
  async createNewFact(factData, article) {
    const newFact = new Fact({
      factId: factData.factId,
      statement: factData.statement,
      
      timeline: {
        firstReported: article.publishedAt || new Date(),
        lastUpdated: new Date(),
        verificationDate: factData.verificationStatus === 'VERIFIED' ? new Date() : null
      },
      
      classification: {
        type: this.mapFactTypeToClassification(factData.factType),
        subtype: factData.factType,
        category: article.category,
        importance: factData.importance,
        timeRelevance: factData.timeRelevance || 'CURRENT',
        scope: this.determineScope(factData, article)
      },
      
      entities: factData.entities || [],
      
      sourceArticles: [{
        articleId: article._id,
        publishedAt: article.publishedAt || new Date(),
        source: article.source?.name || 'Unknown',
        url: article.url,
        confidence: factData.confidence,
        context: factData.context,
        isOriginalSource: true
      }],
      
      verificationHistory: [{
        date: new Date(),
        status: factData.verificationStatus,
        verifiedBy: 'TEMPORAL_FACT_EXTRACTOR',
        method: 'AI',
        evidence: factData.evidence,
        confidence: factData.confidence,
        notes: 'Extracted via Gemini Pro'
      }],
      
      relevanceScore: {
        current: 50,
        trend: 'STABLE'
      },
      
      supportingData: this.extractSupportingData(factData),
      
      consensus: {
        agreementLevel: 1.0, // Single source initially
        totalSources: 1,
        agreeSources: [article.source?.name || 'Unknown']
      },
      
      tags: this.generateFactTags(factData, article),
      
      quality: {
        completeness: this.assessCompleteness(factData),
        accuracy: factData.confidence,
        clarity: this.assessClarity(factData.statement),
        sourceQuality: 0.7 // Default, will be updated based on source credibility
      },
      
      flags: {
        needsVerification: factData.verificationStatus !== 'VERIFIED',
        isBreaking: this.isBreakingFact(factData, article),
        isSensitive: this.isSensitiveFact(factData)
      }
    });
    
    await newFact.save();
    return newFact;
  }

  /**
   * Helper methods
   */
  
  cleanStatement(statement) {
    return statement
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/^["']|["']$/g, '');
  }
  
  validateFactType(type) {
    const validTypes = ['WHO', 'WHAT', 'WHEN', 'WHERE', 'WHY', 'HOW', 'STATISTIC', 'QUOTE', 'EVENT'];
    return validTypes.includes(type) ? type : 'WHAT';
  }
  
  determineVerificationStatus(fact) {
    if (fact.verifiability === 'HIGH' && fact.confidence > 0.8) {
      return 'VERIFIED';
    } else if (fact.confidence < 0.4) {
      return 'DISPUTED';
    } else {
      return 'UNVERIFIED';
    }
  }
  
  extractEntities(entities) {
    if (!Array.isArray(entities)) return [];
    
    return entities.map(entity => {
      if (typeof entity === 'string') {
        return {
          name: entity,
          type: this.classifyEntity(entity),
          verified: false
        };
      }
      return entity;
    }).slice(0, 10); // Limit to 10 entities
  }
  
  classifyEntity(entityName) {
    // Simple classification based on patterns
    if (/\d/.test(entityName)) return 'DATE';
    if (/[A-Z]{2,}/.test(entityName)) return 'ORGANIZATION';
    if (/^[A-Z][a-z]+ [A-Z][a-z]+/.test(entityName)) return 'PERSON';
    if (/\$|€|£|¥/.test(entityName)) return 'MONEY';
    if (/%/.test(entityName)) return 'PERCENTAGE';
    return 'ORGANIZATION';
  }
  
  calculateRelevancePeriod(fact, article) {
    const start = article.publishedAt || new Date();
    let end = null;
    
    switch (fact.temporalScope) {
      case 'INSTANT':
        end = new Date(start.getTime() + 24 * 60 * 60 * 1000); // 1 day
        break;
      case 'HOURS':
        end = new Date(start.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days
        break;
      case 'DAYS':
        end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000); // 1 week
        break;
      case 'WEEKS':
        end = new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000); // 1 month
        break;
      case 'MONTHS':
        end = new Date(start.getTime() + 180 * 24 * 60 * 60 * 1000); // 6 months
        break;
      case 'YEARS':
      case 'ONGOING':
        end = null; // No end date
        break;
    }
    
    return { start, end, peakRelevance: start };
  }
  
  deduplicateEntities(entities) {
    const seen = new Set();
    return entities.filter(entity => {
      const key = `${entity.name}-${entity.type}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  extractSemanticKeywords(facts) {
    const keywords = new Set();
    
    facts.forEach(fact => {
      // Extract keywords from statement
      const words = fact.statement.toLowerCase()
        .split(/\W+/)
        .filter(word => word.length > 4 && !this.isStopWord(word));
      
      words.forEach(word => keywords.add(word));
    });
    
    return Array.from(keywords).slice(0, 20);
  }
  
  isStopWord(word) {
    const stopWords = ['about', 'after', 'before', 'being', 'between', 'during', 'having', 'other', 'these', 'those', 'through', 'under', 'where', 'which', 'while', 'would'];
    return stopWords.includes(word);
  }
  
  calculateOverallConfidence(facts) {
    if (facts.length === 0) return 0;
    const sum = facts.reduce((acc, fact) => acc + fact.confidence, 0);
    return sum / facts.length;
  }
  
  mapFactTypeToClassification(factType) {
    const mapping = {
      'WHO': 'CLAIM',
      'WHAT': 'EVENT',
      'WHEN': 'FACT',
      'WHERE': 'FACT',
      'WHY': 'CLAIM',
      'HOW': 'FACT',
      'STATISTIC': 'STATISTIC',
      'QUOTE': 'QUOTE',
      'EVENT': 'EVENT'
    };
    return mapping[factType] || 'FACT';
  }
  
  determineScope(fact, article) {
    // Determine geographic scope based on entities and content
    const location = fact.entities?.find(e => e.type === 'LOCATION');
    if (!location) return 'NATIONAL';
    
    const locationName = location.name?.toLowerCase() || '';
    if (locationName.includes('world') || locationName.includes('global')) return 'GLOBAL';
    if (locationName.includes('international')) return 'INTERNATIONAL';
    if (locationName.includes('national') || locationName.includes('country')) return 'NATIONAL';
    if (locationName.includes('state') || locationName.includes('regional')) return 'REGIONAL';
    return 'LOCAL';
  }
  
  extractSupportingData(fact) {
    const supportingData = {
      statistics: [],
      quotes: [],
      documents: []
    };
    
    if (fact.factType === 'STATISTIC') {
      supportingData.statistics.push({
        value: fact.statement,
        description: fact.context,
        date: new Date()
      });
    }
    
    if (fact.factType === 'QUOTE') {
      supportingData.quotes.push({
        text: fact.statement,
        context: fact.context,
        date: new Date()
      });
    }
    
    return supportingData;
  }
  
  generateFactTags(fact, article) {
    const tags = [];
    
    // Add category
    tags.push(article.category);
    
    // Add fact type
    tags.push(fact.factType.toLowerCase());
    
    // Add entities as tags
    fact.entities?.forEach(entity => {
      if (entity.name && entity.name.length < 30) {
        tags.push(entity.name.toLowerCase());
      }
    });
    
    // Add temporal scope
    tags.push(fact.temporalScope?.toLowerCase());
    
    return [...new Set(tags)].slice(0, 10);
  }
  
  assessCompleteness(fact) {
    let score = 0;
    if (fact.statement) score += 0.3;
    if (fact.evidence?.length > 0) score += 0.2;
    if (fact.entities?.length > 0) score += 0.2;
    if (fact.context) score += 0.2;
    if (fact.confidence > 0.7) score += 0.1;
    return Math.min(1, score);
  }
  
  assessClarity(statement) {
    if (!statement) return 0;
    
    // Simple clarity assessment based on length and structure
    const words = statement.split(' ');
    if (words.length < 5) return 0.7;
    if (words.length > 50) return 0.5;
    if (statement.includes('?') || statement.includes('...')) return 0.6;
    return 0.8;
  }
  
  isBreakingFact(fact, article) {
    return fact.importance >= 8 && 
           fact.timeRelevance === 'CURRENT' &&
           fact.temporalScope === 'INSTANT';
  }
  
  isSensitiveFact(fact) {
    const sensitiveKeywords = ['death', 'killed', 'accident', 'disaster', 'attack', 'violence', 'abuse', 'scandal'];
    const statement = fact.statement?.toLowerCase() || '';
    return sensitiveKeywords.some(keyword => statement.includes(keyword));
  }

  /**
   * Batch processing methods
   */
  
  async extractFactsFromMultipleArticles(articles, options = {}) {
    console.log(`\n📊 Starting batch fact extraction for ${articles.length} articles...`);
    
    const results = {
      successful: [],
      failed: [],
      totalFactsExtracted: 0,
      totalFactsSaved: 0
    };
    
    // Process in batches to avoid overwhelming the API
    const batchSize = options.batchSize || this.config.batchSize;
    const batches = Math.ceil(articles.length / batchSize);
    
    for (let i = 0; i < batches; i++) {
      const start = i * batchSize;
      const end = Math.min((i + 1) * batchSize, articles.length);
      const batch = articles.slice(start, end);
      
      console.log(`\n📦 Processing batch ${i + 1}/${batches} (${batch.length} articles)`);
      
      // Process batch in parallel with rate limiting
      const batchPromises = batch.map((article, index) => 
        this.delayedExtraction(article, index * 1000) // 1 second delay between requests
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          results.successful.push(result.value);
          results.totalFactsExtracted += result.value.factsExtracted;
          results.totalFactsSaved += result.value.factsSaved;
        } else {
          results.failed.push({
            article: batch[index],
            error: result.reason
          });
        }
      });
    }
    
    console.log('\n📊 Batch extraction complete:');
    console.log(`   ✅ Successful: ${results.successful.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
    console.log(`   📊 Total facts extracted: ${results.totalFactsExtracted}`);
    console.log(`   💾 Total facts saved: ${results.totalFactsSaved}`);
    
    return results;
  }
  
  async delayedExtraction(article, delay) {
    return new Promise((resolve, reject) => {
      setTimeout(async () => {
        try {
          const result = await this.extractFactsFromArticle(article);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, delay);
    });
  }

  /**
   * Extract facts for a specific date range
   */
  async extractFactsForDateRange(startDate, endDate, options = {}) {
    console.log(`\n📅 Extracting facts for articles from ${startDate} to ${endDate}`);
    
    try {
      // Find articles in date range that don't have facts extracted
      const articles = await EnhancedArticle.find({
        'temporalData.publishedAt': {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        },
        $or: [
          { extractedFacts: { $exists: false } },
          { extractedFacts: { $size: 0 } }
        ]
      })
      .limit(options.limit || 100)
      .sort({ 'temporalData.publishedAt': -1 });
      
      if (articles.length === 0) {
        console.log('ℹ️  No articles found requiring fact extraction');
        return { successful: [], failed: [], totalFactsExtracted: 0 };
      }
      
      console.log(`Found ${articles.length} articles requiring fact extraction`);
      
      return await this.extractFactsFromMultipleArticles(articles, options);
      
    } catch (error) {
      console.error('Error extracting facts for date range:', error.message);
      throw error;
    }
  }

  /**
   * Clear the fact cache
   */
  clearCache() {
    this.factCache.clear();
    console.log('✓ Fact extraction cache cleared');
  }
}

// Export singleton instance
export default new TemporalFactExtractor();