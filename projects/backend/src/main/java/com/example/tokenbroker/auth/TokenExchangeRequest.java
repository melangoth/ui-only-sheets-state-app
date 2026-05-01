package com.example.tokenbroker.auth;

import jakarta.validation.constraints.NotBlank;

public record TokenExchangeRequest(@NotBlank String idToken) {}
