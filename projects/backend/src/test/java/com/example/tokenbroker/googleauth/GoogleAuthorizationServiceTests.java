package com.example.tokenbroker.googleauth;

import com.example.tokenbroker.auth.AppTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class GoogleAuthorizationServiceTests {

    @Mock
    private AppTokenService appTokenService;
    @Mock
    private GoogleAuthorizationRepository repository;
    @Mock
    private GoogleOAuthClient oauthClient;
    @Mock
    private RefreshTokenCipher refreshTokenCipher;

    private GoogleAuthorizationService service;

    @BeforeEach
    void setUp() {
        service = new GoogleAuthorizationService(
                appTokenService,
                repository,
                oauthClient,
                refreshTokenCipher,
                "http://localhost:8080/api/google/authorization/callback",
                "http://localhost:4200",
                "openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets");
    }

    @Test
    void getStatusReturnsFalseWhenNoStoredAuthorization() {
        when(repository.findBySubject("user-1")).thenReturn(Optional.empty());

        GoogleAuthorizationStatusResponse response = service.getStatus("user-1");

        assertFalse(response.authorized());
    }

    @Test
    void getStatusReturnsTrueWhenAllRequiredScopesAreStored() {
        when(repository.findBySubject("user-1")).thenReturn(Optional.of(storedAuthorization(
                "https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file openid")));

        GoogleAuthorizationStatusResponse response = service.getStatus("user-1");

        assertTrue(response.authorized());
    }

    @Test
    void getStatusReturnsFalseWhenRequiredScopeIsMissing() {
        when(repository.findBySubject("user-1")).thenReturn(Optional.of(storedAuthorization(
                "openid profile https://www.googleapis.com/auth/drive.file")));

        GoogleAuthorizationStatusResponse response = service.getStatus("user-1");

        assertFalse(response.authorized());
    }

    @Test
    void getStatusReturnsTrueWhenStoredScopesContainRequiredScopesAndExtras() {
        when(repository.findBySubject("user-1")).thenReturn(Optional.of(storedAuthorization(
                "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.metadata.readonly email")));

        GoogleAuthorizationStatusResponse response = service.getStatus("user-1");

        assertTrue(response.authorized());
    }

    @Test
    void createAuthorizationStartEncodesScopeQueryParameter() {
        when(appTokenService.issueOAuthStateToken("user-1", 600)).thenReturn("state-token");
        when(oauthClient.clientId()).thenReturn("client-id");

        GoogleAuthorizationStartResponse response = assertDoesNotThrow(
                () -> service.createAuthorizationStart("user-1"));

        assertNotNull(response.authorizationUrl());
        assertTrue(response.authorizationUrl().contains("scope=openid%20email%20profile%20https"));
    }

    @Test
    void disconnectRevokesTokenAndDeletesStoredAuthorization() {
        StoredGoogleAuthorization authorization = storedAuthorization("https://www.googleapis.com/auth/spreadsheets");
        when(repository.findBySubject("user-1")).thenReturn(Optional.of(authorization));
        when(refreshTokenCipher.decrypt("encrypted-refresh")).thenReturn("refresh-token");

        service.disconnect("user-1");

        verify(oauthClient).revokeToken("refresh-token");
        verify(repository).deleteBySubject("user-1");
    }

    @Test
    void issueAccessTokenRejectsStoredAuthorizationWithMissingRequiredScopes() {
        when(repository.findBySubject("user-1")).thenReturn(Optional.of(storedAuthorization(
                "https://www.googleapis.com/auth/drive.file")));

        assertThrows(GoogleAuthorizationRequiredException.class, () -> service.issueAccessToken("user-1"));

        verify(refreshTokenCipher, never()).decrypt(org.mockito.ArgumentMatchers.anyString());
        verify(oauthClient, never()).refreshAccessToken(org.mockito.ArgumentMatchers.anyString());
    }

    @Test
    void disconnectStillDeletesStoredAuthorizationWhenGoogleRevokeFails() {
        StoredGoogleAuthorization authorization = storedAuthorization("https://www.googleapis.com/auth/spreadsheets");
        when(repository.findBySubject("user-1")).thenReturn(Optional.of(authorization));
        when(refreshTokenCipher.decrypt("encrypted-refresh")).thenReturn("refresh-token");
        org.mockito.Mockito.doThrow(new IllegalStateException("revoke failed"))
                .when(oauthClient).revokeToken("refresh-token");

        assertThrows(IllegalStateException.class, () -> service.disconnect("user-1"));
        verify(repository).deleteBySubject("user-1");
    }

    @Test
    void disconnectIsIdempotentWhenNoStoredAuthorizationExists() {
        when(repository.findBySubject("user-1")).thenReturn(Optional.empty());

        service.disconnect("user-1");

        verify(oauthClient, never()).revokeToken(org.mockito.ArgumentMatchers.anyString());
        verify(repository, never()).deleteBySubject("user-1");
    }

    private StoredGoogleAuthorization storedAuthorization(String scopes) {
        return new StoredGoogleAuthorization(
                "user-1",
                "encrypted-refresh",
                scopes,
                Instant.now());
    }
}
