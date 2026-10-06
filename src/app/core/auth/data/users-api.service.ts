import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppUser, CreateUserRequest } from '../auth.models';

@Injectable({
  providedIn: 'root'
})
export class UsersApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1';

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
}
