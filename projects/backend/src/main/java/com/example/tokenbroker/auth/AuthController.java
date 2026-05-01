package com.example.tokenbroker.auth;

import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    /**
     * Exchanges a verified Google ID token for a short-lived app bearer token.
     *
     * <p>The frontend calls this endpoint immediately after Google sign-in when
     * {@code useBackendSession} is enabled in the environment configuration.
     *
     * @param request contains the Google ID token credential
     * @return a short-lived app JWT and its TTL in seconds
     */
    @PostMapping("/exchange")
    public ResponseEntity<TokenExchangeResponse> exchange(@Valid @RequestBody TokenExchangeRequest request) {
        TokenExchangeResponse response = authService.exchange(request.idToken());
        return ResponseEntity.ok(response);
    }
}
