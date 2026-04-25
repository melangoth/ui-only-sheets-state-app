# backend — Spring Boot Placeholder

> **Status: Not yet implemented.**

This directory is reserved for the Spring Boot REST backend that will serve the `projects/frontend` Angular SPA.

## Planned scope

- REST API consumed by the Angular frontend
- Google Sheets / Google Drive integration logic (server-side)
- Authentication via Google Identity Services (token verification)
- Persistence layer (TBD — likely PostgreSQL or Google Sheets as a data store)

## Intended tech stack

| Layer | Technology |
|-------|-----------|
| Language | Java 21+ |
| Framework | Spring Boot 3.x |
| Build tool | Maven (or Gradle) |
| Containerisation | Docker (planned) |

## Getting started (once implemented)

```bash
# Maven
./mvnw spring-boot:run

# Gradle
./gradlew bootRun
```

The server will start on `http://localhost:8080` by default.

## Development notes

- Place source code under `src/main/java/` and `src/main/resources/`.
- Place tests under `src/test/java/`.
- Add `pom.xml` (Maven) or `build.gradle` / `settings.gradle` (Gradle) at this directory root when scaffolding the project.
- Document significant design decisions in `../../docs/adr/` following the repo ADR conventions.
