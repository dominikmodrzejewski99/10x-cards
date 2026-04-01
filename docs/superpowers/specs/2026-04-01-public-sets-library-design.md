# Public Sets Library — Design Spec

**Date:** 2026-04-01
**Status:** Approved

## Overview

Users can publish their flashcard sets to a public library. Other authenticated users can browse, search, and copy public sets to their own account.

## Scope

- Publish/unpublish own sets (confirmation dialog)
- Browse public sets at `/explore` (search + sort + pagination)
- Copy a public set (duplicates set + flashcards)
- No ratings, comments, tags, or anonymous access

## Database

### Schema changes (flashcard_sets)

Add columns to `flashcard_sets`:

```sql
ALTER TABLE flashcard_sets
  ADD COLUMN is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN copy_count integer NOT NULL DEFAULT 0,
  ADD COLUMN published_at timestamptz;
```

### RLS policies

New SELECT policy for public sets (read-only for authenticated users):

```sql
CREATE POLICY "Authenticated users can view public sets"
  ON flashcard_sets FOR SELECT
  TO authenticated
  USING (is_public = true);
```

Existing owner-only policies remain unchanged for INSERT/UPDATE/DELETE.

Flashcards of public sets need a read policy too:

```sql
CREATE POLICY "Authenticated users can view flashcards of public sets"
  ON flashcards FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM flashcard_sets
      WHERE flashcard_sets.id = flashcards.set_id
      AND flashcard_sets.is_public = true
    )
  );
```

### RPC functions

#### publish_set(p_set_id integer)

- Verifies `auth.uid() = user_id` (ownership)
- Sets `is_public = true, published_at = now()`
- Returns void, raises exception if not owner

#### unpublish_set(p_set_id integer)

- Verifies ownership
- Sets `is_public = false`
- Keeps `published_at` and `copy_count` for history

#### copy_public_set(p_set_id integer)

- Verifies `is_public = true`
- Prevents copying own set
- Duplicates `flashcard_sets` row (new owner = caller, `is_public = false`)
- Duplicates all `flashcards` rows for the set
- Increments `copy_count` on the source set
- Returns the new set ID

#### browse_public_sets(p_search text, p_sort text, p_page integer, p_page_size integer)

- Returns JSONB array of public sets with:
  - `id, name, description, card_count, author_email_masked, copy_count, published_at`
- `card_count` via subquery `COUNT(*)` on flashcards
- `author_email_masked` via existing `mask_email()` function
- Search: `ILIKE '%' || p_search || '%'` on name and description
- Sort options: `popular` (copy_count DESC), `newest` (published_at DESC), `most_cards` (card_count DESC)
- Pagination: `OFFSET (p_page - 1) * p_page_size LIMIT p_page_size`
- Also returns `total_count` for pagination UI
- `SECURITY DEFINER`, `search_path = public, pg_temp`

## Frontend

### New route: /explore

- Path: `/explore`
- Guard: `authGuard`
- Lazy loaded component: `ExploreComponent`

### ExploreComponent (smart)

- Search input with debounce (300ms)
- Sort dropdown: popular (default), newest, most cards
- Responsive grid of set cards (same grid pattern as `/sets`)
- Each card shows: name, description, card count badge, masked author email, copy count, icon-only copy button (primary color)
- Pagination at bottom
- Empty state when no results
- Loading skeleton (same pattern as set-list)
- Success toast after copying

### SetListComponent changes

- New icon-only button in `set-card__actions`: globe icon (`pi pi-globe`) in green for unpublished sets
- Click opens PrimeNG confirmation dialog ("Opublikować ten zestaw?")
- For published sets:
  - Green border on card (`border-color: $color-success`)
  - Badge "PUBLICZNY" next to set name
  - Lock icon (`pi pi-lock`) in red replaces globe icon (click to unpublish, with confirmation)
  - Copy count shown in footer

### Navbar (AuthNavbarComponent)

- New link "Odkrywaj" / "Explore" with `pi pi-search` icon
- Position: after "Generuj", before "Znajomi"
- Added to both desktop links and mobile drawer

### ExploreService

```typescript
@Injectable({ providedIn: 'root' })
export class ExploreService {
  browse(search: string, sort: string, page: number, pageSize: number): Observable<{ sets: PublicSetDTO[], total: number }>
  copySet(setId: number): Observable<number>  // returns new set ID
  publishSet(setId: number): Observable<void>
  unpublishSet(setId: number): Observable<void>
}
```

### Types (src/types.ts)

```typescript
export interface PublicSetDTO {
  id: number;
  name: string;
  description: string | null;
  card_count: number;
  author_email_masked: string;
  copy_count: number;
  published_at: string;
}
```

Extend `FlashcardSetDTO`:

```typescript
export interface FlashcardSetDTO {
  // existing fields...
  is_public: boolean;
  copy_count: number;
  published_at: string | null;
}
```

### i18n

New keys in all 6 languages (en, pl, de, es, fr, uk):

**Section `explore`:**
- title, searchPlaceholder, sortPopular, sortNewest, sortMostCards
- copyButton, copySuccess, emptyTitle, emptyDesc, pagination

**Section `sets` (additions):**
- publishAction, unpublishAction, publishConfirm, publishConfirmMessage
- unpublishConfirm, unpublishConfirmMessage, publicBadge, copyCount

## UI Design

### /explore page
- Search bar + sort dropdown at top
- Responsive card grid (auto-fill, min 280px)
- Cards: white background, rounded corners, name + description + footer with author/copies + copy button

### /sets publish button
- Icon-only `set-card__action` button with `pi pi-globe` (green) or `pi pi-lock` (red for unpublish)
- Published card: green border, "PUBLICZNY" badge, copy count in footer
- Confirmation dialog before publish/unpublish

## Edge Cases

- Copying own set: blocked by RPC (raises exception)
- Empty description: card shows name only
- Publishing set with 0 flashcards: allowed (user's choice)
- Unpublishing: existing copies are unaffected (they're independent)
- Deleting a published set: CASCADE deletes flashcards, set disappears from /explore
- Search injection: `p_search` is used with parameterized ILIKE, safe from SQL injection
