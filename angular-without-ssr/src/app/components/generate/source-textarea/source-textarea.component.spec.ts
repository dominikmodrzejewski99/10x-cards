import { ComponentFixture, TestBed, fakeAsync, flush } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Component } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { SourceTextareaComponent } from './source-textarea.component';

@Component({
  template: `
    <app-source-textarea
      [minLength]="minLength"
      [maxLength]="maxLength"
      (textChange)="onTextChange($event)"
      (validityChange)="onValidityChange($event)"
    />
  `,
  imports: [SourceTextareaComponent]
})
class TestHostComponent {
  public minLength: number = 10;
  public maxLength: number = 100;
  public lastText: string | null = null;
  public lastValidity: boolean | null = null;

  public onTextChange(text: string): void {
    this.lastText = text;
  }
  public onValidityChange(valid: boolean): void {
    this.lastValidity = valid;
  }
}

describe('SourceTextareaComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let component: SourceTextareaComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        TestHostComponent,
        TranslocoTestingModule.forRoot({ langs: { pl: {} }, translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' } })
      ],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    component = fixture.debugElement.children[0].componentInstance as SourceTextareaComponent;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('inputs', () => {
    it('should receive minLength input', () => {
      expect(component.minLengthSignal()).toBe(10);
    });

    it('should receive maxLength input', () => {
      expect(component.maxLengthSignal()).toBe(100);
    });

    it('should use default minLength when not provided', () => {
      const defaultFixture: ComponentFixture<SourceTextareaComponent> =
        TestBed.createComponent(SourceTextareaComponent);
      defaultFixture.detectChanges();
      const defaultComponent: SourceTextareaComponent = defaultFixture.componentInstance;
      expect(defaultComponent.minLengthSignal()).toBe(1000);
    });
  });

  describe('ngOnInit', () => {
    it('should emit empty text and false validity on init', fakeAsync(() => {
      const initFixture: ComponentFixture<TestHostComponent> = TestBed.createComponent(TestHostComponent);
      const initHost: TestHostComponent = initFixture.componentInstance;
      initFixture.detectChanges();
      flush();
      expect(initHost.lastText).toBe('');
      expect(initHost.lastValidity).toBeFalse();
    }));
  });

  describe('onTextChange', () => {
    it('should emit text and update currentLength', () => {
      const validText: string = 'Hello World Test';
      component.onTextChange(validText);
      fixture.detectChanges();

      expect(component.currentLength).toBe(validText.length);
      expect(host.lastText).toBe(validText);
    });

    it('should emit valid=true when text length is within range', () => {
      const validText: string = 'This is a valid text with enough characters';
      component.onTextChange(validText);
      fixture.detectChanges();

      expect(host.lastValidity).toBeTrue();
    });

    it('should emit valid=false when text is too short', () => {
      component.onTextChange('short');
      fixture.detectChanges();

      expect(host.lastValidity).toBeFalse();
    });

    it('should emit valid=false when text is too long', () => {
      const longText: string = 'a'.repeat(101);
      component.onTextChange(longText);
      fixture.detectChanges();

      expect(host.lastValidity).toBeFalse();
    });

    it('should emit valid=false when text is only whitespace', () => {
      const whitespace: string = '              '; // 14 chars, within range
      component.onTextChange(whitespace);
      fixture.detectChanges();

      expect(host.lastValidity).toBeFalse();
    });

    it('should handle null value gracefully', () => {
      component.onTextChange(null as unknown as string);
      expect(component.currentLength).toBe(0);
    });

    it('should handle undefined value gracefully', () => {
      component.onTextChange(undefined as unknown as string);
      expect(component.currentLength).toBe(0);
    });
  });

  describe('validation helpers', () => {
    it('isTextEmpty should return true when text is whitespace and currentLength > 0', () => {
      component.text = '   ';
      component.currentLength = 3;
      expect(component.isTextEmpty()).toBeTrue();
    });

    it('isTextEmpty should return false when currentLength is 0', () => {
      component.text = '';
      component.currentLength = 0;
      expect(component.isTextEmpty()).toBeFalse();
    });

    it('isTooShort should return true when text is shorter than minLength', () => {
      component.currentLength = 5;
      expect(component.isTooShort()).toBeTrue();
    });

    it('isTooShort should return false when currentLength is 0', () => {
      component.currentLength = 0;
      expect(component.isTooShort()).toBeFalse();
    });

    it('isTooLong should return true when text exceeds maxLength', () => {
      component.currentLength = 101;
      expect(component.isTooLong()).toBeTrue();
    });

    it('isTooLong should return false when within limit', () => {
      component.currentLength = 50;
      expect(component.isTooLong()).toBeFalse();
    });

    it('isTextValid should return true for valid text', () => {
      component.text = 'Valid text here!';
      component.currentLength = 16;
      expect(component.isTextValid()).toBeTrue();
    });

    it('isTextValid should return false for whitespace-only text', () => {
      component.text = '              ';
      component.currentLength = 14;
      expect(component.isTextValid()).toBeFalse();
    });
  });
});
