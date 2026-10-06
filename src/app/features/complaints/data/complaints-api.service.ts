import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams, HttpResponse } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { Complaint } from '../complaints.models';
import { Page } from '../../../core/models/common.models';

@Injectable({
  providedIn: 'root'
})
export class ComplaintsApiService {
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

  getComplaintsPage(orgId: string, page: number, size: number): Observable<Page<Complaint>> {
    return this.getPage<Complaint>(`${this.baseUrl}/complaints`, { organizationId: orgId }, page, size);
  }

  confirmComplaint(id: string): Observable<Complaint> {
    return this.http.post<Complaint>(`${this.baseUrl}/complaints/${id}/confirm`, {});
  }
}
