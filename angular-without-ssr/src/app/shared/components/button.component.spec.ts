import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Component } from '@angular/core';
import { ButtonComponent, ButtonVariant, ButtonSize } from './button.component';

@Component({
  template: `
    <app-btn
      [variant]="variant"
      [size]="size"
      [disabled]="disabled"
      [type]="type"
      (btnClick)="onBtnClick($event)">
      Test Label
    </app-btn>
  `,
  imports: [ButtonComponent],
})
class TestHostComponent {
  public variant: ButtonVariant = 'primary';
  public size: ButtonSize = 'md';
  public disabled: boolean = false;
  public type: 'button' | 'submit' = 'button';
  public lastEvent: Event | undefined;

  public onBtnClick(event: Event): void {
    this.lastEvent = event;
  }
}

describe('ButtonComponent', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let hostComponent: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ButtonComponent, TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    hostComponent = fixture.componentInstance;
    fixture.detectChanges();
  });

  function getButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  }

  it('should create', () => {
    const component: ButtonComponent = fixture.debugElement.children[0].componentInstance as ButtonComponent;
    expect(component).toBeTruthy();
  });

  it('should render projected content', () => {
    const btn: HTMLButtonElement = getButton();
    expect(btn.textContent?.trim()).toContain('Test Label');
  });

  it('should apply default CSS classes', () => {
    const btn: HTMLButtonElement = getButton();
    expect(btn.className).toContain('btn');
    expect(btn.className).toContain('btn--primary');
    expect(btn.className).toContain('btn--md');
  });

  it('should apply custom variant class', () => {
    hostComponent.variant = 'danger';
    fixture.detectChanges();
    const btn: HTMLButtonElement = getButton();
    expect(btn.className).toContain('btn--danger');
  });

  it('should apply custom size class', () => {
    hostComponent.size = 'lg';
    fixture.detectChanges();
    const btn: HTMLButtonElement = getButton();
    expect(btn.className).toContain('btn--lg');
  });

  it('should apply sm size class', () => {
    hostComponent.size = 'sm';
    fixture.detectChanges();
    const btn: HTMLButtonElement = getButton();
    expect(btn.className).toContain('btn--sm');
  });

  it('should not be disabled by default', () => {
    const btn: HTMLButtonElement = getButton();
    expect(btn.disabled).toBeFalse();
  });

  it('should be disabled when disabled input is true', () => {
    hostComponent.disabled = true;
    fixture.detectChanges();
    const btn: HTMLButtonElement = getButton();
    expect(btn.disabled).toBeTrue();
  });

  it('should have type="button" by default', () => {
    const btn: HTMLButtonElement = getButton();
    expect(btn.type).toBe('button');
  });

  it('should set type="submit" when configured', () => {
    hostComponent.type = 'submit';
    fixture.detectChanges();
    const btn: HTMLButtonElement = getButton();
    expect(btn.type).toBe('submit');
  });

  it('should emit btnClick when clicked and not disabled', () => {
    const btn: HTMLButtonElement = getButton();
    btn.click();
    expect(hostComponent.lastEvent).toBeTruthy();
  });

  it('should not emit btnClick when disabled', () => {
    hostComponent.disabled = true;
    fixture.detectChanges();
    const btn: HTMLButtonElement = getButton();
    btn.click();
    expect(hostComponent.lastEvent).toBeUndefined();
  });

  it('should apply all variant types correctly', () => {
    const variants: ButtonVariant[] = ['primary', 'success', 'danger', 'warning', 'purple', 'ghost', 'outline', 'text'];
    for (const variant of variants) {
      hostComponent.variant = variant;
      fixture.detectChanges();
      const btn: HTMLButtonElement = getButton();
      expect(btn.className).toContain(`btn--${variant}`);
    }
  });

  it('should generate correct button classes', () => {
    const component: ButtonComponent = fixture.debugElement.children[0].componentInstance as ButtonComponent;
    hostComponent.variant = 'success';
    hostComponent.size = 'lg';
    fixture.detectChanges();
    expect(component.buttonClasses()).toBe('btn btn--success btn--lg');
  });
});
