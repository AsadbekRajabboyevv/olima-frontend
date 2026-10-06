import { Injectable, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class OrgContextService {
  private readonly _orgId = signal<string | null>(localStorage.getItem('selectedOrgId'));
  private readonly _orgName = signal<string | null>(localStorage.getItem('selectedOrgName'));

  readonly orgId = this._orgId.asReadonly();
  readonly orgId$ = toObservable(this._orgId);

  readonly orgName = this._orgName.asReadonly();
  readonly orgName$ = toObservable(this._orgName);

  select(id: string, name?: string): void {
    localStorage.setItem('selectedOrgId', id);
    this._orgId.set(id);
    if (name !== undefined) {
      localStorage.setItem('selectedOrgName', name);
      this._orgName.set(name);
    }
    // Backward-compat bridge during refactoring
    window.dispatchEvent(new Event('orgChanged'));
  }

  setOrgName(name: string): void {
    localStorage.setItem('selectedOrgName', name);
    this._orgName.set(name);
  }

  clear(): void {
    localStorage.removeItem('selectedOrgId');
    localStorage.removeItem('selectedOrgName');
    this._orgId.set(null);
    this._orgName.set(null);
    window.dispatchEvent(new Event('orgChanged'));
  }

  snapshotId(): string {
    return this._orgId() || localStorage.getItem('selectedOrgId') || '';
  }

  snapshotName(): string {
    return this._orgName() || localStorage.getItem('selectedOrgName') || '';
  }
}
