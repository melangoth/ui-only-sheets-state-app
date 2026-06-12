import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

type EnvSnapshot = {
  persistGoogleAuthorization: boolean;
  requireAppLogin: boolean;
  useBackendSession: boolean;
  useBackendGoogleAuthorization: boolean;
  backendUrl: string;
};

describe('AuthService backend-owned authorization follow-ups', () => {
  const envSnapshot: EnvSnapshot = {
    persistGoogleAuthorization: environment.persistGoogleAuthorization,
    requireAppLogin: environment.requireAppLogin,
    useBackendSession: environment.useBackendSession,
    useBackendGoogleAuthorization: environment.useBackendGoogleAuthorization,
    backendUrl: environment.backendUrl,
  };

  let storage: {
    getItem: ReturnType<typeof vi.fn>;
    setItem: ReturnType<typeof vi.fn>;
    removeItem: ReturnType<typeof vi.fn>;
    clearAll: ReturnType<typeof vi.fn>;
  };

  let loader: {
    load: ReturnType<typeof vi.fn>;
    isLoaded: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    environment.persistGoogleAuthorization = false;
    environment.requireAppLogin = true;
    environment.useBackendSession = false;
    environment.useBackendGoogleAuthorization = false;
    environment.backendUrl = 'https://backend.example';

    storage = {
      getItem: vi.fn().mockReturnValue(null),
      setItem: vi.fn(),
      removeItem: vi.fn(),
      clearAll: vi.fn(),
    };

    loader = {
      load: vi.fn().mockResolvedValue(undefined),
      isLoaded: vi.fn().mockReturnValue(true),
    };

    (globalThis as any).google = {
      accounts: {
        id: {
          initialize: vi.fn(),
          renderButton: vi.fn(),
          prompt: vi.fn(),
          revoke: vi.fn((_: string, cb: () => void) => cb()),
          disableAutoSelect: vi.fn(),
        },
      },
    };
  });

  afterEach(() => {
    environment.persistGoogleAuthorization = envSnapshot.persistGoogleAuthorization;
    environment.requireAppLogin = envSnapshot.requireAppLogin;
    environment.useBackendSession = envSnapshot.useBackendSession;
    environment.useBackendGoogleAuthorization = envSnapshot.useBackendGoogleAuthorization;
    environment.backendUrl = envSnapshot.backendUrl;
    vi.restoreAllMocks();
  });

  it('calls backend disconnect endpoint during clear credentials when backend-owned auth is enabled', async () => {
    environment.useBackendSession = true;
    environment.useBackendGoogleAuthorization = true;

    const service = new AuthService(loader as any, storage as any);
    (service as any)._appToken.set('app-token');

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 204 })
    );

    await service.clearCredentials();

    expect(fetchSpy).toHaveBeenCalledWith(
      'https://backend.example/api/google/authorization',
      expect.objectContaining({
        method: 'DELETE',
      })
    );
    expect(storage.clearAll).toHaveBeenCalledTimes(1);
  });

  it('shows warning and still clears local state when app token is missing during clear credentials', async () => {
    environment.useBackendSession = true;
    environment.useBackendGoogleAuthorization = true;

    const service = new AuthService(loader as any, storage as any);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await service.clearCredentials();

    expect(fetchSpy).not.toHaveBeenCalled();
    expect(storage.clearAll).toHaveBeenCalledTimes(1);
    expect(service.authError()).toContain('may still be active');
  });

  it('does not keep restored profile as signed-in when backend-owned auth needs a fresh backend session', async () => {
    environment.persistGoogleAuthorization = true;
    environment.useBackendSession = true;
    environment.useBackendGoogleAuthorization = true;

    storage.getItem.mockReturnValue(
      JSON.stringify({ name: 'Test User', email: 'test@example.com', picture: 'avatar' })
    );

    const service = new AuthService(loader as any, storage as any);

    await service.initializeSignIn('google-sign-in-button');

    expect(service.isSignedIn()).toBe(false);
    expect(service.user()).toBeNull();
    expect(storage.removeItem).toHaveBeenCalledWith('user_profile');
    expect(service.authError()).toContain('Please sign in again');
  });

  it('does not call backend authorization status endpoint without app JWT', async () => {
    environment.useBackendSession = true;
    environment.useBackendGoogleAuthorization = true;

    const service = new AuthService(loader as any, storage as any);
    const fetchSpy = vi.spyOn(globalThis, 'fetch');

    await expect(service.requestAccessToken()).rejects.toThrow('App session token not available');
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
