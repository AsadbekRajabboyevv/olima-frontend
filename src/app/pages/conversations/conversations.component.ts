import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  DestroyRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmptyStateComponent } from '../../components/empty-state.component';
import { ChatApiService } from '../../features/chat/data/chat-api.service';
import { OrgContextService } from '../../core/org/org-context.service';
import { Conversation } from '../../models';

@Component({
  selector: 'app-conversations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, CommonModule, MatTableModule, MatButtonModule, MatIconModule, MatPaginatorModule],
  template: `
    <div class="page-container">
      <h2>Suhbatlar tarixi</h2>
      <ng-container *ngIf="conversations.length > 0">
        <table mat-table [dataSource]="conversations" class="mat-elevation-z8">
          <ng-container matColumnDef="title">
            <th mat-header-cell *matHeaderCellDef> Mavzu </th>
            <td mat-cell *matCellDef="let conv"> {{ title(conv.title) }} </td>
          </ng-container>

          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef> Sana </th>
            <td mat-cell *matCellDef="let conv"> {{conv.createdAt | date:'short'}} </td>
          </ng-container>

          <ng-container matColumnDef="lastMessage">
            <th mat-header-cell *matHeaderCellDef> Oxirgi faollik </th>
            <td mat-cell *matCellDef="let conv"> {{ conv.lastMessageAt ? (conv.lastMessageAt | date:'short') : '—' }} </td>
          </ng-container>

          <ng-container matColumnDef="messages">
            <th mat-header-cell *matHeaderCellDef> Xabarlar soni </th>
            <td mat-cell *matCellDef="let conv"> {{conv.messageCount ?? conv.messages?.length ?? 0}} </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef> Amallar </th>
            <td mat-cell *matCellDef="let conv">
              <button mat-icon-button color="primary" (click)="viewConversation(conv.id)" title="Ko'rish">
                <mat-icon>visibility</mat-icon>
              </button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <mat-paginator [length]="total" [pageIndex]="pageIndex" [pageSize]="pageSize"
                       [pageSizeOptions]="pageSizeOptions" (page)="onPage($event)"
                       showFirstLastButtons></mat-paginator>
      </ng-container>

      <app-empty-state *ngIf="loaded && total === 0" icon="forum"
        title="Hali suhbat yo'q"
        text="Saytingizdagi widget orqali birinchi savol berilishi bilan suhbat shu yerda paydo bo'ladi — savol, javob va manbalari bilan.">
        <button mat-flat-button color="primary" (click)="router.navigate(['/chat'])">
          <mat-icon>chat</mat-icon> Chatni sinab ko'rish
        </button>
      </app-empty-state>
    </div>
  `,
  styles: [`.page-container { padding: 24px; } table { width: 100%; }`]
})
export class ConversationsComponent implements OnInit {
  private readonly chatApi = inject(ChatApiService);
  readonly router = inject(Router);
  private readonly orgContext = inject(OrgContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly pageSizeOptions = [25, 50, 100];
  conversations: Conversation[] = [];
  displayedColumns = ['title', 'date', 'lastMessage', 'messages', 'actions'];
  loaded = false;
  total = 0;
  pageIndex = 0;
  pageSize = 25;
  private orgId = '';

  ngOnInit() {
    this.orgContext.orgId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => {
        this.orgId = id || '';
        this.pageIndex = 0;
        if (!this.orgId) {
          this.loaded = true;
          this.cdr.markForCheck();
          return;
        }
        this.load();
      });
  }

  onPage(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.load();
  }

  private load() {
    this.chatApi.getConversationsPage(this.orgId, this.pageIndex, this.pageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => {
          this.conversations = page.items;
          this.total = page.total;
          this.loaded = true;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loaded = true;
          this.cdr.markForCheck();
        }
      });
  }

  title(t?: string | null): string {
    const v = t?.trim();
    if (!v) return 'Yangi suhbat';
    return v.startsWith('Chat with ') ? 'Suhbat: ' + v.slice('Chat with '.length) : v;
  }

  viewConversation(id: string) {
    this.router.navigate(['/conversations', id]);
  }
}
