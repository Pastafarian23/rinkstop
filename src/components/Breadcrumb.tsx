import Link from 'next/link';

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export default function Breadcrumb({ items }: BreadcrumbProps) {
  return (
    <nav className="breadcrumb" aria-label="Breadcrumb">
      <Link href="/" className="breadcrumb-home">Home</Link>
      {items.map((item, index) => (
        <span key={index} className="breadcrumb-item">
          <span className="breadcrumb-sep">›</span>
          {item.href ? (
            <Link href={item.href} className="breadcrumb-link">{item.label}</Link>
          ) : (
            <span className="breadcrumb-current">{item.label}</span>
          )}
        </span>
      ))}
      <style jsx>{`
        .breadcrumb {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 0;
          font-size: 0.8rem;
          color: #666;
          margin-bottom: 1.25rem;
          padding: 0.6rem 0;
          border-bottom: 1px solid #e5e7eb;
        }
        .breadcrumb-home {
          color: #888;
          text-decoration: none;
          transition: color 0.2s;
        }
        .breadcrumb-home:hover {
          color: #c8102e;
        }
        .breadcrumb-item {
          display: inline-flex;
          align-items: center;
          gap: 0;
        }
        .breadcrumb-sep {
          margin: 0 0.35rem;
          color: #bbb;
        }
        .breadcrumb-link {
          color: #888;
          text-decoration: none;
          transition: color 0.2s;
        }
        .breadcrumb-link:hover {
          color: #c8102e;
        }
        .breadcrumb-current {
          color: #555;
          font-weight: 500;
        }
      `}</style>
    </nav>
  );
}
