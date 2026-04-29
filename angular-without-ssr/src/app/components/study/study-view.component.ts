import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  Injector,
  OnDestroy,
  OnInit,
  signal,
  WritableSignal
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { StudyFacadeService } from '../../services/facades/study-facade.service';
import { ReviewQuality } from '../../../types';
import { FlashcardFlipComponent } from './flashcard-flip/flashcard-flip.component';
import { SyncStatusComponent } from '../../shared/components/sync-status/sync-status.component';
import { NgxSkeletonLoaderModule } from 'ngx-skeleton-loader';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { ConfirmService } from '../../shared/services/confirm.service';
import { LoggerService } from '../../services/infrastructure/logger.service';
import { WebSpeechService } from '../../services/infrastructure/web-speech.service';

@Component({
  selector: 'app-study-view',
  imports: [RouterModule, FormsModule, FlashcardFlipComponent, SyncStatusComponent, NgxSkeletonLoaderModule, TranslocoDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './study-view.component.html',
  styleUrls: ['./study-view.component.scss'],
  host: {
    '(window:keydown)': 'handleKeyboard($event)',
    '(document:fullscreenchange)': 'onFullscreenChange()'
  }
})
export class StudyViewComponent implements OnInit, OnDestroy {
  public readonly facade: StudyFacadeService = inject(StudyFacadeService);
  private readonly injector: Injector = inject(Injector);
  private readonly confirmService: ConfirmService = inject(ConfirmService);
  private readonly t: TranslocoService = inject(TranslocoService);
  private readonly logger: LoggerService = inject(LoggerService);
  private readonly webSpeech: WebSpeechService = inject(WebSpeechService);
  private readonly queryParams = toSignal(inject(ActivatedRoute).queryParams, { initialValue: {} as Record<string, string> });

  public isFullscreenSignal: WritableSignal<boolean> = signal<boolean>(false);
  public showSetModalSignal: WritableSignal<boolean> = signal<boolean>(false);

  public ngOnInit(): void {
    this.facade.loadSets();
    effect(() => {
      const params = this.queryParams();
      const setId: number | null = params['setId'] ? Number(params['setId']) : null;
      this.facade.selectSet(setId);
    }, { injector: this.injector });
    effect(() => {
      const flipped: boolean = this.facade.isFlippedSignal();
      if (!flipped) {
        this.webSpeech.stop();
        return;
      }
      if (this.facade.displayBackAudioSignal()) {
        return;
      }
      const text: string = this.facade.displayBackSignal();
      if (!text) return;
      this.webSpeech.speak(text, this.facade.displayBackLanguageSignal());
    }, { injector: this.injector });
  }

  public ngOnDestroy(): void {
    this.webSpeech.stop();
    this.facade.destroy();
  }

  public onFullscreenChange(): void {
    this.isFullscreenSignal.set(!!document.fullscreenElement);
  }

  public async onSetChange(setId: number | null): Promise<void> {
    const hasProgress: boolean = this.facade.currentIndexSignal() > 0 && !this.facade.isSessionCompleteSignal();
    if (hasProgress) {
      const confirmed: boolean = await this.confirmService.confirm({
        message: this.t.translate('study.confirmSetChange'),
        header: this.t.translate('study.confirmSetChangeTitle'),
        icon: 'pi pi-exclamation-triangle',
        acceptLabel: this.t.translate('toasts.yes'),
        rejectLabel: this.t.translate('toasts.no'),
        acceptClass: 'danger'
      });
      if (!confirmed) return;
    }
    this.facade.selectSet(setId);
  }

  public handleKeyboard(event: KeyboardEvent): void {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
      return;
    }
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    if (this.facade.isSessionCompleteSignal() || this.facade.savingSignal()) return;

    switch (event.key) {
      case ' ':
        event.preventDefault();
        if (!this.facade.isFlippedSignal()) {
          this.facade.flip();
        }
        break;
      case '1':
        if (this.facade.isFlippedSignal()) {
          this.facade.answer(4);
        }
        break;
      case '2':
        if (this.facade.isFlippedSignal()) {
          this.facade.answer(3);
        }
        break;
      case '3':
        if (this.facade.isFlippedSignal()) {
          this.facade.answer(1);
        }
        break;
      case 'f':
      case 'F':
        if (!this.showSetModalSignal()) {
          this.toggleFullscreen();
        }
        break;
      case 's':
      case 'S':
        if (this.facade.isFlippedSignal() && !this.facade.displayBackAudioSignal()) {
          const text: string = this.facade.displayBackSignal();
          if (text) {
            this.webSpeech.stop();
            this.webSpeech.speak(text, this.facade.displayBackLanguageSignal());
          }
        }
        break;
      case 'Escape':
        if (this.showSetModalSignal()) {
          this.showSetModalSignal.set(false);
        }
        break;
    }
  }

  public openSetModal(): void {
    this.facade.updateSetSearch('');
    this.showSetModalSignal.set(true);
  }

  public selectSetFromModal(setId: number | null): void {
    this.showSetModalSignal.set(false);
    if (setId !== this.facade.selectedSetIdSignal()) {
      this.facade.selectSet(setId);
    }
  }

  public toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err: unknown) => {
        this.logger.warn('StudyViewComponent.requestFullscreen', String(err));
      });
      this.isFullscreenSignal.set(true);
    } else {
      document.exitFullscreen().catch((err: unknown) => {
        this.logger.warn('StudyViewComponent.exitFullscreen', String(err));
      });
      this.isFullscreenSignal.set(false);
    }
  }
}
