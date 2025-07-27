#!/usr/bin/env tsx

import { client, initDatabase } from './src/database/init.js';
import Parser from 'rss-parser';

const parser = new Parser({
  timeout: 10000,
  headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; TechNewsRSS/1.0)'
  }
});

async function testRSSFeeds() {
  try {
    console.log('🔧 Initializing database...');
    await initDatabase();
    
    // Get all RSS feeds
    const feeds = await client.execute({
      sql: `SELECT id, name, url, category, is_active FROM rss_feeds ORDER BY name`,
      args: []
    });
    
    console.log(`📡 Testing ${feeds.rows.length} RSS feeds...\n`);
    
    const results = {
      working: [] as any[],
      failed: [] as any[]
    };
    
    for (const feed of feeds.rows) {
      const feedData = {
        id: feed.id as number,
        name: feed.name as string,
        url: feed.url as string,
        category: feed.category as string,
        isActive: feed.is_active === 1
      };
      
      console.log(`🔍 Testing: ${feedData.name}`);
      console.log(`   URL: ${feedData.url}`);
      
      try {
        const parsed = await parser.parseURL(feedData.url);
        const itemCount = parsed.items.length;
        
        console.log(`   ✅ SUCCESS - Found ${itemCount} items`);
        
        if (itemCount > 0) {
          console.log(`   📄 Sample: ${parsed.items[0].title}`);
        }
        
        results.working.push({
          ...feedData,
          itemCount,
          sampleTitle: itemCount > 0 ? parsed.items[0].title : null
        });
        
      } catch (error) {
        console.log(`   ❌ FAILED - ${error}`);
        results.failed.push({
          ...feedData,
          error: error instanceof Error ? error.message : String(error)
        });
      }
      
      console.log('');
      
      // Add a small delay to be respectful
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Summary
    console.log('📊 RSS Feed Test Summary:');
    console.log(`   ✅ Working: ${results.working.length}`);
    console.log(`   ❌ Failed: ${results.failed.length}`);
    console.log(`   📈 Success Rate: ${((results.working.length / feeds.rows.length) * 100).toFixed(1)}%`);
    
    if (results.failed.length > 0) {
      console.log('\n❌ Failed Feeds:');
      results.failed.forEach(feed => {
        console.log(`   - ${feed.name} (${feed.category})`);
        console.log(`     URL: ${feed.url}`);
        console.log(`     Error: ${feed.error}`);
        console.log('');
      });
    }
    
    if (results.working.length > 0) {
      console.log('\n✅ Working Feeds:');
      results.working.forEach(feed => {
        console.log(`   - ${feed.name} (${feed.category}) - ${feed.itemCount} items`);
      });
    }
    
    // Check for AIWire feeds specifically
    const aiwireFeeds = feeds.rows.filter((feed: any) => 
      feed.name.includes('AI Wire')
    );
    
    if (aiwireFeeds.length > 0) {
      console.log(`\n🤖 AIWire Feeds Found: ${aiwireFeeds.length}`);
      aiwireFeeds.forEach((feed: any) => {
        const isWorking = results.working.some(w => w.id === feed.id);
        const status = isWorking ? '✅ Working' : '❌ Failed';
        console.log(`   ${status} - ${feed.name}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error testing RSS feeds:', error);
    process.exit(1);
  }
}

// Run the test
testRSSFeeds(); 