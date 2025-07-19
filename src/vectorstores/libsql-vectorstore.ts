import { VectorStore } from '@langchain/core/vectorstores';
import { Document } from '@langchain/core/documents';
import { Embeddings } from '@langchain/core/embeddings';
import { createClient } from '@libsql/client';
import type { Client as LibSQLClient } from '@libsql/client';

export interface LibSQLVectorStoreConfig {
  client: LibSQLClient;
  tableName?: string;
  embeddingColumn?: string;
  textColumn?: string;
  metadataColumn?: string;
  idColumn?: string;
}

export interface LibSQLVectorStoreDocument {
  id: string;
  text: string;
  embedding: number[];
  metadata?: Record<string, any>;
}

export class LibSQLVectorStore extends VectorStore {
  private client: LibSQLClient;
  private tableName: string;
  private embeddingColumn: string;
  private textColumn: string;
  private metadataColumn: string;
  private idColumn: string;

  _vectorstoreType(): string {
    return 'libsql';
  }

  constructor(embeddings: Embeddings, config: LibSQLVectorStoreConfig) {
    super(embeddings, config);
    
    this.client = config.client;
    this.tableName = config.tableName || 'vector_store';
    this.embeddingColumn = config.embeddingColumn || 'embedding';
    this.textColumn = config.textColumn || 'text';
    this.metadataColumn = config.metadataColumn || 'metadata';
    this.idColumn = config.idColumn || 'id';
  }

  async addVectors(vectors: number[][], documents: Document[]): Promise<void> {
    for (let i = 0; i < vectors.length; i++) {
      const vector = vectors[i];
      const document = documents[i];
      await this.addVector(vector, document);
    }
  }

  /**
   * Initialize the vector store table
   */
  async initialize(): Promise<void> {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS ${this.tableName} (
        ${this.idColumn} TEXT PRIMARY KEY,
        ${this.textColumn} TEXT NOT NULL,
        ${this.embeddingColumn} TEXT NOT NULL,
        ${this.metadataColumn} TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await this.client.execute(createTableSQL);
  }

  /**
   * Add documents to the vector store with duplicate detection
   */
  async addDocuments(documents: Document[]): Promise<void> {
    const texts = documents.map(doc => doc.pageContent);
    const embeddings = await this.embeddings.embedDocuments(texts);

    let addedCount = 0;
    let skippedCount = 0;

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const embedding = embeddings[i];
      
      try {
        await this.addVector(embedding, doc, doc.metadata?.id || `doc_${Date.now()}_${i}`);
        addedCount++;
      } catch (error) {
        if (error instanceof Error && error.message.includes('UNIQUE constraint failed')) {
          console.log(`⚠️ Skipping duplicate document: ${doc.metadata?.title || 'Unknown'}`);
          skippedCount++;
        } else {
          throw error;
        }
      }
    }

    console.log(`📊 Vector store update: ${addedCount} added, ${skippedCount} skipped (duplicates)`);
  }

  /**
   * Add a single vector with metadata
   */
  async addVector(
    embedding: number[],
    document: Document,
    id?: string
  ): Promise<void> {
    const docId = id || document.metadata?.id || `doc_${Date.now()}`;
    const embeddingJson = JSON.stringify(embedding);
    const metadataJson = JSON.stringify(document.metadata || {});

    // Check if document already exists
    const exists = await this.documentExists(docId);
    if (exists) {
      throw new Error(`UNIQUE constraint failed: Document with ID ${docId} already exists`);
    }

    const insertSQL = `
      INSERT INTO ${this.tableName} 
      (${this.idColumn}, ${this.textColumn}, ${this.embeddingColumn}, ${this.metadataColumn})
      VALUES (?, ?, ?, ?)
    `;

    await this.client.execute({
      sql: insertSQL,
      args: [docId, document.pageContent, embeddingJson, metadataJson]
    });
  }

  /**
   * Check if a document already exists
   */
  private async documentExists(id: string): Promise<boolean> {
    const result = await this.client.execute({
      sql: `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${this.idColumn} = ?`,
      args: [id]
    });

    return (result.rows[0].count as number) > 0;
  }

  /**
   * Similarity search with score
   */
  async similaritySearchVectorWithScore(
    query: number[],
    k: number = 4,
    filter?: Record<string, any>
  ): Promise<[Document, number][]> {
    const results = await this.similaritySearchVectorWithScoreRaw(query, k, filter);
    
    return results.map(([doc, score]) => [
      new Document({
        pageContent: doc.text,
        metadata: doc.metadata
      }),
      score
    ]);
  }

  /**
   * Raw similarity search that returns the stored document format
   */
  async similaritySearchVectorWithScoreRaw(
    query: number[],
    k: number = 4,
    filter?: Record<string, any>
  ): Promise<[LibSQLVectorStoreDocument, number][]> {
    // Get all vectors from the database
    let selectSQL = `SELECT ${this.idColumn}, ${this.textColumn}, ${this.embeddingColumn}, ${this.metadataColumn} FROM ${this.tableName}`;
    const args: any[] = [];

    // Apply filter if provided
    if (filter && Object.keys(filter).length > 0) {
      const filterConditions = Object.entries(filter).map(([key, value]) => {
        args.push(value);
        return `json_extract(${this.metadataColumn}, '$.${key}') = ?`;
      });
      selectSQL += ` WHERE ${filterConditions.join(' AND ')}`;
    }

    const result = await this.client.execute({
      sql: selectSQL,
      args
    });

    // Calculate similarities
    const similarities: [LibSQLVectorStoreDocument, number][] = [];

    for (const row of result.rows) {
      try {
        const embedding = JSON.parse(row[this.embeddingColumn] as string);
        const metadata = row[this.metadataColumn] ? JSON.parse(row[this.metadataColumn] as string) : {};
        
        const similarity = this.cosineSimilarity(query, embedding);
        
        similarities.push([
          {
            id: row[this.idColumn] as string,
            text: row[this.textColumn] as string,
            embedding,
            metadata
          },
          similarity
        ]);
      } catch (error) {
        console.warn(`Error processing vector for document ${row[this.idColumn]}:`, error);
      }
    }

    // Sort by similarity and return top k
    return similarities
      .sort((a, b) => b[1] - a[1])
      .slice(0, k);
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
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
      return 0;
    }

    return dotProduct / denominator;
  }

  /**
   * Delete documents by IDs
   */
  async delete(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const placeholders = ids.map(() => '?').join(',');
    const deleteSQL = `DELETE FROM ${this.tableName} WHERE ${this.idColumn} IN (${placeholders})`;

    await this.client.execute({
      sql: deleteSQL,
      args: ids
    });
  }

  /**
   * Get document by ID
   */
  async getDocument(id: string): Promise<Document | null> {
    const result = await this.client.execute({
      sql: `SELECT ${this.textColumn}, ${this.metadataColumn} FROM ${this.tableName} WHERE ${this.idColumn} = ?`,
      args: [id]
    });

    if (result.rows.length === 0) {
      return null;
    }

    const row = result.rows[0];
    const metadata = row[this.metadataColumn] ? JSON.parse(row[this.metadataColumn] as string) : {};

    return new Document({
      pageContent: row[this.textColumn] as string,
      metadata
    });
  }

  /**
   * Get all documents
   */
  async getAllDocuments(): Promise<Document[]> {
    const result = await this.client.execute({
      sql: `SELECT ${this.textColumn}, ${this.metadataColumn} FROM ${this.tableName}`,
      args: []
    });

    return result.rows.map(row => {
      const metadata = row[this.metadataColumn] ? JSON.parse(row[this.metadataColumn] as string) : {};
      
      return new Document({
        pageContent: row[this.textColumn] as string,
        metadata
      });
    });
  }

  /**
   * Get document count
   */
  async getDocumentCount(): Promise<number> {
    const result = await this.client.execute({
      sql: `SELECT COUNT(*) as count FROM ${this.tableName}`,
      args: []
    });

    return result.rows[0].count as number;
  }

  /**
   * Search documents by text similarity
   */
  async similaritySearch(
    query: string,
    k: number = 4,
    filter?: Record<string, any>
  ): Promise<Document[]> {
    const queryEmbedding = await this.embeddings.embedQuery(query);
    const results = await this.similaritySearchVectorWithScore(queryEmbedding, k, filter);
    
    return results.map(([doc]) => doc);
  }

  /**
   * Search documents by text similarity with scores
   */
  async similaritySearchWithScore(
    query: string,
    k: number = 4,
    filter?: Record<string, any>
  ): Promise<[Document, number][]> {
    const queryEmbedding = await this.embeddings.embedQuery(query);
    return this.similaritySearchVectorWithScore(queryEmbedding, k, filter);
  }

  /**
   * Create a new LibSQLVectorStore instance
   */
  static async fromDocuments(
    documents: Document[],
    embeddings: Embeddings,
    config: LibSQLVectorStoreConfig
  ): Promise<LibSQLVectorStore> {
    const vectorStore = new LibSQLVectorStore(embeddings, config);
    await vectorStore.initialize();
    await vectorStore.addDocuments(documents);
    return vectorStore;
  }

  /**
   * Create a new LibSQLVectorStore instance from existing data
   */
  static async fromExistingIndex(
    embeddings: Embeddings,
    config: LibSQLVectorStoreConfig
  ): Promise<LibSQLVectorStore> {
    const vectorStore = new LibSQLVectorStore(embeddings, config);
    await vectorStore.initialize();
    return vectorStore;
  }
} 