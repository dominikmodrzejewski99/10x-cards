import { createAction, props } from '@ngrx/store';
import { FlashcardProposalDTO } from '../../models/flashcard.model';

export const loadFlashcards = createAction(
  '[Flashcard] Load Flashcards'
);

export const loadFlashcardsSuccess = createAction(
  '[Flashcard] Load Flashcards Success',
  props<{ flashcards: FlashcardProposalDTO[] }>()
);

export const loadFlashcardsFailure = createAction(
  '[Flashcard] Load Flashcards Failure',
  props<{ error: string }>()
);

export const addFlashcard = createAction(
  '[Flashcard] Add Flashcard',
  props<{ flashcard: FlashcardProposalDTO }>()
);

export const addFlashcardSuccess = createAction(
  '[Flashcard] Add Flashcard Success',
  props<{ flashcard: FlashcardProposalDTO }>()
);

export const addFlashcardFailure = createAction(
  '[Flashcard] Add Flashcard Failure',
  props<{ error: string }>()
);
