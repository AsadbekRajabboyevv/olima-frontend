import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { AuthSettings, AuthType, ConnectionRequest, IntegrationConnection } from '../../models';
import { HelpTipComponent } from '../../components/help-tip.component';

export interface ConnectionDialogData {
  connection?: IntegrationConnection;
}

interface AuthTypeOption {
  value: AuthType;
  label: string;
  hint: string;
}

@Component({
  selector: 'app-connection-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    HelpTipComponent
  ],
  template: `
    <h2 mat-dialog-title>{{ isEdit ? 'Ulanishni tahrirlash' : 'Yangi ulanish' }}</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="form">
        <div class="row">
          <mat-form-field appearance="outline" class="grow">
            <mat-label>Nomi</mat-label>
            <input matInput formControlName="name" placeholder="hemis">
            <app-help-tip matSuffix>Vositada shu nom bilan ulanadi: "connection": "{{ form.value.name || 'hemis' }}"</app-help-tip>
            <mat-error *ngIf="form.get('name')?.hasError('pattern')">Faqat kichik lotin harflari, raqam, _ va -</mat-error>
          </mat-form-field>
          <mat-checkbox formControlName="enabled" class="enabled">Faol</mat-checkbox>
        </div>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Tavsif</mat-label>
          <input matInput formControlName="description" placeholder="Talabalar ma'lumotlar tizimi">
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Asosiy manzil (base URL)</mat-label>
          <input matInput formControlName="baseUrl" placeholder="https://api.example.uz">
          <app-help-tip matSuffix>Vosita endpoint'lari shu manzilga nisbatan yoziladi: /students/&#123;id&#125;</app-help-tip>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full">
          <mat-label>Autentifikatsiya turi</mat-label>
          <mat-select formControlName="authType">
            <mat-option *ngFor="let t of authTypes" [value]="t.value">{{ t.label }}</mat-option>
          </mat-select>
          <app-help-tip matSuffix>{{ currentHint }}</app-help-tip>
        </mat-form-field>

        <div class="row" *ngIf="needsCredentials">
          <mat-form-field appearance="outline" class="grow">
            <mat-label>{{ isOauth ? 'Client ID' : 'Login (username)' }}</mat-label>
            <input matInput formControlName="username" autocomplete="off"
                   [placeholder]="savedPlaceholder(data.connection?.hasUsername)">
          </mat-form-field>
          <mat-form-field appearance="outline" class="grow">
            <mat-label>{{ isOauth ? 'Client secret' : 'Parol' }}</mat-label>
            <input matInput type="password" formControlName="password" autocomplete="new-password"
                   [placeholder]="savedPlaceholder(data.connection?.hasPassword)">
          </mat-form-field>
        </div>

        <mat-form-field appearance="outline" class="full" *ngIf="needsSecret">
          <mat-label>{{ authType === 'BEARER' ? 'Token' : 'API kalit' }}</mat-label>
          <input matInput type="password" formControlName="secret" autocomplete="new-password"
                 [placeholder]="savedPlaceholder(data.connection?.hasSecret)">
        </mat-form-field>

        <p class="secret-note" *ngIf="isEdit && (needsCredentials || needsSecret)">
          <mat-icon inline>lock</mat-icon>
          Maxfiy qiymatlar shifrlangan holda saqlanadi va qayta ko'rsatilmaydi. O'zgartirmoqchi
          bo'lmasangiz, bo'sh qoldiring.
        </p>

        <ng-container *ngIf="issuesTokens">
          <mat-form-field appearance="outline" class="full">
            <mat-label>{{ isOauth ? 'Token endpoint' : 'Login endpoint' }}</mat-label>
            <input matInput formControlName="tokenPath" [placeholder]="isOauth ? '/oauth/token' : '/api/auth/login'">
            <app-help-tip matSuffix>Nisbiy yo'l yoki shu hostdagi to'liq URL</app-help-tip>
          </mat-form-field>
          <div class="row">
            <mat-form-field appearance="outline" class="grow">
              <mat-label>Javobdagi token yo'li</mat-label>
              <input matInput formControlName="tokenJsonPath" placeholder="access_token">
              <app-help-tip matSuffix>Nuqta bilan: data.accessToken</app-help-tip>
            </mat-form-field>
            <mat-form-field appearance="outline" class="grow">
              <mat-label>Amal qilish muddati yo'li</mat-label>
              <input matInput formControlName="expiresInJsonPath" placeholder="expires_in">
              <app-help-tip matSuffix>Soniyalarda; bo'lmasa sukut muddat</app-help-tip>
            </mat-form-field>
          </div>
        </ng-container>

        <button type="button" mat-button class="advanced-toggle" *ngIf="authType !== 'NONE' && authType !== 'BASIC'"
                (click)="showAdvanced = !showAdvanced">
          <mat-icon>{{ showAdvanced ? 'expand_less' : 'expand_more' }}</mat-icon>
          Qo'shimcha sozlamalar
        </button>

        <div class="advanced" *ngIf="showAdvanced && authType !== 'NONE' && authType !== 'BASIC'">
          <ng-container *ngIf="authType === 'LOGIN'">
            <div class="row">
              <mat-form-field appearance="outline" class="grow">
                <mat-label>So'rov formati</mat-label>
                <mat-select formControlName="bodyFormat">
                  <mat-option value="JSON">JSON</mat-option>
                  <mat-option value="FORM">Form (x-www-form-urlencoded)</mat-option>
                </mat-select>
              </mat-form-field>
              <mat-form-field appearance="outline" class="grow">
                <mat-label>Login maydoni</mat-label>
                <input matInput formControlName="usernameField" placeholder="username">
              </mat-form-field>
              <mat-form-field appearance="outline" class="grow">
                <mat-label>Parol maydoni</mat-label>
                <input matInput formControlName="passwordField" placeholder="password">
              </mat-form-field>
            </div>
          </ng-container>

          <mat-form-field appearance="outline" class="full" *ngIf="isOauth">
            <mat-label>Scope</mat-label>
            <input matInput formControlName="scope" placeholder="read:students">
          </mat-form-field>

          <mat-form-field appearance="outline" class="full" *ngIf="issuesTokens">
            <mat-label>Qo'shimcha maydonlar (JSON)</mat-label>
            <textarea matInput formControlName="extraFields" rows="2" placeholder='{"grant_type": "password"}'></textarea>
            <mat-error *ngIf="form.get('extraFields')?.hasError('json')">JSON obyekt bo'lishi kerak</mat-error>
          </mat-form-field>

          <div class="row">
            <mat-form-field appearance="outline" class="grow">
              <mat-label>Sarlavha nomi</mat-label>
              <input matInput formControlName="headerName" [placeholder]="authType === 'API_KEY' ? 'X-API-Key' : 'Authorization'">
            </mat-form-field>
            <mat-form-field appearance="outline" class="grow">
              <mat-label>Qiymat prefiksi</mat-label>
              <input matInput formControlName="headerPrefix" [placeholder]="authType === 'API_KEY' ? '(yo\\'q)' : 'Bearer '">
            </mat-form-field>
            <mat-form-field appearance="outline" class="grow" *ngIf="issuesTokens">
              <mat-label>Sukut muddat (soniya)</mat-label>
              <input matInput type="number" min="1" formControlName="tokenTtlSeconds" placeholder="1800">
            </mat-form-field>
          </div>
        </div>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Bekor qilish</button>
      <button mat-raised-button color="primary" (click)="save()" [disabled]="form.invalid">Saqlash</button>
    </mat-dialog-actions>
  `,
  styles: [`
    .form { display: flex; flex-direction: column; gap: 4px; min-width: 560px; padding-top: 8px; }
    .row { display: flex; gap: 12px; align-items: flex-start; flex-wrap: wrap; }
    .grow { flex: 1; min-width: 160px; }
    .full { width: 100%; }
    .enabled { margin-top: 14px; }
    .secret-note { display: flex; gap: 6px; align-items: center; font-size: 12px; color: #64748b; margin: 0 0 8px; }
    .advanced-toggle { align-self: flex-start; margin-bottom: 4px; }
    .advanced { border-left: 3px solid #e2e8f0; padding-left: 12px; }
    @media (max-width: 640px) { .form { min-width: 0; } }
  `]
})
export class ConnectionDialogComponent {
  readonly authTypes: AuthTypeOption[] = [
    { value: 'LOGIN', label: 'Login endpoint (login/parol → token)', hint: "Login/parol yuborilib token olinadi, muddati tugaguncha qayta ishlatiladi" },
    { value: 'BASIC', label: 'HTTP Basic (login/parol)', hint: 'Har so\'rovda login va parol yuboriladi' },
    { value: 'BEARER', label: 'Doimiy token (Bearer)', hint: 'Tizim bergan doimiy token Authorization sarlavhasida yuboriladi' },
    { value: 'API_KEY', label: 'API kalit', hint: 'Kalit alohida sarlavhada yuboriladi (sukut: X-API-Key)' },
    { value: 'OAUTH2_CLIENT_CREDENTIALS', label: 'OAuth2 client credentials', hint: 'Client ID/secret bilan token olinadi' },
    { value: 'NONE', label: 'Autentifikatsiyasiz', hint: 'Ochiq API' }
  ];

  form: FormGroup;
  isEdit: boolean;
  showAdvanced = false;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ConnectionDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConnectionDialogData
  ) {
    const c = data.connection;
    const s: AuthSettings = c?.authConfig ?? {};
    this.isEdit = !!c;
    this.form = this.fb.group({
      name: [c?.name ?? '', [Validators.required, Validators.pattern(/^[a-z0-9_-]{1,64}$/)]],
      description: [c?.description ?? ''],
      baseUrl: [c?.baseUrl ?? '', [Validators.required, Validators.pattern(/^https?:\/\/\S+$/i)]],
      authType: [c?.authType ?? 'LOGIN', Validators.required],
      enabled: [c?.enabled ?? true],
      username: [''],
      password: [''],
      secret: [''],
      tokenPath: [s.tokenPath ?? ''],
      bodyFormat: [s.bodyFormat ?? 'JSON'],
      usernameField: [s.usernameField ?? ''],
      passwordField: [s.passwordField ?? ''],
      extraFields: [s.extraFields && Object.keys(s.extraFields).length ? JSON.stringify(s.extraFields) : '',
        [(ctrl: { value: string }) => this.jsonObjectError(ctrl.value)]],
      tokenJsonPath: [s.tokenJsonPath ?? ''],
      expiresInJsonPath: [s.expiresInJsonPath ?? ''],
      tokenTtlSeconds: [s.tokenTtlSeconds ?? null],
      headerName: [s.headerName ?? ''],
      headerPrefix: [s.headerPrefix ?? ''],
      scope: [s.scope ?? '']
    });
    this.showAdvanced = !!(s.usernameField || s.passwordField || s.headerName || s.extraFields || s.scope);
  }

  get authType(): AuthType {
    return this.form.value.authType;
  }

  get isOauth(): boolean {
    return this.authType === 'OAUTH2_CLIENT_CREDENTIALS';
  }

  get issuesTokens(): boolean {
    return this.authType === 'LOGIN' || this.isOauth;
  }

  get needsCredentials(): boolean {
    return this.authType === 'BASIC' || this.issuesTokens;
  }

  get needsSecret(): boolean {
    return this.authType === 'BEARER' || this.authType === 'API_KEY';
  }

  get currentHint(): string {
    return this.authTypes.find(t => t.value === this.authType)?.hint ?? '';
  }

  savedPlaceholder(saved?: boolean): string {
    return this.isEdit && saved ? '•••••• (saqlangan)' : '';
  }

  private jsonObjectError(value: string): { json: true } | null {
    if (!value || !value.trim()) return null;
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? null : { json: true };
    } catch {
      return { json: true };
    }
  }

  private text(value: unknown): string | null {
    return typeof value === 'string' && value.trim() ? value.trim() : null;
  }

  save(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    const authConfig: AuthSettings = {
      tokenPath: this.issuesTokens ? this.text(v.tokenPath) : null,
      bodyFormat: this.authType === 'LOGIN' ? v.bodyFormat : null,
      usernameField: this.authType === 'LOGIN' ? this.text(v.usernameField) : null,
      passwordField: this.authType === 'LOGIN' ? this.text(v.passwordField) : null,
      extraFields: this.issuesTokens && this.text(v.extraFields) ? JSON.parse(v.extraFields) : null,
      tokenJsonPath: this.issuesTokens ? this.text(v.tokenJsonPath) : null,
      expiresInJsonPath: this.issuesTokens ? this.text(v.expiresInJsonPath) : null,
      tokenTtlSeconds: this.issuesTokens && v.tokenTtlSeconds ? Number(v.tokenTtlSeconds) : null,
      headerName: this.text(v.headerName),

      headerPrefix: typeof v.headerPrefix === 'string' && v.headerPrefix.length ? v.headerPrefix : null,
      scope: this.isOauth ? this.text(v.scope) : null
    };
    const request: ConnectionRequest = {
      name: v.name.trim(),
      description: this.text(v.description),
      baseUrl: v.baseUrl.trim(),
      authType: this.authType,
      authConfig,
      enabled: v.enabled,

      username: this.needsCredentials ? this.text(v.username) : null,
      password: this.needsCredentials && v.password ? v.password : null,
      secret: this.needsSecret ? this.text(v.secret) : null
    };
    this.dialogRef.close(request);
  }
}

