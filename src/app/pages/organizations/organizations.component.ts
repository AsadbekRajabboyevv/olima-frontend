import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmptyStateComponent } from '../../components/empty-state.component';
import { OrgApiService } from '../../core/org/data/org-api.service';
import { OrgContextService } from '../../core/org/org-context.service';
import { Organization } from '../../models';
import { OrganizationDialogComponent } from './organization-dialog.component';
import { OrgAccessDialogComponent } from './org-access-dialog.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-organizations',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent,
    CommonModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatDialogModule
  ],
  template: `
    <div class="page">
      <div class="page-head">
        <div class="page-head__text">
          <h1>Tashkilotlar</h1>
          <p>Har bir tashkilot — alohida mijoz: o'z bilim bazasi, o'z vositalari va o'z admini bilan.</p>
        </div>
        <div class="page-head__actions">
          <button mat-flat-button color="primary" (click)="addOrganization()">
            <mat-icon>add</mat-icon> Tashkilot qo'shish
          </button>
        </div>
      </div>

      <div class="table-wrap" *ngIf="organizations.length">
        <div class="table-scroll">
          <table mat-table [dataSource]="organizations">
            <ng-container matColumnDef="name">
              <th mat-header-cell *matHeaderCellDef>Nomi</th>
              <td mat-cell *matCellDef="let org">
                <div class="name">
                  <strong>{{ org.name }}</strong>
                  <small *ngIf="org.description">{{ org.description }}</small>
                </div>
              </td>
            </ng-container>

            <ng-container matColumnDef="slug">
              <th mat-header-cell *matHeaderCellDef>Qisqa nom</th>
              <td mat-cell *matCellDef="let org"><span class="mono">{{ org.slug }}</span></td>
            </ng-container>

            <ng-container matColumnDef="enabled">
              <th mat-header-cell *matHeaderCellDef>Holati</th>
              <td mat-cell *matCellDef="let org">
                <span class="tag" [class.tag--ok]="org.enabled">
                  {{ org.enabled ? 'Faol' : 'Nofaol' }}
                </span>
              </td>
            </ng-container>

            <ng-container matColumnDef="quota">
              <th mat-header-cell *matHeaderCellDef>Oylik kvota</th>
              <td mat-cell *matCellDef="let org" class="nowrap">
                <span *ngIf="org.monthlyTokenQuota != null; else defaultQuota" class="mono">
                  {{ org.monthlyTokenQuota | number }} token
                </span>
                <ng-template #defaultQuota><span class="muted">sukut</span></ng-template>
              </td>
            </ng-container>

            <ng-container matColumnDef="createdAt">
              <th mat-header-cell *matHeaderCellDef>Yaratilgan</th>
              <td mat-cell *matCellDef="let org" class="nowrap muted">
                {{ org.createdAt | date:'dd.MM.yyyy' }}
              </td>
            </ng-container>

            <ng-container matColumnDef="actions">
              <th mat-header-cell *matHeaderCellDef>Amallar</th>
              <td mat-cell *matCellDef="let org">
                <div class="acts">
                  <button mat-flat-button color="primary" class="key-btn" (click)="openAccess(org)">
                    <mat-icon>vpn_key</mat-icon> Ulanish ma'lumotlari
                  </button>
                  <button mat-stroked-button (click)="viewTools(org.id)">
                    <mat-icon>handyman</mat-icon> Vositalar
                  </button>
                  <button mat-icon-button (click)="rotateWidgetKey(org)" matTooltip="Widget kalitini almashtirish">
                    <mat-icon>autorenew</mat-icon>
                  </button>
                  <button mat-icon-button (click)="editOrganization(org)" matTooltip="Tahrirlash">
                    <mat-icon>edit</mat-icon>
                  </button>
                  <button mat-icon-button color="warn" (click)="deleteOrganization(org)" matTooltip="O'chirish">
                    <mat-icon>delete_outline</mat-icon>
                  </button>
                </div>
              </td>
            </ng-container>

            <tr mat-header-row *matHeaderRowDef="displayedColumns"></tr>
            <tr mat-row *matRowDef="let row; columns: displayedColumns;"></tr>
          </table>
        </div>
      </div>

      <app-empty-state *ngIf="loaded && organizations.length === 0" icon="apartment"
        title="Hali tashkilot yo'q"
        text="Birinchi mijozni qo'shing — unga bilimlar bazasi, vositalar, widget kaliti va admin hisobi biriktiriladi.">
        <button mat-flat-button color="primary" (click)="addOrganization()">
          <mat-icon>add</mat-icon> Tashkilot qo'shish
        </button>
      </app-empty-state>
    </div>
  `,
  styles: [`
    .name { display: flex; flex-direction: column; gap: 3px; padding: 10px 0; min-width: 220px; }
    .name strong { font-size: 13.5px; font-weight: 650; color: var(--ink); }
    .name small {
      font-size: 12px; color: var(--ink-3); line-height: 17px;
      max-width: 42ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
    }
    .acts { display: flex; align-items: center; gap: 7px; }
    .key-btn { white-space: nowrap; }
    .acts .mat-mdc-icon-button { flex-shrink: 0; }
  `]
})
export class OrganizationsComponent implements OnInit {
  organizations: Organization[] = [];
  loaded = false;
  displayedColumns: string[] = ['name', 'slug', 'enabled', 'quota', 'createdAt', 'actions'];

  private readonly orgApi = inject(OrgApiService);
  private readonly dialog = inject(MatDialog);
  private readonly router = inject(Router);
  private readonly snack = inject(MatSnackBar);
  private readonly orgContext = inject(OrgContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  ngOnInit() {
    this.loadOrganizations();
  }

  loadOrganizations() {
    this.orgApi.getOrganizations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orgs) => {
          this.organizations = orgs;
          this.loaded = true;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.fail('Tashkilotlarni yuklab bo\'lmadi', err);
          this.cdr.markForCheck();
        },
      });
  }

  openAccess(org: Organization) {
    this.dialog.open(OrgAccessDialogComponent, {
      width: '680px',
      maxWidth: '94vw',
      data: { org },
    });
  }

  addOrganization() {
    this.dialog.open(OrganizationDialogComponent, { width: '520px' })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        if (!result) return;
        this.orgApi.createOrganization(result)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (newOrg) => {
              this.loadOrganizations();
              this.orgContext.select(newOrg.id, newOrg.name);
              this.snack.open(`"${newOrg.name}" qo'shildi`, 'OK', { duration: 3000 });
              this.cdr.markForCheck();
            },
            error: (err) => {
              this.fail('Tashkilotni yaratib bo\'lmadi', err);
              this.cdr.markForCheck();
            },
          });
      });
  }

  editOrganization(org: Organization) {
    this.dialog.open(OrganizationDialogComponent, { width: '520px', data: org })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        if (!result) return;
        this.orgApi.updateOrganization(org.id, result)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.loadOrganizations();
              if (this.orgContext.snapshotId() === org.id && result.name) {
                this.orgContext.setOrgName(result.name);
              }
              this.cdr.markForCheck();
            },
            error: (err) => {
              this.fail('Tahrirlab bo\'lmadi', err);
              this.cdr.markForCheck();
            },
          });
      });
  }

  deleteOrganization(org: Organization) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '440px',
      data: {
        title: 'Tashkilotni o\'chirish',
        message: `"${org.name}" o'chiriladi — bilim bazasi, vositalar va suhbatlar bilan birga. Bu amalni ortga qaytarib bo'lmaydi.`,
      },
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmed => {
        if (!confirmed) return;
        this.orgApi.deleteOrganization(org.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.loadOrganizations();
              if (this.orgContext.snapshotId() === org.id) {
                this.orgContext.clear();
              }
              this.cdr.markForCheck();
            },
            error: (err) => {
              this.fail('O\'chirib bo\'lmadi', err);
              this.cdr.markForCheck();
            },
          });
      });
  }

  rotateWidgetKey(org: Organization) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      data: {
        title: 'Widget kalitini almashtirish',
        message: `"${org.name}" uchun yangi kalit yaratiladi. Eski kalit darhol ishlamay qoladi — mijoz saytidagi skript qatorini yangilash kerak bo'ladi.`,
      },
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmed => {
        if (!confirmed) return;
        this.orgApi.rotateWidgetKey(org.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: (updated) => {
              this.loadOrganizations();
              this.snack.open('Yangi kalit yaratildi — "Ulanish ma\'lumotlari" oynasidan oling', 'OK', { duration: 5000 });
              this.openAccess(updated);
              this.cdr.markForCheck();
            },
            error: (err) => {
              this.fail('Kalitni almashtirib bo\'lmadi', err);
              this.cdr.markForCheck();
            },
          });
      });
  }

  viewTools(orgId: string) {
    const org = this.organizations.find(o => o.id === orgId);
    this.orgContext.select(orgId, org?.name);
    this.router.navigate(['/organizations', orgId, 'tools']);
  }

  private fail(msg: string, err: any) {
    this.snack.open(`${msg}: ${err?.error?.message || err?.message || ''}`.trim(), 'OK', { duration: 5000 });
  }
}

