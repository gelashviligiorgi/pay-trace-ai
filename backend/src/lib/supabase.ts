import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load .env.local if it exists, otherwise fall back to .env
dotenv.config({ path: '.env.local' });
dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
