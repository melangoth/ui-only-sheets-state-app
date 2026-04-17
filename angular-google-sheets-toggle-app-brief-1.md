# Angular + Google Login + Google Sheets State App

## Project goal

Build a small frontend-only Angular application with no custom backend where:

- Users must sign in with their Google account before they can use the app.
- After sign-in, the UI shows 6 buttons, each with a different color.
- Each button has only 2 states:
  - `Passive`
  - `Active`
- Clicking a button toggles its label between those two values.
- The latest state of each button is persisted in a Google Sheets file owned by the signed-in user.
- On app load, previously stored values are read from the sheet and rendered back into the UI.
- If the storage file does not exist yet, the app creates it automatically after the user grants the required permissions.

The implementation should be suitable for agentic development with GitHub Copilot, with a strong emphasis on minimal scopes, safe browser-side auth handling, and clear separation of concerns.

---

## Confirmed implementation preferences

The implementation should follow these explicit project choices:

- Use **Angular Signals** rather than RxJS for UI-facing state management
- Use **Bootstrap** rather than Angular Material
- Host the app on **GitHub Pages**
- Define button colors explicitly in the application code
- Keep the color definitions easy to change in one place
- Use **pessimistic UI updates** so the UI only reflects the persisted truth from Google Sheets

---

## Recommended product decisions

### 1. Use a normal visible Drive file per user

For now, the app should:

- create a Google Sheets spreadsheet
- store it in the user's normal visible Google Drive
- reuse that same file for all future reads and writes
- treat it as a private per-user file, not a shared multi-user database

Why:

- it is easier to inspect manually during development and production support
- the user can open the sheet directly in Google Drive for debugging
- it keeps the design simple for a browser-only project

Recommended file naming:

- `Color Toggle App State`

### 2. Separate authentication from Google API authorization

Use Google Identity Services in two distinct moments:

- Authentication moment: sign the user into the app with Google
- Authorization moment: request API access only when Drive and Sheets access is actually needed

### 3. Prefer minimal scopes over broad Drive access

Target these scopes:

- `openid`
- `email`
- `profile`
- `https://www.googleapis.com/auth/drive.file`

Reasoning:

- `drive.file` is the best fit for a browser-only app that creates and manages its own files
- it gives access to files the app creates or that the user explicitly opens with the app
- Sheets create and update flows can work with `drive.file`

Do not start with full-drive scopes unless a real limitation appears during implementation.

### 4. Do not treat the browser as a secret store

Since there is no backend:

- no client secret
- no long-lived refresh token storage
- no privileged server-side token exchange
- no hidden trusted environment

This means the app must rely on short-lived access tokens obtained in the browser and re-request authorization when needed.

---

## Tech stack

### Core app
- Angular
- TypeScript
- Angular Signals for UI state management

### Auth and Google APIs
- Google Identity Services for sign-in and authorization
- Direct REST calls via:
  - Google Drive API v3
  - Google Sheets API v4

### UI
- Bootstrap
- Minimal custom CSS for app-specific styles
- No Angular Material
- No backend, no database server

### Hosting
- GitHub Pages

Important deployment notes for hosting:
- the deployed GitHub Pages origin must be registered in the Google Cloud OAuth client configuration
- Angular routing should be kept GitHub-Pages-friendly unless extra SPA fallback handling is added
- using a simple route structure or hash routing may reduce deployment friction

---

## High-level architecture

### App modules / responsibilities

#### 1. `AuthService`
Responsible for:
- GIS script bootstrap
- Google sign-in state
- ID token or profile extraction
- access token requests for Google APIs
- logout and local session reset
- exposing current auth state to the UI

#### 2. `GoogleApiService`
Responsible for:
- authorized HTTP calls
- attaching bearer tokens
- token refresh or re-consent flow trigger when needed
- retry rules for transient failures

#### 3. `StorageFileService`
Responsible for:
- locating the app spreadsheet in visible Google Drive
- creating the spreadsheet if missing
- persisting the spreadsheet ID locally for convenience
- validating that the stored ID still exists and remains accessible

#### 4. `ButtonStateRepository`
Responsible for:
- reading the 6 button states from the sheet
- writing changed state back to the sheet
- mapping between sheet rows or cells and app model

#### 5. `ButtonBoardComponent`
Responsible for:
- rendering 6 distinct colored buttons
- showing loading and disabled states
- toggling labels
- using pessimistic update behavior so the UI reflects persisted state

#### 6. `ButtonConfig`
Responsible for:
- defining the 6 button colors in one centralized place
- keeping labels, keys, and color styles easy to edit later
- preventing random or scattered hardcoded styling across components

---

## Suggested data model

Use a very simple sheet layout.

### Spreadsheet
- Title: `Color Toggle App State`

### Tab
- Sheet name: `states`

### Rows
| colorKey | labelState |
|---|---|
| red | Passive |
| blue | Passive |
| green | Passive |
| yellow | Passive |
| purple | Passive |
| orange | Passive |

### App model
```ts
type ButtonStateLabel = 'Passive' | 'Active';

type ColorKey = 'red' | 'blue' | 'green' | 'yellow' | 'purple' | 'orange';

interface ColorButtonState {
  colorKey: ColorKey;
  labelState: ButtonStateLabel;
}
```

### Suggested UI config model
```ts
interface ButtonDefinition {
  colorKey: ColorKey;
  displayName: string;
  backgroundColor: string;
  textColor: string;
}
```

### Recommended fixed button configuration
The six buttons should use application-defined colors, not random values. The first version can hardcode them in one config file.

Suggested defaults:
- red: `#dc3545`
- blue: `#0d6efd`
- green: `#198754`
- yellow: `#ffc107`
- purple: `#6f42c1`
- orange: `#fd7e14`

These are distinct, readable, and easy to replace later.

---

## Recommended login and authorization flow

### Phase 1: sign in to the app
1. Load the GIS script.
2. Render “Sign in with Google”.
3. User signs in.
4. Store only minimal user session details in memory or session storage.
5. Unlock the app shell after successful sign-in.

### Phase 2: request Google API access
After sign-in, when the app needs Drive and Sheets access:
1. Request authorization scopes needed for storage access.
2. Receive a short-lived access token.
3. Call Drive API to find the existing app sheet in visible Google Drive.
4. If not found:
   - create the spreadsheet
   - initialize the `states` sheet with 6 default rows
5. Read values and hydrate button state.

---

## File discovery and creation strategy

### Preferred strategy
On startup after authorization:

1. Search the user's visible Drive for a spreadsheet with:
   - mime type `application/vnd.google-apps.spreadsheet`
   - a known app-specific name, for example `Color Toggle App State`
2. If exactly one file exists, use it.
3. If none exists, create one.
4. If multiple exist, choose the newest valid one and optionally show a repair or debug warning.

### Notes
- This project assumes the sheet is intentionally visible in normal Drive.
- The file is private per user unless the user manually shares it.
- The app should keep the spreadsheet ID locally for convenience, but still revalidate it on startup.

### Important implementation note
If search by file name alone feels too fragile, the implementation should also require a recognizable internal schema.

Recommended first-version rediscovery rules:

- use a very specific file name such as `Color Toggle App State`
- require a worksheet named `states`
- require header row `colorKey,labelState`
- if multiple matching files exist, choose the newest valid one and surface a debug warning

Optional later improvements:

- add a small metadata tab
- use Drive app properties if the chosen API flow supports them cleanly in the frontend implementation

Keep this logic isolated behind `StorageFileService`.

---

## State loading behavior

On successful authorization:

1. Resolve the storage file.
2. Read the `states!A2:B7` range.
3. Validate the rows.
4. Fill in missing rows with defaults.
5. Render buttons from the resolved state.

Validation rules:

- unknown `colorKey` values are ignored
- unknown label values fall back to `Passive`
- missing rows are recreated
- duplicate rows use the last valid occurrence or trigger a repair write

---

## State update behavior

When a user clicks a button:

1. Determine next label:
   - `Passive -> Active`
   - `Active -> Passive`
2. Disable the clicked button or entire button board while save is in progress.
3. Write the new value to Google Sheets.
4. Re-read the authoritative state if needed, or apply the saved state only after the write succeeds.
5. Update the UI only after persistence succeeds.
6. If persistence fails:
   - keep the old UI state
   - show a clear save error
   - allow retry

### Required behavior
Use **pessimistic save**.

The application should prioritize truth over responsiveness:
- do not show a toggled state until the write succeeds
- always prefer the persisted value as the source of truth
- avoid optimistic toggles that might briefly show the wrong state

This matches the project preference that the UI should always show the truth as stored in Google Sheets.

---

## Error-handling guidelines

Handle these cases explicitly.

### Auth or consent issues
- user closes consent popup
- user denies Drive or Sheets permissions
- access token expires
- account changes during session

### Storage issues
- file not found
- sheet tab missing
- malformed sheet contents
- insufficient permissions
- quota or rate limit responses

### UI behavior
- show clear status:
  - `Signing in...`
  - `Requesting Google access...`
  - `Loading saved states...`
  - `Saving...`
- disable interactions while critical operations are in progress
- provide a `Retry access` or `Reconnect Google access` action

---

## Security and privacy guidelines

### Do
- use GIS-supported browser flows
- request scopes only when needed
- prefer `drive.file` over broader Drive scopes where possible
- keep tokens in memory whenever possible
- if temporary persistence is needed, prefer session storage over long-lived local storage
- clearly explain why Drive and Sheets access is needed

### Do not
- embed a client secret
- use broad full-drive scope unless truly required
- store sensitive tokens long-term in local storage
- assume browser-only auth is equivalent to backend security
- trust cached spreadsheet IDs without re-validation

### Practical limitation
A frontend-only app can be safe enough for this small project, but it is not suitable for high-trust or highly sensitive workflows because token handling happens in the browser.

---

## Recommended implementation order for Copilot or agentic execution

### Milestone 1: base Angular app
- scaffold Angular app
- configure deployment target for GitHub Pages
- add Bootstrap
- create shell layout
- render 6 distinct colored buttons using centralized hardcoded button config and mock local state only

### Milestone 2: state model and UI behavior
- implement toggle behavior
- centralize button state with Angular Signals
- add loading and error states
- enforce pessimistic save behavior in the UI flow

### Milestone 3: Google sign-in
- integrate GIS sign-in button
- show signed-in user summary
- add sign-out flow

### Milestone 4: Google API authorization
- request Drive and Sheets related access token after sign-in
- centralize token acquisition and refresh handling

### Milestone 5: Drive file resolution
- search for the app spreadsheet in visible Google Drive
- create it if missing
- persist spreadsheet ID in app state

### Milestone 6: Sheets read and write
- initialize `states` tab and seed data
- load saved states on app startup
- update one row on button toggle
- refresh UI only after successful persistence

### Milestone 7: hardening
- denied consent handling
- expired token handling
- duplicate or malformed sheet repair
- GitHub Pages production OAuth origin configuration

---

## Suggested folder structure

```text
src/
  app/
    core/
      auth/
        auth.service.ts
        google-identity-loader.service.ts
      google-api/
        google-api.service.ts
      storage/
        storage-file.service.ts
        button-state.repository.ts
    features/
      button-board/
        button-board.component.ts
        button-board.component.html
        button-board.component.css
    shared/
      models/
        button-state.model.ts
      config/
        app-config.ts
        button-config.ts
```

---

## Suggested implementation constraints for Copilot

Use these as guardrails for agentic coding:

- No backend code
- No Firebase Auth unless explicitly chosen as a replacement
- No server-side token exchange
- Use direct REST calls, not outdated Google Sign-In libraries
- Keep auth, Drive access, and Sheets access in separate services
- Prefer Angular Signals for UI state
- Use Bootstrap rather than Angular Material
- Keep button color definitions centralized and easy to edit
- Prefer small, testable methods
- Keep spreadsheet schema fixed and explicit
- Do not introduce unnecessary state libraries unless Angular built-ins are insufficient
- Fail safely when Google consent is missing
- Use pessimistic persistence flow so UI state always reflects saved state

---

## Definition of done

The project is complete when all of the following are true:

- user can sign in with Google
- unsigned users cannot use the app functionality
- signed-in users see 6 differently colored buttons
- button colors come from centralized app configuration
- each button toggles between `Passive` and `Active`
- app creates storage automatically if missing
- app reload restores state from Google Sheets
- each toggle persists to the user’s Google-backed storage
- the UI only shows updated state after persistence succeeds
- app handles refresh or revisit without losing persisted state
- consent and token failures show understandable user-facing errors
- app is deployable to GitHub Pages

---

## Testing guidelines

### Manual test cases
1. First login with no prior storage
2. Storage file auto-created
3. Default values appear as all `Passive`
4. Toggle one button and confirm the label changes only after successful save
5. Refresh page and confirm the toggled value persists
6. Toggle multiple buttons and refresh page
7. Sign out and verify app locks
8. Deny Drive access and verify graceful handling
9. Remove or corrupt rows in the sheet and verify repair or fallback
10. Deploy to GitHub Pages and verify sign-in and persistence on the production URL

### Useful automated tests
- signal-based state transition tests
- sheet row mapping tests
- validation and fallback tests
- repository tests with mocked HTTP responses
- auth state guard tests
- pessimistic save flow tests

---

## Key design decisions

### 1. Shared vs per-user data model
Resolved decision:
- each signed-in user has their own private sheet in their own Google Drive

This app does not use a shared cross-user state model.

### 2. Hidden vs visible storage
Resolved decision:
- the sheet should live in the user's normal visible Drive for both development and production

This makes manual inspection and support easier, at the cost of a slightly less isolated storage model.

### 3. When to request Google API access
Recommended:
- request Google API access immediately after sign-in because the board cannot function without Drive and Sheets access

### 4. Cross-device behavior
This design supports multiple browsers and devices for the same user because Google Sheets is the persistence layer.

### 5. UI and state management
Resolved decision:
- use Angular Signals for UI state
- use Bootstrap for UI styling
- define button colors centrally in application code
- use pessimistic persistence so the UI reflects saved truth only

---

## Implementation notes for deployment

- Create a Google Cloud project
- Enable:
  - Google Drive API
  - Google Sheets API
- Configure OAuth consent screen
- Create a Web application OAuth client
- Register:
  - local dev origin
  - GitHub Pages production origin
- Test with allowed test users until verification or publishing is complete
- Keep the deployed base href aligned with the GitHub Pages repository path

---

## Final recommendation

For this project, the best current browser-only design is:

- Angular SPA
- Angular Signals for state handling
- Bootstrap for styling
- GitHub Pages for hosting
- Google Identity Services for sign-in
- separate GIS authorization step for API access
- one visible Google Sheet per user in normal Google Drive
- `drive.file` as the primary Google API scope
- a simple 2-column sheet schema for the 6 button states
- centralized hardcoded button colors
- pessimistic persistence so the UI always reflects stored truth

This keeps the implementation small, understandable, easy to debug manually, and realistic for GitHub Copilot to build incrementally.
