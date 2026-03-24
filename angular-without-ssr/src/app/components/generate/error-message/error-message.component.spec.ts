import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Component } from '@angular/core';

import { ErrorMessageComponent } from './error-message.component';

@Component({
  template: `
    <app-error-message
      [errorMessage]="errorMsg"
      [showRetry]="showRetry"
      (dismiss)="onDismiss()"
      (retry)="onRetry()"
    />
  `,
  imports: [ErrorMessageComponent]
})
class TestHostComponent {
  public errorMsg: string | null = 'Something went wrong';
  public showRetry: boolean = true;

  public dismissed: boolean = false;
  public retried: boolean = false;

  public onDismiss(): void {
    this.dismissed = true;
  }

  public onRetry(): void {
    this.retried = true;
  }
}

describe('ErrorMessageComponent', () => {
  let hostComponent: TestHostComponent;
  let hostFixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent]
    }).compileComponents();

    hostFixture = TestBed.createComponent(TestHostComponent);
    hostComponent = hostFixture.componentInstance;
  });

  it('should create', () => {
    hostFixture.detectChanges();
    const errorComponent: ErrorMessageComponent = hostFixture.debugElement
      .query(By.directive(ErrorMessageComponent)).componentInstance as ErrorMessageComponent;
    expect(errorComponent).toBeTruthy();
  });

  describe('display', () => {
    it('should display error message text', () => {
      hostFixture.detectChanges();

      const compiled: HTMLElement = hostFixture.nativeElement as HTMLElement;
      expect(compiled.textContent).toContain('Something went wrong');
    });

    it('should not render when errorMessage is null', () => {
      hostComponent.errorMsg = null;
      hostFixture.detectChanges();

      const errorDiv: HTMLElement | null = (hostFixture.nativeElement as HTMLElement)
        .querySelector('.bg-red-50');
      expect(errorDiv).toBeNull();
    });
  });

  describe('dismiss', () => {
    it('should emit dismiss event when dismiss button is clicked', () => {
      hostFixture.detectChanges();

      const buttons: HTMLButtonElement[] = Array.from(
        (hostFixture.nativeElement as HTMLElement).querySelectorAll('button')
      );
      const dismissButton: HTMLButtonElement | undefined = buttons.find(
        (b: HTMLButtonElement) => b.textContent?.trim() === 'Zamknij'
      );

      expect(dismissButton).toBeTruthy();
      dismissButton!.click();
      hostFixture.detectChanges();

      expect(hostComponent.dismissed).toBeTrue();
    });
  });

  describe('retry', () => {
    it('should emit retry event when retry button is clicked', () => {
      hostFixture.detectChanges();

      const buttons: HTMLButtonElement[] = Array.from(
        (hostFixture.nativeElement as HTMLElement).querySelectorAll('button')
      );
      const retryButton: HTMLButtonElement | undefined = buttons.find(
        (b: HTMLButtonElement) => b.textContent?.trim() === 'Spróbuj ponownie'
      );

      expect(retryButton).toBeTruthy();
      retryButton!.click();
      hostFixture.detectChanges();

      expect(hostComponent.retried).toBeTrue();
    });

    it('should not show retry button when showRetry is false', () => {
      hostComponent.showRetry = false;
      hostFixture.detectChanges();

      const buttons: HTMLButtonElement[] = Array.from(
        (hostFixture.nativeElement as HTMLElement).querySelectorAll('button')
      );
      const retryButton: HTMLButtonElement | undefined = buttons.find(
        (b: HTMLButtonElement) => b.textContent?.trim() === 'Spróbuj ponownie'
      );

      expect(retryButton).toBeUndefined();
    });

    it('should show retry button when showRetry is true (default)', () => {
      hostFixture.detectChanges();

      const buttons: HTMLButtonElement[] = Array.from(
        (hostFixture.nativeElement as HTMLElement).querySelectorAll('button')
      );
      const retryButton: HTMLButtonElement | undefined = buttons.find(
        (b: HTMLButtonElement) => b.textContent?.trim() === 'Spróbuj ponownie'
      );

      expect(retryButton).toBeTruthy();
    });
  });
});
