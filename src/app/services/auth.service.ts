import { Injectable } from '@angular/core';
import { Router } from '@angular/router';
import { Observable, finalize, firstValueFrom, map, shareReplay, tap } from 'rxjs';
import { ApiService } from './api.service';
import { LoginRequest, LoginResponse } from '../models';
import { OrgContextService } from '../core/org/org-context.service';

export const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

const REFRESH_SKEW_MS = 30_000;

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUser: LoginResponse | null = null;

  private refreshInFlight: Observable<string> | null = null;

  constructor(
    private apiService: ApiService,
    private router: Router,
    private orgContext: OrgContextService
  ) {
    const stored = localStorage.getItem(USER_KEY);
    if (stored) {
      try {
        this.currentUser = JSON.parse(stored);
      } catch {
        this.currentUser = null;
      }
    }
  }

  login(credentials: LoginRequest): Observable<LoginResponse> {
    return this.apiService.login(credentials).pipe(
      tap(response => this.setSession(response))
    );
  }

  refreshToken(): Observable<string> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.apiService.refresh().pipe(
        tap(response => this.setSession(response, false)),
        map(response => response.token),
        finalize(() => (this.refreshInFlight = null)),
        shareReplay(1)
      );
    }
    return this.refreshInFlight;
  }

  async ensureFreshToken(): Promise<string | null> {
    const token = this.getToken();
    if (!token) {
      return null;
    }
    if (!this.tokenExpiresSoon()) {
      return token;
    }
    try {
      return await firstValueFrom(this.refreshToken());
    } catch {
      this.logout();
      return null;
    }
  }

  logout(): void {

    firstValueFrom(this.apiService.logout()).catch(() => undefined);
    this.clearSession();

    this.router.navigateByUrl('/login', { replaceUrl: true })
      .then(ok => { if (!ok && !location.pathname.startsWith('/login')) location.assign('/login'); })
      .catch(() => location.assign('/login'));
  }

  clearSession(): void {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.orgContext.clear();
    this.currentUser = null;
  }

  private setSession(response: LoginResponse, announceOrg = true): void {
    localStorage.setItem(TOKEN_KEY, response.token);
    localStorage.setItem(USER_KEY, JSON.stringify(response));
    this.currentUser = response;

    if (announceOrg && response.organizationId) {
      this.orgContext.select(response.organizationId);
    }
  }

  private tokenExpiresSoon(): boolean {
    const expiresAt = this.currentUser?.tokenExpiresAt;
    if (!expiresAt) {
      return false;
    }
    return new Date(expiresAt).getTime() - Date.now() < REFRESH_SKEW_MS;
  }

  getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY);
  }

  getCurrentUser(): LoginResponse | null {
    return this.currentUser;
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !!this.currentUser;
  }

  isSuperAdmin(): boolean {
    return this.currentUser?.role === 'SUPER_ADMIN';
  }
}

