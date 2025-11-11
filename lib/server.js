// lib/server.js
const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    "Supabase credentials are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable data fetching."
  );
}


function createServerSupabaseClient() {
  if (!supabaseUrl || !supabaseAnonKey) {
    return undefined;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
}


module.exports = {
  createServerSupabaseClient,
};
