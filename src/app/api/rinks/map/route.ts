import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

// Re-validate the data at most every 5 minutes (matches Cache-Control max-age).
export const revalidate = 300;

// NHL arena known coordinates: city,country → {lat, lon}
// Deduplicated — one entry per unique key
const NHL_ARENA_COORDS: Record<string, { lat: number; lon: number }> = {
  'boston,united states': { lat: 42.3662, lon: -71.0621 },
  'new york,united states': { lat: 40.7505, lon: -73.9934 },
  'chicago,united states': { lat: 41.8807, lon: -87.6742 },
  'toronto,canada': { lat: 43.6433, lon: -79.3790 },
  'montreal,canada': { lat: 45.4961, lon: -73.5692 },
  'vancouver,canada': { lat: 49.2778, lon: -123.1089 },
  'los angeles,united states': { lat: 34.0530, lon: -118.2673 },
  'san jose,united states': { lat: 37.3327, lon: -121.9006 },
  'anaheim,united states': { lat: 33.7581, lon: -117.8763 },
  'phoenix,united states': { lat: 33.4458, lon: -112.0769 },
  'dallas,united states': { lat: 32.7898, lon: -96.8126 },
  'denver,united states': { lat: 39.7487, lon: -105.0077 },
  'minneapolis,united states': { lat: 44.9444, lon: -93.1011 },
  'nashville,united states': { lat: 36.0999, lon: -86.7689 },
  'st. louis,united states': { lat: 38.6325, lon: -90.1885 },
  'winnipeg,canada': { lat: 49.8926, lon: -97.1437 },
  'edmonton,canada': { lat: 53.5467, lon: -113.4929 },
  'calgary,canada': { lat: 51.0379, lon: -114.0721 },
  'ottawa,canada': { lat: 45.4297, lon: -75.6950 },
  'buffalo,united states': { lat: 42.8750, lon: -78.8764 },
  'detroit,united states': { lat: 42.3258, lon: -83.0512 },
  'tampa bay,united states': { lat: 27.9428, lon: -82.4518 },
  'miami,united states': { lat: 25.7617, lon: -80.1918 },
  'columbus,united states': { lat: 39.9683, lon: -82.9967 },
  'carolina,united states': { lat: 35.8325, lon: -78.8517 },
  'washington,united states': { lat: 38.8951, lon: -77.0369 },
  'pittsburgh,united states': { lat: 40.4366, lon: -80.0103 },
  'philadelphia,united states': { lat: 39.9012, lon: -75.1720 },
  'new jersey,united states': { lat: 40.7353, lon: -74.1724 },
  'vegas,united states': { lat: 36.1658, lon: -115.1434 },
  'seattle,united states': { lat: 47.5896, lon: -122.3318 },
  'st. petersburg,united states': { lat: 27.7731, lon: -82.6400 },
  'austin,united states': { lat: 30.5311, lon: -97.7789 },
  'san francisco,united states': { lat: 37.7785, lon: -122.3893 },
  'baltimore,united states': { lat: 39.2779, lon: -76.6053 },
  'raleigh,united states': { lat: 35.8325, lon: -78.8517 },
  'saint paul,united states': { lat: 44.9444, lon: -93.1011 },
  'saint louis,united states': { lat: 38.6325, lon: -96.1885 },
  'cleveland,united states': { lat: 41.4117, lon: -81.7808 },
  'milwaukee,united states': { lat: 43.0489, lon: -87.9131 },
  'kansas city,united states': { lat: 39.1014, lon: -94.5841 },
  'portland,united states': { lat: 45.5316, lon: -122.6668 },
  'salt lake city,united states': { lat: 40.7683, lon: -111.9011 },
  'honolulu,united states': { lat: 21.3045, lon: -157.8576 },
  'anchorage,united states': { lat: 61.2176, lon: -149.8613 },
  'quebec city,canada': { lat: 46.8139, lon: -71.2080 },
  'hamilton,canada': { lat: 43.2557, lon: -79.8712 },
  'london,canada': { lat: 42.9849, lon: -81.2453 },
  'kitchener,canada': { lat: 43.4516, lon: -80.4923 },
  'victoria,canada': { lat: 48.4284, lon: -123.3656 },
  'halifax,canada': { lat: 44.6488, lon: -63.5752 },
  'manchester,united states': { lat: 42.9956, lon: -71.4548 },
  'brooklyn,united states': { lat: 40.6892, lon: -73.9857 },
  'elmont,united states': { lat: 40.7008, lon: -73.6689 },
  'glendale,united states': { lat: 33.5347, lon: -112.1859 },
  'inglewood,united states': { lat: 33.9617, lon: -118.3719 },
  'saint laurent,canada': { lat: 45.5286, lon: -73.5749 },
  'charlotte,united states': { lat: 35.2271, lon: -80.8431 },
};

function lookupCoords(city: string, country: string): { lat: number; lon: number } | null {
  if (!city || !country) return null;
  const key = `${city.toLowerCase().trim()},${country.toLowerCase().trim()}`;
  return NHL_ARENA_COORDS[key] || null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get('country');

  if (!supabaseAdmin) {
    return NextResponse.json({ error: 'Service role not configured' }, { status: 500 });
  }

  const { data: rinks, error } = await supabaseAdmin
    .from('rinks')
    .select('id, name, city, country, latitude, longitude, slug, is_active')
    .eq('is_active', true);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!rinks) {
    return NextResponse.json({ data: [] });
  }

  const enriched = rinks
    .map((rink) => {
      let lat = rink.latitude ? parseFloat(String(rink.latitude)) : null;
      let lon = rink.longitude ? parseFloat(String(rink.longitude)) : null;

      if ((lat === null || lon === null) && rink.city && rink.country) {
        const coords = lookupCoords(rink.city, rink.country);
        if (coords) {
          lat = coords.lat;
          lon = coords.lon;
        }
      }

      return { id: rink.id, name: rink.name, city: rink.city || '', country: rink.country || '', latitude: lat, longitude: lon, slug: rink.slug };
    })
    .filter((rink) => rink.latitude !== null && rink.longitude !== null);

  if (country) {
    const r = NextResponse.json({ data: enriched.filter((rk) => rk.country.toLowerCase() === country.toLowerCase()) });
    r.headers.set('Cache-Control', 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400');
    return r;
  }

  const r = NextResponse.json({ data: enriched });
  r.headers.set('Cache-Control', 'public, max-age=300, s-maxage=1800, stale-while-revalidate=86400');
  return r;
}