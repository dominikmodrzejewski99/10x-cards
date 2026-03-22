import {
  Component, ChangeDetectionStrategy, input, InputSignal,
  WritableSignal, signal, OnDestroy, ElementRef, viewChild, Signal, computed
} from '@angular/core';

@Component({
  selector: 'app-audio-player',
  imports: [],
  templateUrl: './audio-player.component.html',
  styleUrls: ['./audio-player.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class AudioPlayerComponent implements OnDestroy {
  public audioUrlSignal: InputSignal<string> = input.required<string>({ alias: 'audioUrl' });
  public compactSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'compact' });

  public playingSignal: WritableSignal<boolean> = signal<boolean>(false);
  public progressSignal: WritableSignal<number> = signal<number>(0);
  public currentTimeSignal: WritableSignal<number> = signal<number>(0);
  public durationSignal: WritableSignal<number> = signal<number>(0);

  public readonly durationTextSignal: Signal<string> = computed<string>(() => {
    const dur: number = this.durationSignal();
    return this.formatTime(dur);
  });

  public readonly currentTimeTextSignal: Signal<string> = computed<string>(() => {
    return this.formatTime(this.currentTimeSignal());
  });

  private audioRef: Signal<ElementRef<HTMLAudioElement> | undefined> = viewChild<ElementRef<HTMLAudioElement>>('audioEl');

  public onLoadedMetadata(): void {
    const audio: HTMLAudioElement | undefined = this.audioRef()?.nativeElement;
    if (audio) {
      this.durationSignal.set(audio.duration);
    }
  }

  public onTimeUpdate(): void {
    const audio: HTMLAudioElement | undefined = this.audioRef()?.nativeElement;
    if (audio && audio.duration) {
      this.currentTimeSignal.set(audio.currentTime);
      this.progressSignal.set((audio.currentTime / audio.duration) * 100);
    }
  }

  public onEnded(): void {
    this.playingSignal.set(false);
    this.progressSignal.set(0);
    this.currentTimeSignal.set(0);
  }

  public togglePlay(): void {
    const audio: HTMLAudioElement | undefined = this.audioRef()?.nativeElement;
    if (!audio) return;

    if (this.playingSignal()) {
      audio.pause();
      this.playingSignal.set(false);
    } else {
      audio.play().catch(() => { /* browser autoplay policy */ });
      this.playingSignal.set(true);
    }
  }

  public onProgressClick(event: MouseEvent): void {
    const audio: HTMLAudioElement | undefined = this.audioRef()?.nativeElement;
    const target: HTMLElement = event.currentTarget as HTMLElement;
    if (!audio || !audio.duration) return;

    const rect: DOMRect = target.getBoundingClientRect();
    const ratio: number = (event.clientX - rect.left) / rect.width;
    audio.currentTime = ratio * audio.duration;
  }

  public ngOnDestroy(): void {
    const audio: HTMLAudioElement | undefined = this.audioRef()?.nativeElement;
    if (audio) {
      audio.pause();
      audio.src = '';
    }
  }

  private formatTime(seconds: number): string {
    if (!seconds || !isFinite(seconds)) return '0:00';
    const mins: number = Math.floor(seconds / 60);
    const secs: number = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
}
