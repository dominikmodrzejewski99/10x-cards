import { Injectable, signal, Signal, WritableSignal, inject, DestroyRef } from '@angular/core';
import { FlashcardLanguage } from '../../../types';
import { LoggerService } from './logger.service';

const LANG_MAP: Record<FlashcardLanguage, string> = {
  en: 'en-US',
  pl: 'pl-PL',
  de: 'de-DE',
  es: 'es-ES',
  fr: 'fr-FR',
};

@Injectable({ providedIn: 'root' })
export class WebSpeechService {
  private readonly logger: LoggerService = inject(LoggerService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  private readonly _speaking: WritableSignal<boolean> = signal<boolean>(false);
  public readonly speakingSignal: Signal<boolean> = this._speaking.asReadonly();

  constructor() {
    this.destroyRef.onDestroy(() => this.stop());
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window;
  }

  public speak(text: string, lang: FlashcardLanguage | null): boolean {
    if (!this.isSupported() || !text.trim()) {
      return false;
    }
    try {
      window.speechSynthesis.cancel();
      const utterance: SpeechSynthesisUtterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang ? LANG_MAP[lang] : 'en-US';
      utterance.rate = 0.95;
      utterance.onstart = () => this._speaking.set(true);
      utterance.onend = () => this._speaking.set(false);
      utterance.onerror = () => this._speaking.set(false);
      window.speechSynthesis.speak(utterance);
      return true;
    } catch (err: unknown) {
      this.logger.error('WebSpeechService.speak', err);
      this._speaking.set(false);
      return false;
    }
  }

  public stop(): void {
    if (!this.isSupported()) {
      return;
    }
    try {
      window.speechSynthesis.cancel();
    } catch {
      // ignore — synthesis may already be torn down
    }
    this._speaking.set(false);
  }
}
