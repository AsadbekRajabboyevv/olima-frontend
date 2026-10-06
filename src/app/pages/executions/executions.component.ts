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
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmptyStateComponent } from '../../components/empty-state.component';
import { ToolsApiService } from '../../features/tools/data/tools-api.service';
import { OrgContextService } from '../../core/org/org-context.service';
import { Execution } from '../../models';

@Component({
  selector: 'app-executions',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, CommonModule, MatTableModule, MatTooltipModule, MatPaginatorModule],
  template: `
    <div class="page-container">
      <h2>Bajarilgan amallar jurnali</h2>
      <ng-container *ngIf="executions.length > 0">
        <table mat-table [dataSource]="executions" class="mat-elevation-z8">
          <ng-container matColumnDef="toolName">
            <th mat-header-cell *matHeaderCellDef> Vosita nomi </th>
            <td mat-cell *matCellDef="let exec"> {{exec.toolName}} </td>
          </ng-container>

          <ng-container matColumnDef="status">
            <th mat-header-cell *matHeaderCellDef> Holati </th>
            <td mat-cell *matCellDef="let exec">
              <span class="status-chip" [ngClass]="exec.status.toLowerCase()"
                    [matTooltip]="exec.status === 'FAILED' ? (exec.errorMessage || '') : ''">
                {{ statusLabel(exec.status) }}
              </span>
            </td>
          </ng-container>

          <ng-container matColumnDef="duration">
            <th mat-header-cell *matHeaderCellDef> Davomiyligi (ms) </th>
            <td mat-cell *matCellDef="let exec"> {{exec.durationMs}} </td>
          </ng-container>

          <ng-container matColumnDef="date">
            <th mat-header-cell *matHeaderCellDef> Sana </th>
            <td mat-cell *matCellDef="let exec"> {{exec.createdAt | date:'short'}} </td>
          </ng-container>

          <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
          <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
        </table>

        <mat-paginator [length]="total" [pageIndex]="pageIndex" [pageSize]="pageSize"
                       [pageSizeOptions]="pageSizeOptions" (page)="onPage($event)"
                       showFirstLastButtons></mat-paginator>
      </ng-container>

      <app-empty-state *ngIf="loaded && total === 0" icon="history"
        title="Hali bajarilgan amal yo'q"
        text="Yordamchi savolga javob berish uchun vositani chaqirganda (masalan, kontrakt qarzini tekshirish) har bir chaqiruv shu yerda natijasi va davomiyligi bilan yoziladi.">
      </app-empty-state>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; }
    table { width: 100%; }
    .status-chip { padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold; }
    .status-chip.success { background: #e8f5e9; color: #2e7d32; }
    .status-chip.failed { background: #ffebee; color: #c62828; }
    .status-chip.pending, .status-chip.waiting_confirmation { background: #fff3e0; color: #ef6c00; }
  `]
})
export class ExecutionsComponent implements OnInit {
  private readonly toolsApi = inject(ToolsApiService);
  private readonly orgContext = inject(OrgContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly pageSizeOptions = [25, 50, 100];
  executions: Execution[] = [];
  loaded = false;
  total = 0;
  pageIndex = 0;
  pageSize = 50;
  displayedColumns = ['toolName', 'status', 'duration', 'date'];
  private orgId = '';

  private static readonly STATUS: Record<string, string> = {
    SUCCESS: 'Muvaffaqiyatli',
    FAILED: 'Xatolik',
    PENDING: 'Kutilmoqda',
    WAITING_CONFIRMATION: 'Tasdiq kutilmoqda',
  };

  statusLabel(status: string): string {
    return ExecutionsComponent.STATUS[status] ?? status;
  }

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
    this.toolsApi.getExecutionsPage(this.orgId, this.pageIndex, this.pageSize)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: page => {
          this.executions = page.items;
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
}
