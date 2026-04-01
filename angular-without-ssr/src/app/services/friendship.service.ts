import { Injectable, inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from './supabase-client.factory';
import { FriendDTO, FriendRequestDTO, FriendStatsDTO } from '../../types';

@Injectable({ providedIn: 'root' })
export class FriendshipService {
  private supabase: SupabaseClient = inject(SupabaseClientFactory).getClient();

  async sendRequest(email: string): Promise<{ friendship_id: string; status: string }> {
    const { data, error } = await this.supabase.rpc('send_friend_request', {
      target_email: email.trim()
    });
    if (error) throw error;
    return data as { friendship_id: string; status: string };
  }

  async getPendingRequests(): Promise<FriendRequestDTO[]> {
    const { data, error } = await this.supabase.rpc('get_pending_requests');
    if (error) throw error;
    return (data as FriendRequestDTO[]) || [];
  }

  async getFriends(): Promise<FriendDTO[]> {
    const { data, error } = await this.supabase.rpc('get_friends_list');
    if (error) throw error;
    return (data as FriendDTO[]) || [];
  }

  async respondToRequest(friendshipId: string, accept: boolean): Promise<void> {
    const { error } = await this.supabase.rpc('respond_to_friend_request', {
      p_friendship_id: friendshipId,
      p_response: accept ? 'accepted' : 'rejected'
    });
    if (error) throw error;
  }

  async removeFriend(friendshipId: string): Promise<void> {
    const { error } = await this.supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId);
    if (error) throw error;
  }

  async getFriendStats(userId: string): Promise<FriendStatsDTO> {
    const { data, error } = await this.supabase.rpc('get_friend_stats', {
      p_friend_user_id: userId
    });
    if (error) throw error;
    return data as FriendStatsDTO;
  }

  async sendNudge(friendUserId: string): Promise<void> {
    const { error } = await this.supabase.rpc('send_nudge', {
      p_friend_user_id: friendUserId
    });
    if (error) throw error;
  }
}
