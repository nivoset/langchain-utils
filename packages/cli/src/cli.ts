#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('libsql-tools')
  .description('LibSQL Tools - RSS Loader and Vector Store')
  .version('1.0.0');

program
  .command('rss')
  .description('RSS loader commands')
  .argument('[command]', 'RSS command to run')
  .action((command: string | undefined) => {
    if (!command) {
      console.log('Available RSS commands:');
      console.log('  load - Load a single RSS feed');
      console.log('  load-multiple - Load multiple RSS feeds');
      console.log('  load-feeds - Load specific feeds by name');
      console.log('  list - List all available feeds');
      console.log('  test - Test RSS feed connectivity');
      console.log('\nUse: libsql-tools rss <command> --help for more info');
    }
  });

program
  .command('vectorstore')
  .description('Vector store commands')
  .argument('[command]', 'Vector store command to run')
  .action((command: string | undefined) => {
    if (!command) {
      console.log('Available vector store commands:');
      console.log('  init - Initialize the vector store');
      console.log('  add - Add articles to vector store');
      console.log('  search - Search for similar articles');
      console.log('  stats - Get vector store statistics');
      console.log('\nUse: libsql-tools vectorstore <command> --help for more info');
    }
  });

program.parse(); 