import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Supabase environment variables are required: SUPABASE_URL, " +
      "SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY."
  );
}

const clientOptions = {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
};

export const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  clientOptions
);

export const supabaseAuth = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  clientOptions
);
