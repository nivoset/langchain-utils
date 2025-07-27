# Baseline Prompt Optimizer

A specialized utility for optimizing large, frequently-used prompts to create efficient baseline versions for repeated use. This tool is designed to reduce token costs and improve performance for prompts that are used multiple times in production systems.

## 🎯 **Purpose**

The Baseline Prompt Optimizer is specifically designed for:

- **Production Systems**: Optimize prompts once, use the optimized version repeatedly
- **Cost Reduction**: Reduce token usage for frequently-used prompts
- **Performance**: Improve response times by using more efficient prompts
- **Consistency**: Maintain semantic similarity while reducing verbosity
- **Batch Processing**: Optimize multiple prompts at once for large-scale deployments

## 🚀 **Key Features**

- **Single Optimization**: Optimize once, use repeatedly
- **Multiple Strategies**: Regular optimization and minified drift generation
- **Batch Processing**: Optimize multiple prompts simultaneously
- **Comparison Tools**: Test different optimization parameters
- **Cost Analysis**: Calculate potential savings
- **JSON Output**: Structured results for integration

## 📦 **Installation**

The baseline optimizer is part of the tech-news-analyzer project. Make sure you have:

1. Ollama running locally with the required models
2. Environment variables configured (see `.env.example`)

## 🛠️ **Usage**

### **Single Prompt Optimization**

Optimize a single large prompt for baseline use:

```bash
# Basic optimization (25% reduction target, 90% similarity threshold)
npm run baseline-optimizer:optimize "Your very long and verbose prompt here"

# Custom parameters with output file
npm run baseline-optimizer:optimize "Your prompt" --reduction 30 --similarity 0.9 --output optimized.json

# Verbose output
npm run baseline-optimizer:optimize "Your prompt" --reduction 25 --similarity 0.85 --verbose
```

**Parameters:**
- `--reduction <percentage>`: Target token reduction (10-50%, default: 25)
- `--similarity <score>`: Minimum similarity threshold (0.8-0.95, default: 0.9)
- `--iterations <number>`: Maximum optimization iterations (default: 15)
- `--output <file>`: Save results to JSON file
- `--verbose`: Show detailed optimization process

### **Multiple Version Comparison**

Generate multiple optimized versions to compare different parameters:

```bash
# Compare different reduction targets and similarity thresholds
npm run baseline-optimizer:compare "Your prompt" --reductions "15,25,35" --similarities "0.85,0.9,0.95"

# Save comparison results
npm run baseline-optimizer:compare "Your prompt" --reductions "20,30,40" --output comparison.json
```

**Parameters:**
- `--reductions <percentages>`: Comma-separated reduction targets (e.g., "15,25,35")
- `--similarities <scores>`: Comma-separated similarity thresholds (e.g., "0.85,0.9,0.95")
- `--output <file>`: Save comparison results to JSON file

### **Batch Optimization**

Optimize multiple prompts at once:

```bash
# Optimize prompts from JSON file
npm run baseline-optimizer:batch sample-baseline-prompts.json --reduction 25 --similarity 0.9

# Custom output directory
npm run baseline-optimizer:batch prompts.json --output ./optimized-prompts --reduction 30

# Different input format
npm run baseline-optimizer:batch prompts.txt --format txt --reduction 20
```

**Parameters:**
- `--reduction <percentage>`: Target token reduction (10-50%, default: 25)
- `--similarity <score>`: Minimum similarity threshold (0.8-0.95, default: 0.9)
- `--output <directory>`: Output directory for optimized prompts (default: ./optimized-prompts)
- `--format <type>`: Input format (json or txt, default: json)

### **Minified Drift Generation**

Generate shorter, more concise versions of prompts:

```bash
# Generate minified versions
npm run baseline-optimizer:minify "Your prompt" --reduction 25 --similarity 0.85 --number 5

# Save minified versions
npm run baseline-optimizer:minify "Your prompt" --reduction 30 --output minified.json
```

**Parameters:**
- `--reduction <percentage>`: Target token reduction (20-60%, default: 40)
- `--similarity <score>`: Minimum similarity threshold (0.8-0.95, default: 0.85)
- `--number <count>`: Number of minified versions to generate (default: 5)
- `--output <file>`: Save minified versions to JSON file

## 📊 **Example Results**

### **Single Optimization Example**

**Original Prompt:**
```
I would like you to please provide me with a very comprehensive and extremely detailed analysis of the current market trends in the technology sector, including detailed insights about artificial intelligence developments, machine learning advancements, and their potential impact on various industries and business models, if you would be so kind as to do so.
```

**Optimized Result:**
```
I would you to please provide me with a comprehensive and detailed analysis of the current market trends in the technology sector, including detailed insights about artificial intelligence developments, machine learning advancements, and their potential impact on various industries and business models, if you would be kind as to do.
```

**Metrics:**
- **Token reduction**: 6.7%
- **Similarity**: 99.2%
- **Cost savings**: 6.7% per use
- **Processing time**: 310ms

### **Comparison Example**

Testing different parameters on the same prompt:

| Reduction | Similarity | Token Reduction | Similarity Score | Score |
|-----------|------------|-----------------|------------------|-------|
| 15% | 0.85 | 6.7% | 99.2% | 6.6 |
| 25% | 0.9 | 6.7% | 99.2% | 6.6 |
| 35% | 0.95 | 6.7% | 99.2% | 6.6 |

**Best Balance**: 15% reduction, 0.85 similarity (Score: 6.6)

## 📁 **File Formats**

### **Input JSON Format (for batch processing)**

```json
[
  {
    "name": "comprehensive_analysis_prompt",
    "prompt": "Your very long and verbose prompt here..."
  },
  {
    "name": "research_investigation_prompt", 
    "prompt": "Another long prompt for research..."
  }
]
```

### **Output JSON Format**

```json
{
  "originalPrompt": "Original long prompt...",
  "optimizedPrompt": "Optimized shorter prompt...",
  "metadata": {
    "originalTokens": 183,
    "optimizedTokens": 173,
    "tokenReduction": 5.5,
    "similarity": 0.994,
    "processingTime": 1718,
    "costSavings": 5.5,
    "timestamp": "2024-01-15T10:30:00.000Z"
  }
}
```

### **Batch Summary Format**

```json
{
  "batchMetadata": {
    "totalPrompts": 5,
    "successful": 5,
    "failed": 0,
    "totalOriginalTokens": 915,
    "totalOptimizedTokens": 865,
    "totalTokensSaved": 50,
    "averageTokenReduction": 5.5,
    "totalProcessingTime": 8590,
    "averageProcessingTime": 1718,
    "timestamp": "2024-01-15T10:30:00.000Z"
  },
  "results": [...]
}
```

## 💰 **Cost Analysis**

### **Token Reduction Benefits**

For a prompt that costs $0.01 per use:
- **Original**: 183 tokens = $0.01
- **Optimized**: 173 tokens = $0.0095
- **Savings**: $0.0005 per use (5% reduction)

### **Scaling Benefits**

For 1,000 uses per month:
- **Original cost**: $10.00
- **Optimized cost**: $9.50
- **Monthly savings**: $0.50
- **Annual savings**: $6.00

For 10,000 uses per month:
- **Original cost**: $100.00
- **Optimized cost**: $95.00
- **Monthly savings**: $5.00
- **Annual savings**: $60.00

## 🔧 **Integration Examples**

### **Python Integration**

```python
import json
import subprocess

def optimize_prompt(prompt, reduction=25, similarity=0.9):
    """Optimize a prompt using the baseline optimizer"""
    cmd = [
        'npm', 'run', 'baseline-optimizer:optimize',
        prompt,
        '--reduction', str(reduction),
        '--similarity', str(similarity),
        '--output', 'temp_optimized.json'
    ]
    
    subprocess.run(cmd, check=True)
    
    with open('temp_optimized.json', 'r') as f:
        result = json.load(f)
    
    return result['optimizedPrompt']

# Usage
optimized = optimize_prompt("Your long prompt here...")
```

### **Node.js Integration**

```javascript
const { execSync } = require('child_process');
const fs = require('fs');

function optimizePrompt(prompt, reduction = 25, similarity = 0.9) {
  const cmd = `npm run baseline-optimizer:optimize "${prompt}" --reduction ${reduction} --similarity ${similarity} --output temp_optimized.json`;
  
  execSync(cmd);
  
  const result = JSON.parse(fs.readFileSync('temp_optimized.json', 'utf8'));
  return result.optimizedPrompt;
}

// Usage
const optimized = optimizePrompt("Your long prompt here...");
```

## 🎯 **Best Practices**

### **When to Use Baseline Optimization**

✅ **Good candidates:**
- Prompts used 100+ times per month
- Prompts with significant verbosity
- Production system prompts
- Batch processing prompts

❌ **Not suitable for:**
- One-time use prompts
- Already concise prompts
- Context-dependent prompts
- Prompts requiring exact wording

### **Optimization Strategy**

1. **Start Conservative**: Use 15-25% reduction targets
2. **Test Thoroughly**: Compare optimized vs original results
3. **Monitor Quality**: Ensure similarity scores remain high
4. **Batch Process**: Optimize multiple prompts together
5. **Version Control**: Keep original prompts for reference

### **Parameter Guidelines**

| Use Case | Reduction | Similarity | Iterations |
|----------|-----------|------------|------------|
| Conservative | 15-20% | 0.95 | 10 |
| Balanced | 25-30% | 0.9 | 15 |
| Aggressive | 35-40% | 0.85 | 20 |

## 🚨 **Limitations**

1. **Quality Trade-offs**: Higher reduction may reduce quality
2. **Context Sensitivity**: Some prompts may not optimize well
3. **Processing Time**: Optimization takes time (1-3 seconds per prompt)
4. **Model Dependency**: Requires Ollama with embedding models

## 📈 **Performance Metrics**

Based on testing with large prompts:

- **Average token reduction**: 5-15%
- **Average similarity**: 95-99%
- **Processing time**: 1-3 seconds per prompt
- **Success rate**: 90-95% for suitable prompts

## 🔄 **Workflow Example**

```bash
# 1. Create a file with your prompts
echo '[
  {
    "name": "analysis_prompt",
    "prompt": "Your very long analysis prompt..."
  }
]' > my-prompts.json

# 2. Optimize all prompts
npm run baseline-optimizer:batch my-prompts.json --reduction 25 --similarity 0.9

# 3. Review results
cat optimized-prompts/batch-summary.json

# 4. Use optimized prompts in your application
cat optimized-prompts/analysis_prompt.json
```

This workflow creates optimized baseline versions that you can use repeatedly in your production systems, saving costs and improving performance over time. 