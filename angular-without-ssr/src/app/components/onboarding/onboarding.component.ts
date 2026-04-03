import { Component, ChangeDetectionStrategy, inject, signal, computed, HostListener, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { UserPreferencesService } from '../../services/user-preferences.service';

export interface TourStep {
  id: string;
  targetSelector: string;
  mobileTargetSelector: string;
  titleKey: string;
  descriptionKey: string;
  icon: string;
  iconColor: string;
  position: 'top' | 'bottom' | 'left' | 'right';
  mobilePosition: 'top' | 'bottom' | 'left' | 'right';
  spotlightPadding?: number;
  route?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: 'welcome',
    targetSelector: '',
    mobileTargetSelector: '',
    titleKey: 'tour.welcome.title',
    descriptionKey: 'tour.welcome.desc',
    icon: 'pi-bolt',
    iconColor: '#3b4cca',
    position: 'bottom',
    mobilePosition: 'bottom',
  },
  {
    id: 'create-set',
    targetSelector: '[data-tour="create-set"]',
    mobileTargetSelector: '[data-tour="create-set"]',
    titleKey: 'tour.createSet.title',
    descriptionKey: 'tour.createSet.desc',
    icon: 'pi-folder',
    iconColor: '#f5a623',
    position: 'bottom',
    mobilePosition: 'bottom',
    route: '/sets',
  },
  {
    id: 'generate',
    targetSelector: '[data-tour="generate"]',
    mobileTargetSelector: '[data-tour-mobile="generate"]',
    titleKey: 'tour.generate.title',
    descriptionKey: 'tour.generate.desc',
    icon: 'pi-microchip-ai',
    iconColor: '#a855f7',
    position: 'bottom',
    mobilePosition: 'top',
  },
  {
    id: 'learn',
    targetSelector: '[data-tour="learn"]',
    mobileTargetSelector: '[data-tour-mobile="study"]',
    titleKey: 'tour.learn.title',
    descriptionKey: 'tour.learn.desc',
    icon: 'pi-graduation-cap',
    iconColor: '#15803d',
    position: 'bottom',
    mobilePosition: 'top',
  },
  {
    id: 'friends',
    targetSelector: '[data-tour="friends"]',
    mobileTargetSelector: '[data-tour="friends"]',
    titleKey: 'tour.friends.title',
    descriptionKey: 'tour.friends.desc',
    icon: 'pi-users',
    iconColor: '#0d9488',
    position: 'bottom',
    mobilePosition: 'bottom',
  },
  {
    id: 'finish',
    targetSelector: '',
    mobileTargetSelector: '',
    titleKey: 'tour.finish.title',
    descriptionKey: 'tour.finish.desc',
    icon: 'pi-sparkles',
    iconColor: '#3b4cca',
    position: 'bottom',
    mobilePosition: 'bottom',
  },
];

const MOBILE_BREAKPOINT = 992;

@Component({
  selector: 'app-onboarding',
  imports: [TranslocoDirective],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OnboardingComponent implements OnDestroy {
  private router = inject(Router);
  private preferencesService = inject(UserPreferencesService);
  private resizeObserver: ResizeObserver | null = null;

  steps = TOUR_STEPS;
  currentStepIndex = signal(0);
  visible = signal(false);

  // Spotlight position (updated when step changes or window resizes)
  spotlightRect = signal<DOMRect | null>(null);

  currentStep = computed(() => this.steps[this.currentStepIndex()]);
  isFirst = computed(() => this.currentStepIndex() === 0);
  isLast = computed(() => this.currentStepIndex() === this.steps.length - 1);
  isCentered = computed(() => !this.currentStep().targetSelector && !this.currentStep().mobileTargetSelector);
  progress = computed(() => ((this.currentStepIndex() + 1) / this.steps.length) * 100);

  tooltipStyle = computed(() => {
    const rect = this.spotlightRect();
    const step = this.currentStep();

    // Centered steps (welcome, finish) — position in the middle of viewport
    if (!rect) {
      return {
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
      };
    }

    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    const pos = isMobile ? step.mobilePosition : step.position;
    const padding = step.spotlightPadding ?? 8;

    const styles: Record<string, string> = {};

    switch (pos) {
      case 'bottom':
        styles['top'] = `${rect.bottom + padding + 12}px`;
        styles['left'] = `${Math.max(12, Math.min(rect.left + rect.width / 2, window.innerWidth - 12))}px`;
        styles['transform'] = 'translateX(-50%)';
        break;
      case 'top':
        styles['top'] = `${rect.top - padding - 12}px`;
        styles['left'] = `${Math.max(12, Math.min(rect.left + rect.width / 2, window.innerWidth - 12))}px`;
        styles['transform'] = 'translate(-50%, -100%)';
        break;
      case 'right':
        styles['top'] = `${rect.top + rect.height / 2}px`;
        styles['left'] = `${rect.right + padding + 12}px`;
        styles['transform'] = 'translateY(-50%)';
        break;
      case 'left':
        styles['top'] = `${rect.top + rect.height / 2}px`;
        styles['left'] = `${rect.left - padding - 12}px`;
        styles['transform'] = 'translate(-100%, -50%)';
        break;
    }

    return styles;
  });

  spotlightStyle = computed(() => {
    const rect = this.spotlightRect();
    if (!rect) return {};
    const padding = this.currentStep().spotlightPadding ?? 8;
    return {
      top: `${rect.top - padding}px`,
      left: `${rect.left - padding}px`,
      width: `${rect.width + padding * 2}px`,
      height: `${rect.height + padding * 2}px`,
    };
  });

  @HostListener('window:resize')
  onResize(): void {
    if (this.visible()) {
      this.updateSpotlight();
    }
  }

  @HostListener('window:keydown.Escape')
  onEscape(): void {
    if (this.visible()) {
      this.skip();
    }
  }

  @HostListener('window:keydown.ArrowRight')
  onArrowRight(): void {
    if (this.visible() && !this.isLast()) {
      this.next();
    }
  }

  @HostListener('window:keydown.ArrowLeft')
  onArrowLeft(): void {
    if (this.visible() && !this.isFirst()) {
      this.prev();
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
  }

  checkAndShow(): void {
    this.preferencesService.getPreferences().subscribe({
      next: (prefs) => {
        if (!prefs.onboarding_completed) {
          this.show();
        }
      },
      error: () => {
        this.show();
      },
    });
  }

  show(): void {
    this.currentStepIndex.set(0);
    this.visible.set(true);
    this.updateSpotlight();
  }

  next(): void {
    if (!this.isLast()) {
      this.currentStepIndex.update(i => i + 1);
      this.navigateAndSpotlight();
    }
  }

  prev(): void {
    if (!this.isFirst()) {
      this.currentStepIndex.update(i => i - 1);
      this.navigateAndSpotlight();
    }
  }

  skip(): void {
    this.complete();
  }

  finish(): void {
    this.complete();
    this.router.navigate(['/dashboard']);
  }

  private complete(): void {
    this.preferencesService.setOnboardingCompleted().subscribe();
    this.visible.set(false);
    this.spotlightRect.set(null);
  }

  private navigateAndSpotlight(): void {
    const step = this.steps[this.currentStepIndex()];
    if (step.route) {
      this.router.navigate([step.route]).then(() => {
        // Wait for the route component to render
        setTimeout(() => this.updateSpotlight(), 150);
      });
    } else {
      this.updateSpotlight();
    }
  }

  private updateSpotlight(): void {
    requestAnimationFrame(() => {
      const step = this.steps[this.currentStepIndex()];
      const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
      const selector = isMobile ? step.mobileTargetSelector : step.targetSelector;

      if (!selector) {
        this.spotlightRect.set(null);
        return;
      }

      const el = document.querySelector(selector);
      if (el) {
        this.spotlightRect.set(el.getBoundingClientRect());
      } else {
        this.spotlightRect.set(null);
      }
    });
  }
}
