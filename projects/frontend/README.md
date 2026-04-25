# Color Toggle App — Google Sheets State

An Angular SPA that saves 6 colored button toggle states (Passive/Active) to a Google Sheet in the user's own Google Drive, using Google Identity Services for authentication.

## Setup

### Google Cloud credentials

1. Create a project in [Google Cloud Console](https://console.cloud.google.com/)
2. Enable **Google Sheets API** and **Google Drive API**
3. Create an OAuth 2.0 Client ID (Web application)
4. Add your domain (e.g. `https://<your-username>.github.io`) as an authorized JavaScript origin
5. Replace `YOUR_GOOGLE_CLIENT_ID` in `src/environments/environment.ts` (and `environment.prod.ts`) with your Client ID

> **For GitHub Pages deployment**: set the client ID via a repository secret `GOOGLE_CLIENT_ID` — the CI workflow can inject it at build time, or you can commit it directly for public deployments.

## Development server

To start a local development server, run from this directory:

```bash
npm install
npm start
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
npm run build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
npm test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
