#!/usr/bin/env tsx

import { initDatabase, client } from './database/init.js';
import { Command } from 'commander';
import dotenv from 'dotenv';

dotenv.config();

const program = new Command();

program
  .name('analysis-viewer')
  .description('View and analyze company data from articles')
  .version('1.0.0');

program
  .command('companies')
  .description('Show companies mentioned in articles')
  .option('-l, --limit <number>', 'Number of companies to show', '20')
  .option('-s, --sentiment <sentiment>', 'Filter by sentiment (positive/negative/neutral)', 'all')
  .action(async (options) => {
    try {
      await initDatabase();
      
      let query = `
        SELECT 
          companies,
          company_sentiment,
          employee_sentiment,
          COUNT(*) as article_count,
          AVG(CASE WHEN company_sentiment = 'positive' THEN 1 WHEN company_sentiment = 'negative' THEN -1 ELSE 0 END) as avg_sentiment
        FROM articles 
        WHERE companies IS NOT NULL AND companies != '[]'
      `;
      
      const args: any[] = [];
      
      if (options.sentiment !== 'all') {
        query += ' AND company_sentiment = ?';
        args.push(options.sentiment);
      }
      
      query += `
        GROUP BY companies, company_sentiment, employee_sentiment
        ORDER BY article_count DESC
        LIMIT ?
      `;
      args.push(parseInt(options.limit));
      
      const result = await client.execute({ sql: query, args });
      
      console.log(`📊 Companies Analysis (${options.sentiment} sentiment):`);
      console.log('');
      
      result.rows.forEach((row: any, index: number) => {
        const companies = JSON.parse(row.companies || '[]');
        const sentiment = row.company_sentiment;
        const employeeSentiment = row.employee_sentiment;
        const articleCount = row.article_count;
        const avgSentiment = row.avg_sentiment;
        
        const sentimentEmoji = sentiment === 'positive' ? '📈' : sentiment === 'negative' ? '📉' : '➡️';
        const employeeEmoji = employeeSentiment === 'positive' ? '😊' : employeeSentiment === 'negative' ? '😟' : '😐';
        
        console.log(`${index + 1}. ${sentimentEmoji} ${companies.join(', ')}`);
        console.log(`   Articles: ${articleCount} | Company: ${sentiment} | Employees: ${employeeSentiment} ${employeeEmoji}`);
        console.log('');
      });
      
    } catch (error) {
      console.error('Error getting companies analysis:', error);
      process.exit(1);
    }
  });

program
  .command('sentiment')
  .description('Show sentiment analysis overview')
  .option('-d, --days <number>', 'Number of days to analyze', '7')
  .action(async (options) => {
    try {
      await initDatabase();
      
      const days = parseInt(options.days);
      const query = `
        SELECT 
          company_sentiment,
          employee_sentiment,
          risk_level,
          COUNT(*) as count
        FROM articles 
        WHERE created_at >= datetime('now', '-${days} days')
        AND company_sentiment IS NOT NULL
        GROUP BY company_sentiment, employee_sentiment, risk_level
        ORDER BY count DESC
      `;
      
      const result = await client.execute(query);
      
      console.log(`📊 Sentiment Analysis (Last ${days} days):`);
      console.log('');
      
      let totalArticles = 0;
      const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
      const employeeCounts = { positive: 0, negative: 0, neutral: 0 };
      const riskCounts = { low: 0, medium: 0, high: 0 };
      
      result.rows.forEach((row: any) => {
        const count = row.count as number;
        totalArticles += count;
        
        sentimentCounts[row.company_sentiment as keyof typeof sentimentCounts] += count;
        employeeCounts[row.employee_sentiment as keyof typeof employeeCounts] += count;
        riskCounts[row.risk_level as keyof typeof riskCounts] += count;
        
        const companyEmoji = row.company_sentiment === 'positive' ? '📈' : row.company_sentiment === 'negative' ? '📉' : '➡️';
        const employeeEmoji = row.employee_sentiment === 'positive' ? '😊' : row.employee_sentiment === 'negative' ? '😟' : '😐';
        const riskEmoji = row.risk_level === 'high' ? '🔴' : row.risk_level === 'medium' ? '🟡' : '🟢';
        
        console.log(`${companyEmoji} Company: ${row.company_sentiment} | ${employeeEmoji} Employee: ${row.employee_sentiment} | ${riskEmoji} Risk: ${row.risk_level} | Count: ${count}`);
      });
      
      console.log('');
      console.log('📈 Summary:');
      console.log(`Total Articles: ${totalArticles}`);
      console.log(`Company Sentiment: Positive ${sentimentCounts.positive} | Negative ${sentimentCounts.negative} | Neutral ${sentimentCounts.neutral}`);
      console.log(`Employee Sentiment: Positive ${employeeCounts.positive} | Negative ${employeeCounts.negative} | Neutral ${employeeCounts.neutral}`);
      console.log(`Risk Levels: Low ${riskCounts.low} | Medium ${riskCounts.medium} | High ${riskCounts.high}`);
      
    } catch (error) {
      console.error('Error getting sentiment analysis:', error);
      process.exit(1);
    }
  });

program
  .command('risks')
  .description('Show high-risk articles and companies')
  .option('-l, --limit <number>', 'Number of articles to show', '10')
  .action(async (options) => {
    try {
      await initDatabase();
      
      const query = `
        SELECT 
          title,
          companies,
          company_sentiment,
          employee_sentiment,
          risk_level,
          threats,
          analysis_summary,
          created_at
        FROM articles 
        WHERE risk_level = 'high'
        ORDER BY created_at DESC
        LIMIT ?
      `;
      
      const result = await client.execute({ sql: query, args: [parseInt(options.limit)] });
      
      console.log(`⚠️ High-Risk Articles:`);
      console.log('');
      
      result.rows.forEach((row: any, index: number) => {
        const companies = JSON.parse(row.companies || '[]');
        const threats = JSON.parse(row.threats || '[]');
        const date = new Date(row.created_at).toLocaleDateString();
        
        const companyEmoji = row.company_sentiment === 'positive' ? '📈' : row.company_sentiment === 'negative' ? '📉' : '➡️';
        const employeeEmoji = row.employee_sentiment === 'positive' ? '😊' : row.employee_sentiment === 'negative' ? '😟' : '😐';
        
        console.log(`${index + 1}. ${row.title}`);
        console.log(`   Companies: ${companies.join(', ')}`);
        console.log(`   ${companyEmoji} Company: ${row.company_sentiment} | ${employeeEmoji} Employee: ${row.employee_sentiment}`);
        console.log(`   Threats: ${threats.join(', ')}`);
        console.log(`   Date: ${date}`);
        console.log(`   Summary: ${row.analysis_summary?.substring(0, 200)}...`);
        console.log('');
      });
      
    } catch (error) {
      console.error('Error getting risk analysis:', error);
      process.exit(1);
    }
  });

program
  .command('opportunities')
  .description('Show articles with positive opportunities')
  .option('-l, --limit <number>', 'Number of articles to show', '10')
  .action(async (options) => {
    try {
      await initDatabase();
      
      const query = `
        SELECT 
          title,
          companies,
          opportunities,
          company_sentiment,
          analysis_summary,
          created_at
        FROM articles 
        WHERE company_sentiment = 'positive' AND opportunities IS NOT NULL AND opportunities != '[]'
        ORDER BY created_at DESC
        LIMIT ?
      `;
      
      const result = await client.execute({ sql: query, args: [parseInt(options.limit)] });
      
      console.log(`🚀 Positive Opportunities:`);
      console.log('');
      
      result.rows.forEach((row: any, index: number) => {
        const companies = JSON.parse(row.companies || '[]');
        const opportunities = JSON.parse(row.opportunities || '[]');
        const date = new Date(row.created_at).toLocaleDateString();
        
        console.log(`${index + 1}. ${row.title}`);
        console.log(`   Companies: ${companies.join(', ')}`);
        console.log(`   Opportunities: ${opportunities.join(', ')}`);
        console.log(`   Date: ${date}`);
        console.log(`   Summary: ${row.analysis_summary?.substring(0, 200)}...`);
        console.log('');
      });
      
    } catch (error) {
      console.error('Error getting opportunities:', error);
      process.exit(1);
    }
  });

program
  .command('stats')
  .description('Show comprehensive analysis statistics')
  .action(async () => {
    try {
      await initDatabase();
      
      const stats = await Promise.all([
        client.execute('SELECT COUNT(*) as count FROM articles'),
        client.execute('SELECT COUNT(*) as count FROM articles WHERE company_sentiment = "positive"'),
        client.execute('SELECT COUNT(*) as count FROM articles WHERE company_sentiment = "negative"'),
        client.execute('SELECT COUNT(*) as count FROM articles WHERE employee_sentiment = "positive"'),
        client.execute('SELECT COUNT(*) as count FROM articles WHERE employee_sentiment = "negative"'),
        client.execute('SELECT COUNT(*) as count FROM articles WHERE risk_level = "high"'),
        client.execute('SELECT COUNT(DISTINCT companies) as count FROM articles WHERE companies IS NOT NULL AND companies != "[]"')
      ]);
      
      const total = stats[0].rows[0].count as number;
      const positiveCompany = stats[1].rows[0].count as number;
      const negativeCompany = stats[2].rows[0].count as number;
      const positiveEmployee = stats[3].rows[0].count as number;
      const negativeEmployee = stats[4].rows[0].count as number;
      const highRisk = stats[5].rows[0].count as number;
      const uniqueCompanies = stats[6].rows[0].count as number;
      
      console.log('📊 Analysis Statistics:');
      console.log('');
      console.log(`Total Articles: ${total}`);
      console.log(`Unique Companies: ${uniqueCompanies}`);
      console.log('');
      console.log('Company Sentiment:');
      console.log(`  Positive: ${positiveCompany} (${((positiveCompany/total)*100).toFixed(1)}%)`);
      console.log(`  Negative: ${negativeCompany} (${((negativeCompany/total)*100).toFixed(1)}%)`);
      console.log(`  Neutral: ${total - positiveCompany - negativeCompany} (${(((total - positiveCompany - negativeCompany)/total)*100).toFixed(1)}%)`);
      console.log('');
      console.log('Employee Sentiment:');
      console.log(`  Positive: ${positiveEmployee} (${((positiveEmployee/total)*100).toFixed(1)}%)`);
      console.log(`  Negative: ${negativeEmployee} (${((negativeEmployee/total)*100).toFixed(1)}%)`);
      console.log(`  Neutral: ${total - positiveEmployee - negativeEmployee} (${(((total - positiveEmployee - negativeEmployee)/total)*100).toFixed(1)}%)`);
      console.log('');
      console.log(`High-Risk Articles: ${highRisk} (${((highRisk/total)*100).toFixed(1)}%)`);
      
    } catch (error) {
      console.error('Error getting statistics:', error);
      process.exit(1);
    }
  });

program.parse(); 