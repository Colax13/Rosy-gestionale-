import { Ticket } from 'lucide-react';

export default function BuoniSpa() {
  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-900 flex items-center gap-3">
          <Ticket className="text-fuchsia-500" size={32} />
          Buoni Spa
        </h1>
        <p className="text-zinc-500 mt-2">Pagina di prova per forzare l'aggiornamento su GitHub.</p>
      </div>

      <div className="bg-white border border-zinc-200 rounded-xl p-8 text-center text-zinc-500">
        Se vedi questa pagina, significa che l'aggiornamento è andato a buon fine!
      </div>
    </div>
  );
}
