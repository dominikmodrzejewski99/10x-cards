import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { QuestionTypeSelectorComponent, QuestionTypeOption } from './question-type-selector.component';

describe('QuestionTypeSelectorComponent', () => {
  let component: QuestionTypeSelectorComponent;
  let fixture: ComponentFixture<QuestionTypeSelectorComponent>;

  const mockOptions: QuestionTypeOption[] = [
    { label: 'multipleChoice', signal: signal(true) },
    { label: 'trueFalse', signal: signal(false) },
    { label: 'openEnded', signal: signal(true) },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        QuestionTypeSelectorComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' },
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(QuestionTypeSelectorComponent);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput('options', mockOptions);
    fixture.componentRef.setInput('translationPrefix', 'quiz.config');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept question type options', () => {
    fixture.detectChanges();
    const options = component.options();
    expect(options.length).toBe(3);
    expect(options[0].label).toBe('multipleChoice');
    expect(options[0].signal()).toBe(true);
  });

  it('should default showError to false', () => {
    fixture.detectChanges();
    expect(component.showError()).toBe(false);
  });

  it('should accept showError input', () => {
    fixture.componentRef.setInput('showError', true);
    fixture.detectChanges();
    expect(component.showError()).toBe(true);
  });

  it('should allow toggling option signals', () => {
    fixture.detectChanges();
    const option = component.options()[1];
    expect(option.signal()).toBe(false);

    option.signal.set(true);
    expect(option.signal()).toBe(true);
  });
});
