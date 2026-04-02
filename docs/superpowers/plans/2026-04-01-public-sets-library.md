# Public Sets Library Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow users to publish flashcard sets to a public library that other authenticated users can browse, search, and copy.

**Architecture:** Supabase migration adds `is_public`, `copy_count`, `published_at` columns + RPC functions. New `ExploreComponent` page at `/explore` with `ExploreService`. Existing `SetListComponent` gets publish/unpublish icon buttons. Navbar gets "Explore" link.

**Tech Stack:** Angular 21 (zoneless, OnPush, signals), Supabase (RLS, RPC), PrimeNG, Transloco i18n, BEM SCSS

---

## Chunk 1: Database Migration

### Task 1: Supabase Migration — Schema + RPC

**Files:**
- Create: `supabase/migrations/20260401130000_public_sets_library.sql`

- [ ] **Step 1: Write the migration file**

```sql
-- Public Sets Library: schema changes + RPC functions

-- ── Schema changes ──
ALTER TABLE public.flashcard_sets
  ADD COLUMN is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN copy_count integer NOT NULL DEFAULT 0,
  ADD COLUMN published_at timestamptz;

CREATE INDEX flashcard_sets_public_idx
  ON public.flashcard_sets (is_public, published_at DESC)
  WHERE is_public = true;

-- ── RLS: authenticated users can view public sets ──
CREATE POLICY "Authenticated users can view public sets"
  ON public.flashcard_sets
  FOR SELECT
  TO authenticated
  USING (is_public = true);

-- ── RLS: authenticated users can view flashcards of public sets ──
CREATE POLICY "Authenticated users can view flashcards of public sets"
  ON public.flashcards
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.flashcard_sets
      WHERE flashcard_sets.id = flashcards.set_id
      AND flashcard_sets.is_public = true
    )
  );

-- ── RPC: publish_set ──
CREATE OR REPLACE FUNCTION public.publish_set(p_set_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE flashcard_sets
  SET is_public = true, published_at = now(), updated_at = now()
  WHERE id = p_set_id AND user_id = v_caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Set not found or not owned by user';
  END IF;
END;
$$;

-- ── RPC: unpublish_set ──
CREATE OR REPLACE FUNCTION public.unpublish_set(p_set_id integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  UPDATE flashcard_sets
  SET is_public = false, updated_at = now()
  WHERE id = p_set_id AND user_id = v_caller_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Set not found or not owned by user';
  END IF;
END;
$$;

-- ── RPC: copy_public_set ──
CREATE OR REPLACE FUNCTION public.copy_public_set(p_set_id integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_original_set flashcard_sets%ROWTYPE;
  v_new_set_id integer;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT * INTO v_original_set FROM flashcard_sets WHERE id = p_set_id AND is_public = true;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Public set not found';
  END IF;

  IF v_original_set.user_id = v_caller_id THEN
    RAISE EXCEPTION 'Cannot copy your own set';
  END IF;

  INSERT INTO flashcard_sets (user_id, name, description)
  VALUES (v_caller_id, v_original_set.name, v_original_set.description)
  RETURNING id INTO v_new_set_id;

  INSERT INTO flashcards (front, back, front_image_url, back_audio_url, front_language, back_language, source, position, user_id, set_id)
  SELECT front, back, front_image_url, back_audio_url, front_language, back_language, 'manual', position, v_caller_id, v_new_set_id
  FROM flashcards
  WHERE set_id = p_set_id;

  UPDATE flashcard_sets
  SET copy_count = copy_count + 1
  WHERE id = p_set_id;

  RETURN v_new_set_id;
END;
$$;

-- ── RPC: browse_public_sets ──
CREATE OR REPLACE FUNCTION public.browse_public_sets(
  p_search text DEFAULT '',
  p_sort text DEFAULT 'popular',
  p_page integer DEFAULT 1,
  p_page_size integer DEFAULT 12
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_id uuid;
  v_result jsonb;
  v_total integer;
  v_offset integer;
  v_search text;
BEGIN
  v_caller_id := auth.uid();
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  v_offset := (p_page - 1) * p_page_size;
  v_search := '%' || COALESCE(NULLIF(trim(p_search), ''), '') || '%';

  -- Count total matching
  SELECT count(*) INTO v_total
  FROM flashcard_sets
  WHERE is_public = true
  AND (v_search = '%%' OR name ILIKE v_search OR description ILIKE v_search);

  -- Fetch page
  SELECT COALESCE(jsonb_agg(row_data), '[]'::jsonb) INTO v_result
  FROM (
    SELECT jsonb_build_object(
      'id', fs.id,
      'name', fs.name,
      'description', fs.description,
      'card_count', (SELECT count(*) FROM flashcards WHERE set_id = fs.id),
      'author_email_masked', mask_email(u.email),
      'copy_count', fs.copy_count,
      'published_at', fs.published_at
    ) AS row_data
    FROM flashcard_sets fs
    JOIN users u ON u.id = fs.user_id
    WHERE fs.is_public = true
    AND (v_search = '%%' OR fs.name ILIKE v_search OR fs.description ILIKE v_search)
    ORDER BY
      CASE WHEN p_sort = 'popular' THEN fs.copy_count END DESC NULLS LAST,
      CASE WHEN p_sort = 'newest' THEN fs.published_at END DESC NULLS LAST,
      CASE WHEN p_sort = 'most_cards' THEN (SELECT count(*) FROM flashcards WHERE set_id = fs.id) END DESC NULLS LAST,
      fs.published_at DESC
    LIMIT p_page_size OFFSET v_offset
  ) sub;

  RETURN jsonb_build_object(
    'sets', v_result,
    'total', v_total
  );
END;
$$;
```

- [ ] **Step 2: Apply migration locally**

Run: `cd C:/Users/domin/Desktop/Projects/10x-cards && npx supabase db push`
Expected: Migration applied successfully

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260401130000_public_sets_library.sql
git commit -m "feat(db): add public sets library schema, RLS and RPC functions"
```

---

## Chunk 2: Types + Service

### Task 2: Update Types

**Files:**
- Modify: `angular-without-ssr/src/types.ts`

- [ ] **Step 1: Add PublicSetDTO and extend FlashcardSetDTO**

Add `PublicSetDTO` after `ShareLinkDTO`:

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

export interface BrowsePublicSetsResponse {
  sets: PublicSetDTO[];
  total: number;
}
```

Add to existing `FlashcardSetDTO`:

```typescript
export interface FlashcardSetDTO {
  id: number;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  is_public: boolean;
  copy_count: number;
  published_at: string | null;
}
```

- [ ] **Step 2: Commit**

```bash
git add angular-without-ssr/src/types.ts
git commit -m "feat(types): add PublicSetDTO and extend FlashcardSetDTO for public sets"
```

### Task 3: ExploreService

**Files:**
- Create: `angular-without-ssr/src/app/services/explore.service.ts`

- [ ] **Step 1: Create the service**

```typescript
import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, throwError } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from './supabase-client.factory';
import { BrowsePublicSetsResponse } from '../../types';

@Injectable({ providedIn: 'root' })
export class ExploreService {
  private supabase: SupabaseClient = inject(SupabaseClientFactory).getClient();

  browse(search: string, sort: string, page: number, pageSize: number): Observable<BrowsePublicSetsResponse> {
    return from(
      this.supabase.rpc('browse_public_sets', {
        p_search: search,
        p_sort: sort,
        p_page: page,
        p_page_size: pageSize
      })
    ).pipe(
      map(response => {
        if (response.error) throw new Error(response.error.message);
        return response.data as BrowsePublicSetsResponse;
      }),
      catchError(error => throwError(() => error))
    );
  }

  copySet(setId: number): Observable<number> {
    return from(
      this.supabase.rpc('copy_public_set', { p_set_id: setId })
    ).pipe(
      map(response => {
        if (response.error) throw new Error(response.error.message);
        return response.data as number;
      }),
      catchError(error => throwError(() => error))
    );
  }

  publishSet(setId: number): Observable<void> {
    return from(
      this.supabase.rpc('publish_set', { p_set_id: setId })
    ).pipe(
      map(response => {
        if (response.error) throw new Error(response.error.message);
      }),
      catchError(error => throwError(() => error))
    );
  }

  unpublishSet(setId: number): Observable<void> {
    return from(
      this.supabase.rpc('unpublish_set', { p_set_id: setId })
    ).pipe(
      map(response => {
        if (response.error) throw new Error(response.error.message);
      }),
      catchError(error => throwError(() => error))
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add angular-without-ssr/src/app/services/explore.service.ts
git commit -m "feat(service): add ExploreService for public sets browsing and publishing"
```

---

## Chunk 3: Explore Page

### Task 4: ExploreComponent

**Files:**
- Create: `angular-without-ssr/src/app/components/explore/explore.component.ts`
- Create: `angular-without-ssr/src/app/components/explore/explore.component.html`
- Create: `angular-without-ssr/src/app/components/explore/explore.component.scss`

- [ ] **Step 1: Create the component class**

```typescript
import { Component, OnInit, signal, inject, ChangeDetectionStrategy } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { TranslocoDirective } from '@jsverse/transloco';
import { ExploreService } from '../../services/explore.service';
import { PublicSetDTO } from '../../../types';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';

interface ExploreState {
  sets: PublicSetDTO[];
  loading: boolean;
  error: string | null;
  search: string;
  sort: string;
  page: number;
  pageSize: number;
  total: number;
}

@Component({
  selector: 'app-explore',
  imports: [FormsModule, RouterModule, ToastModule, NgxSkeletonLoaderModule, TranslocoDirective],
  providers: [MessageService],
  templateUrl: './explore.component.html',
  styleUrls: ['./explore.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExploreComponent implements OnInit {
  private exploreService = inject(ExploreService);
  private messageService = inject(MessageService);

  state = signal<ExploreState>({
    sets: [],
    loading: false,
    error: null,
    search: '',
    sort: 'popular',
    page: 1,
    pageSize: 12,
    total: 0
  });

  private searchSubject = new Subject<string>();

  ngOnInit(): void {
    this.searchSubject.pipe(
      debounceTime(300),
      distinctUntilChanged()
    ).subscribe(search => {
      this.state.update(s => ({ ...s, search, page: 1 }));
      this.loadSets();
    });
    this.loadSets();
  }

  loadSets(): void {
    const { search, sort, page, pageSize } = this.state();
    this.state.update(s => ({ ...s, loading: true, error: null }));

    this.exploreService.browse(search, sort, page, pageSize).subscribe({
      next: (response) => {
        this.state.update(s => ({
          ...s,
          sets: response.sets,
          total: response.total,
          loading: false
        }));
      },
      error: () => {
        this.state.update(s => ({ ...s, loading: false, error: 'Failed to load sets' }));
      }
    });
  }

  onSearchInput(value: string): void {
    this.searchSubject.next(value);
  }

  onSortChange(sort: string): void {
    this.state.update(s => ({ ...s, sort, page: 1 }));
    this.loadSets();
  }

  onPageChange(page: number): void {
    this.state.update(s => ({ ...s, page }));
    this.loadSets();
  }

  copySet(setId: number): void {
    this.exploreService.copySet(setId).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Skopiowano',
          detail: 'Zestaw został skopiowany do Twoich zestawów.'
        });
        // Update copy count locally
        this.state.update(s => ({
          ...s,
          sets: s.sets.map(set =>
            set.id === setId ? { ...set, copy_count: set.copy_count + 1 } : set
          )
        }));
      },
      error: (err) => {
        const detail = err?.message?.includes('Cannot copy your own')
          ? 'Nie możesz skopiować własnego zestawu.'
          : 'Nie udało się skopiować zestawu.';
        this.messageService.add({ severity: 'error', summary: 'Błąd', detail });
      }
    });
  }

  get totalPages(): number {
    return Math.ceil(this.state().total / this.state().pageSize);
  }
}
```

- [ ] **Step 2: Create the template**

```html
<ng-container *transloco="let t; prefix: 'explore'">
<div class="explore">
  <div class="explore__header">
    <h1 class="explore__title">{{ t('title') }}</h1>
  </div>

  <div class="explore__toolbar">
    <div class="explore__search">
      <i class="pi pi-search explore__search-icon"></i>
      <input
        type="text"
        class="explore__search-input"
        [placeholder]="t('searchPlaceholder')"
        [ngModel]="state().search"
        (ngModelChange)="onSearchInput($event)" />
    </div>
    <select class="explore__sort" [ngModel]="state().sort" (ngModelChange)="onSortChange($event)">
      <option value="popular">{{ t('sortPopular') }}</option>
      <option value="newest">{{ t('sortNewest') }}</option>
      <option value="most_cards">{{ t('sortMostCards') }}</option>
    </select>
  </div>

  @if (state().loading && state().sets.length === 0) {
    <div class="explore__grid">
      @for (_ of [1,2,3,4,5,6]; track $index) {
        <div class="explore-card">
          <ngx-skeleton-loader [theme]="{ width: '70%', height: '1.1rem' }"></ngx-skeleton-loader>
          <ngx-skeleton-loader [theme]="{ width: '90%', height: '0.8rem', marginTop: '0.5rem' }"></ngx-skeleton-loader>
          <ngx-skeleton-loader [theme]="{ width: '50%', height: '0.7rem', marginTop: '0.75rem' }"></ngx-skeleton-loader>
        </div>
      }
    </div>
  }

  @if (state().error && state().sets.length === 0) {
    <div class="explore__empty">
      <i class="pi pi-exclamation-circle"></i>
      <p>{{ state().error }}</p>
      <button (click)="loadSets()" class="explore__btn explore__btn--outline">{{ t('retry') }}</button>
    </div>
  }

  @if (!state().loading && state().sets.length === 0 && !state().error) {
    <div class="explore__empty">
      <div class="explore__empty-icon-wrap">
        <i class="pi pi-search"></i>
      </div>
      <h2 class="explore__empty-title">{{ t('emptyTitle') }}</h2>
      <p class="explore__empty-desc">{{ t('emptyDesc') }}</p>
    </div>
  }

  @if (state().sets.length > 0) {
    <div class="explore__grid fade-in">
      @for (set of state().sets; track set.id) {
        <div class="explore-card">
          <div class="explore-card__header">
            <h2 class="explore-card__name">{{ set.name }}</h2>
            <span class="explore-card__badge">{{ set.card_count }} {{ t('cards') }}</span>
          </div>
          @if (set.description) {
            <p class="explore-card__desc">{{ set.description }}</p>
          }
          <div class="explore-card__footer">
            <div class="explore-card__meta">
              <span>{{ set.author_email_masked }}</span>
              <span>·</span>
              <span>{{ set.copy_count }} {{ t('copies') }}</span>
            </div>
            <button class="explore-card__copy" [title]="t('copyButton')" (click)="copySet(set.id)">
              <i class="pi pi-copy"></i>
            </button>
          </div>
        </div>
      }
    </div>

    @if (totalPages > 1) {
      <div class="explore__pagination">
        <button
          class="explore__page-btn"
          [disabled]="state().page <= 1"
          (click)="onPageChange(state().page - 1)">
          <i class="pi pi-chevron-left"></i>
        </button>
        <span class="explore__page-info">{{ state().page }} / {{ totalPages }}</span>
        <button
          class="explore__page-btn"
          [disabled]="state().page >= totalPages"
          (click)="onPageChange(state().page + 1)">
          <i class="pi pi-chevron-right"></i>
        </button>
      </div>
    }
  }

  <p-toast position="bottom-center"></p-toast>
</div>
</ng-container>
```

- [ ] **Step 3: Create the SCSS**

```scss
@use 'variables' as *;
@use 'buttons' as *;
@use 'layout' as *;
@use 'cards' as *;
@use 'states' as *;
@use 'forms' as *;

.explore {
  @include page-wide;
}

.explore__header {
  margin-bottom: 1.5rem;
}

.explore__title {
  font-size: $font-size-xl;
  font-weight: $font-weight-extrabold;
  color: $color-text;
  margin: 0;
}

.explore__toolbar {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.explore__search {
  position: relative;
  flex: 1;
  min-width: 200px;
}

.explore__search-icon {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: $color-text-secondary;
  font-size: 0.85rem;
}

.explore__search-input {
  @include form-input;
  padding-left: 2.25rem;
  width: 100%;
}

.explore__sort {
  @include form-input;
  width: auto;
  cursor: pointer;
}

.explore__btn {
  @include btn-base;
  @include btn-md;
}

.explore__btn--outline {
  @include btn-ghost;
  @include btn-md;
}

.explore__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 2.5rem 1.5rem;
  border: 2px dashed $color-border;
  border-radius: $radius-2xl;
  background: linear-gradient(135deg, $color-bg 0%, $color-white 100%);
}

.explore__empty-icon-wrap {
  width: 4.5rem;
  height: 4.5rem;
  border-radius: $radius-full;
  background: $color-primary-light;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  color: $color-primary;
  margin-bottom: 1rem;
}

.explore__empty-title {
  font-size: $font-size-lg;
  font-weight: $font-weight-extrabold;
  color: $color-text;
  margin: 0 0 0.5rem;
}

.explore__empty-desc {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  margin: 0;
  max-width: 320px;
  line-height: $line-height-normal;
}

.explore__grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

// ── Card ──
.explore-card {
  @include card;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.explore-card__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.explore-card__name {
  font-size: 1.05rem;
  font-weight: $font-weight-bold;
  color: $color-text;
  margin: 0;
  line-height: $line-height-snug;
}

.explore-card__badge {
  background: $color-primary-light;
  color: $color-primary;
  font-size: $font-size-xs;
  padding: 0.2rem 0.5rem;
  border-radius: $radius-sm;
  white-space: nowrap;
  font-weight: $font-weight-semibold;
}

.explore-card__desc {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  margin: 0;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.explore-card__footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: auto;
  padding-top: 0.5rem;
  border-top: 1px solid $color-border-light;
}

.explore-card__meta {
  display: flex;
  gap: 0.5rem;
  font-size: $font-size-xs;
  color: $color-text-secondary;
}

.explore-card__copy {
  @include btn-icon(1.75rem);

  &:hover:not(:disabled) {
    background: $color-primary;
    color: $color-white;
  }
}

// ── Pagination ──
.explore__pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1.5rem;
}

.explore__page-btn {
  @include btn-icon(2rem);
}

.explore__page-info {
  font-size: $font-size-sm;
  color: $color-text-secondary;
  font-weight: $font-weight-semibold;
}

@media (max-width: $bp-tablet) {
  .explore__grid {
    grid-template-columns: 1fr;
  }
}
```

- [ ] **Step 4: Add route**

Modify `angular-without-ssr/src/app/app.routes.ts` — add before the `sets` route:

```typescript
{
  path: 'explore',
  loadComponent: () => import('./components/explore/explore.component').then(m => m.ExploreComponent),
  canActivate: [authGuard]
},
```

- [ ] **Step 5: Build and verify no errors**

Run: `cd C:/Users/domin/Desktop/Projects/10x-cards/angular-without-ssr && npx ng build`
Expected: Build succeeds with no errors

- [ ] **Step 6: Commit**

```bash
git add angular-without-ssr/src/app/components/explore/ angular-without-ssr/src/app/app.routes.ts
git commit -m "feat(explore): add explore page for browsing public sets"
```

---

## Chunk 4: Set List Publish/Unpublish

### Task 5: Publish/Unpublish in SetListComponent

**Files:**
- Modify: `angular-without-ssr/src/app/components/sets/set-list.component.ts`
- Modify: `angular-without-ssr/src/app/components/sets/set-list.component.html`
- Modify: `angular-without-ssr/src/app/components/sets/set-list.component.scss`

- [ ] **Step 1: Add ExploreService import and methods to component**

In `set-list.component.ts`, add import:

```typescript
import { ExploreService } from '../../services/explore.service';
```

Add to class:

```typescript
private exploreService = inject(ExploreService);
```

Add methods:

```typescript
publishSet(set: FlashcardSetDTO): void {
  this.confirmationService.confirm({
    message: `Czy na pewno chcesz opublikować zestaw „${set.name}"? Będzie widoczny dla wszystkich użytkowników.`,
    header: 'Publikacja zestawu',
    icon: 'pi pi-globe',
    acceptLabel: 'Opublikuj',
    rejectLabel: 'Anuluj',
    accept: () => {
      this.exploreService.publishSet(set.id).subscribe({
        next: () => {
          this.state.update(s => ({
            ...s,
            sets: s.sets.map(st => st.id === set.id
              ? { ...st, is_public: true, published_at: new Date().toISOString(), copy_count: st.copy_count ?? 0 }
              : st
            )
          }));
          this.messageService.add({
            severity: 'success',
            summary: 'Opublikowano',
            detail: 'Zestaw jest teraz publiczny.'
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Błąd',
            detail: 'Nie udało się opublikować zestawu.'
          });
        }
      });
    }
  });
}

unpublishSet(set: FlashcardSetDTO): void {
  this.confirmationService.confirm({
    message: `Czy na pewno chcesz ukryć zestaw „${set.name}"? Nie będzie już widoczny publicznie.`,
    header: 'Ukrycie zestawu',
    icon: 'pi pi-lock',
    acceptLabel: 'Ukryj',
    rejectLabel: 'Anuluj',
    accept: () => {
      this.exploreService.unpublishSet(set.id).subscribe({
        next: () => {
          this.state.update(s => ({
            ...s,
            sets: s.sets.map(st => st.id === set.id
              ? { ...st, is_public: false }
              : st
            )
          }));
          this.messageService.add({
            severity: 'success',
            summary: 'Ukryto',
            detail: 'Zestaw nie jest już publiczny.'
          });
        },
        error: () => {
          this.messageService.add({
            severity: 'error',
            summary: 'Błąd',
            detail: 'Nie udało się ukryć zestawu.'
          });
        }
      });
    }
  });
}
```

- [ ] **Step 2: Update template — add publish/unpublish button in card actions**

In `set-list.component.html`, inside `set-card__actions` div, add before the edit button:

```html
@if (set.is_public) {
  <button class="set-card__action set-card__action--unpublish" [title]="t('unpublishAction')" (click)="unpublishSet(set)">
    <i class="pi pi-lock"></i>
  </button>
} @else {
  <button class="set-card__action set-card__action--publish" [title]="t('publishAction')" (click)="publishSet(set)">
    <i class="pi pi-globe"></i>
  </button>
}
```

Add public badge in card header — after `set-card__name`:

```html
@if (set.is_public) {
  <span class="set-card__public-badge">{{ t('publicBadge') }}</span>
}
```

Add copy count in footer — after `set-card__date`:

```html
@if (set.is_public) {
  <span class="set-card__copies">
    <i class="pi pi-copy"></i> {{ set.copy_count }} {{ t('copyCount') }}
  </span>
}
```

Add green border modifier on set-card:

```html
<div class="set-card" [class.set-card--public]="set.is_public" (click)="navigateToSet(set)">
```

- [ ] **Step 3: Update SCSS — add new modifiers**

In `set-list.component.scss`, add after `.set-card__action--danger`:

```scss
.set-card__action--publish {
  color: $color-success;

  &:hover:not(:disabled) {
    background: $color-success-light;
    color: $color-success;
  }
}

.set-card__action--unpublish {
  color: $color-danger;

  &:hover:not(:disabled) {
    background: $color-danger-light;
    color: $color-danger;
  }
}

.set-card--public {
  border-color: $color-success;
}

.set-card__public-badge {
  background: $color-success-light;
  color: $color-success;
  font-size: $font-size-xs;
  padding: 0.1rem 0.4rem;
  border-radius: $radius-sm;
  font-weight: $font-weight-bold;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  white-space: nowrap;
}

.set-card__copies {
  font-size: $font-size-xs;
  color: $color-text-secondary;
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}
```

- [ ] **Step 4: Build and verify**

Run: `cd C:/Users/domin/Desktop/Projects/10x-cards/angular-without-ssr && npx ng build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add angular-without-ssr/src/app/components/sets/
git commit -m "feat(sets): add publish/unpublish buttons with public badge and copy count"
```

---

## Chunk 5: Navbar + i18n

### Task 6: Navbar — Add Explore Link

**Files:**
- Modify: `angular-without-ssr/src/app/shared/components/auth-navbar.component.ts`

- [ ] **Step 1: Add explore link in desktop nav**

After the generate link, before the friends link, add:

```html
<a routerLink="/explore" routerLinkActive="navbar__link--active" class="navbar__link">
  <i class="pi pi-search"></i> {{ t('explore') }}
</a>
```

- [ ] **Step 2: Add explore link in mobile drawer**

After the generate link, before the friends link, add:

```html
<a routerLink="/explore" routerLinkActive="navbar__link--active" class="navbar__link" (click)="closeMobile()">
  <i class="pi pi-search"></i> {{ t('explore') }}
</a>
```

- [ ] **Step 3: Commit**

```bash
git add angular-without-ssr/src/app/shared/components/auth-navbar.component.ts
git commit -m "feat(nav): add Explore link to navbar desktop and mobile drawer"
```

### Task 7: i18n — All 6 Languages

**Files:**
- Modify: `angular-without-ssr/src/assets/i18n/en.json`
- Modify: `angular-without-ssr/src/assets/i18n/pl.json`
- Modify: `angular-without-ssr/src/assets/i18n/de.json`
- Modify: `angular-without-ssr/src/assets/i18n/es.json`
- Modify: `angular-without-ssr/src/assets/i18n/fr.json`
- Modify: `angular-without-ssr/src/assets/i18n/uk.json`

- [ ] **Step 1: Add explore section and nav.explore key to all 6 language files**

**en.json:**
```json
"nav": {
  "explore": "Explore"
},
"explore": {
  "title": "Explore public sets",
  "searchPlaceholder": "Search sets...",
  "sortPopular": "Most popular",
  "sortNewest": "Newest",
  "sortMostCards": "Most cards",
  "copyButton": "Copy to my sets",
  "copies": "copies",
  "cards": "cards",
  "retry": "Try again",
  "emptyTitle": "No public sets",
  "emptyDesc": "No sets match your search. Try different keywords."
},
"sets": {
  "publishAction": "Publish",
  "unpublishAction": "Unpublish",
  "publicBadge": "Public",
  "copyCount": "copies"
}
```

**pl.json:**
```json
"nav": {
  "explore": "Odkrywaj"
},
"explore": {
  "title": "Przeglądaj publiczne zestawy",
  "searchPlaceholder": "Szukaj zestawów...",
  "sortPopular": "Najpopularniejsze",
  "sortNewest": "Najnowsze",
  "sortMostCards": "Najwięcej fiszek",
  "copyButton": "Kopiuj do siebie",
  "copies": "kopii",
  "cards": "fiszek",
  "retry": "Spróbuj ponownie",
  "emptyTitle": "Brak publicznych zestawów",
  "emptyDesc": "Żaden zestaw nie pasuje do wyszukiwania. Spróbuj innych słów kluczowych."
},
"sets": {
  "publishAction": "Opublikuj",
  "unpublishAction": "Ukryj",
  "publicBadge": "Publiczny",
  "copyCount": "kopii"
}
```

**de.json:**
```json
"nav": {
  "explore": "Entdecken"
},
"explore": {
  "title": "Öffentliche Sets durchsuchen",
  "searchPlaceholder": "Sets suchen...",
  "sortPopular": "Beliebteste",
  "sortNewest": "Neueste",
  "sortMostCards": "Meiste Karten",
  "copyButton": "Zu meinen Sets kopieren",
  "copies": "Kopien",
  "cards": "Karten",
  "retry": "Erneut versuchen",
  "emptyTitle": "Keine öffentlichen Sets",
  "emptyDesc": "Keine Sets entsprechen Ihrer Suche. Versuchen Sie andere Schlüsselwörter."
},
"sets": {
  "publishAction": "Veröffentlichen",
  "unpublishAction": "Verbergen",
  "publicBadge": "Öffentlich",
  "copyCount": "Kopien"
}
```

**es.json:**
```json
"nav": {
  "explore": "Explorar"
},
"explore": {
  "title": "Explorar sets públicos",
  "searchPlaceholder": "Buscar sets...",
  "sortPopular": "Más populares",
  "sortNewest": "Más recientes",
  "sortMostCards": "Más tarjetas",
  "copyButton": "Copiar a mis sets",
  "copies": "copias",
  "cards": "tarjetas",
  "retry": "Reintentar",
  "emptyTitle": "Sin sets públicos",
  "emptyDesc": "Ningún set coincide con tu búsqueda. Prueba con otras palabras clave."
},
"sets": {
  "publishAction": "Publicar",
  "unpublishAction": "Ocultar",
  "publicBadge": "Público",
  "copyCount": "copias"
}
```

**fr.json:**
```json
"nav": {
  "explore": "Explorer"
},
"explore": {
  "title": "Parcourir les sets publics",
  "searchPlaceholder": "Rechercher des sets...",
  "sortPopular": "Plus populaires",
  "sortNewest": "Plus récents",
  "sortMostCards": "Plus de cartes",
  "copyButton": "Copier dans mes sets",
  "copies": "copies",
  "cards": "cartes",
  "retry": "Réessayer",
  "emptyTitle": "Aucun set public",
  "emptyDesc": "Aucun set ne correspond à votre recherche. Essayez d'autres mots-clés."
},
"sets": {
  "publishAction": "Publier",
  "unpublishAction": "Masquer",
  "publicBadge": "Public",
  "copyCount": "copies"
}
```

**uk.json:**
```json
"nav": {
  "explore": "Огляд"
},
"explore": {
  "title": "Публічні набори",
  "searchPlaceholder": "Шукати набори...",
  "sortPopular": "Найпопулярніші",
  "sortNewest": "Найновіші",
  "sortMostCards": "Найбільше карток",
  "copyButton": "Копіювати до себе",
  "copies": "копій",
  "cards": "карток",
  "retry": "Спробувати знову",
  "emptyTitle": "Немає публічних наборів",
  "emptyDesc": "Жоден набір не відповідає пошуку. Спробуйте інші ключові слова."
},
"sets": {
  "publishAction": "Опублікувати",
  "unpublishAction": "Сховати",
  "publicBadge": "Публічний",
  "copyCount": "копій"
}
```

Note: Add these keys to the existing `nav` and `sets` sections (don't replace them). The `explore` section is new.

- [ ] **Step 2: Build and verify**

Run: `cd C:/Users/domin/Desktop/Projects/10x-cards/angular-without-ssr && npx ng build`
Expected: Build succeeds, no warnings

- [ ] **Step 3: Commit**

```bash
git add angular-without-ssr/src/assets/i18n/
git commit -m "feat(i18n): add explore and publish translations for all 6 languages"
```

---

## Chunk 6: Final Verification

### Task 8: End-to-End Smoke Test

- [ ] **Step 1: Serve the app**

Run: `cd C:/Users/domin/Desktop/Projects/10x-cards/angular-without-ssr && npx ng serve`

- [ ] **Step 2: Verify /explore page loads**

Navigate to `http://localhost:4200/explore` (must be logged in).
Expected: Page renders with search bar, sort dropdown, grid (empty if no public sets).

- [ ] **Step 3: Verify publish button on /sets**

Navigate to `http://localhost:4200/sets`.
Expected: Each set card has a globe icon button. Clicking shows confirmation dialog.

- [ ] **Step 4: Verify navbar link**

Expected: "Odkrywaj" / "Explore" link visible in desktop nav and mobile drawer between "Generuj" and "Znajomi".

- [ ] **Step 5: Publish a test set, verify it appears on /explore**

1. Click globe icon on a set → confirm → should show "Opublikowano" toast
2. Card should get green border + "PUBLICZNY" badge
3. Navigate to /explore → set should appear in the list

- [ ] **Step 6: Copy a public set (from another account)**

Expected: Copy button works, toast "Skopiowano", copy count increments.
