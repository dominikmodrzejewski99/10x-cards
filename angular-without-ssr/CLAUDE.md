# CLAUDE.md

Guidance for Claude Code when working in this repo.

## Project

Memlo — AI-assisted flashcard app. Angular 21 SPA (no SSR), Supabase backend, NgRx Signals for state, Transloco for i18n (6 locales: pl, en, de, es, fr, uk).

## Commands

- `npm start` — dev server with Supabase proxy (`proxy.conf.json`)
- `npm run build` — production build
- `npm test` — Karma/Jasmine unit tests
- `npm run lint` — ESLint on `.ts` and `.html`

## Architecture

```
src/app/
├── auth/           Auth feature (service, store, guards, components)
├── components/     Feature components grouped by domain
├── services/
│   ├── api/        HTTP / Supabase calls — throw AppError(status, msg)
│   ├── domain/     Business logic
│   ├── facades/    UI-facing orchestrators, branch on AppError.status
│   └── infrastructure/  Global error handler, update service, etc.
├── shared/         Reusable UI + utils (AppError, error-classifier)
└── interfaces/     Cross-cutting TS types (most domain DTOs live in src/types.ts)
```

### Error handling contract

- API services throw `AppError(httpStatus, translatedMessage)` — never raw `Error` with English text.
- Facades and `error-classifier.ts` branch on `err.status` (HTTP code), not on message strings.
- `auth.service.handleAuthError` maps Supabase error messages to translated keys, wraps in `Error(translatedMsg)`.
- `auth.store.handleError` trusts only `Error.message` — any deeper traversal was removed to prevent raw Supabase leaks.
- Fire-and-forget `.subscribe()` calls must include an `error` handler.

### i18n contract

- Synchronous Transloco pattern throughout. Never use async translation pipes in logic.
- All 6 locale files must stay in sync (same key count). Keep nested structure; do not flatten.
- HTML templates use `transloco` pipe/directive; error messages are translated before being thrown.

## Angular conventions (from user preferences)

- **No `standalone: true`** — components are declared in modules.
- Separate `.html` and `.scss` files per component (no inline templates/styles).
- **No Angular lifecycle hooks** (`ngOnInit`, etc.) — prefer signals + effects.
- `git add` newly created files explicitly.

## Commit conventions

Conventional commits: `type(scope): description`. Split large changes into logical commits (e.g. one per feature/fix/refactor).
