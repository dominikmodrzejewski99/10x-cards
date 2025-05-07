import { Routes } from '@angular/router';
import { GenerateViewComponent } from './components/generate/generate-view.component';
import { FlashcardListComponent } from './components/flashcards/flashcard-list.component';
import { AuthPageComponent } from './auth/auth-page.component';
import { PasswordResetPageComponent } from './auth/pages/password-reset-page.component';
import { SetNewPasswordPageComponent } from './auth/pages/set-new-password-page.component';
import { authGuard } from './auth/guards/auth.guard';
import { nonAuthGuard } from './auth/guards/non-auth.guard';
import { partialAuthGuard } from './auth/guards/partial-auth.guard';
export const routes: Routes = [
  {
    path: 'generate',
    component: GenerateViewComponent,
    canActivate: [authGuard]
  },
  {
    path: 'flashcards',
    component: FlashcardListComponent,
    canActivate: [authGuard]
  },
  {
    path: 'login',
    component: AuthPageComponent,
    canActivate: [nonAuthGuard]
  },
  {
    path: 'register',
    component: AuthPageComponent,
    canActivate: [nonAuthGuard]
  },
  {
    path: 'reset-password',
    component: PasswordResetPageComponent,
    canActivate: [nonAuthGuard]
  },
  {
    path: 'set-new-password',
    component: SetNewPasswordPageComponent,
    canActivate: [nonAuthGuard]
  },
  {
    path: '',
    redirectTo: '/generate',
    pathMatch: 'full'
  },
];
