import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import * as db from './supabase.js';
import { createSession, getSession } from './session.js';
import { calculateNextReview } from './sm2.js';

const QUALITY_MAP: Record<string, number> = {
  again: 1,
  hard: 3,
  good: 4,
};

function cardFront(card: db.StudyCard) {
  return {
    id: card.flashcard.id,
    front: card.flashcard.front,
    front_image_url: card.flashcard.front_image_url,
  };
}

export function registerTools(server: McpServer): void {
  server.tool('list_sets', 'List your flashcard sets with due card counts', {}, async () => {
    const sets = await db.getSets();
    return { content: [{ type: 'text', text: JSON.stringify(sets, null, 2) }] };
  });

  server.tool(
    'start_review',
    'Start a flashcard review session',
    { set_id: z.number().optional().describe('Set ID to review (omit for all sets)') },
    async ({ set_id }) => {
      const cards = await db.getDueCards(set_id);
      if (!cards.length) {
        return { content: [{ type: 'text', text: JSON.stringify({ session_id: null, total_due: 0, card: null }) }] };
      }
      const session = createSession(cards);
      const first = session.cards[0];
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            session_id: session.id,
            total_due: session.cards.length,
            card: cardFront(first),
          }),
        }],
      };
    },
  );

  server.tool(
    'show_answer',
    'Reveal the back of the current flashcard',
    { session_id: z.string().describe('Session ID from start_review') },
    async ({ session_id }) => {
      const session = getSession(session_id);
      if (!session) {
        return { content: [{ type: 'text', text: 'Session not found. Start a new review.' }], isError: true };
      }
      if (session.currentIndex >= session.cards.length) {
        return { content: [{ type: 'text', text: 'Session already complete.' }], isError: true };
      }
      session.flipped = true;
      const card = session.cards[session.currentIndex];
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            id: card.flashcard.id,
            front: card.flashcard.front,
            back: card.flashcard.back,
            back_audio_url: card.flashcard.back_audio_url,
            front_language: card.flashcard.front_language,
            back_language: card.flashcard.back_language,
          }),
        }],
      };
    },
  );

  server.tool(
    'rate_card',
    'Rate how well you knew the card and advance to the next one',
    {
      session_id: z.string().describe('Session ID'),
      rating: z.enum(['again', 'hard', 'good']).describe('again = did not know, hard = barely, good = knew it'),
    },
    async ({ session_id, rating }) => {
      const session = getSession(session_id);
      if (!session) {
        return { content: [{ type: 'text', text: 'Session not found.' }], isError: true };
      }
      if (!session.flipped) {
        return { content: [{ type: 'text', text: 'Show the answer first before rating.' }], isError: true };
      }
      if (session.currentIndex >= session.cards.length) {
        return { content: [{ type: 'text', text: 'Session already complete.' }], isError: true };
      }

      const card = session.cards[session.currentIndex];
      const quality = QUALITY_MAP[rating];

      const sm2 = calculateNextReview(card.review, quality);
      await db.upsertReview(card.flashcard.id, sm2);

      if (rating === 'good') session.results.known++;
      else if (rating === 'hard') session.results.hard++;
      else session.results.unknown++;

      session.currentIndex++;
      session.flipped = false;

      const nextCard = session.currentIndex < session.cards.length
        ? cardFront(session.cards[session.currentIndex])
        : null;

      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            progress: {
              current: session.currentIndex,
              total: session.cards.length,
              ...session.results,
            },
            next_card: nextCard,
          }),
        }],
      };
    },
  );
}
