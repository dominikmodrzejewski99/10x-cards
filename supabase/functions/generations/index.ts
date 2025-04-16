// URL z dokumentacji Supabase Functions
import { serve } from "https://deno.land/std@0.131.0/http/server.ts"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Obsługa CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Sprawdzenie metody HTTP
        if (req.method !== 'POST') {
            return new Response(
                JSON.stringify({
                    error: 'METHOD_NOT_ALLOWED',
                    message: 'Endpoint akceptuje tylko metodę POST',
                    details: `Otrzymano: ${req.method}`
                }),
                {
                    status: 405,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Parsowanie body
        const requestData = await req.json()
        const { text, model } = requestData

        // Walidacja tekstu
        if (!text) {
            return new Response(
                JSON.stringify({
                    error: 'INVALID_TEXT_FORMAT',
                    message: 'Tekst nie może być pusty'
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        const textLength = text.length
        if (textLength < 1000 || textLength > 10000) {
            return new Response(
                JSON.stringify({
                    error: 'INVALID_TEXT_LENGTH',
                    message: 'Tekst musi mieć długość od 1000 do 10000 znaków',
                    details: { providedLength: textLength, minLength: 1000, maxLength: 10000 }
                }),
                {
                    status: 400,
                    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
                }
            )
        }

        // Zwrócenie odpowiedzi bezpośrednio po walidacji (omija resztę logiki try...catch)
        return new Response(
            JSON.stringify({ message: "Walidacja poprawna (generations)", textLength: textLength, model: model }),
            {
                status: 200,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        // Obsługa błędów
        return new Response(
            JSON.stringify({
                error: 'UNKNOWN_ERROR',
                message: 'Wystąpił nieoczekiwany błąd',
                details: error instanceof Error ? error.message : 'Nieznany błąd'
            }),
            {
                status: 500,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            }
        )
    }
})