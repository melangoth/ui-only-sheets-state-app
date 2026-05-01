# ADR-20260501-2209: Backend token broker for Google Sheets authorization

**Status:** Accepted
**Date:** 2026-05-01

---

## Context

The frontend holds two separate Google flows: a sign-in step that identifies the user and an OAuth authorization step that acquires a `drive.file` access token for Sheets operations. Both flows live entirely in the browser, which makes longer-lived session control and server-side token management impossible. Introducing a backend token broker lets the app exchange a verified Google identity for a short-lived application bearer token, setting the foundation for moving Sheets operations behind a server in a later phase.

---

## Decision

Adopt **Plan A** as the first delivery phase:

- Introduce a Spring Boot 3 microservice deployed on Google Cloud Run.
- Keep the existing Google sign-in step in the frontend.
- Exchange the verified Google ID credential with the backend for a short-lived app JWT.
- Keep direct Google Sheets / Drive API calls in the frontend for now (Plan B moves them to the backend).

| New environment flag | Type | Purpose |
|---|---|---|
| `backendUrl` | `string` | Base URL of the token broker service |
| `useBackendSession` | `boolean` | Feature flag; set to `true` when backend is reachable |

Key design choices:
- App token is kept **in memory only** (never written to storage) — consistent with the token storage policy.
- Google ID token travels to the backend only over HTTPS; the backend verifies it using Google's public keys before issuing any app token.
- Full migration of Sheets calls to the backend (Plan B) is deferred to reduce first-delivery scope.

---

## Implementation

### New files

| File | Description |
|---|---|
| `docs/adr/20260501-2209-backend-token-broker.md` | This ADR |
| `projects/backend/pom.xml` | Maven build descriptor for Spring Boot 3 backend |
| `projects/backend/src/main/java/…/TokenBrokerApplication.java` | Spring Boot entry point |
| `projects/backend/src/main/java/…/auth/AuthController.java` | REST endpoint `POST /api/auth/exchange` |
| `projects/backend/src/main/java/…/auth/AuthService.java` | Google ID token verification and app JWT issuance |
| `projects/backend/src/main/java/…/auth/TokenExchangeRequest.java` | Request DTO |
| `projects/backend/src/main/java/…/auth/TokenExchangeResponse.java` | Response DTO |
| `projects/backend/src/main/resources/application.properties` | App configuration |
| `projects/backend/src/test/java/…/TokenBrokerApplicationTests.java` | Smoke test |

### Modified files

| File | Change |
|---|---|
| `.github/copilot-instructions.md` | Document the backend exception and add Spring Boot / Cloud Run guidelines |
| `projects/backend/README.md` | Runtime, local dev, and Cloud Run deployment instructions |
| `projects/frontend/src/environments/environment.model.ts` | Add `backendUrl` and `useBackendSession` fields |
| `projects/frontend/src/environments/environment.ts` | Set `backendUrl: 'http://localhost:8080'`, `useBackendSession: false` |
| `projects/frontend/src/environments/environment.prod.ts` | Set `backendUrl` to Cloud Run URL placeholder, `useBackendSession: false` |
| `projects/frontend/src/app/core/auth/auth.service.ts` | Exchange Google credential for app token when `useBackendSession` is true |
| `projects/frontend/src/app/core/google-api/google-api.service.ts` | Add `directApiEnabled` flag for future Plan B proxy mode |

---

## Usage

### Local development

```bash
# Start backend
cd projects/backend
./mvnw spring-boot:run

# Start frontend (in a separate terminal)
cd projects/frontend
npm start
```

### Enable backend session exchange

```typescript
// environment.ts (dev)
backendUrl: 'http://localhost:8080',
useBackendSession: true,
```

### Token exchange request (frontend → backend)

```http
POST /api/auth/exchange
Content-Type: application/json

{ "idToken": "<Google ID JWT>" }
```

Response:
```json
{ "appToken": "<short-lived app JWT>", "expiresIn": 3600 }
```

---

## Trade-offs

- Plan A does **not** remove Google access tokens from the browser while Sheets calls stay in the frontend.
- The `useBackendSession` flag defaults to `false` so existing deployments are unaffected until the backend is live.
- Firestore / database integration for session revocation is deferred to a follow-up.
- This ADR supersedes the "browser-only" constraint in `copilot-instructions.md` for the `projects/backend/` subtree.
