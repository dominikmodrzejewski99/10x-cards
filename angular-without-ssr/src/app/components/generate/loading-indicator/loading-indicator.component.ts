import { Component, input, InputSignal, signal, OnInit, OnDestroy, effect } from '@angular/core';

@Component({
  selector: 'app-loading-indicator',
  templateUrl: './loading-indicator.component.html',
  styleUrls: ['./loading-indicator.component.scss']
})
export class LoadingIndicatorComponent implements OnInit, OnDestroy {
  public isLoadingSignal: InputSignal<boolean> = input<boolean>(false, { alias: 'isLoading' });

  private messages = [
    'Analizuję tekst...',
    'Wyodrębniam kluczowe pojęcia...',
    'Generuję pytania i odpowiedzi...',
    'Dopracowuję fiszki...',
    'Już prawie gotowe...'
  ];

  statusText = signal(this.messages[0]);
  private intervalId: ReturnType<typeof setInterval> | null = null;
  private messageIndex = 0;

  constructor() {
    effect(() => {
      if (this.isLoadingSignal()) {
        this.startRotation();
      } else {
        this.stopRotation();
      }
    });
  }

  ngOnInit(): void {}

  ngOnDestroy(): void {
    this.stopRotation();
  }

  private startRotation(): void {
    this.messageIndex = 0;
    this.statusText.set(this.messages[0]);
    this.intervalId = setInterval(() => {
      this.messageIndex = Math.min(this.messageIndex + 1, this.messages.length - 1);
      this.statusText.set(this.messages[this.messageIndex]);
    }, 6000);
  }

  private stopRotation(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}
