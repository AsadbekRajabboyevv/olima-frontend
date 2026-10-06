import { Injectable, NgZone } from '@angular/core';
import { Observable } from 'rxjs';
import { AuthService } from '../../../services/auth.service';
import { ChatRequest, ChatStreamEvent } from '../chat.models';

@Injectable({
  providedIn: 'root'
})
export class ChatStreamService {
  private readonly baseUrl = '/api/v1';

  constructor(
    private auth: AuthService,
    private ngZone: NgZone
  ) {}

  stream(data: ChatRequest): Observable<ChatStreamEvent> {
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
            } catch {
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
}
