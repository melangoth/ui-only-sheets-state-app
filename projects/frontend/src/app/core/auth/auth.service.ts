import { Injectable, signal, computed } from '@angular/core';
import { GoogleIdentityLoaderService } from './google-identity-loader.service';
import { AuthStorageService } from './auth-storage.service';
import { APP_CONFIG } from '../../shared/config/app-config';
import { environment } from '../../../environments/environment';

declare const google: any;

export interface UserProfile {
  name: string;
  email: string;
  picture: string;
}

export type AuthStatus = 'idle' | 'signing-in' | 'signed-in' | 'signed-out' | 'error';

const USER_PROFILE_KEY = 'user_profile';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private _status = signal<AuthStatus>('idle');
  private _user = signal<UserProfile | null>(null);
  private _accessToken = signal<string | null>(null);
  private _authError = signal<string | null>(null);
  /** Short-lived app bearer token issued by the backend token broker (memory only). */
  private _appToken = signal<string | null>(null);

  readonly status = this._status.asReadonly();
  readonly user = this._user.asReadonly();
  readonly isSignedIn = computed(() => this._status() === 'signed-in');
  readonly authError = this._authError.asReadonly();
  /** The backend-issued app session token, kept in memory only. */
  readonly appToken = this._appToken.asReadonly();

  /** True when the user can access protected features (respects requireAppLogin flag). */
  readonly canAccessApp = computed(
    () => !environment.requireAppLogin || this._status() === 'signed-in'
  );

  private tokenClient: any = null;
  private tokenResolve: ((token: string) => void) | null = null;
  private tokenReject: ((err: Error) => void) | null = null;

  constructor(
    private loader: GoogleIdentityLoaderService,
    private authStorage: AuthStorageService
  ) {}

  async initializeSignIn(buttonElementId: string): Promise<void> {
    await this.loader.load();

    // Attempt to restore persisted user profile
    if (environment.persistGoogleAuthorization) {
      const restored = this.restoreUserProfile();
      if (restored) return; // Profile restored; skip rendering the sign-in button
    }

    this._status.set('idle');

    google.accounts.id.initialize({
      client_id: environment.googleClientId,
      callback: (response: any) => this.handleCredentialResponse(response),
      auto_select: false,
      cancel_on_tap_outside: true,
    });

    if (environment.requireAppLogin) {
      const buttonEl = document.getElementById(buttonElementId);
      if (buttonEl) {
        google.accounts.id.renderButton(buttonEl, {
          theme: 'outline',
          size: 'large',
          text: 'sign_in_with',
          shape: 'rectangular',
        });
      }

      google.accounts.id.prompt();
    }
  }

  private restoreUserProfile(): boolean {
    const raw = this.authStorage.getItem(USER_PROFILE_KEY);
    if (!raw) return false;
    try {
      const profile = JSON.parse(raw) as UserProfile;
      if (!profile?.email) return false;
      this._user.set(profile);
      this._status.set('signed-in');
      return true;
    } catch {
      this.authStorage.removeItem(USER_PROFILE_KEY);
      return false;
    }
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
    const profile: UserProfile = {
      name: payload['name'],
      email: payload['email'],
      picture: payload['picture'],
    };
    this._user.set(profile);
    this._status.set('signed-in');
    this._authError.set(null);

    if (environment.persistGoogleAuthorization) {
      this.authStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile));
    }

    if (environment.useBackendSession) {
      this.exchangeForAppToken(response.credential);
    }
  }

  /**
   * Exchanges the Google ID credential for a short-lived app bearer token issued
   * by the backend token broker. The app token is kept in memory only.
   * Errors are surfaced via the authError signal but do not interrupt sign-in.
   */
  private exchangeForAppToken(idToken: string): void {
    fetch(`${environment.backendUrl}/api/auth/exchange`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken }),
    })
      .then(res => {
        if (!res.ok) {
          throw new Error(`Backend exchange failed with status ${res.status}.`);
        }
        return res.json();
      })
      .then((data: { appToken: string }) => {
        this._appToken.set(data.appToken);
      })
      .catch((err: Error) => {
        this._authError.set(`App session exchange failed: ${err.message}`);
      });
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
    this._resetState();
  }

  clearCredentials(): void {
    const user = this._user();
    if (user?.email && this.loader.isLoaded()) {
      try {
        google.accounts.id.revoke(user.email, () => {});
        google.accounts.id.disableAutoSelect();
      } catch { /* ignore if GIS not available */ }
    }
    this.authStorage.clearAll();
    this._resetState();
  }

  private _resetState(): void {
    this._status.set('signed-out');
    this._user.set(null);
    this._accessToken.set(null);
    this._appToken.set(null);
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

