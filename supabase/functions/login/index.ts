// Supabase Edge Function: passphrase -> Supabase session
//
// Flow:
//   1. Client POSTs { passphrase, nickname } to this function.
//   2. We compare passphrase with env var PASSPHRASE (server-side only).
//   3. On match, we upsert a Supabase auth user keyed by nickname and
//      return a short-lived email_otp hashed token that the client
//      redeems via `supabase.auth.verifyOtp({ type: 'email', token_hash })`.
//
// Required env vars (set via `supabase secrets set`):
//   - PASSPHRASE              : the shared passphrase
//   - SB_URL                  : Supabase project URL
//   - SB_SERVICE_ROLE_KEY     : service role key (keep secret!)
//
// Deploy:  supabase functions deploy login --no-verify-jwt

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const PASSPHRASE = Deno.env.get('PASSPHRASE') ?? '';
const SB_URL = Deno.env.get('SB_URL') ?? '';
const SB_SERVICE_ROLE_KEY = Deno.env.get('SB_SERVICE_ROLE_KEY') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

// Constant-time compare to avoid timing leaks on the passphrase.
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return jsonResponse({ error: 'method not allowed' }, 405);

  let body: { passphrase?: string; nickname?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: 'invalid json' }, 400);
  }

  const passphrase = (body.passphrase ?? '').trim();
  const nickname = (body.nickname ?? '').trim().toLowerCase();

  if (!passphrase || !nickname) return jsonResponse({ error: 'missing fields' }, 400);
  if (!/^[a-z0-9_\-]{1,24}$/.test(nickname)) {
    return jsonResponse({ error: 'nickname must be 1-24 chars: a-z, 0-9, _ or -' }, 400);
  }
  if (!PASSPHRASE || !safeEqual(passphrase, PASSPHRASE)) {
    return jsonResponse({ error: '合言葉が違います' }, 401);
  }

  const admin = createClient(SB_URL, SB_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const email = `${nickname}@hamaatsume.local`;

  // Ensure the user exists (idempotent).
  const { data: list } = await admin.auth.admin.listUsers();
  const existing = list?.users.find((u) => u.email === email);
  if (!existing) {
    const { error: createErr } = await admin.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { nickname },
    });
    if (createErr) return jsonResponse({ error: createErr.message }, 500);
  }

  // Mint a magic-link token the client can verify to get a session.
  const { data, error } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email,
  });
  if (error || !data?.properties?.hashed_token) {
    return jsonResponse({ error: error?.message ?? 'could not mint token' }, 500);
  }

  return jsonResponse({
    email,
    token_hash: data.properties.hashed_token,
  });
});
