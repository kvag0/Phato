import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';

dotenv.config();

class GeminiAnalyzer {
  constructor() {
    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  async analyzeArticle(article) {
    try {
      const factExtractionPrompt = `
        Analyze the following news article and extract ONLY the verifiable facts.
        
        Title: ${article.title}
        Content: ${article.content || article.description}
        
        Extract and structure the facts in this JSON format:
        {
          "who": ["List of people/organizations involved"],
          "what": "Brief factual description of what happened",
          "when": "When it happened (date/time if available)",
          "where": ["Location(s) where it happened"],
          "why": "Factual reason if explicitly stated, otherwise null",
          "summary": "2-3 sentence factual summary without any interpretation"
        }
        
        Rules:
        - Include ONLY verifiable facts explicitly stated in the article
        - Do not include opinions, predictions, or interpretations
        - If information is not available, use null or empty array
        - Keep responses concise and factual
      `;

      const narrativeAnalysisPrompt = `
        Analyze the following news article and identify different ideological narratives.
        
        Title: ${article.title}
        Content: ${article.content || article.description}
        
        Identify how different political perspectives might frame this story.
        Return a JSON array with at least 2 different perspectives (if applicable):
        [
          {
            "perspective": "left|center-left|center|center-right|right",
            "title": "How this perspective would headline the story",
            "summary": "2-3 sentence summary from this perspective",
            "emphasis": ["Key points this perspective emphasizes"],
            "interpretation": "How this perspective interprets the facts"
          }
        ]
        
        Rules:
        - Be balanced and fair to all perspectives
        - Base narratives on common ideological frameworks
        - Don't create strawman arguments
        - If the story is truly neutral, indicate that
      `;

      const [factsResult, narrativesResult] = await Promise.all([
        this.model.generateContent(factExtractionPrompt),
        this.model.generateContent(narrativeAnalysisPrompt)
      ]);

      const factsText = factsResult.response.text();
      const narrativesText = narrativesResult.response.text();

      const facts = this.parseJSON(factsText);
      const narratives = this.parseJSON(narrativesText);

      return {
        facts: facts || this.getDefaultFacts(),
        narratives: Array.isArray(narratives) ? narratives : [],
        analyzedAt: new Date(),
        geminiVersion: 'gemini-2.0-flash'
      };
    } catch (error) {
      console.error('Gemini analysis error:', error);
      throw new Error('Failed to analyze article with Gemini');
    }
  }

  parseJSON(text) {
    try {
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/);
      const jsonString = jsonMatch ? jsonMatch[1] : text;
      return JSON.parse(jsonString.trim());
    } catch (error) {
      const objectMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/);
      if (objectMatch) {
        try {
          return JSON.parse(objectMatch[0]);
        } catch (e) {
          console.error('Failed to parse JSON:', e);
          return null;
        }
      }
      return null;
    }
  }

  getDefaultFacts() {
    return {
      who: [],
      what: null,
      when: null,
      where: [],
      why: null,
      summary: null
    };
  }
}

export default new GeminiAnalyzer();