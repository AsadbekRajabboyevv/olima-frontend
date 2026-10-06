import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { ChatResponse, Conversation } from '../chat.models';
import { Organization } from '../../../models';
import { Page } from '../../../core/models/common.models';

@Injectable({
  providedIn: 'root'
})
export class ChatApiService {
  private readonly baseUrl = '/api/v1';

  constructor(private http: HttpClient) {}

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

  getConversations(orgId: string): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.baseUrl}/conversations?organizationId=${orgId}`);
  }

  getConversationsPage(orgId: string, page: number, size: number): Observable<Page<Conversation>> {
    return this.getPage<Conversation>(`${this.baseUrl}/conversations`, { organizationId: orgId }, page, size);
  }

  getConversation(id: string): Observable<Conversation> {
    return this.http.get<Conversation>(`${this.baseUrl}/conversations/${id}`);
  }

  confirmAction(conversationId: string, complaintId: string): Observable<ChatResponse> {
    return this.http.post<ChatResponse>(`${this.baseUrl}/chat/confirm`, { conversationId, complaintId });
  }

  getOrganization(orgId: string): Observable<Organization> {
    return this.http.get<Organization>(`${this.baseUrl}/organizations/${orgId}`);
  }
}
