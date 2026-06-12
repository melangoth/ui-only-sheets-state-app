package com.example.tokenbroker.auth;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class AppTokenServiceTests {

    private final AppTokenService service =
            new AppTokenService("test-signing-key-that-is-at-least-32-bytes-long");

    @Test
    void shouldIssueAndVerifyAppTokenFromAuthorizationHeader() {
        String token = service.issueAppToken("subject-123", "test@example.com", 300);

        String subject = service.extractSubjectFromAuthorizationHeader("Bearer " + token);

        assertEquals("subject-123", subject);
    }

    @Test
    void shouldRejectMissingAuthorizationHeader() {
        assertThrows(IllegalArgumentException.class, () -> service.extractSubjectFromAuthorizationHeader(null));
    }

    @Test
    void shouldRejectExpiredAppToken() {
        String token = service.issueAppToken("subject-123", "test@example.com", -1);

        assertThrows(IllegalArgumentException.class, () -> service.extractSubjectFromAppToken(token));
    }

    @Test
    void shouldIssueAndVerifyOAuthStateToken() {
        String token = service.issueOAuthStateToken("subject-999", 300);

        String subject = service.extractSubjectFromOAuthStateToken(token);

        assertEquals("subject-999", subject);
    }
}
