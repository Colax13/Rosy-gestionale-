import { Ticket } from 'lucide-react';

export default function BuoniSpa() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100 flex items-center gap-3">
          <Ticket className="text-fuchsia-500" size={32} />
          Buoni Spa
        </h1>
        <p className="text-zinc-400 mt-2">Pagina di prova per forzare l'aggiornamento su GitHub.</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 text-center text-zinc-400">
        Se vedi questa pagina, significa che l'aggiornamento è andato a buon fine!
      </div>
    </div>
  );
}
