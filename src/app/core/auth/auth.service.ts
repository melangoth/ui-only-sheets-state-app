import { Injectable, signal, computed } from '@angular/core';
import { GoogleIdentityLoaderService } from './google-identity-loader.service';
import { APP_CONFIG } from '../../shared/config/app-config';
import { environment } from '../../../environments/environment';

declare const google: any;

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

export type AuthStatus = 'idle' | 'signing-in' | 'signed-in' | 'signed-out' | 'error';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _status = signal<AuthStatus>('idle');
  private _user = signal<UserProfile | null>(null);
  private _accessToken = signal<string | null>(null);
  private _authError = signal<string | null>(null);

  readonly status = this._status.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isSignedIn = computed(() => this._status() === 'signed-in');
  readonly authError = this._authError.asReadonly();

  private tokenClient: any = null;
  private tokenResolve: ((token: string) => void) | null = null;
  private tokenReject: ((err: Error) => void) | null = null;

  constructor(private loader: GoogleIdentityLoaderService) {}

  async initializeSignIn(buttonElementId: string): Promise<void> {
    await this.loader.load();
    this._status.set('idle');

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: any) => this.handleCredentialResponse(response),
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    google.accounts.id.renderButton(
      document.getElementById(buttonElementId),
      { theme: 'outline', size: 'large', text: 'sign_in_with', shape: 'rectangular' }
    );

    google.accounts.id.prompt();
  }

  private handleCredentialResponse(response: any): void {
    if (!response?.credential) {
      this._status.set('error');
      this._authError.set('Sign-in failed: no credential received.');
      return;
    }
    const payload = this.decodeJwt(response.credential);
    if (!payload) {
      this._status.set('error');
      this._authError.set('Sign-in failed: could not decode token.');
      return;
    }
    this._user.set({ name: payload['name'], email: payload['email'], picture: payload['picture'] });
    this._status.set('signed-in');
    this._authError.set(null);
  }

  async requestAccessToken(): Promise<string> {
    await this.loader.load();

    return new Promise<string>((resolve, reject) => {
      if (!this.tokenClient) {
        this.tokenClient = google.accounts.oauth2.initTokenClient({
          client_id: environment.googleClientId,
          scope: `${APP_CONFIG.authScopes} ${APP_CONFIG.driveFileScope}`,
          callback: (tokenResponse: any) => {
            if (tokenResponse.error) {
              const err = new Error(`Token error: ${tokenResponse.error}`);
              this._authError.set(err.message);
              if (this.tokenReject) this.tokenReject(err);
              return;
            }
            const token = tokenResponse.access_token;
            this._accessToken.set(token);
            this._authError.set(null);
            if (this.tokenResolve) this.tokenResolve(token);
          },
          error_callback: (err: any) => {
            const msg = err?.message || 'Authorization denied or popup closed.';
            this._authError.set(msg);
            if (this.tokenReject) this.tokenReject(new Error(msg));
          },
        });
      }

      this.tokenResolve = resolve;
      this.tokenReject = reject;
      this.tokenClient.requestAccessToken({ prompt: '' });
    });
  }

  getAccessToken(): string | null {
    return this._accessToken();
  }

  signOut(): void {
    const user = this._user();
    if (user?.email) {
      google.accounts.id.revoke(user.email, () => {});
    }
    google.accounts.id.disableAutoSelect();
    this._status.set('signed-out');
    this._user.set(null);
    this._accessToken.set(null);
    this._authError.set(null);
    this.tokenClient = null;
  }

  private decodeJwt(token: string): Record<string, any> | null {
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return null;
      const payload = atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'));
      return JSON.parse(payload);
    } catch {
      return null;
    }
  }
}
