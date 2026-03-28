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
    path: 'quiz',
    loadComponent: () => import('./components/quiz/quiz-list.component').then(m => m.QuizListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'quiz/:setId',
    loadComponent: () => import('./components/quiz/quiz-view.component').then(m => m.QuizViewComponent),
    canActivate: [authGuard]
  },
  {
    path: 'learning-guide',
    loadComponent: () => import('./components/learning-guide/learning-guide.component').then(m => m.LearningGuideComponent),
    canActivate: [authGuard]
  },
  {
    path: 'language-test',
    loadComponent: () => import('./components/language-test/language-test-list.component').then(m => m.LanguageTestListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'language-test/:level',
    loadComponent: () => import('./components/language-test/language-test-view.component').then(m => m.LanguageTestViewComponent),
    canActivate: [authGuard]
  },
  {
    path: 'language-test/:level/results',
    loadComponent: () => import('./components/language-test/language-test-results.component').then(m => m.LanguageTestResultsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'share/:token',
    loadComponent: () =>
      import('./components/share/share-accept.component').then(
        (m) => m.ShareAcceptComponent
      ),
    canActivate: [authGuard],
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
    path: 'forgot-password',
    loadComponent: () => import('./auth/components/forgot-password.component').then(m => m.ForgotPasswordComponent),
    canActivate: [nonAuthGuard]
  },
  {
    path: 'reset-password',
    loadComponent: () => import('./auth/components/reset-password.component').then(m => m.ResetPasswordComponent),
  },
  {
    path: 'terms',
    loadComponent: () => import('./components/legal/terms.component').then(m => m.TermsComponent),
  },
  {
    path: 'privacy',
    loadComponent: () => import('./components/legal/privacy.component').then(m => m.PrivacyComponent),
  },
  {
    path: '',
    loadComponent: () => import('./components/landing/landing-page.component').then(m => m.LandingPageComponent),
    pathMatch: 'full',
    canActivate: [nonAuthGuard]
  },
  {
    path: '**',
    redirectTo: '/'
  },
];
