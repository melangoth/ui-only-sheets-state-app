package com.example.tokenbroker.googleauth;

public class GoogleAuthorizationRequiredException extends RuntimeException {

    public GoogleAuthorizationRequiredException(String message) {
        super(message);
    }
}
