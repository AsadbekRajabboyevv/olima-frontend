import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  DestroyRef,
  ViewChild,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { KnowledgeApiService } from '../../features/knowledge/data/knowledge-api.service';
import { KnowledgeBase, KnowledgeDocument } from '../../models';
import { EmbeddingIndexCardComponent } from '../../components/embedding-index-card.component';

@Component({
  selector: 'app-knowledge-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    MatIconModule,
    MatButtonModule,
    MatTableModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    EmbeddingIndexCardComponent
  ],
  templateUrl: './knowledge-detail.component.html',
  styleUrl: './knowledge-detail.component.scss'
})
export class KnowledgeDetailComponent implements OnInit, OnDestroy {
  private static readonly POLL_MS = 3000;
  private static readonly MAX_BYTES = 25 * 1024 * 1024;
  private static readonly STATUS: Record<string, string> = {
    PENDING: 'Navbatda',
    PROCESSING: 'Qayta ishlanmoqda',
    COMPLETED: 'Tayyor',
    READY: 'Tayyor',
    FAILED: 'Xatolik',
  };

  readonly accept = '.pdf,.doc,.docx,.odt,.rtf,.txt,.md,.html,.htm,.xls,.xlsx,.csv,.ppt,.pptx';

  private readonly knowledgeApi = inject(KnowledgeApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  knowledgeBaseId = '';
  knowledgeBase?: KnowledgeBase;
  documents: KnowledgeDocument[] = [];
  displayedColumns: string[] = ['title', 'status', 'index', 'createdAt', 'actions'];
  loading = false;
  private pollTimer?: ReturnType<typeof setTimeout>;

  @ViewChild(EmbeddingIndexCardComponent) indexCard?: EmbeddingIndexCardComponent;

  selectedFile?: File;
  uploadTitle = '';
  uploading = false;
  uploadError = '';
  dragOver = false;

  urlToFetch = '';
  urlTitle = '';
  fetchingUrl = false;
  urlError = '';

  textTitle = '';
  textContent = '';
  savingText = false;
  textError = '';

  ngOnInit() {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(params => {
        const id = params.get('id');
        if (!id) {
          this.router.navigate(['/knowledge']);
          return;
        }
        this.knowledgeBaseId = id;
        this.loadKnowledgeBase();
        this.loadDocuments();
      });
  }

  ngOnDestroy() {
    clearTimeout(this.pollTimer);
  }

  loadKnowledgeBase() {
    this.knowledgeApi.getKnowledgeBase(this.knowledgeBaseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (kb) => {
          this.knowledgeBase = kb;
          this.cdr.markForCheck();
        },
        error: () => this.router.navigate(['/knowledge'])
      });
  }

  loadDocuments(silent = false) {
    if (!silent) this.loading = true;
    clearTimeout(this.pollTimer);
    this.cdr.markForCheck();

    this.knowledgeApi.getDocuments(this.knowledgeBaseId)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (docs) => {
          const wasBusy = this.documents.some(d => this.inProgress(d));
          this.documents = docs;
          this.loading = false;
          this.cdr.markForCheck();

          const busy = docs.some(d => this.inProgress(d));
          if (busy) {
            this.pollTimer = setTimeout(() => this.loadDocuments(true), KnowledgeDetailComponent.POLL_MS);
          } else if (wasBusy) {
            this.indexCard?.refresh();
          }
        },
        error: () => {
          this.loading = false;
          this.cdr.markForCheck();
        }
      });
  }

  private inProgress(doc: KnowledgeDocument): boolean {
    return doc.status === 'PENDING' || doc.status === 'PROCESSING';
  }

  reindex(doc: KnowledgeDocument) {
    this.knowledgeApi.reindexDocument(doc.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.loadDocuments(true),
        error: (err) => alert(err?.error?.message || err?.message || 'Qayta indekslashda xatolik')
      });
  }

  remove(doc: KnowledgeDocument) {
    if (!confirm(`"${doc.title}" hujjatini o'chirasizmi?`)) return;
    this.knowledgeApi.deleteDocument(doc.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.afterIngest(),
        error: (err) => alert(err?.error?.message || err?.message || "O'chirishda xatolik")
      });
  }

  statusLabel(status: string): string {
    return KnowledgeDetailComponent.STATUS[status] ?? status;
  }

  indexClass(doc: KnowledgeDocument): string {
    if (!doc.chunkCount) return 'pending';
    if (doc.embeddedChunkCount >= doc.chunkCount) return 'completed';
    return doc.embeddedChunkCount === 0 ? 'failed' : 'processing';
  }

  private afterIngest() {
    this.loadDocuments();
    this.indexCard?.refresh();
  }

  addText() {
    const title = this.textTitle.trim();
    const content = this.textContent.trim();
    if (!title || !content) return;
    this.savingText = true;
    this.textError = '';
    this.cdr.markForCheck();

    this.knowledgeApi.createTextDocument(this.knowledgeBaseId, title, content)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.savingText = false;
          this.textTitle = '';
          this.textContent = '';
          this.cdr.markForCheck();
          this.afterIngest();
        },
        error: (err) => {
          this.savingText = false;
          this.textError = err?.error?.message || err?.message || "Matnni qo'shishda xatolik yuz berdi";
          this.cdr.markForCheck();
        }
      });
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    this.pickFile(input.files && input.files.length > 0 ? input.files[0] : undefined);
    input.value = '';
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    if (!this.uploading) this.dragOver = true;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.dragOver = false;
    if (this.uploading) return;
    this.pickFile(event.dataTransfer?.files?.[0]);
  }

  clearFile(event: Event) {
    event.preventDefault();
    event.stopPropagation();
    this.selectedFile = undefined;
    this.uploadError = '';
    this.cdr.markForCheck();
  }

  fileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return Math.round(bytes / 1024) + ' KB';
    return (bytes / 1024 / 1024).toFixed(1) + ' MB';
  }

  private pickFile(file?: File) {
    this.uploadError = '';
    if (file && file.size > KnowledgeDetailComponent.MAX_BYTES) {
      this.selectedFile = undefined;
      this.uploadError = `Fayl juda katta (${this.fileSize(file.size)}). Chegara — 25 MB.`;
      this.cdr.markForCheck();
      return;
    }
    this.selectedFile = file;
    this.cdr.markForCheck();
  }

  upload() {
    if (!this.selectedFile) return;
    this.uploading = true;
    this.uploadError = '';
    this.cdr.markForCheck();

    this.knowledgeApi.uploadDocument(this.knowledgeBaseId, this.selectedFile, this.uploadTitle)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.uploading = false;
          this.selectedFile = undefined;
          this.uploadTitle = '';
          this.cdr.markForCheck();
          this.afterIngest();
        },
        error: (err) => {
          this.uploading = false;
          this.uploadError = err?.error?.message || err?.message || 'Hujjatni yuklashda xatolik yuz berdi';
          this.cdr.markForCheck();
        }
      });
  }

  fetchFromUrl() {
    if (!this.urlToFetch) return;
    this.fetchingUrl = true;
    this.urlError = '';
    this.cdr.markForCheck();

    this.knowledgeApi.uploadDocumentFromUrl(this.knowledgeBaseId, this.urlToFetch.trim(), this.urlTitle)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.fetchingUrl = false;
          this.urlToFetch = '';
          this.urlTitle = '';
          this.cdr.markForCheck();
          this.afterIngest();
        },
        error: (err) => {
          this.fetchingUrl = false;
          this.urlError = err?.error?.message || err?.message || 'Veb-sahifani yuklab olishda xatolik yuz berdi';
          this.cdr.markForCheck();
        }
      });
  }

  formatSize(bytes?: number): string {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
