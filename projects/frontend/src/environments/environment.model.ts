export type AuthStorageStrategy = 'memory' | 'session' | 'local';

export interface AppEnvironment {
  production: boolean;
  googleClientId: string;
  requireAppLogin: boolean;
  persistGoogleAuthorization: boolean;
  authStorageStrategy: AuthStorageStrategy;
  enableClearCredentialsButton: boolean;
  /** Base URL of the token broker backend (e.g. http://localhost:8080 or https://…run.app). */
  backendUrl: string;
  /** When true, the frontend exchanges the Google ID credential for a backend app token after sign-in. */
  useBackendSession: boolean;
}
