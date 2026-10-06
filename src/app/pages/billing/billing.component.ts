import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  DestroyRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BillingApiService } from '../../features/billing/data/billing-api.service';
import { AuthService } from '../../services/auth.service';
import { OrgContextService } from '../../core/org/org-context.service';
import { Invoice, OrganizationBillingRow, TokenRate, TokenRateRequest } from '../../models';
import { HelpTipComponent } from '../../components/help-tip.component';

@Component({
  selector: 'app-billing',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    HelpTipComponent
  ],
  templateUrl: './billing.component.html',
  styleUrl: './billing.component.scss'
})
export class BillingComponent implements OnInit {
  private readonly billingApi = inject(BillingApiService);
  private readonly authService = inject(AuthService);
  private readonly snack = inject(MatSnackBar);
  private readonly orgContext = inject(OrgContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  orgId = '';
  orgName = '';
  loading = false;
  saving = false;
  readonly currentMonth = this.monthOf(new Date());
  month = this.currentMonth;

  invoice: Invoice | null = null;
  summary: OrganizationBillingRow[] = [];
  defaultRate: TokenRate | null = null;
  defaultForm: TokenRateRequest = { inputPricePerMillion: 0, outputPricePerMillion: 0 };
  orgForm: TokenRateRequest = { inputPricePerMillion: 0, outputPricePerMillion: 0 };

  get isSuperAdmin(): boolean {
    return this.authService.isSuperAdmin();
  }

  get monthLabel(): string {
    const [y, m] = this.month.split('-').map(Number);
    return new Date(y, m - 1, 1).toLocaleDateString('uz-UZ', { month: 'long', year: 'numeric' });
  }

  get summaryTotal(): number {
    return this.summary.reduce((sum, row) => sum + Number(row.costUzs || 0), 0);
  }

  ngOnInit(): void {
    this.orgContext.orgId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => {
        this.orgId = id || '';
        this.orgName = this.orgContext.snapshotName() || '';
        this.cdr.markForCheck();
        this.reload();
      });

    if (this.isSuperAdmin) {
      this.loadRates();
    }
  }

  reload(): void {
    if (!this.month) {
      this.month = this.currentMonth;
    }
    this.loading = true;
    this.cdr.markForCheck();

    let pending = (this.orgId ? 1 : 0) + (this.isSuperAdmin ? 1 : 0);
    const done = () => {
      if (--pending <= 0) {
        this.loading = false;
        this.cdr.markForCheck();
      }
    };

    if (pending === 0) {
      this.loading = false;
      this.cdr.markForCheck();
      return;
    }

    if (this.orgId) {
      this.billingApi.getInvoice(this.orgId, this.month)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (invoice) => {
            this.invoice = invoice;
            this.orgName = invoice.organizationName;
            this.orgForm = {
              inputPricePerMillion: invoice.currentRate.inputPricePerMillion,
              outputPricePerMillion: invoice.currentRate.outputPricePerMillion
            };
            this.cdr.markForCheck();
            done();
          },
          error: (err) => {
            this.fail('Hisobni yuklab bo\'lmadi', err);
            done();
          }
        });
    }

    if (this.isSuperAdmin) {
      this.billingApi.getBillingSummary(this.month)
        .pipe(takeUntilDestroyed(this.destroyRef))
        .subscribe({
          next: (rows) => {
            this.summary = rows;
            this.cdr.markForCheck();
            done();
          },
          error: (err) => {
            this.fail('Umumiy hisobni yuklab bo\'lmadi', err);
            done();
          }
        });
    }
  }

  valid(form: TokenRateRequest): boolean {
    return [form.inputPricePerMillion, form.outputPricePerMillion]
      .every(v => v !== null && v !== undefined && `${v}` !== '' && Number(v) >= 0);
  }

  saveDefaultRate(): void {
    this.saving = true;
    this.cdr.markForCheck();

    this.billingApi.updateDefaultRate(this.normalize(this.defaultForm))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rate) => {
          this.defaultRate = rate;
          this.saving = false;
          this.snack.open('Platforma narxi saqlandi', 'OK', { duration: 3000 });
          this.cdr.markForCheck();
          this.reload();
        },
        error: (err) => {
          this.saving = false;
          this.cdr.markForCheck();
          this.fail('Narxni saqlab bo\'lmadi', err);
        }
      });
  }

  saveOrgRate(): void {
    this.saving = true;
    this.cdr.markForCheck();

    this.billingApi.setOrganizationRate(this.orgId, this.normalize(this.orgForm))
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving = false;
          this.snack.open(`«${this.orgName}» uchun maxsus narx saqlandi`, 'OK', { duration: 3000 });
          this.cdr.markForCheck();
          this.reload();
        },
        error: (err) => {
          this.saving = false;
          this.cdr.markForCheck();
          this.fail('Narxni saqlab bo\'lmadi', err);
        }
      });
  }

  removeOrgRate(): void {
    this.saving = true;
    this.cdr.markForCheck();

    this.billingApi.removeOrganizationRate(this.orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving = false;
          this.snack.open('Tashkilot platforma narxiga qaytarildi', 'OK', { duration: 3000 });
          this.cdr.markForCheck();
          this.reload();
        },
        error: (err) => {
          this.saving = false;
          this.cdr.markForCheck();
          this.fail('Amalni bajarib bo\'lmadi', err);
        }
      });
  }

  private loadRates(): void {
    this.billingApi.getTokenRates()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (rates) => {
          this.defaultRate = rates.defaultRate;
          this.defaultForm = {
            inputPricePerMillion: rates.defaultRate.inputPricePerMillion,
            outputPricePerMillion: rates.defaultRate.outputPricePerMillion
          };
          this.cdr.markForCheck();
        },
        error: (err) => this.fail('Narxlarni yuklab bo\'lmadi', err)
      });
  }

  private normalize(form: TokenRateRequest): TokenRateRequest {
    return {
      inputPricePerMillion: Number(form.inputPricePerMillion),
      outputPricePerMillion: Number(form.outputPricePerMillion)
    };
  }

  private monthOf(date: Date): string {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
  }

  private fail(message: string, err: any): void {
    const detail = err?.error?.message;
    this.snack.open(detail ? `${message}: ${detail}` : message, 'OK', { duration: 5000 });
  }
}
