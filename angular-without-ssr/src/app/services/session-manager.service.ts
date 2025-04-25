import { Injectable } from '@angular/core';
import { Session, Message } from '../interfaces/openrouter.interface';

@Injectable({
  providedIn: 'root'
})
export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private activeSessionId: string | null = null;

  constructor() {}

  /**
   * Tworzy nową sesję
   * @returns Nowo utworzona sesja
   */
  createSession(): Session {
    const sessionId = this.generateSessionId();
    const session: Session = {
      id: sessionId,
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.sessions.set(sessionId, session);
    this.activeSessionId = sessionId;
    return session;
  }

  /**
   * Pobiera sesję o podanym identyfikatorze
   * @param sessionId Opcjonalny identyfikator sesji. Jeśli nie podano, zwraca aktywną sesję
   * @returns Sesja lub null, jeśli nie znaleziono
   */
  getSession(sessionId?: string): Session | null {
    // Jeśli nie podano sessionId, użyj aktywnej sesji
    const idToUse = sessionId || this.activeSessionId;

    if (!idToUse) return null;
    return this.sessions.get(idToUse) || null;
  }

  /**
   * Dodaje wiadomość do sesji
   * @param sessionId Identyfikator sesji
   * @param message Wiadomość do dodania
   * @returns Zaktualizowana sesja lub null, jeśli nie znaleziono sesji
   */
  addMessage(sessionId: string, message: Message): Session | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    session.messages.push(message);
    session.updatedAt = new Date();
    return session;
  }

  /**
   * Usuwa sesję
   * @param sessionId Identyfikator sesji
   * @returns true, jeśli sesja została usunięta, false w przeciwnym razie
   */
  removeSession(sessionId: string): boolean {
    const result = this.sessions.delete(sessionId);

    // Jeśli usunięto aktywną sesję, zresetuj activeSessionId
    if (result && sessionId === this.activeSessionId) {
      this.activeSessionId = null;
    }

    return result;
  }

  /**
   * Generuje unikalny identyfikator sesji
   * @returns Unikalny identyfikator sesji
   */
  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}
