import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

const KEY_PREFIX = 'cta_';
const ALL_KEYS = ['user_profile', 'spreadsheet_id', 'auth_hint'] as const;

@Injectable({ providedIn: 'root' })
export class AuthStorageService {
  private get storage(): Storage | null {
    switch (environment.authStorageStrategy) {
      case 'local':
        return localStorage;
      case 'session':
        return sessionStorage;
      default:
        return null;
    }
  }

  getItem(key: string): string | null {
    return this.storage?.getItem(KEY_PREFIX + key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.storage?.setItem(KEY_PREFIX + key, value);
  }

  removeItem(key: string): void {
    this.storage?.removeItem(KEY_PREFIX + key);
  }

  /** Clears all app auth keys from every possible storage to ensure a full reset. */
  clearAll(): void {
    for (const key of ALL_KEYS) {
      try { sessionStorage.removeItem(KEY_PREFIX + key); } catch { /* ignore */ }
      try { localStorage.removeItem(KEY_PREFIX + key); } catch { /* ignore */ }
    }
    // Also clear the legacy spreadsheet ID key used before strategy support
    try { sessionStorage.removeItem('colorToggleAppSpreadsheetId'); } catch { /* ignore */ }
    try { localStorage.removeItem('colorToggleAppSpreadsheetId'); } catch { /* ignore */ }
  }
}
