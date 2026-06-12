package com.example.tokenbroker.googleauth;

public record GoogleTokenResponse(String accessToken, long expiresIn, String refreshToken, String scope) {
}
