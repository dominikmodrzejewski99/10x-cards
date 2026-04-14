import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { QuestionCountPickerComponent } from './question-count-picker.component';

describe('QuestionCountPickerComponent', () => {
  let component: QuestionCountPickerComponent;
  let fixture: ComponentFixture<QuestionCountPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        QuestionCountPickerComponent,
        FormsModule,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' },
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionCountPickerComponent);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput('cardCount', 20);
    fixture.componentRef.setInput('selectedCount', 10);
    fixture.componentRef.setInput('translationPrefix', 'quiz.config');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept cardCount and selectedCount inputs', () => {
    fixture.detectChanges();
    expect(component.cardCount()).toBe(20);
    expect(component.selectedCount()).toBe(10);
  });

  it('should accept "all" as selectedCount', () => {
    fixture.componentRef.setInput('selectedCount', 'all');
    fixture.detectChanges();
    expect(component.selectedCount()).toBe('all');
  });

  it('should emit countChange when count changes', () => {
    spyOn(component.countChange, 'emit');
    fixture.detectChanges();

    component.countChange.emit(15);

    expect(component.countChange.emit).toHaveBeenCalledWith(15);
  });

  it('should emit toggleAll when all toggle is clicked', () => {
    spyOn(component.toggleAll, 'emit');
    fixture.detectChanges();

    component.toggleAll.emit();

    expect(component.toggleAll.emit).toHaveBeenCalled();
  });
});
