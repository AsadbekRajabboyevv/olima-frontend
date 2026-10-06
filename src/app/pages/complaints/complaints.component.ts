import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmptyStateComponent } from '../../components/empty-state.component';
import { ComplaintsApiService } from '../../features/complaints/data/complaints-api.service';
import { OrgContextService } from '../../core/org/org-context.service';
import { Complaint } from '../../models';

@Component({
  selector: 'app-complaints',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, CommonModule, MatTableModule, MatButtonModule, MatTooltipModule, MatPaginatorModule],
  template: `
    <div class="page-container">
      <h2>Murojaatlar va arizalar</h2>
      <p class="hint">
        Tasdiqlangan murojaat Telegram bot sahifasida ko'rsatilgan xodimlar chatiga yuboriladi va
        "Yuborilgan" holatiga o'tadi. Chat sozlanmagan bo'lsa, u "Tasdiqlangan" holatida shu yerda kutadi.
      </p>
      <ng-container *ngIf="complaints.length > 0">
        <table mat-table [dataSource]="complaints" class="mat-elevation-z8">
          <ng-container matColumnDef="subject">
            <th mat-header-cell *matHeaderCellDef> Mavzu </th>
            <td mat-cell *matCellDef="let comp">
              <div class="subject" [matTooltip]="comp.description || ''">{{comp.subject}}</div>
            </td>
          </ng-container>

          <ng-container matColumnDef="category">
            <th mat-header-cell *matHeaderCellDef> Toifa </th>
            <td mat-cell *matCellDef="let comp"> {{ categoryLabel(comp.category) }} </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef> Holati </th>
            <td mat-cell *matCellDef="let comp">
              <span class="status-chip" [ngClass]="comp.status.toLowerCase()" [matTooltip]="statusHint(comp.status)">
                {{ statusLabel(comp.status) }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef> Sana </th>
            <td mat-cell *matCellDef="let comp"> {{comp.createdAt | date:'mediumDate'}} </td>
          </ng-container>

          <ng-container matColumnDef="actions">
            <th mat-header-cell *matHeaderCellDef> Amallar </th>
            <td mat-cell *matCellDef="let comp">
              <button *ngIf="isConfirmable(comp.status)" mat-raised-button color="primary"
                      [disabled]="confirming === comp.id" (click)="confirm(comp.id)">Tasdiqlash</button>
            </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <mat-paginator [length]="total" [pageIndex]="pageIndex" [pageSize]="pageSize"
                       [pageSizeOptions]="pageSizeOptions" (page)="onPage($event)"
                       showFirstLastButtons></mat-paginator>
      </ng-container>

      <app-empty-state *ngIf="loaded && total === 0" icon="flag"
        title="Murojaatlar yo'q"
        text="Foydalanuvchi chat orqali shikoyat yoki ariza qoldirsa, u avtomatik yuborilmaydi — tasdiqlash uchun avval shu yerga tushadi.">
      </app-empty-state>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; }
    .hint { font-size: 13px; color: #64748b; margin: -4px 0 16px; max-width: 760px; }
    table { width: 100%; }
    .subject { max-width: 420px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .status-chip { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
    .status-chip.draft { background: #fff3e0; color: #ef6c00; }
    .status-chip.submitted { background: #e8f5e9; color: #2e7d32; }
    .status-chip.confirmed { background: #e0f2fe; color: #0369a1; }
    .status-chip.pending_confirmation { background: #fef9c3; color: #a16207; }
    .status-chip.rejected { background: #ffebee; color: #c62828; }
  `]
})
export class ComplaintsComponent implements OnInit {
  readonly pageSizeOptions = [25, 50, 100];
  complaints: Complaint[] = [];
  loaded = false;
  total = 0;
  pageIndex = 0;
  pageSize = 25;
  confirming: string | null = null;
  displayedColumns = ['subject', 'category', 'status', 'date', 'actions'];

  private static readonly STATUS: Record<string, string> = {
    DRAFT: 'Qoralama',
    PENDING_CONFIRMATION: 'Tasdiq kutilmoqda',
    CONFIRMED: 'Tasdiqlangan',
    SUBMITTED: 'Yuborilgan',
    REJECTED: 'Rad etilgan',
  };

  private static readonly STATUS_HINT: Record<string, string> = {
    DRAFT: 'Foydalanuvchi hali tasdiqlamagan',
    PENDING_CONFIRMATION: 'Tasdiqlash kutilmoqda',
    CONFIRMED: "Tasdiqlangan, lekin xodimlar chatiga yetkazilmagan (chat sozlanmagan yoki xato)",
    SUBMITTED: "Telegram orqali mas'ul xodimlarga yetkazilgan",
    REJECTED: 'Rad etilgan',
  };

  private static readonly CATEGORY: Record<string, string> = {
    ACADEMIC: 'Akademik',
    FINANCIAL: 'Moliyaviy',
    ADMINISTRATIVE: "Ma'muriy",
    DISCRIMINATION: 'Kamsitish',
  };

  private orgId = '';
  private readonly complaintsApi = inject(ComplaintsApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly orgContext = inject(OrgContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  statusLabel(status: string): string {
    return ComplaintsComponent.STATUS[status] ?? status;
  }

  statusHint(status: string): string {
    return ComplaintsComponent.STATUS_HINT[status] ?? '';
  }

  categoryLabel(category?: string | null): string {
    return (category && ComplaintsComponent.CATEGORY[category]) || category || 'Boshqa';
  }

  isConfirmable(status: string): boolean {
    return status === 'DRAFT' || status === 'PENDING_CONFIRMATION';
  }

  ngOnInit() {
    this.orgContext.orgId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => {
        this.orgId = id || '';
        this.pageIndex = 0;
        this.loadData();
      });
  }

  onPage(event: PageEvent) {
    this.pageIndex = event.pageIndex;
    this.pageSize = event.pageSize;
    this.loadData();
  }

  loadData() {
    if (!this.orgId) {
      this.loaded = true;
      this.cdr.markForCheck();
      return;
    }
    this.complaintsApi.getComplaintsPage(this.orgId, this.pageIndex, this.pageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => {
          this.complaints = page.items;
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

  confirm(id: string) {
    this.confirming = id;
    this.cdr.markForCheck();

    this.complaintsApi.confirmComplaint(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.confirming = null;
          this.snack.open('Murojaat tasdiqlandi', 'OK', { duration: 3000 });
          this.loadData();
          setTimeout(() => this.loadData(), 3000);
        },
        error: (err) => {
          this.confirming = null;
          this.snack.open(err?.error?.message || "Tasdiqlab bo'lmadi", 'OK', { duration: 4000 });
          this.loadData();
        }
      });
  }
}

