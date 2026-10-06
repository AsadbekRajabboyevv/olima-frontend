import { Pipe, PipeTransform } from '@angular/core';
import { marked } from 'marked';

@Pipe({
  name: 'markdown',
  standalone: true,
  pure: true
})
export class MarkdownPipe implements PipeTransform {
  transform(text: string | null | undefined): string {
    if (!text) return '';

    const cleanedText = text.replace(/```(?:map|geo)\s*\{[\s\S]*?\}\s*```/gi, '');
    let html = marked.parse(cleanedText) as string;

    html = html.replace(/<table>([\s\S]*?)<\/table>/gi, (match) => {
      return `<div class="ui-table-container"><div class="ui-table-header"><span class="ui-table-icon">📊</span><span class="ui-table-title">Jadval</span></div><div class="ui-table-scroll">${match}</div></div>`;
    });

    return html;
  }
}
