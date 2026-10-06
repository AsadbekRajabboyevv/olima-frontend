import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

export interface NavItem {
  path: string;
  icon: string;
  label: string;
  superOnly?: boolean;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <aside class="nav" [class.nav--collapsed]="collapsed()">
      <a class="brand" routerLink="/dashboard">
        <img src="assets/logo-96.png" alt="OLIMA AI" class="brand__logo">
        <span class="brand__text">
          <span class="brand__name">OLIMA AI</span>
          <span class="brand__sub">boshqaruv paneli</span>
        </span>
      </a>

      <nav class="nav__scroll">
        @for (group of navGroups; track group.title) {
          @if (visible(group).length) {
            <div class="nav__group">
              <div class="nav__label">{{ group.title }}</div>
              @for (item of visible(group); track item.path) {
                <a class="nav__item"
                   [routerLink]="item.path"
                   routerLinkActive="is-active"
                   [matTooltip]="collapsed() ? item.label : ''"
                   matTooltipPosition="right">
                  <mat-icon>{{ item.icon }}</mat-icon>
                  <span class="nav__text">{{ item.label }}</span>
                </a>
              }
            </div>
          }
        }
      </nav>

      <div class="nav__foot">
        <button class="nav__collapse" (click)="toggleCollapse.emit()"
                [matTooltip]="collapsed() ? 'Yoyish' : 'Yig\\'ish'" matTooltipPosition="right">
          <mat-icon>{{ collapsed() ? 'chevron_right' : 'chevron_left' }}</mat-icon>
          <span class="nav__text">Yig'ish</span>
        </button>
      </div>
    </aside>
  `,
  styles: [`
    .nav {
      position: relative;
      background: linear-gradient(185deg, #241f5c 0%, #1e1b4b 42%, #191734 100%);
      display: flex;
      flex-direction: column;
      height: 100%;
      min-width: 0;
      overflow: hidden;
    }

    .nav::after {
      content: '';
      position: absolute;
      width: 300px; height: 300px;
      top: -110px; left: -90px;
      background: #7c3aed;
      filter: blur(90px);
      opacity: .38;
      pointer-events: none;
    }
    .nav > * { position: relative; z-index: 1; }

    .brand {
      display: flex;
      align-items: center;
      gap: 11px;
      height: var(--bar-h, 64px);
      padding: 0 18px;
      border-bottom: 1px solid rgba(255,255,255,.09);
      text-decoration: none;
      flex-shrink: 0;
    }
    .brand__logo {
      width: 32px; height: 32px;
      border-radius: 9px;
      flex-shrink: 0;
      object-fit: contain;
      background: rgba(255,255,255,.1);
      padding: 3px;
    }
    .brand__text { display: flex; flex-direction: column; min-width: 0; }
    .brand__name {
      font-size: 15px; font-weight: 700; color: #fff;
      letter-spacing: .3px; line-height: 1.15;
    }
    .brand__sub {
      font-size: 11px; color: #a5b4fc; text-transform: uppercase;
      letter-spacing: .7px; font-weight: 500;
    }

    .nav__scroll {
      flex: 1;
      overflow-y: auto;
      padding: 14px 10px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    .nav__group { display: flex; flex-direction: column; gap: 2px; }
    .nav__label {
      font-size: 10.5px;
      font-weight: 700;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: .8px;
      padding: 6px 12px 4px;
    }

    .nav__item {
      display: flex;
      align-items: center;
      gap: 11px;
      padding: 8px 12px;
      border-radius: 9px;
      color: #cbd5e1;
      text-decoration: none;
      font-size: 13.5px;
      font-weight: 500;
      transition: all .15s ease;
      position: relative;
    }
    .nav__item mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      color: #94a3b8;
      flex-shrink: 0;
      transition: color .15s ease;
    }
    .nav__text {
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .nav__item:hover {
      background: rgba(255,255,255,.07);
      color: #fff;
    }
    .nav__item:hover mat-icon { color: #fff; }

    .nav__item.is-active {
      background: linear-gradient(90deg, rgba(99,102,241,.32) 0%, rgba(99,102,241,.18) 100%);
      color: #fff;
      font-weight: 600;
    }
    .nav__item.is-active mat-icon { color: #a5b4fc; }

    .nav__item.is-active::before {
      content: '';
      position: absolute;
      left: 0; top: 6px; bottom: 6px;
      width: 3px;
      border-radius: 0 3px 3px 0;
      background: #818cf8;
    }

    .nav__foot {
      padding: 10px;
      border-top: 1px solid rgba(255,255,255,.09);
      flex-shrink: 0;
    }
    .nav__collapse {
      width: 100%;
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 8px 12px;
      background: transparent;
      border: 0;
      border-radius: 8px;
      color: #94a3b8;
      cursor: pointer;
      font-size: 13px;
      font-weight: 500;
      transition: all .15s ease;
    }
    .nav__collapse:hover {
      background: rgba(255,255,255,.07);
      color: #fff;
    }
    .nav__collapse mat-icon {
      font-size: 20px;
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }

    .nav--collapsed .nav__text,
    .nav--collapsed .brand__text,
    .nav--collapsed .nav__label {
      display: none;
    }
    .nav--collapsed .nav__item,
    .nav--collapsed .nav__collapse,
    .nav--collapsed .brand {
      justify-content: center;
      padding: 0;
    }
  `]
})
export class SidebarComponent {
  readonly collapsed = input<boolean>(false);
  readonly isSuperAdmin = input<boolean>(false);
  readonly toggleCollapse = output<void>();

  readonly navGroups: NavGroup[] = [
    {
      title: 'Umumiy',
      items: [
        { path: '/dashboard', icon: 'space_dashboard', label: 'Boshqaruv paneli' },
        { path: '/chat', icon: 'forum', label: 'Chat sinovi' },
      ],
    },
    {
      title: 'Bilim va vositalar',
      items: [
        { path: '/knowledge', icon: 'auto_stories', label: 'Bilimlar bazasi' },
        { path: '/tools', icon: 'handyman', label: 'Vositalar' },
        { path: '/connections', icon: 'hub', label: 'Ulanishlar' },
        { path: '/telegram', icon: 'send', label: 'Telegram bot' },
      ],
    },
    {
      title: 'Faoliyat',
      items: [
        { path: '/conversations', icon: 'chat_bubble', label: 'Suhbatlar' },
        { path: '/executions', icon: 'history', label: 'Bajarilgan amallar' },
        { path: '/complaints', icon: 'flag', label: 'Murojaatlar' },
      ],
    },
    {
      title: 'Boshqaruv',
      items: [
        { path: '/billing', icon: 'credit_card', label: 'Hisob-kitob' },
        { path: '/assistant', icon: 'tune', label: 'Yordamchi sozlamalari' },
        { path: '/widget', icon: 'waving_hand', label: 'Widget sozlamalari' },
        { path: '/organizations', icon: 'apartment', label: 'Tashkilotlar', superOnly: true },
        { path: '/users', icon: 'shield_person', label: 'Adminlar', superOnly: true },
      ],
    },
  ];

  visible(group: NavGroup): NavItem[] {
    return group.items.filter(i => !i.superOnly || this.isSuperAdmin());
  }
}
