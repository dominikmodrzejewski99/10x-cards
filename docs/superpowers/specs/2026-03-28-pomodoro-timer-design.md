# Pomodoro Timer — Design Spec

## Overview

Global Pomodoro timer for the 10x-cards app. Displays as a compact widget in the navbar, available on all authenticated pages. Configurable through a new `/settings` page.

## Components

### PomodoroService (`services/pomodoro.service.ts`)

Core timer logic using signals. `providedIn: 'root'` — lives for the app lifetime.

- **Signals:** `timeRemaining`, `phase` (`work` | `break` | `longBreak`), `isRunning`, `sessionsCompleted`, `totalSessionsBeforeLongBreak`
- **Methods:**
  - `start()` — begins work phase, requests notification permission via user gesture
  - `pause()` — pauses timer, clears interval, saves `pausedTimeRemaining` to localStorage
  - `resume()` — resumes from paused state, sets new `startedAt`
  - `reset()` — clears interval, resets all state, clears localStorage
  - `skip()` — ends current phase early, transitions to the next phase (work→break, break→work, etc.)
- **Timer:** `setInterval(1000)` computes `timeRemaining` from `Date.now() - startedAt` on each tick (not naive decrement) to avoid drift in background tabs
- **Phase transitions:** work → break → work → ... → longBreak (every N sessions)
- **Notifications:** Browser Notification API + Audio API on phase end
- **Audio:** Bundled short bell sound (`assets/sounds/pomodoro-bell.mp3`), played via `new Audio()`
- **Cleanup:** `pause()` and `reset()` clear the interval. `beforeunload` event listener persists state to localStorage on tab close.
- **localStorage persistence:** saves to key `10x_pomodoro_state` on each state change:
  - `{ startedAt, phase, sessionsCompleted, isRunning, pausedTimeRemaining }`
  - On app load: waits for settings to load first, then checks localStorage:
    - If `isRunning` and elapsed < phase duration → restore position
    - If elapsed > phase duration → reset to inactive
    - If paused → restore pause state

### PomodoroSettingsService — NOT a separate service

Pomodoro settings are read/written via the existing `UserPreferencesService`. The `updatePreferences()` method's type will be widened from `Partial<Pick<UserPreferencesDTO, 'onboarding_completed'>>` to include all pomodoro fields. No separate service needed — keeps one source of truth for the `user_preferences` table.

New fields on `UserPreferencesDTO`:

```typescript
// Added to UserPreferencesDTO in types.ts
pomodoro_work_duration: number;        // default: 25
pomodoro_break_duration: number;       // default: 5
pomodoro_long_break_duration: number;  // default: 15
pomodoro_sessions_before_long_break: number; // default: 4
pomodoro_sound_enabled: boolean;       // default: true
pomodoro_notifications_enabled: boolean; // default: true
pomodoro_focus_reminder_dismissed: boolean; // default: false
```

### PomodoroTimerComponent (`shared/components/pomodoro-timer/`)

Navbar widget:

- **Inactive state:** Button with tomato icon + "Pomodoro" text
- **Active work state:** Green badge with timer `21:37` + session progress `2/4`
- **Break state:** Blue badge with coffee icon + "przerwa"
- **Click → dropdown:** Large timer display, phase name, controls (pause/resume, reset, skip), session progress dots, "Zakończ sesję" link
- **Mobile:** Compact badge (time only, no text), dropdown as full-width bottom sheet

### SettingsPageComponent (`components/settings/`)

New page at `/settings`:

- **Pomodoro section:** Number inputs for durations (work, break, long break), sessions before long break. Toggles for sound and browser notifications.
- **Validation bounds:** work: 1–120 min, break: 1–60 min, long break: 1–60 min, sessions: 1–10
- **Future sections:** Placeholder for theme, language, etc.
- **Responsive:** 3-column grid → 1-column on mobile
- **Navigation:** Accessible from user menu dropdown in the navbar (new "Ustawienia" link)

### Focus Reminder Dialog

Shown on first Pomodoro start:

- Reminds user to enable OS "Do Not Disturb" mode
- Instructions per OS (Windows Focus Assist, macOS Focus, mobile DnD)
- Checkbox "Nie pokazuj ponownie" → saves `pomodoro_focus_reminder_dismissed` to Supabase
- "Zaczynamy!" button click triggers `Notification.requestPermission()` (valid user gesture) and then starts the timer

## UI text (Polish)

All user-facing strings are in Polish:
- "Pomodoro", "przerwa", "Zakończ sesję", "Nie pokazuj ponownie", "Zaczynamy!", "Ustawienia", "Czas nauki", "Przerwa", "Długa przerwa", "Sesje do długiej przerwy", "Dźwięk powiadomienia", "Notyfikacje przeglądarki", "Tryb skupienia"

## Modified Files

- `app.routes.ts` — add `/settings` route (lazy loaded, authGuard)
- `auth-navbar.component` — add `<app-pomodoro-timer>` next to user menu
- `user-menu.component` — add "Ustawienia" link to `/settings`
- `bottom-nav.component` — compact timer badge on mobile
- `types.ts` — extend `UserPreferencesDTO` with pomodoro fields
- `user-preferences.service.ts` — widen `updatePreferences()` type to include pomodoro fields
- Supabase migration — add pomodoro columns to `user_preferences` table

## Notification Flow

1. "Zaczynamy!" button click → `Notification.requestPermission()` (user gesture required by browsers)
2. If user denies → auto-disable notifications toggle
3. On phase end: play bell sound (if enabled) + push browser notification (if enabled) + visual pulse in navbar

## localStorage Schema

Key: `10x_pomodoro_state`

```json
{
  "startedAt": 1706000000000,
  "phase": "work",
  "sessionsCompleted": 2,
  "isRunning": true,
  "pausedTimeRemaining": null
}
```

## Supabase Migration

Existing RLS policies on `user_preferences` are row-level (filter by `user_id`), so new columns are automatically covered — no new policies needed.

```sql
ALTER TABLE user_preferences
  ADD COLUMN pomodoro_work_duration integer NOT NULL DEFAULT 25,
  ADD COLUMN pomodoro_break_duration integer NOT NULL DEFAULT 5,
  ADD COLUMN pomodoro_long_break_duration integer NOT NULL DEFAULT 15,
  ADD COLUMN pomodoro_sessions_before_long_break integer NOT NULL DEFAULT 4,
  ADD COLUMN pomodoro_sound_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN pomodoro_notifications_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN pomodoro_focus_reminder_dismissed boolean NOT NULL DEFAULT false;
```

## Testing

- **Unit tests:** PomodoroService (timer logic, phase transitions, localStorage save/restore, skip, reset), settings validation bounds
- **Component tests:** PomodoroTimerComponent (render states, dropdown toggle, button actions), SettingsPageComponent (form inputs, save)
- **E2E tests:** Start/pause/reset flow, settings page save and verify, timer survives page reload
