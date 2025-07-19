export interface VectorStoreConfig {
  embeddingModel?: string;
  dimension?: number;
  similarityThreshold?: number;
}

export interface SearchResult {
  document: {
    pageContent: string;
    metadata: Record<string, any>;
  };
  score: number;
}

export interface VectorStoreStats {
  totalDocuments: number;
  recentDocuments: number;
  averageDocumentsPerDay: number;
} 