/**
 * Configurazione Pubblica Supabase per M&S Take a Management
 * 
 * Questo file contiene le coordinate pubbliche del progetto Supabase.
 * In un'applicazione web con database PostgreSQL Supabase:
 * - L'URL e la Anon Key (chiave pubblica / anonima) sono concepiti per essere pubblici nel client.
 * - La sicurezza e l'isolamento dei dati sono garantiti al 100% da PostgreSQL Row Level Security (RLS).
 * - IMPORTANTE: Non inserire MAI qui la chiave "service_role" (inizia con sb_secret_ o ruolo service_role),
 *   poiché bypasserebbe le policy RLS. Usa sempre la chiave "anon" / "public".
 */

export const PUBLIC_SUPABASE_CONFIG = {
  // URL del progetto Supabase dell'utente
  url: "https://owlceyqwbgndkuszlper.supabase.co",

  // Chiave pubblica anonima di default
  // NOTA: Se hai inserito temporaneamente una chiave 'sb_secret_', sostituiscila con la chiave 'anon' 'public'
  // reperibile in Supabase Dashboard -> Project Settings -> API -> Project API keys -> anon public.
  anonKey: "sb_publishable_vWZCPR4BQFhnXOlpfRP6pA_yizAgBqY",
};
