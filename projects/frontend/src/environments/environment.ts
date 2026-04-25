import { AppEnvironment } from './environment.model';

export const environment: AppEnvironment = {
  production: false,
  googleClientId: '615154138259-4tefmcci4pg6g3atvlt67ieg0qq05lul.apps.googleusercontent.com',
  requireAppLogin: true,
  persistGoogleAuthorization: true,
  authStorageStrategy: 'session',
  enableClearCredentialsButton: true,
};
