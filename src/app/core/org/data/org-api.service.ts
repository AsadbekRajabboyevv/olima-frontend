import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { AssistantSettings, Organization, OrganizationUsage } from '../org.models';
import { Page } from '../../models/common.models';

@Injectable({
  providedIn: 'root'
})
export class OrgApiService {
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

  private countOf(url: string, params: Record<string, string>): Observable<number> {
    return this.getPage<unknown>(url, params, 0, 1).pipe(map(p => p.total));
  }

  getOrganizations(): Observable<Organization[]> {
    return this.http.get<Organization[]>(`${this.baseUrl}/organizations`);
  }

  getOrganization(id: string): Observable<Organization> {
    return this.http.get<Organization>(`${this.baseUrl}/organizations/${id}`);
  }

  createOrganization(data: Partial<Organization>): Observable<Organization> {
    return this.http.post<Organization>(`${this.baseUrl}/organizations`, data);
  }

  updateOrganization(id: string, data: Partial<Organization>): Observable<Organization> {
    return this.http.put<Organization>(`${this.baseUrl}/organizations/${id}`, data);
  }

  deleteOrganization(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/organizations/${id}`);
  }

  rotateWidgetKey(id: string): Observable<Organization> {
    return this.http.post<Organization>(`${this.baseUrl}/organizations/${id}/widget-key/rotate`, {});
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

  getOrganizationUsage(id: string): Observable<OrganizationUsage> {
    return this.http.get<OrganizationUsage>(`${this.baseUrl}/organizations/${id}/usage`);
  }

  countComplaints(orgId: string): Observable<number> {
    return this.countOf(`${this.baseUrl}/complaints`, { organizationId: orgId });
  }

  countKnowledgeBases(orgId: string): Observable<number> {
    return this.countOf(`${this.baseUrl}/knowledge/bases`, { organizationId: orgId });
  }
}
