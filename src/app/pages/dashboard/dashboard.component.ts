import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ConvTitlePipe } from '../../pipes/conv-title.pipe';
import { ApiService } from '../../services/api.service';
import { AuthService } from '../../services/auth.service';
import { OrgContextService } from '../../core/org/org-context.service';
import { Conversation, Execution, OrganizationUsage } from '../../models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [ConvTitlePipe,
    CommonModule, MatIconModule, MatButtonModule,
    MatTooltipModule, MatProgressSpinnerModule, RouterLink
  ],
  template: `
    <div class="page">
      <div class="page-head">
        <div class="page-head__text">
          <h1>Salom, {{ username }}</h1>
          <p *ngIf="orgName">
            <strong>{{ orgName }}</strong> tashkiloti bo'yicha umumiy holat.
          </p>
          <p *ngIf="!orgName">Tashkilot tanlanmagan.</p>
        </div>
        <div class="page-head__actions">
          <button mat-stroked-button routerLink="/knowledge">
            <mat-icon>upload_file</mat-icon> Hujjat yuklash
          </button>
          <button mat-flat-button color="primary" routerLink="/chat">
            <mat-icon>forum</mat-icon> Chatni sinash
          </button>
        </div>
      </div>

      <div class="stat-grid">
        <div class="stat" *ngIf="isSuperAdmin">
          <span class="icon-pill"><mat-icon>apartment</mat-icon></span>
          <div class="stat__body">
            <div class="stat__label">Tashkilotlar</div>
            <div class="stat__value">{{ orgCount }}</div>
          </div>
        </div>

        <div class="stat">
          <span class="icon-pill icon-pill--accent"><mat-icon>auto_stories</mat-icon></span>
          <div class="stat__body">
            <div class="stat__label">Bilim bazalari</div>
            <div class="stat__value">{{ kbCount }}</div>
          </div>
        </div>

        <div class="stat">
          <span class="icon-pill icon-pill--info"><mat-icon>handyman</mat-icon></span>
          <div class="stat__body">
            <div class="stat__label">Vositalar</div>
            <div class="stat__value">{{ toolCount }}</div>
          </div>
        </div>

        <div class="stat">
          <span class="icon-pill icon-pill--ok"><mat-icon>chat_bubble</mat-icon></span>
          <div class="stat__body">
            <div class="stat__label">Suhbatlar</div>
            <div class="stat__value">{{ convCount }}</div>
          </div>
        </div>

        <div class="stat">
          <span class="icon-pill icon-pill--warn"><mat-icon>flag</mat-icon></span>
          <div class="stat__body">
            <div class="stat__label">Murojaatlar</div>
            <div class="stat__value">{{ complaintCount }}</div>
          </div>
        </div>

        <div class="stat" *ngIf="usage" [matTooltip]="usageTooltip">
          <span class="icon-pill" [class.icon-pill--warn]="usagePercent >= 80"><mat-icon>data_usage</mat-icon></span>
          <div class="stat__body">
            <div class="stat__label">Oylik AI sarfi</div>
            <div class="stat__value">{{ usage.totalTokens | number }}</div>
            <div class="usage-bar" *ngIf="usage.monthlyQuota >= 0">
              <span [style.width.%]="usagePercent" [class.full]="usagePercent >= 100"></span>
            </div>
            <div class="usage-note">
              {{ usage.monthlyQuota >= 0 ? ('kvota: ' + (usage.monthlyQuota | number) + ' token') : 'cheklovsiz' }}
            </div>
          </div>
        </div>
      </div>

      <div class="cols">

        <div class="card">
          <div class="card__head">
            <span class="icon-pill"><mat-icon>chat_bubble</mat-icon></span>
            <h2 class="card__title grow">So'nggi suhbatlar</h2>
            <a mat-button color="primary" routerLink="/conversations">Hammasi</a>
          </div>

          <div class="list" *ngIf="recentConversations.length; else noConv">
            <a class="item" *ngFor="let c of recentConversations"
               [routerLink]="['/conversations', c.id]">
              <span class="item__dot"></span>
              <span class="item__body">
                <span class="item__title truncate">{{ c.title | convTitle:'Nomsiz suhbat' }}</span>
                <span class="item__meta">{{ c.createdAt | date:'dd.MM.yyyy HH:mm' }}</span>
              </span>
              <mat-icon class="item__go">chevron_right</mat-icon>
            </a>
          </div>
          <ng-template #noConv>
            <div class="mini-empty">
              <mat-icon>chat_bubble_outline</mat-icon>
              <span>Hali suhbat yo'q</span>
            </div>
          </ng-template>
        </div>

        <div class="card">
          <div class="card__head">
            <span class="icon-pill icon-pill--info"><mat-icon>bolt</mat-icon></span>
            <h2 class="card__title grow">So'nggi vosita chaqiruvlari</h2>
            <a mat-button color="primary" routerLink="/executions">Hammasi</a>
          </div>

          <div class="list" *ngIf="recentExecutions.length; else noExec">
            <div class="item item--static" *ngFor="let e of recentExecutions">
              <span class="item__body">
                <span class="item__title mono truncate">{{ e.toolName }}</span>
                <span class="item__meta">{{ e.createdAt | date:'dd.MM.yyyy HH:mm' }}</span>
              </span>
              <span class="tag" [class.tag--ok]="e.status === 'SUCCESS'"
                                [class.tag--err]="e.status === 'FAILED'">
                {{ e.status === 'SUCCESS' ? 'muvaffaqiyatli' : e.status === 'FAILED' ? 'xato' : e.status }}
              </span>
              <span class="dur mono">{{ e.durationMs }} ms</span>
            </div>
          </div>
          <ng-template #noExec>
            <div class="mini-empty">
              <mat-icon>bolt</mat-icon>
              <span>Hali vosita chaqirilmagan</span>
            </div>
          </ng-template>
        </div>
      </div>

      <div class="card embed">
        <div class="card__head">
          <span class="icon-pill icon-pill--accent"><mat-icon>code</mat-icon></span>
          <div class="grow">
            <h2 class="card__title">Saytingizga ulang</h2>
            <p class="embed__sub">Bu qatorni sayt sahifasining <span class="mono">&lt;/body&gt;</span> tegidan oldin qo'ying —
               quyi o'ng burchakda chat pufakchasi paydo bo'ladi.</p>
          </div>
          <button mat-stroked-button (click)="copySnippet()" [matTooltip]="copied ? 'Nusxalandi' : 'Nusxa olish'">
            <mat-icon>{{ copied ? 'check' : 'content_copy' }}</mat-icon>
            {{ copied ? 'Nusxalandi' : 'Nusxa olish' }}
          </button>
        </div>
        <pre class="snippet mono">{{ snippet }}</pre>
      </div>
    </div>
  `,
  styles: [`
    .cols {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
      gap: 16px;
      margin: 20px 0 16px;
    }

    .list { padding: 6px 8px 8px; }

    .item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      border-radius: 10px;
      text-decoration: none;
      color: inherit;
      transition: background .14s ease;
    }
    .item:not(.item--static):hover { background: #f6f8fc; }

    .item__dot {
      width: 7px; height: 7px; border-radius: 50%;
      background: var(--brand); flex-shrink: 0;
    }
    .item__body { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1 1 auto; }
    .item__title { font-size: 13.5px; font-weight: 600; color: var(--ink); }
    .item__meta  { font-size: 11.5px; color: var(--ink-4); }
    .item__go    { font-size: 19px; width: 19px; height: 19px; color: var(--ink-4); flex-shrink: 0; }

    .dur { color: var(--ink-4); flex-shrink: 0; min-width: 62px; text-align: right; }

    .mini-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      gap: 9px; padding: 40px 20px; color: var(--ink-4); font-size: 13px;
    }
    .mini-empty mat-icon { font-size: 26px; width: 26px; height: 26px; }

    .embed__sub { margin: 3px 0 0; font-size: 12.5px; color: var(--ink-3); line-height: 18px; }

    .snippet {
      margin: 0;
      padding: 16px 20px 18px;
      background: #0f172a;
      color: #cbd5e1;
      font-size: 12.5px;
      line-height: 20px;
      overflow-x: auto;
      border-bottom-left-radius: var(--r-lg);
      border-bottom-right-radius: var(--r-lg);
      white-space: pre;
    }

    .usage-bar { height: 5px; border-radius: 3px; background: #e2e8f0; margin-top: 6px; overflow: hidden; }
    .usage-bar span { display: block; height: 100%; background: var(--brand); }
    .usage-bar span.full { background: #dc2626; }
    .usage-note { font-size: 11px; color: var(--ink-4); margin-top: 3px; }
  `]
})
export class DashboardComponent implements OnInit {
  orgCount = 0;
  orgName = '';
  orgId = '';
  widgetKey = '';
  toolCount = 0;
  convCount = 0;
  kbCount = 0;
  complaintCount = 0;
  recentConversations: Conversation[] = [];
  recentExecutions: Execution[] = [];
  usage: OrganizationUsage | null = null;
  copied = false;

  get usagePercent(): number {
    if (!this.usage || this.usage.monthlyQuota < 0) return 0;
    if (this.usage.monthlyQuota === 0) return 100;
    return Math.min(100, Math.round(this.usage.totalTokens * 100 / this.usage.monthlyQuota));
  }

  get usageTooltip(): string {
    if (!this.usage) return '';
    return `Shu oy: ${this.usage.requests} ta so'rov, ${this.usage.promptTokens} kirish + ${this.usage.completionTokens} javob tokeni`;
  }

  private readonly apiService = inject(ApiService);
  private readonly authService = inject(AuthService);
  private readonly orgContext = inject(OrgContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  get isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  get username(): string {
    return this.authService.getCurrentUser()?.username || '';
  }

  get snippet(): string {
    const key = this.widgetKey || 'wk_...';
    return `<script src="${location.origin}/widget.js"\n        data-key="${key}"\n        async></script>`;
  }

  ngOnInit() {
    this.loadStats();
    this.orgContext.orgId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.loadStats();
      });
  }

  copySnippet() {
    navigator.clipboard?.writeText(this.snippet).then(() => {
      this.copied = true;
      this.cdr.markForCheck();
      setTimeout(() => {
        this.copied = false;
        this.cdr.markForCheck();
      }, 2000);
    });
  }

  loadStats() {
    this.apiService.getOrganizations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(orgs => {
        this.orgCount = orgs.length;

        const selectedOrgId = this.orgContext.snapshotId();
        const activeOrg = (selectedOrgId && orgs.find(o => o.id === selectedOrgId)) || orgs[0];
        this.orgName = activeOrg?.name || '';
        this.orgId = activeOrg?.id || '';
        this.widgetKey = activeOrg?.widgetKey || '';

        if (!this.orgId) {
          this.toolCount = this.convCount = this.kbCount = this.complaintCount = 0;
          this.recentConversations = [];
          this.recentExecutions = [];
          this.usage = null;
          this.cdr.markForCheck();
          return;
        }

        const emptyPage = { items: [], total: 0, page: 0, size: 0 };
        forkJoin({
          tools: this.apiService.getTools(this.orgId).pipe(catchError(() => of([]))),
          convs: this.apiService.getConversationsPage(this.orgId, 0, 5).pipe(catchError(() => of(emptyPage))),
          kbCount: this.apiService.countKnowledgeBases(this.orgId).pipe(catchError(() => of(0))),
          complaintCount: this.apiService.countComplaints(this.orgId).pipe(catchError(() => of(0))),
          execs: this.apiService.getExecutionsPage(this.orgId, 0, 5).pipe(catchError(() => of(emptyPage))),
          usage: this.apiService.getOrganizationUsage(this.orgId).pipe(catchError(() => of(null))),
        })
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe(r => {
            this.toolCount = r.tools.length;
            this.convCount = r.convs.total;
            this.kbCount = r.kbCount;
            this.complaintCount = r.complaintCount;
            this.recentConversations = r.convs.items as Conversation[];
            this.recentExecutions = r.execs.items as Execution[];
            this.usage = r.usage;
            this.cdr.markForCheck();
          });
      });
  }
}

