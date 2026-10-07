import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { TelegramApiService } from '../../features/telegram/data/telegram-api.service';
import { OrgContextService } from '../../core/org/org-context.service';
import { TelegramBotConfig, TelegramUpdateMode } from '../../models';
import { AuthService } from '../../services/auth.service';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { HelpTipComponent } from '../../components/help-tip.component';

@Component({
  selector: 'app-telegram',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonToggleModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    HelpTipComponent
  ],
  template: `
    <div class="page-container">
      <div class="header">
        <div>
          <h1>Telegram bot</h1>
          <p class="subtitle">Tashkilotingiz uchun Telegram botni ulang — u AI yordamchi bilan avtomatik ishlaydi, alohida sozlash shart emas</p>
        </div>
      </div>

      <div class="loading-state" *ngIf="loading">
        <mat-spinner diameter="32"></mat-spinner>
      </div>

      <mat-card *ngIf="!loading && !orgId" class="empty-card">
        <p>Iltimos, avval yuqoridagi menyudan tashkilotni tanlang.</p>
      </mat-card>

      <mat-card *ngIf="!loading && orgId && config" class="status-card">
        <div class="status-header">
          <mat-icon class="connected-icon">check_circle</mat-icon>
          <div>
            <div class="bot-username">&#64;{{ config.botUsername }}</div>
            <div class="status-label">Ulangan</div>
          </div>
        </div>

        <div class="detail-row">
          <span class="detail-label">Token</span>
          <code>{{ config.maskedToken }}</code>
        </div>
        <div class="detail-row" *ngIf="!isSuperAdmin">
          <span class="detail-label">Ulanish rejimi</span>
          <span>{{ modeLabel(config.updateMode) }}</span>
        </div>
        <div class="detail-row" *ngIf="config.webhookUrl">
          <span class="detail-label">Webhook manzili</span>
          <code class="webhook-url">{{ config.webhookUrl }}</code>
        </div>

        <p class="hint">Botga <a [href]="'https://t.me/' + config.botUsername" target="_blank" rel="noopener noreferrer">shu havola</a> orqali yozing — u xuddi veb-chatdagidek javob beradi va kontekstni eslab qoladi.</p>

        <div class="mode-section" *ngIf="isSuperAdmin">
          <h3>Ulanish rejimi</h3>
          <div class="mode-row">
            <mat-button-toggle-group [(ngModel)]="updateMode" [disabled]="saving" hideSingleSelectionIndicator>
              <mat-button-toggle value="WEBHOOK">Webhook</mat-button-toggle>
              <mat-button-toggle value="LONG_POLLING">Long polling</mat-button-toggle>
            </mat-button-toggle-group>
            <button mat-stroked-button color="primary" (click)="saveMode()" [disabled]="saving || updateMode === config.updateMode">
              Saqlash
            </button>
          </div>
          <p class="mode-hint">{{ modeHint(updateMode) }}</p>
          <p class="error-message" *ngIf="modeError">{{ modeError }}</p>
          <p class="ok-message" *ngIf="modeSaved">{{ modeSaved }}</p>
        </div>

        <div class="notify-section">
          <h3>Murojaatlar bildirishnomasi</h3>
          <div class="notify-row">
            <mat-form-field appearance="outline" class="notify-field" subscriptSizing="dynamic">
              <mat-label>Chat ID</mat-label>
              <input matInput [(ngModel)]="notificationChatId" placeholder="-1001234567890" [disabled]="saving">
              <app-help-tip matSuffix>
                Foydalanuvchi tasdiqlagan murojaatlar shu chatga yuboriladi (masalan, xodimlar guruhi).
                Botni guruhga qo'shing, guruh ID'sini (odatda <code>-100...</code>) kiriting.
                Bo'sh bo'lsa, murojaatlar faqat panelda ko'rinadi.
              </app-help-tip>
            </mat-form-field>
            <button mat-stroked-button color="primary" (click)="saveNotification()" [disabled]="saving || !notificationChanged()">
              Saqlash
            </button>
          </div>
          <p class="error-message" *ngIf="errorMessage">{{ errorMessage }}</p>
          <p class="ok-message" *ngIf="savedMessage">{{ savedMessage }}</p>
        </div>

        <div class="actions">
          <button mat-stroked-button color="warn" (click)="disconnect()">
            <mat-icon>link_off</mat-icon> Botni uzish
          </button>
        </div>
      </mat-card>

      <mat-card *ngIf="!loading && orgId && !config" class="connect-card">
        <h3>Bot tokenini kiriting</h3>
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Bot token</mat-label>
          <input matInput [(ngModel)]="botToken" placeholder="123456789:AAExample-TokenHere" [disabled]="saving">
          <app-help-tip matSuffix>
            Telegram'da <a href="https://t.me/BotFather" target="_blank" rel="noopener noreferrer">&#64;BotFather</a>ga yozib yangi bot yarating
            (<code>/newbot</code>), u sizga token beradi — shuni shu yerga joylashtiring.
          </app-help-tip>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Murojaatlar uchun chat ID (ixtiyoriy)</mat-label>
          <input matInput [(ngModel)]="notificationChatId" placeholder="-1001234567890" [disabled]="saving">
          <app-help-tip matSuffix>Tasdiqlangan murojaatlar shu chatga yuboriladi</app-help-tip>
        </mat-form-field>

        <div class="mode-section connect-mode" *ngIf="isSuperAdmin">
          <h3>Ulanish rejimi</h3>
          <mat-button-toggle-group [(ngModel)]="updateMode" [disabled]="saving" hideSingleSelectionIndicator>
            <mat-button-toggle value="WEBHOOK">Webhook</mat-button-toggle>
            <mat-button-toggle value="LONG_POLLING">Long polling</mat-button-toggle>
          </mat-button-toggle-group>
          <p class="mode-hint">{{ modeHint(updateMode) }}</p>
        </div>

        <p class="error-message" *ngIf="errorMessage">{{ errorMessage }}</p>

        <button mat-raised-button color="primary" (click)="connect()" [disabled]="!botToken.trim() || saving">
          <mat-spinner *ngIf="saving" diameter="18" class="btn-spinner"></mat-spinner>
          <span *ngIf="!saving">Ulash</span>
        </button>
      </mat-card>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 800px; margin: 0 auto; }
    .header { margin-bottom: 24px; }
    .header h1 { margin: 0; font-size: 1.75rem; font-weight: 600; color: #1a237e; }
    .subtitle { margin: 4px 0 0 0; color: #666; font-size: 14px; }
    .loading-state { display: flex; justify-content: center; padding: 48px; }
    .empty-card, .connect-card, .status-card { padding: 24px; }

    .status-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .connected-icon { color: #059669; font-size: 32px; width: 32px; height: 32px; }
    .bot-username { font-size: 18px; font-weight: 600; color: #1a237e; }
    .status-label { font-size: 12px; color: #059669; font-weight: 600; text-transform: uppercase; }

    .detail-row {
      display: flex;
      flex-direction: column;
      gap: 4px;
      margin-bottom: 14px;
    }
    .detail-label { font-size: 12px; color: #718096; font-weight: 600; text-transform: uppercase; }
    code {
      background: #f1f5f9;
      padding: 4px 8px;
      border-radius: 4px;
      font-family: monospace;
      font-size: 13px;
      color: #0f172a;
      word-break: break-all;
    }
    .webhook-url { display: inline-block; }

    .hint { font-size: 13px; color: #64748b; margin: 12px 0; }
    .hint a { color: #1a237e; }

    .actions { margin-top: 16px; }

    .mode-section { border-top: 1px solid #e2e8f0; margin-top: 16px; padding-top: 16px; }
    .mode-section h3 { margin: 0 0 10px; font-size: 15px; color: #1a237e; }
    .connect-mode { border-top: none; margin: 0 0 16px; padding-top: 0; }
    .mode-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .mode-hint { font-size: 13px; color: #64748b; margin: 8px 0 0; }

    .notify-section { border-top: 1px solid #e2e8f0; margin-top: 16px; padding-top: 16px; }
    .notify-section h3 { margin: 0 0 4px; font-size: 15px; color: #1a237e; }
    .notify-row { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; }
    .notify-field { flex: 1; min-width: 220px; }
    .ok-message { color: #059669; font-size: 13px; margin: 8px 0 0; }

    .full-width { width: 100%; }
    .error-message { color: #dc2626; font-size: 13px; margin: -8px 0 12px 0; }
    .btn-spinner { margin: 0 auto; }
  `]
})
export class TelegramComponent implements OnInit {
  private readonly telegramApi = inject(TelegramApiService);
  private readonly dialog = inject(MatDialog);
  private readonly orgContext = inject(OrgContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly authService = inject(AuthService);

  /** Rejimni faqat SUPER_ADMIN tanlaydi — backend ham shuni tekshiradi */
  readonly isSuperAdmin = this.authService.isSuperAdmin();

  orgId = '';
  config: TelegramBotConfig | null = null;
  loading = false;
  saving = false;
  botToken = '';
  notificationChatId = '';
  errorMessage = '';
  savedMessage = '';
  updateMode: TelegramUpdateMode = 'WEBHOOK';
  modeError = '';
  modeSaved = '';

  ngOnInit(): void {
    this.orgContext.orgId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => {
        this.orgId = id || '';
        this.loadConfig();
      });
  }

  loadConfig(): void {
    if (!this.orgId) {
      this.config = null;
      this.cdr.markForCheck();
      return;
    }
    this.loading = true;
    this.cdr.markForCheck();

    this.telegramApi.getTelegramConfig(this.orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.setConfig(config);
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.config = null;
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private setConfig(config: TelegramBotConfig | null): void {
    this.config = config;
    this.updateMode = config?.updateMode ?? 'WEBHOOK';
    this.notificationChatId = config?.notificationChatId != null ? String(config.notificationChatId) : '';
  }

  private parsedChatId(): number | null | undefined {
    const raw = this.notificationChatId.trim();
    if (!raw) return null;
    return /^-?\d+$/.test(raw) ? Number(raw) : undefined;
  }

  modeLabel(mode: TelegramUpdateMode): string {
    return mode === 'LONG_POLLING' ? 'Long polling' : 'Webhook';
  }

  modeHint(mode: TelegramUpdateMode): string {
    return mode === 'LONG_POLLING'
      ? "Server xabarlarni Telegram'dan o'zi so'rab oladi — kiruvchi ulanish kerak emas. Telegram serverga barqaror ulana olmaydigan tarmoqlar uchun."
      : "Telegram xabarlarni serverga o'zi yuboradi. Server internetdan HTTPS orqali ochiq bo'lishi va Telegram unga barqaror ulana olishi kerak.";
  }

  saveMode(): void {
    if (!this.config || this.updateMode === this.config.updateMode) {
      return;
    }
    this.saving = true;
    this.modeError = '';
    this.modeSaved = '';
    this.cdr.markForCheck();

    // Token bo'sh — backend saqlangan tokenni ishlatadi; chat ID o'zgarmaydi
    this.telegramApi.saveTelegramConfig(this.orgId, '', this.config.notificationChatId ?? null, this.updateMode)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.setConfig(config);
          this.saving = false;
          this.modeSaved = 'Rejim saqlandi';
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.saving = false;
          this.modeError = err?.error?.message || "Rejimni o'zgartirishda xatolik yuz berdi";
          this.cdr.markForCheck();
        }
      });
  }

  notificationChanged(): boolean {
    const current = this.config?.notificationChatId ?? null;
    return this.parsedChatId() !== current;
  }

  saveNotification(): void {
    const chatId = this.parsedChatId();
    if (chatId === undefined) {
      this.errorMessage = "Chat ID faqat raqamlardan iborat bo'lishi kerak (guruhlar uchun minus bilan)";
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    this.savedMessage = '';
    this.cdr.markForCheck();

    this.telegramApi.saveTelegramConfig(this.orgId, '', chatId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.setConfig(config);
          this.saving = false;
          this.savedMessage = 'Saqlandi';
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.message || 'Saqlashda xatolik yuz berdi';
          this.cdr.markForCheck();
        }
      });
  }

  connect(): void {
    if (!this.botToken.trim() || !this.orgId) {
      return;
    }
    const chatId = this.parsedChatId();
    if (chatId === undefined) {
      this.errorMessage = "Chat ID faqat raqamlardan iborat bo'lishi kerak (guruhlar uchun minus bilan)";
      return;
    }
    this.saving = true;
    this.errorMessage = '';
    this.cdr.markForCheck();

    this.telegramApi.saveTelegramConfig(this.orgId, this.botToken.trim(), chatId, this.isSuperAdmin ? this.updateMode : null)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (config) => {
          this.setConfig(config);
          this.botToken = '';
          this.saving = false;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.saving = false;
          this.errorMessage = err?.error?.message || 'Botni ulashda xatolik yuz berdi';
          this.cdr.markForCheck();
        }
      });
  }

  disconnect(): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Botni uzish',
        message: `@${this.config?.botUsername} botini uzishga ishonchingiz komilmi? Foydalanuvchilar bu bot orqali javob ololmay qoladi.`
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmed => {
        if (confirmed) {
          this.telegramApi.deleteTelegramConfig(this.orgId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: () => {
                this.setConfig(null);
                this.cdr.markForCheck();
              },
              error: (err) => alert('Uzishda xatolik: ' + (err?.error?.message || err?.message || 'Noma\'lum xatolik'))
            });
        }
      });
  }
}

