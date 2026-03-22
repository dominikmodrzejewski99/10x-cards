# Flashcard Language Features Design

**Date:** 2026-03-22

## Overview

Enhance manual flashcard creation with language support: per-card language tagging, automatic translation suggestions via OpenRouter, multiple meanings convention, and reversible study direction.

## Features

### 1. Per-flashcard language fields

- Two new **optional** columns on `flashcards` table: `front_language` and `back_language`
- Supported languages (hardcoded in frontend): EN, PL, DE, ES, FR
- Nullable — flashcards without language work as before (e.g. concepts, definitions)
- New Supabase migration adds columns

### 2. Flashcard form updates

- Two optional dropdowns above front/back fields: "Język frontu" / "Język backu"
- Options: `—` (none), EN, PL, DE, ES, FR
- Default: `—` (no language)
- When **both** languages selected and user leaves the front field → auto-suggestion appears below back field
- Placeholder hint for back field changes when languages set: e.g. `"dom; budynek; rodzina"`

### 3. Auto-translation via OpenRouter

- New method in `OpenRouterService`: `translateWord(text, fromLang, toLang)`
- Prompt: `"Translate '{text}' from {fromLang} to {toLang}. Return only the translation, multiple meanings separated by semicolons."`
- Uses existing model `stepfun/step-3.5-flash:free`
- Triggered on front field blur with ~500ms debounce, only when both languages set and front non-empty
- Suggestion shown as grey text below back field — click accepts
- If user already typed in back — suggestion appears alongside, does not overwrite
- Silent failure — no suggestion if API errors

### 4. Multiple meanings convention

- No schema change — user enters multiple meanings in `back` separated by semicolons
- Placeholder/hint guides the format
- In study mode, semicolon-separated meanings displayed as list

### 5. Study mode direction toggle

- Global toggle button at top of study session: "Odwróć kierunek"
- Default: front = question, back = answer
- Reversed: back = question, front = answer (all cards in session)
- When reversed and back has multiple meanings (semicolons): first meaning shown as question, full front shown after reveal
- Toggle state not persisted — resets after session ends
- SM-2 scoring works normally regardless of direction

## Data Model Changes

```sql
ALTER TABLE public.flashcards
  ADD COLUMN front_language varchar(5) DEFAULT NULL,
  ADD COLUMN back_language varchar(5) DEFAULT NULL;
```

No check constraint — validation handled in frontend. Supported values: `en`, `pl`, `de`, `es`, `fr`, `null`.

## Technical Decisions

- **OpenRouter reuse**: No new API keys or services, leverages existing infrastructure
- **No schema change for meanings**: Semicolon convention keeps it simple
- **Nullable languages**: Backwards compatible, non-language flashcards unaffected
- **Frontend-only toggle**: No DB changes for study direction, purely presentation logic
