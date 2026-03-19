import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { LanguageTestResultsService } from '../../services/language-test-results.service';
import { FlashcardSetApiService } from '../../services/flashcard-set-api.service';
import { FlashcardApiService } from '../../services/flashcard-api.service';
import { LanguageTestResultDTO, TestLevel } from '../../../types';
import { switchMap } from 'rxjs';

@Component({
  selector: 'app-language-test-results',
  standalone: true,
  imports: [RouterModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './language-test-results.component.html',
  styleUrl: './language-test-results.component.scss'
})
export class LanguageTestResultsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private resultsService = inject(LanguageTestResultsService);
  private setApi = inject(FlashcardSetApiService);
  private flashcardApi = inject(FlashcardApiService);

  result = signal<LanguageTestResultDTO | null>(null);
  loading = signal(true);
  generatingFlashcards = signal(false);
  flashcardsGenerated = signal(false);
  error = signal<string | null>(null);

  categories = computed(() => {
    const r = this.result();
    if (!r) return [];
    return Object.entries(r.category_breakdown).map(([name, data]) => ({
      name,
      correct: data.correct,
      total: data.total,
      percentage: Math.round((data.correct / data.total) * 100)
    }));
  });

  ngOnInit(): void {
    const level = this.route.snapshot.paramMap.get('level') as TestLevel;
    if (!level || !['b1', 'b2-fce', 'c1-cae'].includes(level)) {
      this.router.navigate(['/language-test']);
      return;
    }

    this.resultsService.getLatestResult(level).subscribe({
      next: result => {
        if (!result) {
          this.router.navigate(['/language-test']);
          return;
        }
        this.result.set(result);
        this.flashcardsGenerated.set(result.generated_set_id !== null);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Nie udało się załadować wyników.');
        this.loading.set(false);
      }
    });
  }

  generateFlashcards(): void {
    const r = this.result();
    if (!r || r.wrong_answers.length === 0) return;

    this.generatingFlashcards.set(true);

    const today = new Date().toISOString().split('T')[0];
    const levelLabel = r.level === 'b1' ? 'B1' : r.level === 'b2-fce' ? 'B2 FCE' : 'C1 CAE';

    this.setApi.createSet({
      name: `Błędy ${levelLabel} — ${today}`,
      description: `Fiszki z błędnych odpowiedzi w teście ${levelLabel}`
    }).pipe(
      switchMap(set => {
        const proposals = r.wrong_answers.map(wa => ({
          front: wa.front,
          back: wa.back,
          source: 'test' as const
        }));
        return this.flashcardApi.createFlashcards(proposals, set.id).pipe(
          switchMap(() => this.resultsService.updateGeneratedSetId(r.id, set.id))
        );
      })
    ).subscribe({
      next: () => {
        this.flashcardsGenerated.set(true);
        this.generatingFlashcards.set(false);
      },
      error: () => {
        this.error.set('Nie udało się utworzyć fiszek. Spróbuj ponownie.');
        this.generatingFlashcards.set(false);
      }
    });
  }

  getLevelLabel(): string {
    const r = this.result();
    if (!r) return '';
    if (r.level === 'b1') return 'B1 Preliminary';
    if (r.level === 'b2-fce') return 'B2 First (FCE)';
    return 'C1 Advanced (CAE)';
  }
}
