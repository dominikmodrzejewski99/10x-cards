import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReactiveFormsModule } from '@angular/forms';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { FeedbackComponent } from './feedback.component';
import { FeedbackFacadeService } from '../../services/facades/feedback-facade.service';

describe('FeedbackComponent', () => {
  let component: FeedbackComponent;
  let fixture: ComponentFixture<FeedbackComponent>;

  const facadeMock: Record<string, jasmine.Spy> = {
    selectedTypeSignal: jasmine.createSpy('selectedTypeSignal').and.returnValue('bug'),
    submittingSignal: jasmine.createSpy('submittingSignal').and.returnValue(false),
    submittedSignal: jasmine.createSpy('submittedSignal').and.returnValue(false),
    selectType: jasmine.createSpy('selectType'),
    submit: jasmine.createSpy('submit'),
    sendAnother: jasmine.createSpy('sendAnother'),
  };

  beforeEach(() => {
    Object.values(facadeMock).forEach((spy: jasmine.Spy) => spy.calls.reset());

    // Reset return values that may have been mutated by previous tests
    facadeMock['selectedTypeSignal'].and.returnValue('bug');
    facadeMock['submittingSignal'].and.returnValue(false);
    facadeMock['submittedSignal'].and.returnValue(false);

    TestBed.configureTestingModule({
      imports: [
        FeedbackComponent,
        ReactiveFormsModule,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' },
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: FeedbackFacadeService, useValue: facadeMock },
      ],
    });

    fixture = TestBed.createComponent(FeedbackComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not submit when form is invalid', () => {
    component.submit();

    expect(facadeMock['submit']).not.toHaveBeenCalled();
  });

  it('should mark form as touched on invalid submit', () => {
    component.submit();

    expect(component.feedbackForm.get('title')?.touched).toBeTrue();
    expect(component.feedbackForm.get('description')?.touched).toBeTrue();
  });

  it('should call facade.submit when form is valid', () => {
    component.feedbackForm.setValue({
      title: 'Test bug title',
      description: 'This is a detailed description of the bug',
    });

    component.submit();

    expect(facadeMock['submit']).toHaveBeenCalledWith({
      type: 'bug',
      title: 'Test bug title',
      description: 'This is a detailed description of the bug',
    });
  });

  it('should reset form after successful submission', () => {
    component.feedbackForm.setValue({
      title: 'Test bug title',
      description: 'This is a detailed description of the bug',
    });

    component.submit();

    expect(component.feedbackForm.get('title')?.value).toBeNull();
    expect(component.feedbackForm.get('description')?.value).toBeNull();
  });

  it('should not submit while already submitting', () => {
    facadeMock['submittingSignal'].and.returnValue(true);

    component.feedbackForm.setValue({
      title: 'Test bug title',
      description: 'This is a detailed description of the bug',
    });

    component.submit();

    expect(facadeMock['submit']).not.toHaveBeenCalled();
  });

  it('should validate title minimum length', () => {
    component.feedbackForm.get('title')?.setValue('ab');
    component.feedbackForm.get('title')?.markAsTouched();

    expect(component.feedbackForm.get('title')?.hasError('minlength')).toBeTrue();
  });

  it('should validate description minimum length', () => {
    component.feedbackForm.get('description')?.setValue('short');
    component.feedbackForm.get('description')?.markAsTouched();

    expect(component.feedbackForm.get('description')?.hasError('minlength')).toBeTrue();
  });

  it('should render form inputs', () => {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('#feedback-title');
    const textarea: HTMLTextAreaElement = fixture.nativeElement.querySelector('#feedback-desc');

    expect(input).toBeTruthy();
    expect(textarea).toBeTruthy();
  });
});
