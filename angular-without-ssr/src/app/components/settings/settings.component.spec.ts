import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettingsComponent } from './settings.component';
import { UserPreferencesService } from '../../services/user-preferences.service';
import { PomodoroService } from '../../services/pomodoro.service';
import { of } from 'rxjs';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;
  let mockPrefsService: jasmine.SpyObj<UserPreferencesService>;
  let mockPomodoroService: jasmine.SpyObj<PomodoroService>;

  const mockPrefs = {
    pomodoro_work_duration: 25,
    pomodoro_break_duration: 5,
    pomodoro_long_break_duration: 15,
    pomodoro_sessions_before_long_break: 4,
    pomodoro_sound_enabled: true,
    pomodoro_notifications_enabled: true
  };

  beforeEach(() => {
    mockPrefsService = jasmine.createSpyObj('UserPreferencesService', ['getPreferences', 'updatePreferences']);
    mockPrefsService.getPreferences.and.returnValue(of(mockPrefs as any));
    mockPrefsService.updatePreferences.and.returnValue(of(mockPrefs as any));

    mockPomodoroService = jasmine.createSpyObj('PomodoroService', ['reloadSettings']);

    TestBed.configureTestingModule({
      imports: [SettingsComponent],
      providers: [
        { provide: UserPreferencesService, useValue: mockPrefsService },
        { provide: PomodoroService, useValue: mockPomodoroService }
      ]
    });
    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load preferences on init', () => {
    fixture.detectChanges();
    expect(mockPrefsService.getPreferences).toHaveBeenCalled();
    expect(component.workDurationSignal()).toBe(25);
    expect(component.breakDurationSignal()).toBe(5);
  });

  it('should clamp work duration to min 1', () => {
    fixture.detectChanges();
    component.workDurationSignal.set(0);
    component.save();
    expect(component.workDurationSignal()).toBe(1);
  });

  it('should clamp work duration to max 120', () => {
    fixture.detectChanges();
    component.workDurationSignal.set(200);
    component.save();
    expect(component.workDurationSignal()).toBe(120);
  });

  it('should save preferences and reload pomodoro settings', () => {
    fixture.detectChanges();
    component.workDurationSignal.set(30);
    component.save();
    expect(mockPrefsService.updatePreferences).toHaveBeenCalledWith(
      jasmine.objectContaining({ pomodoro_work_duration: 30 })
    );
    expect(mockPomodoroService.reloadSettings).toHaveBeenCalled();
  });
});
