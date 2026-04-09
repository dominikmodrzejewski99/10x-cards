import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { SetFormDialogComponent, SetFormData } from './set-form-dialog.component';
import { FlashcardSetDTO } from '../../../types';

describe('SetFormDialogComponent', () => {
  let component: SetFormDialogComponent;
  let fixture: ComponentFixture<SetFormDialogComponent>;

  const mockSet: FlashcardSetDTO = {
    id: 1, user_id: 'u1', name: 'Existing Set', description: 'desc', tags: ['a', 'b'],
    is_public: false, copy_count: 0, published_at: null,
    created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z',
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        SetFormDialogComponent,
        TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' } }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(SetFormDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('editingSet', null);
    fixture.componentRef.setInput('saving', false);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should start with empty form in create mode', () => {
    expect(component.formNameSignal()).toBe('');
    expect(component.formDescriptionSignal()).toBe('');
    expect(component.formTagsSignal()).toEqual([]);
  });

  it('should populate form in edit mode', () => {
    fixture.componentRef.setInput('editingSet', mockSet);
    fixture.detectChanges();

    expect(component.formNameSignal()).toBe('Existing Set');
    expect(component.formDescriptionSignal()).toBe('desc');
    expect(component.formTagsSignal()).toEqual(['a', 'b']);
  });

  it('should emit save with form data', () => {
    spyOn(component.save, 'emit');
    component.formNameSignal.set('My Set');
    component.formDescriptionSignal.set('My desc');
    component.formTagsSignal.set(['tag1']);

    component.onSave();

    expect(component.save.emit).toHaveBeenCalledWith({
      name: 'My Set',
      description: 'My desc',
      tags: ['tag1'],
    } as SetFormData);
  });

  it('should not emit save when name is blank', () => {
    spyOn(component.save, 'emit');
    component.formNameSignal.set('   ');

    component.onSave();

    expect(component.save.emit).not.toHaveBeenCalled();
  });

  it('should emit null description when empty', () => {
    spyOn(component.save, 'emit');
    component.formNameSignal.set('Set');
    component.formDescriptionSignal.set('');

    component.onSave();

    expect(component.save.emit).toHaveBeenCalledWith(
      jasmine.objectContaining({ description: null })
    );
  });

  it('should emit close', () => {
    spyOn(component.close, 'emit');
    component.onClose();
    expect(component.close.emit).toHaveBeenCalled();
  });
});
