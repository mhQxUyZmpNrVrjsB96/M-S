import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_CONFIG } from '../config/supabaseConfig';

// Leggi le credenziali con gerarchia:
// 1. localStorage (override manuale dell'utente nel browser)
// 2. import.meta.env (Vite / Vercel Env Vars se presenti)
// 3. PUBLIC_SUPABASE_CONFIG (configurazione automatica integrata nel repository pubblico)
function getSupabaseConfig(): { url: string; anonKey: string } {
  const envUrl = ((import.meta as any).env?.VITE_SUPABASE_URL as string)?.trim();
  const envKey = ((import.meta as any).env?.VITE_SUPABASE_ANON_KEY as string)?.trim();

  let url = (envUrl && envUrl.length > 0) ? envUrl : (PUBLIC_SUPABASE_CONFIG.url || '');
  let anonKey = (envKey && envKey.length > 0) ? envKey : (PUBLIC_SUPABASE_CONFIG.anonKey || '');

  // Permetti override manuale salvato in locale nel browser se configurato via UI
  try {
    const customUrl = localStorage.getItem('supabase_custom_url');
    const customKey = localStorage.getItem('supabase_custom_anon_key');
    if (customUrl && customUrl.trim()) {
      url = customUrl.trim();
    }
    if (customKey && customKey.trim()) {
      anonKey = customKey.trim();
    }
  } catch {
    // ignore
  }

  return { url: url.trim(), anonKey: anonKey.trim() };
}

let supabaseInstance: SupabaseClient | null = null;
let currentConfigKey = '';

export function getSupabase(): SupabaseClient | null {
  const { url, anonKey } = getSupabaseConfig();

  if (!url || !anonKey) {
    return null;
  }

  const configKey = `${url}___${anonKey}`;
  if (supabaseInstance && currentConfigKey === configKey) {
    return supabaseInstance;
  }

  try {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
    });
    currentConfigKey = configKey;
    return supabaseInstance;
  } catch (err) {
    console.error('[Supabase] Errore inizializzazione client:', err);
    return null;
  }
}

export function isSupabaseConfigured(): boolean {
  const { url, anonKey } = getSupabaseConfig();
  return Boolean(url && anonKey && url.startsWith('http'));
}

export function saveCustomSupabaseCredentials(url: string, anonKey: string) {
  try {
    if (url.trim()) {
      localStorage.setItem('supabase_custom_url', url.trim());
    } else {
      localStorage.removeItem('supabase_custom_url');
    }

    if (anonKey.trim()) {
      localStorage.setItem('supabase_custom_anon_key', anonKey.trim());
    } else {
      localStorage.removeItem('supabase_custom_anon_key');
    }

    supabaseInstance = null;
    currentConfigKey = '';
  } catch (e) {
    console.error('Errore salvataggio credenziali Supabase locali:', e);
  }
}

export function getActiveSupabaseUrl(): string {
  const { url } = getSupabaseConfig();
  return url;
}
