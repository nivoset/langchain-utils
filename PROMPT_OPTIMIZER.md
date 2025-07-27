# Prompt Optimizer

A sophisticated system for optimizing prompts by reducing token count while maintaining semantic similarity through embedding alignment.

## Features

- **Token Reduction**: Intelligently reduces prompt length while preserving meaning
- **Semantic Similarity**: Uses embeddings to measure and maintain semantic alignment
- **Multiple Strategies**: Applies various optimization techniques (filler word removal, sentence simplification, etc.)
- **Configurable Parameters**: Adjustable reduction targets and similarity thresholds
- **Batch Processing**: Optimize multiple prompts at once
- **Detailed Analysis**: Comprehensive prompt analysis and optimization insights
- **Drift Generation**: Creates semantically similar but lexically different prompt variations for testing robustness
- **Minified Drift Generation**: Creates shorter, more concise prompt variations while maintaining semantic similarity

## How It Works

The system uses a multi-step optimization approach:

1. **Embedding Generation**: Creates embeddings for the original prompt using Ollama
2. **Iterative Optimization**: Applies various strategies to reduce token count
3. **Similarity Validation**: Checks semantic similarity at each step using cosine similarity
4. **Quality Control**: Reverts changes if similarity drops below threshold

### Optimization Strategies

1. **Filler Word Removal**: Removes words like "very", "really", "basically", etc.
2. **Sentence Simplification**: Simplifies complex sentence structures
3. **Redundant Phrase Removal**: Eliminates redundant expressions
4. **Term Abbreviation**: Uses shorter forms for common terms (AI, ML, API, etc.)
5. **Formatting Cleanup**: Removes unnecessary punctuation and formatting
6. **Sentence Merging**: Combines similar sentences where appropriate
7. **Qualifier Removal**: Removes qualifying words that don't add value
8. **Synonym Replacement**: Uses shorter synonyms for long words

## Installation

The prompt optimizer is part of the tech-news-analyzer project. Make sure you have:

1. Ollama running locally with the required models
2. Environment variables configured (see `.env.example`)

## Usage

### Command Line Interface

#### Optimize a Single Prompt

```bash
# Basic optimization (30% reduction target, 85% similarity threshold)
npm run prompt-optimizer:optimize "Your long prompt here"

# Custom parameters
npm run prompt-optimizer:optimize "Your prompt" --reduction 50 --similarity 0.8 --iterations 15

# Save results to file
npm run prompt-optimizer:optimize "Your prompt" --output results.json --verbose
```

#### Analyze a Prompt

```bash
# Analyze prompt complexity and optimization potential
npm run prompt-optimizer:analyze "Your prompt here"

# Save analysis to file
npm run prompt-optimizer:analyze "Your prompt" --output analysis.json
```

#### Batch Optimization

```bash
# Optimize multiple prompts from a file
npm run prompt-optimizer:batch prompts.txt --reduction 30 --similarity 0.85

# Use JSON format for input
npm run prompt-optimizer:batch prompts.json --format json --output results.json
```

#### Generate Drift Prompts

```bash
# Generate semantically similar prompt variations
npm run prompt-optimizer:drift "Your prompt here" --number 5 --min-similarity 0.7 --max-similarity 0.95

# Save drift prompts to file with verbose output
npm run prompt-optimizer:drift "Your prompt" --number 10 --output drift-prompts.json --verbose
```

#### Generate Minified Drift Prompts

```bash
# Generate shorter, more concise prompt variations
npm run prompt-optimizer:minify-drift "Your prompt here" --number 5 --reduction 40 --similarity 0.8

# Save minified drift prompts to file with verbose output
npm run prompt-optimizer:minify-drift "Your prompt" --number 10 --reduction 50 --output minified-drift.json --verbose
```

#### Compare Strategies

```bash
# Compare different optimization strategies
npm run prompt-optimizer:compare "Your prompt here" --output comparison.json
```

### Programmatic Usage

```typescript
import { PromptOptimizerService } from './src/services/prompt-optimizer.service.js';

const optimizer = new PromptOptimizerService();

// Optimize a prompt
const result = await optimizer.optimizePrompt(
  "Your long prompt here",
  0.3,  // 30% reduction target
  0.85, // 85% similarity threshold
  10    // max iterations
);

console.log(`Original tokens: ${result.originalTokens}`);
console.log(`Optimized tokens: ${result.optimizedTokens}`);
console.log(`Reduction: ${result.tokenReductionPercentage.toFixed(1)}%`);
console.log(`Similarity: ${(result.similarityScore * 100).toFixed(1)}%`);
console.log(`Optimized: "${result.optimizedPrompt}"`);

// Analyze a prompt
const analysis = await optimizer.analyzePrompt("Your prompt");
console.log(`Word count: ${analysis.wordCount}`);
console.log(`Estimated tokens: ${analysis.estimatedTokens}`);
console.log(`Readability score: ${analysis.readabilityScore}/100`);

// Generate drift prompts
const driftPrompts = await optimizer.generateDriftPrompts(
  "Your prompt here",
  5,    // number of variations
  0.7,  // min similarity
  0.95  // max similarity
);

driftPrompts.forEach((drift, index) => {
  console.log(`Variation ${index + 1}: "${drift.variation}" (${(drift.similarity * 100).toFixed(1)}%)`);
});

// Generate minified drift prompts
const minifiedDrifts = await optimizer.generateMinifiedDriftPrompts(
  "Your prompt here",
  5,    // number of variations
  0.8,  // min similarity
  0.3   // target 30% reduction
);

minifiedDrifts.forEach((drift, index) => {
  const tokenReduction = ((originalPrompt.length - drift.variation.length) / originalPrompt.length) * 100;
  console.log(`Minified ${index + 1}: "${drift.variation}" (${tokenReduction.toFixed(1)}% reduction, ${(drift.similarity * 100).toFixed(1)}% similarity)`);
});
```

## Configuration

### Environment Variables

```bash
# Ollama configuration
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=mistral
OLLAMA_EMBEDDING_MODEL=nomic-embed-text
```

### Parameters

- **targetTokenReduction** (0.1-0.9): Target percentage of tokens to reduce
- **minSimilarity** (0.0-1.0): Minimum similarity threshold to maintain
- **maxIterations** (1-20): Maximum optimization iterations

## Examples

### Input Prompt
```
I would like you to conduct an extremely thorough and comprehensive examination of the multifaceted implications and ramifications of the recent developments in quantum computing technology, particularly focusing on how these groundbreaking innovations might potentially revolutionize and fundamentally transform the entire landscape of cybersecurity, cryptography, and data protection methodologies, while also considering the broader societal, economic, and ethical implications that could arise from such transformative technological advancements.
```

### Optimized Output (30% reduction, 85% similarity)
```
Examine the implications of recent quantum computing developments, focusing on how these innovations might revolutionize cybersecurity, cryptography, and data protection, while considering broader societal, economic, and ethical implications.
```

### Results
- **Original tokens**: ~150
- **Optimized tokens**: ~45
- **Token reduction**: 70%
- **Similarity score**: 87%

### Drift Generation Example

**Original Prompt:**
```
Please provide a comprehensive analysis of the current market trends in the technology sector, including detailed insights about artificial intelligence developments, machine learning advancements, and their potential impact on various industries and business models.
```

**Generated Variations:**
1. **Synonym Replacement** (93.6% similarity): "Please provide a comprehensive analysis of the current domain developments in the technology sector, including elaborate insights about AI developments, machine learning developments, and their possible result on various markets and commercial models."

2. **Perspective Shift** (92.7% similarity): "Please provide a comprehensive analysis of the market landscape in the tech industry, including detailed insights about AI technologies developments, machine learning advancements, and their potential impact on various industries and business models."

3. **Tone Variation** (91.2% similarity): "I would appreciate if you could furnish a thorough examination of the present market patterns in the technological domain, including detailed perspectives on artificial intelligence innovations, machine learning progress, and their prospective influence on diverse sectors and organizational frameworks."

### Minified Drift Generation Example

**Original Prompt:**
```
Please provide a comprehensive analysis of the current market trends in the technology sector, including detailed insights about artificial intelligence developments, machine learning advancements, and their potential impact on various industries and business models.
```

**Generated Minified Variations:**
1. **Concise Synonyms** (95.5% similarity, 16.4% reduction): "Please provide a full analysis of the market trends in the tech industry, including exact insights about artificial intelligence developments, ML improvements, and their likely influence on diverse areas and business models."

2. **Phrase Condensation** (94.8% similarity, 29.9% reduction): "Please provide a analysis of the market trends in the tech sector, including insights on AI developments, ML advancements, and their impact on different sectors and business approaches."

3. **Direct Style** (93.2% similarity, 35.7% reduction): "Show analysis of market trends in tech sector, including insights on AI developments, ML advancements, and their impact on industries and business models."

## Testing

Run the comprehensive test suite:

```bash
npm run test:prompt-optimization
```

This will test various prompt types and optimization strategies, providing detailed output for analysis.

Test drift generation capabilities:

```bash
npm run test:drift-generation
```

This will test drift generation with various prompt types and similarity ranges.

Test minified drift generation capabilities:

```bash
npm run test:minified-drift
```

This will test minified drift generation with various prompt types and reduction targets.

## File Formats

### Input Files for Batch Processing

**Line-by-line format:**
```
First prompt here
Second prompt here
Third prompt here
```

**JSON format:**
```json
[
  "First prompt here",
  "Second prompt here", 
  "Third prompt here"
]
```

### Output Files

Results are saved in JSON format with detailed information:

```json
{
  "originalPrompt": "...",
  "optimizedPrompt": "...",
  "originalTokens": 150,
  "optimizedTokens": 45,
  "tokenReduction": 105,
  "tokenReductionPercentage": 70.0,
  "similarityScore": 0.87,
  "optimizationSteps": [...],
  "processingTime": 1250,
  "options": {
    "targetReduction": 0.3,
    "minSimilarity": 0.85,
    "maxIterations": 10
  }
}
```

## Performance Considerations

- **Embedding Generation**: Each optimization step requires embedding generation, which can be slow
- **Batch Size**: For batch processing, consider processing in smaller chunks
- **Model Selection**: Use appropriate embedding models for your use case
- **Caching**: Consider implementing embedding caching for repeated prompts

## Troubleshooting

### Common Issues

1. **Ollama not running**: Ensure Ollama server is running on the configured URL
2. **Model not found**: Verify the embedding model is available in Ollama
3. **Low similarity scores**: Adjust similarity threshold or reduction target
4. **No optimization achieved**: Try different parameters or check prompt complexity

### Error Messages

- `Failed to generate embedding`: Check Ollama server and model availability
- `Similarity below threshold`: Reduce target reduction or increase similarity threshold
- `No improvement achieved`: Prompt may already be optimized or too simple

## Contributing

The prompt optimizer follows the Single Responsibility Principle:

- **PromptOptimizerService**: Core optimization logic
- **CLI Interface**: User interaction and command handling
- **Embedding Service**: Semantic similarity measurement
- **Test Suite**: Validation and demonstration

Each component has a single, well-defined responsibility and can be modified independently. 