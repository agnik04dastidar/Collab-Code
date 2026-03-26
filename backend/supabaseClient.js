import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

// Graceful fallback for development - replace with real creds for production
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

let supabase = null;
if (supabaseUrl && supabaseAnonKey) {
  supabase = createClient(supabaseUrl, supabaseAnonKey);
  console.log("Supabase client initialized");
} else {
  console.warn("Supabase not configured - DB features disabled. Set SUPABASE_URL and SUPABASE_ANON_KEY");
  supabase = {
    from: () => ({
      select: () => ({ single: () => ({ data: null }) }),
      upsert: () => ({ }),
      insert: () => ({ }),
      update: () => ({ })
    })
  };
}

let supabaseAdmin = null;
if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
  supabaseAdmin = createClient(supabaseUrl, process.env.SUPABASE_SERVICE_ROLE_KEY);
}

export { supabase, supabaseAdmin };
export default supabase;

