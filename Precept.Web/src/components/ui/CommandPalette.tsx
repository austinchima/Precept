import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Briefcase, CornerDownLeft, FileText, Loader2, Search, Sparkles } from 'lucide-react';
import { api } from '../../api';
import { SearchResult } from '../../types';
import { useDebounce } from '../../hooks/useDebounce';
import { NAV_ITEMS } from '../navigation';
import { Kbd } from './kit';
import { cn } from '../../lib/utils';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

type Item = { key: string; title: string; subtitle?: string; icon: React.ReactNode; run: () => void; group: string };

function iconForType(type: string) {
  const t = type.toLowerCase();
  if (t.includes('application')) return <Briefcase size={16} />;
  if (t.includes('skill')) return <Sparkles size={16} />;
  return <FileText size={16} />;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const reduce = useReducedMotion();
  const debouncedQuery = useDebounce(query, 250);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 30);
    }
  }, [isOpen]);

  useEffect(() => {
    let cancelled = false;
    if (!debouncedQuery.trim()) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    api
      .get<SearchResult[]>(`/api/search?q=${encodeURIComponent(debouncedQuery)}`)
      .then((data) => {
        if (!cancelled) {
          setResults(data);
          setSelectedIndex(0);
        }
      })
      .catch((err) => console.error('Search failed:', err))
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery]);

  const items: Item[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pages: Item[] = NAV_ITEMS.filter((n) => !q || n.name.toLowerCase().includes(q)).map((n) => ({
      key: `page-${n.path}`,
      title: n.name,
      subtitle: n.description,
      icon: <n.icon size={16} />,
      group: 'Go to',
      run: () => navigate(n.path),
    }));
    const found: Item[] = results.map((r) => ({
      key: `${r.type}-${r.id}`,
      title: r.title,
      subtitle: r.subtitle,
      icon: iconForType(r.type),
      group: 'Results',
      run: () => navigate(`${r.route}?id=${r.id}`),
    }));
    return [...found, ...pages];
  }, [query, results, navigate]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((i) => Math.min(i + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((i) => Math.max(i - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const item = items[selectedIndex];
        if (item) {
          onClose();
          item.run();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, items, selectedIndex, onClose]);

  if (typeof document === 'undefined') return null;

  let lastGroup = '';
  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[75] flex items-start justify-center px-4 pt-[14vh]">
          <motion.div
            className="absolute inset-0 bg-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Command menu"
            data-lenis-prevent
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -4, scale: 0.99 }}
            transition={{ type: 'spring', stiffness: 520, damping: 38 }}
            className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-line bg-surface-1 shadow-[0_32px_90px_-24px_rgb(0_0_0/0.55)]"
          >
            <div className="flex items-center gap-3 border-b border-line px-4">
              <Search size={16} className="text-fg-3" aria-hidden="true" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search stories, applications, skills or pages"
                aria-label="Search"
                className="h-12 flex-1 bg-transparent text-[14.5px] text-fg outline-none placeholder:text-fg-3"
                data-testid="command-input"
              />
              {isLoading && <Loader2 size={16} className="animate-spin text-fg-3" aria-hidden="true" />}
              <Kbd>esc</Kbd>
            </div>
            <div className="max-h-[52vh] overflow-y-auto p-2" role="listbox">
              {query && !isLoading && results.length === 0 && items.length === 0 && (
                <p className="px-3 py-8 text-center text-[13.5px] text-fg-3">No matches for “{query}”.</p>
              )}
              {items.map((item, index) => {
                const showGroup = item.group !== lastGroup;
                lastGroup = item.group;
                const active = index === selectedIndex;
                return (
                  <React.Fragment key={item.key}>
                    {showGroup && <p className="px-3 pb-1 pt-3 text-[12px] font-medium text-fg-3">{item.group}</p>}
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onMouseMove={() => setSelectedIndex(index)}
                      onClick={() => {
                        onClose();
                        item.run();
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                        active ? 'bg-surface-2' : 'hover:bg-surface-2/60'
                      )}
                    >
                      <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-md border border-line', active ? 'text-fg' : 'text-fg-3')}>
                        {item.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-medium text-fg">{item.title}</span>
                        {item.subtitle && <span className="block truncate text-[12.5px] text-fg-3">{item.subtitle}</span>}
                      </span>
                      {active ? <CornerDownLeft size={14} className="text-fg-3" /> : <ArrowRight size={14} className="text-transparent" />}
                    </button>
                  </React.Fragment>
                );
              })}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
}
