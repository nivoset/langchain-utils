#!/usr/bin/env tsx

import { client, initDatabase } from './src/database/init.js';

async function removeAIWireFeeds() {
  try {
    console.log('🔧 Initializing database...');
    await initDatabase();
    
    console.log('📡 Removing AIWire RSS feeds...');
    
    // Remove all AIWire feeds
    const result = await client.execute({
      sql: `DELETE FROM rss_feeds WHERE name LIKE '%AI Wire%'`,
      args: []
    });
    
    console.log(`✅ Removed ${result.rowsAffected} AIWire RSS feeds`);
    
    // List remaining feeds
    const remainingFeeds = await client.execute({
      sql: `SELECT name, url, category FROM rss_feeds WHERE is_active = 1 ORDER BY name`,
      args: []
    });
    
    console.log('\n📡 Remaining active RSS feeds:');
    remainingFeeds.rows.forEach((feed: any) => {
      console.log(`   ✅ ${feed.name} - ${feed.category}`);
      console.log(`      URL: ${feed.url}`);
    });
    
    console.log(`\n📊 Total remaining feeds: ${remainingFeeds.rows.length}`);
    
  } catch (error) {
    console.error('❌ Error removing AIWire feeds:', error);
    process.exit(1);
  }
}

// Run the script
removeAIWireFeeds(); 