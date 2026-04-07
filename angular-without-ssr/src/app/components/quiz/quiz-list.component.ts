import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { Component, OnInit, inject, signal, WritableSignal, ChangeDetectionStrategy, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { FlashcardSetApiService } from '../../services/flashcard-set-api.service';
import { FlashcardSetDTO } from '../../../types';

interface QuizSetItem {
  set: FlashcardSetDTO;
  cardCount: number;
}

@Component({
  selector: 'app-quiz-list',
  imports: [NgxSkeletonLoaderModule, TranslocoDirective],
  templateUrl: './quiz-list.component.html',
  styleUrls: ['./quiz-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizListComponent implements OnInit {
  private router: Router = inject(Router);
  private flashcardSetApiService: FlashcardSetApiService = inject(FlashcardSetApiService);
  private destroyRef: DestroyRef = inject(DestroyRef);
  private t: TranslocoService = inject(TranslocoService);

  public setsSignal: WritableSignal<QuizSetItem[]> = signal<QuizSetItem[]>([]);
  public loadingSignal: WritableSignal<boolean> = signal<boolean>(true);
  public errorSignal: WritableSignal<string | null> = signal<string | null>(null);

  public ngOnInit(): void {
    this.loadSets();
  }

  public onStartQuiz(setId: number): void {
    this.router.navigate(['/quiz', setId]);
  }

  public onGoToSets(): void {
    this.router.navigate(['/sets']);
  }

  private loadSets(): void {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    this.flashcardSetApiService.getSetsWithCardCount().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (items) => {
        this.setsSignal.set(items);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.errorSignal.set(this.t.translate('quiz.errors.loadSetsFailed'));
        this.loadingSignal.set(false);
      }
    });
  }
}
