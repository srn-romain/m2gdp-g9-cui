import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

const REQUIRED: Array<[string, string | undefined]> = [
  ['VITE_SUPABASE_URL', supabaseUrl],
  ['VITE_SUPABASE_PUBLISHABLE_KEY', supabasePublishableKey],
];

/** Variables manquantes dans public/.env.local. Vide = configuration complète. */
export const supabaseConfigMissing = REQUIRED.filter(([, value]) => !value).map(([key]) => key);

const configured = supabaseConfigMissing.length === 0;

// Initialisation du client Supabase. La connexion se fait désormais par code OTP
// (vérifié via verifyOtp). detectSessionInUrl reste actif pour absorber d'éventuels
// anciens liens magiques encore ouverts par un utilisateur.
// Source : https://supabase.com/docs/reference/javascript/initializing
export const supabase: SupabaseClient = configured
  ? createClient(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : (null as unknown as SupabaseClient);
