import { Component, input, InputSignal, signal, OnInit, OnDestroy, effect } from '@angular/core';

interface Fact {
  icon: string;
  text: string;
}

interface FactSet {
  title: string;
  facts: Fact[];
}

@Component({
  selector: 'app-loading-indicator',
  templateUrl: './loading-indicator.component.html',
  styleUrls: ['./loading-indicator.component.scss']
})
export class LoadingIndicatorComponent implements OnInit, OnDestroy {
  public isLoadingSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'isLoading' });

  private messages = [
    'Analizuję tekst...',
    'Wyodrębniam kluczowe pojęcia...',
    'Generuję pytania i odpowiedzi...',
    'Dopracowuję fiszki...',
    'Już prawie gotowe...'
  ];

  private factSets: FactSet[] = [
    {
      title: 'Czy wiesz, że...',
      facts: [
        { icon: 'pi-chart-line', text: 'Bez powtórek <strong>zapominamy 70% materiału</strong> w ciągu 24 godzin — to odkrycie Hermanna Ebbinghausa z 1885 roku.' },
        { icon: 'pi-replay', text: 'Powtórki w rosnących odstępach czasu <strong>(spaced repetition)</strong> pozwalają zapamiętać materiał nawet na lata.' },
        { icon: 'pi-bolt', text: 'Już <strong>4–5 powtórek</strong> w odpowiednich momentach wystarczy, by przenieść wiedzę do pamięci długotrwałej.' }
      ]
    },
    {
      title: 'Czy wiesz, że...',
      facts: [
        { icon: 'pi-brain', text: 'Aktywne przywoływanie informacji <strong>(active recall)</strong> jest 2-3x skuteczniejsze niż ponowne czytanie notatek.' },
        { icon: 'pi-clock', text: 'Najlepszy czas na pierwszą powtórkę to <strong>24 godziny</strong> po pierwszym kontakcie z materiałem.' },
        { icon: 'pi-star', text: 'Uczenie się w <strong>krótkich, regularnych sesjach</strong> jest skuteczniejsze niż długie maratony nauki.' }
      ]
    },
    {
      title: 'Czy wiesz, że...',
      facts: [
        { icon: 'pi-book', text: '<strong>Technika Feynmana</strong> — wyjaśnianie tematu własnymi słowami — to jeden z najlepszych sposobów na głębokie zrozumienie.' },
        { icon: 'pi-sync', text: 'Przeplatanie różnych tematów <strong>(interleaving)</strong> sprawia, że nauka jest trudniejsza, ale efekty są trwalsze.' },
        { icon: 'pi-heart', text: 'Sen odgrywa kluczową rolę w <strong>konsolidacji pamięci</strong> — ucz się przed snem, a zapamiętasz więcej!' }
      ]
    }
  ];

  statusText = signal(this.messages[0]);
  factTitle = signal(this.factSets[0].title);
  displayedFacts = signal<Fact[]>(this.factSets[0].facts);
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private messageIndex = 0;

  constructor() {
    effect(() => {
      if (this.isLoadingSignal()) {
        this.pickRandomFacts();
        this.startRotation();
      } else {
        this.stopRotation();
      }
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.stopRotation();
  }

  private pickRandomFacts(): void {
    const idx = Math.floor(Math.random() * this.factSets.length);
    const set = this.factSets[idx];
    this.factTitle.set(set.title);
    this.displayedFacts.set(set.facts);
  }

  private startRotation(): void {
    this.messageIndex = 0;
    this.statusText.set(this.messages[0]);
    this.intervalId = setInterval(() => {
      this.messageIndex = Math.min(this.messageIndex + 1, this.messages.length - 1);
      this.statusText.set(this.messages[this.messageIndex]);
    }, 6000);
  }

  private stopRotation(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
