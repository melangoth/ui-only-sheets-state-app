export type AuthStorageStrategy = 'memory' | 'session' | 'local';

export interface AppEnvironment {
  production: boolean;
  googleClientId: string;
  requireAppLogin: boolean;
  persistGoogleAuthorization: boolean;
  authStorageStrategy: AuthStorageStrategy;
  enableClearCredentialsButton: boolean;
}
