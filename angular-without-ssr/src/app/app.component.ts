import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RouterModule } from '@angular/router';
import { Store } from '@ngrx/store';
import { AuthNavbarComponent } from './shared/components/auth-navbar.component';
import * as AuthActions from './auth/store/auth.actions';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [CommonModule, ButtonModule, RouterModule, AuthNavbarComponent],
})
export class AppComponent implements OnInit {
  title = '10xCards - Twórz i zarządzaj fiszkami efektywnie';
  currentYear = new Date().getFullYear();

  constructor(private store: Store) {}

  ngOnInit(): void {
    this.store.dispatch(AuthActions.checkAuthState());
  }
}
