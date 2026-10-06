import { ChangeDetectionStrategy, ChangeDetectorRef, Component, inject, input } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MapLocation } from '../chat.models';

@Component({
  selector: 'app-map-preview',
  standalone: true,
  imports: [CommonModule, DecimalPipe, MatButtonModule, MatIconModule, MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (locations().length > 0) {
      <div class="maps-container">
        @for (loc of locations(); track loc.lat + '_' + loc.lng) {
          <div class="map-card">
            <div class="map-header">
              <div class="map-header-left">
                <mat-icon class="map-pin-icon">place</mat-icon>
                <div class="map-title-group">
                  <span class="map-title">{{ loc.title || 'Joylashuv xaritasi' }}</span>
                  @if (loc.address) {
                    <span class="map-address">{{ loc.address }}</span>
                  }
                </div>
              </div>

              <div class="map-header-right">
                <div class="coords-badge"
                     (click)="copyCoordinates(loc.lat + ', ' + loc.lng)"
                     [matTooltip]="copiedCoord === (loc.lat + ', ' + loc.lng) ? 'Nusxalandi!' : 'Koordinatani nusxalash'">
                  <span>📍 {{ loc.lat | number:'1.4-6' }}, {{ loc.lng | number:'1.4-6' }}</span>
                  <mat-icon class="copy-small-icon">{{ copiedCoord === (loc.lat + ', ' + loc.lng) ? 'check' : 'content_copy' }}</mat-icon>
                </div>

                <a [href]="'https://www.google.com/maps?q=' + loc.lat + ',' + loc.lng"
                   target="_blank"
                   mat-stroked-button
                   class="map-nav-btn"
                   matTooltip="Google Maps'da ochish">
                  <mat-icon class="nav-icon">map</mat-icon>
                  <span>Google</span>
                </a>

                <a [href]="'https://yandex.com/maps/?text=' + loc.lat + ',' + loc.lng"
                   target="_blank"
                   mat-stroked-button
                   class="map-nav-btn"
                   matTooltip="Yandex Maps'da ochish">
                  <mat-icon class="nav-icon">navigation</mat-icon>
                  <span>Yandex</span>
                </a>
              </div>
            </div>

            <div class="map-viewport">
              <iframe
                class="map-iframe"
                [src]="getSafeMapUrl(loc.lat, loc.lng)"
                loading="lazy"
                title="Xarita">
              </iframe>
            </div>
          </div>
        }
      </div>
    }
  `,
  styles: [`
    .maps-container {
      margin-top: 14px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .map-card {
      border: 1px solid #e2e8f0;
      border-radius: 10px;
      overflow: hidden;
      background: #ffffff;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
    }
    .map-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 14px;
      background: #f8fafc;
      border-bottom: 1px solid #e2e8f0;
      gap: 12px;
      flex-wrap: wrap;
    }
    .map-header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
    }
    .map-pin-icon {
      color: #ef4444;
      font-size: 22px;
      width: 22px;
      height: 22px;
      flex-shrink: 0;
    }
    .map-title-group {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }
    .map-title {
      font-size: 13px;
      font-weight: 600;
      color: #0f172a;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .map-address {
      font-size: 11.5px;
      color: #64748b;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .map-header-right {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-shrink: 0;
    }
    .coords-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      padding: 4px 8px;
      background: #e2e8f0;
      border-radius: 6px;
      font-size: 11.5px;
      font-family: monospace;
      color: #334155;
      cursor: pointer;
      user-select: none;
      transition: background 0.15s ease;
    }
    .coords-badge:hover {
      background: #cbd5e1;
    }
    .copy-small-icon {
      font-size: 13px;
      width: 13px;
      height: 13px;
      color: #64748b;
    }
    .map-nav-btn {
      font-size: 11.5px !important;
      height: 28px !important;
      line-height: 28px !important;
      padding: 0 8px !important;
      border-radius: 6px !important;
    }
    .nav-icon {
      font-size: 14px !important;
      width: 14px !important;
      height: 14px !important;
      margin-right: 2px !important;
      vertical-align: middle;
    }
    .map-viewport {
      height: 260px;
      width: 100%;
      background: #f1f5f9;
    }
    .map-iframe {
      width: 100%;
      height: 100%;
      border: 0;
    }
  `]
})
export class MapPreviewComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly locations = input<MapLocation[]>([]);
  copiedCoord?: string;

  private readonly sanitizedMapUrlCache = new Map<string, SafeResourceUrl>();

  getSafeMapUrl(lat: number, lng: number): SafeResourceUrl {
    const key = `${lat.toFixed(5)}_${lng.toFixed(5)}`;
    if (this.sanitizedMapUrlCache.has(key)) {
      return this.sanitizedMapUrlCache.get(key)!;
    }
    const delta = 0.007;
    const minLng = (lng - delta).toFixed(5);
    const minLat = (lat - delta).toFixed(5);
    const maxLng = (lng + delta).toFixed(5);
    const maxLat = (lat + delta).toFixed(5);
    const bbox = `${minLng}%2C${minLat}%2C${maxLng}%2C${maxLat}`;
    const url = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
    const safeUrl = this.sanitizer.bypassSecurityTrustResourceUrl(url);
    this.sanitizedMapUrlCache.set(key, safeUrl);
    return safeUrl;
  }

  copyCoordinates(coordText: string): void {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(coordText).then(() => {
        this.copiedCoord = coordText;
        this.cdr.markForCheck();
        setTimeout(() => {
          if (this.copiedCoord === coordText) {
            this.copiedCoord = undefined;
            this.cdr.markForCheck();
          }
        }, 2000);
      });
    }
  }
}
