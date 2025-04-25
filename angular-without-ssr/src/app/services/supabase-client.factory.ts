import { Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../environments/environments';

@Injectable({
  providedIn: 'root'
})
export class SupabaseClientFactory {
  private supabaseClient: SupabaseClient | null = null;

  /**
   * Creates a Supabase client for browser environment
   * @returns SupabaseClient instance
   */
  createClient(): SupabaseClient {
    // Create client if it doesn't exist yet
    if (!this.supabaseClient) {
      this.supabaseClient = createClient(
        environment.supabaseUrl,
        environment.supabaseKey,
        {
          auth: {
            persistSession: true,
            autoRefreshToken: true,
            detectSessionInUrl: false,
          },
        }
      );
    }

    return this.supabaseClient;
  }
}
