import { generateEmbedding, cosineSimilarity } from './embedding.service.js';

export interface OptimizationResult {
  originalPrompt: string;
  optimizedPrompt: string;
  originalTokens: number;
  optimizedTokens: number;
  tokenReduction: number;
  tokenReductionPercentage: number;
  similarityScore: number;
  optimizationSteps: OptimizationStep[];
}

export interface OptimizationStep {
  step: number;
  description: string;
  prompt: string;
  tokens: number;
  similarity: number;
}

export interface DriftPrompt {
  originalPrompt: string;
  variation: string;
  similarity: number;
  variationType: string;
  description: string;
}

export class PromptOptimizerService {
  private originalEmbedding: Float32Array | null = null;
  private originalTokens: number = 0;

  /**
   * Optimize a prompt by reducing token count while maintaining semantic similarity
   */
  async optimizePrompt(
    prompt: string,
    targetTokenReduction: number = 0.3, // Target 30% reduction
    minSimilarity: number = 0.85, // Minimum similarity threshold
    maxIterations: number = 10
  ): Promise<OptimizationResult> {
    const startTime = Date.now();
    
    // Generate embedding for original prompt
    this.originalEmbedding = await generateEmbedding(prompt);
    if (!this.originalEmbedding) {
      throw new Error('Failed to generate embedding for original prompt');
    }

    // Estimate token count (rough approximation: 1 token ≈ 4 characters for English)
    this.originalTokens = Math.ceil(prompt.length / 4);
    
    const optimizationSteps: OptimizationStep[] = [];
    let currentPrompt = prompt;
    let currentTokens = this.originalTokens;
    let currentSimilarity = 1.0;

    // Add initial step
    optimizationSteps.push({
      step: 0,
      description: 'Original prompt',
      prompt: currentPrompt,
      tokens: currentTokens,
      similarity: currentSimilarity
    });

    const targetTokens = Math.floor(this.originalTokens * (1 - targetTokenReduction));

    for (let iteration = 1; iteration <= maxIterations; iteration++) {
      const previousPrompt = currentPrompt;
      const previousTokens = currentTokens;
      const previousSimilarity = currentSimilarity;

      // Apply optimization strategies
      currentPrompt = this.applyOptimizationStrategies(currentPrompt, iteration);
      currentTokens = Math.ceil(currentPrompt.length / 4);

      // Check if we've achieved target reduction
      if (currentTokens <= targetTokens) {
        // Verify similarity is still acceptable
        const newEmbedding = await generateEmbedding(currentPrompt);
        if (newEmbedding) {
          currentSimilarity = cosineSimilarity(this.originalEmbedding, newEmbedding);
          
          if (currentSimilarity >= minSimilarity) {
            optimizationSteps.push({
              step: iteration,
              description: `Optimization step ${iteration} - Target achieved`,
              prompt: currentPrompt,
              tokens: currentTokens,
              similarity: currentSimilarity
            });
            break;
          } else {
            // Revert if similarity is too low
            currentPrompt = previousPrompt;
            currentTokens = previousTokens;
            currentSimilarity = previousSimilarity;
            break;
          }
        }
      }

      // Check similarity at each step
      const newEmbedding = await generateEmbedding(currentPrompt);
      if (newEmbedding) {
        currentSimilarity = cosineSimilarity(this.originalEmbedding, newEmbedding);
        
        if (currentSimilarity < minSimilarity) {
          // Revert to previous step if similarity drops too low
          currentPrompt = previousPrompt;
          currentTokens = previousTokens;
          currentSimilarity = previousSimilarity;
          break;
        }
      }

      optimizationSteps.push({
        step: iteration,
        description: `Optimization step ${iteration}`,
        prompt: currentPrompt,
        tokens: currentTokens,
        similarity: currentSimilarity
      });

      // Stop if no improvement
      if (currentTokens >= previousTokens) {
        break;
      }
    }

    const processingTime = Date.now() - startTime;
    const tokenReduction = this.originalTokens - currentTokens;
    const tokenReductionPercentage = (tokenReduction / this.originalTokens) * 100;

    return {
      originalPrompt: prompt,
      optimizedPrompt: currentPrompt,
      originalTokens: this.originalTokens,
      optimizedTokens: currentTokens,
      tokenReduction,
      tokenReductionPercentage,
      similarityScore: currentSimilarity,
      optimizationSteps
    };
  }

  /**
   * Apply various optimization strategies to reduce token count
   */
  private applyOptimizationStrategies(prompt: string, iteration: number): string {
    let optimized = prompt;

    // Strategy 1: Remove common filler words and phrases
    if (iteration === 1) {
      optimized = this.removeFillerWords(optimized);
    }

    // Strategy 2: Simplify sentence structures
    if (iteration === 2) {
      optimized = this.simplifySentences(optimized);
    }

    // Strategy 3: Remove redundant phrases
    if (iteration === 3) {
      optimized = this.removeRedundantPhrases(optimized);
    }

    // Strategy 4: Abbreviate common terms
    if (iteration === 4) {
      optimized = this.abbreviateTerms(optimized);
    }

    // Strategy 5: Remove unnecessary punctuation and formatting
    if (iteration === 5) {
      optimized = this.cleanupFormatting(optimized);
    }

    // Strategy 6: Merge similar sentences
    if (iteration === 6) {
      optimized = this.mergeSimilarSentences(optimized);
    }

    // Strategy 7: Remove qualifying words
    if (iteration === 7) {
      optimized = this.removeQualifiers(optimized);
    }

    // Strategy 8: Use shorter synonyms
    if (iteration === 8) {
      optimized = this.useShorterSynonyms(optimized);
    }

    return optimized;
  }

  /**
   * Remove common filler words that don't add semantic value
   */
  private removeFillerWords(text: string): string {
    const fillerWords = [
      /\b(very|really|quite|extremely|absolutely|completely|totally|entirely)\b/gi,
      /\b(just|simply|merely|only|simply)\b/gi,
      /\b(actually|basically|essentially|fundamentally)\b/gi,
      /\b(like|sort of|kind of|type of)\b/gi,
      /\b(you know|i mean|well|so|um|uh)\b/gi,
      /\b(in order to|so as to)\b/gi,
      /\b(due to the fact that|because of the fact that)\b/gi,
      /\b(at this point in time|at the present time)\b/gi,
      /\b(in the event that|if and when)\b/gi,
      /\b(prior to|subsequent to)\b/gi
    ];

    let result = text;
    fillerWords.forEach(pattern => {
      result = result.replace(pattern, '');
    });

    // Clean up extra spaces
    result = result.replace(/\s+/g, ' ').trim();
    return result;
  }

  /**
   * Simplify sentence structures
   */
  private simplifySentences(text: string): string {
    // Split into sentences
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    const simplified = sentences.map(sentence => {
      let simplified = sentence.trim();
      
      // Remove unnecessary clauses
      simplified = simplified.replace(/\b(which is|that is|who is|where is)\b/gi, '');
      
      // Simplify passive voice where possible
      simplified = simplified.replace(/\b(is being|are being|was being|were being)\b/gi, 'is');
      simplified = simplified.replace(/\b(has been|have been|had been)\b/gi, 'is');
      
      // Remove redundant conjunctions
      simplified = simplified.replace(/\b(and also|but also|or else)\b/gi, 'and');
      
      return simplified;
    });

    return simplified.join('. ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Remove redundant phrases
   */
  private removeRedundantPhrases(text: string): string {
    const redundantPatterns = [
      { pattern: /\b(free gift)\b/gi, replacement: 'gift' },
      { pattern: /\b(past history)\b/gi, replacement: 'history' },
      { pattern: /\b(future plans)\b/gi, replacement: 'plans' },
      { pattern: /\b(advance planning)\b/gi, replacement: 'planning' },
      { pattern: /\b(consensus of opinion)\b/gi, replacement: 'consensus' },
      { pattern: /\b(end result)\b/gi, replacement: 'result' },
      { pattern: /\b(final outcome)\b/gi, replacement: 'outcome' },
      { pattern: /\b(close proximity)\b/gi, replacement: 'proximity' },
      { pattern: /\b(completely finished)\b/gi, replacement: 'finished' },
      { pattern: /\b(completely surrounded)\b/gi, replacement: 'surrounded' },
      { pattern: /\b(continue on)\b/gi, replacement: 'continue' },
      { pattern: /\b(descend down)\b/gi, replacement: 'descend' },
      { pattern: /\b(enter into)\b/gi, replacement: 'enter' },
      { pattern: /\b(follow after)\b/gi, replacement: 'follow' },
      { pattern: /\b(join together)\b/gi, replacement: 'join' },
      { pattern: /\b(meet together)\b/gi, replacement: 'meet' },
      { pattern: /\b(merge together)\b/gi, replacement: 'merge' },
      { pattern: /\b(mix together)\b/gi, replacement: 'mix' },
      { pattern: /\b(open up)\b/gi, replacement: 'open' },
      { pattern: /\b(pass by)\b/gi, replacement: 'pass' },
      { pattern: /\b(penetrate into)\b/gi, replacement: 'penetrate' },
      { pattern: /\b(proceed forward)\b/gi, replacement: 'proceed' },
      { pattern: /\b(raise up)\b/gi, replacement: 'raise' },
      { pattern: /\b(refer back)\b/gi, replacement: 'refer' },
      { pattern: /\b(repeat again)\b/gi, replacement: 'repeat' },
      { pattern: /\b(return back)\b/gi, replacement: 'return' },
      { pattern: /\b(revert back)\b/gi, replacement: 'revert' },
      { pattern: /\b(surround around)\b/gi, replacement: 'surround' },
      { pattern: /\b(unite together)\b/gi, replacement: 'unite' }
    ];

    let result = text;
    redundantPatterns.forEach(({ pattern, replacement }) => {
      result = result.replace(pattern, replacement);
    });

    return result.replace(/\s+/g, ' ').trim();
  }

  /**
   * Abbreviate common terms
   */
  private abbreviateTerms(text: string): string {
    const abbreviations = [
      { pattern: /\b(United States)\b/gi, replacement: 'US' },
      { pattern: /\b(United Kingdom)\b/gi, replacement: 'UK' },
      { pattern: /\b(European Union)\b/gi, replacement: 'EU' },
      { pattern: /\b(artificial intelligence)\b/gi, replacement: 'AI' },
      { pattern: /\b(machine learning)\b/gi, replacement: 'ML' },
      { pattern: /\b(deep learning)\b/gi, replacement: 'DL' },
      { pattern: /\b(natural language processing)\b/gi, replacement: 'NLP' },
      { pattern: /\b(application programming interface)\b/gi, replacement: 'API' },
      { pattern: /\b(user interface)\b/gi, replacement: 'UI' },
      { pattern: /\b(user experience)\b/gi, replacement: 'UX' },
      { pattern: /\b(software as a service)\b/gi, replacement: 'SaaS' },
      { pattern: /\b(infrastructure as a service)\b/gi, replacement: 'IaaS' },
      { pattern: /\b(platform as a service)\b/gi, replacement: 'PaaS' },
      { pattern: /\b(chief executive officer)\b/gi, replacement: 'CEO' },
      { pattern: /\b(chief financial officer)\b/gi, replacement: 'CFO' },
      { pattern: /\b(chief technology officer)\b/gi, replacement: 'CTO' },
      { pattern: /\b(chief operating officer)\b/gi, replacement: 'COO' },
      { pattern: /\b(public relations)\b/gi, replacement: 'PR' },
      { pattern: /\b(human resources)\b/gi, replacement: 'HR' },
      { pattern: /\b(information technology)\b/gi, replacement: 'IT' },
      { pattern: /\b(business to business)\b/gi, replacement: 'B2B' },
      { pattern: /\b(business to consumer)\b/gi, replacement: 'B2C' },
      { pattern: /\b(return on investment)\b/gi, replacement: 'ROI' },
      { pattern: /\b(key performance indicator)\b/gi, replacement: 'KPI' }
    ];

    let result = text;
    abbreviations.forEach(({ pattern, replacement }) => {
      result = result.replace(pattern, replacement);
    });

    return result;
  }

  /**
   * Clean up unnecessary punctuation and formatting
   */
  private cleanupFormatting(text: string): string {
    let result = text;
    
    // Remove excessive punctuation
    result = result.replace(/[!]{2,}/g, '!');
    result = result.replace(/[?]{2,}/g, '?');
    result = result.replace(/[.]{2,}/g, '.');
    
    // Remove unnecessary quotes around single words
    result = result.replace(/"(\w+)"/g, '$1');
    result = result.replace(/'(\w+)'/g, '$1');
    
    // Remove excessive whitespace
    result = result.replace(/\s+/g, ' ');
    
    // Remove trailing punctuation
    result = result.replace(/[.!?]+$/, '');
    
    return result.trim();
  }

  /**
   * Merge similar sentences
   */
  private mergeSimilarSentences(text: string): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length < 2) return text;
    
    const merged: string[] = [];
    let i = 0;
    
    while (i < sentences.length) {
      const current = sentences[i].trim();
      
      if (i + 1 < sentences.length) {
        const next = sentences[i + 1].trim();
        
        // Check if sentences can be merged (simple heuristic)
        const currentWords = current.toLowerCase().split(/\s+/);
        const nextWords = next.toLowerCase().split(/\s+/);
        const commonWords = currentWords.filter(word => nextWords.includes(word));
        
        if (commonWords.length >= 2 && current.length + next.length < 100) {
          // Merge sentences
          merged.push(`${current} and ${next}`);
          i += 2;
        } else {
          merged.push(current);
          i++;
        }
      } else {
        merged.push(current);
        i++;
      }
    }
    
    return merged.join('. ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Remove qualifying words
   */
  private removeQualifiers(text: string): string {
    const qualifiers = [
      /\b(somewhat|slightly|moderately|fairly|reasonably)\b/gi,
      /\b(almost|nearly|approximately|roughly|about)\b/gi,
      /\b(potentially|possibly|maybe|perhaps|might)\b/gi,
      /\b(generally|usually|typically|normally)\b/gi,
      /\b(relatively|comparatively|relatively speaking)\b/gi
    ];

    let result = text;
    qualifiers.forEach(pattern => {
      result = result.replace(pattern, '');
    });

    return result.replace(/\s+/g, ' ').trim();
  }

  /**
   * Use shorter synonyms for common words
   */
  private useShorterSynonyms(text: string): string {
    const synonyms = [
      { pattern: /\b(utilize|utilization)\b/gi, replacement: 'use' },
      { pattern: /\b(implement|implementation)\b/gi, replacement: 'use' },
      { pattern: /\b(establish|establishment)\b/gi, replacement: 'set up' },
      { pattern: /\b(commence|commencement)\b/gi, replacement: 'start' },
      { pattern: /\b(terminate|termination)\b/gi, replacement: 'end' },
      { pattern: /\b(acquire|acquisition)\b/gi, replacement: 'get' },
      { pattern: /\b(obtain|obtainment)\b/gi, replacement: 'get' },
      { pattern: /\b(endeavor|endeavoring)\b/gi, replacement: 'try' },
      { pattern: /\b(attempt|attempting)\b/gi, replacement: 'try' },
      { pattern: /\b(accomplish|accomplishment)\b/gi, replacement: 'do' },
      { pattern: /\b(perform|performance)\b/gi, replacement: 'do' },
      { pattern: /\b(execute|execution)\b/gi, replacement: 'do' },
      { pattern: /\b(conclude|conclusion)\b/gi, replacement: 'end' },
      { pattern: /\b(finalize|finalization)\b/gi, replacement: 'finish' },
      { pattern: /\b(complete|completion)\b/gi, replacement: 'finish' },
      { pattern: /\b(initiate|initiation)\b/gi, replacement: 'start' },
      { pattern: /\b(begin|beginning)\b/gi, replacement: 'start' },
      { pattern: /\b(cease|cessation)\b/gi, replacement: 'stop' },
      { pattern: /\b(discontinue|discontinuation)\b/gi, replacement: 'stop' },
      { pattern: /\b(prohibit|prohibition)\b/gi, replacement: 'ban' },
      { pattern: /\b(prohibit|prohibition)\b/gi, replacement: 'ban' }
    ];

    let result = text;
    synonyms.forEach(({ pattern, replacement }) => {
      result = result.replace(pattern, replacement);
    });

    return result.replace(/\s+/g, ' ').trim();
  }

  /**
   * Generate drift prompts - semantically similar but lexically different variations
   */
  async generateDriftPrompts(
    prompt: string,
    numVariations: number = 5,
    minSimilarity: number = 0.7,
    maxSimilarity: number = 0.95
  ): Promise<DriftPrompt[]> {
    const startTime = Date.now();
    
    // Generate embedding for original prompt
    this.originalEmbedding = await generateEmbedding(prompt);
    if (!this.originalEmbedding) {
      throw new Error('Failed to generate embedding for original prompt');
    }

    const driftPrompts: DriftPrompt[] = [];
    const variationStrategies = [
      {
        name: 'synonym_replacement',
        description: 'Replace key words with synonyms',
        generate: (text: string) => this.applySynonymVariations(text)
      },
      {
        name: 'sentence_restructuring',
        description: 'Restructure sentences while maintaining meaning',
        generate: (text: string) => this.applySentenceRestructuring(text)
      },
      {
        name: 'tone_variation',
        description: 'Vary the tone and formality level',
        generate: (text: string) => this.applyToneVariations(text)
      },
      {
        name: 'perspective_shift',
        description: 'Shift perspective or viewpoint',
        generate: (text: string) => this.applyPerspectiveShift(text)
      },
      {
        name: 'detail_adjustment',
        description: 'Add or remove specific details',
        generate: (text: string) => this.applyDetailAdjustments(text)
      },
      {
        name: 'format_variation',
        description: 'Vary the format and structure',
        generate: (text: string) => this.applyFormatVariations(text)
      },
      {
        name: 'emphasis_shift',
        description: 'Shift emphasis to different aspects',
        generate: (text: string) => this.applyEmphasisShift(text)
      },
      {
        name: 'context_addition',
        description: 'Add or modify context',
        generate: (text: string) => this.applyContextModifications(text)
      }
    ];

    let attempts = 0;
    const maxAttempts = numVariations * 10; // Prevent infinite loops

    while (driftPrompts.length < numVariations && attempts < maxAttempts) {
      attempts++;
      
      // Select a random strategy
      const strategy = variationStrategies[Math.floor(Math.random() * variationStrategies.length)];
      
      try {
        const variation = strategy.generate(prompt);
        
        // Skip if too similar to original
        if (variation.toLowerCase() === prompt.toLowerCase()) {
          continue;
        }
        
        // Skip if too similar to existing variations
        const isDuplicate = driftPrompts.some(dp => 
          dp.variation.toLowerCase() === variation.toLowerCase()
        );
        if (isDuplicate) {
          continue;
        }
        
        // Generate embedding for variation
        const variationEmbedding = await generateEmbedding(variation);
        if (!variationEmbedding) {
          continue;
        }
        
        const similarity = cosineSimilarity(this.originalEmbedding, variationEmbedding);
        
        // Check if similarity is within desired range
        if (similarity >= minSimilarity && similarity <= maxSimilarity) {
          driftPrompts.push({
            originalPrompt: prompt,
            variation,
            similarity,
            variationType: strategy.name,
            description: strategy.description
          });
        }
      } catch (error) {
        console.warn(`Failed to generate variation with strategy ${strategy.name}:`, error);
        continue;
      }
    }

    // Sort by similarity (descending)
    driftPrompts.sort((a, b) => b.similarity - a.similarity);

    return driftPrompts;
  }

  /**
   * Apply synonym variations to the prompt
   */
  private applySynonymVariations(text: string): string {
    const synonymMap: Record<string, string[]> = {
      'analyze': ['examine', 'investigate', 'study', 'assess', 'evaluate'],
      'provide': ['give', 'offer', 'supply', 'deliver', 'present'],
      'comprehensive': ['thorough', 'complete', 'extensive', 'detailed', 'in-depth'],
      'detailed': ['comprehensive', 'thorough', 'extensive', 'in-depth', 'elaborate'],
      'insights': ['perspectives', 'observations', 'findings', 'analysis', 'understanding'],
      'developments': ['advancements', 'progress', 'innovations', 'breakthroughs', 'improvements'],
      'technology': ['tech', 'technological', 'digital', 'computing'],
      'sector': ['industry', 'field', 'domain', 'area', 'market'],
      'trends': ['patterns', 'movements', 'directions', 'developments'],
      'impact': ['effect', 'influence', 'consequence', 'result', 'outcome'],
      'various': ['different', 'multiple', 'diverse', 'assorted', 'several'],
      'industries': ['sectors', 'fields', 'domains', 'markets', 'areas'],
      'business': ['commercial', 'corporate', 'enterprise', 'organizational'],
      'models': ['frameworks', 'approaches', 'strategies', 'systems', 'structures'],
      'current': ['present', 'existing', 'ongoing', 'contemporary', 'modern'],
      'market': ['industry', 'sector', 'field', 'domain', 'landscape'],
      'artificial intelligence': ['AI', 'machine intelligence', 'computational intelligence'],
      'machine learning': ['ML', 'statistical learning', 'predictive modeling'],
      'advancements': ['developments', 'progress', 'innovations', 'breakthroughs'],
      'potential': ['possible', 'likely', 'prospective', 'future', 'anticipated']
    };

    let result = text;
    const words = text.split(/\s+/);
    
    // Replace some words with synonyms (randomly select 30-50% of applicable words)
    for (const [word, synonyms] of Object.entries(synonymMap)) {
      if (Math.random() < 0.4) { // 40% chance to apply each synonym
        const regex = new RegExp(`\\b${word}\\b`, 'gi');
        const synonym = synonyms[Math.floor(Math.random() * synonyms.length)];
        result = result.replace(regex, synonym);
      }
    }

    return result;
  }

  /**
   * Apply sentence restructuring variations
   */
  private applySentenceRestructuring(text: string): string {
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    if (sentences.length === 0) return text;
    
    const restructured = sentences.map(sentence => {
      const words = sentence.trim().split(/\s+/);
      
      // Simple restructuring: move some phrases around
      if (words.length > 8) {
        // Find phrases to potentially move
        const phrases = this.extractPhrases(sentence);
        if (phrases.length > 1) {
          // Randomly reorder some phrases
          const shuffled = [...phrases];
          for (let i = shuffled.length - 1; i > 0; i--) {
            if (Math.random() < 0.3) { // 30% chance to swap
              const j = Math.floor(Math.random() * (i + 1));
              [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }
          }
          return shuffled.join(' ');
        }
      }
      
      return sentence;
    });

    return restructured.join('. ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Apply tone variations
   */
  private applyToneVariations(text: string): string {
    const toneVariations = [
      // More formal
      {
        patterns: [
          { from: /\b(please|kindly)\b/gi, to: 'I would appreciate if you could' },
          { from: /\b(give|provide)\b/gi, to: 'furnish' },
          { from: /\b(look at|examine)\b/gi, to: 'scrutinize' },
          { from: /\b(show|tell)\b/gi, to: 'demonstrate' }
        ]
      },
      // More casual
      {
        patterns: [
          { from: /\b(comprehensive|thorough)\b/gi, to: 'good' },
          { from: /\b(analysis|examination)\b/gi, to: 'look' },
          { from: /\b(please|kindly)\b/gi, to: '' },
          { from: /\b(utilize|employ)\b/gi, to: 'use' }
        ]
      },
      // More technical
      {
        patterns: [
          { from: /\b(look at)\b/gi, to: 'analyze' },
          { from: /\b(show)\b/gi, to: 'demonstrate' },
          { from: /\b(tell)\b/gi, to: 'elucidate' },
          { from: /\b(find)\b/gi, to: 'identify' }
        ]
      }
    ];

    const selectedTone = toneVariations[Math.floor(Math.random() * toneVariations.length)];
    let result = text;
    
    selectedTone.patterns.forEach(({ from, to }) => {
      result = result.replace(from, to);
    });

    return result.replace(/\s+/g, ' ').trim();
  }

  /**
   * Apply perspective shift variations
   */
  private applyPerspectiveShift(text: string): string {
    const perspectiveShifts = [
      // From direct request to indirect
      {
        patterns: [
          { from: /^please\s+/i, to: 'I would like you to ' },
          { from: /^can you\s+/i, to: 'I would appreciate if you could ' },
          { from: /^could you\s+/i, to: 'It would be helpful if you could ' }
        ]
      },
      // From analysis request to exploration request
      {
        patterns: [
          { from: /\b(analyze|examine)\b/gi, to: 'explore' },
          { from: /\b(provide|give)\b/gi, to: 'share' },
          { from: /\b(insights|findings)\b/gi, to: 'thoughts' }
        ]
      },
      // From specific to general
      {
        patterns: [
          { from: /\b(current market trends)\b/gi, to: 'market landscape' },
          { from: /\b(technology sector)\b/gi, to: 'tech industry' },
          { from: /\b(artificial intelligence)\b/gi, to: 'AI technologies' }
        ]
      }
    ];

    const selectedShift = perspectiveShifts[Math.floor(Math.random() * perspectiveShifts.length)];
    let result = text;
    
    selectedShift.patterns.forEach(({ from, to }) => {
      result = result.replace(from, to);
    });

    return result.replace(/\s+/g, ' ').trim();
  }

  /**
   * Apply detail adjustments
   */
  private applyDetailAdjustments(text: string): string {
    const adjustments = [
      // Add specific examples
      {
        patterns: [
          { from: /\b(technology sector)\b/gi, to: 'technology sector (e.g., software, hardware, cloud computing)' },
          { from: /\b(artificial intelligence)\b/gi, to: 'artificial intelligence (including machine learning and deep learning)' },
          { from: /\b(business models)\b/gi, to: 'business models and revenue streams' }
        ]
      },
      // Remove some details
      {
        patterns: [
          { from: /\s+including detailed insights about\s+/gi, to: ' including ' },
          { from: /\s+and their potential impact\s+/gi, to: ' and impact ' },
          { from: /\s+on various industries and business models\s+/gi, to: ' on business' }
        ]
      },
      // Add time context
      {
        patterns: [
          { from: /\b(current market trends)\b/gi, to: 'current and emerging market trends' },
          { from: /\b(developments)\b/gi, to: 'recent developments' },
          { from: /\b(advancements)\b/gi, to: 'latest advancements' }
        ]
      }
    ];

    const selectedAdjustment = adjustments[Math.floor(Math.random() * adjustments.length)];
    let result = text;
    
    selectedAdjustment.patterns.forEach(({ from, to }) => {
      result = result.replace(from, to);
    });

    return result.replace(/\s+/g, ' ').trim();
  }

  /**
   * Apply format variations
   */
  private applyFormatVariations(text: string): string {
    const formatVariations = [
      // Convert to bullet points
      (text: string) => {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        return sentences.map(s => `• ${s.trim()}`).join('\n');
      },
      // Convert to numbered list
      (text: string) => {
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        return sentences.map((s, i) => `${i + 1}. ${s.trim()}`).join('\n');
      },
      // Add emphasis markers
      (text: string) => {
        return text.replace(/\b(important|key|critical)\b/gi, '**$1**');
      },
      // Convert to question format
      (text: string) => {
        return `Can you ${text.toLowerCase().replace(/^please\s+/i, '')}?`;
      }
    ];

    const selectedFormat = formatVariations[Math.floor(Math.random() * formatVariations.length)];
    return selectedFormat(text);
  }

  /**
   * Apply emphasis shift
   */
  private applyEmphasisShift(text: string): string {
    const emphasisShifts = [
      // Emphasize technology
      {
        patterns: [
          { from: /\b(market trends)\b/gi, to: '**technology-driven market trends**' },
          { from: /\b(developments)\b/gi, to: '**technological developments**' },
          { from: /\b(advancements)\b/gi, to: '**technical advancements**' }
        ]
      },
      // Emphasize business impact
      {
        patterns: [
          { from: /\b(impact)\b/gi, to: '**business impact**' },
          { from: /\b(industries)\b/gi, to: '**key industries**' },
          { from: /\b(business models)\b/gi, to: '**business model transformations**' }
        ]
      },
      // Emphasize analysis
      {
        patterns: [
          { from: /\b(analysis)\b/gi, to: '**detailed analysis**' },
          { from: /\b(insights)\b/gi, to: '**key insights**' },
          { from: /\b(trends)\b/gi, to: '**trend analysis**' }
        ]
      }
    ];

    const selectedShift = emphasisShifts[Math.floor(Math.random() * emphasisShifts.length)];
    let result = text;
    
    selectedShift.patterns.forEach(({ from, to }) => {
      result = result.replace(from, to);
    });

    return result.replace(/\s+/g, ' ').trim();
  }

  /**
   * Apply context modifications
   */
  private applyContextModifications(text: string): string {
    const contextModifications = [
      // Add industry context
      {
        patterns: [
          { from: /\b(technology sector)\b/gi, to: 'technology sector in 2024' },
          { from: /\b(market trends)\b/gi, to: 'market trends across different regions' },
          { from: /\b(industries)\b/gi, to: 'industries including healthcare, finance, and retail' }
        ]
      },
      // Add temporal context
      {
        patterns: [
          { from: /\b(current)\b/gi, to: 'current and future' },
          { from: /\b(developments)\b/gi, to: 'recent and upcoming developments' },
          { from: /\b(trends)\b/gi, to: 'trends over the next few years' }
        ]
      },
      // Add scope context
      {
        patterns: [
          { from: /\b(analysis)\b/gi, to: 'comprehensive analysis covering multiple aspects' },
          { from: /\b(insights)\b/gi, to: 'insights from various perspectives' },
          { from: /\b(impact)\b/gi, to: 'impact across different dimensions' }
        ]
      }
    ];

    const selectedModification = contextModifications[Math.floor(Math.random() * contextModifications.length)];
    let result = text;
    
    selectedModification.patterns.forEach(({ from, to }) => {
      result = result.replace(from, to);
    });

    return result.replace(/\s+/g, ' ').trim();
  }

  /**
   * Extract phrases from a sentence for restructuring
   */
  private extractPhrases(sentence: string): string[] {
    // Simple phrase extraction based on common patterns
    const phrases: string[] = [];
    
    // Split by common conjunctions and prepositions
    const parts = sentence.split(/\s+(and|or|but|including|such as|with|in|on|at|for|to|of)\s+/i);
    
    for (let i = 0; i < parts.length; i += 2) {
      if (parts[i] && parts[i].trim().length > 0) {
        phrases.push(parts[i].trim());
      }
      if (parts[i + 1] && parts[i + 2] && parts[i + 2].trim().length > 0) {
        phrases.push(`${parts[i + 1]} ${parts[i + 2].trim()}`);
        i++; // Skip the next part since we combined it
      }
    }
    
    return phrases.length > 0 ? phrases : [sentence];
  }

  /**
   * Get detailed analysis of prompt optimization
   */
  async analyzePrompt(prompt: string): Promise<{
    wordCount: number;
    estimatedTokens: number;
    readabilityScore: number;
    complexityMetrics: {
      avgWordLength: number;
      sentenceCount: number;
      avgSentenceLength: number;
      uniqueWords: number;
      vocabularyDiversity: number;
    };
  }> {
    const words = prompt.split(/\s+/).filter(word => word.length > 0);
    const sentences = prompt.split(/[.!?]+/).filter(s => s.trim().length > 0);
    const uniqueWords = new Set(words.map(word => word.toLowerCase()));
    
    const avgWordLength = words.reduce((sum, word) => sum + word.length, 0) / words.length;
    const avgSentenceLength = words.length / sentences.length;
    const vocabularyDiversity = uniqueWords.size / words.length;

    // Simple readability score (Flesch Reading Ease approximation)
    const readabilityScore = Math.max(0, Math.min(100, 
      206.835 - (1.015 * avgSentenceLength) - (84.6 * avgWordLength / 100)
    ));

    return {
      wordCount: words.length,
      estimatedTokens: Math.ceil(prompt.length / 4),
      readabilityScore: Math.round(readabilityScore),
      complexityMetrics: {
        avgWordLength: Math.round(avgWordLength * 100) / 100,
        sentenceCount: sentences.length,
        avgSentenceLength: Math.round(avgSentenceLength * 100) / 100,
        uniqueWords: uniqueWords.size,
        vocabularyDiversity: Math.round(vocabularyDiversity * 1000) / 1000
      }
    };
  }
} 