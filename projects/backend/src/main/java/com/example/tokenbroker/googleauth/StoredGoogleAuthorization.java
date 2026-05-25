package com.example.tokenbroker.googleauth;

import java.time.Instant;

public record StoredGoogleAuthorization(
        String subject,
        String encryptedRefreshToken,
        String scopes,
        Instant updatedAt) {
}
