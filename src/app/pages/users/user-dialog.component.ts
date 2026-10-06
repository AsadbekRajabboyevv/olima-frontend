import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { OrgApiService } from '../../core/org/data/org-api.service';
import { Organization } from '../../models';
import { HelpTipComponent } from '../../components/help-tip.component';

@Component({
  selector: 'app-user-dialog',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    HelpTipComponent
  ],
  template: `
    <h2 mat-dialog-title>Yangi admin qo'shish</h2>
    <form [formGroup]="userForm" (ngSubmit)="onSubmit()">
      <mat-dialog-content class="dialog-content">
        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Login</mat-label>
          <input matInput formControlName="username" placeholder="masalan: transport_admin" required>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Parol</mat-label>
          <input matInput type="password" formControlName="password" autocomplete="new-password" required>
          <app-help-tip matSuffix>Kamida {{ minPasswordLength }} belgi, harf va raqam aralash (aniq talabni server tekshiradi)</app-help-tip>
          <mat-error *ngIf="userForm.get('password')?.hasError('minlength')">Parol juda qisqa</mat-error>
          <mat-error *ngIf="userForm.get('password')?.hasError('letterDigit')">Kamida bitta harf va bitta raqam bo'lsin</mat-error>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width">
          <mat-label>Rol</mat-label>
          <mat-select formControlName="role">
            <mat-option value="ORG_ADMIN">Tashkilot admini</mat-option>
            <mat-option value="SUPER_ADMIN">Super admin</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline" class="full-width" *ngIf="userForm.get('role')?.value === 'ORG_ADMIN'">
          <mat-label>Tashkilot</mat-label>
          <mat-select formControlName="organizationId">
            <mat-option *ngFor="let org of organizations" [value]="org.id">{{ org.name }}</mat-option>
          </mat-select>
        </mat-form-field>
      </mat-dialog-content>

      <mat-dialog-actions align="end">
        <button type="button" mat-button (click)="onCancel()">Bekor qilish</button>
        <button type="submit" mat-raised-button color="primary" [disabled]="userForm.invalid">
          Yaratish
        </button>
      </mat-dialog-actions>
    </form>
  `,
  styles: [`
    .dialog-content {
      display: flex;
      flex-direction: column;
      gap: 16px;
      min-width: 400px;
      padding-top: 12px;
    }
    .full-width {
      width: 100%;
    }
  `]
})
export class UserDialogComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly orgApi = inject(OrgApiService);
  private readonly dialogRef = inject(MatDialogRef<UserDialogComponent>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly minPasswordLength = 10;
  userForm: FormGroup;
  organizations: Organization[] = [];

  constructor() {
    this.userForm = this.fb.group({
      username: ['', [Validators.required, Validators.maxLength(100)]],
      password: ['', [
        Validators.required,
        Validators.minLength(this.minPasswordLength),
        Validators.maxLength(128),
        (ctrl: { value: string }) => {
          const v = ctrl.value || '';
          return !v || (/\p{L}/u.test(v) && /\d/.test(v)) ? null : { letterDigit: true };
        }
      ]],
      role: ['ORG_ADMIN', Validators.required],
      organizationId: ['', Validators.required]
    });
  }

  ngOnInit(): void {
    this.orgApi.getOrganizations()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(orgs => {
        this.organizations = orgs;
        this.cdr.markForCheck();
      });

    this.userForm.get('role')?.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(role => {
        const orgControl = this.userForm.get('organizationId');
        if (role === 'ORG_ADMIN') {
          orgControl?.setValidators(Validators.required);
        } else {
          orgControl?.clearValidators();
          orgControl?.setValue('');
        }
        orgControl?.updateValueAndValidity();
        this.cdr.markForCheck();
      });
  }

  onSubmit(): void {
    if (this.userForm.valid) {
      const value = { ...this.userForm.value };
      if (value.role !== 'ORG_ADMIN') {
        delete value.organizationId;
      }
      this.dialogRef.close(value);
    }
  }

  onCancel(): void {
    this.dialogRef.close();
  }
}

