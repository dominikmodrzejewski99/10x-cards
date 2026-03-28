# Flashcard Set Sharing — Design Spec

## Overview

Allow users to share flashcard sets via time-limited links. The recipient gets a full, independent copy of the set and its flashcards.

## Requirements

- **Share model:** Full copy (no reference/sync to original)
- **Link type:** Multi-use, expires after 7 days
- **Auth required:** Recipient must be logged in to accept
- **No history:** Owner generates link, shares it, done. No tracking of who accepted.

## Database Schema

### New table: `share_links`

```sql
CREATE TABLE public.share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id integer NOT NULL REFERENCES public.flashcard_sets(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- No UPDATE policy — share links are immutable once created
CREATE POLICY share_links_insert ON public.share_links FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY share_links_select ON public.share_links FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY share_links_delete ON public.share_links FOR DELETE USING (auth.uid() = created_by);

CREATE INDEX share_links_created_by_idx ON public.share_links(created_by);
```

### RPC: `accept_share_link(link_id uuid)` — SECURITY DEFINER

- Validates: link exists, not expired
- Copies `flashcard_sets` → new set with `user_id = auth.uid()`, name = `"[Shared] Original Name"`
- Copies all `flashcards` from original set → new flashcards with new `set_id`, `user_id = auth.uid()`
- Copied flashcard fields: `front`, `back`, `front_language`, `back_language`, `front_image_url`, `back_audio_url`, `position`
- Set to NULL/default: `generation_id` = NULL, `source` = `'manual'`
- NOT copied: `flashcard_reviews` (recipient starts fresh)
- Returns: new set ID
- If zero flashcards found for the set, returns error instead of creating an empty copy
- Set `description` is copied as-is from the original
- `source` set to `'manual'` regardless of original — the copy has no generation lineage
- Security: `SET search_path = public, pg_temp`, validates `auth.uid()` internally

### Security: SECURITY DEFINER and RLS bypass

The RPC must read `share_links`, `flashcard_sets`, and `flashcards` owned by another user. This is the core reason it uses `SECURITY DEFINER`. Supabase migration-created functions run as the `postgres` superuser, which bypasses RLS. This is the only code path that allows cross-user data access.

### Cleanup: pg_cron job

```sql
SELECT cron.schedule('cleanup-expired-share-links', '0 3 * * *',
  $$DELETE FROM public.share_links WHERE expires_at < now()$$);
```

## Application Flow

### Generating a link (owner)

1. On `/sets/:id` (FlashcardListComponent) — "Share" button
2. Click → insert into `share_links` with `expires_at = now + 7 days`
3. Display PrimeNG Dialog with link `https://{domain}/share/{uuid}` + copy button
4. Info text: "Link valid for 7 days"

### Accepting a link (recipient)

1. Recipient opens `/share/{uuid}`
2. Route: `/share/:token` → `ShareAcceptComponent` (lazy loaded, authGuard)
3. If not logged in → redirect to `/login` with `returnUrl=/share/{uuid}`
4. If logged in → call RPC `accept_share_link(token)`
5. Success → redirect to `/sets/:newSetId` with toast "Set copied successfully"
6. Error (expired/invalid) → message "Link expired or invalid"

## New Types (`types.ts`)

```typescript
export interface ShareLinkDTO {
  id: string;
  set_id: number;
  created_by: string;
  expires_at: string;
  created_at: string;
}
```

## New Angular Components & Services

- `ShareAcceptComponent` — handles accept flow (lazy loaded, OnPush, signals)
- `ShareService` — generate links + accept RPC
- Extended `FlashcardListComponent` — "Share" button + dialog

All new components use OnPush change detection and signal-based state management per project conventions.

## No Changes To

- Existing RLS policies on flashcard_sets, flashcards, flashcard_reviews
- Existing API services
- NgRx store

## Edge Cases

- Owner clicks own link → gets a copy (simpler than blocking)
- Recipient clicks same link multiple times → new copy each time (acceptable with 7-day expiry)
- Link to deleted set → CASCADE deletes share_link, RPC returns error
- Anonymous user → authGuard on `/share/:token` forces login
