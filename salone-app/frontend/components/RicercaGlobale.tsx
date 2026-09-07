import { useState, useEffect, useRef } from 'react';
import { Search, User, Calendar, X } from 'lucide-react';
// import { clientiApi, appuntamentiApi } from '../lib/api-client';

interface RisultatoRicerca {
  id: string;
  tipo: 'cliente' | 'appuntamento';
  titolo: string;
  sottotitolo: string;
  path: string;
}

export default function RicercaGlobale() {
  const [query, setQuery] = useState('');
  const [risultati, setRisultati] = useState<RisultatoRicerca[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // MOCK DATA per la ricerca
  const mockDati: RisultatoRicerca[] = [
    { id: '1', tipo: 'cliente', titolo: 'Giulia Verdi', sottotitolo: '+39 333 1234567', path: '/clienti/1' },
    { id: '2', tipo: 'cliente', titolo: 'Mario Rossi', sottotitolo: 'mario@email.com', path: '/clienti/2' },
    { id: '3', tipo: 'appuntamento', titolo: 'Taglio - Giulia Verdi', sottotitolo: 'Oggi, 15:30', path: '/agenda' },
    { id: '4', tipo: 'appuntamento', titolo: 'Colore - Mario Rossi', sottotitolo: 'Domani, 10:00', path: '/agenda' },
  ];

  useEffect(() => {
    // Chiudi tendina se clicco fuori
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.trim().length > 1) {
      setIsSearching(true);
      setIsOpen(true);
      
      // Simula caricamento API backend (in futuro creare route /api/search?q=...)
      const timer = setTimeout(() => {
        const queryLower = query.toLowerCase();
        const filtrati = mockDati.filter(d => 
          d.titolo.toLowerCase().includes(queryLower) || 
          d.sottotitolo.toLowerCase().includes(queryLower)
        );
        setRisultati(filtrati);
        setIsSearching(false);
      }, 300);

      return () => clearTimeout(timer);
    } else {
      setRisultati([]);
      setIsOpen(false);
    }
  }, [query]);

  const handleSelect = (path: string) => {
    // In React Router (Next.js) faremmo router.push(path)
    // router.push(path);
    console.log(`Navigazione verso: ${path}`);
    setIsOpen(false);
    setQuery('');
  };

  return (
    <div ref={wrapperRef} className="relative w-full max-w-md">
      <div className="relative flex items-center">
        <Search className="absolute left-3 text-zinc-500" size={18} />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cerca cliente o appuntamento (es. Giulia o Taglio)..."
          className="w-full pl-10 pr-10 py-2 bg-zinc-100/50 border border-zinc-200 rounded-full focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 text-sm font-sans placeholder-zinc-500/80 shadow-sm transition-all"
        />
        {query && (
          <button 
            onClick={() => { setQuery(''); setIsOpen(false); }}
            className="absolute right-3 text-zinc-500 hover:text-zinc-900"
          >
            <X size={16} />
          </button>
        )}
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-zinc-200 rounded-xl shadow-lg overflow-hidden z-50 py-2">
          {isSearching ? (
            <div className="p-4 text-center text-sm text-zinc-500 animate-pulse">Ricerca in corso...</div>
          ) : risultati.length > 0 ? (
            <ul className="max-h-64 overflow-y-auto">
              {risultati.map((ris) => (
                <li key={`${ris.tipo}-${ris.id}`}>
                  <button
                    onClick={() => handleSelect(ris.path)}
                    className="w-full text-left px-4 py-3 hover:bg-zinc-100/50 flex items-start gap-3 transition-colors border-b border-zinc-200/30 last:border-0"
                  >
                    <div className="mt-0.5 text-fuchsia-500 p-1.5 bg-fuchsia-500/20 rounded-full">
                      {ris.tipo === 'cliente' ? <User size={16} /> : <Calendar size={16} />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-zinc-900">{ris.titolo}</div>
                      <div className="text-xs text-zinc-500 mt-0.5">{ris.sottotitolo}</div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
             <div className="p-4 text-center text-sm text-zinc-500">Nessun risultato trovato per "{query}"</div>
          )}
        </div>
      )}
    </div>
  );
}
