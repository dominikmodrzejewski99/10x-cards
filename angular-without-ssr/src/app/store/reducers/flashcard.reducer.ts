import { createReducer, on } from '@ngrx/store';
import { FlashcardProposalDTO } from '../../models/flashcard.model';
import * as FlashcardActions from '../actions/flashcard.actions';

export interface State {
  flashcards: FlashcardProposalDTO[];
  loading: boolean;
  error: string | null;
}

export const initialState: State = {
  flashcards: [],
  loading: false,
  error: null
};

export const reducer = createReducer(
  initialState,

  on(FlashcardActions.loadFlashcards, state => ({
    ...state,
    loading: true,
    error: null
  })),

  on(FlashcardActions.loadFlashcardsSuccess, (state, { flashcards }) => ({
    ...state,
    flashcards,
    loading: false
  })),

  on(FlashcardActions.loadFlashcardsFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false
  })),

  on(FlashcardActions.addFlashcard, state => ({
    ...state,
    loading: true,
    error: null
  })),

  on(FlashcardActions.addFlashcardSuccess, (state, { flashcard }) => ({
    ...state,
    flashcards: [...state.flashcards, flashcard],
    loading: false
  })),

  on(FlashcardActions.addFlashcardFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false
  }))
);
