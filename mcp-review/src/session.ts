import { randomUUID } from 'node:crypto';
import { StudyCard } from './supabase.js';

export interface ReviewSession {
  id: string;
  cards: StudyCard[];
  currentIndex: number;
  flipped: boolean;
  results: { known: number; hard: number; unknown: number };
}

const sessions = new Map<string, ReviewSession>();

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function createSession(cards: StudyCard[]): ReviewSession {
  const session: ReviewSession = {
    id: randomUUID(),
    cards: shuffle(cards),
    currentIndex: 0,
    flipped: false,
    results: { known: 0, hard: 0, unknown: 0 },
  };
  sessions.set(session.id, session);
  return session;
}

export function getSession(id: string): ReviewSession | undefined {
  return sessions.get(id);
}

export function deleteSession(id: string): void {
  sessions.delete(id);
}
