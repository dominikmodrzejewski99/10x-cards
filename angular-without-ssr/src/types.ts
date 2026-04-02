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

export type Source = 'ai-full' | 'ai-edited' | 'manual' | 'test';

export type FlashcardLanguage = 'en' | 'pl' | 'de' | 'es' | 'fr';

/** ---------- Flashcards ---------- */

// Flashcard DTO corresponds to a record from the flashcards table
export interface FlashcardDTO {
  id: number;
  front: string;
  back: string;
  front_image_url: string | null;
  back_audio_url: string | null;
  front_language: FlashcardLanguage | null;
  back_language: FlashcardLanguage | null;
  source: Source;
  position: number;
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
export type CreateFlashcardCommand = Omit<FlashcardDTO, 'id' | 'created_at' | 'updated_at' | 'user_id' | 'generation_id' | 'set_id' | 'position' | 'front_image_url' | 'back_audio_url' | 'front_language' | 'back_language'> & {
  front_image_url?: string | null;
  back_audio_url?: string | null;
  front_language?: FlashcardLanguage | null;
  back_language?: FlashcardLanguage | null;
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
  tags: string[];
  is_public: boolean;
  copy_count: number;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateFlashcardSetCommand {
  name: string;
  description?: string | null;
  tags?: string[];
}

export type UpdateFlashcardSetCommand = Partial<CreateFlashcardSetCommand>;

/** ---------- Sharing ---------- */

export interface ShareLinkDTO {
  id: string;
  set_id: number;
  created_by: string;
  expires_at: string;
  created_at: string;
}

/** ---------- Public Sets (Explore) ---------- */

export interface PublicSetDTO {
  id: number;
  name: string;
  description: string | null;
  tags: string[];
  card_count: number;
  author_email_masked: string;
  copy_count: number;
  published_at: string;
}

export interface BrowsePublicSetsResponse {
  sets: PublicSetDTO[];
  total: number;
}

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
  hard: number;
  unknown: number;
  total: number;
}

/** ---------- User Preferences ---------- */

export type AppLanguage = 'pl' | 'en' | 'de' | 'es' | 'fr' | 'uk';

export interface UserPreferencesDTO {
  id: number;
  user_id: string;
  theme: 'light' | 'dark';
  language: AppLanguage;
  onboarding_completed: boolean;
  current_streak: number;
  longest_streak: number;
  last_study_date: string | null;
  total_sessions: number;
  total_cards_reviewed: number;
  pomodoro_work_duration: number;
  pomodoro_break_duration: number;
  pomodoro_long_break_duration: number;
  pomodoro_sessions_before_long_break: number;
  pomodoro_sound_enabled: boolean;
  pomodoro_notifications_enabled: boolean;
  pomodoro_focus_reminder_dismissed: boolean;
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

// ============ Language Tests ============

export type TestLevel = 'b1' | 'b2-fce' | 'c1-cae';

export type QuestionCategory = 'grammar' | 'vocabulary' | 'collocations' | 'phrasal-verbs' | 'word-building';

export interface MultipleChoiceQuestion {
  type: 'multiple-choice-cloze';
  id: string;
  text: string;
  options: string[];
  correctIndex: number;
  category: QuestionCategory;
  subcategory: string;
  explanation: string;
}

export interface WordFormationQuestion {
  type: 'word-formation';
  id: string;
  text: string;
  baseWord: string;
  correctAnswer: string;
  acceptedAnswers: string[];
  category: QuestionCategory;
  subcategory: string;
  explanation: string;
}

export type TestQuestion = MultipleChoiceQuestion | WordFormationQuestion;

export interface TestDefinition {
  level: TestLevel;
  title: string;
  description: string;
  passingScore: number;
  questions: TestQuestion[];
}

export interface CategoryBreakdown {
  [category: string]: { correct: number; total: number };
}

export interface WrongAnswer {
  questionId: string;
  userAnswer: string;
  correctAnswer: string;
  front: string;
  back: string;
}

export interface LanguageTestResultDTO {
  id: number;
  user_id: string;
  level: TestLevel;
  total_score: number;
  max_score: number;
  percentage: number;
  category_breakdown: CategoryBreakdown;
  wrong_answers: WrongAnswer[];
  generated_set_id: number | null;
  completed_at: string;
  created_at: string;
  updated_at: string;
}

// ============ Quiz/Test Mode ============

export type QuizQuestionType = 'written' | 'multiple-choice' | 'true-false';

export interface QuizConfig {
  setId: number;
  questionCount: number | 'all';
  questionTypes: QuizQuestionType[];
  reversed: boolean;
}

export interface QuizQuestion {
  id: number;
  type: QuizQuestionType;
  questionText: string;
  questionImageUrl: string | null;
  correctAnswer: string;
  options?: string[];
  trueFalsePairing?: { shown: string; isCorrect: boolean };
  sourceFlashcard: FlashcardDTO;
}

export interface QuizAnswer {
  questionId: number;
  userAnswer: string;
  isCorrect: boolean;
  correctAnswer: string;
  questionText: string;
  timeMs: number;
}

export interface QuizResult {
  totalQuestions: number;
  correctCount: number;
  percentage: number;
  totalTimeMs: number;
  answers: QuizAnswer[];
}

// ============ Friendships ============

export type FriendshipStatus = 'pending' | 'accepted' | 'rejected';

export interface FriendshipDTO {
  id: string;
  requester_id: string;
  addressee_id: string;
  status: FriendshipStatus;
  created_at: string;
  updated_at: string;
}

export interface FriendRequestDTO {
  friendship_id: string;
  user_id: string;
  email_masked: string;
  created_at: string;
}

export interface FriendDTO {
  friendship_id: string;
  user_id: string;
  email_masked: string;
  current_streak: number;
  last_study_date: string | null;
  last_active_at: string | null;
  total_cards_reviewed: number;
}

export interface FriendStatsDTO {
  user_id: string;
  email_masked: string;
  current_streak: number;
  longest_streak: number;
  total_sessions: number;
  total_cards_reviewed: number;
  last_study_date: string | null;
  last_active_at: string | null;
}

// ============ Notifications ============

export type NotificationType = 'friend_request' | 'friend_accepted' | 'nudge';

export interface NotificationDTO {
  id: string;
  user_id: string;
  type: NotificationType;
  from_user_id: string | null;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

// ============ Feedback ============

export type FeedbackType = 'bug' | 'idea';

export interface CreateFeedbackCommand {
  type: FeedbackType;
  title: string;
  description: string;
}

export interface FeedbackDTO {
  id: number;
  user_id: string;
  type: FeedbackType;
  title: string;
  description: string;
  created_at: string;
}