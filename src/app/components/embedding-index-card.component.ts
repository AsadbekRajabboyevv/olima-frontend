import { Component, EventEmitter, Input, OnChanges, Output, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { Observable, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { KnowledgeApiService } from '../features/knowledge/data/knowledge-api.service';
import { EmbeddingBackfillResult, EmbeddingStatus } from '../models';

@Component({
  selector: 'app-embedding-index-card',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  template: `
    <div class="idx-card" *ngIf="status">
      <div class="idx-head">
        <span class="idx-ico" [class.ok]="status.pendingChunks === 0 && status.totalChunks > 0">
          <mat-icon>{{ status.pendingChunks === 0 && status.totalChunks > 0 ? 'verified' : 'hub' }}</mat-icon>
        </span>
        <div class="idx-txt">
          <h3>Semantik qidiruv indeksi</h3>
          <p *ngIf="!status.embeddingEnabled" class="warn">
            Embedding modeli sozlanmagan — faqat kalit so'z bo'yicha qidiriladi.
          </p>
          <p *ngIf="status.embeddingEnabled && status.totalChunks === 0">
            Hali hujjat yuklanmagan. Yuklangan hujjatlar avtomatik indekslanadi.
          </p>
          <p *ngIf="status.embeddingEnabled && status.totalChunks > 0">
            <b>{{ status.embeddedChunks }}</b> / {{ status.totalChunks }} bo'lak indekslangan
            <span class="muted">· model: {{ status.model }}</span>
          </p>
        </div>
        <button mat-stroked-button color="primary" (click)="runBackfill()"
                *ngIf="status.embeddingEnabled && status.pendingChunks > 0"
                [disabled]="running">
          <mat-icon>bolt</mat-icon>
          {{ buttonLabel }}
        </button>
      </div>

      <mat-progress-bar *ngIf="status.totalChunks > 0" [mode]="running ? 'buffer' : 'determinate'"
                        [value]="percent" [bufferValue]="100"></mat-progress-bar>
      <p class="idx-msg" *ngIf="message" [class.err]="isError">{{ message }}</p>
    </div>
  `,
  styles: [`
    .idx-card { background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
    .idx-head { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; margin-bottom: 12px; }
    .idx-ico { width: 36px; height: 36px; border-radius: 9px; display: grid; place-items: center;
               color: var(--brand, #6366f1); background: var(--brand-soft, #eef2ff); flex: none; }
    .idx-ico.ok { color: #059669; background: #ecfdf5; }
    .idx-ico mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .idx-txt { flex: 1; min-width: 220px; }
    .idx-txt h3 { margin: 0 0 2px 0; font-size: 15px; color: #1a237e; }
    .idx-txt p { margin: 0; font-size: 13px; color: #475569; }
    .idx-txt .warn { color: #b45309; }
    .muted { color: #94a3b8; }
    .idx-msg { margin: 10px 0 0 0; font-size: 13px; color: #059669; }
    .idx-msg.err { color: #dc2626; }
  `]
})
export class EmbeddingIndexCardComponent implements OnChanges {

  @Input() orgId?: string;

  @Output() indexed = new EventEmitter<void>();

  private static readonly BATCH = 100;
  private static readonly MAX_ROUNDS = 50;

  private readonly api = inject(KnowledgeApiService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  status?: EmbeddingStatus;
  running = false;
  message = '';
  isError = false;

  ngOnChanges() {
    this.refresh();
  }

  get percent(): number {
    if (!this.status || this.status.totalChunks === 0) return 0;
    return Math.round((this.status.embeddedChunks / this.status.totalChunks) * 100);
  }

  get buttonLabel(): string {
    return this.running ? 'Indekslanmoqda…' : `${this.status?.pendingChunks ?? 0} ta bo'lakni indekslash`;
  }

  refresh() {
    this.api.getEmbeddingStatus(this.orgId || undefined)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: s => {
          this.status = s;
          this.cdr.markForCheck();
        },
        error: () => {
          this.status = undefined;
          this.cdr.markForCheck();
        }
      });
  }

  runBackfill() {
    if (this.running) return;
    this.running = true;
    this.message = '';
    this.isError = false;
    this.cdr.markForCheck();

    let processed = 0;
    let rounds = 0;
    const step = (): Observable<EmbeddingBackfillResult> =>
      this.api.backfillEmbeddings(this.orgId || undefined, EmbeddingIndexCardComponent.BATCH).pipe(
        switchMap(res => {
          processed += res.processed;
          rounds++;
          if (this.status) {
            this.status = {
              ...this.status,
              embeddedChunks: this.status.totalChunks - res.remaining,
              pendingChunks: res.remaining
            };
            this.cdr.markForCheck();
          }

          const more = res.remaining > 0 && res.processed > 0 && res.failed === 0
            && rounds < EmbeddingIndexCardComponent.MAX_ROUNDS;
          return more ? step() : of(res);
        })
      );

    step()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: res => {
          this.running = false;
          if (res.failed > 0) {
            this.isError = true;
            this.message = `${processed} ta bo'lak indekslandi, ${res.failed} tasida xatolik — keyinroq qayta urinib ko'ring.`;
          } else {
            this.message = res.remaining === 0
              ? `Tayyor: ${processed} ta bo'lak indekslandi.`
              : `${processed} ta bo'lak indekslandi, ${res.remaining} ta qoldi.`;
          }
          this.refresh();
          this.indexed.emit();
          this.cdr.markForCheck();
        },
        error: err => {
          this.running = false;
          this.isError = true;
          this.message = err?.error?.message || 'Indekslashda xatolik yuz berdi';
          this.refresh();
          this.cdr.markForCheck();
        }
      });
  }
}

