import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { QuizConfigComponent } from './quiz-config.component';
import { QuizConfig } from '../../../../types';

describe('QuizConfigComponent', () => {
  let component: QuizConfigComponent;
  let fixture: ComponentFixture<QuizConfigComponent>;
  let componentRef: ComponentRef<QuizConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        QuizConfigComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' }
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(QuizConfigComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('setId', 1);
    componentRef.setInput('setName', 'Testowy zestaw');
    componentRef.setInput('cardCount', 25);

    fixture.detectChanges();
  });

  it('powinien utworzyc komponent', () => {
    expect(component).toBeTruthy();
  });

  describe('domyslne wartosci sygnalow', () => {
    it('powinien miec selectedCount ustawiony na 10', () => {
      const selectedCount: number | 'all' = component.config.selectedCountSignal();
      expect(selectedCount).toBe(10);
    });

    it('powinien miec wlaczone wpisywanie odpowiedzi', () => {
      const writtenEnabled: boolean = component.config.writtenEnabledSignal();
      expect(writtenEnabled).toBeTrue();
    });

    it('powinien miec wlaczony wielokrotny wybor', () => {
      const multipleChoiceEnabled: boolean = component.config.multipleChoiceEnabledSignal();
      expect(multipleChoiceEnabled).toBeTrue();
    });

    it('powinien miec wlaczone prawda/falsz', () => {
      const trueFalseEnabled: boolean = component.config.trueFalseEnabledSignal();
      expect(trueFalseEnabled).toBeTrue();
    });

    it('powinien miec kierunek ustawiony na normalny (reversed=false)', () => {
      const reversed: boolean = component.config.reversedSignal();
      expect(reversed).toBeFalse();
    });
  });

  describe('availableCountOptions', () => {
    it('powinien filtrowac opcje na podstawie liczby kart - wszystkie opcje dla 25 kart', () => {
      componentRef.setInput('cardCount', 25);
      fixture.detectChanges();

      const options = component.availableCountOptions;
      const values: (number | 'all')[] = options.map((opt) => opt.value);

      expect(values).toEqual([5, 10, 15, 20, 'all']);
    });

    it('powinien wykluczyc opcje wieksze niz liczba kart', () => {
      componentRef.setInput('cardCount', 7);
      fixture.detectChanges();

      const options = component.availableCountOptions;
      const values: (number | 'all')[] = options.map((opt) => opt.value);

      expect(values).toEqual([5, 'all']);
    });

    it('powinien zawsze zawierac opcje "Wszystkie"', () => {
      componentRef.setInput('cardCount', 2);
      fixture.detectChanges();

      const options = component.availableCountOptions;
      const values: (number | 'all')[] = options.map((opt) => opt.value);

      expect(values).toContain('all');
    });

    it('powinien pokazac opcje 5 i 10 dla 12 kart', () => {
      componentRef.setInput('cardCount', 12);
      fixture.detectChanges();

      const options = component.availableCountOptions;
      const values: (number | 'all')[] = options.map((opt) => opt.value);

      expect(values).toEqual([5, 10, 'all']);
    });
  });

  describe('isValid', () => {
    it('powinien zwrocic false gdy zaden typ pytania nie jest zaznaczony', () => {
      component.config.writtenEnabledSignal.set(false);
      component.config.multipleChoiceEnabledSignal.set(false);
      component.config.trueFalseEnabledSignal.set(false);

      const valid: boolean = component.isValid;

      expect(valid).toBeFalse();
    });

    it('powinien zwrocic true gdy przynajmniej jeden typ jest zaznaczony - wpisywanie', () => {
      component.config.writtenEnabledSignal.set(true);
      component.config.multipleChoiceEnabledSignal.set(false);
      component.config.trueFalseEnabledSignal.set(false);

      const valid: boolean = component.isValid;

      expect(valid).toBeTrue();
    });

    it('powinien zwrocic true gdy przynajmniej jeden typ jest zaznaczony - wielokrotny wybor', () => {
      component.config.writtenEnabledSignal.set(false);
      component.config.multipleChoiceEnabledSignal.set(true);
      component.config.trueFalseEnabledSignal.set(false);

      const valid: boolean = component.isValid;

      expect(valid).toBeTrue();
    });

    it('powinien zwrocic true gdy przynajmniej jeden typ jest zaznaczony - prawda/falsz', () => {
      component.config.writtenEnabledSignal.set(false);
      component.config.multipleChoiceEnabledSignal.set(false);
      component.config.trueFalseEnabledSignal.set(true);

      const valid: boolean = component.isValid;

      expect(valid).toBeTrue();
    });

    it('powinien zwrocic true gdy wszystkie typy sa zaznaczone', () => {
      component.config.writtenEnabledSignal.set(true);
      component.config.multipleChoiceEnabledSignal.set(true);
      component.config.trueFalseEnabledSignal.set(true);

      const valid: boolean = component.isValid;

      expect(valid).toBeTrue();
    });
  });

  describe('onStart', () => {
    it('powinien emitowac QuizConfig z poprawnymi wartosciami domyslnymi', () => {
      let emittedConfig: QuizConfig | undefined;
      component.startQuiz.subscribe((config: QuizConfig) => {
        emittedConfig = config;
      });

      component.onStart();

      expect(emittedConfig).toBeDefined();
      expect(emittedConfig!.setId).toBe(1);
      expect(emittedConfig!.questionCount).toBe(10);
      expect(emittedConfig!.questionTypes).toEqual(['written', 'multiple-choice', 'true-false']);
      expect(emittedConfig!.reversed).toBeFalse();
    });

    it('powinien emitowac QuizConfig z wybranymi typami pytan', () => {
      component.config.multipleChoiceEnabledSignal.set(false);
      component.config.trueFalseEnabledSignal.set(false);

      let emittedConfig: QuizConfig | undefined;
      component.startQuiz.subscribe((config: QuizConfig) => {
        emittedConfig = config;
      });

      component.onStart();

      expect(emittedConfig).toBeDefined();
      expect(emittedConfig!.questionTypes).toEqual(['written']);
    });

    it('powinien emitowac QuizConfig z odwroconym kierunkiem', () => {
      component.config.reversedSignal.set(true);

      let emittedConfig: QuizConfig | undefined;
      component.startQuiz.subscribe((config: QuizConfig) => {
        emittedConfig = config;
      });

      component.onStart();

      expect(emittedConfig).toBeDefined();
      expect(emittedConfig!.reversed).toBeTrue();
    });

    it('powinien emitowac QuizConfig z opcja "all" jako questionCount', () => {
      component.config.selectedCountSignal.set('all');

      let emittedConfig: QuizConfig | undefined;
      component.startQuiz.subscribe((config: QuizConfig) => {
        emittedConfig = config;
      });

      component.onStart();

      expect(emittedConfig).toBeDefined();
      expect(emittedConfig!.questionCount).toBe('all');
    });

    it('NIE powinien emitowac gdy formularz jest niepoprawny', () => {
      component.config.writtenEnabledSignal.set(false);
      component.config.multipleChoiceEnabledSignal.set(false);
      component.config.trueFalseEnabledSignal.set(false);

      let emitted: boolean = false;
      component.startQuiz.subscribe(() => {
        emitted = true;
      });

      component.onStart();

      expect(emitted).toBeFalse();
    });

    it('powinien emitowac QuizConfig z poprawnym setId z inputa', () => {
      componentRef.setInput('setId', 42);
      fixture.detectChanges();

      let emittedConfig: QuizConfig | undefined;
      component.startQuiz.subscribe((config: QuizConfig) => {
        emittedConfig = config;
      });

      component.onStart();

      expect(emittedConfig).toBeDefined();
      expect(emittedConfig!.setId).toBe(42);
    });
  });

  describe('onGoBack', () => {
    it('powinien emitowac zdarzenie goBack', () => {
      let emitted: boolean = false;
      component.goBack.subscribe(() => {
        emitted = true;
      });

      component.onGoBack();

      expect(emitted).toBeTrue();
    });
  });
});
