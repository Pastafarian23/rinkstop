import { supabaseAdmin } from '@/lib/supabase';

export interface ProfileStampsResult {
  rinkCount: number;
  eventCount: number;
  rinks: Array<{ id: string; name: string; slug: string }>;
  events: Array<{ id: string; name: string; parentName: string; startsAt: string }>;
}

/**
 * Public-facing stamp data for /profile/[slug].
 *
 * Wraps stampService.getPublicAttendance but adds:
 *   - rinks[] with name + slug (linked to /directory/rinks/[slug])
 *   - events[] with name + parentName + startsAt
 *   - Graceful fallback to { rinkCount: 0, ... } on any error
 *
 * Used by ProfileStampsGallery on the public profile page.
 */
export async function getPublicStampsForProfile(
  holderUserId: string,
): Promise<ProfileStampsResult | null> {
  try {
    // Fetch public-visible confirmed stamps for the holder.
    const { data: stamps, error } = await supabaseAdmin
      .from('stamps')
      .select(
        'id, target_type, target_rink_id, target_event_id, stamped_at',
      )
      .or(`actor_user_id.eq.${holderUserId},subject_user_id.eq.${holderUserId}`)
      .eq('visibility', 'public')
      .eq('status', 'confirmed');

    if (error || !stamps) {
      return { rinkCount: 0, eventCount: 0, rinks: [], events: [] };
    }

    // Collect unique target IDs.
    const rinkIds = new Set<string>();
    const eventIds = new Set<string>();
    for (const s of stamps) {
      if (s.target_rink_id) rinkIds.add(s.target_rink_id);
      if (s.target_event_id) eventIds.add(s.target_event_id);
    }

    // Hydrate rinks with name + slug.
    const rinks: Array<{ id: string; name: string; slug: string }> = [];
    if (rinkIds.size > 0) {
      const { data: rinksData } = await supabaseAdmin
        .from('rinks')
        .select('id, name, slug')
        .in('id', Array.from(rinkIds))
        .eq('is_active', true);
      if (rinksData) {
        for (const r of rinksData) {
          if (r.id && r.name && r.slug) {
            rinks.push({ id: r.id, name: r.name, slug: r.slug });
          }
        }
      }
    }

    // Hydrate events with name + parent.
    const events: Array<{ id: string; name: string; parentName: string; startsAt: string }> = [];
    if (eventIds.size > 0) {
      const { data: eventsData } = await supabaseAdmin
        .from('rink_events')
        .select('id, title, starts_at, rink:rinks(name)')
        .in('id', Array.from(eventIds))
        .in('status', ['published', 'completed']);
      if (eventsData) {
        for (const ev of eventsData) {
          if (ev.id && ev.title) {
            const r = (ev as any).rink;
            events.push({
              id: ev.id,
              name: ev.title,
              parentName: r?.name || '',
              startsAt: ev.starts_at || '',
            });
          }
        }
      }
    }

    return {
      rinkCount: rinks.length,
      eventCount: events.length,
      rinks,
      events,
    };
  } catch (e) {
    console.error('[profile-stamps] getPublicStampsForProfile failed:', e);
    return { rinkCount: 0, eventCount: 0, rinks: [], events: [] };
  }
}