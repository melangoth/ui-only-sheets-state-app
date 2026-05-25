# ADR-20260525-0923: Backend-Owned Google Authorization

**Status:** Accepted
**Date:** 2026-05-25

---

## Context

ADR-20260501-2209 delivered Plan A: the Angular frontend exchanges a Google ID token with the Cloud Run backend for a short-lived app JWT. That proves backend-trusted app sessions, but it does not reduce the repeated Google Drive / Sheets authorization prompt because the browser still acquires short-lived Google API access tokens directly. The next step should reduce user interruption without immediately rewriting every Sheets operation behind the backend.

---

## Decision

Adopt **Plan B2a: backend-owned Google authorization with frontend-used short-lived access tokens**.

The backend will own the Google OAuth authorization-code flow, request offline access, store each user's Google refresh token server-side, and mint short-lived Google Drive / Sheets access tokens for the frontend when needed. The frontend will continue calling Google Drive / Sheets APIs directly for now, using only short-lived access tokens returned by the backend.

Rollout must be fully feature-flag driven. The UI must be able to keep operating exactly as it does today with browser-owned GIS Drive / Sheets authorization, and the new backend-owned authorization path must be switchable by configuration and redeploy only.

This is deliberately not the final security posture. The recommended long-term follow-up is **Plan B2b: move Drive / Sheets operations to backend endpoints** so Google API access tokens never reach the browser.

| Item | Decision |
|---|---|
| OAuth owner | Backend |
| Google OAuth flow | Authorization code flow with offline access |
| Token store | Firebase / Firestore |
| Long-lived token location | Backend only |
| Browser token exposure | Short-lived Google access token only, memory-only |
| Sheets / Drive operations | Remain in frontend for this phase |
| Rollout model | Feature flag with direct-browser fallback |
| Long-term recommendation | Move Sheets / Drive operations to backend proxy endpoints |

Key design choices:

- Store Google refresh tokens in Firebase / Firestore because it is serverless, low-operations, GCP-native, and suitable for low-volume per-user token records.
- Encrypt refresh tokens before writing them to Firestore. Encryption keys must come from Secret Manager or a GCP-managed key service, never from source code.
- Keep access tokens short-lived and memory-only in the frontend.
- Require the app JWT from Plan A on every backend authorization/token endpoint.
- Provide a disconnect/revoke flow so users can remove stored Google authorization.
- Keep the existing direct browser Google API implementation as the migration baseline until backend proxy endpoints are designed.
- Do not remove or break the current browser-owned GIS token path while introducing this feature.
- Default new production behavior to the current direct-browser mode until `useBackendGoogleAuthorization` is explicitly enabled.

Alternatives considered:

| Alternative | Reason rejected for this phase |
|---|---|
| Keep browser-only Google OAuth | Does not reduce repeated Drive / Sheets authorization prompts enough. |
| Store Google tokens in browser storage | Violates the existing token storage policy and increases exposure to XSS/session persistence risk. |
| Move all Sheets operations to backend immediately | Best long-term security, but larger implementation scope and more backend request volume. |
| Cloud Storage bucket token store | Cheap but awkward for per-user records, updates, revocation, and future querying. |
| MongoDB / Cloud SQL | More operational or cost surface than needed for small per-user token state. |

---

## Implementation

This ADR is design-only. Expected future implementation changes:

Implementation agents should focus on application code and documentation updates. They must not execute GCP or Firebase setup/provisioning commands from this ADR unless the user explicitly asks for environment setup in that session.

| Area | Expected change |
|---|---|
| Backend auth | Add endpoints to start Google authorization, handle OAuth callback, check authorization status, mint short-lived Google access tokens, and disconnect/revoke authorization. |
| Backend storage | Add a Firestore-backed token repository for encrypted refresh tokens and non-sensitive metadata. |
| Backend config | Add Google OAuth client secret, redirect URI, Firestore project/config, and token-encryption configuration. |
| Frontend auth | Replace direct GIS Drive / Sheets access-token request with backend-issued Google access-token retrieval when the new feature flag is enabled. |
| Frontend storage services | Keep existing direct Google API calls for this phase, but source access tokens from the backend instead of GIS token client. |
| Docs/onboarding | Update GCP onboarding for Firebase / Firestore, OAuth redirect URI, client secret, and required IAM. |

The implementation must preserve both authorization providers behind a common access-token boundary:

| Mode | Flag state | Behavior |
|---|---|---|
| Current direct-browser mode | `useBackendGoogleAuthorization: false` | Frontend uses the existing GIS token client and calls Drive / Sheets directly. |
| Backend-owned authorization mode | `useBackendGoogleAuthorization: true` | Frontend asks the backend for short-lived Google access tokens, then calls Drive / Sheets directly. |

Suggested backend endpoints:

| Endpoint | Purpose |
|---|---|
| `GET /api/google/authorization/status` | Report whether the signed-in user has stored Google Drive / Sheets authorization. |
| `GET /api/google/authorization/start` | Generate an authorization URL for Google OAuth consent. |
| `GET /api/google/authorization/callback` | Handle Google authorization code callback and store encrypted refresh token. |
| `POST /api/google/access-token` | Mint a short-lived Google access token for frontend Drive / Sheets calls. |
| `DELETE /api/google/authorization` | Revoke Google authorization and delete stored token state. |

Suggested feature flags:

| Flag | Type | Purpose |
|---|---|---|
| `useBackendGoogleAuthorization` | `boolean` | Use backend-owned Google OAuth and token minting instead of browser GIS token client for Drive / Sheets access. |
| `backendGoogleAuthorizationUrl` | `string` | Optional explicit backend OAuth start URL if it differs from `backendUrl`. |

Existing flags remain in force:

| Flag | Requirement |
|---|---|
| `useBackendSession` | Must remain enabled before `useBackendGoogleAuthorization` can be enabled, because backend Google authorization endpoints require the app JWT from Plan A. |

Simplified Firestore setup checklist:

This checklist documents environment prerequisites for onboarding and deployment. It is not an instruction for a coding agent to provision cloud resources while implementing the application changes.

| Step | How | Notes |
|---|---|---|
| Enable Firestore / Datastore APIs | Programmatic | Use `gcloud services enable firestore.googleapis.com datastore.googleapis.com` for the target project. |
| Create the Firestore database | Manual or programmatic | Can be created from Firebase / Firestore console, or by CLI/IaC when the project policy allows it. Choose Native mode and the intended region once; this is a durable project-level choice. |
| Confirm billing and budget alerts | Manual | Must be checked in the GCP console for the target project. Firestore can stay low-cost at small volume, but it is still a billable dependency. |
| Grant backend IAM access | Programmatic | Grant the Cloud Run runtime service account the least privilege role needed to read/write token documents, such as `roles/datastore.user`. |
| Create token encryption secret or key | Programmatic | Store encryption material in Secret Manager or configure a GCP-managed key service. Do not commit keys or generated secret values. |
| Grant encryption secret/key access | Programmatic | Grant only the backend runtime service account access to the encryption secret/key. |
| Add backend environment config | Programmatic | Configure Firestore project/database settings, collection names, redirect URI, and secret names through Cloud Run environment variables or deployment config. |
| Add OAuth redirect URI | Manual | Must be added in Google Cloud OAuth client configuration. Expected callback: `<backend-url>/api/google/authorization/callback`. |
| Update onboarding docs | Programmatic | Add the new Firestore, IAM, Secret Manager, OAuth redirect, and feature-flag requirements to `docs/guidelines/gcp-onboarding.md` as part of implementation. |
| Verify with a disposable user | Manual | Complete one auth flow, confirm a token metadata document exists, confirm no plaintext refresh token is visible, then test disconnect/revoke. |

---

## Usage

Target user flow:

```text
1. User opens the app.
2. User completes Google sign-in.
3. Frontend exchanges the Google ID token for an app JWT.
4. Frontend asks backend whether Drive / Sheets authorization exists.
5. If missing, frontend sends user through backend-owned Google OAuth consent once.
6. Backend stores encrypted refresh token in Firestore.
7. On later app loads, frontend asks backend for a short-lived Google access token.
8. Frontend continues existing Drive / Sheets API calls with that short-lived access token.
```

The expected user-facing benefit is that Drive / Sheets authorization should not be requested on every app open. Re-consent should only be needed when authorization is missing, revoked, expired, invalidated by Google, or scopes change.

Fallback behavior:

```text
useBackendGoogleAuthorization = false
-> Existing GIS token-client flow remains active.
-> Existing Drive / Sheets behavior remains unchanged.
-> The app can be rolled back by flag/config change and redeploy.
```

---

## Trade-offs

- This phase improves UX by reducing repeated Google Drive / Sheets consent prompts, but it does not fully remove Google access tokens from the browser.
- The backend takes on responsibility for storing and protecting long-lived Google refresh tokens. This requires careful encryption, IAM, logging, and revocation handling.
- Backend request volume remains low: app session exchange, authorization status checks, occasional access-token minting, and disconnect/revoke operations.
- Firestore introduces a new GCP dependency and onboarding requirement, but avoids always-on database infrastructure.
- Maintaining two authorization paths during migration adds some frontend complexity, but it protects production behavior and allows fast rollback by flag.
- Full security improvement requires the later Plan B2b migration: move Drive / Sheets operations to backend endpoints so the frontend only uses the app JWT and never receives Google API access tokens.
