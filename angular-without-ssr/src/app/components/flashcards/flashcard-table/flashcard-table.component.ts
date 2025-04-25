import { Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TableModule } from 'primeng/table';
import { ButtonModule } from 'primeng/button';
import { PaginatorModule } from 'primeng/paginator';
import { InputTextModule } from 'primeng/inputtext';
import { FlashcardDTO } from '../../../../types';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-flashcard-table',
  standalone: true,
  imports: [
    CommonModule,
    TableModule,
    ButtonModule,
    PaginatorModule,
    InputTextModule,
    FormsModule
  ],
  templateUrl: './flashcard-table.component.html',
  styleUrls: ['./flashcard-table.component.css']
})
export class FlashcardTableComponent {
  @Input() flashcards: FlashcardDTO[] = [];
  @Input() loading: boolean = false;
  @Input() totalRecords: number = 0;
  @Input() rows: number = 10;
  @Input() first: number = 0;
  @Input() set searchTerm(value: string) {
    this._searchTerm.set(value);
  }
  get searchTerm(): string {
    return this._searchTerm();
  }
  _searchTerm = signal<string>('');
  @Input() sortField: string = 'id';
  @Input() sortOrder: number = -1;

  // Zmienna do śledzenia poprzedniej wartości searchTerm
  private previousSearchTerm: string = '';

  // Zmienna do przechowywania identyfikatora timeout dla wyszukiwania
  private searchTimeout: any = null;

  @Output() edit = new EventEmitter<FlashcardDTO>();
  @Output() delete = new EventEmitter<FlashcardDTO>();
  @Output() pageChange = new EventEmitter<any>();
  @Output() sort = new EventEmitter<any>();
  @Output() search = new EventEmitter<string>();
  @Output() resetFilter = new EventEmitter<void>();

  // Obsługa edycji fiszki
  onEdit(flashcard: FlashcardDTO): void {
    this.edit.emit(flashcard);
  }

  // Obsługa usuwania fiszki
  onDelete(flashcard: FlashcardDTO): void {
    this.delete.emit(flashcard);
  }

  // Obsługa zmiany strony (paginacja)
  onPageChange(event: any): void {
    this.pageChange.emit(event);
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