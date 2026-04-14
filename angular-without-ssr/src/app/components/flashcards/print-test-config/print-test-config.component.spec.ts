import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ComponentRef } from '@angular/core';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { PrintTestConfigComponent } from './print-test-config.component';
import { PrintTestConfig } from '../../../services/domain/print-test.service';

describe('PrintTestConfigComponent', () => {
  let component: PrintTestConfigComponent;
  let fixture: ComponentFixture<PrintTestConfigComponent>;
  let componentRef: ComponentRef<PrintTestConfigComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [
        PrintTestConfigComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl'], defaultLang: 'pl' }
        })
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(PrintTestConfigComponent);
    component = fixture.componentInstance;
    componentRef = fixture.componentRef;

    componentRef.setInput('setName', 'Angielski podstawy');
    componentRef.setInput('cardCount', 30);

    fixture.detectChanges();
  });

  it('powinien utworzyc komponent', () => {
    expect(component).toBeTruthy();
  });

  describe('domyslne wartosci sygnalow', () => {
    it('powinien miec pusty tytul (placeholder z setName)', () => {
      expect(component.titleSignal()).toBe('');
    });

    it('powinien miec selectedCount ustawiony na 20', () => {
      expect(component.config.selectedCountSignal()).toBe(20);
    });

    it('powinien miec wlaczone wpisywanie odpowiedzi', () => {
      expect(component.config.writtenEnabledSignal()).toBeTrue();
    });

    it('powinien miec wlaczony wielokrotny wybor', () => {
      expect(component.config.multipleChoiceEnabledSignal()).toBeTrue();
    });

    it('powinien miec wlaczone prawda/falsz', () => {
      expect(component.config.trueFalseEnabledSignal()).toBeTrue();
    });

    it('powinien miec wlaczone dopasowywanie', () => {
      expect(component.matchingEnabledSignal()).toBeTrue();
    });

    it('powinien miec kierunek normalny (reversed=false)', () => {
      expect(component.config.reversedSignal()).toBeFalse();
    });

    it('powinien miec wlaczony klucz odpowiedzi', () => {
      expect(component.includeAnswerKeySignal()).toBeTrue();
    });
  });

  describe('isValid', () => {
    it('powinien zwrocic false gdy zaden typ pytania nie jest zaznaczony', () => {
      component.config.writtenEnabledSignal.set(false);
      component.config.multipleChoiceEnabledSignal.set(false);
      component.config.trueFalseEnabledSignal.set(false);
      component.matchingEnabledSignal.set(false);

      expect(component.isValid).toBeFalse();
    });

    it('powinien zwrocic true gdy tylko wpisywanie jest zaznaczone', () => {
      component.config.writtenEnabledSignal.set(true);
      component.config.multipleChoiceEnabledSignal.set(false);
      component.config.trueFalseEnabledSignal.set(false);
      component.matchingEnabledSignal.set(false);

      expect(component.isValid).toBeTrue();
    });

    it('powinien zwrocic true gdy tylko dopasowywanie jest zaznaczone', () => {
      component.config.writtenEnabledSignal.set(false);
      component.config.multipleChoiceEnabledSignal.set(false);
      component.config.trueFalseEnabledSignal.set(false);
      component.matchingEnabledSignal.set(true);

      expect(component.isValid).toBeTrue();
    });

    it('powinien zwrocic true gdy wszystkie typy sa zaznaczone', () => {
      expect(component.isValid).toBeTrue();
    });
  });

  describe('onCountChange', () => {
    it('powinien ustawic wartosc w zakresie', () => {
      component.onCountChange(15);
      expect(component.config.selectedCountSignal()).toBe(15);
    });

    it('powinien ograniczyc wartosc do minimum 1', () => {
      component.onCountChange(0);
      expect(component.config.selectedCountSignal()).toBe(1);
    });

    it('powinien ograniczyc wartosc do maksimum cardCount', () => {
      component.onCountChange(100);
      expect(component.config.selectedCountSignal()).toBe(30);
    });
  });

  describe('toggleAll', () => {
    it('powinien przelaczac na "all"', () => {
      component.config.selectedCountSignal.set(10);
      component.toggleAll();
      expect(component.config.selectedCountSignal()).toBe('all');
    });

    it('powinien przelaczac z "all" na wartosc liczbowa', () => {
      component.config.selectedCountSignal.set('all');
      component.toggleAll();
      expect(component.config.selectedCountSignal()).toBe(20);
    });
  });

  describe('onPrint', () => {
    it('powinien emitowac PrintTestConfig z poprawnymi wartosciami domyslnymi', () => {
      let emittedConfig: PrintTestConfig | undefined;
      component.print.subscribe((config: PrintTestConfig) => {
        emittedConfig = config;
      });

      component.onPrint();

      expect(emittedConfig).toBeDefined();
      expect(emittedConfig!.title).toBe('Angielski podstawy');
      expect(emittedConfig!.questionCount).toBe(20);
      expect(emittedConfig!.questionTypes).toEqual(['written', 'multiple-choice', 'true-false']);
      expect(emittedConfig!.includeMatching).toBeTrue();
      expect(emittedConfig!.reversed).toBeFalse();
      expect(emittedConfig!.includeAnswerKey).toBeTrue();
    });

    it('powinien uzyc customowego tytulu gdy jest podany', () => {
      component.titleSignal.set('Mój sprawdzian');

      let emittedConfig: PrintTestConfig | undefined;
      component.print.subscribe((config: PrintTestConfig) => {
        emittedConfig = config;
      });

      component.onPrint();

      expect(emittedConfig!.title).toBe('Mój sprawdzian');
    });

    it('powinien uzyc nazwy zestawu gdy tytul jest pusty', () => {
      component.titleSignal.set('');

      let emittedConfig: PrintTestConfig | undefined;
      component.print.subscribe((config: PrintTestConfig) => {
        emittedConfig = config;
      });

      component.onPrint();

      expect(emittedConfig!.title).toBe('Angielski podstawy');
    });

    it('powinien emitowac z wybranymi typami pytan', () => {
      component.config.multipleChoiceEnabledSignal.set(false);
      component.config.trueFalseEnabledSignal.set(false);

      let emittedConfig: PrintTestConfig | undefined;
      component.print.subscribe((config: PrintTestConfig) => {
        emittedConfig = config;
      });

      component.onPrint();

      expect(emittedConfig!.questionTypes).toEqual(['written']);
    });

    it('powinien emitowac z reversed=true', () => {
      component.config.reversedSignal.set(true);

      let emittedConfig: PrintTestConfig | undefined;
      component.print.subscribe((config: PrintTestConfig) => {
        emittedConfig = config;
      });

      component.onPrint();

      expect(emittedConfig!.reversed).toBeTrue();
    });

    it('powinien emitowac z includeAnswerKey=false', () => {
      component.includeAnswerKeySignal.set(false);

      let emittedConfig: PrintTestConfig | undefined;
      component.print.subscribe((config: PrintTestConfig) => {
        emittedConfig = config;
      });

      component.onPrint();

      expect(emittedConfig!.includeAnswerKey).toBeFalse();
    });

    it('powinien emitowac z includeMatching=false', () => {
      component.matchingEnabledSignal.set(false);

      let emittedConfig: PrintTestConfig | undefined;
      component.print.subscribe((config: PrintTestConfig) => {
        emittedConfig = config;
      });

      component.onPrint();

      expect(emittedConfig!.includeMatching).toBeFalse();
    });

    it('powinien emitowac z opcja "all" jako questionCount', () => {
      component.config.selectedCountSignal.set('all');

      let emittedConfig: PrintTestConfig | undefined;
      component.print.subscribe((config: PrintTestConfig) => {
        emittedConfig = config;
      });

      component.onPrint();

      expect(emittedConfig!.questionCount).toBe('all');
    });

    it('NIE powinien emitowac gdy formularz jest niepoprawny', () => {
      component.config.writtenEnabledSignal.set(false);
      component.config.multipleChoiceEnabledSignal.set(false);
      component.config.trueFalseEnabledSignal.set(false);
      component.matchingEnabledSignal.set(false);

      let emitted = false;
      component.print.subscribe(() => { emitted = true; });

      component.onPrint();

      expect(emitted).toBeFalse();
    });
  });

  describe('onClose', () => {
    it('powinien emitowac zdarzenie close', () => {
      let emitted = false;
      component.close.subscribe(() => { emitted = true; });

      component.onClose();

      expect(emitted).toBeTrue();
    });
  });
});
