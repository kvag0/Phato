import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

class NewsAggregator {
  constructor() {
    this.sources = {
      newsapi: {
        baseUrl: 'https://newsapi.org/v2',
        apiKey: process.env.NEWS_API_KEY
      },
      guardian: {
        baseUrl: 'https://content.guardianapis.com',
        apiKey: process.env.GUARDIAN_API_KEY
      },
      nyt: {
        baseUrl: 'https://api.nytimes.com/svc',
        apiKey: process.env.NYT_API_KEY
      }
    };
  }

  async fetchFromNewsAPI(category = 'general', pageSize = 20) {
    try {
      const categoryMap = {
        economy: 'business',
        politics: 'politics',
        health: 'health',
        environment: 'environment',
        technology: 'technology',
        world: 'general'
      };

      const response = await axios.get(`${this.sources.newsapi.baseUrl}/top-headlines`, {
        params: {
          apiKey: this.sources.newsapi.apiKey,
          category: categoryMap[category] || 'general',
          pageSize,
          language: 'en'
        }
      });

      return response.data.articles.map(article => ({
        title: article.title,
        url: article.url,
        source: {
          name: article.source.name,
          id: article.source.id
        },
        author: article.author,
        publishedAt: new Date(article.publishedAt),
        category,
        content: article.content,
        description: article.description,
        imageUrl: article.urlToImage
      }));
    } catch (error) {
      console.error('NewsAPI fetch error:', error.message);
      return [];
    }
  }

  async fetchFromGuardian(category = 'world', pageSize = 20) {
    try {
      const sectionMap = {
        economy: 'business',
        politics: 'politics',
        health: 'society',
        environment: 'environment',
        technology: 'technology',
        world: 'world'
      };

      const response = await axios.get(`${this.sources.guardian.baseUrl}/search`, {
        params: {
          'api-key': this.sources.guardian.apiKey,
          section: sectionMap[category] || 'world',
          'page-size': pageSize,
          'show-fields': 'trailText,body,thumbnail',
          'order-by': 'newest'
        }
      });

      return response.data.response.results.map(article => ({
        title: article.webTitle,
        url: article.webUrl,
        source: {
          name: 'The Guardian',
          id: 'the-guardian'
        },
        publishedAt: new Date(article.webPublicationDate),
        category,
        content: article.fields?.body,
        description: article.fields?.trailText,
        imageUrl: article.fields?.thumbnail
      }));
    } catch (error) {
      console.error('Guardian API fetch error:', error.message);
      return [];
    }
  }

  async fetchFromNYT(category = 'world', pageSize = 20) {
    try {
      const sectionMap = {
        economy: 'business',
        politics: 'politics',
        health: 'health',
        environment: 'climate',
        technology: 'technology',
        world: 'world'
      };

      const response = await axios.get(
        `${this.sources.nyt.baseUrl}/topstories/v2/${sectionMap[category] || 'home'}.json`,
        {
          params: {
            'api-key': this.sources.nyt.apiKey
          }
        }
      );

      return response.data.results.slice(0, pageSize).map(article => ({
        title: article.title,
        url: article.url,
        source: {
          name: 'The New York Times',
          id: 'nyt'
        },
        author: article.byline,
        publishedAt: new Date(article.published_date),
        category,
        content: article.abstract,
        description: article.abstract,
        imageUrl: article.multimedia?.[0]?.url
      }));
    } catch (error) {
      console.error('NYT API fetch error:', error.message);
      return [];
    }
  }

  async aggregateNews(category = 'world', pageSize = 20) {
    const promises = [];
    
    if (this.sources.newsapi.apiKey) {
      promises.push(this.fetchFromNewsAPI(category, pageSize));
    }
    
    if (this.sources.guardian.apiKey) {
      promises.push(this.fetchFromGuardian(category, pageSize));
    }
    
    if (this.sources.nyt.apiKey) {
      promises.push(this.fetchFromNYT(category, pageSize));
    }

    const results = await Promise.allSettled(promises);
    const articles = results
      .filter(result => result.status === 'fulfilled')
      .flatMap(result => result.value)
      .filter(article => article.title && article.url)
      .sort((a, b) => b.publishedAt - a.publishedAt);

    const uniqueArticles = Array.from(
      new Map(articles.map(article => [article.url, article])).values()
    );

    return uniqueArticles.slice(0, pageSize);
  }
}

export default new NewsAggregator();