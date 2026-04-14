import { inject, Injectable } from '@angular/core';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { environment } from '../../../environments/environments';
import { LoggerService } from './logger.service';

@Injectable({
  providedIn: 'root'
})
export class SupabaseClientFactory {
  private logger: LoggerService = inject(LoggerService);
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
            detectSessionInUrl: true,
            storageKey: 'sb-auth-token',
            lock: async <R>(_name: string, _acquireTimeout: number, fn: () => Promise<R>): Promise<R> => fn(),
            storage: {
              getItem: (key) => {
                try {
                  return localStorage.getItem(key);
                } catch (error) {
                  this.logger.error('SupabaseClientFactory.localStorage.getItem', error);
                  return null;
                }
              },
              setItem: (key, value) => {
                try {
                  localStorage.setItem(key, value);
                } catch (error) {
                  this.logger.error('SupabaseClientFactory.localStorage.setItem', error);
                }
              },
              removeItem: (key) => {
                try {
                  localStorage.removeItem(key);
                } catch (error) {
                  this.logger.error('SupabaseClientFactory.localStorage.removeItem', error);
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
