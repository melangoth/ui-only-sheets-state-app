package com.example.tokenbroker.googleauth;

public record GoogleAccessTokenResponse(String accessToken, long expiresIn) {
}
