import { createClient } from '@supabase/supabase-js';
const sb = createClient('https://yszheonqyyskkjoxoexk.supabase.co', '***REMOVED***');

const { data, error } = await sb.from('posts')
  .select('title, slug, og_image_url, published_at, created_at, updated_at')
  .eq('status', 'published')
  .not('og_image_url', 'is', null)
  .order('created_at', { ascending: false });

console.log('ERROR:', error);
console.log('COUNT:', data?.length);
for (const a of data) {
  console.log(`${a.published_at || a.updated_at || a.created_at} | ${a.slug}`);
}
