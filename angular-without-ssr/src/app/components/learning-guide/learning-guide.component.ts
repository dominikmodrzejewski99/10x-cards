import { Component, ChangeDetectionStrategy, signal, computed, WritableSignal, Signal } from '@angular/core';
import { RouterModule } from '@angular/router';

interface LearningArticle {
  id: string;
  icon: string;
  title: string;
  shortDescription: string;
  paragraphs: string[];
  keyTakeaway: string;
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'teal';
}

interface DkStage {
  label: string;
  description: string;
}

const DK_STAGES: DkStage[] = [
  { label: 'Nie wiem, że nie wiem', description: 'Początkujący — wysoka pewność siebie, niska kompetencja. Typowe po pierwszym kontakcie z tematem.' },
  { label: 'Szczyt pewności', description: 'Efekt Dunninga-Krugera w pełni — "to przecież proste!" Złudne poczucie kompetencji.' },
  { label: 'Dolina rozpaczy', description: 'Uświadomienie sobie skali niewiedzy. Moment, w którym wielu rezygnuje z nauki.' },
  { label: 'Droga oświecenia', description: 'Stopniowy wzrost kompetencji i pewności — opartej tym razem na realnej wiedzy.' },
  { label: 'Stabilna wiedza', description: 'Ekspertyza — pewność wynika z doświadczenia, ale jest niższa niż na "szczycie głupoty".' }
];

const ARTICLES: LearningArticle[] = [
  {
    id: 'spaced-repetition',
    icon: 'pi pi-calendar-clock',
    title: 'Powtarzanie w odstępach',
    shortDescription: 'Naukowa metoda planowania powtórek, która pozwala zapamiętać więcej, ucząc się mniej.',
    paragraphs: [
      'Powtarzanie w odstępach (ang. Spaced Repetition) to technika uczenia się, w której materiał jest powtarzany w coraz dłuższych odstępach czasu. Zamiast wkuwać wszystko na raz, rozdzielasz naukę na wiele sesji rozłożonych w czasie.',
      'Badania naukowe potwierdzają, że ta metoda jest jedną z najskuteczniejszych strategii zapamiętywania. Kluczem jest powtarzanie materiału tuż przed momentem, w którym zaczynasz go zapominać — tzw. "punkt optymalnej powtórki".',
      'Algorytm SM-2, na którym opiera się wiele nowoczesnych aplikacji do nauki (w tym Memlo), automatycznie oblicza optymalny moment kolejnej powtórki na podstawie Twojej oceny trudności materiału.',
      'Praktyczna wskazówka: ucz się regularnie, nawet jeśli to tylko 10-15 minut dziennie. Konsekwencja jest ważniejsza niż długość pojedynczej sesji.'
    ],
    keyTakeaway: 'Regularne, krótkie sesje powtórkowe są skuteczniejsze niż jednorazowe, długie sesje nauki.',
    color: 'blue'
  },
  {
    id: 'active-recall',
    icon: 'pi pi-bolt',
    title: 'Aktywne przywoływanie',
    shortDescription: 'Testowanie siebie zamiast biernego czytania — klucz do trwałego zapamiętywania.',
    paragraphs: [
      'Aktywne przywoływanie (ang. Active Recall) polega na aktywnym wydobywaniu informacji z pamięci, zamiast biernego przeglądania notatek. Gdy próbujesz odpowiedzieć na pytanie bez patrzenia na odpowiedź, Twój mózg tworzy silniejsze połączenia neuronalne.',
      'Badania pokazują, że studenci, którzy testują się z materiału, zapamiętują nawet 50% więcej niż ci, którzy jedynie go ponownie czytają. To zjawisko znane jest jako "efekt testowania".',
      'Fiszki są idealnym narzędziem do aktywnego przywoływania — widzisz pytanie (przód fiszki) i aktywnie próbujesz przywołać odpowiedź, zanim ją sprawdzisz.',
      'Wskazówka: nie zniechęcaj się, gdy nie pamiętasz odpowiedzi. Sam wysiłek przypominania wzmacnia pamięć, nawet jeśli nie udaje się przywołać informacji.'
    ],
    keyTakeaway: 'Wysiłek wkładany w przypominanie sobie informacji jest tym, co buduje trwałą pamięć.',
    color: 'purple'
  },
  {
    id: 'forgetting-curve',
    icon: 'pi pi-chart-line',
    title: 'Krzywa zapominania Ebbinghausa',
    shortDescription: 'Dlaczego zapominamy i jak powtórki mogą spłaszczyć krzywą zapominania.',
    paragraphs: [
      'W 1885 roku Hermann Ebbinghaus odkrył, że nowo nauczone informacje są zapominane w przewidywalny sposób. Bez powtórek zapominamy około 70% materiału w ciągu 24 godzin i ponad 90% w ciągu tygodnia.',
      'Krzywa zapominania pokazuje wykładniczy spadek retencji pamięci w czasie. Jednak każda powtórka "resetuje" krzywą i spowalnia tempo zapominania — po kilku powtórkach informacja zostaje w pamięci długoterminowej.',
      'To odkrycie jest fundamentem dla metody powtarzania w odstępach. Pierwsza powtórka powinna nastąpić już następnego dnia, kolejna po kilku dniach, potem po tygodniu, miesiącu itd.',
      'Dlatego w Memlo algorytm planuje powtórki w rosnących odstępach — aby złapać Cię tuż przed momentem zapomnienia i wzmocnić ślad pamięciowy.'
    ],
    keyTakeaway: 'Bez powtórek zapominasz 70% w ciągu doby. Regularne powtórki mogą zatrzymać niemal 100% wiedzy.',
    color: 'orange'
  },
  {
    id: 'dunning-kruger',
    icon: 'pi pi-exclamation-triangle',
    title: 'Efekt Dunninga-Krugera',
    shortDescription: 'Dlaczego początkujący przeceniają swoją wiedzę, a eksperci ją niedoceniają.',
    paragraphs: [
      'Efekt Dunninga-Krugera to zjawisko psychologiczne, w którym osoby z niskim poziomem kompetencji w danej dziedzinie przeceniają swoje umiejętności, podczas gdy osoby o wysokich kompetencjach mają tendencję do ich niedoceniania.',
      'W kontekście nauki oznacza to, że na początku możesz czuć, iż "wiesz już wszystko" po przeczytaniu materiału raz. To złudne poczucie kompetencji jest niebezpieczne — prowadzi do porzucenia nauki zbyt wcześnie.',
      'Rozpoznanie tego efektu w sobie to pierwszy krok do bardziej skutecznej nauki. Gdy czujesz, że temat jest "łatwy", przetestuj się — możesz być zaskoczony, ile naprawdę pamiętasz.',
      'Fiszki i aktywne przywoływanie pomagają przełamać ten efekt, bo zmuszają Cię do udowodnienia swojej wiedzy, zamiast polegania na złudnym poczuciu znajomości tematu.'
    ],
    keyTakeaway: 'Jeśli czujesz, że "to proste" — przetestuj się. Prawdziwa wiedza ujawnia się dopiero podczas próby jej przywołania.',
    color: 'red'
  },
  {
    id: 'feynman-technique',
    icon: 'pi pi-comments',
    title: 'Technika Feynmana',
    shortDescription: 'Wyjaśnij to prosto — jeśli nie potrafisz, to znaczy że jeszcze tego nie rozumiesz.',
    paragraphs: [
      'Richard Feynman, laureat Nagrody Nobla z fizyki, był znany z umiejętności wyjaśniania skomplikowanych zagadnień w prosty sposób. Jego technika nauki opiera się na czterech krokach.',
      'Krok 1: Wybierz temat i zapisz wszystko, co o nim wiesz. Krok 2: Wyjaśnij go tak, jakbyś tłumaczył to dziecku — prostym językiem, bez żargonu. Krok 3: Zidentyfikuj luki w swoim wyjaśnieniu i wróć do materiału źródłowego. Krok 4: Uprość i udoskonal swoje wyjaśnienie.',
      'Ta metoda jest szczególnie skuteczna, bo zmusza do głębokiego zrozumienia zamiast powierzchownego zapamiętywania. Jeśli nie potrafisz wyjaśnić czegoś prostymi słowami, to nie rozumiesz tego wystarczająco dobrze.',
      'Możesz wykorzystać fiszki do tego celu — na przodzie zapisz pytanie, a na odwrocie wyjaśnienie własnymi słowami, tak proste, jak to możliwe.'
    ],
    keyTakeaway: 'Prawdziwe zrozumienie to umiejętność wytłumaczenia tematu w prostych słowach.',
    color: 'teal'
  },
  {
    id: 'pomodoro',
    icon: 'pi pi-stopwatch',
    title: 'Technika Pomodoro',
    shortDescription: 'Zarządzaj czasem nauki w 25-minutowych blokach z przerwami na regenerację.',
    paragraphs: [
      'Technika Pomodoro, opracowana przez Francesco Cirillo w latach 80., dzieli pracę na 25-minutowe bloki (zwane "pomodoro"), oddzielone 5-minutowymi przerwami. Po czterech blokach robisz dłuższą przerwę (15-30 minut).',
      'Dlaczego to działa? Nasz mózg nie jest przystosowany do wielogodzinnej, nieprzerwanej koncentracji. Krótkie przerwy zapobiegają zmęczeniu poznawczemu i utrzymują wysoki poziom uwagi przez dłuższy czas.',
      'Badania pokazują, że regularne przerwy nie tylko poprawiają koncentrację, ale też wspierają konsolidację pamięci — proces, w którym mózg utrwala nowo nauczone informacje.',
      'Połącz Pomodoro z nauką z fiszek: jeden blok 25 minut to idealny czas na sesję powtórkową. Wystarczająco długo, żeby zrobić postęp, ale nie na tyle długo, żeby się zmęczyć.'
    ],
    keyTakeaway: '25 minut skupionej nauki + 5 minut przerwy = więcej efektywnego czasu nauki niż wielogodzinne maratony.',
    color: 'green'
  },
  {
    id: 'interleaving',
    icon: 'pi pi-arrows-h',
    title: 'Przeplatanie tematów',
    shortDescription: 'Mieszanie różnych zagadnień podczas jednej sesji nauki zamiast skupiania się na jednym.',
    paragraphs: [
      'Przeplatanie (ang. interleaving) to strategia polegająca na naprzemiennym ćwiczeniu różnych umiejętności lub tematów w ramach jednej sesji nauki, zamiast skupiania się na jednym zagadnieniu (tzw. "blokowanie").',
      'Choć przeplatanie może wydawać się trudniejsze i mniej komfortowe, badania jednoznacznie pokazują, że prowadzi do lepszego długoterminowego zapamiętywania i umiejętności transferu wiedzy do nowych sytuacji.',
      'Dzieje się tak, ponieważ przeplatanie zmusza mózg do ciągłego "przełączania się" między kontekstami, co wzmacnia zdolność rozróżniania podobnych koncepcji i wybierania właściwej strategii.',
      'W praktyce: zamiast powtarzać fiszki z jednego zestawu przez godzinę, pomieszaj kilka zestawów z różnych tematów. Twoje wyniki na początku mogą być gorsze, ale długoterminowa retencja będzie znacznie lepsza.'
    ],
    keyTakeaway: 'Mieszanie tematów podczas nauki jest trudniejsze, ale prowadzi do głębszego i trwalszego zrozumienia.',
    color: 'blue'
  },
  {
    id: 'growth-mindset',
    icon: 'pi pi-expand',
    title: 'Nastawienie na rozwój',
    shortDescription: 'Twój mózg jest plastyczny — inteligencja nie jest stała, można ją rozwijać.',
    paragraphs: [
      'Psycholożka Carol Dweck wyróżniła dwa typy nastawienia: stałe ("jestem albo zdolny, albo nie") i wzrostowe ("mogę się rozwinąć poprzez wysiłek"). Osoby z nastawieniem na rozwój osiągają znacznie lepsze wyniki w nauce.',
      'Neuroplastyczność mózgu potwierdza to naukowo — nasz mózg fizycznie się zmienia i tworzy nowe połączenia neuronalne za każdym razem, gdy się czegoś uczymy. Dosłownie stajesz się "mądrzejszy" z każdą sesją nauki.',
      'Kluczowe jest podejście do błędów. Gdy nie pamiętasz odpowiedzi na fiszkę, nie traktuj tego jako porażki — to sygnał, że Twój mózg potrzebuje jeszcze jednej powtórki, i każda taka powtórka wzmacnia ślad pamięciowy.',
      'Zamiast mówić "nie jestem w stanie się tego nauczyć", powiedz "jeszcze się tego nie nauczyłem". Ta drobna zmiana w myśleniu ma ogromny wpływ na motywację i wytrwałość.'
    ],
    keyTakeaway: 'Twoja inteligencja nie jest stała — każdy wysiłek wkładany w naukę fizycznie wzmacnia Twój mózg.',
    color: 'purple'
  }
];

@Component({
  selector: 'app-learning-guide',
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './learning-guide.component.html',
  styleUrls: ['./learning-guide.component.scss']
})
export class LearningGuideComponent {
  public articles: LearningArticle[] = ARTICLES;
  public dkStages: DkStage[] = DK_STAGES;

  public expandedIdsSignal: WritableSignal<Set<string>> = signal<Set<string>>(new Set());
  public showRepetitionsSignal: WritableSignal<boolean> = signal<boolean>(false);
  public dkActiveStageSignal: WritableSignal<number | null> = signal<number | null>(null);

  public readonly expandedCountSignal: Signal<number> = computed<number>(() => this.expandedIdsSignal().size);

  public isExpanded(articleId: string): boolean {
    return this.expandedIdsSignal().has(articleId);
  }

  public toggleArticle(articleId: string): void {
    this.expandedIdsSignal.update((ids: Set<string>) => {
      const next: Set<string> = new Set(ids);
      if (next.has(articleId)) {
        next.delete(articleId);
      } else {
        next.add(articleId);
      }
      return next;
    });
  }

  public expandAll(): void {
    const allIds: Set<string> = new Set(ARTICLES.map((a: LearningArticle) => a.id));
    this.expandedIdsSignal.set(allIds);
  }

  public collapseAll(): void {
    this.expandedIdsSignal.set(new Set());
  }

  public toggleRepetitions(): void {
    this.showRepetitionsSignal.update((v: boolean) => !v);
  }

  public setDkStage(stage: number | null): void {
    this.dkActiveStageSignal.set(stage);
  }
}
