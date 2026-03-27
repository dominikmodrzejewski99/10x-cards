import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getCorsHeaders } from '../_shared/cors.ts'
import { requireAuth, AuthError } from '../_shared/auth.ts'

serve(async (req) => {
    const cors = getCorsHeaders(req)

    // Obsługa CORS
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: cors })
    }

    // Sprawdzenie metody HTTP
    if (req.method !== 'POST') {
        return new Response(
            JSON.stringify({
                error: 'METHOD_NOT_ALLOWED',
                message: 'Endpoint akceptuje tylko metodę POST',
            }),
            {
                status: 405,
                headers: { ...cors, 'Content-Type': 'application/json' }
            }
        )
    }

    // Autoryzacja
    try {
        await requireAuth(req)
    } catch (e) {
        const authError = e as AuthError
        return new Response(authError.body, {
            status: authError.status,
            headers: { ...cors, 'Content-Type': 'application/json' },
        })
    }

    try {
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
                    headers: { ...cors, 'Content-Type': 'application/json' }
                }
            )
        }

        const sanitizedText = text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
        const textLength = sanitizedText.length
        if (textLength < 1000 || textLength > 10000) {
            return new Response(
                JSON.stringify({
                    error: 'INVALID_TEXT_LENGTH',
                    message: 'Tekst musi mieć długość od 1000 do 10000 znaków',
                    details: { providedLength: textLength, minLength: 1000, maxLength: 10000 }
                }),
                {
                    status: 400,
                    headers: { ...cors, 'Content-Type': 'application/json' }
                }
            )
        }

        return new Response(
            JSON.stringify({ message: "Walidacja poprawna (generations)", textLength: textLength, model: model, text: sanitizedText }),
            {
                status: 200,
                headers: { ...cors, 'Content-Type': 'application/json' }
            }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({
                error: 'UNKNOWN_ERROR',
                message: 'Wystąpił nieoczekiwany błąd',
            }),
            {
                status: 500,
                headers: { ...cors, 'Content-Type': 'application/json' }
            }
        )
    }
})
