import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Sm2Result } from './sm2.js';

let client: SupabaseClient;

export function getClient(): SupabaseClient {
  if (!client) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    client = createClient(url, key);
  }
  return client;
}

export function getUserId(): string {
  const id = process.env.MCP_USER_ID;
  if (!id) throw new Error('Missing MCP_USER_ID');
  return id;
}

export interface SetInfo {
  id: number;
  name: string;
  description: string | null;
  tags: string[];
  total_cards: number;
  due_cards: number;
}

export async function getSets(): Promise<SetInfo[]> {
  const userId = getUserId();
  const sb = getClient();

  const { data: sets, error } = await sb
    .from('flashcard_sets')
    .select('id, name, description, tags')
    .eq('user_id', userId)
    .order('name');

  if (error) throw new Error(error.message);
  if (!sets?.length) return [];

  const now = new Date().toISOString();

  const result: SetInfo[] = [];
  for (const set of sets) {
    const { count: total } = await sb
      .from('flashcards')
      .select('*', { count: 'exact', head: true })
      .eq('set_id', set.id)
      .eq('user_id', userId);

    const { data: cards } = await sb
      .from('flashcards')
      .select('id, flashcard_reviews!left(next_review_date)')
      .eq('set_id', set.id)
      .eq('user_id', userId);

    const dueCount = (cards ?? []).filter((c: Record<string, unknown>) => {
      const reviews = c.flashcard_reviews as Array<{ next_review_date: string }> | null;
      if (!reviews?.length) return true;
      return new Date(reviews[0].next_review_date) <= new Date(now);
    }).length;

    result.push({
      id: set.id,
      name: set.name,
      description: set.description,
      tags: set.tags ?? [],
      total_cards: total ?? 0,
      due_cards: dueCount,
    });
  }

  return result;
}

export interface StudyCard {
  flashcard: {
    id: number;
    front: string;
    back: string;
    front_image_url: string | null;
    back_audio_url: string | null;
    front_language: string | null;
    back_language: string | null;
  };
  review: {
    ease_factor: number;
    interval: number;
    repetitions: number;
  } | null;
}

export async function getDueCards(setId?: number): Promise<StudyCard[]> {
  const userId = getUserId();
  const sb = getClient();
  const now = new Date();

  let query = sb
    .from('flashcards')
    .select(`
      id, front, back, front_image_url, back_audio_url, front_language, back_language,
      flashcard_reviews!left(ease_factor, interval, repetitions, next_review_date)
    `)
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (setId) {
    query = query.eq('set_id', setId);
  }

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  return (data ?? [])
    .map((row: Record<string, unknown>) => {
      const reviews = row.flashcard_reviews as Array<{
        ease_factor: number;
        interval: number;
        repetitions: number;
        next_review_date: string;
      }> | null;

      const review = reviews?.length
        ? { ease_factor: reviews[0].ease_factor, interval: reviews[0].interval, repetitions: reviews[0].repetitions }
        : null;

      const isDue = !reviews?.length || new Date(reviews[0].next_review_date) <= now;

      return { isDue, card: {
        flashcard: {
          id: row.id as number,
          front: row.front as string,
          back: row.back as string,
          front_image_url: row.front_image_url as string | null,
          back_audio_url: row.back_audio_url as string | null,
          front_language: row.front_language as string | null,
          back_language: row.back_language as string | null,
        },
        review,
      }};
    })
    .filter((r: { isDue: boolean }) => r.isDue)
    .map((r: { card: StudyCard }) => r.card);
}

export async function upsertReview(
  flashcardId: number,
  sm2: Sm2Result,
): Promise<void> {
  const userId = getUserId();
  const sb = getClient();

  const { error } = await sb
    .from('flashcard_reviews')
    .upsert(
      {
        flashcard_id: flashcardId,
        user_id: userId,
        ease_factor: sm2.ease_factor,
        interval: sm2.interval,
        repetitions: sm2.repetitions,
        next_review_date: sm2.next_review_date,
        last_reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'flashcard_id,user_id' },
    );

  if (error) throw new Error(error.message);
}
