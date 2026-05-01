import { Injectable } from '@angular/core';
import { AuthService } from '../auth/auth.service';
import { environment } from '../../../environments/environment';

export interface ApiCallOptions {
  method: string;
  url: string;
  body?: unknown;
}

@Injectable({ providedIn: 'root' })
export class GoogleApiService {
  /**
   * True while direct Google API calls from the frontend are still active (Plan A).
   * Set to false when backend-proxied Sheets access (Plan B) is enabled,
   * at which point calls should go through the backend instead.
   */
  readonly directApiEnabled = !environment.useBackendSession;

  constructor(private auth: AuthService) {}

  async call<T>(options: ApiCallOptions): Promise<T> {
    let token = this.auth.getAccessToken();
    if (!token) {
      token = await this.auth.requestAccessToken();
    }
    return this.executeRequest<T>(options, token);
  }

  private async executeRequest<T>(options: ApiCallOptions, token: string): Promise<T> {
    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    };

    const response = await fetch(options.url, {
      method: options.method,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    if (!response.ok) {
      if (response.status === 401) {
        // Token expired — re-request and retry once
        const newToken = await this.auth.requestAccessToken();
        return this.executeRequest<T>(options, newToken);
      }
      const errorText = await response.text();
      throw new Error(`Google API error ${response.status}: ${errorText}`);
    }

    const text = await response.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
  }
}

