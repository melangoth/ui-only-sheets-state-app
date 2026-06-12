package com.example.tokenbroker.googleauth;

import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.FirestoreOptions;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

@Configuration
@ConditionalOnProperty(prefix = "app.google.authorization", name = "enabled", havingValue = "true")
public class GoogleAuthorizationConfig {

    @Bean
    public Firestore firestore(@Value("${app.google.authorization.firestore.project-id:}") String projectId) {
        FirestoreOptions.Builder builder = FirestoreOptions.newBuilder();
        if (StringUtils.hasText(projectId)) {
            builder.setProjectId(projectId);
        }
        return builder.build().getService();
    }

    @Bean
    public GoogleAuthorizationRepository googleAuthorizationRepository(
            Firestore firestore,
            @Value("${app.google.authorization.firestore.collection:user_google_authorizations}") String collectionName) {
        return new FirestoreGoogleAuthorizationRepository(firestore, collectionName);
    }
}
