import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

export interface AuthResult {
  userId: string;
}

export interface AuthError {
  status: number;
  body: string;
}

/**
 * Weryfikuje JWT z nagłówka Authorization i zwraca userId.
 * Rzuca obiekt AuthError jeśli autoryzacja się nie powiedzie.
 */
export async function requireAuth(req: Request): Promise<AuthResult> {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    throw { status: 401, body: JSON.stringify({ error: 'Brak nagłówka autoryzacji' }) } as AuthError
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    { auth: { persistSession: false } }
  )

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(
    authHeader.replace('Bearer ', '')
  )

  if (error || !user) {
    throw { status: 401, body: JSON.stringify({ error: 'Nieautoryzowany dostęp' }) } as AuthError
  }

  return { userId: user.id }
}
