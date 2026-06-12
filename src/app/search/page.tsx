import Link from 'next/link';
import Breadcrumb from '@/components/Breadcrumb';
import { Metadata } from 'next';
import styles from './search.module.css';

export const metadata: Metadata = {
  title: 'Hockey Search — Find Rinks, Teams & Leagues',
  description: 'Search the complete hockey directory. Find ice rinks by location, browse hockey teams by league, and discover leagues across all countries.',
  openGraph: {
    title: 'Hockey Search',
    description: 'Search ice rinks, hockey teams, and leagues worldwide.',
    type: 'website',
  },
};

export default function SearchPage() {
  return (
    <div className={styles.pageContainer}>
      <Breadcrumb items={[{ label: 'Hockey Search' }]} />

      <div className={styles.hero}>
        <h1 className={styles.heroTitle}>Hockey Directory</h1>
        <p className={styles.heroSub}>Search ice rinks, teams, and leagues worldwide.</p>
      </div>

      <div className={styles.searchGrid}>
        <Link href="/directory/rinks" className={styles.searchCard}>
          <span className={styles.cardIcon}>🏒</span>
          <div className={styles.cardContent}>
            <h2>Find Ice Rinks</h2>
            <p>Browse rinks by country and city. View upcoming games, teams, and facility info.</p>
            <span className={styles.cardCta}>Browse Rinks →</span>
          </div>
        </Link>

        <Link href="/directory/teams" className={styles.searchCard}>
          <span className={styles.cardIcon}>🏆</span>
          <div className={styles.cardContent}>
            <h2>Browse Teams</h2>
            <p>Search hockey teams by league, country, or city. View rosters and schedules.</p>
            <span className={styles.cardCta}>Browse Teams →</span>
          </div>
        </Link>

        <Link href="/directory/leagues" className={styles.searchCard}>
          <span className={styles.cardIcon}>📋</span>
          <div className={styles.cardContent}>
            <h2>Explore Leagues</h2>
            <p>Discover hockey leagues from NHL to youth hockey across all countries.</p>
            <span className={styles.cardCta}>Browse Leagues →</span>
          </div>
        </Link>

        <Link href="/directory/countries" className={styles.searchCard}>
          <span className={styles.cardIcon}>🌍</span>
          <div className={styles.cardContent}>
            <h2>Browse by Country</h2>
            <p>Explore hockey in different countries. Find rinks, teams, and leagues near you.</p>
            <span className={styles.cardCta}>All Countries →</span>
          </div>
        </Link>
      </div>

      <div className={styles.quickLinks}>
        <h2>Popular Countries</h2>
        <div className={styles.countryGrid}>
          <Link href="/hockey/united-states" className={styles.countryCard}>🇺🇸 United States</Link>
          <Link href="/hockey/canada" className={styles.countryCard}>🇨🇦 Canada</Link>
          <Link href="/hockey/sweden" className={styles.countryCard}>🇸🇪 Sweden</Link>
          <Link href="/hockey/finland" className={styles.countryCard}>🇫🇮 Finland</Link>
          <Link href="/hockey/russia" className={styles.countryCard}>🇷🇺 Russia</Link>
          <Link href="/hockey/germany" className={styles.countryCard}>🇩🇪 Germany</Link>
          <Link href="/hockey/united-kingdom" className={styles.countryCard}>🇬🇧 United Kingdom</Link>
          <Link href="/hockey/switzerland" className={styles.countryCard}>🇨🇭 Switzerland</Link>
        </div>
      </div>
    </div>
  );
}
