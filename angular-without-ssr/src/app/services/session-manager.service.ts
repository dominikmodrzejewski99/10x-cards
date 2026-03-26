import { Injectable } from '@angular/core';
import { Session, Message } from '../interfaces/openrouter.interface';

const MAX_SESSIONS: number = 20;
const SESSION_TTL_MS: number = 60 * 60 * 1000; // 1 hour

@Injectable({
  providedIn: 'root'
})
export class SessionManager {
  private sessions: Map<string, Session> = new Map();
  private activeSessionId: string | null = null;

  createSession(): Session {
    this.evictExpired();

    if (this.sessions.size >= MAX_SESSIONS) {
      const oldestKey: string = this.sessions.keys().next().value!;
      this.sessions.delete(oldestKey);
    }

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

  getSession(sessionId?: string): Session | null {
    const idToUse = sessionId || this.activeSessionId;
    if (!idToUse) return null;

    const session = this.sessions.get(idToUse) || null;
    if (session && this.isExpired(session)) {
      this.sessions.delete(idToUse);
      if (idToUse === this.activeSessionId) {
        this.activeSessionId = null;
      }
      return null;
    }
    return session;
  }

  addMessage(sessionId: string, message: Message): Session | null {
    const session = this.getSession(sessionId);
    if (!session) return null;

    session.messages.push(message);
    session.updatedAt = new Date();
    return session;
  }

  removeSession(sessionId: string): boolean {
    const result = this.sessions.delete(sessionId);
    if (result && sessionId === this.activeSessionId) {
      this.activeSessionId = null;
    }
    return result;
  }

  private isExpired(session: Session): boolean {
    return Date.now() - session.updatedAt.getTime() > SESSION_TTL_MS;
  }

  private evictExpired(): void {
    for (const [id, session] of this.sessions) {
      if (this.isExpired(session)) {
        this.sessions.delete(id);
        if (id === this.activeSessionId) {
          this.activeSessionId = null;
        }
      }
    }
  }

  private generateSessionId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substring(2);
  }
}
