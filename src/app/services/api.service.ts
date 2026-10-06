import { Injectable, Injector, NgZone } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AuthService } from './auth.service';
import {
  Organization,
  AssistantSettings,
  Tool,
  ChatRequest,
  ChatResponse,
  ChatStreamEvent,
  Conversation,
  Execution,
  Complaint,
  KnowledgeBase,
  KnowledgeDocument,
  EmbeddingStatus,
  EmbeddingBackfillResult,
  LoginRequest,
  LoginResponse,
  AppUser,
  CreateUserRequest,
  TelegramBotConfig,
  OrganizationUsage,
  ToolType,
  IntegrationConnection,
  ConnectionRequest,
  ConnectionTestResult,
  Page,
  TokenRate,
  TokenRateRequest,
  BillingRates,
  Invoice,
  OrganizationBillingRow
} from '../models';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl = '/api/v1';

  constructor(private http: HttpClient, private ngZone: NgZone, private injector: Injector) {}

  private get auth(): AuthService {
    return this.injector.get(AuthService);
  }

  private getPage<T>(url: string, params: Record<string, string>, page: number, size: number): Observable<Page<T>> {
    const httpParams = new HttpParams({ fromObject: { ...params, page: String(page), size: String(size) } });
    return this.http.get<T[]>(url, { params: httpParams, observe: 'response' }).pipe(
      map((res: HttpResponse<T[]>) => {
        const items = res.body ?? [];
        const total = Number(res.headers.get('X-Total-Count'));
        return { items, total: Number.isFinite(total) && res.headers.has('X-Total-Count') ? total : items.length, page, size };
      })
    );
  }

  private countOf(url: string, params: Record<string, string>): Observable<number> {
    return this.getPage<unknown>(url, params, 0, 1).pipe(map(p => p.total));
  }

  getConversationsPage(orgId: string, page: number, size: number): Observable<Page<Conversation>> {
    return this.getPage<Conversation>(`${this.baseUrl}/conversations`, { organizationId: orgId }, page, size);
  }

  getComplaintsPage(orgId: string, page: number, size: number): Observable<Page<Complaint>> {
    return this.getPage<Complaint>(`${this.baseUrl}/complaints`, { organizationId: orgId }, page, size);
  }

  getExecutionsPage(orgId: string, page: number, size: number): Observable<Page<Execution>> {
    return this.getPage<Execution>(`${this.baseUrl}/executions`, { organizationId: orgId }, page, size);
  }

  countComplaints(orgId: string): Observable<number> {
    return this.countOf(`${this.baseUrl}/complaints`, { organizationId: orgId });
  }

  countKnowledgeBases(orgId: string): Observable<number> {
    return this.countOf(`${this.baseUrl}/knowledge/bases`, { organizationId: orgId });
  }

  getOrganizations(): Observable<Organization[]> {
    return this.http.get<Organization[]>(`${this.baseUrl}/organizations`);
  }

  getOrganization(id: string): Observable<Organization> {
    return this.http.get<Organization>(`${this.baseUrl}/organizations/${id}`);
  }

  createOrganization(data: any): Observable<Organization> {
    return this.http.post<Organization>(`${this.baseUrl}/organizations`, data);
  }

  updateOrganization(id: string, data: any): Observable<Organization> {
    return this.http.put<Organization>(`${this.baseUrl}/organizations/${id}`, data);
  }

  updateWidgetSettings(id: string, data: { greeting: string | null; greetingEnabled: boolean }): Observable<Organization> {
    return this.http.put<Organization>(`${this.baseUrl}/organizations/${id}/widget`, data);
  }

  getAssistantSettings(orgId: string): Observable<AssistantSettings> {
    return this.http.get<AssistantSettings>(`${this.baseUrl}/organizations/${orgId}/assistant`);
  }

  updateAssistantSettings(orgId: string, data: { webSearchEnabled: boolean }): Observable<AssistantSettings> {
    return this.http.put<AssistantSettings>(`${this.baseUrl}/organizations/${orgId}/assistant`, data);
  }

  rotateWidgetKey(id: string): Observable<Organization> {
    return this.http.post<Organization>(`${this.baseUrl}/organizations/${id}/widget-key/rotate`, {});
  }

  getOrganizationUsage(id: string): Observable<OrganizationUsage> {
    return this.http.get<OrganizationUsage>(`${this.baseUrl}/organizations/${id}/usage`);
  }

  deleteOrganization(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/organizations/${id}`);
  }

  getConnections(orgId: string): Observable<IntegrationConnection[]> {
    return this.http.get<IntegrationConnection[]>(`${this.baseUrl}/organizations/${orgId}/connections`);
  }

  createConnection(orgId: string, data: ConnectionRequest): Observable<IntegrationConnection> {
    return this.http.post<IntegrationConnection>(`${this.baseUrl}/organizations/${orgId}/connections`, data);
  }

  updateConnection(id: string, data: ConnectionRequest): Observable<IntegrationConnection> {
    return this.http.put<IntegrationConnection>(`${this.baseUrl}/connections/${id}`, data);
  }

  deleteConnection(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/connections/${id}`);
  }

  testConnection(id: string): Observable<ConnectionTestResult> {
    return this.http.post<ConnectionTestResult>(`${this.baseUrl}/connections/${id}/test`, {});
  }

  getToolTypes(): Observable<ToolType[]> {
    return this.http.get<ToolType[]>(`${this.baseUrl}/tools/types`);
  }

  getTools(orgId: string): Observable<Tool[]> {
    return this.http.get<Tool[]>(`${this.baseUrl}/tools?organizationId=${orgId}`);
  }

  getTool(id: string): Observable<Tool> {
    return this.http.get<Tool>(`${this.baseUrl}/tools/${id}`);
  }

  createTool(orgId: string, data: any): Observable<Tool> {
    return this.http.post<Tool>(`${this.baseUrl}/tools?organizationId=${orgId}`, data);
  }

  updateTool(id: string, data: any): Observable<Tool> {
    return this.http.put<Tool>(`${this.baseUrl}/tools/${id}`, data);
  }

  deleteTool(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tools/${id}`);
  }

  toggleTool(id: string, enabled: boolean): Observable<Tool> {
    return this.http.patch<Tool>(`${this.baseUrl}/tools/${id}/toggle?enabled=${enabled}`, { enabled });
  }

  chat(data: ChatRequest): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.baseUrl}/chat`, data);
  }

  chatStream(data: ChatRequest): Observable<ChatStreamEvent> {
    return new Observable<ChatStreamEvent>(observer => {
      const controller = new AbortController();
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream, application/json, */*'
      };

      this.auth.ensureFreshToken()
      .then(token => {
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        return fetch(`${this.baseUrl}/chat/stream`, {
          method: 'POST',
          headers,
          body: JSON.stringify(data),
          signal: controller.signal
        });
      })
      .then(async response => {
        if (!response.ok) {
          const errText = await response.text();
          let message = `HTTP ${response.status}`;
          try {
            const errJson = JSON.parse(errText);
            message = errJson.message || message;
          } catch (e) {
            if (errText) message = errText;
          }
          if (response.status === 401) {
            this.auth.logout();
          }

          const error: Error & { status?: number } = new Error(message);
          error.status = response.status;
          throw error;
        }
        if (!response.body) {
          throw new Error('ReadableStream not supported.');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data:')) {
              const dataStr = trimmed.substring(5).trim();
              if (dataStr) {
                try {
                  const event: ChatStreamEvent = JSON.parse(dataStr);
                  this.ngZone.run(() => observer.next(event));
                } catch (e) {
                  console.error('Failed to parse SSE JSON data:', dataStr, e);
                }
              }
            }
          }
        }

        this.ngZone.run(() => observer.complete());
      })
      .catch(err => {
        if (err.name !== 'AbortError') {
          this.ngZone.run(() => observer.error(err));
        }
      });

      return () => {
        controller.abort();
      };
    });
  }

  confirmAction(conversationId: string, complaintId: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.baseUrl}/chat/confirm`, { conversationId, complaintId });
  }

  getConversations(orgId: string): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.baseUrl}/conversations?organizationId=${orgId}`);
  }

  getConversation(id: string): Observable<Conversation> {
    return this.http.get<Conversation>(`${this.baseUrl}/conversations/${id}`);
  }

  confirmComplaint(id: string): Observable<Complaint> {
    return this.http.post<Complaint>(`${this.baseUrl}/complaints/${id}/confirm`, {});
  }

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

  backfillEmbeddings(orgId: string | undefined, limit = 100): Observable<EmbeddingBackfillResult> {
    const params = new URLSearchParams({ limit: String(limit) });
    if (orgId) {
      params.set('organizationId', orgId);
    }
    return this.http.post<EmbeddingBackfillResult>(`${this.baseUrl}/knowledge/chunks/backfill-embeddings?${params}`, {});
  }

  login(data: LoginRequest): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, data, { withCredentials: true });
  }

  refresh(): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/refresh`, {}, { withCredentials: true });
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/logout`, {}, { withCredentials: true });
  }

  logoutEverywhere(): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/logout-all`, {}, { withCredentials: true });
  }

  me(): Observable<LoginResponse> {
    return this.http.get<LoginResponse>(`${this.baseUrl}/auth/me`);
  }

  getUsers(): Observable<AppUser[]> {
    return this.http.get<AppUser[]>(`${this.baseUrl}/users`);
  }

  createUser(data: CreateUserRequest): Observable<AppUser> {
    return this.http.post<AppUser>(`${this.baseUrl}/users`, data);
  }

  resetUserPassword(id: string, password: string): Observable<AppUser> {
    return this.http.put<AppUser>(`${this.baseUrl}/users/${id}/password`, { password });
  }

  setUserEnabled(id: string, enabled: boolean): Observable<AppUser> {
    return this.http.patch<AppUser>(`${this.baseUrl}/users/${id}/enabled?enabled=${enabled}`, {});
  }

  deleteUser(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/users/${id}`);
  }

  getTelegramConfig(organizationId: string): Observable<TelegramBotConfig | null> {
    return this.http.get<TelegramBotConfig>(`${this.baseUrl}/telegram/config?organizationId=${organizationId}`);
  }

  saveTelegramConfig(organizationId: string, botToken: string, notificationChatId?: number | null): Observable<TelegramBotConfig> {
    return this.http.post<TelegramBotConfig>(`${this.baseUrl}/telegram/config?organizationId=${organizationId}`,
      { botToken, notificationChatId: notificationChatId ?? null });
  }

  deleteTelegramConfig(organizationId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/telegram/config?organizationId=${organizationId}`);
  }

  getInvoice(organizationId: string, month?: string): Observable<Invoice> {
    const query = month ? `?month=${month}` : '';
    return this.http.get<Invoice>(`${this.baseUrl}/organizations/${organizationId}/billing${query}`);
  }

  getBillingSummary(month?: string): Observable<OrganizationBillingRow[]> {
    const query = month ? `?month=${month}` : '';
    return this.http.get<OrganizationBillingRow[]>(`${this.baseUrl}/super-admin/billing/summary${query}`);
  }

  getTokenRates(): Observable<BillingRates> {
    return this.http.get<BillingRates>(`${this.baseUrl}/super-admin/billing/rates`);
  }

  updateDefaultRate(request: TokenRateRequest): Observable<TokenRate> {
    return this.http.put<TokenRate>(`${this.baseUrl}/super-admin/billing/rates/default`, request);
  }

  setOrganizationRate(organizationId: string, request: TokenRateRequest): Observable<TokenRate> {
    return this.http.put<TokenRate>(`${this.baseUrl}/super-admin/billing/rates/organizations/${organizationId}`, request);
  }

  removeOrganizationRate(organizationId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/super-admin/billing/rates/organizations/${organizationId}`);
  }
}

