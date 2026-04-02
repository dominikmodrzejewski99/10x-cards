import { Injectable, inject } from '@angular/core';
import { Observable, from, map, catchError, throwError } from 'rxjs';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from './supabase-client.factory';
import { BrowsePublicSetsResponse } from '../../types';

@Injectable({ providedIn: 'root' })
export class ExploreService {
  private supabase: SupabaseClient = inject(SupabaseClientFactory).getClient();

  browse(search: string, sort: string, page: number, pageSize: number): Observable<BrowsePublicSetsResponse> {
    return from(
      this.supabase.rpc('browse_public_sets', {
        p_search: search,
        p_sort: sort,
        p_page: page,
        p_page_size: pageSize
      })
    ).pipe(
      map(response => {
        if (response.error) throw new Error(response.error.message);
        return response.data as BrowsePublicSetsResponse;
      }),
      catchError(error => throwError(() => error))
    );
  }

  copySet(setId: number): Observable<number> {
    return from(
      this.supabase.rpc('copy_public_set', { p_set_id: setId })
    ).pipe(
      map(response => {
        if (response.error) throw new Error(response.error.message);
        return response.data as number;
      }),
      catchError(error => throwError(() => error))
    );
  }

  publishSet(setId: number): Observable<void> {
    return from(
      this.supabase.rpc('publish_set', { p_set_id: setId })
    ).pipe(
      map(response => {
        if (response.error) throw new Error(response.error.message);
      }),
      catchError(error => throwError(() => error))
    );
  }

  unpublishSet(setId: number): Observable<void> {
    return from(
      this.supabase.rpc('unpublish_set', { p_set_id: setId })
    ).pipe(
      map(response => {
        if (response.error) throw new Error(response.error.message);
      }),
      catchError(error => throwError(() => error))
    );
  }
}
