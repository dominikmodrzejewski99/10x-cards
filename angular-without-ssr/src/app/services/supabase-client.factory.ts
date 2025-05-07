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
            storageKey: 'sb-auth-token',
            storage: {
              getItem: (key) => {
                try {
                  return localStorage.getItem(key);
                } catch (error) {
                  console.error('Error accessing localStorage:', error);
                  return null;
                }
              },
              setItem: (key, value) => {
                try {
                  localStorage.setItem(key, value);
                } catch (error) {
                  console.error('Error setting localStorage:', error);
                }
              },
              removeItem: (key) => {
                try {
                  localStorage.removeItem(key);
                } catch (error) {
                  console.error('Error removing from localStorage:', error);
                }
              }
            }
          },
        }
      );
    }

    return this.supabaseClient;
  }

  /**
   * Gets the existing Supabase client or creates a new one
   * @returns SupabaseClient instance
   */
  getClient(): SupabaseClient {
    return this.createClient();
  }
}
