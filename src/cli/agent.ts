#!/usr/bin/env node

import { Command } from 'commander';
import { AgentService } from '../services/agent.service.js';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
  .name('agent')
  .description('AI Agent for intelligent Q&A based on news articles')
  .version('1.0.0');

// Ask a general question
program
  .command('ask')
  .description('Ask a question and get an intelligent response based on news articles')
  .argument('<question>', 'The question to ask')
  .option('-d, --documents <number>', 'Maximum number of documents to retrieve', '8')
  .option('-t, --threshold <number>', 'Similarity threshold (0.0-1.0)', '0.7')
  .action(async (question: string, options: any) => {
    try {
      console.log('🤖 Initializing AI Agent...\n');
      
      const agentService = new AgentService();
      await agentService.initialize();
      
      const response = await agentService.askQuestion(
        question,
        parseInt(options.documents),
        parseFloat(options.threshold)
      );
      
      console.log('\n🎯 Answer:');
      console.log(response.answer);
      
      if (response.sources.length > 0) {
        console.log('\n📚 Sources:');
        response.sources.forEach((source, index) => {
          console.log(`${index + 1}. ${source.title}`);
          console.log(`   Source: ${source.source}`);
          console.log(`   Published: ${source.publishedAt || 'Unknown'}`);
          console.log(`   Relevance: ${source.relevance}%`);
          console.log(`   URL: ${source.url}\n`);
        });
      }
      
      console.log(`\n📊 Metadata:`);
      console.log(`   Query: "${response.metadata.query}"`);
      console.log(`   Documents retrieved: ${response.metadata.documentsRetrieved}`);
      console.log(`   Processing time: ${response.metadata.processingTime}ms`);
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Ask about a specific company
program
  .command('company')
  .description('Ask a question about a specific company')
  .argument('<company>', 'Company name')
  .argument('<question>', 'The question to ask about the company')
  .option('-d, --documents <number>', 'Maximum number of documents to retrieve', '6')
  .action(async (company: string, question: string, options: any) => {
    try {
      console.log('🤖 Initializing AI Agent...\n');
      
      const agentService = new AgentService();
      await agentService.initialize();
      
      const response = await agentService.askAboutCompany(
        company,
        question,
        parseInt(options.documents)
      );
      
      console.log(`\n🏢 Answer about ${company}:`);
      console.log(response.answer);
      
      if (response.sources.length > 0) {
        console.log('\n📚 Sources:');
        response.sources.forEach((source, index) => {
          console.log(`${index + 1}. ${source.title}`);
          console.log(`   Source: ${source.source}`);
          console.log(`   Published: ${source.publishedAt || 'Unknown'}`);
          console.log(`   Relevance: ${source.relevance}%`);
          console.log(`   URL: ${source.url}\n`);
        });
      }
      
      console.log(`\n📊 Metadata:`);
      console.log(`   Query: "${response.metadata.query}"`);
      console.log(`   Documents retrieved: ${response.metadata.documentsRetrieved}`);
      console.log(`   Processing time: ${response.metadata.processingTime}ms`);
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Get sentiment summary
program
  .command('sentiment')
  .description('Get a summary of news by sentiment')
  .argument('[sentiment]', 'Sentiment type (positive, negative, neutral)', 'positive')
  .option('-d, --documents <number>', 'Maximum number of documents to retrieve', '6')
  .action(async (sentiment: string, options: any) => {
    try {
      if (!['positive', 'negative', 'neutral'].includes(sentiment)) {
        console.error('❌ Error: Sentiment must be positive, negative, or neutral');
        process.exit(1);
      }
      
      console.log('🤖 Initializing AI Agent...\n');
      
      const agentService = new AgentService();
      await agentService.initialize();
      
      const response = await agentService.getSentimentSummary(
        sentiment as 'positive' | 'negative' | 'neutral',
        parseInt(options.documents)
      );
      
      console.log(`\n📊 ${sentiment.charAt(0).toUpperCase() + sentiment.slice(1)} Sentiment Summary:`);
      console.log(response.answer);
      
      if (response.sources.length > 0) {
        console.log('\n📚 Sources:');
        response.sources.forEach((source, index) => {
          console.log(`${index + 1}. ${source.title}`);
          console.log(`   Source: ${source.source}`);
          console.log(`   Published: ${source.publishedAt || 'Unknown'}`);
          console.log(`   Relevance: ${source.relevance}%`);
          console.log(`   URL: ${source.url}\n`);
        });
      }
      
      console.log(`\n📊 Metadata:`);
      console.log(`   Query: "${response.metadata.query}"`);
      console.log(`   Documents retrieved: ${response.metadata.documentsRetrieved}`);
      console.log(`   Processing time: ${response.metadata.processingTime}ms`);
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Interactive mode
program
  .command('chat')
  .description('Start an interactive chat session with the AI agent')
  .option('-d, --documents <number>', 'Maximum number of documents to retrieve', '8')
  .option('-t, --threshold <number>', 'Similarity threshold (0.0-1.0)', '0.7')
  .action(async (options: any) => {
    try {
      console.log('🤖 Initializing AI Agent for interactive chat...\n');
      
      const agentService = new AgentService();
      await agentService.initialize();
      
      console.log('💬 Interactive Chat Mode');
      console.log('Type your questions and press Enter. Type "quit" or "exit" to end the session.\n');
      
      const readline = require('readline');
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
      });
      
      const askQuestion = () => {
        rl.question('🤔 You: ', async (input: string) => {
          if (input.toLowerCase() === 'quit' || input.toLowerCase() === 'exit') {
            console.log('\n👋 Goodbye!');
            rl.close();
            return;
          }
          
          if (input.trim() === '') {
            askQuestion();
            return;
          }
          
          try {
            console.log('\n🤖 AI Agent is thinking...\n');
            
            const response = await agentService.askQuestion(
              input,
              parseInt(options.documents),
              parseFloat(options.threshold)
            );
            
            console.log('🎯 Answer:');
            console.log(response.answer);
            
            if (response.sources.length > 0) {
              console.log('\n📚 Sources:');
              response.sources.slice(0, 3).forEach((source, index) => {
                console.log(`${index + 1}. ${source.title} (${source.relevance}% relevant)`);
              });
              if (response.sources.length > 3) {
                console.log(`   ... and ${response.sources.length - 3} more sources`);
              }
            }
            
            console.log(`\n⏱️  Response time: ${response.metadata.processingTime}ms\n`);
            
          } catch (error) {
            console.error('❌ Error:', error);
          }
          
          askQuestion();
        });
      };
      
      askQuestion();
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

// Stats command
program
  .command('stats')
  .description('Show vector store statistics')
  .action(async () => {
    try {
      console.log('📊 Getting vector store statistics...\n');
      
      const agentService = new AgentService();
      await agentService.initialize();
      
      const stats = await agentService.getStats();
      
      console.log('📈 Vector Store Statistics:');
      console.log(`   Total documents: ${stats.totalDocuments}`);
      console.log(`   Recent documents (24h): ${stats.recentDocuments}`);
      
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });

program.parse(); 