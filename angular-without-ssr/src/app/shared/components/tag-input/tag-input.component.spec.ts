import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component, signal, WritableSignal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { TagInputComponent } from './tag-input.component';

@Component({
  imports: [TagInputComponent],
  template: `<app-tag-input [(tags)]="tagsSignal" [suggestions]="suggestionsSignal()" [maxTags]="maxTagsSignal()" placeholder="Add tags..."></app-tag-input>`
})
class TestHostComponent {
  public tagsSignal: WritableSignal<string[]> = signal<string[]>([]);
  public suggestionsSignal: WritableSignal<string[]> = signal<string[]>([]);
  public maxTagsSignal: WritableSignal<number> = signal<number>(10);
}

describe('TagInputComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    const tagInput: TagInputComponent = fixture.debugElement.query(By.directive(TagInputComponent)).componentInstance;
    expect(tagInput).toBeTruthy();
  });

  it('should render existing tags as chips', () => {
    host.tagsSignal.set(['angular', 'typescript']);
    fixture.detectChanges();

    const chips: HTMLElement[] = fixture.nativeElement.querySelectorAll('.tag-input__chip');
    expect(chips.length).toBe(2);
    expect(chips[0].textContent).toContain('angular');
    expect(chips[1].textContent).toContain('typescript');
  });

  it('should add a tag on Enter', () => {
    const tagInput: TagInputComponent = fixture.debugElement.query(By.directive(TagInputComponent)).componentInstance;

    tagInput.onInputChange('javascript');
    tagInput.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));
    fixture.detectChanges();

    expect(host.tagsSignal()).toEqual(['javascript']);
  });

  it('should add a tag on comma', () => {
    const tagInput: TagInputComponent = fixture.debugElement.query(By.directive(TagInputComponent)).componentInstance;

    tagInput.onInputChange('react');
    tagInput.onKeydown(new KeyboardEvent('keydown', { key: ',' }));
    fixture.detectChanges();

    expect(host.tagsSignal()).toEqual(['react']);
  });

  it('should normalize tags to lowercase', () => {
    const tagInput: TagInputComponent = fixture.debugElement.query(By.directive(TagInputComponent)).componentInstance;

    tagInput.onInputChange('Angular');
    tagInput.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(host.tagsSignal()).toEqual(['angular']);
  });

  it('should prevent duplicate tags', () => {
    host.tagsSignal.set(['angular']);
    fixture.detectChanges();

    const tagInput: TagInputComponent = fixture.debugElement.query(By.directive(TagInputComponent)).componentInstance;
    tagInput.onInputChange('angular');
    tagInput.onKeydown(new KeyboardEvent('keydown', { key: 'Enter' }));

    expect(host.tagsSignal().length).toBe(1);
  });

  it('should respect maxTags limit', () => {
    host.maxTagsSignal.set(2);
    host.tagsSignal.set(['a', 'b']);
    fixture.detectChanges();

    const tagInput: TagInputComponent = fixture.debugElement.query(By.directive(TagInputComponent)).componentInstance;
    tagInput.addTag('c');

    expect(host.tagsSignal().length).toBe(2);
  });

  it('should remove tag by index', () => {
    host.tagsSignal.set(['angular', 'react', 'vue']);
    fixture.detectChanges();

    const tagInput: TagInputComponent = fixture.debugElement.query(By.directive(TagInputComponent)).componentInstance;
    tagInput.removeTag(1);

    expect(host.tagsSignal()).toEqual(['angular', 'vue']);
  });

  it('should remove last tag on Backspace when input is empty', () => {
    host.tagsSignal.set(['angular', 'react']);
    fixture.detectChanges();

    const tagInput: TagInputComponent = fixture.debugElement.query(By.directive(TagInputComponent)).componentInstance;
    tagInput.onInputChange('');
    tagInput.onKeydown(new KeyboardEvent('keydown', { key: 'Backspace' }));

    expect(host.tagsSignal()).toEqual(['angular']);
  });

  it('should truncate tags to 30 characters', () => {
    const tagInput: TagInputComponent = fixture.debugElement.query(By.directive(TagInputComponent)).componentInstance;
    const longTag: string = 'a'.repeat(50);
    tagInput.addTag(longTag);

    expect(host.tagsSignal()[0].length).toBe(30);
  });

  it('should not add empty tags', () => {
    const tagInput: TagInputComponent = fixture.debugElement.query(By.directive(TagInputComponent)).componentInstance;
    tagInput.addTag('   ');

    expect(host.tagsSignal().length).toBe(0);
  });

  it('should filter suggestions based on input', () => {
    host.suggestionsSignal.set(['angular', 'react', 'vue', 'angularjs']);
    fixture.detectChanges();

    const tagInput: TagInputComponent = fixture.debugElement.query(By.directive(TagInputComponent)).componentInstance;
    tagInput.onInputChange('ang');
    fixture.detectChanges();

    expect(tagInput.filteredSuggestionsSignal().length).toBe(2);
    expect(tagInput.filteredSuggestionsSignal()).toContain('angular');
    expect(tagInput.filteredSuggestionsSignal()).toContain('angularjs');
  });

  it('should not show already selected tags in suggestions', () => {
    host.tagsSignal.set(['angular']);
    host.suggestionsSignal.set(['angular', 'angularjs']);
    fixture.detectChanges();

    const tagInput: TagInputComponent = fixture.debugElement.query(By.directive(TagInputComponent)).componentInstance;
    tagInput.onInputChange('ang');
    fixture.detectChanges();

    expect(tagInput.filteredSuggestionsSignal()).toEqual(['angularjs']);
  });

  it('should add tag when selecting a suggestion', () => {
    const tagInput: TagInputComponent = fixture.debugElement.query(By.directive(TagInputComponent)).componentInstance;
    tagInput.selectSuggestion('react');

    expect(host.tagsSignal()).toEqual(['react']);
    expect(tagInput.inputValueSignal()).toBe('');
  });
});
