import { Component, OnInit, inject, signal, WritableSignal, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { forkJoin } from 'rxjs';
import { FlashcardSetApiService } from '../../services/flashcard-set-api.service';
import { FlashcardApiService } from '../../services/flashcard-api.service';
import { FlashcardSetDTO } from '../../../types';

interface QuizSetItem {
  set: FlashcardSetDTO;
  cardCount: number;
}

@Component({
  selector: 'app-quiz-list',
  imports: [ButtonModule],
  templateUrl: './quiz-list.component.html',
  styleUrls: ['./quiz-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizListComponent implements OnInit {
  private router: Router = inject(Router);
  private flashcardSetApiService: FlashcardSetApiService = inject(FlashcardSetApiService);
  private flashcardApiService: FlashcardApiService = inject(FlashcardApiService);

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

    this.flashcardSetApiService.getSets().subscribe({
      next: (sets: FlashcardSetDTO[]) => {
        if (sets.length === 0) {
          this.setsSignal.set([]);
          this.loadingSignal.set(false);
          return;
        }

        const countObservables = sets.map((set: FlashcardSetDTO) =>
          this.flashcardApiService.getFlashcards({ limit: 1, offset: 0, setId: set.id })
        );

        forkJoin(countObservables).subscribe({
          next: (responses) => {
            const items: QuizSetItem[] = sets.map((set: FlashcardSetDTO, i: number) => ({
              set,
              cardCount: responses[i].totalRecords
            }));
            this.setsSignal.set(items);
            this.loadingSignal.set(false);
          },
          error: () => {
            this.errorSignal.set('Nie udało się pobrać liczby fiszek.');
            this.loadingSignal.set(false);
          }
        });
      },
      error: () => {
        this.errorSignal.set('Nie udało się pobrać zestawów.');
        this.loadingSignal.set(false);
      }
    });
  }
}
