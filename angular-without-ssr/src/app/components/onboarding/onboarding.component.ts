import { Component, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { UserPreferencesService } from '../../services/user-preferences.service';

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  details: string[];
}

const STEPS: OnboardingStep[] = [
  {
    title: 'Witaj w <span class="ob__brand">Memlo</span>!',
    description: 'Naucz się szybciej dzięki fiszkom i algorytmowi <strong class="ob__highlight">spaced repetition</strong>.',
    icon: 'pi-bolt',
    iconColor: '#4255ff',
    details: [
      'Spaced repetition (powtarzanie w odstępach) to naukowo potwierdzona metoda nauki.',
      'Algorytm SM-2 automatycznie planuje, kiedy powinieneś powtórzyć każdą fiszkę.',
      'Im lepiej znasz materiał, tym rzadziej jest powtarzany — oszczędzasz czas!'
    ]
  },
  {
    title: 'Twórz fiszki z AI',
    description: 'Wklej dowolny tekst, a sztuczna inteligencja wygeneruje fiszki za Ciebie.',
    icon: 'pi-sparkles',
    iconColor: '#a855f7',
    details: [
      'Przejdź do zakładki „Generuj" i wklej fragment tekstu (1000–10 000 znaków).',
      'AI zaproponuje 15 fiszek — możesz je zaakceptować, edytować lub odrzucić.',
      'Możesz też tworzyć fiszki ręcznie w widoku zestawu.'
    ]
  },
  {
    title: 'Organizuj w zestawy',
    description: 'Grupuj fiszki tematycznie, aby łatwiej zarządzać materiałem.',
    icon: 'pi-folder',
    iconColor: '#f5a623',
    details: [
      'Utwórz zestaw dla każdego tematu, np. „Biologia — rozdział 3".',
      'Przy generowaniu fiszek wybierz docelowy zestaw.',
      'Możesz uczyć się z wybranego zestawu lub ze wszystkich naraz.'
    ]
  },
  {
    title: 'Ucz się efektywnie',
    description: 'Algorytm SM-2 dobiera fiszki do powtórki w optymalnym momencie.',
    icon: 'pi-graduation-cap',
    iconColor: '#23b26d',
    details: [
      'Przejdź do zakładki „Nauka" — zobaczysz przód fiszki.',
      'Kliknij lub naciśnij spację, aby zobaczyć odpowiedź.',
      'Oceń swoją odpowiedź: „Nie wiem", „Trudne" lub „Wiem".',
      'Algorytm zaplanuje następną powtórkę na podstawie Twojej oceny.',
      'Fiszki, których nie znasz, pojawią się szybciej — te, które znasz, rzadziej.'
    ]
  },
  {
    title: 'Krzywa zapominania',
    description: 'Dlaczego spaced repetition działa?',
    icon: 'pi-chart-line',
    iconColor: '#ff6240',
    details: [
      'Bez powtórek zapominasz ~80% materiału w ciągu tygodnia.',
      'Każda powtórka w odpowiednim momencie wzmacnia pamięć.',
      'Po kilku powtórkach materiał trafia do pamięci długotrwałej.',
      'Regularne krótkie sesje (10–15 min dziennie) dają najlepsze efekty.',
      'Zacznij teraz — wygeneruj swoje pierwsze fiszki!'
    ]
  }
];

@Component({
  selector: 'app-onboarding',
  imports: [DialogModule],
  templateUrl: './onboarding.component.html',
  styleUrls: ['./onboarding.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class OnboardingComponent {
  private router = inject(Router);
  private preferencesService = inject(UserPreferencesService);

  steps = STEPS;
  currentStep = signal(0);
  visible = signal(false);

  get step(): OnboardingStep {
    return this.steps[this.currentStep()];
  }

  get isFirst(): boolean {
    return this.currentStep() === 0;
  }

  get isLast(): boolean {
    return this.currentStep() === this.steps.length - 1;
  }

  /** Check from DB whether onboarding should show for this user */
  checkAndShow(): void {
    this.preferencesService.getPreferences().subscribe({
      next: (prefs) => {
        if (!prefs.onboarding_completed) {
          this.show();
        }
      },
      error: () => {
        // If preferences can't be loaded (e.g. table not yet migrated), show anyway
        this.show();
      }
    });
  }

  show(): void {
    this.currentStep.set(0);
    this.visible.set(true);
  }

  next(): void {
    if (!this.isLast) {
      this.currentStep.update(i => i + 1);
    }
  }

  prev(): void {
    if (!this.isFirst) {
      this.currentStep.update(i => i - 1);
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
  }
}
