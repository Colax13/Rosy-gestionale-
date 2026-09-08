'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { clientiApi, appuntamentiApi } from '@/lib/api-client';
import { Edit2, Save, X, Phone, Mail, Calendar, Clock, FileText, Paintbrush, Trash2 } from 'lucide-react';
import BottoneRicontatta from '@/components/BottoneRicontatta';

interface Cliente {
  id: string;
  nome: string;
  cognome: string;
  telefono: string | null;
  email: string | null;
  note: string | null;
  created_at: string;
  canale_acquisizione?: string | null;
}

export default function SchedaCliente() {
  const { id } = useParams<{ id: string }>();
  const cliId = id || '';

  const [cliente, setCliente] = useState<Cliente | null>(null);
  const [storico, setStorico] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  // Stato per l'editing inline
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<Cliente>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    caricaDati();
  }, [cliId]);

  const caricaDati = async () => {
    setLoading(true);
    try {
      const res = await clientiApi.getById(cliId);
      setCliente(res);
      
      try {
        const appsRes = await appuntamentiApi.getByCliente(cliId);
        setStorico(
          appsRes.map((app: any) => ({
            id: app.id,
            data_ora: app.data_ora,
            stato: app.stato,
            servizi: app.righe_appuntamento?.map((r: any) => r.servizi_catalogo?.nome) || [],
            importo: app.prezzo_finale || app.importo || 0,
            miscela_colore: app.colori_utilizzati || app.miscela_colore,
            note: app.note
          }))
        );
      } catch (e) {
        console.error('Errore storico app', e);
      }
    } catch (err: any) {
      setErrore('Impossibile caricare i dati del cliente.');
    } finally {
      setLoading(false);
    }
  };

  const handleEditClick = () => {
    if (cliente) {
      setFormData({
        nome: cliente.nome,
        cognome: cliente.cognome,
        telefono: cliente.telefono,
        email: cliente.email,
        note: cliente.note,
        canale_acquisizione: cliente.canale_acquisizione || 'Instagram',
      });
      setIsEditing(true);
    }
  };

  const handleAnnullaEdit = () => {
    setIsEditing(false);
    setFormData({});
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSalva = async () => {
    if (!formData.nome || !formData.cognome) {
      setErrore('Nome e cognome sono obbligatori.');
      return;
    }

    setIsSaving(true);
    setErrore(null);

    try {
      const updatedData = await clientiApi.update(cliId, formData);
      setCliente(prev => prev ? { ...prev, ...updatedData } : null);
      setIsEditing(false);
    } catch (err: any) {
      setErrore(err.message || 'Errore durante l\'aggiornamento.');
    } finally {
      setIsSaving(false);
    }
  };

  const executeDelete = async () => {
    try {
      await clientiApi.delete(cliId);
      window.location.href = '/clienti';
    } catch (err: any) {
      setErrore(err.message || "Errore durante l'eliminazione.");
      setConfirmDelete(false);
    }
  };

  if (loading) {
    return <div className="p-6 flex justify-center text-zinc-500 animate-pulse">Caricamento scheda cliente...</div>;
  }

  if (!cliente) return null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      
      {errore && (
        <div className="mb-6 p-4 bg-red-50 text-red-700 text-sm rounded-md border-l-4 border-red-500">
          {errore}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLONNA SINISTRA: Dettagli Cliente */}
        <div className="lg:col-span-1">
          <div className="card bg-white p-6 rounded-xl shadow-sm border border-zinc-200 relative">
            
            {/* Header / Azioni */}
            <div className="flex justify-between items-start mb-6">
              <div className="w-16 h-16 bg-fuchsia-500/20 rounded-full flex items-center justify-center text-zinc-900 text-2xl font-playfair shadow-sm">
                {cliente.nome.charAt(0)}{cliente.cognome.charAt(0)}
              </div>
              
              {!isEditing ? (
                <div className="flex gap-2">
                  <button 
                    onClick={handleEditClick}
                    className="text-zinc-500 hover:text-zinc-900 p-2 transition-colors rounded-full hover:bg-zinc-100"
                    title="Modifica cliente"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button 
                    onClick={() => setConfirmDelete(true)}
                    className="text-zinc-500 hover:text-red-500 p-2 transition-colors rounded-full hover:bg-zinc-100"
                    title="Elimina cliente"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={handleAnnullaEdit}
                    className="p-2 text-zinc-500 hover:text-red-600 transition-colors rounded-full hover:bg-red-50"
                    title="Annulla"
                    disabled={isSaving}
                  >
                    <X size={18} />
                  </button>
                  <button 
                    onClick={handleSalva}
                    className="p-2 text-zinc-900 hover:text-green-700 transition-colors rounded-full hover:bg-green-50"
                    title="Salva modifiche"
                    disabled={isSaving}
                  >
                    <Save size={18} />
                  </button>
                </div>
              )}
            </div>

            {/* Dati Anagrafici */}
            <div className="space-y-4">
              {!isEditing ? (
                <div>
                  <h1 className="text-2xl font-playfair text-zinc-900 leading-tight">
                    {cliente.nome} {cliente.cognome}
                  </h1>
                  <p className="text-sm text-zinc-500 mt-1">
                    Cliente dal {new Date(cliente.created_at).toLocaleDateString('it-IT', { year: 'numeric', month: 'long' })}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-zinc-500">Nome</label>
                    <input 
                      name="nome" value={formData.nome || ''} onChange={handleChange} 
                      className="w-full border-b border-zinc-200 focus:border-fuchsia-500 outline-none py-1 font-medium bg-transparent" 
                    />
                  </div>
                  <div>
                    <label className="text-xs text-zinc-500">Cognome</label>
                    <input 
                      name="cognome" value={formData.cognome || ''} onChange={handleChange} 
                      className="w-full border-b border-zinc-200 focus:border-fuchsia-500 outline-none py-1 font-medium bg-transparent" 
                    />
                  </div>
                </div>
              )}

              {/* Contatti */}
              <div className="pt-4 border-t border-zinc-200 space-y-3 font-sans text-sm">
                <div className="flex items-center gap-3">
                  <Phone size={16} className="text-zinc-500" />
                  {!isEditing ? (
                    <div className="flex items-center gap-3 flex-wrap min-w-0">
                      <span className="text-zinc-900">{cliente.telefono || <span className="italic text-zinc-500/50">Nessun telefono</span>}</span>
                      <BottoneRicontatta
                        telefono={cliente.telefono}
                        aspetto="discreto"
                        etichetta="Scrivi"
                        messaggio={`Buongiorno ${cliente.nome || ''}!`.replace(/\s+/g, ' ')}
                      />
                    </div>
                  ) : (
                    <input 
                      name="telefono" value={formData.telefono || ''} onChange={handleChange} 
                      placeholder="Telefono"
                      className="w-full border-b border-zinc-200 focus:border-fuchsia-500 outline-none py-1 bg-transparent" 
                    />
                  )}
                </div>
                
                <div className="flex items-center gap-3">
                  <Mail size={16} className="text-zinc-500" />
                  {!isEditing ? (
                    <span className="text-zinc-900">{cliente.email || <span className="italic text-zinc-500/50">Nessuna email</span>}</span>
                  ) : (
                    <input 
                      name="email" value={formData.email || ''} onChange={handleChange} 
                      placeholder="Email"
                      className="w-full border-b border-zinc-200 focus:border-fuchsia-500 outline-none py-1 bg-transparent" 
                    />
                  )}
                </div>

                <div className="flex items-center gap-3 pt-1">
                  <span className="w-4 h-4 rounded-full bg-fuchsia-500/20 text-fuchsia-400 font-bold text-[9px] flex items-center justify-center">C</span>
                  <span className="text-xs text-zinc-500 uppercase font-bold tracking-wide">Canale:</span>
                  {!isEditing ? (
                    <span className="text-zinc-800 font-semibold font-sans text-xs bg-zinc-850 px-2 py-0.5 rounded border border-zinc-200 shadow-sm">
                      {cliente.canale_acquisizione || 'Altro'}
                    </span>
                  ) : (
                    <select
                      name="canale_acquisizione"
                      value={formData.canale_acquisizione || ''}
                      onChange={handleChange}
                      className="text-xs bg-white border border-zinc-200 rounded px-2 py-1 outline-none focus:border-fuchsia-500 text-zinc-800"
                    >
                      <option value="Instagram">Instagram</option>
                      <option value="Facebook">Facebook</option>
                      <option value="Google">Google</option>
                      <option value="Passaparola">Passaparola</option>
                      <option value="Altro">Altro / Passante</option>
                    </select>
                  )}
                </div>
              </div>

              {/* Note */}
              <div className="pt-4 border-t border-zinc-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText size={16} className="text-zinc-500" />
                  <span className="text-sm font-semibold text-zinc-900">Note e preferenze</span>
                </div>
                {!isEditing ? (
                  <p className="text-sm text-zinc-500 leading-relaxed">
                    {cliente.note || <span className="italic text-zinc-500/50">Nessuna nota aggiuntiva.</span>}
                  </p>
                ) : (
                  <textarea 
                    name="note" value={formData.note || ''} onChange={handleChange} 
                    rows={4}
                    placeholder="Aggiungi una nota..."
                    className="w-full p-2 text-sm border border-zinc-200 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none resize-none bg-zinc-100" 
                  />
                )}
              </div>

            </div>
          </div>
        </div>

        {/* COLONNA DESTRA: Storico appuntamenti */}
        <div className="lg:col-span-2">
          <div className="card bg-white p-6 rounded-xl shadow-sm border border-zinc-200 min-h-full">
            <h2 className="text-xl font-playfair text-zinc-900 mb-6 flex items-center gap-2">
              <Calendar size={20} className="text-fuchsia-500" />
              Storico appuntamenti
            </h2>

            {storico.length === 0 ? (
              <div className="text-center py-12 text-zinc-500 bg-zinc-100 rounded-lg border border-dashed border-zinc-200">
                <p>Nessun appuntamento passato.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {storico.map((appuntamento) => {
                  const data = new Date(appuntamento.data_ora);
                  return (
                    <div key={appuntamento.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-lg bg-zinc-100/30 hover:bg-zinc-100/50 transition-colors border border-zinc-200/50">
                      
                      <div className="flex sm:flex-col items-center sm:items-start gap-2 sm:gap-0 min-w-[120px]">
                        <span className="font-semibold text-zinc-900">
                          {data.toLocaleDateString('it-IT', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </span>
                        <span className="text-sm text-zinc-500 flex items-center gap-1">
                          <Clock size={14} /> 
                          {data.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          {appuntamento.servizi.map((servizio: string, i: number) => (
                            <span key={i} className="px-2 py-1 text-xs font-medium rounded-full bg-fuchsia-500/30 text-zinc-900 border border-fuchsia-500/30">
                              {servizio}
                            </span>
                          ))}
                          
                          {appuntamento.miscela_colore && (
                            <div className="relative group inline-block">
                              <span className="cursor-help inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-medium rounded-full bg-indigo-500/15 text-indigo-400 border border-indigo-500/35 shadow-sm transition-all hover:bg-indigo-500/25">
                                <Paintbrush size={11} className="text-indigo-400" />
                                Colori utilizzati
                              </span>
                              {/* Hover Tooltip/Popup */}
                              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 w-80 md:w-96 bg-white border border-zinc-300 text-zinc-800 text-sm rounded-xl p-5 shadow-2xl opacity-0 scale-90 translate-y-1 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 transition-all duration-200 pointer-events-none z-30 font-sans leading-relaxed border-t-4 border-t-indigo-500 text-left">
                                <div className="flex items-center gap-2 font-bold text-zinc-900 pb-2 mb-2 border-b border-zinc-200 text-base">
                                  <Paintbrush size={16} className="text-indigo-400" />
                                  <span>Colori e miscela</span>
                                </div>
                                <p className="font-mono text-sm leading-relaxed text-indigo-100 bg-black/40 p-3 rounded-lg border border-black/50 break-words mt-2">
                                  {appuntamento.miscela_colore}
                                </p>
                              </div>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-zinc-500 mb-1">Stato: <span className="capitalize">{appuntamento.stato}</span></p>
                        
                        {appuntamento.note && (
                          <div className="mt-2 text-sm text-zinc-500 bg-zinc-50/50 p-3 rounded-lg border border-zinc-200/50">
                            <div className="flex items-center gap-1.5 mb-1 text-zinc-500 font-semibold text-xs tracking-wider uppercase">
                              <FileText size={12} />
                              <span>Nota appuntamento</span>
                            </div>
                            <p className="italic leading-relaxed">{appuntamento.note}</p>
                          </div>
                        )}
                      </div>

                      <div className="sm:text-right font-medium text-zinc-900 text-lg self-end sm:self-center">
                        €{appuntamento.importo?.toFixed(2)}
                      </div>

                    </div>
                  );
                })}
              </div>
            )}
            
          </div>
        </div>

      </div>
      
      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-zinc-900 mb-2">Conferma eliminazione</h3>
            <p className="text-zinc-500 text-sm mb-6">
              Vuoi davvero eliminare definitivamente il cliente {cliente.nome} {cliente.cognome}? L'operazione rimuoverà anche lo storico appuntamenti e non potrà essere annullata.
            </p>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setConfirmDelete(false)}
                className="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
               >
                Annulla
               </button>
               <button 
                onClick={executeDelete}
                className="flex-1 px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors bg-red-600 hover:bg-red-500"
               >
                 Elimina cliente
               </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
