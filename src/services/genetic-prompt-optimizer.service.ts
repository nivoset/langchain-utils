import { generateEmbedding, cosineSimilarity } from './embedding.service.js';

export interface GeneticPromptResult {
  originalPrompt: string;
  optimizedPrompt: string;
  originalTokens: number;
  optimizedTokens: number;
  tokenReduction: number;
  similarityScore: number;
  generationCount: number;
  processingTime: number;
  evolutionHistory: Array<{
    generation: number;
    bestFitness: number;
    avgFitness: number;
    bestTokenCount: number;
    bestSimilarity: number;
  }>;
}

export interface GeneticConfig {
  populationSize: number;
  maxGenerations: number;
  mutationRate: number;
  crossoverRate: number;
  similarityWeight: number;
  tokenWeight: number;
  minSimilarity: number;
  maxTokenReduction: number;
  eliteSize: number;
}

export class GeneticPromptOptimizer {
  private originalEmbedding: Float32Array | null = null;
  private originalTokens: number = 0;
  private originalPrompt: string = '';
  private config: GeneticConfig;

  constructor(config?: Partial<GeneticConfig>) {
    this.config = {
      populationSize: 50,
      maxGenerations: 100,
      mutationRate: 0.1,
      crossoverRate: 0.8,
      similarityWeight: 0.7,
      tokenWeight: 0.3,
      minSimilarity: 0.85,
      maxTokenReduction: 0.5,
      eliteSize: 5,
      ...config
    };
  }

  /**
   * Optimize a prompt using genetic algorithm
   */
  async optimizePrompt(
    prompt: string,
    targetReduction: number = 0.3,
    minSimilarity: number = 0.85
  ): Promise<GeneticPromptResult> {
    const startTime = Date.now();
    
    // Initialize
    this.originalPrompt = prompt;
    this.originalTokens = Math.ceil(prompt.length / 4);
    this.config.minSimilarity = minSimilarity;
    this.config.maxTokenReduction = targetReduction;
    
    // Generate embedding for original prompt
    this.originalEmbedding = await generateEmbedding(prompt);
    if (!this.originalEmbedding) {
      throw new Error('Failed to generate embedding for original prompt');
    }

    console.log(`🧬 Starting genetic optimization...`);
    console.log(`   Original tokens: ${this.originalTokens}`);
    console.log(`   Target reduction: ${(targetReduction * 100).toFixed(1)}%`);
    console.log(`   Min similarity: ${(minSimilarity * 100).toFixed(1)}%`);

    // Initialize population
    let population = this.initializePopulation();
    const evolutionHistory: Array<{
      generation: number;
      bestFitness: number;
      avgFitness: number;
      bestTokenCount: number;
      bestSimilarity: number;
    }> = [];

    let bestIndividual = population[0];
    let generationsWithoutImprovement = 0;
    const maxGenerationsWithoutImprovement = 20;

    // Evolution loop
    for (let generation = 0; generation < this.config.maxGenerations; generation++) {
      // Evaluate fitness for all individuals
      const fitnessResults = await this.evaluatePopulation(population);
      
      // Sort by fitness (higher is better)
      const sortedPopulation = population
        .map((individual, index) => ({ individual, fitness: fitnessResults[index] }))
        .sort((a, b) => b.fitness - a.fitness);

      const currentBest = sortedPopulation[0];
      const avgFitness = fitnessResults.reduce((sum, f) => sum + f, 0) / fitnessResults.length;

      // Track evolution history
      const bestTokenCount = Math.ceil(currentBest.individual.length / 4);
      const bestSimilarity = await this.calculateSimilarity(currentBest.individual);
      
      evolutionHistory.push({
        generation,
        bestFitness: currentBest.fitness,
        avgFitness,
        bestTokenCount,
        bestSimilarity
      });

      // Check for improvement
      if (currentBest.fitness > +bestIndividual.fitness) {
        bestIndividual = currentBest.individual;
        generationsWithoutImprovement = 0;
      } else {
        generationsWithoutImprovement++;
      }

      // Log progress
      if (generation % 10 === 0 || generation === this.config.maxGenerations - 1) {
        const tokenReduction = ((this.originalTokens - bestTokenCount) / this.originalTokens) * 100;
        console.log(`   Generation ${generation}: Best fitness ${currentBest.fitness.toFixed(3)}, ` +
                   `Tokens ${bestTokenCount} (${tokenReduction.toFixed(1)}% reduction), ` +
                   `Similarity ${(bestSimilarity * 100).toFixed(1)}%`);
      }

      // Early stopping
      if (generationsWithoutImprovement >= maxGenerationsWithoutImprovement) {
        console.log(`   Early stopping at generation ${generation} (no improvement for ${maxGenerationsWithoutImprovement} generations)`);
        break;
      }

      // Create next generation
      population = this.createNextGeneration(sortedPopulation.map(p => p.individual));
    }

    const processingTime = Date.now() - startTime;
    const optimizedTokens = Math.ceil(bestIndividual.length / 4);
    const finalSimilarity = await this.calculateSimilarity(bestIndividual);
    const tokenReduction = ((this.originalTokens - optimizedTokens) / this.originalTokens) * 100;

    console.log(`✅ Genetic optimization complete!`);
    console.log(`   Final tokens: ${optimizedTokens} (${tokenReduction.toFixed(1)}% reduction)`);
    console.log(`   Final similarity: ${(finalSimilarity * 100).toFixed(1)}%`);
    console.log(`   Processing time: ${processingTime}ms`);

    return {
      originalPrompt: this.originalPrompt,
      optimizedPrompt: bestIndividual,
      originalTokens: this.originalTokens,
      optimizedTokens,
      tokenReduction,
      similarityScore: finalSimilarity,
      generationCount: evolutionHistory.length,
      processingTime,
      evolutionHistory
    };
  }

  /**
   * Initialize the initial population
   */
  private initializePopulation(): string[] {
    const population: string[] = [];
    
    // Add original prompt as first individual
    population.push(this.originalPrompt);
    
    // Generate variations using different strategies
    for (let i = 1; i < this.config.populationSize; i++) {
      const variation = this.generateVariation(this.originalPrompt, i);
      population.push(variation);
    }
    
    return population;
  }

  /**
   * Generate a variation of the original prompt
   */
  private generateVariation(prompt: string, seed: number): string {
    const strategies = [
      this.removeRandomWords.bind(this),
      this.replaceWithSynonyms.bind(this),
      this.simplifyStructure.bind(this),
      this.removeRedundantPhrases.bind(this),
      this.condenseSentences.bind(this),
      this.removeFillerWords.bind(this)
    ];
    
    const strategy = strategies[seed % strategies.length];
    return strategy(prompt, seed);
  }

  /**
   * Remove random words from the prompt
   */
  private removeRandomWords(prompt: string, seed: number): string {
    const words = prompt.split(' ');
    const wordsToRemove = Math.floor(words.length * 0.1) + (seed % 5); // Remove 10-15% of words
    
    const indices = new Set<number>();
    while (indices.size < wordsToRemove && indices.size < words.length) {
      indices.add(Math.floor(Math.random() * words.length));
    }
    
    return words
      .filter((_, index) => !indices.has(index))
      .join(' ');
  }

  /**
   * Replace words with synonyms
   */
  private replaceWithSynonyms(prompt: string, seed: number): string {
    const synonymMap: Record<string, string[]> = {
      'comprehensive': ['complete', 'full', 'thorough'],
      'detailed': ['specific', 'precise', 'exact'],
      'analysis': ['study', 'review', 'examination'],
      'developments': ['advances', 'progress', 'innovations'],
      'technologies': ['tech', 'systems', 'solutions'],
      'various': ['different', 'multiple', 'diverse'],
      'industries': ['sectors', 'fields', 'areas'],
      'business': ['commercial', 'corporate', 'enterprise'],
      'models': ['approaches', 'strategies', 'frameworks'],
      'please': [''],
      'very': [''],
      'extremely': [''],
      'thorough': ['complete', 'full'],
      'examination': ['review', 'study'],
      'implications': ['effects', 'impacts'],
      'ramifications': ['consequences', 'effects'],
      'groundbreaking': ['innovative', 'revolutionary'],
      'innovations': ['advances', 'developments'],
      'potentially': [''],
      'fundamentally': ['completely', 'entirely'],
      'transform': ['change', 'alter'],
      'landscape': ['environment', 'sector'],
      'production': ['generation', 'creation'],
      'distribution': ['delivery', 'supply']
    };

    let result = prompt;
    const entries = Object.entries(synonymMap);
    
    for (const [word, synonyms] of entries) {
      if (Math.random() < 0.3) { // 30% chance to apply each replacement
        const synonym = synonyms[Math.floor(Math.random() * synonyms.length)];
        if (synonym) {
          const regex = new RegExp(`\\b${word}\\b`, 'gi');
          result = result.replace(regex, synonym);
        } else {
          // Remove the word entirely
          const regex = new RegExp(`\\b${word}\\b\\s*`, 'gi');
          result = result.replace(regex, '');
        }
      }
    }
    
    return result.replace(/\s+/g, ' ').trim();
  }

  /**
   * Simplify sentence structure
   */
  private simplifyStructure(prompt: string, seed: number): string {
    let result = prompt;
    
    // Remove unnecessary phrases
    const phrasesToRemove = [
      /\b(if you would be so kind as to do so)\b/gi,
      /\b(I would appreciate if you could)\b/gi,
      /\b(please provide)\b/gi,
      /\b(very comprehensive and extremely detailed)\b/gi,
      /\b(multifaceted implications and ramifications)\b/gi,
      /\b(groundbreaking innovations)\b/gi,
      /\b(potentially revolutionize and fundamentally transform)\b/gi
    ];
    
    phrasesToRemove.forEach(phrase => {
      if (Math.random() < 0.5) {
        result = result.replace(phrase, '');
      }
    });
    
    return result.replace(/\s+/g, ' ').trim();
  }

  /**
   * Remove redundant phrases
   */
  private removeRedundantPhrases(prompt: string, seed: number): string {
    let result = prompt;
    
    const redundantPatterns = [
      { pattern: /\b(very|extremely)\s+(comprehensive|detailed)\b/gi, replacement: '$2' },
      { pattern: /\b(comprehensive and detailed)\b/gi, replacement: 'comprehensive' },
      { pattern: /\b(implications and ramifications)\b/gi, replacement: 'implications' },
      { pattern: /\b(revolutionize and transform)\b/gi, replacement: 'transform' },
      { pattern: /\b(production and distribution)\b/gi, replacement: 'distribution' }
    ];
    
    redundantPatterns.forEach(({ pattern, replacement }) => {
      if (Math.random() < 0.6) {
        result = result.replace(pattern, replacement);
      }
    });
    
    return result.replace(/\s+/g, ' ').trim();
  }

  /**
   * Condense sentences
   */
  private condenseSentences(prompt: string, seed: number): string {
    const sentences = prompt.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length < 2) return prompt;
    
    // Merge some sentences
    const merged: string[] = [];
    let i = 0;
    
    while (i < sentences.length) {
      if (i + 1 < sentences.length && Math.random() < 0.4) {
        merged.push(`${sentences[i].trim()}, ${sentences[i + 1].trim()}`);
        i += 2;
      } else {
        merged.push(sentences[i].trim());
        i++;
      }
    }
    
    return merged.join('. ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Remove filler words
   */
  private removeFillerWords(prompt: string, seed: number): string {
    const fillerWords = [
      /\b(very|really|quite|extremely|absolutely|completely|totally|entirely)\b/gi,
      /\b(just|simply|merely|only)\b/gi,
      /\b(actually|basically|essentially|fundamentally)\b/gi,
      /\b(like|sort of|kind of|type of)\b/gi,
      /\b(potentially|possibly|maybe|perhaps|might)\b/gi,
      /\b(generally|usually|typically|normally)\b/gi,
      /\b(relatively|comparatively)\b/gi
    ];
    
    let result = prompt;
    fillerWords.forEach(pattern => {
      if (Math.random() < 0.7) {
        result = result.replace(pattern, '');
      }
    });
    
    return result.replace(/\s+/g, ' ').trim();
  }

  /**
   * Evaluate fitness for entire population with GPU-optimized batch processing
   */
  private async evaluatePopulation(population: string[]): Promise<number[]> {
    // Batch generate embeddings for all individuals to utilize GPU efficiently
    const embeddings = await this.batchGenerateEmbeddings(population);
    const fitnessScores: number[] = [];
    
    for (let i = 0; i < population.length; i++) {
      const tokenCount = Math.ceil(population[i].length / 4);
      const similarity = embeddings[i];
      
      // Calculate token reduction
      const tokenReduction = (this.originalTokens - tokenCount) / this.originalTokens;
      
      // Penalize if similarity is too low
      if (similarity < this.config.minSimilarity) {
        fitnessScores.push(0);
        continue;
      }
      
      // Penalize if token reduction is too aggressive
      if (tokenReduction > this.config.maxTokenReduction) {
        fitnessScores.push(0);
        continue;
      }
      
      // Calculate fitness as weighted combination
      const similarityScore = similarity * this.config.similarityWeight;
      const tokenScore = (tokenReduction / this.config.maxTokenReduction) * this.config.tokenWeight;
      
      fitnessScores.push(similarityScore + tokenScore);
    }
    
    return fitnessScores;
  }

  /**
   * Batch generate embeddings for multiple prompts to utilize GPU efficiently
   */
  private async batchGenerateEmbeddings(prompts: string[]): Promise<number[]> {
    try {
      // Generate embeddings for all prompts in parallel
      const embeddingPromises = prompts.map(prompt => generateEmbedding(prompt));
      const embeddings = await Promise.all(embeddingPromises);
      
      // Calculate similarities with original embedding
      const similarities: number[] = [];
      for (const embedding of embeddings) {
        if (embedding && this.originalEmbedding) {
          similarities.push(cosineSimilarity(this.originalEmbedding, embedding));
        } else {
          similarities.push(0);
        }
      }
      
      return similarities;
    } catch (error) {
      console.warn('Batch embedding generation failed, falling back to individual processing');
      
      // Fallback to individual processing
      const similarities: number[] = [];
      for (const prompt of prompts) {
        const similarity = await this.calculateSimilarity(prompt);
        similarities.push(similarity);
      }
      
      return similarities;
    }
  }

  /**
   * Calculate similarity with original prompt (fallback method)
   */
  private async calculateSimilarity(prompt: string): Promise<number> {
    const embedding = await generateEmbedding(prompt);
    if (!embedding || !this.originalEmbedding) {
      return 0;
    }
    
    return cosineSimilarity(this.originalEmbedding, embedding);
  }

  /**
   * Create the next generation
   */
  private createNextGeneration(sortedPopulation: string[]): string[] {
    const newPopulation: string[] = [];
    
    // Elitism: keep the best individuals
    for (let i = 0; i < this.config.eliteSize; i++) {
      newPopulation.push(sortedPopulation[i]);
    }
    
    // Generate rest of population through crossover and mutation
    while (newPopulation.length < this.config.populationSize) {
      const parent1 = this.selectParent(sortedPopulation);
      const parent2 = this.selectParent(sortedPopulation);
      
      let child = parent1;
      
      // Crossover
      if (Math.random() < this.config.crossoverRate) {
        child = this.crossover(parent1, parent2);
      }
      
      // Mutation
      if (Math.random() < this.config.mutationRate) {
        child = this.mutate(child);
      }
      
      newPopulation.push(child);
    }
    
    return newPopulation;
  }

  /**
   * Select a parent using tournament selection
   */
  private selectParent(population: string[]): string {
    const tournamentSize = 3;
    let best = population[Math.floor(Math.random() * population.length)];
    
    for (let i = 1; i < tournamentSize; i++) {
      const candidate = population[Math.floor(Math.random() * population.length)];
      // For simplicity, we'll just randomly select since we don't have fitness values here
      if (Math.random() < 0.5) {
        best = candidate;
      }
    }
    
    return best;
  }

  /**
   * Perform crossover between two parents
   */
  private crossover(parent1: string, parent2: string): string {
    const words1 = parent1.split(' ');
    const words2 = parent2.split(' ');
    
    const crossoverPoint = Math.floor(Math.random() * Math.min(words1.length, words2.length));
    
    const childWords = [
      ...words1.slice(0, crossoverPoint),
      ...words2.slice(crossoverPoint)
    ];
    
    return childWords.join(' ');
  }

  /**
   * Mutate an individual
   */
  private mutate(individual: string): string {
    const mutations = [
      this.addRandomWord.bind(this),
      this.removeRandomWord.bind(this),
      this.replaceRandomWord.bind(this),
      this.swapRandomWords.bind(this)
    ];
    
    const mutation = mutations[Math.floor(Math.random() * mutations.length)];
    return mutation(individual);
  }

  /**
   * Add a random word
   */
  private addRandomWord(individual: string): string {
    const words = individual.split(' ');
    const commonWords = ['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'];
    const randomWord = commonWords[Math.floor(Math.random() * commonWords.length)];
    const insertIndex = Math.floor(Math.random() * (words.length + 1));
    
    words.splice(insertIndex, 0, randomWord);
    return words.join(' ');
  }

  /**
   * Remove a random word
   */
  private removeRandomWord(individual: string): string {
    const words = individual.split(' ');
    if (words.length <= 3) return individual; // Don't remove if too short
    
    const removeIndex = Math.floor(Math.random() * words.length);
    words.splice(removeIndex, 1);
    return words.join(' ');
  }

  /**
   * Replace a random word
   */
  private replaceRandomWord(individual: string): string {
    const words = individual.split(' ');
    const replaceIndex = Math.floor(Math.random() * words.length);
    const synonyms = ['analysis', 'study', 'review', 'examination', 'investigation'];
    const replacement = synonyms[Math.floor(Math.random() * synonyms.length)];
    
    words[replaceIndex] = replacement;
    return words.join(' ');
  }

  /**
   * Swap two random words
   */
  private swapRandomWords(individual: string): string {
    const words = individual.split(' ');
    if (words.length < 2) return individual;
    
    const index1 = Math.floor(Math.random() * words.length);
    const index2 = Math.floor(Math.random() * words.length);
    
    [words[index1], words[index2]] = [words[index2], words[index1]];
    return words.join(' ');
  }
} 