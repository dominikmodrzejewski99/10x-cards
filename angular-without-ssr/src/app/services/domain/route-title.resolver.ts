import { inject } from '@angular/core';
import { ResolveFn, ActivatedRouteSnapshot } from '@angular/router';
import { map, catchError, of } from 'rxjs';
import { FlashcardSetApiService } from '../api/flashcard-set-api.service';

export const setTitleResolver: ResolveFn<string> = (route: ActivatedRouteSnapshot) => {
  const setApi = inject(FlashcardSetApiService);
  const setId = Number(route.paramMap.get('id'));

  if (!setId) return of('Fiszki — Memlo');

  return setApi.getSet(setId).pipe(
    map(set => `${set.name} — Memlo`),
    catchError(() => of('Fiszki — Memlo'))
  );
};

export const quizTitleResolver: ResolveFn<string> = (route: ActivatedRouteSnapshot) => {
  const setApi = inject(FlashcardSetApiService);
  const setId = Number(route.paramMap.get('setId'));

  if (!setId) return of('Quiz — Memlo');

  return setApi.getSet(setId).pipe(
    map(set => `Quiz: ${set.name} — Memlo`),
    catchError(() => of('Quiz — Memlo'))
  );
};

export const languageTestTitleResolver: ResolveFn<string> = (route: ActivatedRouteSnapshot) => {
  const level = route.paramMap.get('level')?.toUpperCase() || '';
  return of(`Test ${level} — Memlo`);
};

export const authorTitleResolver: ResolveFn<string> = () => {
  return of('Profil autora — Memlo');
};

export const friendTitleResolver: ResolveFn<string> = () => {
  return of('Statystyki znajomego — Memlo');
};
