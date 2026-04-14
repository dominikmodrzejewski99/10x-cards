import { FlashcardLanguage } from '../../../types';

export interface FlashcardFormData {
  id?: number;
  front: string;
  back: string;
  front_image_url?: string | null;
  back_audio_url?: string | null;
  front_language?: FlashcardLanguage | null;
  back_language?: FlashcardLanguage | null;
}
