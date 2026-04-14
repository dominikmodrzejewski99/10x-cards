import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { DirectionPickerComponent } from './direction-picker.component';

describe('DirectionPickerComponent', () => {
  let component: DirectionPickerComponent;
  let fixture: ComponentFixture<DirectionPickerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        DirectionPickerComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' },
        }),
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(DirectionPickerComponent);
    component = fixture.componentInstance;

    // Set required inputs
    fixture.componentRef.setInput('reversed', signal(false));
    fixture.componentRef.setInput('translationPrefix', 'study.config');
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should accept a WritableSignal<boolean> for reversed input', () => {
    fixture.detectChanges();
    const reversedSignal = component.reversed();
    expect(reversedSignal()).toBe(false);
  });

  it('should allow toggling the reversed signal', () => {
    fixture.detectChanges();
    const reversedSignal = component.reversed();

    reversedSignal.set(true);
    expect(reversedSignal()).toBe(true);

    reversedSignal.set(false);
    expect(reversedSignal()).toBe(false);
  });

  it('should accept a custom instanceId', () => {
    fixture.componentRef.setInput('instanceId', 'quiz');
    fixture.detectChanges();
    expect(component.instanceId()).toBe('quiz');
  });

  it('should default instanceId to "default"', () => {
    fixture.detectChanges();
    expect(component.instanceId()).toBe('default');
  });
});
