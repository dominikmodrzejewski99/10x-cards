import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, shareReplay } from 'rxjs';
import { TestDefinition, TestLevel } from '../../../types';

@Injectable({
  providedIn: 'root'
})
export class LanguageTestBankService {
  private http = inject(HttpClient);
  private cache = new Map<TestLevel, Observable<TestDefinition>>();

  private readonly paths: Record<TestLevel, string> = {
    'b1': 'assets/test-banks/b1.json',
    'b2-fce': 'assets/test-banks/b2-fce.json',
    'c1-cae': 'assets/test-banks/c1-cae.json'
  };

  getTest(level: TestLevel): Observable<TestDefinition> {
    const cached = this.cache.get(level);
    if (cached) return cached;

    const test$ = this.http.get<TestDefinition>(this.paths[level]).pipe(
      shareReplay(1)
    );
    this.cache.set(level, test$);
    return test$;
  }

  getAvailableLevels(): { level: TestLevel; title: string; description: string; questionCount: number; estimatedMinutes: number }[] {
    return [
      { level: 'b1', title: 'B1 Preliminary', description: 'Test sprawdzający znajomość angielskiego na poziomie B1', questionCount: 30, estimatedMinutes: 20 },
      { level: 'b2-fce', title: 'B2 First (FCE)', description: 'Test sprawdzający znajomość angielskiego na poziomie B2', questionCount: 30, estimatedMinutes: 25 },
      { level: 'c1-cae', title: 'C1 Advanced (CAE)', description: 'Test sprawdzający znajomość angielskiego na poziomie C1', questionCount: 30, estimatedMinutes: 30 }
    ];
  }
}
