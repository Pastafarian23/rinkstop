import type { Metadata } from 'next';
import YouthProgramsClient from './YouthProgramsClient';

interface YouthProgram {
  id: string;
  name: string;
  description?: string;
  program_type: 'learn_to_play' | 'house_league' | 'travel_team' | 'high_school' | 'girls_only';
  city?: string;
  province_state?: string;
  country: string;
  website_url?: string;
  age_min?: number;
  age_max?: number;
  contact_email?: string;
}

export const metadata: Metadata = {
  title: 'Youth Hockey Programs',
  description:
    'Browse youth hockey programs, learn-to-play clinics, and developmental leagues.',
  alternates: {
    canonical: 'https://rinkstop.com/directory/youth-hockey/programs',
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    title: 'Youth Hockey Programs',
    description:
      'Browse youth hockey programs, learn-to-play clinics, and developmental leagues.',
    url: 'https://rinkstop.com/directory/youth-hockey/programs',
    siteName: 'RinkStop',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Youth Hockey Programs',
    description:
      'Browse youth hockey programs, learn-to-play clinics, and developmental leagues.',
  },
};

// ISR-cached for 1 hour (2026-07-22 perf pass).
export const dynamic = 'force-dynamic';

async function fetchPrograms(country: string): Promise<YouthProgram[]> {
  try {
    const base = process.env.NEXT_PUBLIC_SITE_URL || 'https://rinkstop.com';
    const url = country
      ? `${base}/api/youth-programs?country=${encodeURIComponent(country)}`
      : `${base}/api/youth-programs`;
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data?.data) ? data.data : [];
  } catch (err) {
    console.error('Youth programs initial fetch failed:', err);
    return [];
  }
}

export default async function YouthProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ country?: string }>;
}) {
  const { country = '' } = await searchParams;
  const initialPrograms = await fetchPrograms(country);
  return <YouthProgramsClient initialPrograms={initialPrograms} initialCountry={country} />;
}
