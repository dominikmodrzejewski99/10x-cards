import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from "https://deno.land/x/zod@v3.21.4/mod.ts";
import { corsHeaders } from '../_shared/cors.ts'

// Definicja typów (zgodnie z @angular/src/types.ts, ale dostosowane do Zod)
const sourceEnum = z.enum(['ai-full', 'ai-edited', 'manual'], { errorMap: () => ({ message: "Nieprawidłowa wartość źródła. Oczekiwano 'ai-full', 'ai-edited' lub 'manual'."}) });

const flashcardSchema = z.object({
  front: z.string().min(1, { message: "Pole 'front' nie może być puste." }).max(200, { message: "Pole 'front' może zawierać maksymalnie 200 znaków." }),
  back: z.string().min(1, { message: "Pole 'back' nie może być puste." }).max(500, { message: "Pole 'back' może zawierać maksymalnie 500 znaków." }),
  source: sourceEnum,
});

// Typ dla propozycji fiszki na podstawie schematu Zod
type FlashcardProposal = z.infer<typeof flashcardSchema>;

// Schemat dla ciała żądania - akceptuje pojedynczy obiekt lub tablicę obiektów
const requestBodySchema = z.union([
  flashcardSchema,
  z.array(flashcardSchema).min(1, { message: "Żądanie wsadowe nie może być pustą tablicą." })
]);

// --- Główna funkcja serwująca ---
serve(async (req) => {
  // Obsługa preflight request dla CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  // Sprawdzenie metody HTTP
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }

  // Krok 4a: Parsowanie i Walidacja Ciała Żądania (przed blokiem try Supabase)
  let validatedData;
  try {
    const requestData = await req.json();
    validatedData = requestBodySchema.parse(requestData);
  } catch (e) {
    if (e instanceof z.ZodError) {
      console.error('Błąd walidacji Zod:', e.errors);
      return new Response(
        JSON.stringify({ 
          error: 'INVALID_INPUT', 
          message: 'Nieprawidłowe dane wejściowe.',
          details: e.errors // Szczegóły błędów Zod
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    } else {
      // Błąd parsowania JSON lub inny nieoczekiwany błąd
      console.error('Błąd parsowania JSON:', e);
      return new Response(
        JSON.stringify({ 
          error: 'BAD_REQUEST', 
          message: 'Nie można sparsować ciała żądania jako JSON.' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }
  }

  // Jeśli walidacja się powiodła, kontynuujemy z logiką Supabase
  try {
    // Utworzenie klienta administracyjnego Supabase (wymaga ustawienia zmiennych środowiskowych w Supabase)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } } // Ważne dla funkcji serwerowych
    );

    /* --- Tymczasowo wyłączona weryfikacja JWT ---
    // Pobranie danych użytkownika na podstawie tokenu JWT z nagłówka
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Brak nagłówka autoryzacji' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError || !user) {
      console.error('Błąd autentykacji:', userError);
      return new Response(JSON.stringify({ error: 'Nieautoryzowany dostęp' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const userId = user.id;
    */
    const userId = "00000000-0000-0000-0000-000000000000"; // <-- Tymczasowo hardkodowany UUID

    // Krok 4b: Dane już zwalidowane
    // let validatedData; // <- Przeniesione wyżej
    // try { ... } catch { ... } // <- Logika walidacji przeniesiona wyżej
    
    // TODO: Kroki 5, 6 - Logika biznesowa, Odpowiedź

    // Tymczasowa odpowiedź po udanej walidacji (przed logiką biznesową)
    return new Response(JSON.stringify({ message: "Walidacja poprawna", data: validatedData }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Internal Server Error:', error);
    return new Response(JSON.stringify({ error: 'Internal Server Error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
}) 