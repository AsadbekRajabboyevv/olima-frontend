import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToolsApiService } from '../../features/tools/data/tools-api.service';
import { OrgContextService } from '../../core/org/org-context.service';
import { AuthType, ConnectionRequest, IntegrationConnection } from '../../models';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { ConnectionDialogComponent } from './connection-dialog.component';

@Component({
  selector: 'app-connections',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatDialogModule
  ],
  template: `
    <div class="page-container">
      <div class="header">
        <div>
          <h1>Tashqi tizim ulanishlari</h1>
          <p class="subtitle">
            Tashkilot tizimlariga (talabalar bazasi, kontrakt, CRM) ulanish va login ma'lumotlari.
            Vositalar ularga nomi bilan ulanadi — login/parol AI modelga hech qachon uzatilmaydi.
          </p>
        </div>
        <button mat-raised-button color="primary" (click)="openDialog()" [disabled]="!orgId">
          <mat-icon>add</mat-icon> Yangi ulanish
        </button>
      </div>

      <div class="loading-state" *ngIf="loading">
        <mat-spinner diameter="32"></mat-spinner>
      </div>

      <mat-card *ngIf="!loading && !orgId" class="empty-card">
        <p>Iltimos, avval yuqoridagi menyudan tashkilotni tanlang.</p>
      </mat-card>

      <div class="empty-state" *ngIf="!loading && orgId && connections.length === 0">
        <mat-icon class="empty-icon">hub</mat-icon>
        <h3>Ulanishlar yo'q</h3>
        <p>Tashqi tizim login/parol yoki kalit talab qilsa, avval shu yerda ulanish yarating,
          so'ng vositada uni tanlang.</p>
      </div>

      <div class="grid" *ngIf="!loading && connections.length > 0">
        <mat-card *ngFor="let c of connections" class="conn-card" [class.disabled]="!c.enabled">
          <div class="conn-head">
            <div class="conn-title">
              <mat-icon class="conn-icon">hub</mat-icon>
              <div>
                <div class="conn-name">{{ c.name }}</div>
                <div class="conn-desc" *ngIf="c.description">{{ c.description }}</div>
              </div>
            </div>
            <span class="badge" [class.off]="!c.enabled">{{ c.enabled ? 'Faol' : "O'chiq" }}</span>
          </div>

          <div class="detail"><span class="label">Manzil</span><code>{{ c.baseUrl }}</code></div>
          <div class="detail">
            <span class="label">Autentifikatsiya</span>
            <span>{{ authLabel(c.authType) }}</span>
          </div>
          <div class="detail" *ngIf="c.authConfig?.tokenPath">
            <span class="label">Token endpoint</span><code>{{ c.authConfig?.tokenPath }}</code>
          </div>
          <div class="secrets">
            <span class="secret" *ngIf="c.hasUsername"><mat-icon inline>person</mat-icon> login saqlangan</span>
            <span class="secret" *ngIf="c.hasPassword"><mat-icon inline>lock</mat-icon> parol shifrlangan</span>
            <span class="secret" *ngIf="c.hasSecret"><mat-icon inline>key</mat-icon> kalit shifrlangan</span>
          </div>
          <div class="usage">
            <mat-icon inline>handyman</mat-icon> {{ c.toolCount }} ta vositada ishlatilmoqda
          </div>

          <div class="test-result" *ngIf="testResults[c.id] as r" [class.ok]="r.success" [class.fail]="!r.success">
            <mat-icon inline>{{ r.success ? 'check_circle' : 'error' }}</mat-icon> {{ r.message }}
          </div>

          <div class="actions">
            <button mat-stroked-button (click)="test(c)" [disabled]="testing[c.id]">
              <mat-spinner *ngIf="testing[c.id]" diameter="16" class="btn-spinner"></mat-spinner>
              <mat-icon *ngIf="!testing[c.id]">network_check</mat-icon> Tekshirish
            </button>
            <button mat-icon-button matTooltip="Tahrirlash" (click)="openDialog(c)">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button color="warn" (click)="remove(c)"
                    [matTooltip]="c.toolCount > 0 ? 'Avval vositalarni boshqa ulanishga o\\'tkazing' : 'O\\'chirish'">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </mat-card>
      </div>

      <mat-card class="howto" *ngIf="!loading && orgId">
        <h3>Vositada qanday ishlatiladi</h3>
        <p>Vosita konfiguratsiyasida endpoint nisbiy yoziladi, login avtomatik qo'shiladi:</p>
        <pre>{{ example }}</pre>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 1100px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
    .header h1 { margin: 0; font-size: 1.75rem; font-weight: 600; color: #1a237e; }
    .subtitle { margin: 4px 0 0 0; color: #666; font-size: 14px; max-width: 680px; }
    .loading-state { display: flex; justify-content: center; padding: 48px; }
    .empty-card { padding: 24px; }
    .empty-state { text-align: center; padding: 48px 16px; color: #64748b; }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: #94a3b8; }
    .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
    .conn-card { padding: 20px; display: flex; flex-direction: column; gap: 10px; }
    .conn-card.disabled { opacity: .7; }
    .conn-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; }
    .conn-title { display: flex; gap: 10px; align-items: center; }
    .conn-icon { color: #1a237e; }
    .conn-name { font-weight: 600; font-size: 16px; color: #1a237e; font-family: monospace; }
    .conn-desc { font-size: 13px; color: #64748b; }
    .badge { font-size: 11px; font-weight: 600; padding: 2px 8px; border-radius: 10px; background: #dcfce7; color: #166534; }
    .badge.off { background: #f1f5f9; color: #64748b; }
    .detail { display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
    .label { font-size: 11px; color: #718096; font-weight: 600; text-transform: uppercase; }
    code { background: #f1f5f9; padding: 2px 6px; border-radius: 4px; font-size: 12px; word-break: break-all; }
    .secrets { display: flex; gap: 10px; flex-wrap: wrap; }
    .secret { font-size: 12px; color: #475569; display: inline-flex; gap: 4px; align-items: center; }
    .usage { font-size: 12px; color: #64748b; display: flex; gap: 4px; align-items: center; }
    .test-result { font-size: 13px; padding: 6px 10px; border-radius: 6px; display: flex; gap: 6px; align-items: center; }
    .test-result.ok { background: #ecfdf5; color: #047857; }
    .test-result.fail { background: #fef2f2; color: #b91c1c; }
    .actions { display: flex; gap: 4px; align-items: center; margin-top: auto; }
    .btn-spinner { display: inline-block; margin-right: 6px; }
    .howto { margin-top: 24px; padding: 20px; }
    .howto h3 { margin: 0 0 6px; font-size: 15px; color: #1a237e; }
    .howto p { margin: 0 0 8px; font-size: 13px; color: #64748b; }
    .howto pre { background: #0f172a; color: #e2e8f0; padding: 12px; border-radius: 6px; font-size: 12px; overflow-x: auto; margin: 0; }
  `]
})
export class ConnectionsComponent implements OnInit {
  private static readonly AUTH_LABELS: Record<AuthType, string> = {
    NONE: 'Autentifikatsiyasiz',
    BASIC: 'HTTP Basic',
    BEARER: 'Doimiy token',
    API_KEY: 'API kalit',
    LOGIN: 'Login endpoint → token',
    OAUTH2_CLIENT_CREDENTIALS: 'OAuth2 client credentials'
  };

  private readonly toolsApi = inject(ToolsApiService);
  private readonly dialog = inject(MatDialog);
  private readonly orgContext = inject(OrgContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  orgId = '';
  connections: IntegrationConnection[] = [];
  loading = false;
  testing: Record<string, boolean> = {};
  testResults: Record<string, { success: boolean; message: string }> = {};

  readonly example = JSON.stringify({
    connection: 'hemis',
    endpoint: '/students/{studentId}',
    method: 'GET'
  }, null, 2);

  ngOnInit(): void {
    this.orgContext.orgId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => {
        this.orgId = id || '';
        this.load();
      });
  }

  authLabel(type: AuthType): string {
    return ConnectionsComponent.AUTH_LABELS[type] ?? type;
  }

  load(): void {
    if (!this.orgId) {
      this.connections = [];
      this.cdr.markForCheck();
      return;
    }
    this.loading = true;
    this.cdr.markForCheck();
    this.toolsApi.getConnections(this.orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (list) => {
          this.connections = list;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.connections = [];
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  openDialog(connection?: IntegrationConnection): void {
    const ref = this.dialog.open(ConnectionDialogComponent, {
      width: '680px',
      maxWidth: '95vw',
      data: { connection }
    });
    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((request?: ConnectionRequest) => {
        if (!request) return;
        const call = connection
          ? this.toolsApi.updateConnection(connection.id, request)
          : this.toolsApi.createConnection(this.orgId, request);
        call.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
          next: (saved) => {
            delete this.testResults[saved.id];
            this.load();
          },
          error: (err) => alert(err.error?.message || 'Ulanishni saqlashda xatolik yuz berdi')
        });
      });
  }

  test(connection: IntegrationConnection): void {
    this.testing[connection.id] = true;
    delete this.testResults[connection.id];
    this.cdr.markForCheck();
    this.toolsApi.testConnection(connection.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (result) => {
          this.testing[connection.id] = false;
          this.testResults[connection.id] = result;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.testing[connection.id] = false;
          this.testResults[connection.id] = {
            success: false,
            message: err.error?.message || 'Tekshirishda xatolik yuz berdi'
          };
          this.cdr.markForCheck();
        }
      });
  }

  remove(connection: IntegrationConnection): void {
    const ref = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: "Ulanishni o'chirish",
        message: `"${connection.name}" ulanishini o'chirasizmi? Saqlangan login ma'lumotlari ham o'chadi.`
      }
    });
    ref.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmed => {
        if (!confirmed) return;
        this.toolsApi.deleteConnection(connection.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.load(),
            error: (err) => alert(err.error?.message || "O'chirishda xatolik yuz berdi")
          });
      });
  }
}

