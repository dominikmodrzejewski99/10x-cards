import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Component } from '@angular/core';

import { BulkSaveButtonComponent } from './bulk-save-button.component';

@Component({
  template: `
    <app-bulk-save-button
      [label]="label"
      [disabled]="disabled"
      [loading]="loading"
      (saveAllClick)="onSaveAll()"
    />
  `,
  imports: [BulkSaveButtonComponent]
})
class TestHostComponent {
  public label: string = 'Save All';
  public disabled: boolean = false;
  public loading: boolean = false;
  public saveAllClicked: boolean = false;

  public onSaveAll(): void {
    this.saveAllClicked = true;
  }
}

describe('BulkSaveButtonComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let component: BulkSaveButtonComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    component = fixture.debugElement.children[0].componentInstance as BulkSaveButtonComponent;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('inputs', () => {
    it('should receive label input', () => {
      expect(component.labelSignal()).toBe('Save All');
    });

    it('should receive disabled input', () => {
      expect(component.disabledSignal()).toBeFalse();
    });

    it('should receive loading input', () => {
      expect(component.loadingSignal()).toBeFalse();
    });

    it('should use default label when not provided', () => {
      const defaultFixture: ComponentFixture<BulkSaveButtonComponent> =
        TestBed.createComponent(BulkSaveButtonComponent);
      defaultFixture.detectChanges();
      const defaultComponent: BulkSaveButtonComponent = defaultFixture.componentInstance;
      expect(defaultComponent.labelSignal()).toBe('Zapisz wszystkie propozycje');
    });
  });

  describe('onClick', () => {
    it('should emit saveAllClick when not disabled and not loading', () => {
      component.onClick();
      fixture.detectChanges();
      expect(host.saveAllClicked).toBeTrue();
    });

    it('should not emit saveAllClick when disabled', () => {
      host.disabled = true;
      fixture.detectChanges();

      host.saveAllClicked = false;
      component.onClick();
      fixture.detectChanges();
      expect(host.saveAllClicked).toBeFalse();
    });

    it('should not emit saveAllClick when loading', () => {
      host.loading = true;
      fixture.detectChanges();

      host.saveAllClicked = false;
      component.onClick();
      fixture.detectChanges();
      expect(host.saveAllClicked).toBeFalse();
    });
  });
});
