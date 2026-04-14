import { Injectable } from '@angular/core';
import { FlashcardDTO } from '../../../types';

interface CsvRow {
  front: string;
  back: string;
  front_language: string;
  back_language: string;
  source: string;
}

const CSV_HEADERS: readonly string[] = ['front', 'back', 'front_language', 'back_language', 'source'] as const;
const BOM: string = '\uFEFF';

@Injectable({
  providedIn: 'root'
})
export class FlashcardExportService {
  public exportToCsv(flashcards: FlashcardDTO[], filename: string): void {
    const rows: string[] = [CSV_HEADERS.join(',')];

    for (const flashcard of flashcards) {
      const row: CsvRow = {
        front: flashcard.front,
        back: flashcard.back,
        front_language: flashcard.front_language ?? '',
        back_language: flashcard.back_language ?? '',
        source: flashcard.source
      };

      const csvLine: string = CSV_HEADERS
        .map((header: string) => this.escapeCsvField(row[header as keyof CsvRow]))
        .join(',');

      rows.push(csvLine);
    }

    const csvContent: string = BOM + rows.join('\r\n');
    this.downloadFile(csvContent, filename, 'text/csv;charset=utf-8');
  }

  public exportToJson(flashcards: FlashcardDTO[], filename: string): void {
    const exportData: Pick<FlashcardDTO, 'front' | 'back' | 'front_language' | 'back_language' | 'source'>[] =
      flashcards.map((flashcard: FlashcardDTO) => ({
        front: flashcard.front,
        back: flashcard.back,
        front_language: flashcard.front_language,
        back_language: flashcard.back_language,
        source: flashcard.source
      }));

    const jsonContent: string = JSON.stringify(exportData, null, 2);
    this.downloadFile(jsonContent, filename, 'application/json;charset=utf-8');
  }

  private escapeCsvField(value: string): string {
    if (value.includes('"') || value.includes(',') || value.includes('\n') || value.includes('\r')) {
      return '"' + value.replace(/"/g, '""') + '"';
    }
    return value;
  }

  private downloadFile(content: string, filename: string, mimeType: string): void {
    const blob: Blob = new Blob([content], { type: mimeType });
    const url: string = URL.createObjectURL(blob);
    const link: HTMLAnchorElement = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }
}
