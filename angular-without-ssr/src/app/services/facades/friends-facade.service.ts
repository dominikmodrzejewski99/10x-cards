import { Injectable, inject, signal, computed } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { FriendshipService } from '../api/friendship.service';
import { UserPreferencesService } from '../domain/user-preferences.service';
import { ToastService } from '../../shared/services/toast.service';
import {
  FriendDTO,
  FriendRequestDTO,
  SentRequestDTO,
  LeaderboardEntryDTO,
  LeaderboardCategory,
  FriendStatsDTO,
  UserPreferencesDTO
} from '../../../types';

@Injectable({ providedIn: 'root' })
export class FriendsFacadeService {
  private readonly friendshipService: FriendshipService = inject(FriendshipService);
  private readonly userPreferencesService: UserPreferencesService = inject(UserPreferencesService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly t: TranslocoService = inject(TranslocoService);

  // Friends list state
  private readonly _friends = signal<FriendDTO[]>([]);
  private readonly _pendingRequests = signal<FriendRequestDTO[]>([]);
  private readonly _sentRequests = signal<SentRequestDTO[]>([]);
  private readonly _loading = signal<boolean>(true);
  private readonly _sending = signal<boolean>(false);
  private readonly _emailInput = signal<string>('');

  // Leaderboard state
  private readonly _leaderboardEntries = signal<LeaderboardEntryDTO[]>([]);
  private readonly _leaderboardLoading = signal<boolean>(true);
  private readonly _activeCategory = signal<LeaderboardCategory>('streak');

  // Friend stats state
  private readonly _friendStats = signal<FriendStatsDTO | null>(null);
  private readonly _myStats = signal<UserPreferencesDTO | null>(null);
  private readonly _statsLoading = signal<boolean>(true);
  private readonly _statsError = signal<boolean>(false);

  // Share dialog state
  private readonly _shareFriends = signal<FriendDTO[]>([]);
  private readonly _shareLoading = signal<boolean>(false);
  private readonly _sharedTo = signal<Set<string>>(new Set());
  private readonly _sharing = signal<string | null>(null);

  // Public readonly signals
  public readonly friendsSignal = this._friends.asReadonly();
  public readonly pendingRequestsSignal = this._pendingRequests.asReadonly();
  public readonly sentRequestsSignal = this._sentRequests.asReadonly();
  public readonly loadingSignal = this._loading.asReadonly();
  public readonly sendingSignal = this._sending.asReadonly();
  public readonly emailInputSignal = this._emailInput.asReadonly();

  public readonly leaderboardEntriesSignal = this._leaderboardEntries.asReadonly();
  public readonly leaderboardLoadingSignal = this._leaderboardLoading.asReadonly();
  public readonly activeCategorySignal = this._activeCategory.asReadonly();

  public readonly friendStatsSignal = this._friendStats.asReadonly();
  public readonly myStatsSignal = this._myStats.asReadonly();
  public readonly statsLoadingSignal = this._statsLoading.asReadonly();
  public readonly statsErrorSignal = this._statsError.asReadonly();

  public readonly shareFriendsSignal = this._shareFriends.asReadonly();
  public readonly shareLoadingSignal = this._shareLoading.asReadonly();
  public readonly sharedToSignal = this._sharedTo.asReadonly();
  public readonly sharingSignal = this._sharing.asReadonly();

  // Computed
  public readonly sortedEntriesSignal = computed(() => {
    const cat = this._activeCategory();
    const list = [...this._leaderboardEntries()];
    const key = cat === 'streak' ? 'current_streak'
      : cat === 'cards_this_week' ? 'cards_this_week'
      : 'total_cards_reviewed';
    return list.sort((a, b) => b[key] - a[key]);
  });

  // --- Friends list methods ---

  async loadFriendsList(): Promise<void> {
    this._loading.set(true);
    try {
      const [friends, pending, sent] = await Promise.all([
        this.friendshipService.getFriends(),
        this.friendshipService.getPendingRequests(),
        this.friendshipService.getSentRequests()
      ]);
      this._friends.set(friends);
      this._pendingRequests.set(pending);
      this._sentRequests.set(sent);
    } catch {
      this.toastService.add({
        severity: 'error',
        summary: this.t.translate('toasts.error'),
        detail: this.t.translate('friends.toasts.loadFailed')
      });
    } finally {
      this._loading.set(false);
    }
  }

  async sendRequest(): Promise<void> {
    const email = this._emailInput().trim();
    if (!email) return;

    this._sending.set(true);
    try {
      await this.friendshipService.sendRequest(email);
      this._emailInput.set('');
      this.toastService.add({
        severity: 'success',
        summary: this.t.translate('toasts.sent'),
        detail: this.t.translate('friends.toasts.inviteSent')
      });
      const sent = await this.friendshipService.getSentRequests();
      this._sentRequests.set(sent);
    } catch (error: unknown) {
      const msg: string = (error as { message?: string })?.message || this.t.translate('friends.toasts.inviteSendFailed');
      this.toastService.add({
        severity: 'error',
        summary: this.t.translate('toasts.error'),
        detail: msg
      });
    } finally {
      this._sending.set(false);
    }
  }

  setEmailInput(value: string): void {
    this._emailInput.set(value);
  }

  async acceptRequest(friendshipId: string): Promise<void> {
    try {
      await this.friendshipService.respondToRequest(friendshipId, true);
      this.toastService.add({
        severity: 'success',
        summary: this.t.translate('toasts.accepted'),
        detail: this.t.translate('friends.toasts.friendAccepted')
      });
      await this.loadFriendsList();
    } catch {
      this.toastService.add({
        severity: 'error',
        summary: this.t.translate('toasts.error'),
        detail: this.t.translate('friends.toasts.acceptFailed')
      });
    }
  }

  async rejectRequest(friendshipId: string): Promise<void> {
    try {
      await this.friendshipService.respondToRequest(friendshipId, false);
      this._pendingRequests.update(list => list.filter(r => r.friendship_id !== friendshipId));
    } catch {
      this.toastService.add({
        severity: 'error',
        summary: this.t.translate('toasts.error'),
        detail: this.t.translate('friends.toasts.rejectFailed')
      });
    }
  }

  async removeFriend(friendshipId: string): Promise<void> {
    try {
      await this.friendshipService.removeFriend(friendshipId);
      this._friends.update(list => list.filter(f => f.friendship_id !== friendshipId));
      this.toastService.add({
        severity: 'success',
        summary: this.t.translate('toasts.deleted'),
        detail: this.t.translate('friends.toasts.friendRemoved')
      });
    } catch {
      this.toastService.add({
        severity: 'error',
        summary: this.t.translate('toasts.error'),
        detail: this.t.translate('friends.toasts.removeFailed')
      });
    }
  }

  async sendNudge(friendUserId: string): Promise<void> {
    try {
      await this.friendshipService.sendNudge(friendUserId);
      this.toastService.add({
        severity: 'success',
        summary: this.t.translate('toasts.sent'),
        detail: this.t.translate('friends.toasts.nudgeSent')
      });
    } catch (error: unknown) {
      const msg: string = (error as { message?: string })?.message || this.t.translate('friends.toasts.nudgeSendFailed');
      this.toastService.add({
        severity: 'warn',
        summary: this.t.translate('toasts.warning'),
        detail: msg
      });
    }
  }

  async cancelRequest(friendshipId: string): Promise<void> {
    try {
      await this.friendshipService.cancelRequest(friendshipId);
      this._sentRequests.update(list => list.filter(r => r.friendship_id !== friendshipId));
      this.toastService.add({
        severity: 'success',
        summary: this.t.translate('toasts.cancelled'),
        detail: this.t.translate('friends.toasts.inviteCancelled')
      });
    } catch {
      this.toastService.add({
        severity: 'error',
        summary: this.t.translate('toasts.error'),
        detail: this.t.translate('friends.toasts.cancelFailed')
      });
    }
  }

  // --- Leaderboard methods ---

  async loadLeaderboard(): Promise<void> {
    this._leaderboardLoading.set(true);
    try {
      const data = await this.friendshipService.getLeaderboard();
      this._leaderboardEntries.set(data);
    } catch {
      this.toastService.add({
        severity: 'error',
        summary: this.t.translate('toasts.error'),
        detail: this.t.translate('friends.toasts.leaderboardFailed')
      });
    } finally {
      this._leaderboardLoading.set(false);
    }
  }

  setActiveCategory(cat: LeaderboardCategory): void {
    this._activeCategory.set(cat);
  }

  getValueForCategory(entry: LeaderboardEntryDTO): number {
    switch (this._activeCategory()) {
      case 'streak': return entry.current_streak;
      case 'cards_this_week': return entry.cards_this_week;
      case 'total_cards': return entry.total_cards_reviewed;
    }
  }

  // --- Friend stats methods ---

  async loadFriendStats(userId: string): Promise<void> {
    this._statsLoading.set(true);
    this._statsError.set(false);
    try {
      const [friendData, myPrefs] = await Promise.all([
        this.friendshipService.getFriendStats(userId),
        new Promise<UserPreferencesDTO>((resolve, reject) => {
          this.userPreferencesService.getPreferences().subscribe({
            next: resolve,
            error: reject
          });
        })
      ]);
      this._friendStats.set(friendData);
      this._myStats.set(myPrefs);
    } catch {
      this.toastService.add({
        severity: 'error',
        summary: this.t.translate('toasts.error'),
        detail: this.t.translate('friends.toasts.statsFailed')
      });
      this._statsError.set(true);
    } finally {
      this._statsLoading.set(false);
    }
  }

  // --- Share dialog methods ---

  async loadShareFriends(): Promise<void> {
    this._shareLoading.set(true);
    try {
      const friends = await this.friendshipService.getFriends();
      this._shareFriends.set(friends);
    } catch {
      this.toastService.add({
        severity: 'error',
        summary: this.t.translate('toasts.error'),
        detail: this.t.translate('friends.toasts.loadFriendsFailed')
      });
    } finally {
      this._shareLoading.set(false);
    }
  }

  async shareToFriend(setId: number, friendUserId: string): Promise<void> {
    this._sharing.set(friendUserId);
    try {
      await this.friendshipService.shareDeckToFriend(setId, friendUserId);
      this._sharedTo.update(set => new Set(set).add(friendUserId));
      this.toastService.add({
        severity: 'success',
        summary: this.t.translate('toasts.shared'),
        detail: this.t.translate('friends.toasts.setShared')
      });
    } catch (error: unknown) {
      const msg: string = (error as { message?: string })?.message || this.t.translate('friends.toasts.shareFailed');
      this.toastService.add({
        severity: 'error',
        summary: this.t.translate('toasts.error'),
        detail: msg
      });
    } finally {
      this._sharing.set(null);
    }
  }

  resetShareState(): void {
    this._shareFriends.set([]);
    this._sharedTo.set(new Set());
    this._sharing.set(null);
    this._shareLoading.set(false);
  }

  // --- Utility methods ---

  getDaysInactive(lastStudyDate: string | null): number | null {
    if (!lastStudyDate) return null;
    const last = new Date(lastStudyDate);
    const now = new Date();
    return Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
  }

  isShared(friendUserId: string): boolean {
    return this._sharedTo().has(friendUserId);
  }
}
