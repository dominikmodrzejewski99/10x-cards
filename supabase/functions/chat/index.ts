import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { getCorsHeaders } from '../_shared/cors.ts'
import { requireAuth, AuthError } from '../_shared/auth.ts'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

const ALLOWED_MODELS = new Set([
  'google/gemma-3-12b-it:free',
  'google/gemma-3-4b-it:free',
])

const MAX_TOKENS_LIMIT = 2000
const MAX_MESSAGES = 20

serve(async (req) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method Not Allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Auth
  try {
    await requireAuth(req)
  } catch (e) {
    const authError = e as AuthError
    return new Response(authError.body, {
      status: authError.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  // Parse & validate
  let body: {
    model?: string
    messages?: { role: string; content: string }[]
    temperature?: number
    max_tokens?: number
  }

  try {
    body = await req.json()
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const model = body.model || 'google/gemma-3-12b-it:free'
  if (!ALLOWED_MODELS.has(model)) {
    return new Response(JSON.stringify({ error: 'Model not allowed' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (!body.messages || !Array.isArray(body.messages) || body.messages.length === 0) {
    return new Response(JSON.stringify({ error: 'Messages required' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  if (body.messages.length > MAX_MESSAGES) {
    return new Response(JSON.stringify({ error: `Max ${MAX_MESSAGES} messages` }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  const maxTokens = Math.min(body.max_tokens || 1000, MAX_TOKENS_LIMIT)
  const temperature = Math.max(0, Math.min(body.temperature || 0.7, 2))

  // Proxy to OpenRouter
  const apiKey = Deno.env.get('OPENROUTER_API_KEY')
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'API key not configured' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }

  try {
    const response = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: body.messages,
        temperature,
        max_tokens: maxTokens,
      }),
    })

    const data = await response.json()

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('OpenRouter proxy error:', error)
    return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
      status: 502,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
