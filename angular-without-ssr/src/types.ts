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
}

export interface FlashcardProposalDTO {
  front: string;
  back: string;
  source: Source;
}

// Command model for creating a flashcard
// Uses Omit to exclude fields that are set by the system
export type CreateFlashcardCommand = Omit<FlashcardDTO, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'generation_id'> & {
  // Optionally, generation_id can be provided for AI-generated flashcards
  generation_id?: number | null;
};

// Command model for updating a flashcard
// All fields are optional here
export type UpdateFlashcardCommand = Partial<Omit<CreateFlashcardCommand, 'generation_id'>> & {
  generation_id?: number | null;
};

/** ---------- Generations ---------- */

// Generation DTO represents a record from the generation table: metadata about AI-generated flashcards
export interface GenerationDTO {
  id: number;
  accepted_edited_count: number | null;
  accepted_unedited_count: number | null;
  created_at: string;
  generated_count: number;
  generation_duration: number;
  model: string;
  source_text_hash: string;
  source_text_length: number;
  updated_at: string;
  user_id: string;
}

// Command model for initiating the AI flashcard generation process
export interface GenerateFlashcardsCommand {
  text: string; // Input text should be between 1000 and 10000 characters
  model?: string;
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