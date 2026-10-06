import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  DestroyRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSlideToggleChange, MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmptyStateComponent } from '../../components/empty-state.component';
import { ToolsApiService } from '../../features/tools/data/tools-api.service';
import { OrgApiService } from '../../core/org/data/org-api.service';
import { OrgContextService } from '../../core/org/org-context.service';
import { Tool, Organization } from '../../models';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-tools',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    EmptyStateComponent,
    CommonModule,
    RouterLink,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatSlideToggleModule,
    MatDialogModule
  ],
  templateUrl: './tools.component.html',
  styleUrl: './tools.component.scss'
})
export class ToolsComponent implements OnInit {
  private readonly toolsApi = inject(ToolsApiService);
  private readonly orgApi = inject(OrgApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly orgContext = inject(OrgContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  tools: Tool[] = [];
  orgId: string = '';
  currentOrg?: Organization;
  loading = false;

  busyToolId: string | null = null;
  displayedColumns: string[] = ['name', 'type', 'accessLevel', 'requiresConfirmation', 'enabled', 'actions'];

  connectionOf(tool: Tool): string | null {
    if (tool.type !== 'REST_API' || !tool.configuration) return null;
    try {
      const config = JSON.parse(tool.configuration);
      return typeof config?.connection === 'string' && config.connection ? config.connection : null;
    } catch {
      return null;
    }
  }

  ngOnInit() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const paramOrgId = params.get('id');
        if (paramOrgId) {
          this.orgId = paramOrgId;
          this.orgContext.select(paramOrgId);
        } else {
          this.orgId = this.orgContext.snapshotId();
        }
        this.cdr.markForCheck();
        this.loadOrgAndTools();
      });

    this.orgContext.orgId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(newOrgId => {
        if (newOrgId && newOrgId !== this.orgId) {
          this.orgId = newOrgId;
          this.cdr.markForCheck();
          this.loadOrgAndTools();
        }
      });
  }

  loadOrgAndTools() {
    if (!this.orgId) {
      this.tools = [];
      this.cdr.markForCheck();
      return;
    }

    this.loading = true;
    this.cdr.markForCheck();

    this.orgApi.getOrganization(this.orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (org) => {
          this.currentOrg = org;
          this.cdr.markForCheck();
        },
        error: () => {}
      });

    this.toolsApi.getTools(this.orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (tools) => {
          this.tools = tools;
          this.loading = false;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  addTool() {
    if (!this.orgId) {
      alert('Iltimos, avval tashkilotni tanlang.');
      return;
    }
    this.router.navigate(['/tools', 'new'], { queryParams: { orgId: this.orgId } });
  }

  editTool(id: string) {
    this.router.navigate(['/tools', id], { queryParams: { orgId: this.orgId } });
  }

  deleteTool(tool: Tool) {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: {
        title: 'Vositani o\'chirish',
        message: `"${tool.name}" vositasini o'chirishga ishonchingiz komilmi? AI yordamchi undan boshqa foydalana olmaydi.`
      }
    });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmed => {
        if (!confirmed) return;
        this.busyToolId = tool.id;
        this.cdr.markForCheck();

        this.toolsApi.deleteTool(tool.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.busyToolId = null;
              this.tools = this.tools.filter(t => t.id !== tool.id);
              this.cdr.markForCheck();
            },
            error: (err) => {
              this.busyToolId = null;
              this.cdr.markForCheck();
              alert('Vositani o\'chirishda xatolik: ' + (err?.error?.message || err?.message || 'Noma\'lum xatolik'));
            }
          });
      });
  }

  toggleTool(tool: Tool, event: MatSlideToggleChange) {
    const newStatus = event.checked;
    this.busyToolId = tool.id;
    this.cdr.markForCheck();

    this.toolsApi.toggleTool(tool.id, newStatus)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (updated) => {
          this.busyToolId = null;
          tool.enabled = updated?.enabled ?? newStatus;
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.busyToolId = null;
          event.source.checked = tool.enabled;
          this.cdr.markForCheck();
          alert('Vosita holatini o\'zgartirishda xatolik: ' + (err?.error?.message || err?.message || 'Noma\'lum xatolik'));
        }
      });
  }
}
