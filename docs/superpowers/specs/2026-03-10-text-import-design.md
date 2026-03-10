# Text Import (Key-Value) — Design Spec

## Overview
Add text-based flashcard import to the flashcard list view (`/sets/:id`). Users paste tab- or comma-separated key-value pairs, preview parsed flashcards with edit/reject, then bulk save.

## User Flow
1. In `/sets/:id` (flashcard-list) — click **"Importuj"** button next to "Dodaj fiszkę"
2. Modal opens with `<textarea>` and format instructions
3. Click "Parsuj" — modal shows list of parsed flashcard proposals
4. User can accept/reject/edit each proposal inline
5. Click "Zapisz" — bulk create via `flashcardApi.createFlashcards()` with `source: 'manual'`
6. Modal closes, flashcard list refreshes

## New Components

### ImportModalComponent
- Standalone, OnPush, Signals-based
- Signals: `rawText`, `proposals`, `parseErrors`, `isSaving`, `isParsed`
- Computed: `acceptedCount`, `canSave`
- Input: `isVisible: InputSignal<boolean>`, `setId: InputSignal<number>`
- Output: `close`, `saved`

## New Services

### TextParserService
- Pure logic, no dependencies
- `parseKeyValue(text: string): ParseResult`
- Split by `\n`, for each line: try TAB split first, then first comma
- `ParseResult = { proposals: FlashcardProposalDTO[], errors: ParseError[] }`
- `ParseError = { line: number, content: string, reason: string }`

## Parsing Logic (separator priority)
1. TAB has priority (unambiguous)
2. If no TAB → split on **first** comma (front = before, back = after)
3. Empty lines → skip
4. Lines without separator → added to `errors` with message

## Changes to Existing Code

### FlashcardListComponent
- Add "Importuj" button in template
- Add `isImportModalVisible` to state signal
- Add `onImportSaved()` handler → reload list

## Out of Scope
- DOCX/PDF import
- Configurable separators (hardcoded TAB + comma)
- New route/page
