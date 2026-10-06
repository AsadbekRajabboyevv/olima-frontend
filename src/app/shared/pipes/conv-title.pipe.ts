import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'convTitle',
  standalone: true,
  pure: true
})
export class ConvTitlePipe implements PipeTransform {
  transform(title: string | null | undefined, fallback = 'Yangi suhbat'): string {
    const t = title?.trim();
    if (!t) return fallback;
    return t.startsWith('Chat with ') ? 'Suhbat: ' + t.slice('Chat with '.length) : t;
  }
}
