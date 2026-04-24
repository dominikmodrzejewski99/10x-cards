const GEMINI_TTS_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent'

const ALLOWED_ORIGINS = [
  'https://memlo.app',
  'https://www.memlo.app',
  'https://10x-cards-70n.pages.dev',
]

const MAX_TEXT_LENGTH = 500
const SAMPLE_RATE = 24000
const BITS_PER_SAMPLE = 16
const CHANNELS = 1

const DEFAULT_VOICE = 'Kore'

function isAllowedOrigin(origin: string): boolean {
  return ALLOWED_ORIGINS.includes(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin)
}

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  return {
    ...(isAllowedOrigin(origin) ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

function jsonResponse(body: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

function base64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return bytes
}

function pcmToWav(pcm: Uint8Array, sampleRate: number, channels: number, bitsPerSample: number): Uint8Array {
  const byteRate = sampleRate * channels * bitsPerSample / 8
  const blockAlign = channels * bitsPerSample / 8
  const dataSize = pcm.length
  const buffer = new ArrayBuffer(44 + dataSize)
  const view = new DataView(buffer)
  const writeString = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i))
  }
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + dataSize, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, channels, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, byteRate, true)
  view.setUint16(32, blockAlign, true)
  view.setUint16(34, bitsPerSample, true)
  writeString(36, 'data')
  view.setUint32(40, dataSize, true)
  new Uint8Array(buffer, 44).set(pcm)
  return new Uint8Array(buffer)
}

Deno.serve(async (req: Request) => {
  const cors = getCorsHeaders(req)

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors })
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method Not Allowed' }, 405, cors)
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return jsonResponse({ error: 'Unauthorized' }, 401, cors)
  }

  let body: { text?: string; voice?: string }
  try {
    body = await req.json()
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400, cors)
  }

  const text = (body.text ?? '').trim()
  if (!text) {
    return jsonResponse({ error: 'Text required' }, 400, cors)
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return jsonResponse({ error: `Max ${MAX_TEXT_LENGTH} characters` }, 400, cors)
  }

  const voice = typeof body.voice === 'string' && body.voice.length > 0 ? body.voice : DEFAULT_VOICE

  const apiKey = Deno.env.get('GOOGLE_AI_API_KEY')
  if (!apiKey) {
    return jsonResponse({ error: 'API key not configured' }, 500, cors)
  }

  try {
    const response = await fetch(`${GEMINI_TTS_URL}?key=${encodeURIComponent(apiKey)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
      }),
    })

    if (!response.ok) {
      return jsonResponse({ error: 'TTS provider error' }, response.status >= 500 ? 502 : response.status, cors)
    }

    const data = await response.json() as {
      candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[]
    }
    const b64 = data.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data
    if (!b64) {
      return jsonResponse({ error: 'Empty TTS response' }, 502, cors)
    }

    const pcm = base64ToBytes(b64)
    const wav = pcmToWav(pcm, SAMPLE_RATE, CHANNELS, BITS_PER_SAMPLE)

    return new Response(wav, {
      status: 200,
      headers: { ...cors, 'Content-Type': 'audio/wav', 'Cache-Control': 'no-store' },
    })
  } catch {
    return jsonResponse({ error: 'TTS service unavailable' }, 502, cors)
  }
})
