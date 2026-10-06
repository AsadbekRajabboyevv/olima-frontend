import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  effect,
  input,
  output
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DisplayMessage } from '../chat.models';
import { MessageBubbleComponent } from './message-bubble.component';

@Component({
  selector: 'app-message-list',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatProgressSpinnerModule, MessageBubbleComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chat-messages" #scrollContainer (scroll)="onScroll()">
      @if (messages().length === 0) {
        <div class="welcome-message">
          <mat-icon class="large-icon">smart_toy</mat-icon>
          <h3>Bugun sizga qanday yordam bera olaman?</h3>
          <p>Men sizga oliy ta'limga oid ma'lumotlarni topish, qonunchilik normalarini ko'rish va arizalar yuborishda yordam beraman.</p>
        </div>
      }

      @for (msg of messages(); track $index) {
        <app-message-bubble
          [msg]="msg"
          [debugMode]="debugMode()"
          [orgName]="orgName()"
          (confirm)="confirm.emit($event)"
          (cancel)="cancel.emit()">
        </app-message-bubble>
      }

      @if (loading()) {
        <div class="loading-indicator">
          <mat-spinner diameter="30"></mat-spinner>
          <span>OLIMA o'ylamoqda...</span>
        </div>
      }
    </div>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      min-height: 0;
      overflow: hidden;
    }
    .chat-messages {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
      gap: 20px;
      background: #f8f9fa;
    }
    .welcome-message {
      text-align: center;
      color: #666;
      margin: auto;
      max-width: 480px;
    }
    .welcome-message h3 {
      font-size: 1.25rem;
      color: #1a237e;
      margin: 12px 0 8px;
    }
    .welcome-message p {
      font-size: 14px;
      line-height: 1.6;
      color: #64748b;
    }
    .large-icon {
      font-size: 64px;
      height: 64px;
      width: 64px;
      color: #1a237e;
      margin-bottom: 8px;
    }
    .loading-indicator {
      display: flex;
      align-items: center;
      gap: 12px;
      color: #666;
      padding: 12px;
      align-self: flex-start;
      font-size: 14px;
    }
  `]
})
export class MessageListComponent {
  @ViewChild('scrollContainer') private scrollContainer?: ElementRef<HTMLDivElement>;

  readonly messages = input<DisplayMessage[]>([]);
  readonly loading = input<boolean>(false);
  readonly debugMode = input<boolean>(false);
  readonly orgName = input<string>('');

  readonly confirm = output<string | undefined>();
  readonly cancel = output<void>();

  private userScrolledUp = false;

  constructor() {
    effect(() => {
      this.messages();
      this.loading();
      if (!this.userScrolledUp) {
        setTimeout(() => this.scrollToBottom(), 0);
      }
    });
  }

  onScroll(): void {
    if (!this.scrollContainer) return;
    const el = this.scrollContainer.nativeElement;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
    this.userScrolledUp = !atBottom;
  }

  scrollToBottom(): void {
    if (!this.scrollContainer) return;
    try {
      const el = this.scrollContainer.nativeElement;
      el.scrollTop = el.scrollHeight;
    } catch { }
  }
}
