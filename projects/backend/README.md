# token-broker — Spring Boot Backend

Backend token broker for the Angular frontend. Verifies Google ID tokens and issues short-lived application JWTs.

## Tech stack

| Layer | Technology |
|---|---|
| Language | Java 21 |
| Framework | Spring Boot 3.4.x |
| Build tool | Maven (`./mvnw`) |
| Auth: verify Google ID tokens | `google-auth-library-oauth2-http` |
| Auth: issue app JWTs | `nimbus-jose-jwt` |
| Deployment | Google Cloud Run (stateless container) |
| Health probe | Spring Boot Actuator (`/actuator/health`) |

## Local development

### Prerequisites

- Java 21+
- Maven wrapper included (`./mvnw`)

### Run locally

```bash
cd projects/backend

# Set required environment variables
export GOOGLE_CLIENT_ID=<your-google-oauth-client-id>
export JWT_SIGNING_KEY=<random-32+-byte-secret>

./mvnw spring-boot:run
```

The server starts on `http://localhost:8080`.

### Test

```bash
./mvnw verify
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

### `GET /actuator/health`

Liveness / readiness probe used by Cloud Run. Returns `{ "status": "UP" }`.

## Cloud Run deployment

1. **Build the container image:**
   ```bash
   cd projects/backend
   ./mvnw spring-boot:build-image -Dspring-boot.build-image.imageName=gcr.io/<PROJECT>/token-broker
   ```

2. **Push to Artifact Registry:**
   ```bash
   docker push gcr.io/<PROJECT>/token-broker
   ```

3. **Deploy to Cloud Run:**
   ```bash
   gcloud run deploy token-broker \
     --image gcr.io/<PROJECT>/token-broker \
     --region europe-west1 \
     --platform managed \
     --allow-unauthenticated \
     --set-secrets GOOGLE_CLIENT_ID=google-client-id:latest,JWT_SIGNING_KEY=jwt-signing-key:latest
   ```

4. **Update the frontend** `environment.prod.ts` with the Cloud Run service URL and set `useBackendSession: true`.

## Configuration reference

| Property / Env var | Required | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | Yes | Google OAuth 2.0 client ID (same as frontend) |
| `JWT_SIGNING_KEY` | Yes | HMAC-SHA256 signing key (≥ 32 bytes); inject via Secret Manager |
| `app.jwt.ttl-seconds` | No (default: 3600) | App token lifetime in seconds |
| `app.cors.allowed-origins` | No (default: `http://localhost:4200`) | Comma-separated frontend origin(s) allowed by CORS |
| `PORT` | No (default: 8080) | Server port — Cloud Run sets this automatically |

> **Security note:** Never commit `GOOGLE_CLIENT_ID` or `JWT_SIGNING_KEY` to source control. Use Google Secret Manager and inject them as environment variables at deploy time.

## Design decisions

See [ADR-20260501-2209](../../docs/adr/20260501-2209-backend-token-broker.md) for the full architectural decision record.

