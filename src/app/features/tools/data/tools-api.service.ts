import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import {
  ConnectionRequest,
  ConnectionTestResult,
  Execution,
  IntegrationConnection,
  Tool,
  ToolType
} from '../tools.models';
import { Page } from '../../../core/models/common.models';

@Injectable({
  providedIn: 'root'
})
export class ToolsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1';

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

  getToolTypes(): Observable<ToolType[]> {
    return this.http.get<ToolType[]>(`${this.baseUrl}/tools/types`);
  }

  getTools(orgId: string): Observable<Tool[]> {
    return this.http.get<Tool[]>(`${this.baseUrl}/tools?organizationId=${orgId}`);
  }

  getTool(id: string): Observable<Tool> {
    return this.http.get<Tool>(`${this.baseUrl}/tools/${id}`);
  }

  createTool(orgId: string, data: Partial<Tool>): Observable<Tool> {
    return this.http.post<Tool>(`${this.baseUrl}/tools?organizationId=${orgId}`, data);
  }

  updateTool(id: string, data: Partial<Tool>): Observable<Tool> {
    return this.http.put<Tool>(`${this.baseUrl}/tools/${id}`, data);
  }

  deleteTool(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tools/${id}`);
  }

  toggleTool(id: string, enabled: boolean): Observable<Tool> {
    return this.http.patch<Tool>(`${this.baseUrl}/tools/${id}/toggle?enabled=${enabled}`, { enabled });
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

  getExecutionsPage(orgId: string, page: number, size: number): Observable<Page<Execution>> {
    return this.getPage<Execution>(`${this.baseUrl}/executions`, { organizationId: orgId }, page, size);
  }
}
