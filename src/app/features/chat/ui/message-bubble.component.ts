import { ChangeDetectionStrategy, Component, computed, input, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatIconModule } from '@angular/material/icon';
import { MarkdownPipe } from '../../../shared/pipes/markdown.pipe';
import { DisplayMessage, MapLocation } from '../chat.models';
import { MapPreviewComponent } from './map-preview.component';
import { SourcesPanelComponent } from './sources-panel.component';
import { ConfirmBannerComponent } from './confirm-banner.component';

@Component({
  selector: 'app-message-bubble',
  standalone: true,
  imports: [
    CommonModule,
    MatExpansionModule,
    MatIconModule,
    MarkdownPipe,
    MapPreviewComponent,
    SourcesPanelComponent,
    ConfirmBannerComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="message-wrapper" [ngClass]="msg().role.toLowerCase()">
      @if (msg().role === 'USER') {
        <div class="message-bubble user-bubble">
          {{ msg().content }}
        </div>
      }

      @if (debugMode() && msg().role === 'TOOL_INFO') {
        <div class="tool-container">
          <mat-expansion-panel class="tool-panel">
            <mat-expansion-panel-header>
              <mat-panel-title>
                <mat-icon class="tool-icon">build</mat-icon>
                <span class="tool-title">Ishlatilgan vositalar ({{ msg().toolCalls?.length }})</span>
              </mat-panel-title>
            </mat-expansion-panel-header>

            @for (tc of msg().toolCalls; track tc.toolName + '_' + $index) {
              <div class="tool-call-detail">
                <div class="tool-call-header">
                  <strong>{{ tc.toolName }}</strong>
                  <span class="duration">({{ tc.durationMs }}ms)</span>
                  @if (tc.status === 'SUCCESS') {
                    <mat-icon color="primary" class="status-icon">check_circle</mat-icon>
                  }
                  @if (tc.status === 'FAILED') {
                    <mat-icon color="warn" class="status-icon">error</mat-icon>
                  }
                </div>
                <div class="code-block-title">Kiruvchi parametrlar:</div>
                <pre class="code-block">{{ tc.input }}</pre>
                <div class="code-block-title">Natija:</div>
                <pre class="code-block">{{ tc.output }}</pre>
              </div>
            }
          </mat-expansion-panel>
        </div>
      }

      @if (msg().role === 'ASSISTANT') {
        <div class="message-bubble assistant-bubble">
          <div class="markdown-content">
            <span [innerHTML]="msg().content | markdown"></span>
            @if (msg().isStreaming) {
              <span class="typing-cursor"></span>
            }
          </div>

          <app-map-preview [locations]="locations()"></app-map-preview>

          <app-sources-panel [sources]="msg().sources || []" [orgName]="orgName()"></app-sources-panel>

          @if (msg().confirmationRequired) {
            <app-confirm-banner
              [complaintId]="msg().pendingComplaintId"
              (confirm)="confirm.emit($event)"
              (cancel)="cancel.emit()">
            </app-confirm-banner>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    .message-wrapper {
      display: flex;
      flex-direction: column;
      width: 100%;
    }
    .message-wrapper.user { align-items: flex-end; }
    .message-wrapper.assistant { align-items: flex-start; }
    .message-wrapper.tool_info { align-items: stretch; margin: 8px 0; }

    .message-bubble {
      max-width: 80%;
      padding: 16px 20px;
      border-radius: 18px;
      line-height: 1.5;
      font-size: 15px;
      box-shadow: 0 1px 2px rgba(0,0,0,0.1);
    }
    .user-bubble {
      background: #1a237e;
      color: white;
      border-bottom-right-radius: 4px;
    }
    .assistant-bubble {
      background: white;
      color: #333;
      border-bottom-left-radius: 4px;
      border: 1px solid #eee;
    }

    .tool-container {
      margin: 0 auto;
      width: 90%;
    }
    .tool-panel {
      background: #f0f4f8;
      box-shadow: none !important;
      border: 1px solid #d9e2ec;
    }
    .tool-icon { color: #5c6ac4; margin-right: 8px; }
    .tool-title { font-weight: 500; color: #334e68; }
    .tool-call-detail {
      background: white;
      padding: 12px;
      border-radius: 8px;
      margin-bottom: 12px;
      border: 1px solid #e2e8f0;
    }
    .tool-call-header {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 14px;
    }
    .duration { color: #718096; font-size: 12px; }
    .status-icon { font-size: 18px; height: 18px; width: 18px; }
    .code-block-title { font-size: 12px; color: #718096; margin-bottom: 4px; text-transform: uppercase; }
    .code-block {
      background: #1e293b;
      color: #e2e8f0;
      padding: 12px;
      border-radius: 6px;
      font-family: 'Consolas', monospace;
      font-size: 13px;
      overflow-x: auto;
      margin-bottom: 12px;
      white-space: pre-wrap;
    }

    .markdown-content ::ng-deep p { margin-top: 0; }
    .markdown-content ::ng-deep pre { background: #f1f5f9; padding: 12px; border-radius: 6px; overflow-x: auto; }
    .markdown-content ::ng-deep code { background: #f1f5f9; padding: 2px 4px; border-radius: 4px; font-family: monospace; }

    .markdown-content ::ng-deep .ui-table-container {
      margin: 16px 0;
      border-radius: 10px;
      border: 1px solid #d0d7de;
      overflow: hidden;
      box-shadow: 0 3px 10px rgba(0, 0, 0, 0.05);
      background: #ffffff;
    }
    .markdown-content ::ng-deep .ui-table-header {
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      background: #f1f5f9;
      border-bottom: 1px solid #e2e8f0;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
    }
    .markdown-content ::ng-deep .ui-table-scroll {
      width: 100%;
      overflow-x: auto;
    }
    .markdown-content ::ng-deep table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13.5px;
      line-height: 1.5;
      text-align: left;
      margin: 0;
    }
    .markdown-content ::ng-deep thead {
      background: linear-gradient(135deg, #1a237e 0%, #283593 100%);
      color: #ffffff;
    }
    .markdown-content ::ng-deep th {
      padding: 12px 16px;
      font-weight: 600;
      border-bottom: 2px solid #0d1b2a;
      white-space: nowrap;
      letter-spacing: 0.3px;
      font-size: 13px;
    }
    .markdown-content ::ng-deep td {
      padding: 10px 16px;
      border-bottom: 1px solid #e2e8f0;
      color: #2d3748;
    }
    .markdown-content ::ng-deep tbody tr:nth-child(even) {
      background-color: #f8fafc;
    }
    .markdown-content ::ng-deep tbody tr:hover {
      background-color: #edf2f6;
      transition: background-color 0.15s ease-in-out;
    }
    .markdown-content ::ng-deep tbody tr:last-child td {
      border-bottom: none;
    }

    .typing-cursor {
      display: inline-block;
      width: 8px;
      height: 16px;
      background-color: #1a237e;
      margin-left: 4px;
      vertical-align: text-bottom;
      animation: blink 0.8s infinite;
      border-radius: 2px;
    }
    @keyframes blink {
      0%, 100% { opacity: 1; }
      50% { opacity: 0; }
    }
  `]
})
export class MessageBubbleComponent {
  readonly msg = input.required<DisplayMessage>();
  readonly debugMode = input<boolean>(false);
  readonly orgName = input<string>('');

  readonly confirm = output<string | undefined>();
  readonly cancel = output<void>();

  readonly locations = computed(() => this.extractLocations(this.msg().content));

  private extractLocations(content?: string): MapLocation[] {
    if (!content) return [];
    const locations: MapLocation[] = [];
    const seen = new Set<string>();

    const addLocation = (lat: number, lng: number, title?: string, address?: string) => {
      if (isNaN(lat) || isNaN(lng)) return;
      if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return;
      const key = `${lat.toFixed(4)}_${lng.toFixed(4)}`;
      if (!seen.has(key)) {
        seen.add(key);
        locations.push({ lat, lng, title, address });
      }
    };

    const codeBlockRegex = /```(?:map|geo|json)?\s*(\{[\s\S]*?\})\s*```/gi;
    let match;
    while ((match = codeBlockRegex.exec(content)) !== null) {
      try {
        const parsed = JSON.parse(match[1]);
        const lat = Number(parsed.lat ?? parsed.latitude);
        const lng = Number(parsed.lng ?? parsed.lon ?? parsed.longitude);
        if (!isNaN(lat) && !isNaN(lng)) {
          addLocation(lat, lng, parsed.title || parsed.name, parsed.address || parsed.description);
        }
      } catch (_) {}
    }

    const labeledRegex = /(?:lat(?:itude)?|kenglik)\s*[:=]\s*([+-]?\d{1,2}(?:\.\d+)?)[,\s]+(?:lon(?:gitude)?|lng|uzunlik)\s*[:=]\s*([+-]?\d{1,3}(?:\.\d+)?)/gi;
    while ((match = labeledRegex.exec(content)) !== null) {
      addLocation(parseFloat(match[1]), parseFloat(match[2]));
    }

    const bracketedRegex = /[\[\(]([+-]?\d{1,2}\.\d{3,8})[,\s]+([+-]?\d{1,3}\.\d{3,8})[\]\)]/g;
    while ((match = bracketedRegex.exec(content)) !== null) {
      addLocation(parseFloat(match[1]), parseFloat(match[2]));
    }

    const keywordRegex = /(?:koordinata|lokatsiya|location|geo|xarita|manzil)[^\n\d]*?([+-]?\d{1,2}\.\d{3,8})[,\s]+([+-]?\d{1,3}\.\d{3,8})/gi;
    while ((match = keywordRegex.exec(content)) !== null) {
      addLocation(parseFloat(match[1]), parseFloat(match[2]));
    }

    if (locations.length === 0) {
      const generalCoordRegex = /\b([+-]?\d{1,2}\.\d{4,8})[,\s]+([+-]?\d{1,3}\.\d{4,8})\b/g;
      while ((match = generalCoordRegex.exec(content)) !== null) {
        addLocation(parseFloat(match[1]), parseFloat(match[2]));
      }
    }

    return locations;
  }
}
