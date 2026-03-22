# Quiz/Test Mode — Design Spec

## Goal

Quizlet-style quiz mode for flashcard sets: user configures test (number of questions, answer types, direction), answers questions one-by-one, sees results with wrong answers.

## Architecture — Smart/Dumb Components

### Routing
- `/quiz` → `QuizListComponent` (smart)
- `/quiz/:setId` → `QuizViewComponent` (smart)

### Smart Components (inject services, manage state)
- **QuizListComponent** — fetches user's sets, navigates to quiz
- **QuizViewComponent** — orchestrates flow (config → test → results), delegates all logic to QuizService

### Dumb Components (only @input/@output, no services)
- **QuizConfigComponent** — config form, emits `startQuiz` with config
- **QuizQuestionComponent** — renders one question (3 variants), emits `answerSubmitted`
- **QuizResultsComponent** — displays score and mistakes, emits `retry` / `retryWrong` / `goBack`

### Services
- **QuizService** — all quiz logic: generate questions from flashcards, build multiple-choice distractors, build true/false pairings, validate written answers, calculate score, manage test state

### Entry Points
- Button "Test" in `flashcard-list.component` header → `router.navigate(['/quiz', setId])`
- Page `/quiz` with set list

---

## Configuration (QuizConfigComponent)

### Form Fields

1. **Number of questions** — dropdown: 5, 10, 15, 20, All
   - Default: 10 (or "All" if set has ≤10 cards)
   - Minimum cards in set to start quiz: 4

2. **Question types** — checkboxes (min 1 checked):
   - ✅ Written answer (wpisywanie)
   - ✅ Multiple choice (wielokrotny wybór)
   - ✅ True/False (prawda/fałsz)
   - Default: all checked

3. **Direction** — radio:
   - Front → Back (default)
   - Back → Front

### Validation
- Set must have ≥4 flashcards (needed for multiple-choice distractors)
- At least 1 question type checked

### Logic (QuizService)
- Shuffle flashcards, pick requested count
- For each card, randomly assign one of the enabled question types
- Multiple-choice: 1 correct + 3 random distractors from same set
- True/False: 50% chance correct pairing, 50% swapped back from another card
- Written: case-insensitive trim comparison; if back contains `;` accept any single meaning

---

## Question View (QuizQuestionComponent)

### Common Elements
- Progress bar ("Pytanie 3/10")
- Question text (front or back depending on direction)
- Image if exists (only when direction = front→back)

### Written Answer Variant
- Text input + "Sprawdź" button
- After check: green bg if correct, red + correct answer if wrong
- "Dalej" button appears after check

### Multiple Choice Variant
- 4 option buttons (1 correct + 3 distractors)
- After click: correct turns green, wrong turns red + correct turns green
- "Dalej" button appears after selection

### True/False Variant
- Shows pairing: "question = answer"
- Two buttons: "Prawda" / "Fałsz"
- After click: feedback as above
- "Dalej" button

### Navigation
- Cannot go back to previous question
- Keyboard: Enter = Check/Next

### Logic (QuizService)
- Validate written answer: trim(), case-insensitive, accept any meaning when `;` separated
- Record answer (correct/wrong + what user answered)

---

## Results (QuizResultsComponent)

### Display
- Score: "8/10 — 80%"
- Grade text:
  - ≥90%: "Świetnie!"
  - ≥70%: "Dobra robota!"
  - ≥50%: "Poćwicz jeszcze"
  - <50%: "Spróbuj ponownie"
- Wrong answers list: question → user's answer (red) → correct answer (green)

### Buttons
- "Powtórz tylko błędne" (visible when there are mistakes)
- "Powtórz test"
- "Wróć do zestawu"

---

## Quiz List (QuizListComponent)

- Header: "Wybierz zestaw do testu"
- List of user's sets (via FlashcardSetApiService.getSets())
- Each set: name, card count, "Rozpocznij test" button
- Sets with <4 cards: button disabled with tooltip "Minimum 4 fiszki"
- Empty state: "Nie masz zestawów" + link to /sets

---

## Styling

- Reuse existing shared SCSS: `_variables.scss`, `_buttons.scss`, `_mixins.scss`
- Reuse PrimeNG `pButton` for action buttons in QuizQuestionComponent
- Reuse existing button patterns from flashcard-list (`flist__btn` BEM pattern) for quiz list
- Reuse study-view patterns for results (stats, links, state-complete animation)
- No duplicated SCSS — extract shared styles to partials if needed

## Data Flow

- No backend — quiz runs fully client-side, no results saved to Supabase
- FlashcardSetApiService / FlashcardApiService used to fetch sets and cards
- QuizService generates and manages quiz state in memory
