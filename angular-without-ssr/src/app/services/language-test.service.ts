import { Injectable } from '@angular/core';
import {
  TestQuestion, MultipleChoiceQuestion, WordFormationQuestion,
  CategoryBreakdown, WrongAnswer
} from '../../types';

export interface TestAnswer {
  questionId: string;
  answer: string | number;
}

export interface TestResult {
  totalScore: number;
  maxScore: number;
  percentage: number;
  categoryBreakdown: CategoryBreakdown;
  wrongAnswers: WrongAnswer[];
  passed: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class LanguageTestService {

  evaluateTest(questions: TestQuestion[], answers: TestAnswer[], passingScore: number): TestResult {
    const categoryBreakdown: CategoryBreakdown = {};
    const wrongAnswers: WrongAnswer[] = [];
    let totalScore = 0;

    for (const question of questions) {
      const answer = answers.find(a => a.questionId === question.id);
      const isCorrect = answer ? this.isAnswerCorrect(question, answer) : false;

      if (!categoryBreakdown[question.category]) {
        categoryBreakdown[question.category] = { correct: 0, total: 0 };
      }
      categoryBreakdown[question.category].total++;

      if (isCorrect) {
        totalScore++;
        categoryBreakdown[question.category].correct++;
      } else {
        wrongAnswers.push(this.buildWrongAnswer(question, answer));
      }
    }

    const percentage = Math.round((totalScore / questions.length) * 100 * 100) / 100;

    return {
      totalScore,
      maxScore: questions.length,
      percentage,
      categoryBreakdown,
      wrongAnswers,
      passed: percentage >= passingScore
    };
  }

  private isAnswerCorrect(question: TestQuestion, answer: TestAnswer): boolean {
    if (question.type === 'multiple-choice-cloze') {
      return answer.answer === (question as MultipleChoiceQuestion).correctIndex;
    }
    if (question.type === 'word-formation') {
      const wf = question as WordFormationQuestion;
      const userAnswer = String(answer.answer).trim().toLowerCase();
      return wf.acceptedAnswers.some(a => a.toLowerCase() === userAnswer);
    }
    return false;
  }

  private buildWrongAnswer(question: TestQuestion, answer: TestAnswer | undefined): WrongAnswer {
    const userAnswer = answer ? String(answer.answer) : '(brak odpowiedzi)';

    if (question.type === 'multiple-choice-cloze') {
      const mc = question as MultipleChoiceQuestion;
      const userAnswerText = typeof answer?.answer === 'number'
        ? mc.options[answer.answer]
        : userAnswer;
      return {
        questionId: question.id,
        userAnswer: userAnswerText,
        correctAnswer: mc.options[mc.correctIndex],
        front: mc.text,
        back: `${mc.options[mc.correctIndex]} — ${mc.explanation}`
      };
    }

    const wf = question as WordFormationQuestion;
    return {
      questionId: question.id,
      userAnswer,
      correctAnswer: wf.correctAnswer,
      front: `Utwórz formę słowa ${wf.baseWord}: ${wf.text}`,
      back: `${wf.correctAnswer} — ${wf.explanation}`
    };
  }
}
