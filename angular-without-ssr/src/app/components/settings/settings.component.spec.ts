import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { SettingsComponent } from './settings.component';
import { SettingsFacadeService } from '../../services/facades/settings-facade.service';

describe('SettingsComponent', () => {
  let component: SettingsComponent;
  let fixture: ComponentFixture<SettingsComponent>;

  const facadeMock: Record<string, jasmine.Spy> = {
    workDurationSignal: jasmine.createSpy('workDurationSignal').and.returnValue(25),
    breakDurationSignal: jasmine.createSpy('breakDurationSignal').and.returnValue(5),
    longBreakDurationSignal: jasmine.createSpy('longBreakDurationSignal').and.returnValue(15),
    sessionsBeforeLongBreakSignal: jasmine.createSpy('sessionsBeforeLongBreakSignal').and.returnValue(4),
    soundEnabledSignal: jasmine.createSpy('soundEnabledSignal').and.returnValue(true),
    notificationsEnabledSignal: jasmine.createSpy('notificationsEnabledSignal').and.returnValue(true),
    isSavingSignal: jasmine.createSpy('isSavingSignal').and.returnValue(false),
    savedSignal: jasmine.createSpy('savedSignal').and.returnValue(false),
    themeSignal: jasmine.createSpy('themeSignal').and.returnValue('light'),
    languageSignal: jasmine.createSpy('languageSignal').and.returnValue('pl'),

    init: jasmine.createSpy('init'),
    setWorkDuration: jasmine.createSpy('setWorkDuration'),
    setBreakDuration: jasmine.createSpy('setBreakDuration'),
    setLongBreakDuration: jasmine.createSpy('setLongBreakDuration'),
    setSessionsBeforeLongBreak: jasmine.createSpy('setSessionsBeforeLongBreak'),
    setSoundEnabled: jasmine.createSpy('setSoundEnabled'),
    setNotificationsEnabled: jasmine.createSpy('setNotificationsEnabled'),
    setTheme: jasmine.createSpy('setTheme'),
    setLanguage: jasmine.createSpy('setLanguage'),
    save: jasmine.createSpy('save'),
  };

  beforeEach(async () => {
    Object.values(facadeMock).forEach((spy: jasmine.Spy) => spy.calls.reset());

    await TestBed.configureTestingModule({
      imports: [
        SettingsComponent,
        TranslocoTestingModule.forRoot({
          langs: { pl: {} },
          translocoConfig: { availableLangs: ['pl', 'en'], defaultLang: 'pl' },
        }),
      ],
      providers: [
        { provide: SettingsFacadeService, useValue: facadeMock },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SettingsComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('ngOnInit', () => {
    it('should call facade.init()', () => {
      fixture.detectChanges();

      expect(facadeMock['init']).toHaveBeenCalledTimes(1);
    });
  });

  it('should render save button', () => {
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button');
    expect(button).toBeTruthy();
  });

  it('should render number inputs for pomodoro settings', () => {
    fixture.detectChanges();
    const inputs = fixture.nativeElement.querySelectorAll('input[type="number"]');
    expect(inputs.length).toBe(4);
  });

  it('should render checkbox inputs for toggles', () => {
    fixture.detectChanges();
    const checkboxes = fixture.nativeElement.querySelectorAll('input[type="checkbox"]');
    expect(checkboxes.length).toBe(2);
  });
});
