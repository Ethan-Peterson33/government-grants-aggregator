import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type SupabaseServerClient = SupabaseClient;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable data fetching."
  );
}

export function createServerSupabaseClient(): SupabaseServerClient | undefined {
  if (!supabaseUrl || !supabaseAnonKey) {
    return undefined;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
}
