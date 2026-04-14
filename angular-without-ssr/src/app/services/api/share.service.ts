import { Injectable, inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from '../infrastructure/supabase-client.factory';
import { ShareLinkDTO } from '../../../types';

@Injectable({ providedIn: 'root' })
export class ShareService {
  private supabase: SupabaseClient = inject(SupabaseClientFactory).getClient();

  async createShareLink(setId: number): Promise<ShareLinkDTO> {
    const userId = (await this.supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('Not authenticated');

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data, error } = await this.supabase
      .from('share_links')
      .insert({
        set_id: setId,
        created_by: userId,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) throw error;
    return data as ShareLinkDTO;
  }

  async acceptShareLink(linkId: string): Promise<number> {
    // Check if the link belongs to the current user (prevent self-acceptance)
    const userId = (await this.supabase.auth.getUser()).data.user?.id;
    if (userId) {
      const { data: link } = await this.supabase
        .from('share_links')
        .select('created_by')
        .eq('id', linkId)
        .single();

      if (link?.created_by === userId) {
        throw new Error('Cannot accept your own share link');
      }
    }

    const { data, error } = await this.supabase.rpc('accept_share_link', {
      link_id: linkId,
    });

    if (error) throw error;
    return data as number;
  }

  buildShareUrl(linkId: string): string {
    return `${window.location.origin}/share/${linkId}`;
  }
}
