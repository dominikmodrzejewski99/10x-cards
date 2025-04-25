import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { OpenRouterService } from '../../services/openrouter.service';
import { Message, Session } from '../../interfaces/openrouter.interface';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';

@Component({
  selector: 'app-demo',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    ButtonModule,
    InputTextModule,
    CardModule,
    ProgressSpinnerModule,
    ToastModule
  ],
  providers: [MessageService],
  templateUrl: './demo.component.html',
  styleUrl: './demo.component.css'
})
export class DemoComponent implements OnInit {
  // Formularz wiadomości
  messageForm: FormGroup;

  // Sygnały do zarządzania stanem
  currentSession = signal<Session | null>(null);
  isLoading = signal<boolean>(false);
  error = signal<string | null>(null);

  constructor(
    private fb: FormBuilder,
    private openRouterService: OpenRouterService,
    private messageService: MessageService
  ) {
    // Inicjalizacja formularza
    this.messageForm = this.fb.group({
      message: ['', [Validators.required, Validators.minLength(2)]]
    });
  }

  ngOnInit(): void {
    // Inicjujemy nową sesję przy starcie komponentu
    this.initSession();
  }

  /**
   * Inicjuje nową sesję czatu lub pobiera istniejącą
   */
  initSession(): void {
    const session = this.openRouterService.getSession();
    if (session) {
      this.currentSession.set(session);
    } else {
      // Jeśli nie ma aktywnej sesji, tworzymy nową
      this.currentSession.set(this.openRouterService.createSession());
    }
  }

  /**
   * Wysyła wiadomość użytkownika do API
   */
  async sendMessage(): Promise<void> {
    if (this.messageForm.invalid || this.isLoading()) return;

    const userMessage = this.messageForm.get('message')?.value;
    this.isLoading.set(true);
    this.error.set(null);

    try {
      // Wysyłamy wiadomość przez serwis
      const response = await this.openRouterService.sendMessage(
        userMessage,
        this.currentSession()?.id
      );

      // Aktualizujemy sesję po odpowiedzi
      const updatedSession = this.openRouterService.getSession(this.currentSession()?.id || '');
      if (updatedSession) {
        this.currentSession.set(updatedSession);
      }

      // Resetujemy formularz
      this.messageForm.reset();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Wystąpił nieznany błąd';
      this.error.set(errorMessage);
      this.messageService.add({
        severity: 'error',
        summary: 'Błąd',
        detail: errorMessage,
        life: 5000
      });
      console.error('Błąd podczas wysyłania wiadomości:', err);
    } finally {
      this.isLoading.set(false);
    }
  }

  /**
   * Tworzy nową sesję, resetując poprzednią historię
   */
  createNewSession(): void {
    this.currentSession.set(this.openRouterService.createSession());
    this.error.set(null);
    this.messageService.add({
      severity: 'info',
      summary: 'Informacja',
      detail: 'Utworzono nową sesję czatu',
      life: 3000
    });
  }

  /**
   * Formatuje datę wiadomości
   */
  formatTimestamp(date: Date): string {
    return new Date(date).toLocaleTimeString();
  }

  /**
   * Sprawdza czy można wysłać wiadomość
   */
  get canSendMessage(): boolean {
    return this.messageForm.valid && !this.isLoading();
  }
}
