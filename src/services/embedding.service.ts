import { OllamaEmbeddings } from '@langchain/ollama';
import { Ollama } from '@langchain/ollama';
import dotenv from 'dotenv';

dotenv.config();

// Ollama configuration
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'mistral';
const OLLAMA_EMBEDDING_MODEL = process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';

// Initialize LangChain Ollama clients
const embeddings = new OllamaEmbeddings({
  model: OLLAMA_EMBEDDING_MODEL,
  baseUrl: OLLAMA_BASE_URL,
});

const llm = new Ollama({
  model: OLLAMA_MODEL,
  baseUrl: OLLAMA_BASE_URL,
});

export async function generateEmbedding(text: string): Promise<Float32Array | null> {
  try {
    // Truncate text to reasonable length for Nomic embeddings
    // Nomic-embed-text works well with longer texts, but we'll keep it reasonable
    const truncatedText = text.substring(0, 8000);

    const embedding = await embeddings.embedQuery(truncatedText);
    return new Float32Array(embedding);

  } catch (error) {
    console.error('Error generating embedding:', error);
    
    // Check if Ollama server is running
    if (error instanceof Error && error.message.includes('fetch')) {
      console.error('Ollama server not accessible. Make sure it\'s running on', OLLAMA_BASE_URL);
      console.error('You can start it with: ollama serve');
    }
    
    return null;
  }
}

export async function generateEmbeddingsForBatch(texts: string[]): Promise<(Float32Array | null)[]> {
  try {
    // Process in smaller batches for local server
    const batchSize = 10; // Nomic can handle larger batches
    const results: (Float32Array | null)[] = [];

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      
      try {
        // Use LangChain's batch embedding
        const batchEmbeddings = await embeddings.embedDocuments(batch);
        const batchResults = batchEmbeddings.map(embedding => new Float32Array(embedding));
        results.push(...batchResults);

        // Add small delay between batches
        if (i + batchSize < texts.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } catch (error) {
        console.error(`Error processing batch ${i / batchSize + 1}:`, error);
        // Add null results for failed batch
        results.push(...new Array(batch.length).fill(null));
      }
    }

    return results;

  } catch (error) {
    console.error('Error generating embeddings for batch:', error);
    return texts.map(() => null);
  }
}

export function cosineSimilarity(a: Float32Array, b: Float32Array): number {
  if (a.length !== b.length) {
    throw new Error('Vectors must have the same length');
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB);
  if (denominator === 0) {
    return 0; // Avoid division by zero
  }

  return dotProduct / denominator;
}

export function findSimilarArticles(
  queryEmbedding: Float32Array,
  articleEmbeddings: Array<{ id: number; embedding: Float32Array }>,
  topK: number = 5,
  similarityThreshold: number = 0.7
): Array<{ id: number; similarity: number }> {
  const similarities = articleEmbeddings
    .map(({ id, embedding }) => ({
      id,
      similarity: cosineSimilarity(queryEmbedding, embedding)
    }))
    .filter(item => item.similarity >= similarityThreshold) // Filter by threshold
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return similarities;
}

// Helper function to validate embedding dimensions
export function validateEmbedding(embedding: Float32Array): boolean {
  // Nomic-embed-text produces 768-dimensional embeddings
  // But we'll accept any reasonable size for flexibility
  return embedding.length > 0 && embedding.length <= 4096;
}

// Helper function to normalize embeddings (optional, for some use cases)
export function normalizeEmbedding(embedding: Float32Array): Float32Array {
  const norm = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
  if (norm === 0) return embedding;
  
  return new Float32Array(embedding.map(val => val / norm));
}

// Helper function to check if Ollama server is available
export async function checkOllamaServer(): Promise<boolean> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    return response.ok;
  } catch (error) {
    return false;
  }
}

// Helper function to list available models
export async function listAvailableModels(): Promise<string[]> {
  try {
    const response = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (response.ok) {
      const data = await response.json();
      return data.models?.map((model: any) => model.name) || [];
    } else {
      console.error('Failed to list models:', response.status, response.statusText);
      return [];
    }
  } catch (error) {
    console.error('Error listing models:', error);
    return [];
  }
}

// Export the LLM instance for use in other services
export { llm }; 