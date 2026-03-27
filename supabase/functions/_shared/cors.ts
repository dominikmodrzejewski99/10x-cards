// Dozwolone originy
const ALLOWED_ORIGINS = [
  'https://memlo.app',
  'https://www.memlo.app',
  'http://localhost:4200',
  'http://127.0.0.1:4200',
]

/**
 * Zwraca nagłówki CORS dopasowane do originu żądania.
 * Jeśli origin nie jest na liście, nie ustawia Access-Control-Allow-Origin.
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('Origin') ?? ''
  const isAllowed = ALLOWED_ORIGINS.includes(origin)

  return {
    ...(isAllowed ? { 'Access-Control-Allow-Origin': origin } : {}),
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  }
}

// Stały eksport dla kompatybilności wstecznej (dev/testowanie)
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400',
}
