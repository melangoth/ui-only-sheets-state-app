package com.example.tokenbroker.googleauth;

import com.example.tokenbroker.auth.AppTokenService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Optional;
import java.util.Set;

@Service
@ConditionalOnProperty(prefix = "app.google.authorization", name = "enabled", havingValue = "true")
public class GoogleAuthorizationService {

    private static final long OAUTH_STATE_TTL_SECONDS = 600;
    private static final Set<String> NON_API_SCOPES = Set.of("openid", "email", "profile");

    private final AppTokenService appTokenService;
    private final GoogleAuthorizationRepository repository;
    private final GoogleOAuthClient oauthClient;
    private final RefreshTokenCipher refreshTokenCipher;
    private final String callbackUrl;
    private final String postAuthRedirectUri;
    private final String oauthScopes;
    private final Set<String> requiredApiScopes;

    public GoogleAuthorizationService(
            AppTokenService appTokenService,
            GoogleAuthorizationRepository repository,
            GoogleOAuthClient oauthClient,
            RefreshTokenCipher refreshTokenCipher,
            @Value("${app.google.authorization.callback-url}") String callbackUrl,
            @Value("${app.google.authorization.post-auth-redirect-uri}") String postAuthRedirectUri,
            @Value("${app.google.authorization.scopes:openid email profile https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/spreadsheets}") String oauthScopes) {
        this.appTokenService = appTokenService;
        this.repository = repository;
        this.oauthClient = oauthClient;
        this.refreshTokenCipher = refreshTokenCipher;
        this.callbackUrl = callbackUrl;
        this.postAuthRedirectUri = postAuthRedirectUri;
        this.oauthScopes = oauthScopes;
        this.requiredApiScopes = parseScopes(oauthScopes).stream()
                .filter(scope -> !NON_API_SCOPES.contains(scope))
                .collect(java.util.stream.Collectors.toSet());
    }

    public GoogleAuthorizationStatusResponse getStatus(String subject) {
        boolean authorized = repository.findBySubject(subject)
                .map(this::hasRequiredScopes)
                .orElse(false);
        return new GoogleAuthorizationStatusResponse(authorized);
    }

    public GoogleAuthorizationStartResponse createAuthorizationStart(String subject) {
        String stateToken = appTokenService.issueOAuthStateToken(subject, OAUTH_STATE_TTL_SECONDS);

        String authorizationUrl = UriComponentsBuilder
                .fromUriString("https://accounts.google.com/o/oauth2/v2/auth")
                .queryParam("client_id", oauthClient.clientId())
                .queryParam("redirect_uri", callbackUrl)
                .queryParam("response_type", "code")
                .queryParam("scope", oauthScopes)
                .queryParam("state", stateToken)
                .queryParam("access_type", "offline")
                .queryParam("include_granted_scopes", "true")
                .queryParam("prompt", "consent")
                .build()
                .encode()
                .toUriString();

        return new GoogleAuthorizationStartResponse(authorizationUrl);
    }

    public String handleAuthorizationCallback(String code, String state, String error) {
        if (StringUtils.hasText(error)) {
            throw new IllegalArgumentException("Google authorization failed: " + error);
        }
        if (!StringUtils.hasText(code) || !StringUtils.hasText(state)) {
            throw new IllegalArgumentException("Missing OAuth callback code or state.");
        }

        String subject = appTokenService.extractSubjectFromOAuthStateToken(state);

        GoogleTokenResponse tokenResponse = oauthClient.exchangeAuthorizationCode(code, callbackUrl);
        if (!StringUtils.hasText(tokenResponse.refreshToken())) {
            throw new IllegalArgumentException("Google callback did not provide a refresh token.");
        }

        String encryptedRefreshToken = refreshTokenCipher.encrypt(tokenResponse.refreshToken());
        StoredGoogleAuthorization authorization = new StoredGoogleAuthorization(
                subject,
                encryptedRefreshToken,
                tokenResponse.scope(),
                Instant.now());
        repository.save(authorization);

        return postAuthRedirectUri;
    }

    public GoogleAccessTokenResponse issueAccessToken(String subject) {
        StoredGoogleAuthorization authorization = repository.findBySubject(subject)
                .orElseThrow(() -> new GoogleAuthorizationRequiredException("Google authorization not found for current user."));
        if (!hasRequiredScopes(authorization)) {
            throw new GoogleAuthorizationRequiredException("Google authorization does not include all required scopes.");
        }

        String refreshToken = refreshTokenCipher.decrypt(authorization.encryptedRefreshToken());
        GoogleTokenResponse tokenResponse = oauthClient.refreshAccessToken(refreshToken);

        return new GoogleAccessTokenResponse(tokenResponse.accessToken(), tokenResponse.expiresIn());
    }

    public void disconnect(String subject) {
        Optional<StoredGoogleAuthorization> stored = repository.findBySubject(subject);
        if (stored.isEmpty()) {
            return;
        }

        String refreshToken = refreshTokenCipher.decrypt(stored.get().encryptedRefreshToken());
        try {
            oauthClient.revokeToken(refreshToken);
        } finally {
            repository.deleteBySubject(subject);
        }
    }

    private boolean hasRequiredScopes(StoredGoogleAuthorization authorization) {
        if (requiredApiScopes.isEmpty()) {
            return true;
        }
        Set<String> grantedScopes = parseScopes(authorization.scopes());
        return grantedScopes.containsAll(requiredApiScopes);
    }

    private Set<String> parseScopes(String scopesText) {
        if (!StringUtils.hasText(scopesText)) {
            return Set.of();
        }
        return Arrays.stream(scopesText.trim().split("\\s+"))
                .filter(StringUtils::hasText)
                .collect(java.util.stream.Collectors.toCollection(HashSet::new));
    }
}
