package com.example.tokenbroker.googleauth;

import com.example.tokenbroker.auth.AppTokenService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;

@RestController
@RequestMapping("/api/google")
@ConditionalOnProperty(prefix = "app.google.authorization", name = "enabled", havingValue = "true")
public class GoogleAuthorizationController {

    private final GoogleAuthorizationService authorizationService;
    private final AppTokenService appTokenService;

    public GoogleAuthorizationController(GoogleAuthorizationService authorizationService,
                                         AppTokenService appTokenService) {
        this.authorizationService = authorizationService;
        this.appTokenService = appTokenService;
    }

    @GetMapping("/authorization/status")
    public ResponseEntity<GoogleAuthorizationStatusResponse> authorizationStatus(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader) {
        String subject = appTokenService.extractSubjectFromAuthorizationHeader(authorizationHeader);
        return ResponseEntity.ok(authorizationService.getStatus(subject));
    }

    @GetMapping("/authorization/start")
    public ResponseEntity<GoogleAuthorizationStartResponse> startAuthorization(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader) {
        String subject = appTokenService.extractSubjectFromAuthorizationHeader(authorizationHeader);
        return ResponseEntity.ok(authorizationService.createAuthorizationStart(subject));
    }

    @GetMapping("/authorization/callback")
    public ResponseEntity<Void> authorizationCallback(
            @RequestParam(required = false) String code,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String error) {
        String redirectUrl = authorizationService.handleAuthorizationCallback(code, state, error);
        return ResponseEntity.status(302).location(URI.create(redirectUrl)).build();
    }

    @PostMapping("/access-token")
    public ResponseEntity<GoogleAccessTokenResponse> issueAccessToken(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader) {
        String subject = appTokenService.extractSubjectFromAuthorizationHeader(authorizationHeader);
        return ResponseEntity.ok(authorizationService.issueAccessToken(subject));
    }

    @DeleteMapping("/authorization")
    public ResponseEntity<Void> disconnectAuthorization(
            @RequestHeader(HttpHeaders.AUTHORIZATION) String authorizationHeader) {
        String subject = appTokenService.extractSubjectFromAuthorizationHeader(authorizationHeader);
        authorizationService.disconnect(subject);
        return ResponseEntity.noContent().build();
    }
}
