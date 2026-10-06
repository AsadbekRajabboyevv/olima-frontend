import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  EmbeddingBackfillResult,
  EmbeddingStatus,
  KnowledgeBase,
  KnowledgeDocument
} from '../knowledge.models';

@Injectable({
  providedIn: 'root'
})
export class KnowledgeApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1';

  getKnowledgeBases(orgId: string): Observable<KnowledgeBase[]> {
    return this.http.get<KnowledgeBase[]>(`${this.baseUrl}/knowledge/bases?organizationId=${orgId}`);
  }

  getKnowledgeBase(id: string): Observable<KnowledgeBase> {
    return this.http.get<KnowledgeBase>(`${this.baseUrl}/knowledge/bases/${id}`);
  }

  createKnowledgeBase(data: { organizationId: string; name: string; description: string }): Observable<KnowledgeBase> {
    return this.http.post<KnowledgeBase>(`${this.baseUrl}/knowledge/bases`, data);
  }

  updateKnowledgeBase(id: string, data: { name: string; description?: string | null }): Observable<KnowledgeBase> {
    return this.http.put<KnowledgeBase>(`${this.baseUrl}/knowledge/bases/${id}`, data);
  }

  deleteKnowledgeBase(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/knowledge/bases/${id}`);
  }

  getDocuments(knowledgeBaseId: string): Observable<KnowledgeDocument[]> {
    return this.http.get<KnowledgeDocument[]>(`${this.baseUrl}/knowledge/bases/${knowledgeBaseId}/documents`);
  }

  uploadDocument(knowledgeBaseId: string, file: File, title?: string): Observable<KnowledgeDocument> {
    const formData = new FormData();
    formData.append('file', file);
    if (title) {
      formData.append('title', title);
    }
    return this.http.post<KnowledgeDocument>(`${this.baseUrl}/knowledge/bases/${knowledgeBaseId}/documents/upload`, formData);
  }

  uploadDocumentFromUrl(knowledgeBaseId: string, url: string, title?: string): Observable<KnowledgeDocument> {
    return this.http.post<KnowledgeDocument>(`${this.baseUrl}/knowledge/bases/${knowledgeBaseId}/documents/url`, { url, title });
  }

  createTextDocument(knowledgeBaseId: string, title: string, content: string): Observable<KnowledgeDocument> {
    return this.http.post<KnowledgeDocument>(`${this.baseUrl}/knowledge/bases/${knowledgeBaseId}/documents`, { title, content });
  }

  deleteDocument(documentId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/knowledge/documents/${documentId}`);
  }

  reindexDocument(documentId: string): Observable<KnowledgeDocument> {
    return this.http.post<KnowledgeDocument>(`${this.baseUrl}/knowledge/documents/${documentId}/reindex`, {});
  }

  getEmbeddingStatus(orgId?: string): Observable<EmbeddingStatus> {
    const query = orgId ? `?organizationId=${orgId}` : '';
    return this.http.get<EmbeddingStatus>(`${this.baseUrl}/knowledge/embeddings/status${query}`);
  }

  backfillEmbeddings(orgId?: string, limit = 100): Observable<EmbeddingBackfillResult> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (orgId) {
      params.set('organizationId', orgId);
    }
    return this.http.post<EmbeddingBackfillResult>(`${this.baseUrl}/knowledge/chunks/backfill-embeddings?${params}`, {});
  }
}
