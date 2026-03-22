# Flashcard Language Features Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add per-flashcard language tagging, auto-translation suggestions via OpenRouter, and a reversible study direction toggle.

**Architecture:** Three independent features layered onto existing flashcard CRUD and study mode. New Supabase migration adds nullable `front_language`/`back_language` columns. Translation uses existing OpenRouter service with a new `translateText()` method. Study mode gets a signal-based direction toggle that swaps front/back rendering.

**Tech Stack:** Angular 21 (signals, standalone components, OnPush), Supabase (migration), PrimeNG (Dropdown), OpenRouter API (existing service)

---

## Chunk 1: Data Model & Types

### Task 1: Supabase Migration — add language columns

**Files:**
- Create: `supabase/migrations/20260322000000_add_flashcard_languages.sql`

- [ ] **Step 1: Write the migration**

```sql
-- Add optional language fields to flashcards
ALTER TABLE public.flashcards
  ADD COLUMN front_language varchar(5) DEFAULT NULL,
  ADD COLUMN back_language varchar(5) DEFAULT NULL;

COMMENT ON COLUMN public.flashcards.front_language IS 'ISO language code for front side (en, pl, de, es, fr) or NULL';
COMMENT ON COLUMN public.flashcards.back_language IS 'ISO language code for back side (en, pl, de, es, fr) or NULL';
```

- [ ] **Step 2: Apply migration (if using local Supabase)**

Run: `supabase db push` or apply via Supabase dashboard. Skip if migrations are applied separately in your deployment pipeline.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260322000000_add_flashcard_languages.sql
git commit -m "feat: add front_language/back_language columns to flashcards"
```

### Task 2: Update TypeScript types

**Files:**
- Modify: `angular-without-ssr/src/types.ts` (lines 42-53, 63-67, 70-73)

- [ ] **Step 1: Add language type and update FlashcardDTO**

Add after the `Source` type (line 37):

```typescript
export type FlashcardLanguage = 'en' | 'pl' | 'de' | 'es' | 'fr';
```

Add to `FlashcardDTO` interface (after `front_image_url`):

```typescript
front_language: FlashcardLanguage | null;
back_language: FlashcardLanguage | null;
```

- [ ] **Step 2: Update CreateFlashcardCommand**

Add `front_language` and `back_language` to the Omit exclusion list (so they become optional in the override), then re-add as optional:

```typescript
export type CreateFlashcardCommand = Omit<FlashcardDTO, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'generation_id' | 'set_id' | 'front_image_url' | 'front_language' | 'back_language'> & {
  front_image_url?: string | null;
  front_language?: FlashcardLanguage | null;
  back_language?: FlashcardLanguage | null;
  generation_id?: number | null;
  set_id: number;
};
```

- [ ] **Step 3: Update FlashcardFormData in flashcard-form.component.ts**

In `angular-without-ssr/src/app/components/flashcards/flashcard-form/flashcard-form.component.ts`, update the `FlashcardFormData` interface:

```typescript
export interface FlashcardFormData {
  id?: number;
  front: string;
  back: string;
  front_image_url?: string | null;
  front_language?: FlashcardLanguage | null;
  back_language?: FlashcardLanguage | null;
}
```

Add import: `import { FlashcardDTO, FlashcardLanguage } from '../../../../types';`

- [ ] **Step 4: Update FLASHCARD_COLUMNS in flashcard-api.service.ts**

In `angular-without-ssr/src/app/services/flashcard-api.service.ts`, update the select columns:

```typescript
const FLASHCARD_COLUMNS = 'id, front, back, front_image_url, front_language, back_language, source, set_id, generation_id, user_id, created_at, updated_at';
```

- [ ] **Step 5: Update createFlashcard in flashcard-api.service.ts**

Add language fields to the insert object in `createFlashcard()`:

```typescript
const flashcardToInsert = {
  front: data.front,
  back: data.back,
  front_image_url: data.front_image_url || null,
  front_language: data.front_language || null,
  back_language: data.back_language || null,
  source: data.source || 'manual',
  user_id: userId,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  generation_id: data.generation_id || null,
  set_id: data.set_id
};
```

- [ ] **Step 6: Verify the app compiles**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | head -30`
Expected: Build succeeds (warnings OK, no errors)

- [ ] **Step 7: Commit**

```bash
git add angular-without-ssr/src/types.ts angular-without-ssr/src/app/services/flashcard-api.service.ts angular-without-ssr/src/app/components/flashcards/flashcard-form/flashcard-form.component.ts
git commit -m "feat: add FlashcardLanguage type and update DTOs for language fields"
```

---

## Chunk 2: Translation Service

### Task 3: Add translateText method to OpenRouterService

**Files:**
- Modify: `angular-without-ssr/src/app/services/openrouter.service.ts`

- [ ] **Step 1: Add the translateText method**

Add this method to `OpenRouterService` class (after `getSession()`):

```typescript
public async translateText(text: string, fromLang: string, toLang: string): Promise<string> {
  const langNames: Record<string, string> = {
    en: 'English', pl: 'Polish', de: 'German', es: 'Spanish', fr: 'French'
  };
  const fromName = langNames[fromLang] || fromLang;
  const toName = langNames[toLang] || toLang;

  const result = await this.sendMessage(text, undefined, {
    systemMessage: `You are a translator. Translate the given word or phrase from ${fromName} to ${toName}. Return ONLY the translation. If there are multiple common meanings, separate them with semicolons. Do not add explanations.`,
    temperature: 0.3,
    max_tokens: 200
  });

  return result.trim();
}
```

- [ ] **Step 2: Verify the app compiles**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | head -30`
Expected: Build succeeds

- [ ] **Step 3: Commit**

```bash
git add angular-without-ssr/src/app/services/openrouter.service.ts
git commit -m "feat: add translateText method to OpenRouterService"
```

---

## Chunk 3: Flashcard Form — Language Dropdowns & Translation Suggestion

### Task 4: Add language dropdowns and translation to the form component

**Files:**
- Modify: `angular-without-ssr/src/app/components/flashcards/flashcard-form/flashcard-form.component.ts`
- Modify: `angular-without-ssr/src/app/components/flashcards/flashcard-form/flashcard-form.component.html`

- [ ] **Step 1: Update the component class**

In `flashcard-form.component.ts`:

Add imports:
```typescript
import { SelectModule } from 'primeng/select';
import { OpenRouterService } from '../../../services/openrouter.service';
import { FlashcardLanguage } from '../../../../types';
```

Add `SelectModule` to `imports` array.

Add to the class:
```typescript
private openRouterService: OpenRouterService = inject(OpenRouterService);

public translationSuggestionSignal: WritableSignal<string | null> = signal<string | null>(null);
public translatingSignal: WritableSignal<boolean> = signal<boolean>(false);

public readonly LANGUAGES: { label: string; value: FlashcardLanguage | null }[] = [
  { label: '—', value: null },
  { label: 'English', value: 'en' },
  { label: 'Polski', value: 'pl' },
  { label: 'Deutsch', value: 'de' },
  { label: 'Español', value: 'es' },
  { label: 'Français', value: 'fr' }
];

public frontLanguageSignal: WritableSignal<FlashcardLanguage | null> = signal<FlashcardLanguage | null>(null);
public backLanguageSignal: WritableSignal<FlashcardLanguage | null> = signal<FlashcardLanguage | null>(null);
```

Add a debounce timer and method to fetch translation on front blur:
```typescript
private translationTimeout: ReturnType<typeof setTimeout> | null = null;

public onFrontBlur(): void {
  if (this.translationTimeout) {
    clearTimeout(this.translationTimeout);
  }

  const frontLang = this.frontLanguageSignal();
  const backLang = this.backLanguageSignal();
  const frontValue = this.flashcardForm.get('front')?.value?.trim();

  if (!frontLang || !backLang || !frontValue || frontLang === backLang) {
    this.translationSuggestionSignal.set(null);
    return;
  }

  this.translationTimeout = setTimeout(() => {
    this.translatingSignal.set(true);
    this.translationSuggestionSignal.set(null);

    this.openRouterService.translateText(frontValue, frontLang, backLang)
      .then(translation => {
        this.translationSuggestionSignal.set(translation);
        this.translatingSignal.set(false);
      })
      .catch(() => {
        this.translatingSignal.set(false);
      });
  }, 500);
}

public acceptTranslation(): void {
  const suggestion = this.translationSuggestionSignal();
  if (suggestion) {
    const currentBack = this.flashcardForm.get('back')?.value?.trim();
    if (currentBack) {
      // Append to existing content
      this.flashcardForm.patchValue({ back: currentBack + '; ' + suggestion });
    } else {
      this.flashcardForm.patchValue({ back: suggestion });
    }
    this.translationSuggestionSignal.set(null);
  }
}
```

Update `onSubmit()` to include language fields in `formData`:
```typescript
const formData: FlashcardFormData = {
  front: formValue.front,
  back: formValue.back,
  front_image_url: this.pendingImageUrl,
  front_language: this.frontLanguageSignal(),
  back_language: this.backLanguageSignal()
};
```

Update `updateFormWithFlashcard()` — when editing, set language signals:
```typescript
if (flashcard) {
  this.flashcardForm.patchValue({
    front: flashcard.front,
    back: flashcard.back
  });
  this.pendingImageUrl = flashcard.front_image_url || null;
  this.imagePreviewSignal.set(flashcard.front_image_url || null);
  this.frontLanguageSignal.set(flashcard.front_language || null);
  this.backLanguageSignal.set(flashcard.back_language || null);
} else {
  this.flashcardForm.reset();
  this.pendingImageUrl = null;
  this.imagePreviewSignal.set(null);
  this.frontLanguageSignal.set(null);
  this.backLanguageSignal.set(null);
}
this.translationSuggestionSignal.set(null);
```

- [ ] **Step 2: Update the template**

In `flashcard-form.component.html`, add language dropdowns above the front and back fields.

Above the front field `<div class="field mb-4">` (first one), add:
```html
<div class="flex gap-3 mb-4">
  <div class="flex-1">
    <label class="block mb-2 text-gray-700 font-medium text-sm">Język frontu</label>
    <p-select
      [options]="LANGUAGES"
      optionLabel="label"
      optionValue="value"
      [ngModel]="frontLanguageSignal()"
      (ngModelChange)="frontLanguageSignal.set($event)"
      [style]="{ width: '100%' }"
      placeholder="—"
      data-test-id="front-language-select">
    </p-select>
  </div>
  <div class="flex-1">
    <label class="block mb-2 text-gray-700 font-medium text-sm">Język tyłu</label>
    <p-select
      [options]="LANGUAGES"
      optionLabel="label"
      optionValue="value"
      [ngModel]="backLanguageSignal()"
      (ngModelChange)="backLanguageSignal.set($event)"
      [style]="{ width: '100%' }"
      placeholder="—"
      data-test-id="back-language-select">
    </p-select>
  </div>
</div>
```

Add `(blur)="onFrontBlur()"` to the front input element.

Update the back textarea `placeholder` to be dynamic based on language selection. Change the static placeholder to:
```html
[placeholder]="frontLanguageSignal() && backLanguageSignal() ? 'Wpisz tłumaczenie, np. dom; budynek; rodzina' : 'Wpisz odpowiedź lub definicję (max. 1000 znaków)'"
```

After the back textarea `</textarea>` and before its error div, add the translation suggestion:
```html
@if (translatingSignal()) {
  <small class="text-gray-400 block mt-1">
    <i class="pi pi-spin pi-spinner"></i> Tłumaczenie...
  </small>
}
@if (translationSuggestionSignal()) {
  <button
    type="button"
    class="text-blue-500 text-sm mt-1 cursor-pointer bg-transparent border-0 p-0 hover:underline"
    (click)="acceptTranslation()"
    data-test-id="accept-translation">
    Sugerowane: {{ translationSuggestionSignal() }}
  </button>
}
```

Add `FormsModule` import to the component imports array (for `ngModel` on `p-select`):
```typescript
import { FormsModule } from '@angular/forms';
```
And add `FormsModule` to the `imports` array in the `@Component` decorator.

- [ ] **Step 3: Update flashcard-list onSave to pass language fields**

In `flashcard-list.component.ts`, update `onSave()`:

For create:
```typescript
this.flashcardApiService.createFlashcard({
  front: formData.front,
  back: formData.back,
  front_image_url: formData.front_image_url,
  front_language: formData.front_language,
  back_language: formData.back_language,
  source: 'manual',
  set_id: this.state().setId
})
```

For update:
```typescript
this.flashcardApiService.updateFlashcard(
  formData.id,
  {
    front: formData.front,
    back: formData.back,
    front_image_url: formData.front_image_url,
    front_language: formData.front_language,
    back_language: formData.back_language
  }
)
```

- [ ] **Step 4: Verify the app compiles**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | head -30`
Expected: Build succeeds

- [ ] **Step 5: Manually test in browser**

1. Open flashcard form → verify two language dropdowns appear
2. Select EN for front, PL for back → type a word in front → blur → verify suggestion appears below back field
3. Click suggestion → verify back field is filled
4. Save → verify card saves with language fields
5. Edit card → verify language dropdowns show saved values

- [ ] **Step 6: Commit**

```bash
git add angular-without-ssr/src/app/components/flashcards/flashcard-form/ angular-without-ssr/src/app/components/flashcards/flashcard-list.component.ts
git commit -m "feat: add language dropdowns and auto-translation to flashcard form"
```

---

## Chunk 4: Study Mode — Direction Toggle

### Task 5: Add direction toggle to study view

**Files:**
- Modify: `angular-without-ssr/src/app/components/study/study-view.component.ts`
- Modify: `angular-without-ssr/src/app/components/study/study-view.component.html`
- Modify: `angular-without-ssr/src/app/components/study/study-view.component.scss`
- Modify: `angular-without-ssr/src/app/components/study/flashcard-flip/flashcard-flip.component.scss`

- [ ] **Step 1: Add reversed signal to study-view component**

In `study-view.component.ts`, add a new signal:
```typescript
public isReversedSignal: WritableSignal<boolean> = signal<boolean>(false);
```

Add a toggle method:
```typescript
public toggleDirection(): void {
  this.isReversedSignal.update((v: boolean) => !v);
}
```

Add computed signals for the displayed front/back based on direction. When reversed and back contains semicolons, show only the first meaning as the question:
```typescript
public displayFrontSignal: Signal<string> = computed(() => {
  const card = this.currentCardSignal();
  if (!card) return '';
  if (this.isReversedSignal()) {
    // Show first meaning only when reversed
    const back = card.flashcard.back;
    const firstMeaning = back.split(';')[0].trim();
    return firstMeaning;
  }
  return card.flashcard.front;
});

public displayBackSignal: Signal<string> = computed(() => {
  const card = this.currentCardSignal();
  if (!card) return '';
  if (this.isReversedSignal()) {
    return card.flashcard.front;
  }
  // Format semicolons as bullet list for display
  const back = card.flashcard.back;
  if (back.includes(';')) {
    return back.split(';').map(m => m.trim()).filter(m => m).join('\n• ');
  }
  return back;
});

public displayFrontImageSignal: Signal<string | null> = computed(() => {
  const card = this.currentCardSignal();
  if (!card) return null;
  return this.isReversedSignal() ? null : card.flashcard.front_image_url;
});
```

- [ ] **Step 2: Update flashcard-flip to render newlines**

In `angular-without-ssr/src/app/components/study/flashcard-flip/flashcard-flip.component.scss`, add `white-space: pre-line` to the `.flip-card__content` class so that `\n• ` separators render as bullet lists.

```scss
.flip-card__content {
  white-space: pre-line;
}
```

- [ ] **Step 3: Update the template to use computed signals**

In `study-view.component.html`, change the `<app-flashcard-flip>` bindings inside the `@if (currentCardSignal(); as card)` block (around line 132):

From:
```html
<app-flashcard-flip
  [front]="card.flashcard.front"
  [back]="card.flashcard.back"
  [frontImageUrl]="card.flashcard.front_image_url"
  [isFlipped]="isFlippedSignal()"
  [skipTransition]="skipTransitionSignal()"
  (flipToggle)="flip()">
</app-flashcard-flip>
```

To:
```html
<app-flashcard-flip
  [front]="displayFrontSignal()"
  [back]="displayBackSignal()"
  [frontImageUrl]="displayFrontImageSignal()"
  [isFlipped]="isFlippedSignal()"
  [skipTransition]="skipTransitionSignal()"
  (flipToggle)="flip()">
</app-flashcard-flip>
```

- [ ] **Step 4: Add the toggle button to the UI**

In `study-view.component.html`, add a toggle button in the header area (after the `<h1>` and hint, around line 121), inside `<div class="study__header">`:

```html
<div class="study__header">
  <h1 class="study__title">Nauka</h1>
  <div class="study__direction-toggle">
    <button
      class="study__ctrl study__ctrl--direction"
      [class.study__ctrl--active]="isReversedSignal()"
      (click)="toggleDirection()"
      [attr.aria-label]="isReversedSignal() ? 'Tryb normalny' : 'Odwróć kierunek'">
      <i class="pi pi-arrow-right-arrow-left"></i>
    </button>
    <span class="study__direction-label">
      {{ isReversedSignal() ? 'Odwrócony' : 'Normalny' }}
    </span>
  </div>
  <p class="study__hint">
    @if (!isFlippedSignal()) {
      Kliknij kartę lub naciśnij spację
    } @else {
      Oceń swoją odpowiedź
    }
  </p>
</div>
```

- [ ] **Step 5: Add minimal styling**

In `study-view.component.scss`, add:

```scss
.study__direction-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.study__direction-label {
  font-size: 0.8rem;
  color: #666;
}

.study__ctrl--direction {
  width: 2rem;
  height: 2rem;
  font-size: 0.85rem;
}
```

- [ ] **Step 6: Verify the app compiles**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | head -30`
Expected: Build succeeds

- [ ] **Step 7: Manually test in browser**

1. Open study mode → verify toggle button appears in header
2. Click toggle → label changes to "Odwrócony"
3. Card now shows back text as question, front text as answer
4. When reversed and back has semicolons (e.g. "dom; budynek") → only "dom" shown as question
5. In normal mode, semicolons render as bullet list on the answer side
6. Click toggle again → returns to normal
7. Rating buttons still work in both directions

- [ ] **Step 8: Commit**

```bash
git add angular-without-ssr/src/app/components/study/study-view.component.ts angular-without-ssr/src/app/components/study/study-view.component.html angular-without-ssr/src/app/components/study/study-view.component.scss angular-without-ssr/src/app/components/study/flashcard-flip/flashcard-flip.component.scss
git commit -m "feat: add direction toggle and meanings display to study mode"
```

---

## Summary

| Task | Description | Files |
|------|-------------|-------|
| 1 | Supabase migration for language columns | 1 new SQL file |
| 2 | Update TypeScript types and API service | types.ts, flashcard-api.service.ts, flashcard-form.component.ts |
| 3 | Add translateText to OpenRouterService | openrouter.service.ts |
| 4 | Language dropdowns + translation suggestion in form | flashcard-form component (TS + HTML), flashcard-list.component.ts |
| 5 | Study mode direction toggle | study-view component (TS + HTML + SCSS) |
