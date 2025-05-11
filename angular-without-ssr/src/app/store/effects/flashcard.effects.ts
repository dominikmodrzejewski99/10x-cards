import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { catchError, map, mergeMap } from 'rxjs/operators';
import { FlashcardApiService } from '../../services/flashcard-api.service';
import * as FlashcardActions from '../actions/flashcard.actions';

@Injectable()
export class FlashcardEffects {

  loadFlashcards$ = createEffect(() => this.actions$.pipe(
    ofType(FlashcardActions.loadFlashcards),
    mergeMap(() => this.flashcardService.getFlashcards()
      .pipe(
        map(flashcards => FlashcardActions.loadFlashcardsSuccess({ flashcards })),
        catchError(error => of(FlashcardActions.loadFlashcardsFailure({ error: error.message })))
      ))
    )
  );

  addFlashcard$ = createEffect(() => this.actions$.pipe(
    ofType(FlashcardActions.addFlashcard),
    mergeMap(action => this.flashcardService.createFlashcards([action.flashcard])
      .pipe(
        map(flashcards => FlashcardActions.addFlashcardSuccess({ flashcard: flashcards[0] })),
        catchError(error => of(FlashcardActions.addFlashcardFailure({ error: error.message })))
      ))
    )
  );

  constructor(
    private actions$: Actions,
    private flashcardService: FlashcardApiService
  ) {}
}
