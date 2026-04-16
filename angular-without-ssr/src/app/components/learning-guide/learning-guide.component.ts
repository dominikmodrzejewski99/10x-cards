import { TranslocoDirective } from '@jsverse/transloco';
import { Component, ChangeDetectionStrategy, signal, computed, WritableSignal, Signal } from '@angular/core';
import { RouterModule } from '@angular/router';

interface LearningArticle {
  id: string;
  icon: string;
  /** Translation key fragment under learningGuide.articles.* */
  key: string;
  paragraphKeys: string[];
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'teal';
}

interface DkStageRef {
  /** 1-based stage number for translation key: dkStages.stage{N}Label / stage{N}Description */
  stageNumber: number;
}

const DK_STAGE_REFS: DkStageRef[] = [
  { stageNumber: 1 },
  { stageNumber: 2 },
  { stageNumber: 3 },
  { stageNumber: 4 },
  { stageNumber: 5 }
];

const ARTICLES: LearningArticle[] = [
  {
    id: 'spaced-repetition',
    icon: 'pi pi-calendar-clock',
    key: 'spacedRepetition',
    paragraphKeys: ['paragraph1', 'paragraph2', 'paragraph3', 'paragraph4'],
    color: 'blue'
  },
  {
    id: 'active-recall',
    icon: 'pi pi-bolt',
    key: 'activeRecall',
    paragraphKeys: ['paragraph1', 'paragraph2', 'paragraph3', 'paragraph4'],
    color: 'purple'
  },
  {
    id: 'forgetting-curve',
    icon: 'pi pi-chart-line',
    key: 'forgettingCurve',
    paragraphKeys: ['paragraph1', 'paragraph2', 'paragraph3', 'paragraph4'],
    color: 'orange'
  },
  {
    id: 'dunning-kruger',
    icon: 'pi pi-exclamation-triangle',
    key: 'dunningKruger',
    paragraphKeys: ['paragraph1', 'paragraph2', 'paragraph3', 'paragraph4'],
    color: 'red'
  },
  {
    id: 'feynman-technique',
    icon: 'pi pi-comments',
    key: 'feynmanTechnique',
    paragraphKeys: ['paragraph1', 'paragraph2', 'paragraph3', 'paragraph4'],
    color: 'teal'
  },
  {
    id: 'pomodoro',
    icon: 'pi pi-stopwatch',
    key: 'pomodoro',
    paragraphKeys: ['paragraph1', 'paragraph2', 'paragraph3', 'paragraph4'],
    color: 'green'
  },
  {
    id: 'interleaving',
    icon: 'pi pi-arrows-h',
    key: 'interleaving',
    paragraphKeys: ['paragraph1', 'paragraph2', 'paragraph3', 'paragraph4'],
    color: 'blue'
  },
  {
    id: 'growth-mindset',
    icon: 'pi pi-expand',
    key: 'growthMindset',
    paragraphKeys: ['paragraph1', 'paragraph2', 'paragraph3', 'paragraph4'],
    color: 'purple'
  }
];

@Component({
  selector: 'app-learning-guide',
  imports: [RouterModule, TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './learning-guide.component.html',
  styleUrls: ['./learning-guide.component.scss']
})
export class LearningGuideComponent {
  public articles: LearningArticle[] = ARTICLES;
  public dkStageRefs: DkStageRef[] = DK_STAGE_REFS;

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
