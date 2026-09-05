'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Search, Users, FolderKanban, FlaskConical, X } from 'lucide-react';
import { listClients, listProjects, listSamples, Query } from '@/lib/services';
import type { Client, Project, Sample } from '@/types';

type SearchResults = {
  clients: Client[];
  projects: Project[];
  samples: Sample[];
};

const EMPTY: SearchResults = { clients: [], projects: [], samples: [] };

export default function GlobalSearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  const handleQueryChange = (value: string) => {
    setQuery(value);
    setOpen(true);
    if (value.trim().length >= 2) {
      setLoading(true);
    } else {
      setResults(EMPTY);
      setLoading(false);
    }
  };

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const t = setTimeout(async () => {
      try {
        const [clients, projects, samples] = await Promise.all([
          listClients([Query.limit(50)]),
          listProjects([Query.limit(50)]),
          listSamples([Query.limit(50)]),
        ]);
        const needle = q.toLowerCase();
        const filter = (value?: string) => (value || '').toLowerCase().includes(needle);
        setResults({
          clients: clients.documents.filter((c) => filter(c.name) || filter(c.phone)),
          projects: projects.documents.filter((p) => filter(p.name) || filter(p.projectNumber)),
          samples: samples.documents.filter((s) => filter(s.sampleNumber) || filter(s.clientName) || filter(s.projectName) || filter(s.type)),
        });
      } catch (e) {
        console.warn('فشل البحث:', e);
        setResults(EMPTY);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const onClickOutside = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onClickOutside);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClickOutside);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const total = results.clients.length + results.projects.length + results.samples.length;
  const showDropdown = open && query.trim().length >= 2;

  return (
    <div ref={boxRef} className="relative w-full">
      <div className="relative">
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="بحث في العملاء والمشاريع والعينات..."
          className="w-full bg-surface-dim border border-border rounded-xl pr-9 pl-9 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary focus:bg-surface transition-all duration-200"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults(EMPTY);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-muted transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full right-0 left-0 mt-2 bg-surface border border-border rounded-2xl shadow-xl z-40 max-h-96 overflow-y-auto animate-slide-up">
          {loading && (
            <div className="p-4 text-sm text-text-muted flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              جارٍ البحث...
            </div>
          )}

          {!loading && total === 0 && (
            <div className="p-4 text-sm text-text-muted">لا توجد نتائج لـ &laquo;{query.trim()}&raquo;</div>
          )}

          {!loading && results.clients.length > 0 && (
            <div className="p-1.5">
              <div className="px-3 py-1.5 text-xs font-bold text-text-muted flex items-center gap-1.5">
                <Users size={12} /> العملاء
              </div>
              {results.clients.map((c) => (
                <Link
                  key={c.$id}
                  href={`/dashboard/clients/${c.$id}`}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm hover:bg-primary-50 flex items-center justify-between gap-2 transition-colors"
                >
                  <span className="font-medium text-text-primary">{c.name}</span>
                  {c.phone && <span className="text-text-muted text-xs">{c.phone}</span>}
                </Link>
              ))}
            </div>
          )}

          {!loading && results.projects.length > 0 && (
            <div className="p-1.5 border-t border-border">
              <div className="px-3 py-1.5 text-xs font-bold text-text-muted flex items-center gap-1.5">
                <FolderKanban size={12} /> المشاريع
              </div>
              {results.projects.map((p) => (
                <Link
                  key={p.$id}
                  href={`/dashboard/projects/${p.$id}`}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm hover:bg-primary-50 flex items-center justify-between gap-2 transition-colors"
                >
                  <span className="font-medium text-text-primary">{p.name}</span>
                  <span className="text-text-muted text-xs">{p.projectNumber}</span>
                </Link>
              ))}
            </div>
          )}

          {!loading && results.samples.length > 0 && (
            <div className="p-1.5 border-t border-border">
              <div className="px-3 py-1.5 text-xs font-bold text-text-muted flex items-center gap-1.5">
                <FlaskConical size={12} /> العينات
              </div>
              {results.samples.map((s) => (
                <Link
                  key={s.$id}
                  href={`/dashboard/samples/${s.$id}`}
                  onClick={() => setOpen(false)}
                  className="block px-3 py-2 rounded-xl text-sm hover:bg-primary-50 flex items-center justify-between gap-2 transition-colors"
                >
                  <span className="font-medium text-text-primary">{s.sampleNumber}</span>
                  <span className="text-text-muted text-xs">{s.type}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
