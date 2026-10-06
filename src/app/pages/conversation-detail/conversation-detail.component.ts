import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  DestroyRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ChatApiService } from '../../features/chat/data/chat-api.service';
import { Conversation } from '../../models';
import { MarkdownPipe } from '../../shared/pipes/markdown.pipe';

@Component({
  selector: 'app-conversation-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatCardModule, MatIconModule, MarkdownPipe],
  template: `
    @if (conversation) {
      <div class="page-container">
        <h2>{{ heading }}</h2>
        <div class="messages-container">
          @for (msg of conversation.messages; track msg.id || $index) {
            <div class="message-wrapper" [ngClass]="msg.role.toLowerCase()">
              <div class="message-bubble">
                <div class="role-badge">{{ msg.role === 'USER' ? 'Foydalanuvchi' : (msg.role === 'ASSISTANT' ? 'OLIMA Yordamchisi' : msg.role) }}</div>
                @if (msg.role !== 'ASSISTANT') {
                  <div class="content">{{ msg.content }}</div>
                }
                @if (msg.role === 'ASSISTANT') {
                  <div class="content md" [innerHTML]="msg.content | markdown"></div>
                }
                <div class="time">{{ msg.createdAt | date:'shortTime' }}</div>
              </div>
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 800px; margin: 0 auto; }
    .messages-container { display: flex; flex-direction: column; gap: 16px; }
    .message-wrapper { display: flex; }
    .message-wrapper.user { justify-content: flex-end; }
    .message-wrapper.assistant { justify-content: flex-start; }
    .message-bubble { max-width: 80%; padding: 16px; border-radius: 8px; position: relative; }
    .user .message-bubble { background: #e3f2fd; border-bottom-right-radius: 0; }
    .assistant .message-bubble { background: #f5f5f5; border-bottom-left-radius: 0; }
    .role-badge { font-size: 10px; color: #666; margin-bottom: 4px; font-weight: bold; }
    .time { font-size: 10px; color: #999; text-align: right; margin-top: 8px; }
    .content { white-space: pre-wrap; }
    .content.md { white-space: normal; line-height: 1.55; }
    :host ::ng-deep .md :first-child { margin-top: 0; }
    :host ::ng-deep .md :last-child { margin-bottom: 0; }
    :host ::ng-deep .md h1, :host ::ng-deep .md h2, :host ::ng-deep .md h3, :host ::ng-deep .md h4 { font-size: 15px; margin: 12px 0 6px; }
    :host ::ng-deep .md p { margin: 0 0 8px; }
    :host ::ng-deep .md ul, :host ::ng-deep .md ol { margin: 0 0 8px; padding-left: 20px; }
    :host ::ng-deep .md li { margin: 2px 0; }
    :host ::ng-deep .md a { color: var(--brand, #6366f1); word-break: break-word; }
    :host ::ng-deep .md code { background: rgba(0,0,0,.06); padding: 1px 5px; border-radius: 4px; font-size: 13px; }
    :host ::ng-deep .md table { border-collapse: collapse; margin: 8px 0; font-size: 13px; display: block; overflow-x: auto; }
    :host ::ng-deep .md th, :host ::ng-deep .md td { border: 1px solid #e2e8f0; padding: 6px 10px; text-align: left; }
    :host ::ng-deep .md th { background: #f8fafc; }
  `]
})
export class ConversationDetailComponent implements OnInit {
  private readonly chatApi = inject(ChatApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  conversation: Conversation | null = null;

  get heading(): string {
    const t = this.conversation?.title?.trim();
    if (!t) return 'Suhbat tafsilotlari';
    return t.startsWith('Chat with ') ? 'Suhbat: ' + t.slice('Chat with '.length) : t;
  }

  ngOnInit() {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      this.chatApi.getConversation(id)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe(data => {
          this.conversation = data;
          this.cdr.markForCheck();
        });
    }
  }
}
