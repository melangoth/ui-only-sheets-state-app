package com.example.tokenbroker.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final String googleClientId;
    private final long tokenTtlSeconds;
    private final AppTokenService appTokenService;

    public AuthService(
            @Value("${app.google.client-id}") String googleClientId,
            @Value("${app.jwt.ttl-seconds:3600}") long tokenTtlSeconds,
            AppTokenService appTokenService) {
        this.googleClientId = googleClientId;
        this.tokenTtlSeconds = tokenTtlSeconds;
        this.appTokenService = appTokenService;
    }

    /**
     * Verifies the Google ID token and issues a short-lived app JWT.
     *
     * @param idToken the Google ID token from the frontend
     * @return a signed app JWT
     * @throws IllegalArgumentException if the token is invalid or verification fails
     */
    public TokenExchangeResponse exchange(String idToken) {
        GoogleIdToken.Payload googlePayload = verifyGoogleToken(idToken);
        String appToken = issueAppToken(googlePayload);
        log.info("Issued app token for verified Google subject={}, emailPresent={}, ttlSeconds={}",
                googlePayload.getSubject(), googlePayload.getEmail() != null, tokenTtlSeconds);
        return new TokenExchangeResponse(appToken, tokenTtlSeconds);
    }

    private GoogleIdToken.Payload verifyGoogleToken(String idToken) {
        GoogleIdToken token;
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();
            token = verifier.verify(idToken);
        } catch (Exception e) {
            log.warn("Google ID token verification failed during verifier call: reason={}",
                    e.getClass().getSimpleName());
            throw new IllegalArgumentException("Could not verify Google ID token.", e);
        }
        if (token == null) {
            log.warn("Google ID token verification failed: reason=invalid-token-or-audience-mismatch");
            throw new IllegalArgumentException("Google ID token verification failed.");
        }
        return token.getPayload();
    }

    private String issueAppToken(GoogleIdToken.Payload payload) {
        try {
            return appTokenService.issueAppToken(payload.getSubject(), payload.getEmail(), tokenTtlSeconds);
        } catch (Exception e) {
            throw new IllegalStateException("Could not issue app token.", e);
        }
    }
}
