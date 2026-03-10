/**
 * DTO and Command Model definitions for the 10x-cards API
 *
 * These types are based on the underlying database models and the API plan.
 * They ensure consistency between the API layer and the database entities.
 *
 * Table references:
 * - Users: corresponds to the `users` table
 * - Flashcards: corresponds to the `flashcards` table
 * - Generation: corresponds to the `generation` table
 * - Generation Error Logs: corresponds to the `generation_error_logs` table
 */

/** ---------- Users ---------- */

// Command model for registering a new user
export interface RegisterUserCommand {
  email: string;
  password: string; // Plain text password; it will be encrypted before storing
}

// Command model for logging in a user
export interface LoginUserCommand {
  email: string;
  password: string;
}

// User DTO representing the user data returned by the API (excluding sensitive details)
export interface UserDTO {
  id: string;
  email: string;
  is_anonymous: boolean;
  created_at: string;
  updated_at: string;
}

export type Source = 'ai-full' | 'ai-edited' | 'manual';

/** ---------- Flashcards ---------- */

// Flashcard DTO corresponds to a record from the flashcards table
export interface FlashcardDTO {
  id: number;
  front: string;
  back: string;
  source: Source;
  created_at: string;
  updated_at: string;
  user_id: string;
  generation_id: number | null;
  set_id: number;
}

export interface FlashcardProposalDTO {
  front: string;
  back: string;
  source?: Source;
}

// Command model for creating a flashcard
// Uses Omit to exclude fields that are set by the system
export type CreateFlashcardCommand = Omit<FlashcardDTO, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'generation_id' | 'set_id'> & {
  generation_id?: number | null;
  set_id: number;
};

// Command model for updating a flashcard
// All fields are optional here
export type UpdateFlashcardCommand = Partial<Omit<CreateFlashcardCommand, 'generation_id'>> & {
  generation_id?: number | null;
};

/** ---------- Flashcard Sets ---------- */

export interface FlashcardSetDTO {
  id: number;
  user_id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFlashcardSetCommand {
  name: string;
  description?: string | null;
}

export type UpdateFlashcardSetCommand = Partial<CreateFlashcardSetCommand>;

/** ---------- Generations ---------- */

// Generation DTO represents a record from the generation table: metadata about AI-generated flashcards
export interface GenerationDTO {
  id: number;
  generated_count: number;
  generation_duration: number;
  model: string;
  source_text_hash: string;
  source_text_length: number;
  accepted_edited_count: number | null;
  accepted_unedited_count: number | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

// Command model for initiating the AI flashcard generation process
export interface GenerateFlashcardsCommand {
  text: string; // Input text should be between 1000 and 10000 characters
  model?: string;
}

/** ---------- Flashcard Reviews (Spaced Repetition SM-2) ---------- */

export interface FlashcardReviewDTO {
  id: number;
  flashcard_id: number;
  user_id: string;
  ease_factor: number;
  interval: number;
  repetitions: number;
  next_review_date: string;
  last_reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudyCardDTO {
  flashcard: FlashcardDTO;
  review: FlashcardReviewDTO | null;
}

export type ReviewQuality = 0 | 1 | 2 | 3 | 4 | 5;

export interface ReviewAnswerCommand {
  flashcard_id: number;
  quality: ReviewQuality;
}

export interface SessionResultDTO {
  known: number;
  unknown: number;
  total: number;
}

/** ---------- User Preferences ---------- */

export interface UserPreferencesDTO {
  id: number;
  user_id: string;
  theme: 'light' | 'dark';
  onboarding_completed: boolean;
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
  total_sessions: number;
  total_cards_reviewed: number;
  created_at: string;
  updated_at: string;
}

/** ---------- Generation Error Logs ---------- */

// DTO for generation error logs representing records from the generation_error_logs table
export interface GenerationErrorLogDTO {
  id: number;
  created_at: string;
  error_code: string;
  error_message: string | null;
  model: string;
  source_text_hash: string;
  source_text_length: number;
  updated_at: string;
  user_id: string;
}

// Zdefiniuj OpenRouterResponse - używane tylko jako typ pomocniczy
// Rzeczywista odpowiedź z OpenRouter jest parsowana z JSON string
export interface OpenRouterResponse {
  choices: {
    message: {
      content: string;
    };
  }[];
}