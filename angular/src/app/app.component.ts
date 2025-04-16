import { Component, OnInit } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { createBrowserClient } from '@supabase/ssr';
import { environment } from '../environments/environments';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [CommonModule, ButtonModule, RouterModule],
})
export class AppComponent implements OnInit {
  title = 'angular';
  currentYear = new Date().getFullYear();
  private supabase: SupabaseClient;
  data: string = '';

  constructor() {
    this.supabase = createBrowserClient(environment.supabaseUrl, environment.supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  }

  async ngOnInit() {
    const { data, error } = await this.supabase.from('users').select('*');
    console.log(data, error);
  }
}
