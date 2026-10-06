import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import {
  BillingRates,
  Invoice,
  OrganizationBillingRow,
  TokenRate,
  TokenRateRequest
} from '../billing.models';

@Injectable({
  providedIn: 'root'
})
export class BillingApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1';

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
