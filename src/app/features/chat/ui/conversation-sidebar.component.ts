import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatMenuModule } from '@angular/material/menu';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConvTitlePipe } from '../../../shared/pipes/conv-title.pipe';
import { Conversation } from '../chat.models';

@Component({
  selector: 'app-conversation-sidebar',
  standalone: true,
  imports: [CommonModule, DatePipe, MatMenuModule, MatButtonModule, MatIconModule, MatTooltipModule, ConvTitlePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <button mat-stroked-button
            class="header-btn history-btn"
            [matMenuTriggerFor]="historyMenu"
            (click)="refresh.emit()"
            matTooltip="Oldingi suhbatlar tarixini ko'rish">
      <mat-icon class="btn-icon">history</mat-icon>
      <span>Tarix</span>
    </button>
    <mat-menu #historyMenu="matMenu" class="history-menu">
      <div class="menu-title-header">So'nggi suhbatlar</div>
      @for (c of conversations(); track c.id) {
        <button mat-menu-item (click)="select.emit(c)">
          <mat-icon color="primary">forum</mat-icon>
          <span class="history-item-title">{{ c.title | convTitle:('Suhbat ' + (c.createdAt | date:'shortDate')) }}</span>
        </button>
      }
      @if (conversations().length === 0) {
        <div class="empty-history-item">
          Oldingi suhbatlar mavjud emas.
        </div>
      }
    </mat-menu>
  `,
  styles: [`
    .header-btn {
      color: white !important;
      border-color: rgba(255, 255, 255, 0.4) !important;
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
    .btn-icon {
      font-size: 16px !important;
      height: 16px !important;
      width: 16px !important;
      margin-right: 2px !important;
    }
    .menu-title-header {
      padding: 8px 16px;
      font-size: 12px;
      font-weight: 600;
      color: #718096;
      border-bottom: 1px solid #edf2f7;
    }
    .history-item-title {
      max-width: 220px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .empty-history-item {
      padding: 12px 16px;
      font-size: 13px;
      color: #a0aec0;
      font-style: italic;
    }
  `]
})
export class ConversationSidebarComponent {
  readonly conversations = input<Conversation[]>([]);
  readonly select = output<Conversation>();
  readonly refresh = output<void>();
}
