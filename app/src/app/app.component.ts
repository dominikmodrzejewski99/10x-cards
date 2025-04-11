import { Component, OnInit } from '@angular/core'
import { SupabaseService } from './supabase.service'
import {AccountComponent} from './account/account.component';
import {AuthComponent} from './auth/auth.component';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  imports: [
    AccountComponent,
    AuthComponent
  ]
})
export class AppComponent implements OnInit {
  title = 'angular-user-management'

  session: any = null;

  constructor(private readonly supabase: SupabaseService) {
    this.session = this.supabase.session;
  }

  ngOnInit() {
    this.supabase.authChanges((_, session) => (this.session = session))
  }
}
