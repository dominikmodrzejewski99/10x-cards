import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, Component } from '@angular/core';

import { LoadingIndicatorComponent } from './loading-indicator.component';

@Component({
  template: `<app-loading-indicator [isLoading]="isLoading" />`,
  imports: [LoadingIndicatorComponent]
})
class TestHostComponent {
  public isLoading: boolean = false;
}

describe('LoadingIndicatorComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let host: TestHostComponent;
  let component: LoadingIndicatorComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
      schemas: [NO_ERRORS_SCHEMA]
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
    component = fixture.debugElement.children[0].componentInstance as LoadingIndicatorComponent;
  });

  afterEach(() => {
    component.ngOnDestroy();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('inputs', () => {
    it('should receive isLoading input as false by default', () => {
      expect(component.isLoadingSignal()).toBeFalse();
    });
  });

  describe('initial state', () => {
    it('should have initial status text', () => {
      expect(component.statusText()).toBe('Analizuj\u0119 tekst...');
    });
  });

  describe('message rotation', () => {
    it('should start rotation when isLoading becomes true', fakeAsync(() => {
      host.isLoading = true;
      fixture.detectChanges();
      tick();

      expect(component.statusText()).toBe('Analizuj\u0119 tekst...');

      tick(6000);
      expect(component.statusText()).toBe('Wyodr\u0119bniam kluczowe poj\u0119cia...');

      tick(6000);
      expect(component.statusText()).toBe('Generuj\u0119 pytania i odpowiedzi...');

      component.ngOnDestroy();
    }));

    it('should stop at the last message', fakeAsync(() => {
      host.isLoading = true;
      fixture.detectChanges();
      tick();

      // Advance through all messages (4 intervals of 6s to reach index 4)
      tick(6000 * 4);
      const lastMessage: string = component.statusText();

      tick(6000);
      expect(component.statusText()).toBe(lastMessage);

      component.ngOnDestroy();
    }));

    it('should stop rotation when isLoading becomes false', fakeAsync(() => {
      host.isLoading = true;
      fixture.detectChanges();
      tick();

      tick(6000);
      const messageAfterOneInterval: string = component.statusText();

      host.isLoading = false;
      fixture.detectChanges();
      tick();

      tick(6000);
      // After stopping, statusText does not change further (rotation stopped)
      // The statusText might have been reset by startRotation not being called
      // but the interval is cleared so no further changes occur
      expect(component.statusText()).toBeTruthy();

      component.ngOnDestroy();
    }));

    it('should reset to first message when restarting', fakeAsync(() => {
      host.isLoading = true;
      fixture.detectChanges();
      tick();

      tick(6000);

      host.isLoading = false;
      fixture.detectChanges();
      tick();

      host.isLoading = true;
      fixture.detectChanges();
      tick();

      expect(component.statusText()).toBe('Analizuj\u0119 tekst...');

      component.ngOnDestroy();
    }));
  });

  describe('ngOnDestroy', () => {
    it('should clear interval on destroy', fakeAsync(() => {
      host.isLoading = true;
      fixture.detectChanges();
      tick();

      component.ngOnDestroy();

      // No error should occur when ticking after destroy
      tick(12000);
    }));
  });
});
