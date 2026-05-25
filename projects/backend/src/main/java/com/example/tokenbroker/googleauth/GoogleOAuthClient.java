package com.example.tokenbroker.googleauth;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.stream.Collectors;

@Component
@ConditionalOnProperty(prefix = "app.google.authorization", name = "enabled", havingValue = "true")
public class GoogleOAuthClient {

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    private final String clientId;
    private final String clientSecret;

    public GoogleOAuthClient(
            @Value("${app.google.client-id}") String clientId,
            @Value("${app.google.client-secret}") String clientSecret,
            ObjectMapper objectMapper) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        this.objectMapper = objectMapper;
        this.httpClient = HttpClient.newHttpClient();
    }

    public String clientId() {
        return clientId;
    }

    public GoogleTokenResponse exchangeAuthorizationCode(String code, String redirectUri) {
        Map<String, String> form = new LinkedHashMap<>();
        form.put("code", code);
        form.put("client_id", clientId);
        form.put("client_secret", clientSecret);
        form.put("redirect_uri", redirectUri);
        form.put("grant_type", "authorization_code");
        return callTokenEndpoint(form);
    }

    public GoogleTokenResponse refreshAccessToken(String refreshToken) {
        Map<String, String> form = new LinkedHashMap<>();
        form.put("refresh_token", refreshToken);
        form.put("client_id", clientId);
        form.put("client_secret", clientSecret);
        form.put("grant_type", "refresh_token");
        return callTokenEndpoint(form);
    }

    public void revokeToken(String token) {
        try {
            String body = "token=" + URLEncoder.encode(token, StandardCharsets.UTF_8);
            HttpRequest request = HttpRequest.newBuilder(URI.create("https://oauth2.googleapis.com/revoke"))
                    .header("Content-Type", MediaType.APPLICATION_FORM_URLENCODED_VALUE)
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalArgumentException("Google revoke endpoint returned status " + response.statusCode() + ".");
            }
        } catch (Exception e) {
            throw new IllegalStateException("Could not revoke Google token.", e);
        }
    }

    private GoogleTokenResponse callTokenEndpoint(Map<String, String> form) {
        try {
            String body = form.entrySet().stream()
                    .map(entry -> URLEncoder.encode(entry.getKey(), StandardCharsets.UTF_8)
                            + "="
                            + URLEncoder.encode(entry.getValue(), StandardCharsets.UTF_8))
                    .collect(Collectors.joining("&"));

            HttpRequest request = HttpRequest.newBuilder(URI.create("https://oauth2.googleapis.com/token"))
                    .header("Content-Type", MediaType.APPLICATION_FORM_URLENCODED_VALUE)
                    .POST(HttpRequest.BodyPublishers.ofString(body))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new IllegalArgumentException("Google token endpoint returned status " + response.statusCode() + ".");
            }

            JsonNode json = objectMapper.readTree(response.body());
            String accessToken = textOrNull(json, "access_token");
            long expiresIn = json.path("expires_in").asLong(0);
            String refreshToken = textOrNull(json, "refresh_token");
            String scope = textOrNull(json, "scope");

            if (!StringUtils.hasText(accessToken) || expiresIn <= 0) {
                throw new IllegalArgumentException("Google token response was missing required fields.");
            }

            return new GoogleTokenResponse(accessToken, expiresIn, refreshToken, scope);
        } catch (IllegalArgumentException e) {
            throw e;
        } catch (Exception e) {
            throw new IllegalStateException("Could not call Google token endpoint.", e);
        }
    }

    private String textOrNull(JsonNode jsonNode, String field) {
        String value = jsonNode.path(field).asText();
        return StringUtils.hasText(value) ? value : null;
    }
}
