import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TextFieldModule } from '@angular/cdk/text-field';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-chat-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TextFieldModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="chat-input-area">
      <mat-form-field appearance="outline" class="input-field" subscriptSizing="dynamic">
        <textarea matInput
                  [(ngModel)]="userInput"
                  placeholder="Xabaringizni yozing... (Yangi qator uchun Shift+Enter)"
                  rows="1"
                  cdkTextareaAutosize
                  cdkAutosizeMinRows="1"
                  cdkAutosizeMaxRows="5"
                  (keydown)="onKeyDown($event)"></textarea>
        <button mat-icon-button matSuffix color="primary" (click)="submit()" [disabled]="!userInput.trim() || loading()">
          <mat-icon>send</mat-icon>
        </button>
      </mat-form-field>
    </div>
  `,
  styles: [`
    .chat-input-area {
      padding: 16px;
      border-top: 1px solid #e2e8f0;
      background: white;
      display: flex;
      flex-shrink: 0;
    }
    .input-field {
      width: 100%;
    }
    .input-field textarea {
      resize: none;
      max-height: 120px;
    }
  `]
})
export class ChatInputComponent {
  readonly loading = input<boolean>(false);
  readonly send = output<string>();

  userInput = '';

  onKeyDown(event: KeyboardEvent): void {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      this.submit();
    }
  }

  submit(): void {
    const trimmed = this.userInput.trim();
    if (!trimmed || this.loading()) return;
    this.send.emit(trimmed);
    this.userInput = '';
  }
}
