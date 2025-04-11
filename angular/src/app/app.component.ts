import { Component, OnInit } from '@angular/core'
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../environments/environments';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  standalone: true,
  imports: [
    CommonModule
  ]
})
export class AppComponent implements OnInit {
  title = 'angular';
  private supabase: SupabaseClient;

  constructor() {
    this.supabase = createClient(
      environment.supabaseUrl,
      environment.supabaseKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: false
        }
      }
    )
  }

  async ngOnInit() {

    const {data, error} = await this.supabase
      .from('test')
      .select('*');

    console.log(data, error);

  }


}
