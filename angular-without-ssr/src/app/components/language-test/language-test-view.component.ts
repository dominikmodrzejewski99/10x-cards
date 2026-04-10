import { TranslocoDirective } from '@jsverse/transloco';
import { Component, ChangeDetectionStrategy, inject, OnInit, OnDestroy, effect } from '@angular/core';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { LanguageTestFacadeService } from '../../services/language-test-facade.service';
import { TestLevel } from '../../../types';

@Component({
  selector: 'app-language-test-view',
  imports: [FormsModule, RouterModule, NgxSkeletonLoaderModule, TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './language-test-view.component.html',
  styleUrl: './language-test-view.component.scss',
  host: {
    '(document:keydown)': 'onKeydown($event)'
  }
})
export class LanguageTestViewComponent implements OnInit, OnDestroy {
  public readonly facade: LanguageTestFacadeService = inject(LanguageTestFacadeService);

  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);

  public ngOnInit(): void {
    const level: string | null = this.route.snapshot.paramMap.get('level');
    if (!level || !['b1', 'b2-fce', 'c1-cae'].includes(level)) {
      this.router.navigate(['/language-test']);
      return;
    }

    this.facade.loadTest(level as TestLevel);

    effect(() => {
      const completed = this.facade.completedResultSignal();
      if (completed) {
        if (completed.state) {
          this.router.navigate(completed.route, { state: completed.state });
        } else {
          this.router.navigate(completed.route);
        }
      }
    });
  }

  public onKeydown(event: KeyboardEvent): void {
    const prevented: boolean = this.facade.handleKeydown(event.key);
    if (prevented) {
      event.preventDefault();
    }
  }

  public next(): void {
    this.facade.next();
  }

  public ngOnDestroy(): void {
    this.facade.reset();
  }
}
