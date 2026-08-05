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
        <Search size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-concrete-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => setOpen(true)}
          placeholder="بحث في العملاء والمشاريع والعينات..."
          className="w-full bg-concrete-50 border border-concrete-200 rounded-lg pr-9 pl-9 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-petrol"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults(EMPTY);
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 text-concrete-400 hover:text-concrete-700"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute top-full right-0 left-0 mt-1 bg-white border border-concrete-200 rounded-lg shadow-lg z-40 max-h-96 overflow-y-auto">
          {loading && <div className="p-3 text-sm text-concrete-500">جارٍ البحث...</div>}

          {!loading && total === 0 && (
            <div className="p-3 text-sm text-concrete-500">لا توجد نتائج لـ «{query.trim()}»</div>
          )}

          {!loading && results.clients.length > 0 && (
            <div className="p-1">
              <div className="px-2 py-1 text-xs font-bold text-concrete-400 flex items-center gap-1">
                <Users size={12} /> العملاء
              </div>
              {results.clients.map((c) => (
                <Link
                  key={c.$id}
                  href={`/dashboard/clients/${c.$id}`}
                  onClick={() => setOpen(false)}
                  className="block px-2 py-1.5 rounded text-sm hover:bg-concrete-50 flex items-center justify-between gap-2"
                >
                  <span>{c.name}</span>
                  {c.phone && <span className="text-concrete-400 text-xs">{c.phone}</span>}
                </Link>
              ))}
            </div>
          )}

          {!loading && results.projects.length > 0 && (
            <div className="p-1 border-t border-concrete-100">
              <div className="px-2 py-1 text-xs font-bold text-concrete-400 flex items-center gap-1">
                <FolderKanban size={12} /> المشاريع
              </div>
              {results.projects.map((p) => (
                <Link
                  key={p.$id}
                  href={`/dashboard/projects/${p.$id}`}
                  onClick={() => setOpen(false)}
                  className="block px-2 py-1.5 rounded text-sm hover:bg-concrete-50 flex items-center justify-between gap-2"
                >
                  <span>{p.name}</span>
                  <span className="text-concrete-400 text-xs">{p.projectNumber}</span>
                </Link>
              ))}
            </div>
          )}

          {!loading && results.samples.length > 0 && (
            <div className="p-1 border-t border-concrete-100">
              <div className="px-2 py-1 text-xs font-bold text-concrete-400 flex items-center gap-1">
                <FlaskConical size={12} /> العينات
              </div>
              {results.samples.map((s) => (
                <Link
                  key={s.$id}
                  href={`/dashboard/samples/${s.$id}`}
                  onClick={() => setOpen(false)}
                  className="block px-2 py-1.5 rounded text-sm hover:bg-concrete-50 flex items-center justify-between gap-2"
                >
                  <span>{s.sampleNumber}</span>
                  <span className="text-concrete-400 text-xs">{s.type}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
