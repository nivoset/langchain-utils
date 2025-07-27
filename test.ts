#!/usr/bin/env node

import { initDatabase, client } from './src/database/init.js';
import { VectorStoreService } from './src/services/vectorstore.service.js';
import { RSSLoader, RSSFeedConfig } from './src/loaders/rss.loader.js';

async function testVectorStore() {
  try {
    console.log('🚀 Starting LibSQL Vector Store Test...\n');

    // Initialize database
    console.log('📊 Initializing database...');
    await initDatabase();
    console.log('✅ Database initialized successfully\n');

    // Test database connection
    console.log('🔍 Testing database connection...');
    const result = await client.execute({
      sql: 'SELECT COUNT(*) as count FROM articles',
      args: []
    });
    const articleCount = result.rows[0]?.count as number || 0;
    console.log(`✅ Database connected. Found ${articleCount} articles\n`);

    // Initialize vector store service
    console.log('🧠 Initializing vector store service...');
    const vectorStoreService = new VectorStoreService();
    await vectorStoreService.initialize();
    console.log('✅ Vector store service initialized\n');

    // Test RSS loader with full content fetching
    console.log('📡 Testing RSS loader with full content...');
    const rssConfig: RSSFeedConfig = {
      name: 'Test Feed',
      url: 'https://techcrunch.com/feed/',
      category: 'Tech',
      maxItems: 2,
      fetchFullContent: true // Enable full content fetching
    };

    const rssLoader = new RSSLoader(rssConfig, false); // Don't save to DB for test
    const documents = await rssLoader.load();
    console.log(`✅ RSS loader test successful. Loaded ${documents.length} documents\n`);
    
    // Show content length for each document
    documents.forEach((doc, index) => {
      console.log(`📄 Document ${index + 1}:`);
      console.log(`   Title: ${doc.metadata.title}`);
      console.log(`   Content length: ${doc.pageContent.length} characters`);
      console.log(`   URL: ${doc.metadata.url}\n`);
    });

    // Test vector store operations
    console.log('🔍 Testing vector store operations...');
    
    // Get vector store stats
    const stats = await vectorStoreService.getStats();
    console.log('📊 Vector Store Stats:');
    console.log(`   Total documents: ${stats.totalDocuments}`);
    console.log(`   Recent documents (24h): ${stats.recentDocuments}\n`);

    // Test similarity search (if we have documents)
    if (documents.length > 0) {
      console.log('🔍 Testing similarity search...');
      const searchQuery = 'artificial intelligence';
      const searchResults = await vectorStoreService.searchSimilarArticles(searchQuery, 3);
      console.log(`✅ Similarity search successful. Found ${searchResults.length} results for "${searchQuery}"\n`);
    }

    // Test adding articles to vector store
    console.log('➕ Testing adding articles to vector store...');
    if (documents.length > 0) {
      await vectorStoreService.addArticlesToVectorStore(2); // Add 2 articles
      console.log('✅ Articles added to vector store successfully\n');
    }

    // Final stats
    console.log('📊 Final Database Stats:');
    const finalStats = await vectorStoreService.getStats();
    console.log(`   Total documents: ${finalStats.totalDocuments}`);
    console.log(`   Recent documents (24h): ${finalStats.recentDocuments}\n`);

    console.log('🎉 All tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Run the test
testVectorStore(); 