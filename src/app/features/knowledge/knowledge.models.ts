export interface KnowledgeBase {
  id: string;
  organizationId: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface KnowledgeDocument {
  id: string;
  knowledgeBaseId: string;
  title: string;
  content?: string;
  sourceUrl?: string;
  fileName?: string;
  fileType?: string;
  fileSize?: number;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
  createdAt: string;
  chunkCount: number;
  embeddedChunkCount: number;
}

export interface EmbeddingStatus {
  organizationId: string | null;
  embeddingEnabled: boolean;
  model: string;
  totalChunks: number;
  embeddedChunks: number;
  pendingChunks: number;
}

export interface EmbeddingBackfillResult {
  processed: number;
  failed: number;
  remaining: number;
  embeddingEnabled: boolean;
}
