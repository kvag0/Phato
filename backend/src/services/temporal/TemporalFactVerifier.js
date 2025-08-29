import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
import Fact from '../../models/Fact.js';
import EnhancedArticle from '../../models/EnhancedArticle.js';
import StoryCluster from '../../models/StoryCluster.js';

dotenv.config();

/**
 * TemporalFactVerifier Service
 * Cross-temporal and cross-source fact verification system
 * Builds consensus and detects conflicting information
 */
class TemporalFactVerifier {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
    
    this.config = {
      minSourcesForVerification: 2,
      consensusThreshold: 0.7,
      conflictThreshold: 0.3,
      verificationWindow: 7 * 24 * 60 * 60 * 1000, // 7 days
      confidenceWeights: {
        sourceCount: 0.3,
        sourceQuality: 0.2,
        temporalConsistency: 0.2,
        evidenceStrength: 0.3
      }
    };
    
    // Source credibility scores (would be loaded from database in production)
    this.sourceCredibility = {
      'Reuters': 0.95,
      'Associated Press': 0.95,
      'BBC': 0.90,
      'The Guardian': 0.85,
      'The New York Times': 0.85,
      'CNN': 0.80,
      'Fox News': 0.75,
      'default': 0.70
    };
  }

  /**
   * Verify a fact across time and sources
   * @param {String} factId - The fact to verify
   * @param {Object} options - Verification options
   * @returns {Object} Verification result
   */
  async verifyFactAcrossTime(factId, options = {}) {
    try {
      console.log(`✅ Verifying fact: ${factId}`);
      
      const fact = await Fact.findOne({ factId })
        .populate('sourceArticles.articleId');
      
      if (!fact) {
        throw new Error(`Fact not found: ${factId}`);
      }
      
      // Find related facts and articles
      const relatedData = await this.findRelatedFactsAndArticles(fact, options);
      
      // Build consensus across sources
      const consensus = await this.buildConsensus(fact, relatedData);
      
      // Check for temporal consistency
      const temporalConsistency = await this.checkTemporalConsistency(fact, relatedData);
      
      // Detect conflicts
      const conflicts = await this.detectConflicts(fact, relatedData);
      
      // Calculate verification confidence
      const verificationResult = this.calculateVerificationConfidence(
        consensus,
        temporalConsistency,
        conflicts,
        relatedData
      );
      
      // Update fact with verification result
      await this.updateFactVerification(fact, verificationResult);
      
      // Generate verification report
      const report = this.generateVerificationReport(
        fact,
        consensus,
        temporalConsistency,
        conflicts,
        verificationResult
      );
      
      return report;
      
    } catch (error) {
      console.error(`❌ Error verifying fact: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find related facts and articles for verification
   */
  async findRelatedFactsAndArticles(fact, options = {}) {
    const timeWindow = options.timeWindow || this.config.verificationWindow;
    const startDate = new Date(fact.timeline.firstReported.getTime() - timeWindow);
    const endDate = new Date(fact.timeline.firstReported.getTime() + timeWindow);
    
    // Extract key entities for searching
    const entities = fact.entities.map(e => e.name);
    
    // Find similar facts
    const similarFacts = await Fact.find({
      _id: { $ne: fact._id },
      'timeline.firstReported': { $gte: startDate, $lte: endDate },
      $or: [
        { 'entities.name': { $in: entities } },
        { tags: { $in: fact.tags } }
      ]
    }).limit(20);
    
    // Find related articles
    const relatedArticles = await EnhancedArticle.find({
      'temporalData.publishedAt': { $gte: startDate, $lte: endDate },
      $or: [
        { 'entities.name': { $in: entities } },
        { 'extractedFacts.factId': factId },
        { tags: { $in: fact.tags } }
      ]
    }).limit(30);
    
    // Find story clusters
    const storyClusters = await StoryCluster.find({
      'timespan.start': { $lte: endDate },
      'timespan.end': { $gte: startDate },
      'mainEntities.name': { $in: entities }
    }).limit(10);
    
    console.log(`   Found ${similarFacts.length} similar facts, ${relatedArticles.length} articles, ${storyClusters.length} clusters`);
    
    return {
      similarFacts,
      relatedArticles,
      storyClusters
    };
  }

  /**
   * Build consensus across sources
   */
  async buildConsensus(fact, relatedData) {
    const { similarFacts, relatedArticles, storyClusters } = relatedData;
    
    // Analyze similar facts for agreement
    const factAgreement = await this.analyzeFactAgreement(fact, similarFacts);
    
    // Check article consistency
    const articleConsistency = await this.analyzeArticleConsistency(fact, relatedArticles);
    
    // Analyze cluster consensus
    const clusterConsensus = this.analyzeClusterConsensus(fact, storyClusters);
    
    // Combine consensus scores
    const overallConsensus = {
      agreementLevel: (
        factAgreement.agreementScore * 0.4 +
        articleConsistency.consistencyScore * 0.4 +
        clusterConsensus.consensusScore * 0.2
      ),
      supportingSources: [
        ...factAgreement.supportingSources,
        ...articleConsistency.consistentSources
      ],
      dissentingSources: [
        ...factAgreement.dissentingSources,
        ...articleConsistency.inconsistentSources
      ],
      neutralSources: factAgreement.neutralSources,
      totalSources: new Set([
        ...factAgreement.allSources,
        ...articleConsistency.allSources
      ]).size,
      details: {
        factAgreement,
        articleConsistency,
        clusterConsensus
      }
    };
    
    return overallConsensus;
  }

  /**
   * Analyze agreement among similar facts
   */
  async analyzeFactAgreement(originalFact, similarFacts) {
    const agreement = {
      agreementScore: 0,
      supportingSources: [],
      dissentingSources: [],
      neutralSources: [],
      allSources: []
    };
    
    if (similarFacts.length === 0) {
      agreement.agreementScore = 0.5; // Neutral if no similar facts
      return agreement;
    }
    
    let supportCount = 0;
    let dissentCount = 0;
    
    for (const similarFact of similarFacts) {
      const similarity = await this.calculateFactSimilarity(
        originalFact.statement,
        similarFact.statement
      );
      
      const sources = similarFact.sourceArticles.map(s => s.source);
      agreement.allSources.push(...sources);
      
      if (similarity > 0.8) {
        supportCount++;
        agreement.supportingSources.push(...sources);
      } else if (similarity < 0.3) {
        dissentCount++;
        agreement.dissentingSources.push(...sources);
      } else {
        agreement.neutralSources.push(...sources);
      }
    }
    
    agreement.agreementScore = supportCount / (supportCount + dissentCount + 1);
    
    // Deduplicate sources
    agreement.supportingSources = [...new Set(agreement.supportingSources)];
    agreement.dissentingSources = [...new Set(agreement.dissentingSources)];
    agreement.neutralSources = [...new Set(agreement.neutralSources)];
    
    return agreement;
  }

  /**
   * Analyze article consistency
   */
  async analyzeArticleConsistency(fact, articles) {
    const consistency = {
      consistencyScore: 0,
      consistentSources: [],
      inconsistentSources: [],
      allSources: []
    };
    
    if (articles.length === 0) {
      consistency.consistencyScore = 0.5;
      return consistency;
    }
    
    let consistentCount = 0;
    let inconsistentCount = 0;
    
    for (const article of articles) {
      const source = article.source?.name || 'Unknown';
      consistency.allSources.push(source);
      
      // Check if article contains facts that support or contradict
      const supportingFacts = article.extractedFacts?.filter(f => 
        this.isFactSupporting(fact, f)
      ) || [];
      
      const contradictingFacts = article.extractedFacts?.filter(f => 
        this.isFactContradicting(fact, f)
      ) || [];
      
      if (supportingFacts.length > contradictingFacts.length) {
        consistentCount++;
        consistency.consistentSources.push(source);
      } else if (contradictingFacts.length > supportingFacts.length) {
        inconsistentCount++;
        consistency.inconsistentSources.push(source);
      }
    }
    
    consistency.consistencyScore = consistentCount / (consistentCount + inconsistentCount + 1);
    
    // Deduplicate sources
    consistency.consistentSources = [...new Set(consistency.consistentSources)];
    consistency.inconsistentSources = [...new Set(consistency.inconsistentSources)];
    
    return consistency;
  }

  /**
   * Analyze cluster consensus
   */
  analyzeClusterConsensus(fact, clusters) {
    const consensus = {
      consensusScore: 0,
      agreementClusters: [],
      disagreementClusters: []
    };
    
    if (clusters.length === 0) {
      consensus.consensusScore = 0.5;
      return consensus;
    }
    
    clusters.forEach(cluster => {
      // Check if cluster's fact consensus includes this fact
      const matchingConsensus = cluster.factConsensus?.find(fc => 
        this.isFactMatching(fact.statement, fc.fact)
      );
      
      if (matchingConsensus) {
        if (matchingConsensus.agreement_level > this.config.consensusThreshold) {
          consensus.agreementClusters.push({
            clusterId: cluster.clusterId,
            title: cluster.title,
            agreementLevel: matchingConsensus.agreement_level
          });
        } else {
          consensus.disagreementClusters.push({
            clusterId: cluster.clusterId,
            title: cluster.title,
            agreementLevel: matchingConsensus.agreement_level
          });
        }
      }
    });
    
    consensus.consensusScore = consensus.agreementClusters.length / 
      (consensus.agreementClusters.length + consensus.disagreementClusters.length + 1);
    
    return consensus;
  }

  /**
   * Check temporal consistency
   */
  async checkTemporalConsistency(fact, relatedData) {
    const { relatedArticles } = relatedData;
    
    // Group articles by time periods
    const timeGroups = this.groupByTimePeriod(relatedArticles);
    
    // Analyze consistency across time
    const consistency = {
      isConsistent: true,
      inconsistencyPoints: [],
      consistencyScore: 1.0,
      timeline: []
    };
    
    let previousStatement = fact.statement;
    let inconsistencyCount = 0;
    
    for (const [period, articles] of Object.entries(timeGroups)) {
      const periodFacts = articles.flatMap(a => a.extractedFacts || [])
        .filter(f => this.isRelatedFact(fact, f));
      
      if (periodFacts.length > 0) {
        // Find most common version in this period
        const commonVersion = await this.findMostCommonVersion(periodFacts);
        
        consistency.timeline.push({
          period,
          statement: commonVersion.statement,
          sourceCount: commonVersion.sources.length,
          confidence: commonVersion.confidence
        });
        
        // Check for inconsistency
        const similarity = await this.calculateFactSimilarity(
          previousStatement,
          commonVersion.statement
        );
        
        if (similarity < 0.7) {
          inconsistencyCount++;
          consistency.inconsistencyPoints.push({
            period,
            previousStatement,
            newStatement: commonVersion.statement,
            similarity
          });
        }
        
        previousStatement = commonVersion.statement;
      }
    }
    
    consistency.isConsistent = inconsistencyCount === 0;
    consistency.consistencyScore = Math.max(0, 1 - (inconsistencyCount * 0.2));
    
    return consistency;
  }

  /**
   * Detect conflicts in fact reporting
   */
  async detectConflicts(fact, relatedData) {
    const { similarFacts, relatedArticles } = relatedData;
    const conflicts = [];
    
    // Check for direct contradictions
    for (const similarFact of similarFacts) {
      const isContradiction = await this.isContradiction(fact.statement, similarFact.statement);
      
      if (isContradiction) {
        conflicts.push({
          type: 'CONTRADICTION',
          originalStatement: fact.statement,
          conflictingStatement: similarFact.statement,
          sources: similarFact.sourceArticles.map(s => s.source),
          timestamp: similarFact.timeline.firstReported,
          severity: 'HIGH'
        });
      }
    }
    
    // Check for significant variations
    const variations = await this.detectSignificantVariations(fact, relatedArticles);
    conflicts.push(...variations);
    
    // Analyze conflict patterns
    const conflictAnalysis = {
      hasConflicts: conflicts.length > 0,
      conflictCount: conflicts.length,
      conflicts,
      conflictTypes: this.categorizeConflicts(conflicts),
      severityDistribution: this.analyzeSeverity(conflicts),
      temporalPattern: this.analyzeConflictTiming(conflicts)
    };
    
    return conflictAnalysis;
  }

  /**
   * Calculate verification confidence
   */
  calculateVerificationConfidence(consensus, temporalConsistency, conflicts, relatedData) {
    const weights = this.config.confidenceWeights;
    
    // Source count score
    const sourceCountScore = Math.min(1, consensus.totalSources / 10);
    
    // Source quality score
    const sourceQualityScore = this.calculateSourceQualityScore(consensus);
    
    // Temporal consistency score
    const temporalScore = temporalConsistency.consistencyScore;
    
    // Evidence strength (inverse of conflicts)
    const evidenceScore = conflicts.hasConflicts 
      ? Math.max(0, 1 - (conflicts.conflictCount * 0.1))
      : 1.0;
    
    // Calculate weighted confidence
    const confidence = 
      sourceCountScore * weights.sourceCount +
      sourceQualityScore * weights.sourceQuality +
      temporalScore * weights.temporalConsistency +
      evidenceScore * weights.evidenceStrength;
    
    // Determine verification status
    let status = 'UNVERIFIED';
    if (confidence > 0.8 && consensus.agreementLevel > 0.7) {
      status = 'VERIFIED';
    } else if (confidence < 0.4 || conflicts.conflictCount > 3) {
      status = 'DISPUTED';
    } else if (consensus.totalSources < this.config.minSourcesForVerification) {
      status = 'UNVERIFIED';
    } else {
      status = 'PARTIALLY_TRUE';
    }
    
    return {
      confidence,
      status,
      scores: {
        sourceCount: sourceCountScore,
        sourceQuality: sourceQualityScore,
        temporalConsistency: temporalScore,
        evidenceStrength: evidenceScore
      },
      reasoning: this.generateVerificationReasoning(
        confidence,
        status,
        consensus,
        temporalConsistency,
        conflicts
      )
    };
  }

  /**
   * Update fact with verification result
   */
  async updateFactVerification(fact, verificationResult) {
    try {
      // Add verification to history
      fact.verificationHistory.push({
        date: new Date(),
        status: verificationResult.status,
        verifiedBy: 'TEMPORAL_FACT_VERIFIER',
        method: 'AI',
        evidence: [verificationResult.reasoning],
        confidence: verificationResult.confidence,
        notes: `Cross-temporal verification with confidence ${verificationResult.confidence.toFixed(2)}`
      });
      
      // Update verification date if verified
      if (verificationResult.status === 'VERIFIED') {
        fact.timeline.verificationDate = new Date();
      }
      
      // Update flags
      fact.flags.needsVerification = verificationResult.status === 'UNVERIFIED';
      fact.flags.isDisputed = verificationResult.status === 'DISPUTED';
      
      // Update consensus
      fact.consensus.agreementLevel = verificationResult.confidence;
      fact.consensus.lastCalculated = new Date();
      
      await fact.save();
      console.log(`   ✓ Updated fact verification: ${verificationResult.status}`);
      
    } catch (error) {
      console.error(`Error updating fact verification: ${error.message}`);
    }
  }

  /**
   * Generate verification report
   */
  generateVerificationReport(fact, consensus, temporalConsistency, conflicts, verificationResult) {
    return {
      factId: fact.factId,
      statement: fact.statement,
      verificationResult: {
        status: verificationResult.status,
        confidence: verificationResult.confidence,
        timestamp: new Date()
      },
      consensus: {
        agreementLevel: consensus.agreementLevel,
        supportingSources: consensus.supportingSources.length,
        dissentingSources: consensus.dissentingSources.length,
        totalSources: consensus.totalSources
      },
      temporalAnalysis: {
        isConsistent: temporalConsistency.isConsistent,
        consistencyScore: temporalConsistency.consistencyScore,
        timelineLength: temporalConsistency.timeline.length,
        inconsistencyCount: temporalConsistency.inconsistencyPoints.length
      },
      conflicts: {
        detected: conflicts.hasConflicts,
        count: conflicts.conflictCount,
        types: conflicts.conflictTypes,
        severity: conflicts.severityDistribution
      },
      scores: verificationResult.scores,
      reasoning: verificationResult.reasoning,
      recommendations: this.generateRecommendations(verificationResult, conflicts)
    };
  }

  /**
   * Helper methods
   */
  
  async calculateFactSimilarity(statement1, statement2) {
    try {
      const prompt = `
      Compare these two statements for factual similarity:
      
      Statement 1: "${statement1}"
      Statement 2: "${statement2}"
      
      Return ONLY a number between 0 and 1:
      - 1.0 = Identical facts
      - 0.7-0.9 = Same fact with minor variations
      - 0.4-0.6 = Related but different facts
      - Below 0.3 = Contradictory or unrelated
      
      Consider factual content, not exact wording.
      RETURN ONLY THE NUMBER:`;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const similarity = parseFloat(response.text().trim());
      
      return isNaN(similarity) ? 0.5 : Math.min(1, Math.max(0, similarity));
      
    } catch (error) {
      // Fallback to simple comparison
      return this.simpleSimilarity(statement1, statement2);
    }
  }
  
  simpleSimilarity(statement1, statement2) {
    const words1 = new Set(statement1.toLowerCase().split(/\W+/));
    const words2 = new Set(statement2.toLowerCase().split(/\W+/));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
  }
  
  isFactSupporting(originalFact, checkFact) {
    // Simple check - would be more sophisticated in production
    const similarity = this.simpleSimilarity(originalFact.statement, checkFact.statement);
    return similarity > 0.7 && checkFact.verificationStatus !== 'DISPUTED';
  }
  
  isFactContradicting(originalFact, checkFact) {
    // Check for contradiction indicators
    const contradictionWords = ['not', 'false', 'incorrect', 'denied', 'refuted'];
    const hasContradiction = contradictionWords.some(word => 
      checkFact.statement.toLowerCase().includes(word)
    );
    const similarity = this.simpleSimilarity(originalFact.statement, checkFact.statement);
    return hasContradiction && similarity > 0.3;
  }
  
  isFactMatching(statement1, statement2) {
    const similarity = this.simpleSimilarity(statement1, statement2);
    return similarity > 0.6;
  }
  
  isRelatedFact(originalFact, checkFact) {
    // Check if facts are related based on entities and content
    const sharedEntities = originalFact.entities?.filter(e1 => 
      checkFact.entities?.some(e2 => e1.name === e2.name)
    );
    return sharedEntities?.length > 0 || 
           this.simpleSimilarity(originalFact.statement, checkFact.statement) > 0.4;
  }
  
  groupByTimePeriod(articles) {
    const groups = {};
    
    articles.forEach(article => {
      const date = new Date(article.temporalData.publishedAt);
      const periodKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      
      if (!groups[periodKey]) {
        groups[periodKey] = [];
      }
      groups[periodKey].push(article);
    });
    
    return groups;
  }
  
  async findMostCommonVersion(facts) {
    const versions = {};
    
    for (const fact of facts) {
      const key = fact.statement;
      if (!versions[key]) {
        versions[key] = {
          statement: key,
          count: 0,
          sources: [],
          confidence: 0
        };
      }
      versions[key].count++;
      versions[key].sources.push(fact.source || 'Unknown');
      versions[key].confidence += fact.confidence || 0.5;
    }
    
    // Find most common version
    const mostCommon = Object.values(versions)
      .sort((a, b) => b.count - a.count)[0];
    
    if (mostCommon) {
      mostCommon.confidence = mostCommon.confidence / mostCommon.count;
    }
    
    return mostCommon || { statement: '', sources: [], confidence: 0 };
  }
  
  async isContradiction(statement1, statement2) {
    try {
      const prompt = `
      Determine if these statements contradict each other:
      
      Statement 1: "${statement1}"
      Statement 2: "${statement2}"
      
      Return ONLY "YES" if they directly contradict, "NO" otherwise:`;
      
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text().trim().toUpperCase() === 'YES';
      
    } catch (error) {
      return false;
    }
  }
  
  async detectSignificantVariations(fact, articles) {
    const variations = [];
    
    for (const article of articles) {
      const relatedFacts = article.extractedFacts?.filter(f => 
        this.isRelatedFact(fact, f)
      ) || [];
      
      for (const relatedFact of relatedFacts) {
        const similarity = await this.calculateFactSimilarity(
          fact.statement,
          relatedFact.statement
        );
        
        if (similarity > 0.3 && similarity < 0.7) {
          variations.push({
            type: 'VARIATION',
            originalStatement: fact.statement,
            conflictingStatement: relatedFact.statement,
            sources: [article.source?.name || 'Unknown'],
            timestamp: article.temporalData.publishedAt,
            severity: similarity < 0.5 ? 'MEDIUM' : 'LOW',
            similarity
          });
        }
      }
    }
    
    return variations;
  }
  
  categorizeConflicts(conflicts) {
    const categories = {
      CONTRADICTION: 0,
      VARIATION: 0,
      OMISSION: 0,
      AMPLIFICATION: 0
    };
    
    conflicts.forEach(conflict => {
      categories[conflict.type] = (categories[conflict.type] || 0) + 1;
    });
    
    return categories;
  }
  
  analyzeSeverity(conflicts) {
    const severity = {
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };
    
    conflicts.forEach(conflict => {
      severity[conflict.severity] = (severity[conflict.severity] || 0) + 1;
    });
    
    return severity;
  }
  
  analyzeConflictTiming(conflicts) {
    if (conflicts.length === 0) return { pattern: 'NONE' };
    
    const timestamps = conflicts.map(c => c.timestamp).sort();
    const first = timestamps[0];
    const last = timestamps[timestamps.length - 1];
    const duration = last - first;
    
    if (duration < 24 * 60 * 60 * 1000) {
      return { pattern: 'SIMULTANEOUS', duration: 'same_day' };
    } else if (duration < 7 * 24 * 60 * 60 * 1000) {
      return { pattern: 'RAPID', duration: 'within_week' };
    } else {
      return { pattern: 'GRADUAL', duration: 'over_time' };
    }
  }
  
  calculateSourceQualityScore(consensus) {
    const allSources = [
      ...consensus.supportingSources,
      ...consensus.dissentingSources
    ];
    
    if (allSources.length === 0) return 0.5;
    
    const totalCredibility = allSources.reduce((sum, source) => {
      return sum + (this.sourceCredibility[source] || this.sourceCredibility.default);
    }, 0);
    
    return totalCredibility / allSources.length;
  }
  
  generateVerificationReasoning(confidence, status, consensus, temporalConsistency, conflicts) {
    const reasons = [];
    
    if (status === 'VERIFIED') {
      reasons.push(`High confidence (${(confidence * 100).toFixed(1)}%) based on multiple factors`);
      reasons.push(`${consensus.supportingSources.length} sources support this fact`);
      if (temporalConsistency.isConsistent) {
        reasons.push('Fact remains consistent across time periods');
      }
    } else if (status === 'DISPUTED') {
      reasons.push(`Low confidence (${(confidence * 100).toFixed(1)}%) due to conflicts`);
      if (conflicts.conflictCount > 0) {
        reasons.push(`${conflicts.conflictCount} conflicting reports detected`);
      }
      if (consensus.dissentingSources.length > 0) {
        reasons.push(`${consensus.dissentingSources.length} sources dispute this fact`);
      }
    } else if (status === 'UNVERIFIED') {
      reasons.push('Insufficient sources for verification');
      reasons.push(`Only ${consensus.totalSources} sources available`);
    } else {
      reasons.push('Mixed evidence suggests partial truth');
      reasons.push(`Agreement level: ${(consensus.agreementLevel * 100).toFixed(1)}%`);
    }
    
    return reasons.join('. ');
  }
  
  generateRecommendations(verificationResult, conflicts) {
    const recommendations = [];
    
    if (verificationResult.status === 'UNVERIFIED') {
      recommendations.push('Seek additional sources for verification');
      recommendations.push('Wait for more reporting to emerge');
    } else if (verificationResult.status === 'DISPUTED') {
      recommendations.push('Exercise caution when citing this fact');
      recommendations.push('Present multiple perspectives');
      recommendations.push('Highlight the disputed nature');
    } else if (verificationResult.status === 'PARTIALLY_TRUE') {
      recommendations.push('Provide context about variations');
      recommendations.push('Cite specific sources for each version');
    }
    
    if (conflicts.conflictCount > 2) {
      recommendations.push('Monitor for evolving information');
    }
    
    return recommendations;
  }

  /**
   * Batch verification for multiple facts
   */
  async verifyMultipleFacts(factIds, options = {}) {
    console.log(`\n✅ Batch verification for ${factIds.length} facts`);
    
    const results = {
      verified: [],
      disputed: [],
      unverified: [],
      partiallyTrue: [],
      failed: []
    };
    
    for (const factId of factIds) {
      try {
        const verification = await this.verifyFactAcrossTime(factId, options);
        
        switch (verification.verificationResult.status) {
          case 'VERIFIED':
            results.verified.push(verification);
            break;
          case 'DISPUTED':
            results.disputed.push(verification);
            break;
          case 'UNVERIFIED':
            results.unverified.push(verification);
            break;
          case 'PARTIALLY_TRUE':
            results.partiallyTrue.push(verification);
            break;
        }
        
      } catch (error) {
        results.failed.push({ factId, error: error.message });
        console.warn(`   ⚠️ Failed to verify fact ${factId}`);
      }
    }
    
    console.log('\n📊 Batch verification complete:');
    console.log(`   ✅ Verified: ${results.verified.length}`);
    console.log(`   ⚠️ Disputed: ${results.disputed.length}`);
    console.log(`   ❓ Unverified: ${results.unverified.length}`);
    console.log(`   ⚡ Partially True: ${results.partiallyTrue.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
    
    return results;
  }

  /**
   * Continuous verification for recent facts
   */
  async continuousVerification(options = {}) {
    console.log('\n🔄 Running continuous fact verification...');
    
    const cutoffDate = new Date(Date.now() - (options.days || 7) * 24 * 60 * 60 * 1000);
    
    // Find facts needing verification
    const factsToVerify = await Fact.find({
      $or: [
        { 'flags.needsVerification': true },
        { 'timeline.lastUpdated': { $gte: cutoffDate } },
        { 'verificationHistory': { $size: 0 } }
      ]
    })
    .limit(options.limit || 50)
    .sort({ 'classification.importance': -1 });
    
    console.log(`Found ${factsToVerify.length} facts to verify`);
    
    const factIds = factsToVerify.map(f => f.factId);
    return await this.verifyMultipleFacts(factIds, options);
  }
}

// Export singleton instance
export default new TemporalFactVerifier();