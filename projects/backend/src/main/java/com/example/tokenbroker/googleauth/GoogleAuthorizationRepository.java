package com.example.tokenbroker.googleauth;

import java.util.Optional;

public interface GoogleAuthorizationRepository {

    Optional<StoredGoogleAuthorization> findBySubject(String subject);

    void save(StoredGoogleAuthorization authorization);

    void deleteBySubject(String subject);
}
