#!/usr/bin/env node

import { Command } from 'commander';
import { VectorStoreService } from '@libsql-tools/vectorstore';
import { initDatabase } from '@libsql-tools/core';

const program = new Command();

program
  .name('libsql-vectorstore')
  .description('LibSQL Vector Store CLI')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize the vector store')
  .action(async () => {
    try {
      await initDatabase();
      const vectorStoreService = new VectorStoreService();
      await vectorStoreService.initialize();
      console.log('✅ Vector store initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing vector store:', error);
      process.exit(1);
    }
  });

program
  .command('add')
  .description('Add articles to vector store')
  .option('-l, --limit <number>', 'Limit number of articles to add', '100')
  .action(async (options: any) => {
    try {
      await initDatabase();
      const vectorStoreService = new VectorStoreService();
      await vectorStoreService.initialize();
      await vectorStoreService.addArticlesToVectorStore(parseInt(options.limit));
      console.log('✅ Articles added to vector store successfully');
    } catch (error) {
      console.error('❌ Error adding articles to vector store:', error);
      process.exit(1);
    }
  });

program
  .command('search')
  .description('Search for similar articles')
  .argument('<query>', 'Search query')
  .option('-k, --limit <number>', 'Number of results to return', '5')
  .action(async (query: string, options: any) => {
    try {
      await initDatabase();
      const vectorStoreService = new VectorStoreService();
      await vectorStoreService.initialize();

      const results = await vectorStoreService.searchSimilarArticles(
        query,
        parseInt(options.limit)
      );

      console.log(`\n🔍 Search results for: "${query}"`);
      console.log(`Found ${results.length} similar articles`);

    } catch (error) {
      console.error('❌ Error searching articles:', error);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Get vector store statistics')
  .action(async () => {
    try {
      await initDatabase();
      const vectorStoreService = new VectorStoreService();
      await vectorStoreService.initialize();

      const stats = await vectorStoreService.getStats();

      console.log('📊 Vector Store Statistics:');
      console.log(`   Total documents: ${stats.totalDocuments}`);
      console.log(`   Recent documents (24h): ${stats.recentDocuments}`);
      console.log(`   Average documents per day: ${stats.averageDocumentsPerDay}`);

    } catch (error) {
      console.error('❌ Error getting stats:', error);
      process.exit(1);
    }
  });

program.parse(); 