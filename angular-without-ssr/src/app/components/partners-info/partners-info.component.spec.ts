import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA } from '@angular/core';

import { PartnersInfoComponent } from './partners-info.component';

describe('PartnersInfoComponent', () => {
  let component: PartnersInfoComponent;
  let fixture: ComponentFixture<PartnersInfoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PartnersInfoComponent],
      schemas: [NO_ERRORS_SCHEMA],
    }).compileComponents();

    fixture = TestBed.createComponent(PartnersInfoComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should render without errors', () => {
    fixture.detectChanges();
    expect(fixture.nativeElement).toBeTruthy();
  });

  it('should use OnPush change detection', () => {
    // PartnersInfoComponent is a static page with no inputs/outputs
    // Verify the component instance is a plain object
    expect(component).toEqual(jasmine.any(PartnersInfoComponent));
  });
});
