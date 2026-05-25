# GCP Onboarding Guide

Use this checklist when setting up the app in a new Google Cloud project or environment.

## 1. Create the Google Cloud project

1. Create or select a project in Google Cloud Console.
2. Confirm billing is enabled if you plan to deploy the backend to Cloud Run.
3. Enable these APIs:
   - Google Sheets API
   - Google Drive API
   - Cloud Build API
   - Cloud Run Admin API
   - Artifact Registry API
   - Secret Manager API

## 2. Configure OAuth consent

1. Open APIs and Services -> OAuth consent screen.
2. Use one consent screen per app identity. It is fine to use the same consent screen for local and production.
3. Add the app name, support email, developer contact email, and production domain details when available.
4. Add test users while the app is in Testing mode.
5. Add the scopes used by the frontend:
   - `openid`
   - `email`
   - `profile`
   - `https://www.googleapis.com/auth/drive.file`
   - Google Sheets access used by the app

If Google marks a scope as sensitive, production use may require app verification.

## 3. Create OAuth clients

Create separate OAuth 2.0 Web application clients for local and production. They can share the same consent screen.

Recommended clients:

| Environment | Authorized JavaScript origins |
|---|---|
| Local dev | `http://localhost:4200` |
| Production | `https://melangoth.github.io` |

The backend URL, such as `http://localhost:8080` or a Cloud Run URL, normally does not need to be added as an OAuth origin because the backend verifies Google ID tokens but does not host the Google sign-in page.

## 4. Configure the frontend

Set the matching OAuth client ID in:

- `projects/frontend/src/environments/environment.ts`
- `projects/frontend/src/environments/environment.prod.ts`

For local backend testing:

```typescript
backendUrl: 'http://localhost:8080',
useBackendSession: true,
```

For production backend use:

```typescript
backendUrl: 'https://<cloud-run-service-url>',
useBackendSession: true,
```

Leave `useBackendSession: false` until the token broker backend is reachable.

## 5. Configure backend secrets

The backend requires:

| Secret | Purpose |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth Web client ID used to verify Google ID tokens |
| `JWT_SIGNING_KEY` | Random HMAC signing key, at least 32 bytes |

For local Windows testing:

```powershell
cd projects\backend
$env:GOOGLE_CLIENT_ID="<oauth-client-id>"
$env:JWT_SIGNING_KEY="<random-32-plus-byte-secret>"
.\gradlew.bat bootRun
```

For Cloud Run, store both values in Secret Manager:

```bash
printf '%s' '<oauth-client-id>' | gcloud secrets create google-client-id --data-file=-
printf '%s' '<random-32-plus-byte-secret>' | gcloud secrets create jwt-signing-key --data-file=-
```

If the secrets already exist, add new versions instead of recreating them:

```bash
printf '%s' '<new-value>' | gcloud secrets versions add google-client-id --data-file=-
printf '%s' '<new-value>' | gcloud secrets versions add jwt-signing-key --data-file=-
```

## 6. Configure branch-triggered backend deployment

Create an Artifact Registry Docker repository once per project/region:

```bash
gcloud artifacts repositories create token-broker \
  --repository-format=docker \
  --location=europe-west1
```

Create a Cloud Build trigger:

1. Connect the GitHub repository to Cloud Build.
2. Select repository `melangoth/ui-only-sheets-state-app`.
3. Select branch `sheets-api-backend` for the initial backend deployment trigger.
4. Use `cloudbuild.backend.yaml` as the build configuration file.
5. Confirm substitution `_FRONTEND_ORIGIN` is `https://melangoth.github.io`, or override it if deploying a different frontend origin.

The prepared trigger settings are:

| Setting | Value |
|---|---|
| Project | `ui-only-sheets-app` |
| Region | `global` |
| Trigger name | `token-broker-sheets-api-backend` |
| Repository | `melangoth/ui-only-sheets-state-app` |
| Branch pattern | `^sheets-api-backend$` |
| Build config | `cloudbuild.backend.yaml` |
| Service account | `615154138259-compute@developer.gserviceaccount.com` |
| `_FRONTEND_ORIGIN` | `https://melangoth.github.io` |

The trigger builds `projects/backend/Dockerfile`, pushes the image to Artifact Registry, and deploys Cloud Run service `token-broker`.

The deployment config defaults to a billing-aware Cloud Run profile:

| Setting | Value |
|---|---|
| CPU | `0.25` |
| Memory | `512Mi` |
| Concurrency | `1` |
| Maximum instances | `2` |
| Minimum instances | unset, so the service can scale to zero |
| Timeout | `300s` |

The Cloud Build service account used by the trigger needs permissions to build, push, and deploy. Grant the narrowest roles that work for the project setup, typically:

- Artifact Registry Writer
- Cloud Run Admin
- Service Account User for the Cloud Run runtime service account

The Cloud Run runtime service account needs Secret Manager Secret Accessor for:

- `google-client-id`
- `jwt-signing-key`

To run the same config manually from an already authenticated machine:

```bash
gcloud builds submit \
  --config=cloudbuild.backend.yaml \
  --substitutions=_FRONTEND_ORIGIN=https://<frontend-origin>
```

After deployment, update the production `backendUrl` with the Cloud Run service URL.

## 7. Smoke test

1. Start the frontend with `npm start` from `projects/frontend`.
2. Start the backend locally or deploy it to Cloud Run.
3. Sign in with a test user.
4. Confirm the app can read/write the user's sheet.
5. If `useBackendSession` is enabled, confirm `POST /api/auth/exchange` returns 200.

Common failures:

| Symptom | Check |
|---|---|
| Google sign-in origin error | Add the exact frontend origin to the OAuth Web client |
| Backend returns 401 | Confirm backend `GOOGLE_CLIENT_ID` matches the frontend OAuth client |
| CORS error on token exchange | Confirm `app.cors.allowed-origins` includes the frontend origin |
| Cloud Run startup failure | Confirm both secrets exist and `JWT_SIGNING_KEY` is at least 32 bytes |
