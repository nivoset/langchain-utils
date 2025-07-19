import { BskyAgent } from '@atproto/api';
import { client } from '../database/init.js';
import { generateEmbedding } from './embedding.service.js';

export interface BlueskyPost {
  uri: string;
  cid: string;
  author: string;
  text: string;
  createdAt: string;
  indexedAt: string;
  likes: number;
  reposts: number;
  replies: number;
  hashtags: string[];
  mentions: string[];
  urls: string[];
}

export interface BlueskyEvent {
  id: string;
  title: string;
  description: string;
  date: string;
  location: string;
  url: string;
  hashtags: string[];
  source: string;
}

export class BlueskyService {
  private agent: BskyAgent;
  private isAuthenticated: boolean = false;

  constructor() {
    this.agent = new BskyAgent({
      service: 'https://bsky.social'
    });
  }

  async authenticate(identifier: string, password: string): Promise<boolean> {
    try {
      await this.agent.login({
        identifier,
        password
      });
      this.isAuthenticated = true;
      console.log('✅ Authenticated with Bluesky');
      return true;
    } catch (error) {
      console.error('❌ Bluesky authentication failed:', error);
      return false;
    }
  }

  async searchTechNews(query: string = 'tech news', limit: number = 50): Promise<BlueskyPost[]> {
    if (!this.isAuthenticated) {
      console.warn('⚠️ Not authenticated with Bluesky, using public search');
    }

    try {
      const response = await this.agent.api.app.bsky.feed.searchPosts({
        q: query,
        limit
      });

      return response.data.posts.map((post: any) => ({
        uri: post.uri,
        cid: post.cid,
        author: post.author.handle,
        text: post.record.text,
        createdAt: post.record.createdAt,
        indexedAt: post.indexedAt,
        likes: post.likeCount || 0,
        reposts: post.repostCount || 0,
        replies: post.replyCount || 0,
        hashtags: this.extractHashtags(post.record.text),
        mentions: this.extractMentions(post.record.text),
        urls: this.extractUrls(post.record.text)
      }));
    } catch (error) {
      console.error('Error searching Bluesky posts:', error);
      return [];
    }
  }

  async searchEvents(query: string = 'tech event', limit: number = 30): Promise<BlueskyEvent[]> {
    try {
      const posts = await this.searchTechNews(query, limit);
      const events: BlueskyEvent[] = [];

      for (const post of posts) {
        const event = this.extractEventFromPost(post);
        if (event) {
          events.push(event);
        }
      }

      return events;
    } catch (error) {
      console.error('Error searching Bluesky events:', error);
      return [];
    }
  }

  async getTrendingTechHashtags(limit: number = 20): Promise<string[]> {
    try {
      const posts = await this.searchTechNews('tech', 100);
      const hashtagCounts: { [key: string]: number } = {};

      posts.forEach(post => {
        post.hashtags.forEach(tag => {
          hashtagCounts[tag] = (hashtagCounts[tag] || 0) + 1;
        });
      });

      return Object.entries(hashtagCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([tag]) => tag);
    } catch (error) {
      console.error('Error getting trending hashtags:', error);
      return [];
    }
  }

  async getTechInfluencers(limit: number = 20): Promise<string[]> {
    try {
      const posts = await this.searchTechNews('tech', 100);
      const authorCounts: { [key: string]: number } = {};

      posts.forEach(post => {
        authorCounts[post.author] = (authorCounts[post.author] || 0) + 1;
      });

      return Object.entries(authorCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, limit)
        .map(([author]) => author);
    } catch (error) {
      console.error('Error getting tech influencers:', error);
      return [];
    }
  }

  private extractHashtags(text: string): string[] {
    const hashtagRegex = /#(\w+)/g;
    const matches = text.match(hashtagRegex);
    return matches ? matches.map(tag => tag.substring(1)) : [];
  }

  private extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const matches = text.match(mentionRegex);
    return matches ? matches.map(mention => mention.substring(1)) : [];
  }

  private extractUrls(text: string): string[] {
    const urlRegex = /https?:\/\/[^\s]+/g;
    const matches = text.match(urlRegex);
    return matches || [];
  }

  private extractEventFromPost(post: BlueskyPost): BlueskyEvent | null {
    const text = post.text.toLowerCase();
    
    // Look for event indicators
    const eventKeywords = [
      'conference', 'summit', 'meetup', 'workshop', 'hackathon',
      'event', 'webinar', 'seminar', 'panel', 'keynote',
      'announcement', 'launch', 'release', 'beta', 'alpha'
    ];

    const hasEventKeyword = eventKeywords.some(keyword => text.includes(keyword));
    if (!hasEventKeyword) return null;

    // Extract date patterns
    const datePatterns = [
      /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+\d{1,2}/i,
      /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/,
      /\b\d{4}-\d{2}-\d{2}\b/,
      /\btoday\b|\btomorrow\b|\bnext week\b|\bthis week\b/
    ];

    let eventDate = '';
    for (const pattern of datePatterns) {
      const match = post.text.match(pattern);
      if (match) {
        eventDate = match[0];
        break;
      }
    }

    // Extract title (first sentence or first 100 chars)
    const title = post.text.split(/[.!?]/)[0].substring(0, 100).trim();

    // Extract URLs
    const urls = this.extractUrls(post.text);
    const eventUrl = urls.length > 0 ? urls[0] : '';

    return {
      id: post.uri,
      title: title || 'Tech Event',
      description: post.text,
      date: eventDate,
      location: 'Online/In-person', // Could be enhanced with location detection
      url: eventUrl,
      hashtags: post.hashtags,
      source: `Bluesky - @${post.author}`
    };
  }

  async saveBlueskyPost(post: BlueskyPost): Promise<number> {
    try {
      // Check if post already exists
      const existing = await client.execute({
        sql: 'SELECT id FROM articles WHERE url = ?',
        args: [post.uri]
      });

      if (existing.rows.length > 0) {
        console.log(`Bluesky post already exists: ${post.text.substring(0, 50)}...`);
        return existing.rows[0].id as number;
      }

      // Insert post as article
      const result = await client.execute({
        sql: `INSERT INTO articles (title, content, url, source, published_at, category, tags, summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          post.text.substring(0, 200), // Title from first 200 chars
          post.text,
          post.uri,
          `Bluesky - @${post.author}`,
          new Date(post.createdAt),
          'Social Media',
          JSON.stringify([...post.hashtags, ...post.mentions]),
          post.text.substring(0, 500) // Summary
        ]
      });

      const articleId = Number(result.lastInsertRowid);

      // Generate and save embedding
      if (articleId) {
        const embedding = await generateEmbedding(post.text);
        if (embedding) {
          // Convert Float32Array to JSON string for storage
          const embeddingJson = JSON.stringify(Array.from(embedding));
          
          await client.execute({
            sql: `INSERT INTO embeddings (id, article_id, embedding, model)
            VALUES (?, ?, ?, ?)`,
            args: [
              `emb_${articleId}`,
              articleId,
              embeddingJson,
              'nomic-embed-text'
            ]
          });

          // Update article with embedding_id
          await client.execute({
            sql: 'UPDATE articles SET embedding_id = ? WHERE id = ?',
            args: [`emb_${articleId}`, articleId]
          });
        }
      }

      console.log(`Saved Bluesky post: ${post.text.substring(0, 50)}...`);
      return articleId;

    } catch (error) {
      console.error('Error saving Bluesky post:', error);
      throw error;
    }
  }

  async saveBlueskyEvent(event: BlueskyEvent): Promise<number> {
    try {
      // Check if event already exists
      const existing = await client.execute({
        sql: 'SELECT id FROM articles WHERE url = ?',
        args: [event.url || event.id]
      });

      if (existing.rows.length > 0) {
        console.log(`Bluesky event already exists: ${event.title}`);
        return existing.rows[0].id as number;
      }

      // Insert event as article
      const result = await client.execute({
        sql: `INSERT INTO articles (title, content, url, source, published_at, category, tags, summary)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          event.title,
          event.description,
          event.url || event.id,
          event.source,
          new Date(),
          'Event',
          JSON.stringify(event.hashtags),
          event.description.substring(0, 500)
        ]
      });

      const articleId = Number(result.lastInsertRowid);

      // Generate and save embedding
      if (articleId) {
        const embedding = await generateEmbedding(event.description);
        if (embedding) {
          // Convert Float32Array to JSON string for storage
          const embeddingJson = JSON.stringify(Array.from(embedding));
          
          await client.execute({
            sql: `INSERT INTO embeddings (id, article_id, embedding, model)
            VALUES (?, ?, ?, ?)`,
            args: [
              `emb_${articleId}`,
              articleId,
              embeddingJson,
              'nomic-embed-text'
            ]
          });

          // Update article with embedding_id
          await client.execute({
            sql: 'UPDATE articles SET embedding_id = ? WHERE id = ?',
            args: [`emb_${articleId}`, articleId]
          });
        }
      }

      console.log(`Saved Bluesky event: ${event.title}`);
      return articleId;

    } catch (error) {
      console.error('Error saving Bluesky event:', error);
      throw error;
    }
  }
} 