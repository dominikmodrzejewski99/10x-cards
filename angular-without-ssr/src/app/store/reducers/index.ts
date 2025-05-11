import { isDevMode } from '@angular/core';
import {
  ActionReducerMap,
  MetaReducer
} from '@ngrx/store';
import * as fromAuth from '../../auth/store/auth.reducer';
import * as fromFlashcard from '../reducers/flashcard.reducer';

export interface AppState {
  auth: fromAuth.State;
  flashcards: fromFlashcard.State;
}

export const reducers: ActionReducerMap<AppState> = {
  auth: fromAuth.reducer,
  flashcards: fromFlashcard.reducer
};

export const metaReducers: MetaReducer<AppState>[] = isDevMode() ? [] : [];
