import React, { useState, useRef, useEffect } from 'react';
import { Search, Loader2 } from 'lucide-react';

interface SearchResult {
  id: string | number;
  title: string;
  subtitle: string;
  cover_url: string;
}

interface ApiSearchBoxProps {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => Promise<SearchResult[]>;
  onSelect: (result: SearchResult) => void;
  placeholder?: string;
  label?: string;
}

export default function ApiSearchBox({
  value,
  onChange,
  onSearch,
  onSelect,
  placeholder = 'Digite o nome...',
  label = 'Nome',
}: ApiSearchBoxProps) {
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function doSearch() {
    if (!value.trim() || value.trim().length < 2) return;
    setSearching(true);
    setShowResults(true);
    try {
      const r = await onSearch(value.trim());
      setResults(r);
    } catch {
      setResults([]);
    }
    setSearching(false);
  }

  function handleSelect(r: SearchResult) {
    onSelect(r);
    setShowResults(false);
    setResults([]);
  }

  return (
    <div ref={containerRef} className="relative">
      <label className="block text-xs font-medium text-dark-300 mb-1">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={e => onChange(e.target.value)}
          className="input-field flex-1"
          placeholder={placeholder}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              doSearch();
            }
          }}
        />
        <button
          type="button"
          onClick={doSearch}
          disabled={searching || !value.trim()}
          className="btn-secondary px-3 flex items-center gap-1.5 text-xs shrink-0"
          title="Buscar na internet"
        >
          {searching ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Search size={14} />
          )}
          Buscar
        </button>
      </div>

      {/* Dropdown Results */}
      {showResults && (results.length > 0 || searching) && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-dark-800 border border-dark-600 rounded-xl shadow-2xl max-h-72 overflow-auto">
          {searching && (
            <div className="flex items-center justify-center gap-2 py-4 text-dark-400 text-xs">
              <Loader2 size={14} className="animate-spin" />
              Buscando...
            </div>
          )}
          {!searching && results.length === 0 && (
            <div className="py-4 text-center text-dark-500 text-xs">
              Nenhum resultado encontrado
            </div>
          )}
          {!searching && results.map(r => (
            <button
              key={r.id}
              onClick={() => handleSelect(r)}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-dark-700/60 transition-colors text-left border-b border-dark-700/30 last:border-0"
            >
              {r.cover_url ? (
                <img
                  src={r.cover_url}
                  alt=""
                  className="w-10 h-14 object-cover rounded-md shrink-0 bg-dark-700"
                  onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              ) : (
                <div className="w-10 h-14 bg-dark-700 rounded-md shrink-0 flex items-center justify-center text-dark-500 text-[10px]">
                  N/A
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-dark-100 truncate">{r.title}</p>
                <p className="text-[11px] text-dark-400 truncate">{r.subtitle}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
