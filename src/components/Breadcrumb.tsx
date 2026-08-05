import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export type Crumb = { label: string; href?: string };

export default function Breadcrumb({ items }: { items: Crumb[] }) {
  return (
    <nav className="flex flex-wrap items-center gap-2 text-sm text-concrete-500">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {i > 0 && <ArrowRight size={14} className="text-concrete-300" />}
          {item.href ? (
            <Link href={item.href} className="hover:text-petrol hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="text-concrete-800">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
