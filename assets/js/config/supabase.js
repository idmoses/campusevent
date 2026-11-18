import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";

// Publishable/anon key only. Never put the service_role key in browser code.
const SUPABASE_URL = "https://ublbyluipaudrjssgbpe.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_wJKP1fu003VMQwxWb1GEhQ_zeOgJA_G";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
