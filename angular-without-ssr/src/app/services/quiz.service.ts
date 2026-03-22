import { Injectable } from '@angular/core';
import {
  FlashcardDTO,
  QuizConfig,
  QuizQuestion,
  QuizQuestionType,
  QuizAnswer,
  QuizResult
} from '../../types';

@Injectable({
  providedIn: 'root'
})
export class QuizService {

  public generateQuestions(flashcards: FlashcardDTO[], config: QuizConfig): QuizQuestion[] {
    const shuffled: FlashcardDTO[] = this.shuffle([...flashcards]);
    const count: number = config.questionCount === 'all'
      ? shuffled.length
      : Math.min(config.questionCount, shuffled.length);
    const selected: FlashcardDTO[] = shuffled.slice(0, count);

    return selected.map((card: FlashcardDTO, index: number) => {
      const type: QuizQuestionType = this.pickRandomType(config.questionTypes);
      return this.buildQuestion(card, type, index, config.reversed, flashcards);
    });
  }

  public validateWrittenAnswer(userAnswer: string, correctAnswer: string): boolean {
    const normalizedUser: string = userAnswer.trim().toLowerCase();
    if (!normalizedUser) return false;

    const meanings: string[] = correctAnswer.split(';').map((m: string) => m.trim().toLowerCase());
    return meanings.some((meaning: string) => meaning === normalizedUser);
  }

  public calculateResult(answers: QuizAnswer[]): QuizResult {
    const totalQuestions: number = answers.length;
    const correctCount: number = answers.filter((a: QuizAnswer) => a.isCorrect).length;
    const percentage: number = totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;

    return { totalQuestions, correctCount, percentage, answers };
  }

  public getGradeText(percentage: number): string {
    if (percentage >= 90) return 'Świetnie!';
    if (percentage >= 70) return 'Dobra robota!';
    if (percentage >= 50) return 'Poćwicz jeszcze';
    return 'Spróbuj ponownie';
  }

  public getWrongAnswers(answers: QuizAnswer[]): QuizAnswer[] {
    return answers.filter((a: QuizAnswer) => !a.isCorrect);
  }

  private buildQuestion(
    card: FlashcardDTO,
    type: QuizQuestionType,
    index: number,
    reversed: boolean,
    allCards: FlashcardDTO[]
  ): QuizQuestion {
    const questionText: string = reversed ? card.back : card.front;
    const correctAnswer: string = reversed ? card.front : card.back;
    const questionImageUrl: string | null = reversed ? null : (card.front_image_url || null);

    const base: QuizQuestion = {
      id: index,
      type,
      questionText,
      questionImageUrl,
      correctAnswer,
      sourceFlashcard: card
    };

    if (type === 'multiple-choice') {
      base.options = this.buildMultipleChoiceOptions(correctAnswer, allCards, reversed);
    }

    if (type === 'true-false') {
      base.trueFalsePairing = this.buildTrueFalsePairing(correctAnswer, allCards, reversed);
    }

    return base;
  }

  private buildMultipleChoiceOptions(
    correctAnswer: string,
    allCards: FlashcardDTO[],
    reversed: boolean
  ): string[] {
    const answerPool: string[] = allCards
      .map((c: FlashcardDTO) => reversed ? c.front : c.back)
      .filter((a: string) => a.trim().toLowerCase() !== correctAnswer.trim().toLowerCase());

    const distractors: string[] = this.shuffle([...answerPool]).slice(0, 3);

    while (distractors.length < 3) {
      distractors.push('—');
    }

    const options: string[] = this.shuffle([correctAnswer, ...distractors]);
    return options;
  }

  private buildTrueFalsePairing(
    correctAnswer: string,
    allCards: FlashcardDTO[],
    reversed: boolean
  ): { shown: string; isCorrect: boolean } {
    const showCorrect: boolean = Math.random() < 0.5;

    if (showCorrect) {
      return { shown: correctAnswer, isCorrect: true };
    }

    const wrongPool: string[] = allCards
      .map((c: FlashcardDTO) => reversed ? c.front : c.back)
      .filter((a: string) => a.trim().toLowerCase() !== correctAnswer.trim().toLowerCase());

    if (wrongPool.length === 0) {
      return { shown: correctAnswer, isCorrect: true };
    }

    const wrongAnswer: string = wrongPool[Math.floor(Math.random() * wrongPool.length)];
    return { shown: wrongAnswer, isCorrect: false };
  }

  private pickRandomType(types: QuizQuestionType[]): QuizQuestionType {
    return types[Math.floor(Math.random() * types.length)];
  }

  private shuffle<T>(array: T[]): T[] {
    for (let i: number = array.length - 1; i > 0; i--) {
      const j: number = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }
}
