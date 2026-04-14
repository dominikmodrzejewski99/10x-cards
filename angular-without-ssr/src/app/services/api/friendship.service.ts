import { Injectable, inject } from '@angular/core';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseClientFactory } from '../infrastructure/supabase-client.factory';
import { FriendDTO, FriendRequestDTO, FriendStatsDTO, SentRequestDTO, LeaderboardEntryDTO } from '../../../types';

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
    const userId = (await this.supabase.auth.getUser()).data.user?.id;
    if (!userId) throw new Error('Not authenticated');

    const { error } = await this.supabase
      .from('friendships')
      .delete()
      .eq('id', friendshipId)
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
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

  async getSentRequests(): Promise<SentRequestDTO[]> {
    const { data, error } = await this.supabase.rpc('get_sent_requests');
    if (error) throw error;
    return (data as SentRequestDTO[]) || [];
  }

  async cancelRequest(friendshipId: string): Promise<void> {
    const { error } = await this.supabase.rpc('cancel_friend_request', {
      p_friendship_id: friendshipId
    });
    if (error) throw error;
  }

  async getLeaderboard(): Promise<LeaderboardEntryDTO[]> {
    const { data, error } = await this.supabase.rpc('get_friends_leaderboard');
    if (error) throw error;
    return (data as LeaderboardEntryDTO[]) || [];
  }

  async shareDeckToFriend(setId: number, friendUserId: string): Promise<string> {
    const { data, error } = await this.supabase.rpc('share_deck_to_friend', {
      p_set_id: setId,
      p_friend_user_id: friendUserId
    });
    if (error) throw error;
    return data as string;
  }

  async acceptDeckShare(deckShareId: string): Promise<number> {
    const { data, error } = await this.supabase.rpc('accept_deck_share', {
      p_deck_share_id: deckShareId
    });
    if (error) throw error;
    return data as number;
  }
}
