export interface DatabaseConfig {
  url?: string;
  authToken?: string;
}

export interface RSSFeed {
  id: number;
  name: string;
  url: string;
  category: string;
  isActive: boolean;
  lastFetched?: Date;
  createdAt: Date;
}

export interface RSSArticle {
  title: string;
  content: string;
  url: string;
  source: string;
  publishedAt?: Date;
  category?: string;
  tags?: string;
  summary?: string;
  guid?: string;
}

export interface Article {
  id: number;
  title: string;
  content: string;
  url: string;
  source: string;
  publishedAt?: Date;
  category?: string;
  tags?: string;
  summary?: string;
  guid?: string;
  embeddingId?: string;
  companies?: string;
  companySentiment?: string;
  employeeSentiment?: string;
  companyReasoning?: string;
  employeeReasoning?: string;
  keyPoints?: string;
  riskLevel?: string;
  opportunities?: string;
  threats?: string;
  analysisSummary?: string;
  createdAt: Date;
} 