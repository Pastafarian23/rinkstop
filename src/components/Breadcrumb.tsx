import Link from 'next/link';
import styles from './Breadcrumb.module.css';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className={styles.breadcrumb} aria-label="Breadcrumb">
      <Link href="/" className={styles.breadcrumbHome}>Home</Link>
      {items.map((item, index) => (
        <span key={index} className={styles.breadcrumbItem}>
          <span className={styles.breadcrumbSep}>›</span>
          {item.href ? (
            <Link href={item.href} className={styles.breadcrumbLink}>{item.label}</Link>
          ) : (
            <span className={styles.breadcrumbCurrent}>{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
