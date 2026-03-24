import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Component } from '@angular/core';

import { GenerateButtonComponent } from './generate-button.component';

@Component({
  template: `
    <app-generate-button
      [label]="label"
      [disabled]="disabled"
      [loading]="loading"
      (generateClick)="onGenerate()"
    />
  `,
  imports: [GenerateButtonComponent]
})
class TestHostComponent {
  public label: string = 'Generate';
  public disabled: boolean = false;
  public loading: boolean = false;
  public generateClicked: boolean = false;

  public onGenerate(): void {
    this.generateClicked = true;
  }
}

describe('GenerateButtonComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let component: GenerateButtonComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    component = fixture.debugElement.children[0].componentInstance as GenerateButtonComponent;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('inputs', () => {
    it('should receive label input', () => {
      expect(component.labelSignal()).toBe('Generate');
    });

    it('should receive disabled input', () => {
      expect(component.disabledSignal()).toBeFalse();
    });

    it('should receive loading input', () => {
      expect(component.loadingSignal()).toBeFalse();
    });

    it('should use default label when not provided', () => {
      const defaultFixture: ComponentFixture<GenerateButtonComponent> =
        TestBed.createComponent(GenerateButtonComponent);
      defaultFixture.detectChanges();
      const defaultComponent: GenerateButtonComponent = defaultFixture.componentInstance;
      expect(defaultComponent.labelSignal()).toBe('Generuj Fiszki');
    });
  });

  describe('onClick', () => {
    it('should emit generateClick when not disabled and not loading', () => {
      component.onClick();
      fixture.detectChanges();
      expect(host.generateClicked).toBeTrue();
    });

    it('should not emit generateClick when disabled', () => {
      host.disabled = true;
      fixture.detectChanges();

      host.generateClicked = false;
      component.onClick();
      fixture.detectChanges();
      expect(host.generateClicked).toBeFalse();
    });

    it('should not emit generateClick when loading', () => {
      host.loading = true;
      fixture.detectChanges();

      host.generateClicked = false;
      component.onClick();
      fixture.detectChanges();
      expect(host.generateClicked).toBeFalse();
    });
  });
});
