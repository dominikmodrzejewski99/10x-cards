import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthorProfileComponent } from './author-profile.component';
import { ExploreService } from '../../services/api/explore.service';
import { AuthorProfileDTO } from '../../../types';

describe('AuthorProfileComponent', () => {
  let component: AuthorProfileComponent;
  let fixture: ComponentFixture<AuthorProfileComponent>;
  let exploreServiceMock: jasmine.SpyObj<ExploreService>;

  const mockProfile: AuthorProfileDTO = {
    author_id: 'author-1',
    author_email_masked: 'j***@example.com',
    total_published_sets: 3,
    total_copies: 15,
    sets: [],
  };

  function createComponent(paramMap: Record<string, string | null> = { authorId: 'author-1' }): void {
    TestBed.overrideProvider(ActivatedRoute, {
      useValue: {
        snapshot: {
          paramMap: {
            get: (key: string) => paramMap[key] ?? null,
          },
        },
      },
    });

    fixture = TestBed.createComponent(AuthorProfileComponent);
    component = fixture.componentInstance;
  }

  beforeEach(async () => {
    exploreServiceMock = jasmine.createSpyObj<ExploreService>('ExploreService', [
      'getAuthorPublicSets',
    ]);
    exploreServiceMock.getAuthorPublicSets.and.returnValue(of(mockProfile));

    await TestBed.configureTestingModule({
      imports: [AuthorProfileComponent],
      schemas: [NO_ERRORS_SCHEMA],
      providers: [
        { provide: ExploreService, useValue: exploreServiceMock },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: {
                get: (key: string) => key === 'authorId' ? 'author-1' : null,
              },
            },
          },
        },
      ],
    }).compileComponents();
  });

  it('should create', () => {
    createComponent();
    expect(component).toBeTruthy();
  });

  it('should load author profile from route param', () => {
    createComponent();
    fixture.detectChanges();

    expect(exploreServiceMock.getAuthorPublicSets).toHaveBeenCalledWith('author-1');
    expect((component as any)['_profile']()).toEqual(mockProfile);
    expect((component as any)['_loading']()).toBe(false);
  });

  it('should set error when authorId is missing', () => {
    createComponent({ authorId: null });
    fixture.detectChanges();

    expect(exploreServiceMock.getAuthorPublicSets).not.toHaveBeenCalled();
    expect((component as any)['_error']()).toBe('Brak identyfikatora autora.');
    expect((component as any)['_loading']()).toBe(false);
  });

  it('should set error on API failure', () => {
    exploreServiceMock.getAuthorPublicSets.and.returnValue(
      throwError(() => new Error('Server error'))
    );

    createComponent();
    fixture.detectChanges();

    expect((component as any)['_error']()).toBe('Server error');
    expect((component as any)['_loading']()).toBe(false);
  });
});
