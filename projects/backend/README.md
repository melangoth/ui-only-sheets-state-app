# token-broker — Spring Boot Backend

Backend token broker for the Angular frontend. Verifies Google ID tokens, issues short-lived application JWTs, and can own Google Drive/Sheets OAuth authorization.

## Tech stack

| Layer | Technology |
|---|---|
| Language | Java 21 |
| Framework | Spring Boot 3.4.x |
| Build tool | Gradle (`./gradlew`) |
| Auth: verify Google ID tokens | `google-auth-library-oauth2-http` |
| Auth: issue app JWTs | `nimbus-jose-jwt` |
| Auth: backend-owned Google OAuth token store | Firestore + encrypted refresh tokens |
| Deployment | Google Cloud Run via Cloud Build trigger |
| Health probe | Spring Boot Actuator (`/actuator/health`) |

## Local development

### Prerequisites

- Java 21+
- Gradle wrapper included (`./gradlew`)

### Run locally

```bash
cd projects/backend

# Set required environment variables
export GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
export JWT_SIGNING_KEY=<random-32+-byte-secret>

./gradlew bootRun
```

The server starts on `http://localhost:8080`.

### Test

```bash
./gradlew build
```

## API

### `POST /api/auth/exchange`

Exchanges a Google ID token for a short-lived app bearer JWT.

**Request:**
```json
{ "idToken": "<Google ID JWT from Google Identity Services>" }
```

**Response (200):**
```json
{ "appToken": "<signed app JWT>", "expiresIn": 3600 }
```

**Error responses:**
- `400 Bad Request` — missing or blank `idToken`
- `401 Unauthorized` — Google token verification failed

### Backend-owned Google authorization endpoints (`GOOGLE_AUTHORIZATION_ENABLED=true`)

- `GET /api/google/authorization/status` — check whether the current app-JWT user has stored Google authorization
- `GET /api/google/authorization/start` — return a Google OAuth consent URL for the current app-JWT user
- `GET /api/google/authorization/callback` — OAuth callback endpoint (stores encrypted refresh token and redirects to frontend)
- `POST /api/google/access-token` — mint short-lived Google access token from stored refresh token
- `DELETE /api/google/authorization` — revoke and remove stored authorization

### `GET /actuator/health`

Liveness / readiness probe used by Cloud Run. Returns `{ "status": "UP" }`.

## Cloud Run deployment

Backend deployment is intended to run from Google Cloud Build, not from a local machine. The build/deploy entrypoint is `cloudbuild.backend.yaml`, and the full setup checklist lives in [GCP Onboarding Guide](../../docs/guidelines/gcp-onboarding.md).

## Configuration reference

| Property / Env var | Required | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth 2.0 client ID (same as frontend) |
| `GOOGLE_CLIENT_SECRET` | If backend-owned Google auth is enabled | OAuth client secret for authorization-code token exchange |
| `JWT_SIGNING_KEY` | Yes | HMAC-SHA256 signing key (≥ 32 bytes); inject via Secret Manager |
| `app.jwt.ttl-seconds` | No (default: 3600) | App token lifetime in seconds |
| `GOOGLE_AUTHORIZATION_ENABLED` | No (default: `false`) | Enable backend-owned Google authorization endpoints |
| `GOOGLE_AUTHORIZATION_CALLBACK_URL` | If backend-owned Google auth is enabled | OAuth callback URL (`<backend>/api/google/authorization/callback`) |
| `GOOGLE_AUTHORIZATION_POST_AUTH_REDIRECT_URI` | If backend-owned Google auth is enabled | Frontend URL to redirect to after callback |
| `GOOGLE_AUTHORIZATION_TOKEN_ENCRYPTION_KEY` | If backend-owned Google auth is enabled | Base64-encoded 32-byte AES key for refresh-token encryption |
| `GOOGLE_AUTHORIZATION_FIRESTORE_PROJECT_ID` | No | Optional explicit Firestore project ID override |
| `GOOGLE_AUTHORIZATION_FIRESTORE_COLLECTION` | No | Firestore collection name for stored Google authorizations |
| `app.cors.allowed-origins` | No (default: `http://localhost:4200`) | Comma-separated frontend origin(s) allowed by CORS |
| `PORT` | No (default: 8080) | Server port — Cloud Run sets this automatically |

> **Security note:** Never commit `GOOGLE_CLIENT_ID` or `JWT_SIGNING_KEY` to source control. Use Google Secret Manager and inject them as environment variables at deploy time.

For production backend-owned Google authorization, the OAuth Web client must include this redirect URI: `https://token-broker-cmpyaqfhrq-ew.a.run.app/api/google/authorization/callback`, and its matching client secret must be stored in Secret Manager as `google-client-secret`.

## Design decisions

See [ADR-20260501-2209](../../docs/adr/20260501-2209-backend-token-broker.md) and [ADR-20260525-0923](../../docs/adr/20260525-0923-backend-owned-google-authorization.md) for the architectural decisions.
