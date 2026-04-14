import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { SetCardComponent } from './set-card.component';
import { FlashcardSetDTO } from '../../../types';

describe('SetCardComponent', () => {
  let component: SetCardComponent;
  let fixture: ComponentFixture<SetCardComponent>;

  const mockSet: FlashcardSetDTO = {
    id: 1, user_id: 'u1', name: 'Test Set', description: 'A desc', tags: ['tag1'],
    is_public: false, copy_count: 0, published_at: null,
    original_author_id: 'u1', source_set_id: null,
    created_at: '2026-01-15T10:00:00Z', updated_at: '2026-01-15T10:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SetCardComponent,
        TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' } }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(SetCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('set', mockSet);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display set name', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('h2')?.textContent).toContain('Test Set');
  });

  it('should display description', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('p')?.textContent).toContain('A desc');
  });

  it('should display tags', () => {
    const el: HTMLElement = fixture.nativeElement;
    const tags: NodeListOf<Element> = el.querySelectorAll('.set-card__tag');
    expect(tags.length).toBe(1);
    expect(tags[0].textContent).toContain('tag1');
  });

  it('should emit navigate on card click', () => {
    spyOn(component.navigate, 'emit');
    const card: HTMLElement = fixture.nativeElement.querySelector('.set-card');
    card.click();
    expect(component.navigate.emit).toHaveBeenCalled();
  });

  it('should emit edit on edit button click', () => {
    spyOn(component.edit, 'emit');
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const editBtn: HTMLButtonElement | undefined = Array.from(buttons).find((b: HTMLButtonElement) => b.querySelector('.pi-pencil'));
    editBtn?.click();
    expect(component.edit.emit).toHaveBeenCalled();
  });

  it('should emit delete on delete button click', () => {
    spyOn(component.delete, 'emit');
    const buttons: NodeListOf<HTMLButtonElement> = fixture.nativeElement.querySelectorAll('button');
    const deleteBtn: HTMLButtonElement | undefined = Array.from(buttons).find((b: HTMLButtonElement) => b.querySelector('.pi-trash'));
    deleteBtn?.click();
    expect(component.delete.emit).toHaveBeenCalled();
  });

  it('should show publish button when not public', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.pi-globe')).toBeTruthy();
    expect(el.querySelector('.pi-lock')).toBeFalsy();
  });

  it('should show unpublish button when public', () => {
    fixture.componentRef.setInput('set', { ...mockSet, is_public: true });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.pi-lock')).toBeTruthy();
  });

  it('should format date correctly', () => {
    const result: string = component.formatDate('2026-01-15T10:00:00Z');
    expect(result).toBeTruthy();
  });
});
