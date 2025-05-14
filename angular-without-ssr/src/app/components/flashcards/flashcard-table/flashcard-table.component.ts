import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { TooltipModule } from 'primeng/tooltip';

import { FlashcardDTO } from '../../../../types';

@Component({
  selector: 'app-flashcard-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    InputTextModule,
    TableModule,
    TooltipModule
  ],
  templateUrl: './flashcard-table.component.html',
  styleUrls: ['./flashcard-table.component.css']
})
export class FlashcardTableComponent implements OnInit {
  @Input() flashcards: FlashcardDTO[] = [];
  @Input() loading: boolean = false;
  @Input() totalRecords: number = 0;
  @Input() rows: number = 10;
  @Input() first: number = 0;
  @Input() sortField: string = 'id';
  @Input() sortOrder: number = -1;
  @Input() searchTerm: string = '';

  @Output() editFlashcard = new EventEmitter<FlashcardDTO>();
  @Output() deleteFlashcard = new EventEmitter<FlashcardDTO>();
  @Output() lazyLoad = new EventEmitter<any>();
  @Output() sort = new EventEmitter<any>();
  @Output() search = new EventEmitter<string>();
  @Output() resetFilter = new EventEmitter<void>();

  // Zmienna do śledzenia poprzedniej wartości searchTerm
  private previousSearchTerm: string = '';

  // Zmienna do przechowywania identyfikatora timeout dla wyszukiwania
  private searchTimeout: any = null;

  constructor() {}

  ngOnInit(): void {
    // Inicjalizacja komponentu
  }

  // Obsługa lazy loading dla tabeli
  onLazyLoad(event: any): void {
    this.lazyLoad.emit(event);
  }

  // Obsługa sortowania
  onSort(event: any): void {
    this.sort.emit(event);
  }

  // Obsługa wyszukiwania
  onSearch(): void {
    // Jeśli pole wyszukiwania jest puste, a wcześniej było wypełnione, wywołaj resetFilter
    if (!this.searchTerm && this.searchTerm !== this.previousSearchTerm) {
      this.onResetFilter();
      return;
    }

    this.previousSearchTerm = this.searchTerm;
    this.search.emit(this.searchTerm);
  }

  // Czyszczenie filtru wyszukiwania
  onResetFilter(): void {
    this.searchTerm = '';
    this.resetFilter.emit();
  }

  // Obsługa zmiany wartości pola wyszukiwania
  onSearchTermChange(): void {
    // Dodajemy opóźnienie, aby nie wywoływać wyszukiwania przy każdym naciśnięciu klawisza
    clearTimeout(this.searchTimeout);
    this.searchTimeout = setTimeout(() => {
      this.onSearch();
    }, 300); // 300ms opóźnienia
  }
}