import { ChangeDetectionStrategy, ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SidebarComponent } from './sidebar.component';
import { TopbarComponent } from './topbar.component';
import { BrandLoaderComponent } from '../../components/brand-loader.component';
import { AuthService } from '../../services/auth.service';
import { LoadingService } from '../../services/loading.service';
import { OrgContextService } from '../org/org-context.service';
import { OrgApiService } from '../org/data/org-api.service';
import { Organization } from '../org/org.models';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent, BrandLoaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="shell" [class.shell--collapsed]="collapsed">
      <app-sidebar
        [collapsed]="collapsed"
        [isSuperAdmin]="isSuperAdmin"
        (toggleCollapse)="collapsed = !collapsed">
      </app-sidebar>

      <div class="main">
        <app-topbar
          [pageTitle]="pageTitle"
          [organizations]="organizations"
          [selectedOrgId]="selectedOrgId"
          [isSuperAdmin]="isSuperAdmin"
          [username]="currentUsername"
          (orgChange)="onOrgChange($event)"
          (logout)="logout()"
          (logoutEverywhere)="logoutEverywhere()">
        </app-topbar>

        <div class="content">
          @if (orgsLoaded) {
            <router-outlet></router-outlet>
          }
        </div>

        @if (!orgsLoaded || loading.visible()) {
          <app-brand-loader></app-brand-loader>
        }
      </div>
    </div>
  `,
  styles: [`
    .shell {
      display: grid;
      grid-template-columns: var(--nav-w, 248px) 1fr;
      height: 100vh;
      transition: grid-template-columns .2s ease;
    }
    .shell--collapsed { grid-template-columns: 76px 1fr; }

    .main {
      display: flex;
      flex-direction: column;
      min-width: 0;
      position: relative;
    }
    .main > app-brand-loader { top: var(--bar-h, 64px); }

    .content {
      flex: 1 1 auto;
      overflow-y: auto;
    }

    @media (max-width: 980px) {
      .shell { grid-template-columns: 76px 1fr; }
    }
  `]
})
export class ShellComponent implements OnInit {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly orgContext = inject(OrgContextService);
  private readonly orgApi = inject(OrgApiService);
  private readonly legacyApi = inject(ApiService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroyRef = inject(DestroyRef);
  readonly loading = inject(LoadingService);

  organizations: Organization[] = [];
  selectedOrgId: string | null = null;
  orgsLoaded = false;
  collapsed = false;
  pageTitle = 'Boshqaruv paneli';

  private readonly titles: Record<string, string> = {
    '/dashboard': 'Boshqaruv paneli',
    '/chat': 'Chat sinovi',
    '/knowledge': 'Bilimlar bazasi',
    '/tools': 'Vositalar',
    '/connections': 'Tashqi tizim ulanishlari',
    '/telegram': 'Telegram bot',
    '/conversations': 'Suhbatlar',
    '/executions': 'Bajarilgan amallar',
    '/complaints': 'Murojaatlar',
    '/billing': 'Hisob-kitob',
    '/assistant': 'Yordamchi sozlamalari',
    '/widget': 'Widget sozlamalari',
    '/organizations': 'Tashkilotlar',
    '/users': 'Adminlar',
  };

  get isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  get currentUsername(): string {
    return this.authService.getCurrentUser()?.username || '';
  }

  ngOnInit(): void {
    this.setTitle(this.router.url);

    this.selectedOrgId = this.orgContext.snapshotId() || null;
    this.orgContext.orgId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => {
        this.selectedOrgId = id;
        this.cdr.markForCheck();
      });

    this.router.events
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((e) => {
        if (e instanceof NavigationStart) this.loading.setNavigating(true);
        else if (e instanceof NavigationEnd || e instanceof NavigationCancel || e instanceof NavigationError) {
          this.loading.setNavigating(false);
        }

        if (e instanceof NavigationEnd) {
          this.setTitle(e.urlAfterRedirects);
          this.cdr.markForCheck();
        }

        if (e instanceof NavigationError && /dynamically imported module|Loading chunk|Importing a module script|MIME type/i.test(String(e.error?.message ?? e.error))) {
          location.assign(e.url);
        }
      });

    if (this.authService.isAuthenticated()) {
      this.loadOrganizations();
    }
  }

  private setTitle(url: string): void {
    const match = Object.keys(this.titles)
      .filter(p => url.startsWith(p))
      .sort((a, b) => b.length - a.length)[0];
    this.pageTitle = match ? this.titles[match] : 'OLIMA AI';
  }

  loadOrganizations(resetSelection = true): void {
    this.orgApi.getOrganizations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (orgs) => {
          this.organizations = orgs;
          const saved = this.orgContext.snapshotId();
          let currentOrg: Organization | undefined;
          if (saved && orgs.some(o => o.id === saved)) {
            currentOrg = orgs.find(o => o.id === saved);
            if (currentOrg) {
              this.orgContext.select(saved, currentOrg.name);
            }
          } else if (orgs.length > 0 && resetSelection) {
            currentOrg = orgs[0];
            this.orgContext.select(currentOrg.id, currentOrg.name);
          }
          this.orgsLoaded = true;
          this.cdr.markForCheck();
        },
        error: () => {
          this.orgsLoaded = true;
          this.cdr.markForCheck();
        }
      });
  }

  onOrgChange(orgId: string): void {
    const org = this.organizations.find(o => o.id === orgId);
    this.orgContext.select(orgId, org?.name);
  }

  logout(): void {
    this.authService.logout();
  }

  logoutEverywhere(): void {
    if (!confirm('Barcha qurilmalardagi sessiyalar yopiladi. Davom etasizmi?')) return;
    this.legacyApi.logoutEverywhere()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.authService.logout(),
        error: () => this.authService.logout()
      });
  }
}
