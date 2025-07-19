#!/usr/bin/env tsx

import { BlueskyService } from './services/bluesky.service.js';
import { initDatabase } from './database/init.js';
import { Command } from 'commander';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
  .name('bluesky-scraper')
  .description('Search and analyze tech news and events from Bluesky')
  .version('1.0.0');

program
  .command('search')
  .description('Search for tech news on Bluesky')
  .option('-q, --query <query>', 'Search query', 'tech news')
  .option('-l, --limit <number>', 'Number of posts to fetch', '50')
  .option('-s, --save', 'Save posts to database')
  .action(async (options) => {
    try {
      await initDatabase();
      const bluesky = new BlueskyService();
      
      // Try to authenticate if credentials are provided
      const identifier = process.env.BLUESKY_IDENTIFIER;
      const password = process.env.BLUESKY_PASSWORD;
      
      if (identifier && password) {
        await bluesky.authenticate(identifier, password);
      }
      
      console.log(`🔍 Searching Bluesky for: "${options.query}"`);
      const posts = await bluesky.searchTechNews(options.query, parseInt(options.limit));
      
      console.log(`\n📊 Found ${posts.length} posts:`);
      
      posts.forEach((post, index) => {
        console.log(`\n${index + 1}. @${post.author}`);
        console.log(`   Text: ${post.text.substring(0, 200)}...`);
        console.log(`   Created: ${new Date(post.createdAt).toLocaleDateString()}`);
        console.log(`   Stats: ❤️ ${post.likes} 🔄 ${post.reposts} 💬 ${post.replies}`);
        console.log(`   Hashtags: ${post.hashtags.join(', ')}`);
        console.log(`   URLs: ${post.urls.join(', ')}`);
        
        if (options.save) {
          bluesky.saveBlueskyPost(post).catch(console.error);
        }
      });
      
    } catch (error) {
      console.error('Error searching Bluesky:', error);
      process.exit(1);
    }
  });

program
  .command('events')
  .description('Search for tech events on Bluesky')
  .option('-q, --query <query>', 'Search query', 'tech event')
  .option('-l, --limit <number>', 'Number of posts to search', '30')
  .option('-s, --save', 'Save events to database')
  .action(async (options) => {
    try {
      await initDatabase();
      const bluesky = new BlueskyService();
      
      // Try to authenticate if credentials are provided
      const identifier = process.env.BLUESKY_IDENTIFIER;
      const password = process.env.BLUESKY_PASSWORD;
      
      if (identifier && password) {
        await bluesky.authenticate(identifier, password);
      }
      
      console.log(`🔍 Searching Bluesky for events: "${options.query}"`);
      const events = await bluesky.searchEvents(options.query, parseInt(options.limit));
      
      console.log(`\n📅 Found ${events.length} events:`);
      
      events.forEach((event, index) => {
        console.log(`\n${index + 1}. ${event.title}`);
        console.log(`   Description: ${event.description.substring(0, 200)}...`);
        console.log(`   Date: ${event.date || 'Not specified'}`);
        console.log(`   Location: ${event.location}`);
        console.log(`   URL: ${event.url || 'No URL'}`);
        console.log(`   Source: ${event.source}`);
        console.log(`   Hashtags: ${event.hashtags.join(', ')}`);
        
        if (options.save) {
          bluesky.saveBlueskyEvent(event).catch(console.error);
        }
      });
      
    } catch (error) {
      console.error('Error searching Bluesky events:', error);
      process.exit(1);
    }
  });

program
  .command('trending')
  .description('Get trending tech hashtags and influencers')
  .option('-h, --hashtags <number>', 'Number of hashtags to show', '20')
  .option('-i, --influencers <number>', 'Number of influencers to show', '20')
  .action(async (options) => {
    try {
      await initDatabase();
      const bluesky = new BlueskyService();
      
      // Try to authenticate if credentials are provided
      const identifier = process.env.BLUESKY_IDENTIFIER;
      const password = process.env.BLUESKY_PASSWORD;
      
      if (identifier && password) {
        await bluesky.authenticate(identifier, password);
      }
      
      console.log('🔍 Analyzing Bluesky tech trends...');
      
      const hashtags = await bluesky.getTrendingTechHashtags(parseInt(options.hashtags));
      const influencers = await bluesky.getTechInfluencers(parseInt(options.influencers));
      
      console.log(`\n📊 Top ${hashtags.length} Tech Hashtags:`);
      hashtags.forEach((tag, index) => {
        console.log(`   ${index + 1}. #${tag}`);
      });
      
      console.log(`\n👥 Top ${influencers.length} Tech Influencers:`);
      influencers.forEach((influencer, index) => {
        console.log(`   ${index + 1}. @${influencer}`);
      });
      
    } catch (error) {
      console.error('Error getting trending data:', error);
      process.exit(1);
    }
  });

program
  .command('monitor')
  .description('Monitor Bluesky for new tech news and events')
  .option('-i, --interval <minutes>', 'Check interval in minutes', '30')
  .option('-q, --query <query>', 'Search query', 'tech news')
  .action(async (options) => {
    try {
      await initDatabase();
      const bluesky = new BlueskyService();
      
      // Try to authenticate if credentials are provided
      const identifier = process.env.BLUESKY_IDENTIFIER;
      const password = process.env.BLUESKY_PASSWORD;
      
      if (identifier && password) {
        await bluesky.authenticate(identifier, password);
      }
      
      const intervalMinutes = parseInt(options.interval);
      console.log(`🔍 Starting Bluesky monitor for "${options.query}" every ${intervalMinutes} minutes...`);
      
      // Initial check
      await checkForNewContent(bluesky, options.query);
      
      // Set up interval
      setInterval(async () => {
        await checkForNewContent(bluesky, options.query);
      }, intervalMinutes * 60 * 1000);
      
      console.log('Monitor started. Press Ctrl+C to stop.');
      
      // Keep the process running
      process.on('SIGINT', () => {
        console.log('\nShutting down Bluesky monitor...');
        process.exit(0);
      });
      
    } catch (error) {
      console.error('Error starting monitor:', error);
      process.exit(1);
    }
  });

async function checkForNewContent(bluesky: BlueskyService, query: string) {
  try {
    console.log(`\n[${new Date().toISOString()}] Checking for new content...`);
    
    const posts = await bluesky.searchTechNews(query, 20);
    let newPosts = 0;
    
    for (const post of posts) {
      try {
        await bluesky.saveBlueskyPost(post);
        newPosts++;
      } catch (error) {
        // Post might already exist
      }
    }
    
    console.log(`Found ${newPosts} new posts`);
    
  } catch (error) {
    console.error('Error checking for new content:', error);
  }
}

program.parse(); 