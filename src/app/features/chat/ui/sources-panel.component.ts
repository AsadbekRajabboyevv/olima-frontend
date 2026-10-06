import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-sources-panel',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (sources().length > 0) {
      <div class="sources-list">
        <span class="sources-label">Manbalar:</span>
        @for (source of sources(); track source) {
          @if (isLink(source)) {
            <a class="source-chip" [href]="source" target="_blank" rel="noopener noreferrer" [matTooltip]="source">
              <mat-icon>link</mat-icon>
              {{ sourceLabel(source) }}
            </a>
          } @else {
            <span class="source-chip source-chip-static" [matTooltip]="source">
              <mat-icon>description</mat-icon>
              {{ sourceLabel(source) }}
            </span>
          }
        }
      </div>
    }
  `,
  styles: [`
    .sources-list {
      margin-top: 10px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      align-items: center;
    }
    .sources-label {
      font-size: 11px;
      font-weight: 600;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .source-chip {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 3px 8px;
      background: #f1f5f9;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      font-size: 12px;
      color: #334155;
      text-decoration: none;
      transition: all 0.15s ease;
      cursor: pointer;
    }
    .source-chip:hover {
      background: #e2e8f0;
      color: #0f172a;
    }
    .source-chip-static {
      cursor: default;
    }
    .source-chip-static:hover {
      background: #f1f5f9;
      color: #334155;
    }
    .source-chip mat-icon {
      font-size: 14px;
      width: 14px;
      height: 14px;
      color: #64748b;
    }
  `]
})
export class SourcesPanelComponent {
  readonly sources = input<string[]>([]);
  readonly orgName = input<string>('');

  isLink(source: string): boolean {
    return !!source && /^https?:\/\//i.test(source);
  }

  sourceLabel(source: string): string {
    if (this.isLink(source)) {
      try {
        return new URL(source).hostname.replace(/^www\./, '');
      } catch {
        return source;
      }
    }
    return this.formatInternalSourceLabel(source);
  }

  private formatInternalSourceLabel(source: string): string {
    const org = this.orgName();
    if (!source) {
      return org ? `${org} rasmiy hujjati` : 'Rasmiy hujjat';
    }

    const orgPrefix = org ? org.trim() : '';
    if (orgPrefix && source.toLowerCase().includes(orgPrefix.toLowerCase())) {
      return source;
    }

    let cleaned = source.replace(/\.[a-zA-Z0-9]{2,5}$/i, '');
    cleaned = cleaned.replace(/^\d{8,}[_\-\s]*/, '');
    cleaned = cleaned.replace(/[_\-]+/g, ' ').trim();

    const genericTerms = ['document', 'doc', 'file', 'fayl', 'hujjat', 'data', 'jadval', 'table', 'csv', 'pdf'];
    if (!cleaned || genericTerms.includes(cleaned.toLowerCase())) {
      return orgPrefix ? `${orgPrefix} rasmiy hujjati` : 'Rasmiy hujjat';
    }

    cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    return orgPrefix ? `${orgPrefix}: ${cleaned}` : cleaned;
  }
}
