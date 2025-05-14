import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RouterModule, Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthNavbarComponent } from './shared/components/auth-navbar.component';
import * as AuthActions from './auth/store/auth.actions';
import { selectIsAuthenticated } from './auth/store/auth.selectors';
import { filter, take } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [CommonModule, ButtonModule, RouterModule, AuthNavbarComponent],
})
export class AppComponent implements OnInit {
  title = 'angular';
  currentYear = new Date().getFullYear();

  constructor(private store: Store, private router: Router) {}

  ngOnInit() {
    // Sprawdź stan autentykacji przy starcie aplikacji
    console.log('AppComponent: Sprawdzanie stanu autentykacji przy starcie aplikacji');
    this.store.dispatch(AuthActions.checkAuthState());

    // Przekieruj zalogowanych użytkowników do strony generowania fiszek, jeśli są na stronie głównej
    this.store.select(selectIsAuthenticated)
      .pipe(
        filter(isAuthenticated => isAuthenticated),
        take(1)
      )
      .subscribe(isAuthenticated => {
        const currentUrl = this.router.url;
        if (currentUrl === '/') {
          this.router.navigate(['/generate']);
        }
      });
  }
}
