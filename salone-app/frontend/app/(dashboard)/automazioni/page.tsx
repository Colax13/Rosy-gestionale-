import { Zap } from 'lucide-react';

export default function AutomazioniPage() {
  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto w-full">
      <header className="mb-6">
        <h1 className="text-3xl font-playfair font-bold text-zinc-900 flex items-center gap-3">
          <Zap className="text-fuchsia-500" size={28} />
          Automazioni
        </h1>
        <p className="text-zinc-500 mt-1 text-sm">Sezione non ancora attiva.</p>
      </header>

      <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-10 flex flex-col items-center gap-2 text-center">
        <div className="p-3 bg-zinc-100 rounded-full text-zinc-400"><Zap size={22} /></div>
        <p className="text-sm font-medium text-zinc-700">Stiamo ancora lavorando a questa parte</p>
        <p className="text-xs text-zinc-500 max-w-sm">Appena è pronta la trovi qui.</p>
      </div>
    </div>
  );
}
