import { Component, ChangeDetectionStrategy, inject, signal, Signal, WritableSignal } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ExploreService } from '../../services/api/explore.service';
import { AuthorProfileDTO } from '../../../types';

@Component({
  selector: 'app-author-profile',
  imports: [RouterModule, TranslocoDirective],
  templateUrl: './author-profile.component.html',
  styleUrls: ['./author-profile.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthorProfileComponent {
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly exploreService: ExploreService = inject(ExploreService);
  private readonly t: TranslocoService = inject(TranslocoService);

  private readonly _profile: WritableSignal<AuthorProfileDTO | null> = signal<AuthorProfileDTO | null>(null);
  private readonly _loading: WritableSignal<boolean> = signal<boolean>(true);
  private readonly _error: WritableSignal<string | null> = signal<string | null>(null);

  protected readonly profile: Signal<AuthorProfileDTO | null> = this._profile.asReadonly();
  protected readonly loading: Signal<boolean> = this._loading.asReadonly();
  protected readonly error: Signal<string | null> = this._error.asReadonly();

  constructor() {
    const authorId: string | null = this.route.snapshot.paramMap.get('authorId');
    if (!authorId) {
      this._error.set(this.t.translate('authorProfile.missingAuthorId'));
      this._loading.set(false);
      return;
    }

    this.exploreService.getAuthorPublicSets(authorId).subscribe({
      next: (profile: AuthorProfileDTO) => {
        this._profile.set(profile);
        this._loading.set(false);
      },
      error: (err: unknown) => {
        const msg: string = err instanceof Error ? err.message : this.t.translate('authorProfile.loadError');
        this._error.set(msg);
        this._loading.set(false);
      },
    });
  }
}
