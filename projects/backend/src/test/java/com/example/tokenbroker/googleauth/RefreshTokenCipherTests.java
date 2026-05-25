package com.example.tokenbroker.googleauth;

import org.junit.jupiter.api.Test;

import java.util.Base64;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

class RefreshTokenCipherTests {

    @Test
    void shouldEncryptAndDecryptRefreshToken() {
        byte[] key = new byte[32];
        for (int i = 0; i < key.length; i++) {
            key[i] = (byte) (i + 1);
        }

        RefreshTokenCipher cipher = new RefreshTokenCipher(Base64.getEncoder().encodeToString(key));
        String token = "refresh-token-value";

        String encrypted = cipher.encrypt(token);
        String decrypted = cipher.decrypt(encrypted);

        assertNotEquals(token, encrypted);
        assertEquals(token, decrypted);
    }
}
