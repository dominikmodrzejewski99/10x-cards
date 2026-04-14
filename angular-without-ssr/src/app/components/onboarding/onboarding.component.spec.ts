import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';

import { OnboardingComponent } from './onboarding.component';
import { OnboardingFacadeService } from '../../services/facades/onboarding-facade.service';

describe('OnboardingComponent', () => {
  let component: OnboardingComponent;
  let fixture: ComponentFixture<OnboardingComponent>;
  let routerSpy: jasmine.SpyObj<Router>;

  const facadeMock = {
    onboardingCompletedSignal: jasmine.createSpy('onboardingCompletedSignal').and.returnValue(false),
    checkOnboardingStatus: jasmine.createSpy('checkOnboardingStatus').and.callFake((onShow: () => void) => {
      onShow();
    }),
    completeOnboarding: jasmine.createSpy('completeOnboarding'),
  };

  beforeEach(async () => {
    Object.values(facadeMock).forEach((spy: jasmine.Spy) => spy.calls.reset());

    // Reset return values and callbacks that may have been mutated by previous tests
    facadeMock.onboardingCompletedSignal.and.returnValue(false);
    facadeMock.checkOnboardingStatus.and.callFake((onShow: () => void) => {
      onShow();
    });

    routerSpy = jasmine.createSpyObj<Router>('Router', ['navigate']);
    routerSpy.navigate.and.returnValue(Promise.resolve(true));

    await TestBed.configureTestingModule({
      imports: [
        OnboardingComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' },
        }),
      ],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: OnboardingFacadeService, useValue: facadeMock },
      ],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(OnboardingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('initial state', () => {
    it('should start at step 0', () => {
      expect(component.currentStepIndex()).toBe(0);
    });

    it('should not be visible initially', () => {
      expect(component.visible()).toBeFalse();
    });

    it('should have 6 tour steps', () => {
      expect(component.steps.length).toBe(6);
    });
  });

  describe('computed signals', () => {
    it('isFirst should return true on first step', () => {
      expect(component.isFirst()).toBeTrue();
    });

    it('isLast should return false on first step', () => {
      expect(component.isLast()).toBeFalse();
    });

    it('isLast should return true on last step', () => {
      component.currentStepIndex.set(component.steps.length - 1);
      expect(component.isLast()).toBeTrue();
    });

    it('isCentered should return true for welcome step (no target)', () => {
      expect(component.isCentered()).toBeTrue();
    });

    it('isCentered should return false for steps with targets', () => {
      component.currentStepIndex.set(1);
      expect(component.isCentered()).toBeFalse();
    });

    it('progress should reflect current step', () => {
      expect(component.progress()).toBeCloseTo((1 / 6) * 100, 0);
      component.currentStepIndex.set(2);
      expect(component.progress()).toBeCloseTo((3 / 6) * 100, 0);
    });
  });

  describe('navigation', () => {
    it('should advance to next step', () => {
      component.next();
      expect(component.currentStepIndex()).toBe(1);
    });

    it('should not advance past the last step', () => {
      component.currentStepIndex.set(component.steps.length - 1);
      component.next();
      expect(component.currentStepIndex()).toBe(component.steps.length - 1);
    });

    it('should go to previous step', () => {
      component.currentStepIndex.set(2);
      component.prev();
      expect(component.currentStepIndex()).toBe(1);
    });

    it('should not go before the first step', () => {
      component.prev();
      expect(component.currentStepIndex()).toBe(0);
    });
  });

  describe('show', () => {
    it('should reset step to 0 and make visible', () => {
      component.currentStepIndex.set(3);
      component.show();
      expect(component.currentStepIndex()).toBe(0);
      expect(component.visible()).toBeTrue();
    });
  });

  describe('checkAndShow', () => {
    it('should call facade.checkOnboardingStatus and show tour', () => {
      component.checkAndShow();

      expect(facadeMock.checkOnboardingStatus).toHaveBeenCalled();
      expect(component.visible()).toBeTrue();
    });

    it('should not show tour when facade does not call onShow', () => {
      facadeMock.checkOnboardingStatus.and.callFake(() => {
        // Does not call onShow -- simulates onboarding_completed=true
      });

      component.checkAndShow();

      expect(component.visible()).toBeFalse();
    });
  });

  describe('skip', () => {
    it('should hide tour and call facade.completeOnboarding', () => {
      component.show();
      component.skip();
      expect(component.visible()).toBeFalse();
      expect(facadeMock.completeOnboarding).toHaveBeenCalled();
    });

    it('should clear spotlight rect', () => {
      component.show();
      component.skip();
      expect(component.spotlightRect()).toBeNull();
    });
  });

  describe('finish', () => {
    it('should hide tour, call completeOnboarding, and navigate to dashboard', () => {
      component.show();
      component.finish();
      expect(component.visible()).toBeFalse();
      expect(facadeMock.completeOnboarding).toHaveBeenCalled();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/dashboard']);
    });
  });

  describe('keyboard navigation', () => {
    it('should go to next step on ArrowRight', () => {
      component.show();
      component.onArrowRight();
      expect(component.currentStepIndex()).toBe(1);
    });

    it('should not go to next step on ArrowRight when on last step', () => {
      component.show();
      component.currentStepIndex.set(component.steps.length - 1);
      component.onArrowRight();
      expect(component.currentStepIndex()).toBe(component.steps.length - 1);
    });

    it('should go to previous step on ArrowLeft', () => {
      component.show();
      component.currentStepIndex.set(2);
      component.onArrowLeft();
      expect(component.currentStepIndex()).toBe(1);
    });

    it('should skip tour on Escape', () => {
      component.show();
      component.onEscape();
      expect(component.visible()).toBeFalse();
    });

    it('should not respond to keyboard when not visible', () => {
      component.onArrowRight();
      expect(component.currentStepIndex()).toBe(0);
    });
  });

  describe('spotlight positioning', () => {
    it('should have null spotlight for centered steps', fakeAsync(() => {
      component.show();
      tick(16);
      expect(component.spotlightRect()).toBeNull();
    }));

    it('spotlightStyle should return empty object when no spotlight', () => {
      expect(component.spotlightStyle()).toEqual({});
    });

    it('tooltipStyle should return centered position when no spotlight', () => {
      expect(component.tooltipStyle()).toEqual({
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      });
    });
  });

  describe('step structure', () => {
    it('first step should be welcome (centered)', () => {
      expect(component.steps[0].id).toBe('welcome');
      expect(component.steps[0].targetSelector).toBe('');
    });

    it('last step should be finish (centered)', () => {
      const last = component.steps[component.steps.length - 1];
      expect(last.id).toBe('finish');
      expect(last.targetSelector).toBe('');
    });

    it('middle steps should have target selectors', () => {
      for (let i = 1; i < component.steps.length - 1; i++) {
        expect(component.steps[i].targetSelector).toBeTruthy(
          `Step ${component.steps[i].id} should have a targetSelector`,
        );
      }
    });

    it('all steps should have i18n title and description keys', () => {
      for (const step of component.steps) {
        expect(step.titleKey).toMatch(/^tour\./);
        expect(step.descriptionKey).toMatch(/^tour\./);
      }
    });
  });
});
