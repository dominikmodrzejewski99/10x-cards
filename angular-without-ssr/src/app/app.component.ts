import { Component, OnInit } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { RouterModule } from '@angular/router';
import { SupabaseClientFactory } from './services/supabase-client.factory';

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

  constructor(private supabaseFactory: SupabaseClientFactory) {
    this.supabase = this.supabaseFactory.createClient();
  }

  async ngOnInit() {
    const { data, error } = await this.supabase.from('users').select('*');
    console.log(data, error);
  }
}
