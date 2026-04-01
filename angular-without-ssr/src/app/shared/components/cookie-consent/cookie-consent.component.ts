import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslocoDirective } from '@jsverse/transloco';
import { CookieConsentService } from '../../../services/cookie-consent.service';

@Component({
  selector: 'app-cookie-consent',
  imports: [RouterModule, FormsModule, TranslocoDirective],
  templateUrl: './cookie-consent.component.html',
  styleUrls: ['./cookie-consent.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class CookieConsentComponent {
  readonly consentService = inject(CookieConsentService);
  readonly showSettings = signal(false);
  readonly analyticsEnabled = signal(true);

  acceptAll(): void {
    this.consentService.acceptAll();
  }

  rejectNonEssential(): void {
    this.consentService.rejectNonEssential();
  }

  saveCustom(): void {
    this.consentService.saveCustom({
      necessary: true,
      analytics: this.analyticsEnabled()
    });
  }

  toggleSettings(): void {
    this.showSettings.update(v => !v);
  }
}
