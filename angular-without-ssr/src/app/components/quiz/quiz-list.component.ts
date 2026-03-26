import { Component, OnInit, inject, signal, WritableSignal, ChangeDetectionStrategy } from '@angular/core';
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
  imports: [NgxSkeletonLoaderModule],
  templateUrl: './quiz-list.component.html',
  styleUrls: ['./quiz-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizListComponent implements OnInit {
  private router: Router = inject(Router);
  private flashcardSetApiService: FlashcardSetApiService = inject(FlashcardSetApiService);

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

    this.flashcardSetApiService.getSetsWithCardCount().subscribe({
      next: (items) => {
        this.setsSignal.set(items);
        this.loadingSignal.set(false);
      },
      error: () => {
        this.errorSignal.set('Nie udało się pobrać zestawów.');
        this.loadingSignal.set(false);
      }
    });
  }
}
