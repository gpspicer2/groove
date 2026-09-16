import { createClient } from '@supabase/supabase-js';

// Service-role client: bypasses Row Level Security entirely. Only ever used
// server-side, after a request's identity has already been verified by
// getAuthedUser() — never exposed to, or trusted based on, client input.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);
