import { Injectable, inject } from '@angular/core';
import { TranslocoService } from '@jsverse/transloco';
import { FlashcardDTO, QuizQuestionType } from '../../../types';
import { QuizService } from './quiz.service';

export interface PrintTestConfig {
  title: string;
  questionCount: number | 'all';
  questionTypes: QuizQuestionType[];
  includeMatching: boolean;
  reversed: boolean;
  includeAnswerKey: boolean;
}

interface PrintQuestion {
  index: number;
  type: QuizQuestionType;
  questionText: string;
  correctAnswer: string;
  options?: string[];
  trueFalsePairing?: { shown: string; isCorrect: boolean };
}

interface GroupedQuestions {
  written: PrintQuestion[];
  multipleChoice: PrintQuestion[];
  trueFalse: PrintQuestion[];
}

interface MatchingPair {
  left: string;
  right: string;
}

@Injectable({
  providedIn: 'root'
})
export class PrintTestService {
  private quizService: QuizService = inject(QuizService);
  private transloco: TranslocoService = inject(TranslocoService);
  private readonly escapeDiv: HTMLDivElement = document.createElement('div');

  /**
   * @returns true if the print window opened, false if blocked by popup blocker
   */
  public generateAndPrint(flashcards: FlashcardDTO[], config: PrintTestConfig): boolean {
    const questions: PrintQuestion[] = this.buildQuestions(flashcards, config);
    const matchingPairs: MatchingPair[] = config.includeMatching
      ? this.buildMatchingPairs(flashcards, config.reversed)
      : [];
    const grouped: GroupedQuestions = this.groupQuestions(questions);
    const shuffledRight: string[] = matchingPairs.length > 0
      ? this.shuffle(matchingPairs.map(p => p.right))
      : [];
    const html: string = this.buildHtml(grouped, matchingPairs, shuffledRight, config);
    return this.openPrintWindow(html);
  }

  private buildQuestions(flashcards: FlashcardDTO[], config: PrintTestConfig): PrintQuestion[] {
    const nonMatchingTypes: QuizQuestionType[] = config.questionTypes;
    if (nonMatchingTypes.length === 0) return [];

    const quizQuestions = this.quizService.generateQuestions(flashcards, {
      setId: 0,
      questionCount: config.questionCount,
      questionTypes: nonMatchingTypes,
      reversed: config.reversed
    });

    return quizQuestions.map((q, i) => ({
      index: i + 1,
      type: q.type,
      questionText: q.questionText,
      correctAnswer: q.correctAnswer,
      options: q.options,
      trueFalsePairing: q.trueFalsePairing
    }));
  }

  private groupQuestions(questions: PrintQuestion[]): GroupedQuestions {
    return {
      written: questions.filter(q => q.type === 'written'),
      multipleChoice: questions.filter(q => q.type === 'multiple-choice'),
      trueFalse: questions.filter(q => q.type === 'true-false')
    };
  }

  private shuffle<T>(array: T[]): T[] {
    const result: T[] = [...array];
    for (let i: number = result.length - 1; i > 0; i--) {
      const j: number = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private buildMatchingPairs(flashcards: FlashcardDTO[], reversed: boolean): MatchingPair[] {
    const shuffled: FlashcardDTO[] = this.shuffle(flashcards);
    const selected: FlashcardDTO[] = shuffled.slice(0, Math.min(shuffled.length, 10));

    return selected.map(card => ({
      left: reversed ? card.back : card.front,
      right: reversed ? card.front : card.back
    }));
  }

  private t(key: string): string {
    return this.transloco.translate(`printTest.document.${key}`);
  }

  private buildHtml(grouped: GroupedQuestions, matchingPairs: MatchingPair[], shuffledRight: string[], config: PrintTestConfig): string {
    let globalIndex = 1;
    const sections: string[] = [];

    if (grouped.written.length > 0) {
      const items: string = grouped.written.map(q => {
        const idx = globalIndex++;
        return `
          <div class="question question--written">
            <div class="question__number">${idx}.</div>
            <div class="question__body">
              <div class="question__text">${this.escapeHtml(q.questionText)}</div>
              <div class="question__answer-line"></div>
            </div>
          </div>`;
      }).join('');

      sections.push(this.buildSection(sections.length, this.t('writtenSection'), this.t('writtenDesc'),
        `<div class="questions">${items}</div>`));
    }

    if (grouped.multipleChoice.length > 0) {
      const items: string = grouped.multipleChoice.map(q => {
        const idx = globalIndex++;
        const optionsHtml: string = (q.options || []).map((opt, oi) => {
          const letter: string = String.fromCharCode(65 + oi);
          return `<div class="option"><span class="option__letter">${letter}</span> ${this.escapeHtml(opt)}</div>`;
        }).join('');

        return `
          <div class="question question--mc">
            <div class="question__number">${idx}.</div>
            <div class="question__body">
              <div class="question__text">${this.escapeHtml(q.questionText)}</div>
              <div class="options">${optionsHtml}</div>
            </div>
          </div>`;
      }).join('');

      sections.push(this.buildSection(sections.length, this.t('mcSection'), this.t('mcDesc'),
        `<div class="questions questions--mc">${items}</div>`));
    }

    if (grouped.trueFalse.length > 0) {
      const items: string = grouped.trueFalse.map(q => {
        const idx = globalIndex++;
        const pairing = q.trueFalsePairing!;
        return `
          <div class="question question--tf">
            <div class="question__number">${idx}.</div>
            <div class="question__body">
              <div class="question__text">
                <span class="question__term">${this.escapeHtml(q.questionText)}</span>
                <span class="question__separator">=</span>
                <span class="question__proposed">${this.escapeHtml(pairing.shown)}</span>
              </div>
              <div class="tf-choices">
                <div class="tf-choice"><span class="tf-box"></span> ${this.t('true')}</div>
                <div class="tf-choice"><span class="tf-box"></span> ${this.t('false')}</div>
              </div>
            </div>
          </div>`;
      }).join('');

      sections.push(this.buildSection(sections.length, this.t('tfSection'), this.t('tfDesc'),
        `<div class="questions">${items}</div>`));
    }

    if (matchingPairs.length > 0) {
      const leftCol: string = matchingPairs.map((p, i) => `
        <div class="match-row">
          <span class="match-num">${i + 1}.</span>
          <span class="match-text">${this.escapeHtml(p.left)}</span>
          <span class="match-blank">____</span>
        </div>`).join('');

      const rightCol: string = shuffledRight.map((text, i) => `
        <div class="match-row">
          <span class="match-letter">${String.fromCharCode(65 + i)}.</span>
          <span class="match-text">${this.escapeHtml(text)}</span>
        </div>`).join('');

      sections.push(this.buildSection(sections.length, this.t('matchingSection'), this.t('matchingDesc'), `
          <div class="matching">
            <div class="matching__col matching__col--left">${leftCol}</div>
            <div class="matching__col matching__col--right">${rightCol}</div>
          </div>`));
    }

    const totalQuestions: number = globalIndex - 1 + (matchingPairs.length > 0 ? matchingPairs.length : 0);

    let answerKeyHtml = '';
    if (config.includeAnswerKey) {
      answerKeyHtml = this.buildAnswerKey(grouped, matchingPairs, shuffledRight);
    }

    return `<!DOCTYPE html>
<html lang="${this.transloco.getActiveLang()}">
<head>
  <meta charset="utf-8">
  <title>${this.escapeHtml(config.title)}</title>
  <style>${this.getStyles()}</style>
</head>
<body>
  <div class="test">
    <header class="header">
      <div class="header__top">
        <div class="header__branding">${this.escapeHtml(config.title)}</div>
        <div class="header__score">
          <span class="header__score-label">${this.t('score')}</span>
          <span class="header__score-box">_____ / ${totalQuestions}</span>
        </div>
      </div>
      <div class="header__fields">
        <div class="header__field">
          <span class="header__field-label">${this.t('name')}</span>
          <span class="header__field-line"></span>
        </div>
        <div class="header__field header__field--short">
          <span class="header__field-label">${this.t('date')}</span>
          <span class="header__field-line"></span>
        </div>
      </div>
    </header>

    ${sections.join('')}

    ${answerKeyHtml}
  </div>

  <script>document.fonts.ready.then(function() { window.print(); });</script>
</body>
</html>`;
  }

  private buildSection(index: number, title: string, desc: string, content: string): string {
    const letter: string = String.fromCharCode(65 + index);
    return `
        <div class="section">
          <div class="section__header">
            <div class="section__icon">${letter}</div>
            <div>
              <h2 class="section__title">${title}</h2>
              <p class="section__desc">${desc}</p>
            </div>
          </div>
          ${content}
        </div>`;
  }

  private buildAnswerKey(grouped: GroupedQuestions, matchingPairs: MatchingPair[], shuffledRight: string[]): string {
    let globalIndex = 1;
    const rows: string[] = [];

    for (const q of grouped.written) {
      rows.push(`<tr><td class="ak-num">${globalIndex++}</td><td class="ak-answer">${this.escapeHtml(q.correctAnswer)}</td></tr>`);
    }
    for (const q of grouped.multipleChoice) {
      const correctIndex: number = (q.options || []).indexOf(q.correctAnswer);
      const letter: string = correctIndex >= 0 ? String.fromCharCode(65 + correctIndex) : '?';
      rows.push(`<tr><td class="ak-num">${globalIndex++}</td><td class="ak-answer">${letter} — ${this.escapeHtml(q.correctAnswer)}</td></tr>`);
    }
    for (const q of grouped.trueFalse) {
      const isCorrect: boolean = q.trueFalsePairing?.isCorrect ?? false;
      rows.push(`<tr><td class="ak-num">${globalIndex++}</td><td class="ak-answer">${isCorrect ? this.t('true') : this.t('false')}</td></tr>`);
    }

    let matchingKeyHtml = '';
    if (matchingPairs.length > 0) {
      const matchRows: string = matchingPairs.map((p, i) => {
        const letterIndex: number = shuffledRight.indexOf(p.right);
        const letter: string = String.fromCharCode(65 + letterIndex);
        return `<tr><td class="ak-num">${i + 1}</td><td class="ak-answer">${letter}</td></tr>`;
      }).join('');

      matchingKeyHtml = `
        <h3 class="ak-section-title">${this.t('matchingSection')}</h3>
        <table class="ak-table">${matchRows}</table>`;
    }

    return `
      <div class="answer-key">
        <h2 class="answer-key__title">${this.t('answerKey')}</h2>
        <table class="ak-table">${rows.join('')}</table>
        ${matchingKeyHtml}
      </div>`;
  }

  private escapeHtml(text: string): string {
    this.escapeDiv.textContent = text;
    return this.escapeDiv.innerHTML;
  }

  private openPrintWindow(html: string): boolean {
    const printWindow: Window | null = window.open('', '_blank');
    if (!printWindow) return false;
    printWindow.document.write(html);
    printWindow.document.close();
    return true;
  }

  private getStyles(): string {
    return `
      *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        font-size: 11pt;
        line-height: 1.5;
        color: #1a1a2e;
        background: #fff;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      .test {
        max-width: 210mm;
        margin: 0 auto;
        padding: 12mm 16mm;
      }

      /* ── Header ── */
      .header {
        margin-bottom: 24pt;
        padding-bottom: 14pt;
        border-bottom: 2.5pt solid #1a1a2e;
      }

      .header__top {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 14pt;
      }

      .header__branding {
        font-size: 18pt;
        font-weight: 800;
        letter-spacing: -0.03em;
        line-height: 1.2;
        max-width: 70%;
      }

      .header__score {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 2pt;
      }

      .header__score-label {
        font-size: 8pt;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.1em;
        color: #666;
      }

      .header__score-box {
        font-size: 14pt;
        font-weight: 700;
        padding: 4pt 12pt;
        border: 1.5pt solid #1a1a2e;
        border-radius: 6pt;
      }

      .header__fields {
        display: flex;
        gap: 16pt;
      }

      .header__field {
        display: flex;
        align-items: baseline;
        gap: 8pt;
        flex: 1;
      }

      .header__field--short {
        flex: 0 0 35%;
      }

      .header__field-label {
        font-size: 9pt;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.05em;
        color: #666;
        white-space: nowrap;
      }

      .header__field-line {
        flex: 1;
        border-bottom: 1pt solid #ccc;
        min-width: 60pt;
      }

      /* ── Sections ── */
      .section {
        margin-bottom: 20pt;
        break-inside: avoid-column;
      }

      .section__header {
        display: flex;
        align-items: center;
        gap: 10pt;
        margin-bottom: 12pt;
        padding: 8pt 12pt;
        background: #f0f1f5;
        border-radius: 6pt;
      }

      .section__icon {
        width: 28pt;
        height: 28pt;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #1a1a2e;
        color: #fff;
        font-weight: 800;
        font-size: 13pt;
        border-radius: 6pt;
        flex-shrink: 0;
      }

      .section__title {
        font-size: 12pt;
        font-weight: 700;
        margin: 0;
        line-height: 1.3;
      }

      .section__desc {
        font-size: 8.5pt;
        color: #666;
        margin: 0;
      }

      /* ── Questions ── */
      .questions {
        display: flex;
        flex-direction: column;
        gap: 10pt;
      }

      .question {
        display: flex;
        gap: 6pt;
        padding: 6pt 0;
        break-inside: avoid;
      }

      .question__number {
        font-weight: 700;
        font-size: 10pt;
        min-width: 20pt;
        color: #444;
      }

      .question__body {
        flex: 1;
      }

      .question__text {
        font-size: 10.5pt;
        font-weight: 500;
        margin-bottom: 4pt;
      }

      /* Written */
      .question__answer-line {
        height: 22pt;
        border-bottom: 1pt solid #bbb;
        margin-top: 4pt;
      }

      /* Multiple Choice */
      .questions--mc {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 8pt 20pt;
      }

      .options {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 3pt 12pt;
        margin-top: 4pt;
      }

      .option {
        font-size: 9.5pt;
        padding: 2pt 0;
        display: flex;
        align-items: baseline;
        gap: 4pt;
      }

      .option__letter {
        font-weight: 700;
        color: #555;
        font-size: 9pt;
      }

      /* True / False */
      .question--tf .question__text {
        display: flex;
        align-items: baseline;
        gap: 6pt;
        flex-wrap: wrap;
      }

      .question__term {
        font-weight: 600;
      }

      .question__separator {
        color: #999;
        font-weight: 400;
      }

      .question__proposed {
        font-style: italic;
      }

      .tf-choices {
        display: flex;
        gap: 16pt;
        margin-top: 4pt;
      }

      .tf-choice {
        display: flex;
        align-items: center;
        gap: 5pt;
        font-size: 9.5pt;
        font-weight: 500;
      }

      .tf-box {
        display: inline-block;
        width: 12pt;
        height: 12pt;
        border: 1.2pt solid #888;
        border-radius: 2pt;
      }

      /* ── Matching ── */
      .matching {
        display: flex;
        gap: 28pt;
      }

      .matching__col {
        flex: 1;
      }

      .matching__col--right {
        padding-left: 16pt;
        border-left: 1.5pt solid #ddd;
      }

      .match-row {
        display: flex;
        align-items: baseline;
        gap: 6pt;
        padding: 4pt 0;
        font-size: 10pt;
      }

      .match-num, .match-letter {
        font-weight: 700;
        min-width: 18pt;
        color: #444;
      }

      .match-text {
        flex: 1;
      }

      .match-blank {
        font-weight: 600;
        color: #bbb;
        letter-spacing: 0.1em;
      }

      /* ── Answer Key ── */
      .answer-key {
        break-before: page;
        padding-top: 16pt;
      }

      .answer-key__title {
        font-size: 14pt;
        font-weight: 800;
        margin-bottom: 12pt;
        padding-bottom: 8pt;
        border-bottom: 2pt solid #1a1a2e;
      }

      .ak-section-title {
        font-size: 11pt;
        font-weight: 700;
        margin: 12pt 0 6pt;
      }

      .ak-table {
        width: 100%;
        border-collapse: collapse;
      }

      .ak-table tr {
        border-bottom: 0.5pt solid #e5e5e5;
      }

      .ak-table td {
        padding: 3pt 6pt;
        font-size: 9.5pt;
      }

      .ak-num {
        width: 30pt;
        font-weight: 700;
        color: #666;
      }

      .ak-answer {
        font-weight: 500;
      }

      /* ── Print ── */
      @media print {
        body { margin: 0; }
        .test { padding: 8mm 12mm; }
        .section { break-inside: avoid; }
        .question { break-inside: avoid; }
        .answer-key { break-before: page; }
      }

      @page {
        size: A4;
        margin: 10mm;
      }
    `;
  }
}
