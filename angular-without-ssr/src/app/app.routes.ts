import { Routes } from '@angular/router';
import { authGuard } from './auth/guards/auth.guard';
import { nonAuthGuard } from './auth/guards/non-auth.guard';
import { adminGuard } from './auth/guards/admin.guard';

export const routes: Routes = [
  {
    path: 'dashboard',
    title: 'Dashboard — Memlo',
    loadComponent: () => import('./components/dashboard/dashboard.component').then(m => m.DashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'generate',
    title: 'Generator fiszek — Memlo',
    loadComponent: () => import('./components/generate/generate-view.component').then(m => m.GenerateViewComponent),
    canActivate: [authGuard]
  },
  {
    path: 'explore',
    title: 'Explore — Memlo',
    loadComponent: () => import('./components/explore/explore.component').then(m => m.ExploreComponent),
    canActivate: [authGuard]
  },
  {
    path: 'explore/author/:authorId',
    title: 'Profil autora — Memlo',
    loadComponent: () => import('./components/explore/author-profile.component').then(m => m.AuthorProfileComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sets',
    title: 'Zestawy — Memlo',
    loadComponent: () => import('./components/sets/set-list.component').then(m => m.SetListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'sets/:id',
    title: 'Fiszki — Memlo',
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
    title: 'Nauka — Memlo',
    loadComponent: () => import('./components/study/study-view.component').then(m => m.StudyViewComponent),
    canActivate: [authGuard]
  },
  {
    path: 'quiz',
    title: 'Quiz — Memlo',
    loadComponent: () => import('./components/quiz/quiz-list.component').then(m => m.QuizListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'quiz/:setId',
    title: 'Quiz — Memlo',
    loadComponent: () => import('./components/quiz/quiz-view.component').then(m => m.QuizViewComponent),
    canActivate: [authGuard]
  },
  {
    path: 'learning-guide',
    title: 'Poradnik nauki — Memlo',
    loadComponent: () => import('./components/learning-guide/learning-guide.component').then(m => m.LearningGuideComponent),
    canActivate: [authGuard]
  },
  {
    path: 'language-test',
    title: 'Testy językowe — Memlo',
    loadComponent: () => import('./components/language-test/language-test-list.component').then(m => m.LanguageTestListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'language-test/:level',
    title: 'Test językowy — Memlo',
    loadComponent: () => import('./components/language-test/language-test-view.component').then(m => m.LanguageTestViewComponent),
    canActivate: [authGuard]
  },
  {
    path: 'language-test/:level/results',
    title: 'Wyniki testu — Memlo',
    loadComponent: () => import('./components/language-test/language-test-results.component').then(m => m.LanguageTestResultsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'share/:token',
    title: 'Udostępniony zestaw — Memlo',
    loadComponent: () =>
      import('./components/share/share-accept.component').then(
        (m) => m.ShareAcceptComponent
      ),
    canActivate: [authGuard],
  },
  {
    path: 'friends',
    title: 'Znajomi — Memlo',
    loadComponent: () => import('./components/friends/friends-list.component').then(m => m.FriendsListComponent),
    canActivate: [authGuard]
  },
  {
    path: 'friends/leaderboard',
    title: 'Ranking — Memlo',
    loadComponent: () => import('./components/friends/friends-leaderboard.component').then(m => m.FriendsLeaderboardComponent),
    canActivate: [authGuard]
  },
  {
    path: 'friends/:userId',
    title: 'Statystyki znajomego — Memlo',
    loadComponent: () => import('./components/friends/friend-stats.component').then(m => m.FriendStatsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'settings',
    title: 'Ustawienia — Memlo',
    loadComponent: () => import('./components/settings/settings.component').then(m => m.SettingsComponent),
    canActivate: [authGuard]
  },
  {
    path: 'partner',
    title: 'Program partnerski — Memlo',
    loadComponent: () => import('./components/partner/partner-page.component').then(m => m.PartnerPageComponent),
    canActivate: [authGuard]
  },
  {
    path: 'admin/payouts',
    title: 'Wypłaty — Memlo Admin',
    loadComponent: () => import('./components/admin/admin-payouts.component').then(m => m.AdminPayoutsComponent),
    canActivate: [authGuard, adminGuard]
  },
  {
    path: 'feedback',
    title: 'Feedback — Memlo',
    loadComponent: () => import('./components/feedback/feedback.component').then(m => m.FeedbackComponent),
    canActivate: [authGuard]
  },
  {
    path: 'login',
    title: 'Logowanie — Memlo',
    loadComponent: () => import('./auth/auth-page.component').then(m => m.AuthPageComponent),
    canActivate: [nonAuthGuard]
  },
  {
    path: 'register',
    title: 'Rejestracja — Memlo',
    loadComponent: () => import('./auth/auth-page.component').then(m => m.AuthPageComponent),
    canActivate: [nonAuthGuard]
  },
  {
    path: 'forgot-password',
    title: 'Resetowanie hasła — Memlo',
    loadComponent: () => import('./auth/components/forgot-password.component').then(m => m.ForgotPasswordComponent),
    canActivate: [nonAuthGuard]
  },
  {
    path: 'reset-password',
    title: 'Nowe hasło — Memlo',
    loadComponent: () => import('./auth/components/reset-password.component').then(m => m.ResetPasswordComponent),
  },
  {
    path: 'partners',
    title: 'Program partnerski — Memlo',
    loadComponent: () => import('./components/partners-info/partners-info.component').then(m => m.PartnersInfoComponent),
  },
  {
    path: 'terms',
    title: 'Regulamin — Memlo',
    loadComponent: () => import('./components/legal/terms.component').then(m => m.TermsComponent),
  },
  {
    path: 'privacy',
    title: 'Polityka prywatności — Memlo',
    loadComponent: () => import('./components/legal/privacy.component').then(m => m.PrivacyComponent),
  },
  {
    path: '',
    title: 'Memlo — Twórz i zarządzaj fiszkami efektywnie',
    loadComponent: () => import('./components/landing/landing-page.component').then(m => m.LandingPageComponent),
    pathMatch: 'full',
    canActivate: [nonAuthGuard]
  },
  {
    path: '**',
    redirectTo: '/'
  },
];
