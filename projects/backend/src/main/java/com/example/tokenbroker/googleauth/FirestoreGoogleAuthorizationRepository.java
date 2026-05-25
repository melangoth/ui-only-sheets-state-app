package com.example.tokenbroker.googleauth;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.WriteResult;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;

public class FirestoreGoogleAuthorizationRepository implements GoogleAuthorizationRepository {

    private final Firestore firestore;
    private final String collectionName;

    public FirestoreGoogleAuthorizationRepository(Firestore firestore, String collectionName) {
        this.firestore = firestore;
        this.collectionName = collectionName;
    }

    @Override
    public Optional<StoredGoogleAuthorization> findBySubject(String subject) {
        try {
            ApiFuture<DocumentSnapshot> future = firestore.collection(collectionName).document(subject).get();
            DocumentSnapshot snapshot = future.get();
            if (!snapshot.exists()) {
                return Optional.empty();
            }

            String encryptedRefreshToken = snapshot.getString("encryptedRefreshToken");
            String scopes = snapshot.getString("scopes");
            Long updatedAtEpochSeconds = snapshot.getLong("updatedAtEpochSeconds");
            if (!StringUtils.hasText(encryptedRefreshToken)) {
                return Optional.empty();
            }

            Instant updatedAt = updatedAtEpochSeconds == null
                    ? Instant.now()
                    : Instant.ofEpochSecond(updatedAtEpochSeconds);

            return Optional.of(new StoredGoogleAuthorization(subject, encryptedRefreshToken, scopes, updatedAt));
        } catch (Exception e) {
            throw new IllegalStateException("Could not read Google authorization from Firestore.", e);
        }
    }

    @Override
    public void save(StoredGoogleAuthorization authorization) {
        try {
            Map<String, Object> fields = new HashMap<>();
            fields.put("subject", authorization.subject());
            fields.put("encryptedRefreshToken", authorization.encryptedRefreshToken());
            fields.put("scopes", authorization.scopes());
            fields.put("updatedAtEpochSeconds", authorization.updatedAt().getEpochSecond());

            ApiFuture<WriteResult> future = firestore.collection(collectionName)
                    .document(authorization.subject())
                    .set(fields);
            future.get();
        } catch (Exception e) {
            throw new IllegalStateException("Could not write Google authorization to Firestore.", e);
        }
    }

    @Override
    public void deleteBySubject(String subject) {
        try {
            ApiFuture<WriteResult> future = firestore.collection(collectionName).document(subject).delete();
            future.get();
        } catch (Exception e) {
            throw new IllegalStateException("Could not delete Google authorization from Firestore.", e);
        }
    }
}
