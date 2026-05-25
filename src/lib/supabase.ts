import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yszheonqyyskkjoxoexk.supabase.co';
const supabaseAnonKey = 'sb_publishable_yLLbqXl_CFS174sL6TRqjg_nej93X4g';
const supabaseServiceKey = '***REMOVED***';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);