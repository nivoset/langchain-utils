import { PromptOptimizerService } from './src/services/prompt-optimizer.service.js';

async function testDriftGeneration() {
  console.log('🧪 Testing Drift Generation System\n');

  const optimizer = new PromptOptimizerService();

  // Test prompts of different types
  const testPrompts = [
    {
      name: 'Analysis Request',
      prompt: 'Please provide a comprehensive analysis of the current market trends in the technology sector, including detailed insights about artificial intelligence developments, machine learning advancements, and their potential impact on various industries and business models.'
    },
    {
      name: 'Question Format',
      prompt: 'What are the key factors driving innovation in renewable energy technologies and how might they reshape the global energy landscape over the next decade?'
    },
    {
      name: 'Instruction Format',
      prompt: 'Explain the fundamental principles of blockchain technology, describe its applications beyond cryptocurrency, and discuss the challenges and opportunities it presents for modern businesses.'
    },
    {
      name: 'Research Request',
      prompt: 'Conduct thorough research on the emerging trends in quantum computing, focusing on recent breakthroughs, potential applications, and the timeline for commercial adoption.'
    }
  ];

  for (const testCase of testPrompts) {
    console.log(`\n📝 Testing: ${testCase.name}`);
    console.log('='.repeat(60));
    
    try {
      console.log('\n🔍 Original Prompt:');
      console.log(`"${testCase.prompt}"\n`);
      
      // Generate drift prompts
      console.log('🔄 Generating Drift Variations...');
      const driftPrompts = await optimizer.generateDriftPrompts(
        testCase.prompt,
        4, // Generate 4 variations
        0.75, // Min similarity
        0.95  // Max similarity
      );
      
      console.log(`\n✅ Generated ${driftPrompts.length} drift prompts!\n`);
      
      // Display results
      driftPrompts.forEach((drift, index) => {
        console.log(`   Variation ${index + 1} (${drift.variationType}):`);
        console.log(`   Similarity: ${(drift.similarity * 100).toFixed(1)}%`);
        console.log(`   Description: ${drift.description}`);
        console.log(`   Text: "${drift.variation}"`);
        console.log();
      });
      
      // Summary statistics
      const avgSimilarity = driftPrompts.reduce((sum, dp) => sum + dp.similarity, 0) / driftPrompts.length;
      const similarityRange = {
        min: Math.min(...driftPrompts.map(dp => dp.similarity)),
        max: Math.max(...driftPrompts.map(dp => dp.similarity))
      };
      
      console.log('📊 Summary:');
      console.log(`   Average similarity: ${(avgSimilarity * 100).toFixed(1)}%`);
      console.log(`   Similarity range: ${(similarityRange.min * 100).toFixed(1)}% - ${(similarityRange.max * 100).toFixed(1)}%`);
      console.log(`   Variation types: ${[...new Set(driftPrompts.map(dp => dp.variationType))].join(', ')}`);
      
    } catch (error) {
      console.log(`❌ Error generating drift prompts: ${error}`);
    }
  }

  // Test different similarity ranges
  console.log('\n\n🎯 Testing Different Similarity Ranges');
  console.log('='.repeat(60));
  
  const testPrompt = 'Analyze the impact of social media on modern communication patterns and relationships.';
  
  const similarityRanges = [
    { name: 'High Similarity (0.85-0.95)', min: 0.85, max: 0.95 },
    { name: 'Medium Similarity (0.75-0.85)', min: 0.75, max: 0.85 },
    { name: 'Low Similarity (0.65-0.75)', min: 0.65, max: 0.75 }
  ];
  
  for (const range of similarityRanges) {
    console.log(`\n🔧 Testing: ${range.name}`);
    
    try {
      const driftPrompts = await optimizer.generateDriftPrompts(
        testPrompt,
        3,
        range.min,
        range.max
      );
      
      console.log(`   Generated ${driftPrompts.length} variations`);
      console.log(`   Average similarity: ${(driftPrompts.reduce((sum, dp) => sum + dp.similarity, 0) / driftPrompts.length * 100).toFixed(1)}%`);
      
      driftPrompts.forEach((drift, index) => {
        console.log(`   ${index + 1}. "${drift.variation}" (${(drift.similarity * 100).toFixed(1)}%)`);
      });
      
    } catch (error) {
      console.log(`   ❌ Error: ${error}`);
    }
  }

  // Test batch drift generation
  console.log('\n\n📦 Testing Batch Drift Generation');
  console.log('='.repeat(60));
  
  const batchPrompts = [
    'What are the benefits of remote work?',
    'How does climate change affect agriculture?',
    'Explain the basics of machine learning.',
    'What are the challenges of cybersecurity?'
  ];
  
  console.log('\nBatch drift generation results:');
  for (let i = 0; i < batchPrompts.length; i++) {
    try {
      const driftPrompts = await optimizer.generateDriftPrompts(batchPrompts[i], 2, 0.8, 0.9);
      console.log(`\n   Prompt ${i + 1}: "${batchPrompts[i]}"`);
      console.log(`   Generated ${driftPrompts.length} variations`);
      console.log(`   Average similarity: ${(driftPrompts.reduce((sum, dp) => sum + dp.similarity, 0) / driftPrompts.length * 100).toFixed(1)}%`);
      
      driftPrompts.forEach((drift, index) => {
        console.log(`   Variation ${index + 1}: "${drift.variation}" (${(drift.similarity * 100).toFixed(1)}%)`);
      });
    } catch (error) {
      console.log(`   Prompt ${i + 1}: Failed - ${error}`);
    }
  }

  console.log('\n✅ Drift generation testing complete!');
}

// Run the test
testDriftGeneration().catch(console.error); 