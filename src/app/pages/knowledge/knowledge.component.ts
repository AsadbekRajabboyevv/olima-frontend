import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  DestroyRef,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { Router } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { EmptyStateComponent } from '../../components/empty-state.component';
import { EmbeddingIndexCardComponent } from '../../components/embedding-index-card.component';
import { KnowledgeApiService } from '../../features/knowledge/data/knowledge-api.service';
import { OrgContextService } from '../../core/org/org-context.service';
import { KnowledgeBase } from '../../models';
import { KnowledgeBaseDialogComponent } from './knowledge-base-dialog.component';
import { ConfirmDialogComponent } from '../../shared/confirm-dialog/confirm-dialog.component';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-knowledge',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [EmptyStateComponent, EmbeddingIndexCardComponent, CommonModule, MatCardModule, MatButtonModule, MatIconModule, MatDialogModule, MatTooltipModule],
  template: `
    <div class="page-container">
      <div class="header">
        <div>
          <h1>Bilimlar bazalari</h1>
          <p class="subtitle">AI chatbot tashkilotning o'z rasmiy ma'lumotlariga tayanib javob berishi uchun hujjatlarni (PDF, DOCX, TXT) yuklang</p>
        </div>
        <button mat-raised-button color="primary" (click)="addKnowledgeBase()" [disabled]="!orgId">
          <mat-icon>add</mat-icon> Yangi bilimlar bazasi
        </button>
      </div>

      <app-embedding-index-card *ngIf="orgId && knowledgeBases.length > 0" [orgId]="orgId"></app-embedding-index-card>

      <div class="kb-grid" *ngIf="knowledgeBases.length > 0">
        <mat-card *ngFor="let kb of knowledgeBases" class="kb-card" (click)="openKnowledgeBase(kb.id)">
          <mat-card-header>
            <mat-card-title>{{ kb.name }}</mat-card-title>
          </mat-card-header>
          <mat-card-content>
            <p>{{ kb.description }}</p>
            <p class="date">Yaratilgan: {{ kb.createdAt | date:'mediumDate' }}</p>
          </mat-card-content>
          <div class="kb-actions" (click)="$event.stopPropagation()">
            <button mat-icon-button matTooltip="Tahrirlash" (click)="editKnowledgeBase(kb)">
              <mat-icon>edit</mat-icon>
            </button>
            <button mat-icon-button color="warn" matTooltip="O'chirish" (click)="deleteKnowledgeBase(kb)">
              <mat-icon>delete</mat-icon>
            </button>
          </div>
        </mat-card>
      </div>

      <app-empty-state *ngIf="loaded && knowledgeBases.length === 0" icon="auto_stories"
        title="Bilimlar bazasi hali bo'sh"
        [text]="orgId ? 'Yordamchi faqat shu yerdagi hujjatlarga tayanib javob beradi. Baza yarating va nizom, qaror yoki yo‘riqnomalarni (PDF, DOCX, TXT) yuklang.' : 'Avval tepadagi ro‘yxatdan tashkilotni tanlang.'">
        <button mat-flat-button color="primary" (click)="addKnowledgeBase()" [disabled]="!orgId">
          <mat-icon>add</mat-icon> Yangi bilimlar bazasi
        </button>
      </app-empty-state>
    </div>
  `,
  styles: [`
    .page-container { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
    }
    .header h1 { margin: 0; font-size: 1.75rem; font-weight: 600; color: #1a237e; }
    .subtitle { margin: 4px 0 0 0; color: #666; font-size: 14px; }
    .kb-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
    .kb-card { cursor: pointer; transition: box-shadow 0.15s ease; }
    .kb-card:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
    .date { font-size: 12px; color: #666; margin-top: 16px; }
    .kb-actions { display: flex; justify-content: flex-end; gap: 4px; padding: 0 8px 8px; }
    .empty-state {
      text-align: center;
      padding: 48px 16px;
      background: white;
      border-radius: 8px;
      border: 1px dashed #cbd5e1;
      margin-top: 16px;
    }
    .empty-icon { font-size: 48px; width: 48px; height: 48px; color: #94a3b8; margin-bottom: 12px; }
  `]
})
export class KnowledgeComponent implements OnInit {
  private readonly knowledgeApi = inject(KnowledgeApiService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog);
  private readonly orgContext = inject(OrgContextService);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  knowledgeBases: KnowledgeBase[] = [];
  loaded = false;
  orgId: string = '';

  ngOnInit() {
    this.orgContext.orgId$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(id => {
        this.orgId = id || '';
        this.loadKnowledgeBases();
      });
  }

  loadKnowledgeBases() {
    if (!this.orgId) {
      this.knowledgeBases = [];
      this.loaded = true;
      this.cdr.markForCheck();
      return;
    }
    this.knowledgeApi.getKnowledgeBases(this.orgId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: data => {
          this.knowledgeBases = data;
          this.loaded = true;
          this.cdr.markForCheck();
        },
        error: () => {
          this.loaded = true;
          this.cdr.markForCheck();
        }
      });
  }

  addKnowledgeBase() {
    if (!this.orgId) {
      alert('Iltimos, avval tashkilotni tanlang.');
      return;
    }

    const dialogRef = this.dialog.open(KnowledgeBaseDialogComponent, { width: '500px' });

    dialogRef.afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        if (result) {
          this.knowledgeApi.createKnowledgeBase({ ...result, organizationId: this.orgId })
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe({
              next: (kb) => {
                this.loadKnowledgeBases();
                this.router.navigate(['/knowledge', kb.id]);
              },
              error: (err) => {
                alert('Bilimlar bazasini yaratishda xatolik: ' + (err?.error?.message || err?.message || 'Noma\'lum xatolik'));
              }
            });
        }
      });
  }

  editKnowledgeBase(kb: KnowledgeBase) {
    this.dialog.open(KnowledgeBaseDialogComponent, { width: '500px', data: kb })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(result => {
        if (!result) return;
        this.knowledgeApi.updateKnowledgeBase(kb.id, result)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.loadKnowledgeBases(),
            error: (err) => alert('Saqlashda xatolik: ' + (err?.error?.message || err?.message || 'Noma\'lum xatolik'))
          });
      });
  }

  deleteKnowledgeBase(kb: KnowledgeBase) {
    this.dialog.open(ConfirmDialogComponent, {
      width: '420px',
      data: {
        title: "Bilimlar bazasini o'chirish",
        message: `"${kb.name}" barcha hujjatlari bilan o'chiriladi. Yordamchi ularga endi tayanmaydi. Bu amalni ortga qaytarib bo'lmaydi.`
      }
    })
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(confirmed => {
        if (!confirmed) return;
        this.knowledgeApi.deleteKnowledgeBase(kb.id)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => this.loadKnowledgeBases(),
            error: (err) => alert("O'chirishda xatolik: " + (err?.error?.message || err?.message || 'Noma\'lum xatolik'))
          });
      });
  }

  openKnowledgeBase(id: string) {
    this.router.navigate(['/knowledge', id]);
  }
}
