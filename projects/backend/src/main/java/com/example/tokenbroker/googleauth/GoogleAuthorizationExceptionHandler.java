package com.example.tokenbroker.googleauth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice(assignableTypes = GoogleAuthorizationController.class)
@ConditionalOnProperty(prefix = "app.google.authorization", name = "enabled", havingValue = "true")
public class GoogleAuthorizationExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GoogleAuthorizationExceptionHandler.class);

    @ExceptionHandler(GoogleAuthorizationRequiredException.class)
    public ProblemDetail handleAuthorizationRequired(GoogleAuthorizationRequiredException ex) {
        ProblemDetail detail = ProblemDetail.forStatus(HttpStatus.NOT_FOUND);
        detail.setTitle("Google authorization required");
        detail.setDetail(ex.getMessage());
        return detail;
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ProblemDetail handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Google authorization request rejected: reason={}", ex.getMessage());
        ProblemDetail detail = ProblemDetail.forStatus(HttpStatus.UNAUTHORIZED);
        detail.setTitle("Google authorization failed");
        detail.setDetail(ex.getMessage());
        return detail;
    }

    @ExceptionHandler(IllegalStateException.class)
    public ProblemDetail handleIllegalState(IllegalStateException ex) {
        log.error("Google authorization backend error", ex);
        ProblemDetail detail = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        detail.setTitle("Google authorization backend error");
        detail.setDetail("The backend could not complete the Google authorization operation.");
        return detail;
    }
}
