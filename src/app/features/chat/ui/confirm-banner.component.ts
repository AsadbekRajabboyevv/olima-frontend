import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-confirm-banner',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <mat-card class="confirmation-card">
      <mat-card-header>
        <mat-icon mat-card-avatar color="warn">warning</mat-icon>
        <mat-card-title>Amalni tasdiqlash talab etiladi</mat-card-title>
        <mat-card-subtitle>Murojaat qoralamasi yaratildi va uni yuborish uchun sizning tasdig'ingiz kerak.</mat-card-subtitle>
      </mat-card-header>
      <mat-card-actions align="end">
        <button mat-button color="warn" (click)="cancel.emit()">Bekor qilish</button>
        <button mat-raised-button color="primary" (click)="confirm.emit(complaintId())">Tasdiqlash</button>
      </mat-card-actions>
    </mat-card>
  `,
  styles: [`
    .confirmation-card {
      margin-top: 14px;
      border: 1px solid #fed7aa;
      background: #fffbeb;
      box-shadow: none;
    }
  `]
})
export class ConfirmBannerComponent {
  readonly complaintId = input<string | undefined>(undefined);
  readonly confirm = output<string | undefined>();
  readonly cancel = output<void>();
}
