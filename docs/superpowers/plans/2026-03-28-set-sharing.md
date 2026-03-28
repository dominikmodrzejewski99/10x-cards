# Flashcard Set Sharing Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to share flashcard sets via time-limited links that create independent copies for recipients.

**Architecture:** New `share_links` table + SECURITY DEFINER RPC for cross-user copy. Angular `ShareService` handles link generation/acceptance. `ShareAcceptComponent` processes incoming share links, `FlashcardListComponent` gets a Share button + dialog.

**Tech Stack:** Supabase (PostgreSQL, RLS, RPC, pg_cron), Angular 21 (zoneless, signals, OnPush), PrimeNG (Dialog, Toast, Button)

**Spec:** `docs/superpowers/specs/2026-03-28-set-sharing-design.md`

---

## Chunk 1: Database Migration

### Task 1: Create share_links table and RPC migration

**Files:**
- Create: `supabase/migrations/20260329000000_flashcard_set_sharing.sql`

- [ ] **Step 1: Create migration file with share_links table**

```sql
-- Share links for flashcard set sharing
CREATE TABLE public.share_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id integer NOT NULL REFERENCES public.flashcard_sets(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.share_links ENABLE ROW LEVEL SECURITY;

-- No UPDATE policy — share links are immutable once created
CREATE POLICY share_links_insert ON public.share_links
  FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY share_links_select ON public.share_links
  FOR SELECT USING (auth.uid() = created_by);
CREATE POLICY share_links_delete ON public.share_links
  FOR DELETE USING (auth.uid() = created_by);

CREATE INDEX share_links_created_by_idx ON public.share_links(created_by);
CREATE INDEX share_links_set_id_idx ON public.share_links(set_id);
```

- [ ] **Step 2: Add accept_share_link RPC function**

Append to same migration file:

```sql
CREATE OR REPLACE FUNCTION public.accept_share_link(link_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_link share_links%ROWTYPE;
  v_original_set flashcard_sets%ROWTYPE;
  v_new_set_id integer;
  v_card_count integer;
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Fetch and validate link (bypasses RLS via SECURITY DEFINER)
  SELECT * INTO v_link FROM share_links WHERE id = link_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Share link not found';
  END IF;
  IF v_link.expires_at < now() THEN
    RAISE EXCEPTION 'Share link has expired';
  END IF;

  -- Fetch original set
  SELECT * INTO v_original_set FROM flashcard_sets WHERE id = v_link.set_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Original set not found';
  END IF;

  -- Check flashcards exist
  SELECT count(*) INTO v_card_count FROM flashcards WHERE set_id = v_link.set_id;
  IF v_card_count = 0 THEN
    RAISE EXCEPTION 'Original set has no flashcards';
  END IF;

  -- Copy the set
  INSERT INTO flashcard_sets (user_id, name, description)
  VALUES (v_caller_id, '[Shared] ' || v_original_set.name, v_original_set.description)
  RETURNING id INTO v_new_set_id;

  -- Copy all flashcards
  INSERT INTO flashcards (front, back, front_image_url, back_audio_url, front_language, back_language, source, position, user_id, set_id)
  SELECT front, back, front_image_url, back_audio_url, front_language, back_language, 'manual', position, v_caller_id, v_new_set_id
  FROM flashcards
  WHERE set_id = v_link.set_id;

  RETURN v_new_set_id;
END;
$$;
```

- [ ] **Step 3: Add pg_cron cleanup job**

Append to same migration file:

```sql
-- Clean up expired share links daily at 3 AM (pg_cron may not be available locally)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.schedule(
      'cleanup-expired-share-links',
      '0 3 * * *',
      'DELETE FROM public.share_links WHERE expires_at < now()'
    );
  END IF;
END $$;
```

- [ ] **Step 4: Apply migration locally**

Run: `npx supabase db push` (or `npx supabase migration up` depending on local setup)
Expected: Migration applies successfully

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/20260329000000_flashcard_set_sharing.sql
git commit -m "feat: add share_links table and accept_share_link RPC"
```

---

## Chunk 2: Angular Types and ShareService

### Task 2: Add ShareLinkDTO type

**Files:**
- Modify: `angular-without-ssr/src/types.ts:100` (after UpdateFlashcardSetCommand)

- [ ] **Step 1: Add ShareLinkDTO to types.ts**

Add after the `UpdateFlashcardSetCommand` interface (around line 100), before the Generations section:

```typescript
// ---------- Sharing ----------

export interface ShareLinkDTO {
  id: string;
  set_id: number;
  created_by: string;
  expires_at: string;
  created_at: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add angular-without-ssr/src/types.ts
git commit -m "feat: add ShareLinkDTO type"
```

### Task 3: Create ShareService

**Files:**
- Create: `angular-without-ssr/src/app/services/share.service.ts`

- [ ] **Step 1: Create the service**

```typescript
import { Injectable } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from './supabase-client.factory';
import { ShareLinkDTO } from '../../types';

@Injectable({ providedIn: 'root' })
export class ShareService {
  private readonly supabase: SupabaseClient;

  constructor(private supabaseFactory: SupabaseClientFactory) {
    this.supabase = this.supabaseFactory.getClient();
  }

  async createShareLink(setId: number): Promise<ShareLinkDTO> {
    const userId = (await this.supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('Not authenticated');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data, error } = await this.supabase
      .from('share_links')
      .insert({
        set_id: setId,
        created_by: userId,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as ShareLinkDTO;
  }

  async acceptShareLink(linkId: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('accept_share_link', {
      link_id: linkId,
    });

    if (error) throw error;
    return data as number;
  }

  buildShareUrl(linkId: string): string {
    return `${window.location.origin}/share/${linkId}`;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add angular-without-ssr/src/app/services/share.service.ts
git commit -m "feat: add ShareService for link generation and acceptance"
```

---

## Chunk 3: ShareAcceptComponent and Route

### Task 4: Create ShareAcceptComponent

**Files:**
- Create: `angular-without-ssr/src/app/components/share/share-accept.component.ts`

- [ ] **Step 1: Create the component**

```typescript
import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ShareService } from '../../services/share.service';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-share-accept',
  standalone: true,
  imports: [ProgressSpinnerModule, ButtonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (loading()) {
      <div class="share-accept">
        <p-progressSpinner />
        <p>Kopiowanie zestawu...</p>
      </div>
    } @else if (error()) {
      <div class="share-accept share-accept--error">
        <i class="pi pi-exclamation-triangle share-accept__icon"></i>
        <h2>Nie można skopiować zestawu</h2>
        <p>{{ error() }}</p>
        <p-button label="Przejdź do panelu" (onClick)="goToDashboard()" />
      </div>
    }
  `,
  styles: [`
    .share-accept {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      gap: 1rem;
      text-align: center;
      padding: 2rem;
    }
    .share-accept__icon {
      font-size: 3rem;
      color: var(--red-500);
    }
  `],
})
export class ShareAcceptComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly shareService = inject(ShareService);

  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    const token = this.route.snapshot.paramMap.get('token');
    if (!token) {
      this.error.set('Nieprawidłowy link');
      this.loading.set(false);
      return;
    }
    this.acceptLink(token);
  }

  private async acceptLink(token: string): Promise<void> {
    try {
      const newSetId = await this.shareService.acceptShareLink(token);
      this.router.navigate(['/sets', newSetId], { queryParams: { shared: 'true' } });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('expired')) {
        this.error.set('Link wygasł. Poproś właściciela o nowy link.');
      } else if (message.includes('not found')) {
        this.error.set('Link jest nieprawidłowy lub został usunięty.');
      } else if (message.includes('no flashcards')) {
        this.error.set('Zestaw nie zawiera fiszek.');
      } else {
        this.error.set('Wystąpił błąd. Spróbuj ponownie później.');
      }
      this.loading.set(false);
    }
  }

  goToDashboard(): void {
    this.router.navigate(['/dashboard']);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add angular-without-ssr/src/app/components/share/share-accept.component.ts
git commit -m "feat: add ShareAcceptComponent for accepting share links"
```

### Task 5: Add share route

**Files:**
- Modify: `angular-without-ssr/src/app/app.routes.ts:65` (after language-test routes)

- [ ] **Step 1: Add the route**

Add after the language-test route block (around line 65), before the login/register routes:

```typescript
{
  path: 'share/:token',
  loadComponent: () =>
    import('./components/share/share-accept.component').then(
      (m) => m.ShareAcceptComponent
    ),
  canActivate: [authGuard],
},
```

Note: `authGuard` is already imported in this file. When an unauthenticated user hits this route, the guard saves the URL via `AuthRedirectService` and redirects to `/login`. After login, the user is redirected back to `/share/:token`.

- [ ] **Step 2: Commit**

```bash
git add angular-without-ssr/src/app/app.routes.ts
git commit -m "feat: add share/:token route with authGuard"
```

---

## Chunk 4: Share Button and Dialog in FlashcardListComponent

### Task 6: Add share dialog to FlashcardListComponent

**Files:**
- Modify: `angular-without-ssr/src/app/components/flashcards/flashcard-list.component.ts`
- Modify: `angular-without-ssr/src/app/components/flashcards/flashcard-list.component.html`

- [ ] **Step 1: Add share state and methods to component class**

In `flashcard-list.component.ts`:

1. Add import for `ShareService`:
```typescript
import { ShareService } from '../../services/share.service';
```

2. Add import for `ClipboardModule` from `@angular/cdk/clipboard` or use `navigator.clipboard` directly (simpler, no extra dep).

3. Inject ShareService alongside other services:
```typescript
private readonly shareService = inject(ShareService);
```

4. Add share state signals (alongside existing state signals):
```typescript
readonly shareDialogVisible = signal(false);
readonly shareLink = signal<string | null>(null);
readonly shareLoading = signal(false);
```

5. In `ngOnInit()`, after the existing `saved` query param handling (around line 101), add:

```typescript
const shared = this.route.snapshot.queryParams['shared'];
if (shared) {
  this.messageService.add({
    severity: 'success',
    summary: 'Skopiowano',
    detail: 'Zestaw został skopiowany na Twoje konto',
  });
  this.router.navigate([], { queryParams: {}, replaceUrl: true });
}
```

6. Add methods after existing methods (after `exportJson` around line 492):

```typescript
async openShareDialog(): Promise<void> {
  this.shareDialogVisible.set(true);
  this.shareLink.set(null);
  this.shareLoading.set(true);
  try {
    const setId = Number(this.route.snapshot.paramMap.get('id'));
    const link = await this.shareService.createShareLink(setId);
    this.shareLink.set(this.shareService.buildShareUrl(link.id));
  } catch {
    this.messageService.add({
      severity: 'error',
      summary: 'Błąd',
      detail: 'Nie udało się wygenerować linku',
    });
    this.shareDialogVisible.set(false);
  } finally {
    this.shareLoading.set(false);
  }
}

async copyShareLink(): Promise<void> {
  const link = this.shareLink();
  if (!link) return;
  try {
    await navigator.clipboard.writeText(link);
    this.messageService.add({
      severity: 'success',
      summary: 'Skopiowano',
      detail: 'Link skopiowany do schowka',
    });
  } catch {
    this.messageService.add({
      severity: 'error',
      summary: 'Błąd',
      detail: 'Nie udało się skopiować linku',
    });
  }
}
```

- [ ] **Step 2: Add share button to the "More" menu in template**

In `flashcard-list.component.html`, inside the more menu (`p-menu` or button group around lines 19-39), add a Share button. Add it before the Import button:

```html
<p-button
  label="Udostępnij"
  icon="pi pi-share-alt"
  [text]="true"
  (onClick)="openShareDialog()"
  data-test-id="share-button"
/>
```

- [ ] **Step 3: Add share dialog to template**

Add at the end of the template file (before closing tags):

```html
<p-dialog
  header="Udostępnij zestaw"
  [visible]="shareDialogVisible()"
  (visibleChange)="shareDialogVisible.set($event)"
  [modal]="true"
  [closeOnEscape]="true"
  [dismissableMask]="true"
  [draggable]="false"
  [resizable]="false"
  [style]="{width: '95vw', maxWidth: '500px'}"
  styleClass="modern-dialog">

  @if (shareLoading()) {
    <div style="text-align: center; padding: 2rem;">
      <p-progressSpinner />
    </div>
  } @else if (shareLink()) {
    <div class="flist__share-dialog">
      <p class="flist__share-info">
        Link ważny przez 7 dni. Każdy z linkiem może skopiować zestaw na swoje konto.
      </p>
      <div class="flist__share-link-row">
        <input
          type="text"
          pInputText
          [value]="shareLink()"
          readonly
          class="flist__share-input"
        />
        <p-button
          icon="pi pi-copy"
          (onClick)="copyShareLink()"
          [outlined]="true"
          pTooltip="Kopiuj link"
        />
      </div>
    </div>
  }
</p-dialog>
```

- [ ] **Step 4: Add share dialog styles**

In `flashcard-list.component.scss` (or the component's style file), add:

```scss
.flist__share-dialog {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.flist__share-info {
  color: var(--text-color-secondary);
  margin: 0;
}

.flist__share-link-row {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.flist__share-input {
  flex: 1;
  font-size: 0.875rem;
}
```

- [ ] **Step 5: Add necessary PrimeNG imports**

In `flashcard-list.component.ts`, add these import statements at the top:

```typescript
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { InputTextModule } from 'primeng/inputtext';
import { TooltipModule } from 'primeng/tooltip';
```

And add `ProgressSpinnerModule`, `InputTextModule`, `TooltipModule` to the `imports` array in the `@Component` decorator alongside existing `DialogModule`, `ToastModule`, etc.

- [ ] **Step 6: Verify the app compiles**

Run: `cd angular-without-ssr && npx ng build`
Expected: Build succeeds with no errors

- [ ] **Step 7: Commit**

```bash
git add angular-without-ssr/src/app/components/flashcards/flashcard-list.component.ts
git add angular-without-ssr/src/app/components/flashcards/flashcard-list.component.html
git add angular-without-ssr/src/app/components/flashcards/flashcard-list.component.scss
git commit -m "feat: add share button and dialog to flashcard list view"
```

---

## Chunk 5: Integration Testing

### Task 7: Manual integration test

- [ ] **Step 1: Test link generation**

1. Log in as user A
2. Navigate to a set with flashcards
3. Click "Udostępnij" in the more menu
4. Verify dialog shows with a link
5. Copy the link

- [ ] **Step 2: Test link acceptance**

1. Open an incognito/different browser
2. Log in as user B
3. Paste the share link
4. Verify redirect to the new copied set
5. Verify flashcards are present with correct content
6. Verify set name starts with "[Shared]"

- [ ] **Step 3: Test error cases**

1. Try an invalid UUID in the share URL → should show error
2. Wait for link expiry (or manually update `expires_at` in DB to past) → should show "Link wygasł"
3. Try the share URL while logged out → should redirect to login, then back to share URL after login

- [ ] **Step 4: Final commit if any fixes needed**

```bash
git add -A
git commit -m "fix: address issues found during integration testing"
```
