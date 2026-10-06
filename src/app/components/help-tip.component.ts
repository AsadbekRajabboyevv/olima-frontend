import { Component } from '@angular/core';
import { CdkOverlayOrigin, ConnectedPosition, OverlayModule } from '@angular/cdk/overlay';

@Component({
  selector: 'app-help-tip',
  standalone: true,
  imports: [OverlayModule],
  template: `
    <button type="button" class="help-btn" cdkOverlayOrigin #origin="cdkOverlayOrigin"
            aria-label="Izoh" [attr.aria-expanded]="open" [class.active]="open"
            (click)="toggle($event)">?</button>
    <ng-template cdkConnectedOverlay
                 [cdkConnectedOverlayOrigin]="origin"
                 [cdkConnectedOverlayOpen]="open"
                 [cdkConnectedOverlayPositions]="positions"
                 (overlayOutsideClick)="onOutsideClick($event, origin)"
                 (overlayKeydown)="$event.key === 'Escape' && (open = false)"
                 (detach)="open = false">
      <div class="help-pop" role="tooltip"><ng-content></ng-content></div>
    </ng-template>
  `,
  styles: [`
    :host { display: inline-flex; align-items: center; padding: 0 8px; }
    .help-btn {
      width: 20px; height: 20px; border-radius: 50%; padding: 0;
      border: 1px solid #cbd5e1; background: #f8fafc; color: #64748b;
      font: 600 12px/1 inherit; cursor: pointer; display: grid; place-items: center;
      transition: background .15s, color .15s, border-color .15s;
    }
    .help-btn:hover, .help-btn.active { background: #1a237e; border-color: #1a237e; color: #fff; }
    .help-btn:focus-visible { outline: 2px solid #1a237e; outline-offset: 2px; }
    .help-pop {
      max-width: 300px; padding: 10px 12px; border-radius: 8px;
      background: #1e293b; color: #f1f5f9; font-size: 13px; line-height: 1.45;
      box-shadow: 0 8px 24px rgba(15, 23, 42, .25);
    }
    .help-pop a { color: #93c5fd; }
  `]
})
export class HelpTipComponent {
  open = false;

  readonly positions: ConnectedPosition[] = [
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetY: 8 },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetY: -8 }
  ];

  toggle(event: MouseEvent): void {

    event.stopPropagation();
    this.open = !this.open;
  }

  onOutsideClick(event: MouseEvent, origin: CdkOverlayOrigin): void {

    if (!origin.elementRef.nativeElement.contains(event.target as Node)) {
      this.open = false;
    }
  }
}

