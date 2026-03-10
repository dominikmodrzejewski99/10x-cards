import { Injectable } from '@angular/core';
import { FlashcardProposalDTO } from '../../types';

export interface ParseError {
  line: number;
  content: string;
  reason: string;
}

export interface ParseResult {
  proposals: FlashcardProposalDTO[];
  errors: ParseError[];
}

@Injectable({
  providedIn: 'root'
})
export class TextParserService {
  parseKeyValue(text: string): ParseResult {
    const proposals: FlashcardProposalDTO[] = [];
    const errors: ParseError[] = [];

    const lines = text.split(/\r?\n/);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line === '') continue;
      if (line.trim() === '' && !line.includes('\t') && !line.includes(',')) continue;

      let front: string;
      let back: string;

      if (line.includes('\t')) {
        const tabIndex = line.indexOf('\t');
        front = line.substring(0, tabIndex).trim();
        back = line.substring(tabIndex + 1).trim();
      } else if (line.includes(',')) {
        const commaIndex = line.indexOf(',');
        front = line.substring(0, commaIndex).trim();
        back = line.substring(commaIndex + 1).trim();
      } else {
        errors.push({ line: i + 1, content: line, reason: 'Brak separatora (TAB lub przecinek)' });
        continue;
      }

      if (!front || !back) {
        errors.push({ line: i + 1, content: line, reason: 'Pusta wartość przodu lub tyłu fiszki' });
        continue;
      }

      proposals.push({ front, back, source: 'manual' });
    }

    return { proposals, errors };
  }
}
