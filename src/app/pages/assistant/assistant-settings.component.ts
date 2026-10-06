import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ApiService } from '../../services/api.service';
import { AssistantSettings, Organization } from '../../models';
import { OrgContextService } from '../../core/org/org-context.service';

@Component({
  selector: 'app-assistant-settings',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, FormsModule, MatButtonModule, MatIconModule, MatSlideToggleModule, MatProgressSpinnerModule],
  template: `
    <div class="wrap">
      <div class="loading" *ngIf="loading"><mat-spinner diameter="28"></mat-spinner></div>

      <div class="empty" *ngIf="!loading && !org">
        <mat-icon>apartment</mat-icon>
        <p>Avval tepadagi ro'yxatdan tashkilotni tanlang.</p>
      </div>

      <div class="grid" *ngIf="!loading && org && settings">
        <section class="card">
          <header>
            <h3>Javob manbalari</h3>
            <p>Yordamchi savolga javobni qayerdan izlashini belgilang. Sozlama saytdagi widget,
               Telegram bot va panel chatiga birdan ta'sir qiladi.</p>
          </header>

          <div class="source locked">
            <span class="ico"><mat-icon>folder_special</mat-icon></span>
            <div class="txt">
              <b>Tashkilot manbalari</b>
              <span>Bilimlar bazasidagi hujjatlar va ulangan vositalar (API). Doim yoqilgan.</span>
            </div>
            <mat-slide-toggle [checked]="true" disabled aria-label="Tashkilot manbalari"></mat-slide-toggle>
          </div>

          <div class="source" [class.off]="!settings.webSearchAvailable">
            <span class="ico web"><mat-icon>travel_explore</mat-icon></span>
            <div class="txt">
              <b>Internetdan qidirish</b>
              <span>Ichki manbalarda topilmasa, ochiq internetdan faqat {{ org.name }} sohasiga oid
                    ma'lumot izlaydi. Javob ostida sayt havolasi ko'rsatiladi.</span>
            </div>
            <mat-slide-toggle color="primary" [(ngModel)]="webSearchEnabled"
                              [disabled]="!settings.webSearchAvailable || saving"
                              aria-label="Internetdan qidirish"></mat-slide-toggle>
          </div>

          <p class="note" *ngIf="!settings.webSearchAvailable">
            <mat-icon inline="true">lock</mat-icon>
            Internetdan qidirish platforma darajasida o'chirilgan — administrator bilan bog'laning.
          </p>

          <div class="actions">
            <button mat-stroked-button (click)="reset()" [disabled]="saving || !dirty">Bekor qilish</button>
            <button mat-flat-button color="primary" (click)="save()" [disabled]="saving || !dirty">
              <mat-icon>check</mat-icon> Saqlash
            </button>
          </div>
        </section>

        <section class="card">
          <header>
            <h3>Yordamchi qanday javob beradi</h3>
            <p>{{ webSearchEnabled ? 'Internet yoqilgan' : 'Faqat ichki manbalar' }} — saqlangandan keyin shunday ishlaydi</p>
          </header>
          <ol class="flow">
            <li><b>Ulangan vositalar</b> — savol vositaga mos kelsa (masalan, kontrakt ma'lumoti)</li>
            <li><b>Bilimlar bazasi</b> — yuklangan nizom, qaror va yo'riqnomalar</li>
            <li *ngIf="webSearchEnabled"><b>Internet</b> — yuqoridagilarda topilmasa, ochiq manbalardan</li>
          </ol>
          <div class="outcome" [class.web]="webSearchEnabled">
            <mat-icon>{{ webSearchEnabled ? 'public' : 'block' }}</mat-icon>
            <span *ngIf="!webSearchEnabled">
              Hech qayerda topilmasa: <b>«Bu ma'lumot hozircha mavjud emas»</b> deb javob beradi.
              O'zidan to'qib chiqarmaydi va internetga murojaat qilmaydi.
            </span>
            <span *ngIf="webSearchEnabled">
              Ichki manbalarda topilmasa internetdan izlaydi; u yerda ham topilmasa
              «ma'lumot mavjud emas» deb javob beradi.
            </span>
          </div>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .wrap { padding: var(--gap, 24px); max-width: 1180px; }
    .loading, .empty { display: grid; place-items: center; gap: 8px; padding: 64px 16px; color: var(--ink-3, #64748b); }
    .empty mat-icon { font-size: 36px; width: 36px; height: 36px; }
    .grid { display: grid; grid-template-columns: minmax(0, 1.1fr) minmax(0, 1fr); gap: 20px; align-items: start; }
    @media (max-width: 900px) { .grid { grid-template-columns: 1fr; } }
    .card { background: var(--surface, #fff); border: 1px solid var(--edge, #e6e9f0); border-radius: var(--r-lg, 16px);
            padding: 20px; display: flex; flex-direction: column; gap: 16px; min-width: 0; }
    header h3 { margin: 0 0 4px; font-size: 16px; }
    header p { margin: 0; font-size: 13.5px; line-height: 1.5; color: var(--ink-3, #64748b); }

    .source { display: flex; align-items: center; gap: 14px; padding: 14px; border: 1px solid var(--edge, #e6e9f0);
              border-radius: var(--r, 12px); }
    .source.locked { background: var(--bg, #f4f5fa); }
    .source.off { opacity: .55; }
    .ico { flex: none; width: 38px; height: 38px; border-radius: 10px; display: grid; place-items: center;
           color: #059669; background: #ecfdf5; }
    .ico.web { color: var(--brand, #6366f1); background: var(--brand-soft, #eef2ff); }
    .ico mat-icon { font-size: 20px; width: 20px; height: 20px; }
    .txt { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
    .txt b { font-size: 14.5px; color: var(--ink, #0f172a); }
    .txt span { font-size: 13px; line-height: 1.45; color: var(--ink-3, #64748b); }
    .note { margin: 0; font-size: 13px; color: var(--warn, #b45309); display: flex; align-items: center; gap: 6px; }
    .actions { display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }

    .flow { margin: 0; padding-left: 20px; display: flex; flex-direction: column; gap: 8px;
            font-size: 14px; line-height: 1.45; color: var(--ink-2, #334155); }
    .outcome { display: flex; gap: 10px; align-items: flex-start; padding: 12px 14px; border-radius: var(--r, 12px);
               background: #fffbeb; color: #92400e; font-size: 13.5px; line-height: 1.5; }
    .outcome.web { background: var(--brand-soft, #eef2ff); color: var(--ink-2, #334155); }
    .outcome mat-icon { flex: none; font-size: 20px; width: 20px; height: 20px; }
  `],
})
export class AssistantSettingsComponent implements OnInit {
  org: Organization | null = null;
  settings: AssistantSettings | null = null;
  webSearchEnabled = false;
  loading = true;
  saving = false;

  private readonly api = inject(ApiService);
  private readonly snack = inject(MatSnackBar);
  private readonly orgContext = inject(OrgContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  get dirty(): boolean {
    return !!this.settings && this.webSearchEnabled !== this.settings.webSearchEnabled;
  }

  ngOnInit(): void {
    this.orgContext.orgId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.load();
      });
  }

  load(): void {
    this.loading = true;
    this.cdr.markForCheck();

    this.api.getOrganizations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orgs) => {
          const selected = this.orgContext.snapshotId();
          this.org = (selected && orgs.find(o => o.id === selected)) || orgs[0] || null;
          if (!this.org) {
            this.settings = null;
            this.loading = false;
            this.cdr.markForCheck();
            return;
          }
          this.api.getAssistantSettings(this.org.id)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (s) => {
                this.settings = s;
                this.reset();
                this.loading = false;
                this.cdr.markForCheck();
              },
              error: () => this.failLoad(),
            });
        },
        error: () => this.failLoad(),
      });
  }

  reset(): void {
    this.webSearchEnabled = this.settings?.webSearchEnabled ?? false;
  }

  save(): void {
    if (!this.org) return;
    this.saving = true;
    this.cdr.markForCheck();

    this.api.updateAssistantSettings(this.org.id, { webSearchEnabled: this.webSearchEnabled })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (s) => {
          this.settings = s;
          this.reset();
          this.saving = false;
          this.snack.open('Saqlandi — keyingi savoldan boshlab amal qiladi', 'OK', { duration: 3500 });
          this.cdr.markForCheck();
        },
        error: (e) => {
          this.saving = false;
          this.snack.open(e?.error?.message || "Saqlab bo'lmadi", 'OK', { duration: 4000 });
          this.cdr.markForCheck();
        },
      });
  }

  private failLoad(): void {
    this.loading = false;
    this.snack.open("Sozlamalarni yuklab bo'lmadi", 'OK', { duration: 4000 });
    this.cdr.markForCheck();
  }
}

