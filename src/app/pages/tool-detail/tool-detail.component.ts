import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  DestroyRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  FormBuilder,
  FormGroup,
  Validators,
  FormArray,
  ReactiveFormsModule,
  FormControl
} from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ToolsApiService } from '../../features/tools/data/tools-api.service';
import { OrgContextService } from '../../core/org/org-context.service';
import { IntegrationConnection, ToolParameter, ToolType } from '../../models';
import { HelpTipComponent } from '../../components/help-tip.component';

@Component({
  selector: 'app-tool-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    HelpTipComponent
  ],
  templateUrl: './tool-detail.component.html',
  styleUrl: './tool-detail.component.scss'
})
export class ToolDetailComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly toolsApi = inject(ToolsApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly orgContext = inject(OrgContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  toolForm: FormGroup;
  isNew = false;
  toolId = '';
  orgId = '';
  saving = false;

  toolTypes: ToolType[] = ['REST_API', 'RAG'];
  readonly toolTypeLabels: Partial<Record<ToolType, string>> = {
    REST_API: 'REST API',
    RAG: 'RAG (Bilimlar bazasi qidiruvi)'
  };

  readonly httpMethods = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];
  readonly parameterTypes = ['string', 'number', 'integer', 'boolean'];

  httpMethodControl = new FormControl('GET');
  endpointUrlControl = new FormControl('');
  connectionControl = new FormControl('', { nonNullable: true });
  connections: IntegrationConnection[] = [];

  private syncing = false;

  get selectedConnection(): IntegrationConnection | undefined {
    return this.connections.find(c => c.name === this.connectionControl.value);
  }

  get parameters(): FormArray {
    return this.toolForm.get('parameters') as FormArray;
  }

  constructor() {
    this.toolForm = this.fb.group({
      name: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]{1,64}$/)]],
      description: ['', Validators.required],
      type: ['REST_API', Validators.required],
      configuration: ['{\n  "endpoint": "",\n  "method": "GET"\n}'],
      requiresConfirmation: [false],
      accessLevel: ['READ', Validators.required],
      enabled: [true],
      parameters: this.fb.array([])
    });
  }

  ngOnInit() {
    this.toolId = this.route.snapshot.paramMap.get('id') || '';
    this.orgId = this.route.snapshot.queryParamMap.get('orgId') || this.orgContext.snapshotId();

    this.toolsApi.getToolTypes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: types => {
          if (types.length) {
            this.toolTypes = types;
            this.cdr.markForCheck();
          }
        },
        error: () => undefined
      });

    this.loadConnections();

    if (this.toolId === 'new') {
      this.isNew = true;
    } else {
      this.isNew = false;
      this.loadTool(this.toolId);
    }

    this.httpMethodControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateRestConfig());

    this.endpointUrlControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateRestConfig());

    this.connectionControl.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.updateRestConfig());

    this.toolForm.get('configuration')!.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(value => this.syncRestControls(value));
  }

  private loadConnections() {
    if (!this.orgId) return;
    this.toolsApi.getConnections(this.orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: list => {
          this.connections = list;
          this.cdr.markForCheck();
        },
        error: () => {
          this.connections = [];
          this.cdr.markForCheck();
        }
      });
  }

  loadTool(id: string) {
    this.toolsApi.getTool(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tool) => {
          if (tool.organizationId && tool.organizationId !== this.orgId) {
            this.orgId = tool.organizationId;
            this.loadConnections();
          }

          this.syncing = true;
          this.toolForm.patchValue({
            name: tool.name,
            description: tool.description,
            type: tool.type,
            configuration: this.prettyJson(tool.configuration),
            requiresConfirmation: tool.requiresConfirmation,
            accessLevel: tool.accessLevel || 'READ',
            enabled: tool.enabled
          });

          this.parameters.clear();
          (tool.parameters || []).forEach(p => this.parameters.push(this.parameterGroup(p)));
          this.syncing = false;

          this.syncRestControls(this.toolForm.get('configuration')?.value);
          this.cdr.markForCheck();
        },
        error: (err) => {
          alert('Vosita ma\'lumotlarini yuklab bo\'lmadi: ' + (err?.error?.message || err?.message || 'Noma\'lum xatolik'));
          this.goBack();
        }
      });
  }

  private parameterGroup(p?: Partial<ToolParameter>): FormGroup {
    return this.fb.group({
      name: [p?.name ?? '', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_]{1,64}$/)]],
      type: [p?.type || 'string', Validators.required],
      description: [p?.description ?? ''],
      required: [p?.required ?? true],
      defaultValue: [p?.defaultValue ?? null]
    });
  }

  addParameter() {
    this.parameters.push(this.parameterGroup());
    this.cdr.markForCheck();
  }

  removeParameter(index: number) {
    this.parameters.removeAt(index);
    this.cdr.markForCheck();
  }

  onTypeChange() {
    const type = this.toolForm.get('type')?.value;
    if (type === 'REST_API') {
      this.updateRestConfig();
    } else if (type === 'RAG') {
      this.toolForm.patchValue({
        configuration: JSON.stringify({ knowledgeBaseId: '', maxResults: 3 }, null, 2)
      });
    }
  }

  updateRestConfig() {
    if (this.syncing || this.toolForm.get('type')?.value !== 'REST_API') return;
    const config = this.parseConfig(this.toolForm.get('configuration')?.value) ?? {};
    delete config['url'];
    const connection = this.connectionControl.value;
    if (connection) {
      config['connection'] = connection;
    } else {
      delete config['connection'];
    }
    config['endpoint'] = this.endpointUrlControl.value || '';
    config['method'] = this.httpMethodControl.value || 'GET';

    this.syncing = true;
    this.toolForm.patchValue({ configuration: JSON.stringify(config, null, 2) });
    this.syncing = false;
  }

  private syncRestControls(value: unknown) {
    if (this.syncing || this.toolForm.get('type')?.value !== 'REST_API') return;
    const config = this.parseConfig(value);
    if (!config) return;

    this.syncing = true;
    const endpoint = String(config['endpoint'] ?? config['url'] ?? '');
    const method = String(config['method'] ?? 'GET').toUpperCase();
    const connection = typeof config['connection'] === 'string' ? config['connection'] : '';
    if (endpoint !== this.endpointUrlControl.value) this.endpointUrlControl.setValue(endpoint);
    if (method !== this.httpMethodControl.value) this.httpMethodControl.setValue(method);
    if (connection !== this.connectionControl.value) this.connectionControl.setValue(connection);
    this.syncing = false;
  }

  save() {
    if (this.saving) return;
    if (this.toolForm.invalid) {
      this.toolForm.markAllAsTouched();
      return;
    }

    const formValue = this.toolForm.getRawValue();
    const configText = (formValue.configuration || '').trim();
    if (configText && !this.parseConfig(configText)) {
      alert('Konfiguratsiya maydonidagi JSON noto\'g\'ri (obyekt bo\'lishi kerak: { ... }). Sintaksisini tekshiring.');
      return;
    }
    const endpoint = (this.endpointUrlControl.value || '').trim();
    if (formValue.type === 'REST_API' && !endpoint) {
      alert('REST API vositasi uchun endpoint URL manzilini kiriting.');
      return;
    }
    if (formValue.type === 'REST_API') {
      const absolute = /^https?:\/\//i.test(endpoint);
      if (!this.connectionControl.value && !absolute) {
        alert("Ulanishsiz vosita uchun to'liq manzil kerak (https://...). Nisbiy yo'l uchun ulanish tanlang.");
        return;
      }
      if (this.connectionControl.value && !absolute && !endpoint.startsWith('/')) {
        alert("Nisbiy yo'l '/' bilan boshlanishi kerak, masalan: /students/{studentId}");
        return;
      }
    }

    const params = formValue.parameters as ToolParameter[];
    const names = params.map(p => p.name.trim());
    const duplicate = names.find((n, i) => names.indexOf(n) !== i);
    if (duplicate) {
      alert(`"${duplicate}" parametri ikki marta kiritilgan. Parametr nomlari takrorlanmasligi kerak.`);
      return;
    }

    const payload = {
      name: formValue.name.trim(),
      description: formValue.description.trim(),
      type: formValue.type,
      configuration: configText || null,
      requiresConfirmation: !!formValue.requiresConfirmation,
      accessLevel: formValue.accessLevel,
      enabled: !!formValue.enabled,
      parameters: params.map(p => ({
        name: p.name.trim(),
        type: p.type,
        description: (p.description || '').trim(),
        required: !!p.required,
        defaultValue: p.defaultValue != null && String(p.defaultValue).trim() !== ''
          ? String(p.defaultValue).trim() : undefined
      }))
    };

    const targetOrgId = this.orgId || this.orgContext.snapshotId();
    if (this.isNew && !targetOrgId) {
      alert('Vosita yaratishdan oldin tashkilotni tanlang.');
      return;
    }

    this.saving = true;
    this.cdr.markForCheck();

    const request$ = this.isNew
      ? this.toolsApi.createTool(targetOrgId, payload)
      : this.toolsApi.updateTool(this.toolId, payload);

    request$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.saving = false;
          this.orgId = this.orgId || targetOrgId;
          this.cdr.markForCheck();
          this.goBack();
        },
        error: (err) => {
          this.saving = false;
          this.cdr.markForCheck();
          const action = this.isNew ? 'yaratishda' : 'yangilashda';
          alert(`Vositani ${action} xatolik: ` + (err?.error?.message || err?.message || 'Noma\'lum xatolik'));
        }
      });
  }

  goBack() {
    if (this.orgId) {
      this.router.navigate(['/organizations', this.orgId, 'tools']);
    } else {
      this.router.navigate(['/organizations']);
    }
  }

  private parseConfig(value: unknown): Record<string, unknown> | null {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return { ...(value as Record<string, unknown>) };
    }
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null;
    } catch {
      return null;
    }
  }

  private prettyJson(value: unknown): string {
    const parsed = this.parseConfig(value);
    return parsed ? JSON.stringify(parsed, null, 2) : (typeof value === 'string' ? value : '');
  }
}
