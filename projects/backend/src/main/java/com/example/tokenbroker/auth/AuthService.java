package com.example.tokenbroker.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Collections;
import java.util.Date;

@Service
public class AuthService {

    private final String googleClientId;
    private final byte[] jwtSigningKey;
    private final long tokenTtlSeconds;

    public AuthService(
            @Value("${app.google.client-id}") String googleClientId,
            @Value("${app.jwt.signing-key}") String jwtSigningKey,
            @Value("${app.jwt.ttl-seconds:3600}") long tokenTtlSeconds) {
        this.googleClientId = googleClientId;
        this.jwtSigningKey = jwtSigningKey.getBytes();
        this.tokenTtlSeconds = tokenTtlSeconds;
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
        return new TokenExchangeResponse(appToken, tokenTtlSeconds);
    }

    private GoogleIdToken.Payload verifyGoogleToken(String idToken) {
        try {
            GoogleIdTokenVerifier verifier = new GoogleIdTokenVerifier.Builder(
                    new NetHttpTransport(), GsonFactory.getDefaultInstance())
                    .setAudience(Collections.singletonList(googleClientId))
                    .build();

            GoogleIdToken token = verifier.verify(idToken);
            if (token == null) {
                throw new IllegalArgumentException("Google ID token verification failed.");
            }
            return token.getPayload();
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalArgumentException("Could not verify Google ID token: " + e.getMessage(), e);
        }
    }

    private String issueAppToken(GoogleIdToken.Payload payload) {
        try {
            Instant now = Instant.now();
            JWTClaimsSet claims = new JWTClaimsSet.Builder()
                    .subject(payload.getSubject())
                    .claim("email", payload.getEmail())
                    .issueTime(Date.from(now))
                    .expirationTime(Date.from(now.plusSeconds(tokenTtlSeconds)))
                    .build();

            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
            jwt.sign(new MACSigner(jwtSigningKey));
            return jwt.serialize();
        } catch (Exception e) {
            throw new IllegalStateException("Could not issue app token.", e);
        }
    }
}
