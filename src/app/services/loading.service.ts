import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private static readonly SHOW_DELAY = 120;
  private static readonly MIN_VISIBLE = 350;

  readonly visible = signal(false);

  private pending = 0;
  private navigating = false;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private shownAt = 0;

  start(): void { this.pending++; this.update(); }
  stop(): void { this.pending = Math.max(0, this.pending - 1); this.update(); }
  setNavigating(on: boolean): void { this.navigating = on; this.update(); }

  private get busy(): boolean {
    return this.pending > 0 || this.navigating;
  }

  private update(): void {
    if (this.busy) {
      if (this.hideTimer) { clearTimeout(this.hideTimer); this.hideTimer = null; }
      if (!this.visible() && !this.showTimer) {
        this.showTimer = setTimeout(() => {
          this.showTimer = null;
          if (this.busy) { this.visible.set(true); this.shownAt = Date.now(); }
        }, LoadingService.SHOW_DELAY);
      }
      return;
    }
    if (this.showTimer) { clearTimeout(this.showTimer); this.showTimer = null; }
    if (this.visible() && !this.hideTimer) {
      const left = Math.max(0, LoadingService.MIN_VISIBLE - (Date.now() - this.shownAt));
      this.hideTimer = setTimeout(() => {
        this.hideTimer = null;
        if (!this.busy) this.visible.set(false);
      }, left);
    }
  }
}

