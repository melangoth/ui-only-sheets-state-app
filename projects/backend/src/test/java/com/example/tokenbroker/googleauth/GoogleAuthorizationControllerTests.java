package com.example.tokenbroker.googleauth;

import com.example.tokenbroker.auth.AppTokenService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = GoogleAuthorizationController.class, properties = "app.google.authorization.enabled=true")
class GoogleAuthorizationControllerTests {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private GoogleAuthorizationService authorizationService;

    @MockBean
    private AppTokenService appTokenService;

    @Test
    void statusEndpointRejectsMissingAuthorizationHeader() throws Exception {
        mockMvc.perform(get("/api/google/authorization/status"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(appTokenService);
        verifyNoInteractions(authorizationService);
    }

    @Test
    void protectedEndpointsRejectMissingAuthorizationHeader() throws Exception {
        mockMvc.perform(get("/api/google/authorization/start"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(post("/api/google/access-token"))
                .andExpect(status().isBadRequest());
        mockMvc.perform(delete("/api/google/authorization"))
                .andExpect(status().isBadRequest());

        verifyNoInteractions(appTokenService);
    }

    @Test
    void callbackEndpointAllowsUnauthenticatedRedirectFlow() throws Exception {
        when(authorizationService.handleAuthorizationCallback("test-code", "test-state", null))
                .thenReturn("https://melangoth.github.io");

        mockMvc.perform(get("/api/google/authorization/callback")
                        .queryParam("code", "test-code")
                        .queryParam("state", "test-state"))
                .andExpect(status().isFound())
                .andExpect(header().string(HttpHeaders.LOCATION, "https://melangoth.github.io"));
    }
}
