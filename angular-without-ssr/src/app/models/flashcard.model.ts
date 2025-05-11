export interface FlashcardProposalDTO {
  front: string;
  back: string;
}

export interface FlashcardProposalViewModel extends FlashcardProposalDTO {
  id?: string;
}

export interface GenerationDTO {
  id: string;
  userId: string;
  createdAt: string;
  sourceText: string;
}

export interface GenerateFlashcardsCommand {
  text: string;
}

export interface GenerateFlashcardsResponse {
  flashcards: FlashcardProposalViewModel[];
  generation: GenerationDTO;
}

export interface Flashcard {
  question: string;
  answer: string;
}
