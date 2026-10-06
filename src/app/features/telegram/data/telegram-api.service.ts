import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TelegramBotConfig } from '../telegram.models';

@Injectable({
  providedIn: 'root'
})
export class TelegramApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/v1';

  getTelegramConfig(organizationId: string): Observable<TelegramBotConfig> {
    return this.http.get<TelegramBotConfig>(`${this.baseUrl}/telegram/config?organizationId=${organizationId}`);
  }

  saveTelegramConfig(organizationId: string, botToken: string, notificationChatId?: number | null): Observable<TelegramBotConfig> {
    return this.http.post<TelegramBotConfig>(
      `${this.baseUrl}/telegram/config?organizationId=${organizationId}`,
      { botToken, notificationChatId: notificationChatId ?? null }
    );
  }

  deleteTelegramConfig(organizationId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/telegram/config?organizationId=${organizationId}`);
  }
}
