'use client';

import FloatingActionBar from '@/components/FloatingActionBar';
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clientiApi } from '@/lib/api-client';
import { Users, Search, Plus, Phone, Mail, FileText, ChevronRight } from 'lucide-react';
import FormNuovoCliente from '@/components/FormNuovoCliente';

interface Cliente {
  id: string;
  nome: string;
  cognome: string;
  telefono: string | null;
  email: string | null;
  note: string | null;
}

export default function GestioneClienti() {
  const [clienti, setClienti] = useState<Cliente[]>([]);
  const [filteredClienti, setFilteredClienti] = useState<Cliente[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  useEffect(() => {
    caricaClienti();
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredClienti(clienti);
      return;
    }
    const q = search.toLowerCase();
    const filtered = clienti.filter(c => 
      c.nome.toLowerCase().includes(q) || 
      c.cognome.toLowerCase().includes(q) ||
      (c.telefono && c.telefono.includes(q)) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
    setFilteredClienti(filtered);
  }, [search, clienti]);

  const caricaClienti = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await clientiApi.getAll();
      setClienti(data || []);
      setFilteredClienti(data || []);
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento dei clienti');
    } finally {
      setLoading(false);
    }
  };

  const handleError = (msg: string) => {
    alert(msg);
  };

  const handleFileUpload = async (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!file.type.match('application/pdf') && !file.name.endsWith('.csv') && !file.name.endsWith('.xlsx')) {
      handleError("Carica un PDF o un foglio di calcolo (.csv, .xlsx).");
      return;
    }

    setIsImporting(true);

    const reader = new FileReader();
    reader.onload = async (e: any) => {
      const base64Data = e.target.result.split(',')[1];
      try {
        await clientiApi.importAi({ fileData: base64Data, mimeType: file.type || 'application/pdf' });
        caricaClienti();
        alert('Clienti importati con successo tramite IA!');
      } catch (err) {
        handleError("Errore nell'analisi del documento tramite IA.");
      } finally {
        setIsImporting(false);
        // Reset file input
        event.target.value = null;
      }
    };
    reader.readAsDataURL(file);
  };

  const onClienteCreato = () => {
    setIsModalOpen(false);
    caricaClienti();
  };

  return (
    <div className="flex flex-col h-full w-full pb-24 h-full">
      <div className="w-full px-4 md:px-6 pt-4 md:pt-6">
        <div className="max-w-[1400px] mx-auto w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 sticky top-4 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-xl">
            <div>
              <h1 className="text-3xl font-playfair text-zinc-900 flex items-center gap-3">
                <Users className="text-fuchsia-500" size={28} />
                Clienti
              </h1>
              <p className="text-zinc-500 font-sans mt-1 text-sm">Gestione e anagrafica clienti del salone.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 flex-1">

      <div className="mb-6 relative">
         <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
         <input 
           type="text" 
           value={search}
           onChange={e => setSearch(e.target.value)}
           placeholder="Cerca cliente per nome, cognome, telefono o email..."
           className="w-full pl-10 pr-4 py-2 bg-white border border-zinc-200 rounded-lg text-zinc-900 focus:outline-none focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 transition-colors"
         />
      </div>

      {error ? (
        <div className="p-4 bg-red-500/10 text-red-500 rounded-lg border border-red-500/20">
          <p>{error}</p>
          <button onClick={caricaClienti} className="mt-2 text-sm font-semibold underline">Riprova</button>
        </div>
      ) : loading ? (
         <div className="text-center py-12 text-zinc-500">Caricamento clienti...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-100/40 border-b border-zinc-200 text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                <th className="py-3 px-6">Cliente</th>
                <th className="py-3 px-6">Contatti</th>
                <th className="py-3 px-6">Note</th>
                <th className="py-3 px-6 text-right">Dettagli</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200">
              {filteredClienti.map(cliente => (
                <tr key={cliente.id} className="hover:bg-zinc-100/20 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-700 font-medium">
                        {cliente.nome.charAt(0)}{cliente.cognome.charAt(0)}
                      </div>
                      <div>
                        <div className="text-zinc-900 font-medium">{cliente.nome} {cliente.cognome}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex flex-col gap-1 text-sm text-zinc-500">
                      {cliente.telefono && (
                        <div className="flex items-center gap-2">
                          <Phone size={14} className="text-zinc-500" /> {cliente.telefono}
                        </div>
                      )}
                      {cliente.email && (
                        <div className="flex items-center gap-2">
                          <Mail size={14} className="text-zinc-500" /> {cliente.email}
                        </div>
                      )}
                      {!cliente.telefono && !cliente.email && (
                         <span className="italic text-zinc-400">Nessun contatto</span>
                      )}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    {cliente.note ? (
                      <div className="flex items-start gap-2 text-sm text-zinc-500 max-w-xs truncate">
                        <FileText size={14} className="shrink-0 mt-0.5" />
                        <span className="truncate">{cliente.note}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-zinc-400 italic">Nessuna nota</span>
                    )}
                  </td>
                  <td className="py-4 px-6 text-right">
                    <Link 
                      to={`/clienti/${cliente.id}`} 
                      className="inline-flex items-center justify-center p-2 text-zinc-500 hover:text-fuchsia-500 hover:bg-fuchsia-500/10 rounded-lg transition-colors"
                    >
                      <ChevronRight size={18} />
                    </Link>
                  </td>
                </tr>
              ))}
              {filteredClienti.length === 0 && (
                <tr>
                   <td colSpan={4} className="text-center py-12 text-zinc-500 italic">
                     Nessun cliente trovato.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Form Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 transition-opacity">
           <FormNuovoCliente 
             onChiudi={() => setIsModalOpen(false)}
             onClienteCreato={onClienteCreato}
           />
        </div>
      )}

      {/* Floating Action Bar */}
      <FloatingActionBar>
        <label className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-full px-5 py-2.5 transition-colors cursor-pointer text-sm font-medium">
          <FileText size={16} />
          {isImporting ? 'Elaborazione IA...' : 'Importa (PDF/XLS)'}
          <input 
            type="file" 
            className="hidden" 
            accept=".pdf,.csv,.xlsx,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={handleFileUpload}
            disabled={isImporting}
          />
        </label>
        
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-medium text-sm"
        >
          <div className="bg-white/20 p-1 rounded-full">
            <Plus size={16} strokeWidth={2.5} />
          </div>
          <span>Nuovo Cliente</span>
        </button>
      </FloatingActionBar>

    </div>
    </div>
  );
}
