import { Routes } from '@angular/router';
import { authGuard } from './auth/guards/auth.guard';
import { nonAuthGuard } from './auth/guards/non-auth.guard';

export const routes: Routes = [
  {
    path: 'dashboard',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'generate',
    loadComponent: () => import('./components/generate/generate-view.component').then(m => m.GenerateViewComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sets',
    loadComponent: () => import('./components/sets/set-list.component').then(m => m.SetListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sets/:id',
    loadComponent: () => import('./components/flashcards/flashcard-list.component').then(m => m.FlashcardListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'flashcards',
    redirectTo: '/sets',
    pathMatch: 'full'
  },
  {
    path: 'study',
    loadComponent: () => import('./components/study/study-view.component').then(m => m.StudyViewComponent),
    canActivate: [authGuard]
  },
  {
    path: 'login',
    loadComponent: () => import('./auth/auth-page.component').then(m => m.AuthPageComponent),
    canActivate: [nonAuthGuard]
  },
  {
    path: 'register',
    loadComponent: () => import('./auth/auth-page.component').then(m => m.AuthPageComponent),
    canActivate: [nonAuthGuard]
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./auth/pages/password-reset-page.component').then(m => m.PasswordResetPageComponent),
    canActivate: [nonAuthGuard]
  },
  {
    path: 'set-new-password',
    loadComponent: () => import('./auth/pages/set-new-password-page.component').then(m => m.SetNewPasswordPageComponent),
    canActivate: [nonAuthGuard]
  },
  {
    path: '',
    loadComponent: () => import('./components/landing/landing-page.component').then(m => m.LandingPageComponent),
    pathMatch: 'full'
  },
];
