import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import Fact from '../../models/Fact.js';
import EnhancedArticle from '../../models/EnhancedArticle.js';
import StoryCluster from '../../models/StoryCluster.js';

dotenv.config();

/**
 * FactEvolutionTracker Service
 * Tracks how facts change and evolve over time across sources
 * Identifies corrections, updates, and narrative shifts
 */
class FactEvolutionTracker {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    this.config = {
      similarityThreshold: 0.7,
      evolutionDetectionWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
      minSourcesForConsensus: 2,
      conflictThreshold: 0.3
    };
  }

  /**
   * Track evolution of a specific fact
   * @param {String} factId - The fact ID to track
   * @param {Object} options - Tracking options
   * @returns {Object} Evolution analysis
   */
  async trackFactEvolution(factId, options = {}) {
    try {
      console.log(`🔄 Tracking evolution for fact: ${factId}`);
      
      const fact = await Fact.findOne({ factId }).populate('sourceArticles.articleId');
      
      if (!fact) {
        throw new Error(`Fact not found: ${factId}`);
      }
      
      // Get all related articles
      const relatedArticles = await this.findRelatedArticles(fact, options);
      
      // Detect evolution events
      const evolutionEvents = await this.detectEvolutionEvents(fact, relatedArticles);
      
      // Analyze changes
      const changeAnalysis = await this.analyzeChanges(fact, evolutionEvents);
      
      // Update fact with evolution data
      if (evolutionEvents.length > 0) {
        await this.updateFactEvolution(fact, evolutionEvents, changeAnalysis);
      }
      
      // Generate evolution timeline
      const timeline = this.generateEvolutionTimeline(fact, evolutionEvents);
      
      return {
        factId,
        originalStatement: fact.statement,
        currentStatement: this.getCurrentStatement(fact),
        evolutionEvents,
        changeAnalysis,
        timeline,
        confidence: this.calculateEvolutionConfidence(evolutionEvents),
        metadata: {
          sourcesAnalyzed: relatedArticles.length,
          evolutionSpan: this.calculateEvolutionSpan(evolutionEvents),
          lastAnalyzed: new Date()
        }
      };
      
    } catch (error) {
      console.error(`❌ Error tracking fact evolution: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find articles that might contain evolved versions of the fact
   */
  async findRelatedArticles(fact, options = {}) {
    const timeWindow = options.timeWindow || this.config.evolutionDetectionWindow;
    const cutoffDate = new Date(fact.timeline.firstReported.getTime() - timeWindow);
    
    // Extract key entities from the fact
    const entities = fact.entities.map(e => e.name);
    
    // Find articles with similar entities published after the fact
    const articles = await EnhancedArticle.find({
      'temporalData.publishedAt': { $gte: cutoffDate },
      $or: [
        { 'entities.name': { $in: entities } },
        { 'extractedFacts.statement': { $regex: this.createFactRegex(fact.statement) } }
      ]
    })
    .sort({ 'temporalData.publishedAt': 1 })
    .limit(options.limit || 50);
    
    console.log(`   Found ${articles.length} potentially related articles`);
    return articles;
  }

  /**
   * Detect evolution events in related articles
   */
  async detectEvolutionEvents(fact, articles) {
    const events = [];
    
    for (const article of articles) {
      // Check each extracted fact in the article
      for (const extractedFact of (article.extractedFacts || [])) {
        const similarity = await this.calculateFactSimilarity(fact.statement, extractedFact.statement);
        
        if (similarity >= this.config.similarityThreshold) {
          // Detect the type of evolution
          const evolutionType = await this.detectEvolutionType(fact.statement, extractedFact.statement);
          
          if (evolutionType !== 'IDENTICAL') {
            events.push({
              timestamp: article.temporalData.publishedAt,
              articleId: article._id,
              source: article.source.name,
              originalStatement: fact.statement,
              evolvedStatement: extractedFact.statement,
              evolutionType,
              confidence: extractedFact.confidence,
              similarity,
              context: {
                articleTitle: article.title,
                articleUrl: article.url,
                category: article.category
              }
            });
          }
        }
      }
    }
    
    // Sort events chronologically
    events.sort((a, b) => a.timestamp - b.timestamp);
    
    console.log(`   Detected ${events.length} evolution events`);
    return events;
  }

  /**
   * Calculate similarity between two fact statements
   */
  async calculateFactSimilarity(statement1, statement2) {
    try {
      const prompt = `
      Compare these two statements and determine their semantic similarity:
      
      Statement 1: "${statement1}"
      Statement 2: "${statement2}"
      
      Return ONLY a number between 0 and 1 representing similarity:
      - 1.0 = Identical or nearly identical
      - 0.8-0.9 = Very similar with minor differences
      - 0.6-0.7 = Similar topic and entities but different details
      - 0.4-0.5 = Somewhat related
      - Below 0.4 = Different facts
      
      Consider:
      - Same entities involved
      - Same event or topic
      - Same time period
      - Same location
      
      RETURN ONLY THE NUMBER:`;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const similarity = parseFloat(response.text().trim());
      
      return isNaN(similarity) ? 0 : Math.min(1, Math.max(0, similarity));
      
    } catch (error) {
      console.warn('Error calculating similarity, using fallback method');
      return this.fallbackSimilarity(statement1, statement2);
    }
  }

  /**
   * Fallback similarity calculation using simple text comparison
   */
  fallbackSimilarity(statement1, statement2) {
    const words1 = new Set(statement1.toLowerCase().split(/\W+/));
    const words2 = new Set(statement2.toLowerCase().split(/\W+/));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size;
  }

  /**
   * Detect the type of evolution between two statements
   */
  async detectEvolutionType(original, evolved) {
    try {
      const prompt = `
      Analyze how this fact has evolved:
      
      ORIGINAL: "${original}"
      EVOLVED: "${evolved}"
      
      Classify the evolution as ONE of:
      - IDENTICAL: No meaningful change
      - CORRECTION: Factual error corrected
      - UPDATE: New information added
      - CLARIFICATION: Made more specific or clear
      - EXPANSION: Additional context or detail
      - RETRACTION: Information withdrawn or denied
      - CONTRADICTION: Direct opposition to original
      - CONTEXT_CHANGE: Same fact, different framing
      
      Return ONLY the classification word:`;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const type = response.text().trim().toUpperCase();
      
      const validTypes = ['IDENTICAL', 'CORRECTION', 'UPDATE', 'CLARIFICATION', 'EXPANSION', 'RETRACTION', 'CONTRADICTION', 'CONTEXT_CHANGE'];
      
      return validTypes.includes(type) ? type : 'UPDATE';
      
    } catch (error) {
      console.warn('Error detecting evolution type, defaulting to UPDATE');
      return 'UPDATE';
    }
  }

  /**
   * Analyze the changes across evolution events
   */
  async analyzeChanges(fact, events) {
    if (events.length === 0) {
      return {
        hasEvolved: false,
        changeCount: 0,
        primaryChangeType: null
      };
    }
    
    // Count change types
    const changeTypes = {};
    events.forEach(event => {
      changeTypes[event.evolutionType] = (changeTypes[event.evolutionType] || 0) + 1;
    });
    
    // Find primary change type
    const primaryChangeType = Object.keys(changeTypes).reduce((a, b) => 
      changeTypes[a] > changeTypes[b] ? a : b
    );
    
    // Analyze change patterns
    const changePatterns = await this.analyzeChangePatterns(events);
    
    // Calculate consensus on current version
    const consensus = await this.calculateEvolutionConsensus(events);
    
    // Detect conflicts
    const conflicts = this.detectConflicts(events);
    
    return {
      hasEvolved: true,
      changeCount: events.length,
      primaryChangeType,
      changeTypes,
      changePatterns,
      consensus,
      conflicts,
      stabilityScore: this.calculateStabilityScore(events),
      lastChange: events[events.length - 1]?.timestamp
    };
  }

  /**
   * Analyze patterns in how the fact has changed
   */
  async analyzeChangePatterns(events) {
    const patterns = {
      convergent: false,  // Multiple sources converging on same version
      divergent: false,   // Sources diverging in different directions
      oscillating: false, // Fact changing back and forth
      progressive: false, // Gradual refinement over time
      sudden: false       // Abrupt major change
    };
    
    if (events.length < 2) return patterns;
    
    // Check for convergence
    const latestStatements = events.slice(-3).map(e => e.evolvedStatement);
    const uniqueLatest = new Set(latestStatements);
    patterns.convergent = uniqueLatest.size === 1 && events.length > 2;
    
    // Check for divergence
    const allStatements = events.map(e => e.evolvedStatement);
    const uniqueAll = new Set(allStatements);
    patterns.divergent = uniqueAll.size > events.length * 0.7;
    
    // Check for oscillation
    for (let i = 0; i < events.length - 2; i++) {
      if (events[i].evolvedStatement === events[i + 2].evolvedStatement &&
          events[i].evolvedStatement !== events[i + 1].evolvedStatement) {
        patterns.oscillating = true;
        break;
      }
    }
    
    // Check for progressive refinement
    const corrections = events.filter(e => e.evolutionType === 'CLARIFICATION' || e.evolutionType === 'UPDATE');
    patterns.progressive = corrections.length > events.length * 0.6;
    
    // Check for sudden change
    const contradictions = events.filter(e => e.evolutionType === 'CONTRADICTION' || e.evolutionType === 'RETRACTION');
    patterns.sudden = contradictions.length > 0;
    
    return patterns;
  }

  /**
   * Calculate consensus on the evolved version of the fact
   */
  async calculateEvolutionConsensus(events) {
    if (events.length === 0) return { level: 1.0, statement: null };
    
    // Group events by evolved statement
    const statementGroups = {};
    events.forEach(event => {
      const key = event.evolvedStatement;
      if (!statementGroups[key]) {
        statementGroups[key] = {
          statement: key,
          sources: [],
          count: 0,
          latestTimestamp: event.timestamp
        };
      }
      statementGroups[key].sources.push(event.source);
      statementGroups[key].count++;
      if (event.timestamp > statementGroups[key].latestTimestamp) {
        statementGroups[key].latestTimestamp = event.timestamp;
      }
    });
    
    // Find the most agreed-upon version
    const consensusStatement = Object.values(statementGroups)
      .sort((a, b) => b.count - a.count)[0];
    
    const consensusLevel = consensusStatement.count / events.length;
    
    return {
      level: consensusLevel,
      statement: consensusStatement.statement,
      sources: [...new Set(consensusStatement.sources)],
      confidence: consensusLevel > 0.7 ? 'HIGH' : consensusLevel > 0.4 ? 'MEDIUM' : 'LOW'
    };
  }

  /**
   * Detect conflicts in evolution events
   */
  detectConflicts(events) {
    const conflicts = [];
    
    // Group events by similar timestamps (within 24 hours)
    const timeGroups = {};
    events.forEach(event => {
      const dayKey = event.timestamp.toISOString().split('T')[0];
      if (!timeGroups[dayKey]) timeGroups[dayKey] = [];
      timeGroups[dayKey].push(event);
    });
    
    // Check for conflicts within each time group
    Object.entries(timeGroups).forEach(([date, groupEvents]) => {
      if (groupEvents.length > 1) {
        // Check for contradictions
        const hasContradiction = groupEvents.some(e => 
          e.evolutionType === 'CONTRADICTION' || e.evolutionType === 'RETRACTION'
        );
        
        // Check for different statements
        const uniqueStatements = new Set(groupEvents.map(e => e.evolvedStatement));
        
        if (hasContradiction || uniqueStatements.size > 1) {
          conflicts.push({
            date,
            type: hasContradiction ? 'CONTRADICTION' : 'DIVERGENCE',
            sources: groupEvents.map(e => ({
              source: e.source,
              statement: e.evolvedStatement,
              evolutionType: e.evolutionType
            }))
          });
        }
      }
    });
    
    return conflicts;
  }

  /**
   * Update fact with evolution data
   */
  async updateFactEvolution(fact, events, analysis) {
    try {
      // Add evolution events to the fact's evolution chain
      for (const event of events) {
        // Check if this evolution already exists
        const existingEvolution = fact.evolutionChain.find(e => 
          e.statement === event.evolvedStatement &&
          Math.abs(e.changedAt - event.timestamp) < 60000 // Within 1 minute
        );
        
        if (!existingEvolution) {
          fact.evolutionChain.push({
            version: fact.evolutionChain.length + 1,
            statement: event.evolvedStatement,
            changedAt: event.timestamp,
            changeReason: event.evolutionType,
            previousStatement: event.originalStatement,
            supportingArticles: [event.articleId],
            changeDescription: `Evolution detected: ${event.evolutionType}`
          });
        }
      }
      
      // Update the main statement if there's strong consensus
      if (analysis.consensus && analysis.consensus.confidence === 'HIGH') {
        fact.statement = analysis.consensus.statement;
      }
      
      // Update verification status based on conflicts
      if (analysis.conflicts && analysis.conflicts.length > 0) {
        fact.flags.isDisputed = true;
        fact.verificationHistory.push({
          date: new Date(),
          status: 'DISPUTED',
          verifiedBy: 'EVOLUTION_TRACKER',
          method: 'AUTOMATED',
          evidence: [`Detected ${analysis.conflicts.length} conflicts in fact evolution`],
          notes: 'Conflicting versions detected across sources'
        });
      }
      
      // Update relevance based on evolution activity
      fact.relevanceScore.trend = this.determineRelevanceTrend(events);
      
      await fact.save();
      console.log(`   ✓ Updated fact with ${events.length} evolution events`);
      
    } catch (error) {
      console.error(`Error updating fact evolution: ${error.message}`);
    }
  }

  /**
   * Generate evolution timeline
   */
  generateEvolutionTimeline(fact, events) {
    const timeline = [];
    
    // Add initial fact
    timeline.push({
      timestamp: fact.timeline.firstReported,
      type: 'INITIAL',
      statement: fact.statement,
      source: fact.sourceArticles[0]?.source || 'Unknown',
      description: 'Initial fact reported'
    });
    
    // Add evolution events
    events.forEach(event => {
      timeline.push({
        timestamp: event.timestamp,
        type: event.evolutionType,
        statement: event.evolvedStatement,
        source: event.source,
        description: this.getEvolutionDescription(event.evolutionType),
        confidence: event.confidence
      });
    });
    
    // Add verification events
    fact.verificationHistory.forEach(verification => {
      timeline.push({
        timestamp: verification.date,
        type: 'VERIFICATION',
        status: verification.status,
        verifiedBy: verification.verifiedBy,
        description: `Verification: ${verification.status}`
      });
    });
    
    // Sort chronologically
    timeline.sort((a, b) => a.timestamp - b.timestamp);
    
    return timeline;
  }

  /**
   * Helper methods
   */
  
  createFactRegex(statement) {
    // Extract key words for regex matching
    const keywords = statement
      .split(/\W+/)
      .filter(word => word.length > 4)
      .slice(0, 3)
      .join('.*');
    
    return new RegExp(keywords, 'i');
  }
  
  getCurrentStatement(fact) {
    if (fact.evolutionChain.length > 0) {
      const latestEvolution = fact.evolutionChain[fact.evolutionChain.length - 1];
      return latestEvolution.statement;
    }
    return fact.statement;
  }
  
  calculateEvolutionConfidence(events) {
    if (events.length === 0) return 1.0;
    
    const avgConfidence = events.reduce((sum, e) => sum + e.confidence, 0) / events.length;
    const avgSimilarity = events.reduce((sum, e) => sum + e.similarity, 0) / events.length;
    
    return (avgConfidence + avgSimilarity) / 2;
  }
  
  calculateEvolutionSpan(events) {
    if (events.length === 0) return { days: 0, hours: 0 };
    
    const first = events[0].timestamp;
    const last = events[events.length - 1].timestamp;
    const diff = last - first;
    
    return {
      days: Math.floor(diff / (24 * 60 * 60 * 1000)),
      hours: Math.floor((diff % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
    };
  }
  
  calculateStabilityScore(events) {
    if (events.length === 0) return 1.0;
    
    // More events = less stability
    const eventPenalty = Math.min(events.length * 0.1, 0.5);
    
    // Contradictions and retractions reduce stability
    const contradictions = events.filter(e => 
      e.evolutionType === 'CONTRADICTION' || e.evolutionType === 'RETRACTION'
    ).length;
    const contradictionPenalty = contradictions * 0.2;
    
    return Math.max(0, 1 - eventPenalty - contradictionPenalty);
  }
  
  determineRelevanceTrend(events) {
    if (events.length === 0) return 'STABLE';
    
    const recentEvents = events.filter(e => 
      Date.now() - e.timestamp < 24 * 60 * 60 * 1000 // Last 24 hours
    );
    
    if (recentEvents.length > 2) return 'VIRAL';
    if (recentEvents.length > 0) return 'RISING';
    
    const lastEvent = events[events.length - 1];
    const daysSinceLastEvent = (Date.now() - lastEvent.timestamp) / (24 * 60 * 60 * 1000);
    
    if (daysSinceLastEvent > 7) return 'DORMANT';
    if (daysSinceLastEvent > 3) return 'DECLINING';
    
    return 'STABLE';
  }
  
  getEvolutionDescription(type) {
    const descriptions = {
      'CORRECTION': 'Factual error corrected',
      'UPDATE': 'New information added',
      'CLARIFICATION': 'Statement clarified',
      'EXPANSION': 'Additional detail provided',
      'RETRACTION': 'Information retracted',
      'CONTRADICTION': 'Contradictory information reported',
      'CONTEXT_CHANGE': 'Context or framing changed'
    };
    
    return descriptions[type] || 'Information evolved';
  }

  /**
   * Track evolution for all facts in a time period
   */
  async trackEvolutionForPeriod(startDate, endDate, options = {}) {
    console.log(`\n🔄 Tracking fact evolution from ${startDate} to ${endDate}`);
    
    try {
      // Find facts that were first reported in this period
      const facts = await Fact.find({
        'timeline.firstReported': {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      })
      .limit(options.limit || 100)
      .sort({ 'timeline.firstReported': -1 });
      
      console.log(`Found ${facts.length} facts to track`);
      
      const results = {
        tracked: [],
        evolved: [],
        stable: [],
        disputed: []
      };
      
      for (const fact of facts) {
        try {
          const evolution = await this.trackFactEvolution(fact.factId, options);
          
          results.tracked.push(evolution);
          
          if (evolution.changeAnalysis.hasEvolved) {
            results.evolved.push(evolution);
            
            if (evolution.changeAnalysis.conflicts.length > 0) {
              results.disputed.push(evolution);
            }
          } else {
            results.stable.push(evolution);
          }
          
        } catch (error) {
          console.warn(`   ⚠️ Failed to track evolution for fact ${fact.factId}`);
        }
      }
      
      console.log('\n📊 Evolution tracking complete:');
      console.log(`   Total tracked: ${results.tracked.length}`);
      console.log(`   Evolved facts: ${results.evolved.length}`);
      console.log(`   Stable facts: ${results.stable.length}`);
      console.log(`   Disputed facts: ${results.disputed.length}`);
      
      return results;
      
    } catch (error) {
      console.error('Error tracking evolution for period:', error.message);
      throw error;
    }
  }

  /**
   * Analyze evolution patterns across multiple facts
   */
  async analyzeEvolutionPatterns(factIds) {
    console.log(`\n📈 Analyzing evolution patterns for ${factIds.length} facts`);
    
    const patterns = {
      corrections: 0,
      updates: 0,
      clarifications: 0,
      contradictions: 0,
      retractions: 0,
      averageEvolutionCount: 0,
      mostVolatileFact: null,
      mostStableFact: null,
      consensusRate: 0
    };
    
    let totalEvolutions = 0;
    let totalConsensus = 0;
    let maxEvolutions = 0;
    let minEvolutions = Infinity;
    
    for (const factId of factIds) {
      const evolution = await this.trackFactEvolution(factId);
      
      if (evolution.changeAnalysis.hasEvolved) {
        // Count evolution types
        Object.entries(evolution.changeAnalysis.changeTypes).forEach(([type, count]) => {
          switch (type) {
            case 'CORRECTION':
              patterns.corrections += count;
              break;
            case 'UPDATE':
              patterns.updates += count;
              break;
            case 'CLARIFICATION':
              patterns.clarifications += count;
              break;
            case 'CONTRADICTION':
              patterns.contradictions += count;
              break;
            case 'RETRACTION':
              patterns.retractions += count;
              break;
          }
        });
        
        totalEvolutions += evolution.changeAnalysis.changeCount;
        totalConsensus += evolution.changeAnalysis.consensus.level;
        
        // Track most and least volatile
        if (evolution.changeAnalysis.changeCount > maxEvolutions) {
          maxEvolutions = evolution.changeAnalysis.changeCount;
          patterns.mostVolatileFact = {
            factId,
            changes: evolution.changeAnalysis.changeCount,
            statement: evolution.originalStatement
          };
        }
        
        if (evolution.changeAnalysis.changeCount < minEvolutions) {
          minEvolutions = evolution.changeAnalysis.changeCount;
          patterns.mostStableFact = {
            factId,
            changes: evolution.changeAnalysis.changeCount,
            statement: evolution.originalStatement
          };
        }
      }
    }
    
    patterns.averageEvolutionCount = factIds.length > 0 ? totalEvolutions / factIds.length : 0;
    patterns.consensusRate = factIds.length > 0 ? totalConsensus / factIds.length : 0;
    
    return patterns;
  }
}

// Export singleton instance
export default new FactEvolutionTracker();