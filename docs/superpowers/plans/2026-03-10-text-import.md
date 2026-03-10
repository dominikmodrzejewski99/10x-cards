# Text Import (Key-Value) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a text-based flashcard import modal to the flashcard list view, allowing users to paste tab/comma-separated key-value pairs, preview and edit them, then bulk save.

**Architecture:** New `ImportModalComponent` (standalone, OnPush, Signals) opened from `FlashcardListComponent`. A pure `TextParserService` handles parsing logic. Reuses existing `FlashcardApiService.createFlashcards()` for bulk save.

**Tech Stack:** Angular 19, Signals, PrimeNG Dialog, existing Supabase flashcard API

---

## File Structure

| Action | Path | Responsibility |
|--------|------|----------------|
| Create | `angular-without-ssr/src/app/services/text-parser.service.ts` | Pure parsing: text → proposals + errors |
| Create | `angular-without-ssr/src/app/services/text-parser.service.spec.ts` | Unit tests for parser |
| Create | `angular-without-ssr/src/app/components/flashcards/import-modal/import-modal.component.ts` | Import modal with textarea, preview list, save |
| Create | `angular-without-ssr/src/app/components/flashcards/import-modal/import-modal.component.html` | Template |
| Create | `angular-without-ssr/src/app/components/flashcards/import-modal/import-modal.component.css` | Styles (BEM, matching existing design) |
| Modify | `angular-without-ssr/src/app/components/flashcards/flashcard-list.component.ts` | Add import modal state + handler |
| Modify | `angular-without-ssr/src/app/components/flashcards/flashcard-list.component.html` | Add import button + modal tag |

---

## Chunk 1: TextParserService

### Task 1: TextParserService — types and tests

**Files:**
- Create: `angular-without-ssr/src/app/services/text-parser.service.ts`
- Create: `angular-without-ssr/src/app/services/text-parser.service.spec.ts`

- [ ] **Step 1: Create TextParserService with types and empty method**

```typescript
// text-parser.service.ts
import { Injectable } from '@angular/core';
import { FlashcardProposalDTO } from '../../types';

export interface ParseError {
  line: number;
  content: string;
  reason: string;
}

export interface ParseResult {
  proposals: FlashcardProposalDTO[];
  errors: ParseError[];
}

@Injectable({
  providedIn: 'root'
})
export class TextParserService {
  parseKeyValue(text: string): ParseResult {
    return { proposals: [], errors: [] };
  }
}
```

- [ ] **Step 2: Write failing tests**

```typescript
// text-parser.service.spec.ts
import { TextParserService, ParseResult } from './text-parser.service';

describe('TextParserService', () => {
  let service: TextParserService;

  beforeEach(() => {
    service = new TextParserService();
  });

  it('should parse tab-separated lines', () => {
    const input = 'front1\tback1\nfront2\tback2';
    const result = service.parseKeyValue(input);
    expect(result.proposals.length).toBe(2);
    expect(result.proposals[0]).toEqual({ front: 'front1', back: 'back1', source: 'manual' });
    expect(result.proposals[1]).toEqual({ front: 'front2', back: 'back2', source: 'manual' });
    expect(result.errors.length).toBe(0);
  });

  it('should parse comma-separated lines when no tab present', () => {
    const input = 'front1,back1\nfront2,back2';
    const result = service.parseKeyValue(input);
    expect(result.proposals.length).toBe(2);
    expect(result.proposals[0]).toEqual({ front: 'front1', back: 'back1', source: 'manual' });
  });

  it('should split on first comma only (back can contain commas)', () => {
    const input = 'word,definition with, extra commas';
    const result = service.parseKeyValue(input);
    expect(result.proposals.length).toBe(1);
    expect(result.proposals[0].front).toBe('word');
    expect(result.proposals[0].back).toBe('definition with, extra commas');
  });

  it('should prefer tab over comma', () => {
    const input = 'front,part\tback,part';
    const result = service.parseKeyValue(input);
    expect(result.proposals[0].front).toBe('front,part');
    expect(result.proposals[0].back).toBe('back,part');
  });

  it('should skip empty lines', () => {
    const input = 'front1\tback1\n\n\nfront2\tback2\n';
    const result = service.parseKeyValue(input);
    expect(result.proposals.length).toBe(2);
    expect(result.errors.length).toBe(0);
  });

  it('should report lines without separator as errors', () => {
    const input = 'front1\tback1\nno separator here\nfront2\tback2';
    const result = service.parseKeyValue(input);
    expect(result.proposals.length).toBe(2);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0].line).toBe(2);
    expect(result.errors[0].content).toBe('no separator here');
  });

  it('should trim whitespace from front and back', () => {
    const input = '  front1  \t  back1  ';
    const result = service.parseKeyValue(input);
    expect(result.proposals[0].front).toBe('front1');
    expect(result.proposals[0].back).toBe('back1');
  });

  it('should report error for lines where front or back is empty after trim', () => {
    const input = '\tback1\nfront1\t';
    const result = service.parseKeyValue(input);
    expect(result.proposals.length).toBe(0);
    expect(result.errors.length).toBe(2);
  });

  it('should return empty result for empty string', () => {
    const result = service.parseKeyValue('');
    expect(result.proposals.length).toBe(0);
    expect(result.errors.length).toBe(0);
  });

  it('should handle \\r\\n line endings', () => {
    const input = 'front1\tback1\r\nfront2\tback2';
    const result = service.parseKeyValue(input);
    expect(result.proposals.length).toBe(2);
  });

  it('should report error for whitespace-only values with tab separator', () => {
    const input = '   \t   ';
    const result = service.parseKeyValue(input);
    expect(result.proposals.length).toBe(0);
    expect(result.errors.length).toBe(1);
  });

  it('should split on first tab when line has multiple tabs', () => {
    const input = 'front\tmiddle\tback';
    const result = service.parseKeyValue(input);
    expect(result.proposals[0].front).toBe('front');
    expect(result.proposals[0].back).toBe('middle\tback');
  });

  it('should handle single line without trailing newline', () => {
    const input = 'front\tback';
    const result = service.parseKeyValue(input);
    expect(result.proposals.length).toBe(1);
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `cd angular-without-ssr && npx ng test --include="**/text-parser.service.spec.ts" --watch=false`
Expected: Most tests FAIL (parseKeyValue returns empty)

- [ ] **Step 4: Implement parseKeyValue**

```typescript
parseKeyValue(text: string): ParseResult {
  const proposals: FlashcardProposalDTO[] = [];
  const errors: ParseError[] = [];

  const lines = text.split(/\r?\n/);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim() === '') continue;

    let front: string;
    let back: string;

    if (line.includes('\t')) {
      const tabIndex = line.indexOf('\t');
      front = line.substring(0, tabIndex).trim();
      back = line.substring(tabIndex + 1).trim();
    } else if (line.includes(',')) {
      const commaIndex = line.indexOf(',');
      front = line.substring(0, commaIndex).trim();
      back = line.substring(commaIndex + 1).trim();
    } else {
      errors.push({ line: i + 1, content: line, reason: 'Brak separatora (TAB lub przecinek)' });
      continue;
    }

    if (!front || !back) {
      errors.push({ line: i + 1, content: line, reason: 'Pusta wartość przodu lub tyłu fiszki' });
      continue;
    }

    proposals.push({ front, back, source: 'manual' });
  }

  return { proposals, errors };
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `cd angular-without-ssr && npx ng test --include="**/text-parser.service.spec.ts" --watch=false`
Expected: All tests PASS

- [ ] **Step 6: Commit**

```bash
git add angular-without-ssr/src/app/services/text-parser.service.ts angular-without-ssr/src/app/services/text-parser.service.spec.ts
git commit -m "feat: add TextParserService for key-value flashcard import"
```

---

## Chunk 2: ImportModalComponent

### Task 2: Create ImportModalComponent

**Files:**
- Create: `angular-without-ssr/src/app/components/flashcards/import-modal/import-modal.component.ts`
- Create: `angular-without-ssr/src/app/components/flashcards/import-modal/import-modal.component.html`
- Create: `angular-without-ssr/src/app/components/flashcards/import-modal/import-modal.component.css`

- [ ] **Step 1: Create component TypeScript**

```typescript
// import-modal.component.ts
import { Component, ChangeDetectionStrategy, input, output, signal, computed, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { FlashcardProposalDTO } from '../../../../types';
import { TextParserService, ParseError } from '../../../services/text-parser.service';

interface ImportProposal extends FlashcardProposalDTO {
  _id: string;
  accepted: boolean;
}

@Component({
  selector: 'app-import-modal',
  standalone: true,
  imports: [FormsModule, DialogModule],
  templateUrl: './import-modal.component.html',
  styleUrls: ['./import-modal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ImportModalComponent {
  private textParser = inject(TextParserService);

  isVisible = input.required<boolean>();
  setId = input.required<number>();
  isSaving = input(false);

  close = output<void>();
  saved = output<FlashcardProposalDTO[]>();

  rawText = signal('');
  proposals = signal<ImportProposal[]>([]);
  parseErrors = signal<ParseError[]>([]);
  isParsed = signal(false);
  editingId = signal<string | null>(null);

  acceptedCount = computed(() => this.proposals().filter(p => p.accepted).length);
  totalCount = computed(() => this.proposals().length);
  canSave = computed(() => this.acceptedCount() > 0 && !this.isSaving());
  hasContent = computed(() => this.rawText().trim().length > 0);

  onParse(): void {
    const result = this.textParser.parseKeyValue(this.rawText());
    this.proposals.set(
      result.proposals.map((p, i) => ({
        ...p,
        _id: `${Date.now()}-${i}`,
        accepted: true
      }))
    );
    this.parseErrors.set(result.errors);
    this.isParsed.set(true);
  }

  toggleAccept(id: string): void {
    this.proposals.update(list =>
      list.map(p => p._id === id ? { ...p, accepted: !p.accepted } : p)
    );
  }

  removeProposal(id: string): void {
    this.proposals.update(list => list.filter(p => p._id !== id));
  }

  startEdit(id: string): void {
    this.editingId.set(id);
  }

  saveEdit(id: string, front: string, back: string): void {
    this.proposals.update(list =>
      list.map(p => p._id === id ? { ...p, front: front.trim(), back: back.trim() } : p)
    );
    this.editingId.set(null);
  }

  cancelEdit(): void {
    this.editingId.set(null);
  }

  onSave(): void {
    const accepted = this.proposals()
      .filter(p => p.accepted)
      .map(({ front, back, source }) => ({ front, back, source }));
    this.saved.emit(accepted);
  }

  onClose(): void {
    this.rawText.set('');
    this.proposals.set([]);
    this.parseErrors.set([]);
    this.isParsed.set(false);
    this.editingId.set(null);
    this.close.emit();
  }

  resetToInput(): void {
    this.proposals.set([]);
    this.parseErrors.set([]);
    this.isParsed.set(false);
  }
}
```

- [ ] **Step 2: Create template**

```html
<!-- import-modal.component.html -->
<p-dialog
  header="Importuj fiszki"
  [visible]="isVisible()"
  (visibleChange)="onClose()"
  [modal]="true"
  [closeOnEscape]="true"
  [dismissableMask]="true"
  [draggable]="false"
  [resizable]="false"
  [style]="{width: '95vw', maxWidth: '700px'}"
  styleClass="modern-dialog"
  (onHide)="onClose()">

  @if (!isParsed()) {
    <!-- Input phase -->
    <div class="import__input">
      <p class="import__hint">
        Wklej tekst z fiszkami. Jedna fiszka na linię.<br>
        Separator: <strong>TAB</strong> lub <strong>przecinek</strong>
      </p>
      <textarea
        class="import__textarea"
        [ngModel]="rawText()"
        (ngModelChange)="rawText.set($event)"
        placeholder="przód\ttył&#10;apple,jabłko&#10;dog,pies"
        rows="10">
      </textarea>
      <div class="import__actions">
        <button
          class="import__btn import__btn--primary"
          [disabled]="!hasContent()"
          (click)="onParse()">
          <i class="pi pi-list"></i> Parsuj
        </button>
      </div>
    </div>
  } @else {
    <!-- Preview phase -->
    <div class="import__preview">
      <div class="import__stats">
        <span class="import__stat import__stat--total">
          {{ totalCount() }} fiszek
        </span>
        <span class="import__stat import__stat--accepted">
          <i class="pi pi-check"></i> {{ acceptedCount() }} zaakceptowanych
        </span>
        <button class="import__btn-link" (click)="resetToInput()">
          <i class="pi pi-arrow-left"></i> Wróć do edycji tekstu
        </button>
      </div>

      @if (parseErrors().length > 0) {
        <div class="import__errors">
          <p class="import__errors-title">
            <i class="pi pi-exclamation-triangle"></i>
            Pominięte linie ({{ parseErrors().length }}):
          </p>
          @for (err of parseErrors(); track err.line) {
            <div class="import__error-item">
              Linia {{ err.line }}: <span class="import__error-content">{{ err.content }}</span>
              — {{ err.reason }}
            </div>
          }
        </div>
      }

      <div class="import__list">
        @for (proposal of proposals(); track proposal._id) {
          <div class="import__card" [class.import__card--rejected]="!proposal.accepted">
            @if (editingId() === proposal._id) {
              <!-- Edit mode -->
              <div class="import__edit">
                <input
                  class="import__edit-input"
                  #frontInput
                  [value]="proposal.front"
                  placeholder="Przód" />
                <input
                  class="import__edit-input"
                  #backInput
                  [value]="proposal.back"
                  placeholder="Tył" />
                <div class="import__edit-actions">
                  <button class="import__btn import__btn--small import__btn--primary"
                    (click)="saveEdit(proposal._id, frontInput.value, backInput.value)">
                    <i class="pi pi-check"></i>
                  </button>
                  <button class="import__btn import__btn--small import__btn--ghost"
                    (click)="cancelEdit()">
                    <i class="pi pi-times"></i>
                  </button>
                </div>
              </div>
            } @else {
              <!-- View mode -->
              <div class="import__card-content">
                <div class="import__card-front">{{ proposal.front }}</div>
                <div class="import__card-sep">→</div>
                <div class="import__card-back">{{ proposal.back }}</div>
              </div>
              <div class="import__card-actions">
                <button class="import__icon-btn" title="Edytuj" (click)="startEdit(proposal._id)">
                  <i class="pi pi-pencil"></i>
                </button>
                <button class="import__icon-btn" title="Akceptuj/Odrzuć" (click)="toggleAccept(proposal._id)">
                  <i [class]="proposal.accepted ? 'pi pi-check-circle' : 'pi pi-circle'"></i>
                </button>
                <button class="import__icon-btn import__icon-btn--danger" title="Usuń" (click)="removeProposal(proposal._id)">
                  <i class="pi pi-trash"></i>
                </button>
              </div>
            }
          </div>
        }
      </div>

      <div class="import__footer">
        <button
          class="import__btn import__btn--primary"
          [disabled]="!canSave()"
          (click)="onSave()">
          @if (isSaving()) {
            <i class="pi pi-spin pi-spinner"></i> Zapisywanie...
          } @else {
            <i class="pi pi-save"></i> Zapisz ({{ acceptedCount() }})
          }
        </button>
      </div>
    </div>
  }
</p-dialog>
```

- [ ] **Step 3: Create styles**

```css
/* import-modal.component.css */
.import__hint {
  color: #586380;
  font-size: 0.9rem;
  margin: 0 0 0.75rem;
  line-height: 1.5;
}

.import__textarea {
  width: 100%;
  min-height: 200px;
  padding: 0.75rem;
  border: 1.5px solid #d9dbe9;
  border-radius: 0.5rem;
  font-family: 'Courier New', monospace;
  font-size: 0.85rem;
  resize: vertical;
  outline: none;
  transition: border-color 0.15s;
  box-sizing: border-box;
}
.import__textarea:focus {
  border-color: #4255ff;
}

.import__actions,
.import__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
}

.import__btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.55rem 1rem;
  border-radius: 0.5rem;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
  border: none;
  font-family: inherit;
  transition: all 0.15s;
}

.import__btn--primary {
  background: #4255ff;
  color: #fff;
}
.import__btn--primary:hover:not(:disabled) { background: #3b4ce3; }
.import__btn--primary:disabled { opacity: 0.5; cursor: not-allowed; }

.import__btn--small {
  padding: 0.35rem 0.6rem;
  font-size: 0.8rem;
}

.import__btn--ghost {
  background: transparent;
  color: #586380;
  border: 1.5px solid #d9dbe9;
}
.import__btn--ghost:hover { background: #f6f7fb; }

.import__btn-link {
  background: none;
  border: none;
  color: #4255ff;
  font-size: 0.8rem;
  cursor: pointer;
  font-family: inherit;
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}
.import__btn-link:hover { text-decoration: underline; }

.import__stats {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.import__stat {
  font-size: 0.85rem;
  font-weight: 600;
}
.import__stat--total { color: #586380; }
.import__stat--accepted { color: #23b26d; }

.import__errors {
  background: #fff8f0;
  border: 1px solid #ffcca7;
  border-radius: 0.5rem;
  padding: 0.6rem 0.75rem;
  margin-bottom: 0.75rem;
}
.import__errors-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: #c9590a;
  margin: 0 0 0.35rem;
}
.import__error-item {
  font-size: 0.75rem;
  color: #7a5230;
  margin-bottom: 0.2rem;
}
.import__error-content {
  font-family: 'Courier New', monospace;
  background: #ffeedd;
  padding: 0.1rem 0.3rem;
  border-radius: 0.2rem;
}

.import__list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  max-height: 400px;
  overflow-y: auto;
}

.import__card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.5rem 0.65rem;
  border: 1.5px solid #d9dbe9;
  border-radius: 0.5rem;
  background: #fff;
  transition: all 0.15s;
}
.import__card--rejected {
  opacity: 0.45;
  background: #f6f7fb;
}

.import__card-content {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex: 1;
  min-width: 0;
  font-size: 0.85rem;
}
.import__card-front {
  font-weight: 600;
  color: #282e3e;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.import__card-sep {
  color: #b0b5c9;
  flex-shrink: 0;
}
.import__card-back {
  color: #586380;
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.import__card-actions {
  display: flex;
  gap: 0.25rem;
  flex-shrink: 0;
}

.import__icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.35rem;
  border: none;
  background: transparent;
  color: #586380;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.15s;
}
.import__icon-btn:hover { background: #f6f7fb; color: #4255ff; }
.import__icon-btn--danger:hover { color: #e53e3e; }

.import__edit {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  flex: 1;
}
.import__edit-input {
  flex: 1;
  padding: 0.4rem 0.6rem;
  border: 1.5px solid #d9dbe9;
  border-radius: 0.35rem;
  font-size: 0.85rem;
  font-family: inherit;
  outline: none;
}
.import__edit-input:focus { border-color: #4255ff; }
.import__edit-actions {
  display: flex;
  gap: 0.2rem;
}

@media (max-width: 640px) {
  .import__card-content { flex-direction: column; align-items: flex-start; }
  .import__card-sep { display: none; }
  .import__edit { flex-direction: column; }
}
```

- [ ] **Step 4: Verify component compiles**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | head -20`
Expected: Build succeeds (component not yet used anywhere, but should compile)

- [ ] **Step 5: Commit**

```bash
git add angular-without-ssr/src/app/components/flashcards/import-modal/
git commit -m "feat: add ImportModalComponent for text-based flashcard import"
```

---

## Chunk 3: Integrate into FlashcardListComponent

### Task 3: Wire up import modal in flashcard-list

**Files:**
- Modify: `angular-without-ssr/src/app/components/flashcards/flashcard-list.component.ts`
- Modify: `angular-without-ssr/src/app/components/flashcards/flashcard-list.component.html`
- Modify: `angular-without-ssr/src/app/components/flashcards/flashcard-list.component.css`

- [ ] **Step 1: Add import modal state and handler to component TS**

In `flashcard-list.component.ts`:

1. Add import at top:
```typescript
import { ImportModalComponent } from './import-modal/import-modal.component';
```
And add `FlashcardProposalDTO` to the existing types import:
```typescript
import { FlashcardDTO, FlashcardProposalDTO } from '../../../types';
```

2. Add `ImportModalComponent` to `imports` array.

3. Add `isImportModalVisible: boolean` to `FlashcardListState` interface, default `false`.

4. Add methods:
```typescript
openImportModal(): void {
  this.state.update(s => ({ ...s, isImportModalVisible: true }));
}

onCloseImportModal(): void {
  this.state.update(s => ({ ...s, isImportModalVisible: false }));
}

onImportSaved(proposals: FlashcardProposalDTO[]): void {
  this.state.update(s => ({ ...s, loading: true }));

  this.flashcardApiService.createFlashcards(proposals, this.state().setId).subscribe({
    next: (savedFlashcards) => {
      this.state.update(s => ({ ...s, isImportModalVisible: false, loading: false }));
      this.messageService.add({
        severity: 'success',
        summary: 'Sukces',
        detail: `Zaimportowano ${savedFlashcards.length} fiszek.`
      });
      this.loadFlashcards();
    },
    error: (error) => this.handleApiError(error, 'importowania')
  });
}
```

- [ ] **Step 2: Add import button and modal to template**

In `flashcard-list.component.html`, add the import button after the "Dodaj fiszkę" button:
```html
<button (click)="openImportModal()" class="flist__btn flist__btn--import" data-test-id="import-flashcards-button">
  <i class="pi pi-upload"></i> Importuj
</button>
```

Add the import modal before `</div>` (end of root `.flist`), after the confirm dialog:
```html
<app-import-modal
  [isVisible]="state().isImportModalVisible"
  [setId]="state().setId"
  [isSaving]="state().loading"
  (close)="onCloseImportModal()"
  (saved)="onImportSaved($event)"
  data-test-id="import-modal">
</app-import-modal>
```

- [ ] **Step 3: Add import button style**

In `flashcard-list.component.css`, add:
```css
.flist__btn--import {
  background: #7c3aed;
  color: #fff;
}
.flist__btn--import:hover { background: #6d28d9; }
```

- [ ] **Step 4: Verify full build**

Run: `cd angular-without-ssr && npx ng build --configuration=development 2>&1 | tail -5`
Expected: Build succeeds

- [ ] **Step 5: Manual smoke test**

Run: `cd angular-without-ssr && npx ng serve`
Navigate to a set's flashcard list, verify:
1. "Importuj" button visible next to "Dodaj fiszkę"
2. Click opens modal with textarea
3. Paste `apple\tjabłko\ndog\tpies` → click "Parsuj" → see 2 proposals
4. Toggle accept, edit, remove work
5. Click "Zapisz" → flashcards created → list refreshes

- [ ] **Step 6: Commit**

```bash
git add angular-without-ssr/src/app/components/flashcards/flashcard-list.component.ts angular-without-ssr/src/app/components/flashcards/flashcard-list.component.html angular-without-ssr/src/app/components/flashcards/flashcard-list.component.css
git commit -m "feat: integrate import modal into flashcard list view"
```
