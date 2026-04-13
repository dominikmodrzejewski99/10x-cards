import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterModule } from '@angular/router';

/**
 * Public landing page describing the partner program to potential creators.
 *
 * Intentionally static (no transloco, no signals, no async) — the content is
 * marketing copy that rarely changes, audience is mostly PL-speaking, and
 * SEO benefits from server-rendered plain HTML. If we ever ship full i18n
 * for marketing content, migrate this to transloco alongside landing-page.
 *
 * Route: /partners (no authGuard — anyone can read it).
 */
@Component({
  selector: 'app-partners-info',
  imports: [RouterModule],
  templateUrl: './partners-info.component.html',
  styleUrls: ['./partners-info.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PartnersInfoComponent {}
