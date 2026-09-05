import Link from 'next/link';
import { ArrowRight, Home } from 'lucide-react';

export type Crumb = { label: string; href?: string };

export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-1.5 text-sm">
      <Link href="/dashboard" className="text-text-muted hover:text-primary transition-colors p-1 rounded-lg hover:bg-primary-50">
        <Home size={14} />
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <ArrowRight size={12} className="text-text-muted" />
          {item.href ? (
            <Link href={item.href} className="text-text-muted hover:text-primary hover:underline transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-text-primary font-semibold">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
