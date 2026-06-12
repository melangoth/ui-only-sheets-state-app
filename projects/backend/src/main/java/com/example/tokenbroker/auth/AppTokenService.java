package com.example.tokenbroker.auth;

import com.nimbusds.jose.JOSEException;
import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.MACSigner;
import com.nimbusds.jose.crypto.MACVerifier;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.Assert;
import org.springframework.util.StringUtils;

import java.nio.charset.StandardCharsets;
import java.text.ParseException;
import java.time.Instant;
import java.util.Date;

@Service
public class AppTokenService {

    private static final String AUTH_SCHEME = "Bearer ";
    private static final String APP_TOKEN_TYPE = "app";
    private static final String OAUTH_STATE_TOKEN_TYPE = "oauth_state";

    private final byte[] jwtSigningKey;

    public AppTokenService(@Value("${app.jwt.signing-key}") String jwtSigningKey) {
        byte[] keyBytes = jwtSigningKey.getBytes(StandardCharsets.UTF_8);
        Assert.isTrue(keyBytes.length >= 32,
                "app.jwt.signing-key must be at least 32 bytes (256 bits) for HMAC-SHA256.");
        this.jwtSigningKey = keyBytes;
    }

    public String issueAppToken(String subject, String email, long ttlSeconds) {
        Instant now = Instant.now();
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject(subject)
                .claim("email", email)
                .claim("type", APP_TOKEN_TYPE)
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(ttlSeconds)))
                .build();
        return sign(claims);
    }

    public String issueOAuthStateToken(String subject, long ttlSeconds) {
        Instant now = Instant.now();
        JWTClaimsSet claims = new JWTClaimsSet.Builder()
                .subject(subject)
                .claim("type", OAUTH_STATE_TOKEN_TYPE)
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(ttlSeconds)))
                .build();
        return sign(claims);
    }

    public String extractSubjectFromAuthorizationHeader(String authorizationHeader) {
        if (!StringUtils.hasText(authorizationHeader) || !authorizationHeader.startsWith(AUTH_SCHEME)) {
            throw new IllegalArgumentException("Missing or invalid Authorization header.");
        }
        String token = authorizationHeader.substring(AUTH_SCHEME.length()).trim();
        return extractSubjectFromAppToken(token);
    }

    public String extractSubjectFromAppToken(String token) {
        SignedJWT jwt = parseAndVerify(token);
        String tokenType = stringClaim(jwt, "type");
        if (StringUtils.hasText(tokenType) && !APP_TOKEN_TYPE.equals(tokenType)) {
            throw new IllegalArgumentException("Unexpected token type.");
        }
        String subject = subjectClaim(jwt);
        if (!StringUtils.hasText(subject)) {
            throw new IllegalArgumentException("JWT subject is missing.");
        }
        return subject;
    }

    public String extractSubjectFromOAuthStateToken(String token) {
        SignedJWT jwt = parseAndVerify(token);
        String tokenType = stringClaim(jwt, "type");
        if (!OAUTH_STATE_TOKEN_TYPE.equals(tokenType)) {
            throw new IllegalArgumentException("Invalid OAuth state token type.");
        }
        String subject = subjectClaim(jwt);
        if (!StringUtils.hasText(subject)) {
            throw new IllegalArgumentException("OAuth state subject is missing.");
        }
        return subject;
    }

    private SignedJWT parseAndVerify(String token) {
        try {
            SignedJWT jwt = SignedJWT.parse(token);
            MACVerifier verifier = new MACVerifier(jwtSigningKey);
            if (!jwt.verify(verifier)) {
                throw new IllegalArgumentException("JWT signature verification failed.");
            }

            Date expiration = jwt.getJWTClaimsSet().getExpirationTime();
            if (expiration == null || expiration.before(new Date())) {
                throw new IllegalArgumentException("JWT expired.");
            }
            return jwt;
        } catch (ParseException | JOSEException e) {
            throw new IllegalArgumentException("JWT parsing or verification failed.", e);
        }
    }

    private String sign(JWTClaimsSet claims) {
        try {
            SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.HS256), claims);
            jwt.sign(new MACSigner(jwtSigningKey));
            return jwt.serialize();
        } catch (JOSEException e) {
            throw new IllegalStateException("Could not sign JWT.", e);
        }
    }

    private String stringClaim(SignedJWT jwt, String name) {
        try {
            Object claim = jwt.getJWTClaimsSet().getClaim(name);
            return claim == null ? null : String.valueOf(claim);
        } catch (ParseException e) {
            throw new IllegalArgumentException("Could not parse JWT claims.", e);
        }
    }

    private String subjectClaim(SignedJWT jwt) {
        try {
            return jwt.getJWTClaimsSet().getSubject();
        } catch (ParseException e) {
            throw new IllegalArgumentException("Could not parse JWT subject.", e);
        }
    }
}
