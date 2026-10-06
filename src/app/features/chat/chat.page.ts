import { ChangeDetectionStrategy, Component, DestroyRef, OnDestroy, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationStart, Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { filter, skip } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OrgContextService } from '../../core/org/org-context.service';
import { ChatStore } from './data/chat.store';
import { MessageListComponent } from './ui/message-list.component';
import { ChatInputComponent } from './ui/chat-input.component';
import { ConversationSidebarComponent } from './ui/conversation-sidebar.component';

@Component({
  selector: 'app-chat-page',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MessageListComponent,
    ChatInputComponent,
    ConversationSidebarComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chat-container">
      <header class="chat-header">
        <mat-icon class="header-icon">chat_bubble</mat-icon>
        <div class="header-titles">
          <h2>OLIMA Yordamchisi</h2>
          @if (store.currentOrgName()) {
            <span class="active-org-name">{{ store.currentOrgName() }}</span>
          }
        </div>
        <span class="spacer"></span>

        <button mat-stroked-button
                class="header-btn debug-btn"
                [class.debug-active]="store.debugMode()"
                (click)="store.toggleDebug()"
                [matTooltip]="store.debugTooltip()">
          <mat-icon class="btn-icon">{{ store.debugMode() ? 'bug_report' : 'check_circle' }}</mat-icon>
          <span>Debug: {{ store.debugMode() ? 'YOQ' : 'OʻCH' }}</span>
        </button>

        <button mat-stroked-button
                class="header-btn new-chat-btn"
                (click)="store.newChat()"
                matTooltip="Yangi suhbat boshlash">
          <mat-icon class="btn-icon">add</mat-icon>
          <span>Yangi chat</span>
        </button>

        <app-conversation-sidebar
          [conversations]="store.recentConversations()"
          (select)="store.openConversation($event)"
          (refresh)="store.loadRecent()">
        </app-conversation-sidebar>
      </header>

      <app-message-list
        [messages]="store.messages()"
        [loading]="store.loading()"
        [debugMode]="store.debugMode()"
        [orgName]="store.currentOrgName()"
        (confirm)="store.confirmAction($event)"
        (cancel)="store.cancelConfirmation()">
      </app-message-list>

      <app-chat-input
        [loading]="store.loading()"
        (send)="store.send($event)">
      </app-chat-input>
    </div>
  `,
  styles: [`
    .chat-container {
      display: flex;
      flex-direction: column;
      height: calc(100vh - 64px);
      background: #f8fafc;
    }
    .chat-header {
      display: flex;
      align-items: center;
      padding: 14px 24px;
      background: #1a237e;
      color: white;
      gap: 12px;
      flex-shrink: 0;
    }
    .header-icon {
      font-size: 24px;
      width: 24px;
      height: 24px;
    }
    .header-titles {
      display: flex;
      flex-direction: column;
    }
    .chat-header h2 {
      margin: 0;
      font-size: 1.15rem;
      font-weight: 600;
      line-height: 1.2;
    }
    .active-org-name {
      font-size: 12px;
      color: #90caf9;
      font-weight: 400;
    }
    .spacer { flex: 1; }
    .header-btn {
      color: white !important;
      border-color: rgba(255, 255, 255, 0.35) !important;
      font-size: 12px !important;
      height: 36px !important;
      padding: 0 10px !important;
      display: inline-flex !important;
      align-items: center !important;
      gap: 4px !important;
      border-radius: 8px !important;
      transition: all 0.2s ease;
    }
    .header-btn:hover {
      background: rgba(255, 255, 255, 0.12) !important;
    }
    .debug-btn {
      border-color: rgba(255, 255, 255, 0.4) !important;
    }
    .debug-active {
      background: #ff9800 !important;
      color: #1a237e !important;
      font-weight: 600 !important;
      border-color: #ff9800 !important;
    }
    .new-chat-btn {
      border-color: rgba(255, 255, 255, 0.4) !important;
    }
    .btn-icon {
      font-size: 16px !important;
      height: 16px !important;
      width: 16px !important;
      margin-right: 2px !important;
    }
  `]
})
export class ChatPageComponent implements OnInit, OnDestroy {
  readonly store = inject(ChatStore);
  private readonly orgContext = inject(OrgContextService);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  private isReloading = false;

  private beforeUnloadHandler = () => {
    this.isReloading = true;
  };

  ngOnInit(): void {
    this.store.init();

    window.addEventListener('beforeunload', this.beforeUnloadHandler);

    this.orgContext.orgId$
      .pipe(
        skip(1),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => {
        this.store.newChat();
        this.store.loadCurrentOrg();
      });

    this.router.events
      .pipe(
        filter(event => event instanceof NavigationStart),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe((event: any) => {
        if (!this.isReloading && event.url && !event.url.startsWith('/chat')) {
          this.store.clearSession();
        }
      });
  }

  ngOnDestroy(): void {
    window.removeEventListener('beforeunload', this.beforeUnloadHandler);

    if (!this.isReloading) {
      this.store.clearSession();
    }
  }
}
