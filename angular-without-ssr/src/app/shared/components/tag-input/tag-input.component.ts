import { Component, ChangeDetectionStrategy, input, model, signal, computed, InputSignal, ModelSignal, WritableSignal, Signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-tag-input',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule],
  templateUrl: './tag-input.component.html',
  styleUrl: './tag-input.component.scss'
})
export class TagInputComponent {
  public tagsSignal: ModelSignal<string[]> = model.required<string[]>({ alias: 'tags' });
  public suggestionsSignal: InputSignal<string[]> = input<string[]>([], { alias: 'suggestions' });
  public maxTagsSignal: InputSignal<number> = input<number>(10, { alias: 'maxTags' });
  public placeholderSignal: InputSignal<string> = input<string>('', { alias: 'placeholder' });

  public inputValueSignal: WritableSignal<string> = signal<string>('');
  public showSuggestionsSignal: WritableSignal<boolean> = signal<boolean>(false);

  public readonly isMaxReachedSignal: Signal<boolean> = computed<boolean>(() =>
    this.tagsSignal().length >= this.maxTagsSignal()
  );

  public readonly filteredSuggestionsSignal: Signal<string[]> = computed<string[]>(() => {
    const query: string = this.inputValueSignal().toLowerCase().trim();
    const currentTags: string[] = this.tagsSignal();
    if (!query) return [];
    return this.suggestionsSignal()
      .filter((s: string) => s.toLowerCase().includes(query) && !currentTags.includes(s))
      .slice(0, 8);
  });

  public onInputChange(value: string): void {
    this.inputValueSignal.set(value);
    this.showSuggestionsSignal.set(value.trim().length > 0);
  }

  public onKeydown(event: KeyboardEvent): void {
    const value: string = this.inputValueSignal().trim();

    if ((event.key === 'Enter' || event.key === ',') && value) {
      event.preventDefault();
      this.addTag(value);
      return;
    }

    if (event.key === 'Backspace' && !this.inputValueSignal()) {
      const tags: string[] = this.tagsSignal();
      if (tags.length > 0) {
        this.tagsSignal.set(tags.slice(0, -1));
      }
    }
  }

  public addTag(value: string): void {
    const normalized: string = value.toLowerCase().trim().slice(0, 30);
    if (!normalized) return;
    if (this.isMaxReachedSignal()) return;
    if (this.tagsSignal().includes(normalized)) return;

    this.tagsSignal.set([...this.tagsSignal(), normalized]);
    this.inputValueSignal.set('');
    this.showSuggestionsSignal.set(false);
  }

  public removeTag(index: number): void {
    const tags: string[] = [...this.tagsSignal()];
    tags.splice(index, 1);
    this.tagsSignal.set(tags);
  }

  public selectSuggestion(suggestion: string): void {
    this.addTag(suggestion);
  }

  public onBlur(): void {
    setTimeout(() => this.showSuggestionsSignal.set(false), 150);
  }
}
