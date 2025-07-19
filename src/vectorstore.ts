#!/usr/bin/env tsx

import { VectorStoreService } from './services/vectorstore.service.js';
import { Command } from 'commander';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
  .name('vectorstore')
  .description('Manage LibSQL vector store for article embeddings')
  .version('1.0.0');

program
  .command('init')
  .description('Initialize the vector store')
  .action(async () => {
    try {
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
  .action(async (options) => {
    try {
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
  .command('sync')
  .description('Sync new articles with vector store')
  .action(async () => {
    try {
      const vectorStoreService = new VectorStoreService();
      await vectorStoreService.initialize();
      await vectorStoreService.syncArticles();
      console.log('✅ Articles synced with vector store successfully');
    } catch (error) {
      console.error('❌ Error syncing articles:', error);
      process.exit(1);
    }
  });

program
  .command('search')
  .description('Search for similar articles')
  .argument('<query>', 'Search query')
  .option('-k, --limit <number>', 'Number of results to return', '5')
  .option('-c, --company <name>', 'Filter by company')
  .option('-s, --sentiment <type>', 'Filter by sentiment (positive/negative/neutral)')
  .action(async (query, options) => {
    try {
      const vectorStoreService = new VectorStoreService();
      await vectorStoreService.initialize();

      let filter: Record<string, any> | undefined;
      if (options.company) {
        filter = { companies: options.company };
      } else if (options.sentiment) {
        filter = { companySentiment: options.sentiment };
      }

      const results = await vectorStoreService.searchSimilarArticles(
        query,
        parseInt(options.limit),
        filter
      );

      console.log(`\n🔍 Search results for: "${query}"`);
      console.log(`Found ${results.length} similar articles:\n`);

      results.forEach((result, index) => {
        const { document, score } = result;
        console.log(`${index + 1}. ${document.metadata.title}`);
        console.log(`   Score: ${score.toFixed(3)}`);
        console.log(`   Source: ${document.metadata.source}`);
        console.log(`   Published: ${document.metadata.publishedAt}`);
        console.log(`   URL: ${document.metadata.url}`);
        console.log(`   Companies: ${document.metadata.companies?.join(', ') || 'None'}`);
        console.log(`   Company Sentiment: ${document.metadata.companySentiment}`);
        console.log(`   Content: ${document.pageContent.substring(0, 150)}...`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error searching articles:', error);
      process.exit(1);
    }
  });

program
  .command('company')
  .description('Search for articles by company')
  .argument('<company>', 'Company name')
  .option('-k, --limit <number>', 'Number of results to return', '5')
  .action(async (company, options) => {
    try {
      const vectorStoreService = new VectorStoreService();
      await vectorStoreService.initialize();

      const results = await vectorStoreService.searchByCompany(
        company,
        parseInt(options.limit)
      );

      console.log(`\n🏢 Articles about: ${company}`);
      console.log(`Found ${results.length} articles:\n`);

      results.forEach((result, index) => {
        const { document, score } = result;
        console.log(`${index + 1}. ${document.metadata.title}`);
        console.log(`   Score: ${score.toFixed(3)}`);
        console.log(`   Source: ${document.metadata.source}`);
        console.log(`   Published: ${document.metadata.publishedAt}`);
        console.log(`   Company Sentiment: ${document.metadata.companySentiment}`);
        console.log(`   Employee Sentiment: ${document.metadata.employeeSentiment}`);
        console.log(`   URL: ${document.metadata.url}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error searching by company:', error);
      process.exit(1);
    }
  });

program
  .command('sentiment')
  .description('Search for articles by sentiment')
  .argument('<sentiment>', 'Sentiment type (positive/negative/neutral)')
  .option('-k, --limit <number>', 'Number of results to return', '5')
  .action(async (sentiment, options) => {
    try {
      const vectorStoreService = new VectorStoreService();
      await vectorStoreService.initialize();

      const results = await vectorStoreService.searchBySentiment(
        sentiment as 'positive' | 'negative' | 'neutral',
        parseInt(options.limit)
      );

      console.log(`\n😊 ${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} sentiment articles`);
      console.log(`Found ${results.length} articles:\n`);

      results.forEach((result, index) => {
        const { document, score } = result;
        console.log(`${index + 1}. ${document.metadata.title}`);
        console.log(`   Score: ${score.toFixed(3)}`);
        console.log(`   Source: ${document.metadata.source}`);
        console.log(`   Companies: ${document.metadata.companies?.join(', ') || 'None'}`);
        console.log(`   Company Sentiment: ${document.metadata.companySentiment}`);
        console.log(`   Employee Sentiment: ${document.metadata.employeeSentiment}`);
        console.log(`   URL: ${document.metadata.url}`);
        console.log('');
      });

    } catch (error) {
      console.error('❌ Error searching by sentiment:', error);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Get vector store statistics')
  .action(async () => {
    try {
      const vectorStoreService = new VectorStoreService();
      await vectorStoreService.initialize();

      const stats = await vectorStoreService.getStats();

      console.log('📊 Vector Store Statistics:');
      console.log(`   Total documents: ${stats.totalDocuments}`);
      console.log(`   Recent documents (24h): ${stats.recentDocuments}`);
      console.log(`   Average documents per day: ${(stats.totalDocuments / 30).toFixed(1)}`);

    } catch (error) {
      console.error('❌ Error getting stats:', error);
      process.exit(1);
    }
  });

program
  .command('cleanup')
  .description('Delete old vectors')
  .option('-d, --days <number>', 'Delete vectors older than N days', '30')
  .action(async (options) => {
    try {
      const vectorStoreService = new VectorStoreService();
      await vectorStoreService.initialize();
      await vectorStoreService.deleteOldVectors(parseInt(options.days));
      console.log(`✅ Cleaned up vectors older than ${options.days} days`);
    } catch (error) {
      console.error('❌ Error cleaning up vectors:', error);
      process.exit(1);
    }
  });

program
  .command('duplicates')
  .description('Find and remove duplicate articles')
  .option('-c, --check-only', 'Only check for duplicates, don\'t remove them')
  .action(async (options) => {
    try {
      const vectorStoreService = new VectorStoreService();
      await vectorStoreService.initialize();

      if (options.checkOnly) {
        const stats = await vectorStoreService.getDuplicateStats();
        console.log('\n📊 Duplicate Statistics:');
        console.log(`   Total articles: ${stats.totalArticles}`);
        console.log(`   Unique URLs: ${stats.uniqueUrls}`);
        console.log(`   Unique titles: ${stats.uniqueTitles}`);
        console.log(`   Potential duplicates: ${stats.potentialDuplicates}`);
      } else {
        const result = await vectorStoreService.removeDuplicates();
        console.log('\n📊 Duplicate Removal Results:');
        console.log(`   Articles checked: ${result.totalChecked}`);
        console.log(`   Duplicates found: ${result.duplicatesFound}`);
        console.log(`   Duplicates removed: ${result.duplicatesRemoved}`);
      }
    } catch (error) {
      console.error('❌ Error managing duplicates:', error);
      process.exit(1);
    }
  });

program
  .command('dedupe')
  .description('Remove duplicates and sync articles')
  .action(async () => {
    try {
      const vectorStoreService = new VectorStoreService();
      await vectorStoreService.initialize();

      console.log('🔄 Running full deduplication and sync...');

      // First, remove existing duplicates
      const duplicateResult = await vectorStoreService.removeDuplicates();
      console.log(`   Removed ${duplicateResult.duplicatesRemoved} duplicates`);

      // Then sync new articles
      await vectorStoreService.syncArticles();
      console.log('   Synced new articles');

      // Get final stats
      const stats = await vectorStoreService.getStats();
      console.log(`\n📊 Final vector store status:`);
      console.log(`   Total documents: ${stats.totalDocuments}`);
      console.log(`   Recent documents (24h): ${stats.recentDocuments}`);

      console.log('\n✅ Deduplication and sync completed!');
    } catch (error) {
      console.error('❌ Error during deduplication:', error);
      process.exit(1);
    }
  });

program.parse(); 