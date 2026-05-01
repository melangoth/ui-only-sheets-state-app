package com.example.tokenbroker;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

@SpringBootTest
@TestPropertySource(properties = {
    "app.google.client-id=test-client-id",
    "app.jwt.signing-key=test-signing-key-that-is-at-least-32-bytes-long"
})
class TokenBrokerApplicationTests {

    @Test
    void contextLoads() {
    }
}
