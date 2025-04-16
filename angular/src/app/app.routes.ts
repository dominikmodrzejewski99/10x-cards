import { Routes } from '@angular/router';
import { GenerateViewComponent } from './components/generate/generate-view.component';
import { FlashcardListComponent } from './components/flashcards/flashcard-list.component';
import { AuthPageComponent } from './auth/auth-page.component';
export const routes: Routes = [
  { path: 'generate', component: GenerateViewComponent },
  { path: 'flashcards', component: FlashcardListComponent },
  { path: 'login', component: AuthPageComponent },
  { path: 'register', component: AuthPageComponent },
  { path: '', redirectTo: '/register', pathMatch: 'full' }, // Przekierowanie domyślne do widoku rejestracji
];
