import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { api } from '../../api';
import { SearchResult } from '../../types';
import { useDebounce } from '../../hooks/useDebounce';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CommandPalette({ isOpen, onClose }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [mounted, setMounted] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults([]);
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    const fetchResults = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        return;
      }
      setIsLoading(true);
      try {
        const data = await api.get<SearchResult[]>(`/api/search?q=${encodeURIComponent(debouncedQuery)}`);
        setResults(data);
        setSelectedIndex(0);
      } catch (err) {
        console.error('Search failed:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchResults();
  }, [debouncedQuery]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'Escape') {
        onClose();
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results[selectedIndex]) {
          handleSelect(results[selectedIndex]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex]);

  const handleSelect = (result: SearchResult) => {
    onClose();
    // Navigate to the specific item if possible, or just the page
    // Using ?search= or ?id= depending on how pages are wired up
    // For now, we will navigate to the page with a specific query parameter
    navigate(`${result.route}?id=${result.id}`);
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[200] flex items-start justify-center pt-[15vh] px-4 animate-fade-in-up">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      ></div>

      {/* Command Palette */}
      <div className="relative w-full max-w-2xl overflow-hidden rounded-2xl bg-dashboard-bg/80 backdrop-blur-2xl border border-white/10 shadow-[inset_0_0_40px_rgba(255,255,255,0.05),0_20px_40px_rgba(0,0,0,0.5)] flex flex-col animate-scale-up">
        
        {/* Input */}
        <div className="flex items-center px-4 py-4 border-b border-white/10">
          <i className="fa-solid fa-magnifying-glass text-text-secondary mr-4"></i>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none outline-none text-white placeholder-text-secondary text-lg"
            placeholder="Search applications, stories, or skills..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {isLoading && <div className="w-5 h-5 rounded-full border-2 border-accent-teal/30 border-t-accent-teal animate-spin ml-3"></div>}
          <div className="flex items-center gap-1 ml-4 text-xs font-mono text-text-secondary opacity-50 hidden sm:flex">
            <kbd className="bg-white/10 px-2 py-1 rounded">esc</kbd> to close
          </div>
        </div>

        {/* Results */}
        <div className="max-h-[50vh] overflow-y-auto custom-scrollbar p-2">
          {results.length === 0 && query.length > 0 && !isLoading && (
            <div className="py-12 text-center text-text-secondary">
              No results found for "{query}"
            </div>
          )}

          {results.length === 0 && query.length === 0 && (
            <div className="py-8 text-center text-text-secondary/50 text-sm">
              Start typing to search...
            </div>
          )}

          {results.map((result, index) => (
            <div
              key={`${result.type}-${result.id}`}
              onClick={() => handleSelect(result)}
              onMouseEnter={() => setSelectedIndex(index)}
              className={`flex items-center p-4 rounded-xl cursor-pointer transition-colors ${
                index === selectedIndex ? 'bg-accent-teal/10 border border-accent-teal/20' : 'hover:bg-white/5 border border-transparent'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mr-4 ${
                index === selectedIndex ? 'bg-accent-teal text-dashboard-bg shadow-[0_0_15px_rgba(45,212,191,0.3)]' : 'bg-white/5 text-text-secondary'
              }`}>
                <i className={`${result.icon} text-lg`}></i>
              </div>
              
              <div className="flex-1 min-w-0">
                <div className={`font-semibold truncate ${index === selectedIndex ? 'text-accent-teal' : 'text-white'}`}>
                  {result.title}
                </div>
                <div className="text-sm text-text-secondary truncate mt-0.5">
                  {result.subtitle}
                </div>
              </div>
              
              <div className="text-xs font-mono px-2 py-1 rounded-full bg-white/5 text-text-secondary ml-4 shrink-0">
                {result.type}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
