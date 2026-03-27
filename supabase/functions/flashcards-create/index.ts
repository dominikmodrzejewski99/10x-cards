import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from "https://deno.land/x/zod@v3.21.4/mod.ts";
import { getCorsHeaders } from '../_shared/cors.ts'
import { requireAuth, AuthError } from '../_shared/auth.ts'

// Definicja typów (zgodnie z @angular/src/types.ts, ale dostosowane do Zod)
const sourceEnum = z.enum(['ai-full', 'ai-edited', 'manual'], { errorMap: () => ({ message: "Nieprawidłowa wartość źródła. Oczekiwano 'ai-full', 'ai-edited' lub 'manual'."}) });

const flashcardSchema = z.object({
  front: z.string().min(1, { message: "Pole 'front' nie może być puste." }).max(200, { message: "Pole 'front' może zawierać maksymalnie 200 znaków." }),
  back: z.string().min(1, { message: "Pole 'back' nie może być puste." }).max(500, { message: "Pole 'back' może zawierać maksymalnie 500 znaków." }),
  source: sourceEnum,
});

// Typ dla propozycji fiszki na podstawie schematu Zod
type FlashcardProposal = z.infer<typeof flashcardSchema>;

// Schemat dla ciała żądania - akceptuje tablicę obiektów
const requestBodySchema = z.array(flashcardSchema).min(1, { message: "Żądanie wsadowe nie może być pustą tablicą." });

// --- Główna funkcja serwująca ---
serve(async (req) => {
  const cors = getCorsHeaders(req)

  // Obsługa preflight request dla CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  // Sprawdzenie metody HTTP
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Autoryzacja
  let userId: string
  try {
    const auth = await requireAuth(req)
    userId = auth.userId
  } catch (e) {
    const authError = e as AuthError
    return new Response(authError.body, {
      status: authError.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Parsowanie i Walidacja Ciała Żądania
  let validatedData;
  try {
    const requestData = await req.json();
    validatedData = requestBodySchema.parse(requestData);
  } catch (e) {
    if (e instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: 'INVALID_INPUT',
          message: 'Nieprawidłowe dane wejściowe.',
          details: e.errors
        }),
        {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' }
        }
      );
    } else {
      return new Response(
        JSON.stringify({
          error: 'BAD_REQUEST',
          message: 'Nie można sparsować ciała żądania jako JSON.'
        }),
        {
          status: 400,
          headers: { ...cors, 'Content-Type': 'application/json' }
        }
      );
    }
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    // Przygotowanie danych do zapisu
    const flashcardsToInsert = validatedData.map((proposal: FlashcardProposal) => ({
      front: proposal.front,
      back: proposal.back,
      source: proposal.source,
      user_id: userId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }));

    // Zapis fiszek do bazy danych
    const { data, error } = await supabaseAdmin
      .from('flashcards')
      .insert(flashcardsToInsert)
      .select();

    if (error) {
      return new Response(JSON.stringify({ error: 'Database Error', message: 'Nie udało się zapisać fiszek.' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify(data), {
      headers: { ...cors, 'Content-Type': 'application/json' },
      status: 201,
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
})
