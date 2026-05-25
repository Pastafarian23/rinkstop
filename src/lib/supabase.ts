import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yszheonqyyskkjoxoexk.supabase.co';
const supabaseAnonKey = 'sb_publishable_REDACTED';
const supabaseServiceKey = '***REMOVED***';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);