import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatMenuModule } from '@angular/material/menu';
import { Organization } from '../org/org.models';

@Component({
  selector: 'app-topbar',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatSelectModule, MatFormFieldModule, MatMenuModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header class="bar">
      <div class="bar__left">
        <span class="bar__crumb">{{ pageTitle() }}</span>
      </div>

      <div class="bar__right">
        @if (isSuperAdmin() && organizations().length > 0) {
          <div class="org-pick">
            <mat-icon class="org-pick__icon">apartment</mat-icon>
            <mat-form-field appearance="outline" subscriptSizing="dynamic" class="org-pick__field">
              <mat-select [ngModel]="selectedOrgId()" (selectionChange)="orgChange.emit($event.value)"
                          placeholder="Tashkilot">
                @for (org of organizations(); track org.id) {
                  <mat-option [value]="org.id">{{ org.name }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
          </div>
        }

        @if (!isSuperAdmin() && organizations().length > 0) {
          <div class="org-fixed">
            <mat-icon>apartment</mat-icon>
            <span class="truncate">{{ organizations()[0].name }}</span>
          </div>
        }

        <button class="who" [matMenuTriggerFor]="userMenu">
          <span class="who__ava">{{ initials() }}</span>
          <span class="who__meta">
            <span class="who__name">{{ username() }}</span>
            <span class="who__role">{{ isSuperAdmin() ? 'Super admin' : 'Tashkilot admini' }}</span>
          </span>
          <mat-icon class="who__caret">expand_more</mat-icon>
        </button>
        <mat-menu #userMenu="matMenu" xPosition="before">
          <div class="menu-head">
            <strong>{{ username() }}</strong>
            <span>{{ isSuperAdmin() ? 'Super admin' : 'Tashkilot admini' }}</span>
          </div>
          <button mat-menu-item (click)="logout.emit()">
            <mat-icon>logout</mat-icon>
            <span>Chiqish</span>
          </button>
          <button mat-menu-item (click)="logoutEverywhere.emit()">
            <mat-icon>devices</mat-icon>
            <span>Barcha qurilmalardan chiqish</span>
          </button>
        </mat-menu>
      </div>
    </header>
  `,
  styles: [`
    .bar {
      height: var(--bar-h, 64px);
      flex-shrink: 0;
      background: rgba(255,255,255,.86);
      backdrop-filter: blur(10px);
      border-bottom: 1px solid var(--edge, #e2e8f0);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
      padding: 0 22px 0 28px;
      position: sticky; top: 0; z-index: 10;
    }

    .bar__crumb { font-size: 15px; font-weight: 650; color: var(--ink, #0f172a); letter-spacing: -0.01em; }
    .bar__right { display: flex; align-items: center; gap: 12px; }

    .org-pick { display: flex; align-items: center; gap: 8px; }
    .org-pick__icon { font-size: 19px; width: 19px; height: 19px; color: var(--ink-4, #94a3b8); }
    .org-pick__field { width: 228px; }
    ::ng-deep .org-pick__field .mat-mdc-text-field-wrapper { background: #f6f7fb; }
    ::ng-deep .org-pick__field .mdc-notched-outline__leading,
    ::ng-deep .org-pick__field .mdc-notched-outline__notch,
    ::ng-deep .org-pick__field .mdc-notched-outline__trailing { border-color: var(--edge, #e2e8f0) !important; }

    .org-fixed {
      display: flex; align-items: center; gap: 7px;
      max-width: 240px;
      height: 36px; padding: 0 12px;
      background: #f6f7fb; border: 1px solid var(--edge, #e2e8f0);
      border-radius: 10px;
      font-size: 13px; font-weight: 600; color: var(--ink-2, #334155);
    }
    .org-fixed mat-icon { font-size: 18px; width: 18px; height: 18px; color: var(--ink-4, #94a3b8); }

    .who {
      display: flex; align-items: center; gap: 9px;
      height: 40px; padding: 0 8px 0 6px;
      border: 1px solid transparent; background: transparent;
      border-radius: 11px; cursor: pointer; font-family: inherit;
      transition: background .14s ease, border-color .14s ease;
    }
    .who:hover { background: #f5f7fb; border-color: var(--edge, #e2e8f0); }
    .who__ava {
      width: 30px; height: 30px; border-radius: 9px;
      display: grid; place-items: center;
      background: linear-gradient(135deg, var(--brand, #4338ca) 0%, var(--accent, #6366f1) 100%);
      color: #fff; font-size: 12px; font-weight: 700; letter-spacing: .02em;
    }
    .who__meta { display: flex; flex-direction: column; align-items: flex-start; line-height: 1.25; }
    .who__name { font-size: 13px; font-weight: 650; color: var(--ink, #0f172a); }
    .who__role { font-size: 11px; color: var(--ink-4, #94a3b8); }
    .who__caret { font-size: 18px; width: 18px; height: 18px; color: var(--ink-4, #94a3b8); }

    .menu-head {
      display: flex; flex-direction: column; gap: 2px;
      padding: 10px 16px 11px;
      border-bottom: 1px solid var(--edge-2, #f1f5f9);
      margin-bottom: 4px;
    }
    .menu-head strong { font-size: 13.5px; color: var(--ink, #0f172a); }
    .menu-head span { font-size: 11.5px; color: var(--ink-4, #94a3b8); }

    @media (max-width: 980px) {
      .who__meta { display: none; }
      .org-pick__field { width: 160px; }
    }
  `]
})
export class TopbarComponent {
  readonly pageTitle = input<string>('Boshqaruv paneli');
  readonly organizations = input<Organization[]>([]);
  readonly selectedOrgId = input<string | null>(null);
  readonly isSuperAdmin = input<boolean>(false);
  readonly username = input<string>('');

  readonly orgChange = output<string>();
  readonly logout = output<void>();
  readonly logoutEverywhere = output<void>();

  readonly initials = computed(() => {
    const name = this.username().trim();
    return name ? name.slice(0, 2).toUpperCase() : '?';
  });
}
