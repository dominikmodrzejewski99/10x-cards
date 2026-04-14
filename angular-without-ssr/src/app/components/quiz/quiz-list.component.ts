import { TranslocoDirective } from '@jsverse/transloco';
import { Component, OnInit, inject, ChangeDetectionStrategy } from '@angular/core';
import { Router } from '@angular/router';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { QuizFacadeService } from '../../services/facades/quiz-facade.service';

@Component({
  selector: 'app-quiz-list',
  imports: [NgxSkeletonLoaderModule, TranslocoDirective],
  templateUrl: './quiz-list.component.html',
  styleUrls: ['./quiz-list.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class QuizListComponent implements OnInit {
  private router: Router = inject(Router);
  public readonly facade: QuizFacadeService = inject(QuizFacadeService);

  public ngOnInit(): void {
    this.facade.loadQuizSets();
  }

  public onStartQuiz(setId: number): void {
    this.router.navigate(['/quiz', setId]);
  }

  public onGoToSets(): void {
    this.router.navigate(['/sets']);
  }
}
