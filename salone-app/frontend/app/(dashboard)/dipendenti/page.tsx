'use client';

import FloatingActionBar from '@/components/FloatingActionBar';
import { useState, useEffect } from 'react';
import { dipendentiApi } from '@/lib/api-client';
import { Plus, Edit2, Shield, User, X, Check, AlertCircle, Trash2, Eye, FileText, Download } from 'lucide-react';

import TurniCalendario from './TurniCalendario';

interface Dipendente {
  id: string;
  nome: string;
  cognome: string;
  email: string;
  ruolo: 'admin' | 'dipendente';
  attivo: boolean;
  created_at: string;
  turni?: any;
  fotoUrl?: string;
}

export default function GestioneDipendenti() {
  const [activeTab, setActiveTab] = useState<'elenco' | 'turni'>('elenco');
  const [dipendenti, setDipendenti] = useState<Dipendente[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stati Modal Form
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingData, setEditingData] = useState<Dipendente | null>(null);
  const [formData, setFormData] = useState<Partial<Dipendente>>({
    nome: '',
    cognome: '',
    email: '',
    ruolo: 'dipendente',
    attivo: true
  });
  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Stato Profilo
  const [profileView, setProfileView] = useState<Dipendente | null>(null);

  useEffect(() => {
    caricaDipendenti();
  }, []);

  const caricaDipendenti = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await dipendentiApi.getAll();
      setDipendenti(data);
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento dei dipendenti');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (dipendente?: Dipendente) => {
    if (dipendente) {
      setEditingData(dipendente);
      setFormData({ ...dipendente });
    } else {
      setEditingData(null);
      setFormData({
        nome: '',
        cognome: '',
        email: '',
        ruolo: 'dipendente',
        attivo: true
      });
    }
    setFormError(null);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => setIsModalOpen(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError(null);

    try {
      if (editingData) {
        await dipendentiApi.update(editingData.id, formData);
      } else {
        await dipendentiApi.create(formData);
      }
      setIsModalOpen(false);
      caricaDipendenti();
    } catch (err: any) {
      setFormError(err.message || 'Errore durante il salvataggio.');
    } finally {
      setFormSaving(false);
    }
  };

  const [confirmToggleStatus, setConfirmToggleStatus] = useState<Dipendente | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Dipendente | null>(null);

  const executeToggleStatus = async (dipendente: Dipendente) => {
    try {
      await dipendentiApi.update(dipendente.id, { ...dipendente, attivo: !dipendente.attivo });
      caricaDipendenti();
    } catch (err: any) {
      setFormError(err.message || 'Errore durante il cambio di stato.');
    }
  };

  const executeDelete = async (dipendente: Dipendente) => {
    try {
      await dipendentiApi.delete(dipendente.id);
      caricaDipendenti();
    } catch (err: any) {
      setFormError(err.message || "Errore durante l'eliminazione.");
    }
  };

  if (loading) {
    return <div className="p-6 flex justify-center text-zinc-500 min-h-[50vh] items-center animate-pulse">Caricamento dipendenti in corso...</div>;
  }

  return (
    <div className="flex flex-col h-full w-full pb-24">
      
      {/* Intestazione e Tabs */}
      <div className="w-full px-4 md:px-6 pt-4 md:pt-6">
        <div className="max-w-[1400px] mx-auto w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6 gap-4 sticky top-4 z-40 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md rounded-2xl p-4 border border-zinc-200 dark:border-zinc-800 shadow-sm dark:shadow-xl">
            <div className="w-full">
              <h1 className="text-3xl font-playfair font-bold text-zinc-900 flex items-center gap-3 mb-4">
                <User className="text-fuchsia-500" size={28} />
                Operatori
              </h1>
          <div className="flex gap-6 mt-2">
            <button 
              onClick={() => setActiveTab('elenco')}
              className={`font-medium pb-2 transition-colors border-b-2 ${activeTab === 'elenco' ? 'text-fuchsia-400 border-fuchsia-500' : 'text-zinc-500 border-transparent hover:text-zinc-700'}`}
            >
              Anagrafiche
            </button>
            <button 
              onClick={() => setActiveTab('turni')}
              className={`font-medium pb-2 transition-colors border-b-2 ${activeTab === 'turni' ? 'text-fuchsia-400 border-fuchsia-500' : 'text-zinc-500 border-transparent hover:text-zinc-700'}`}
            >
              Turni e orari
            </button>
          </div>
        </div>
      </div>
    </div>
    </div>
    
    <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 flex-1">

      {error ? (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded mb-6">
          <p>{error}</p>
          <button onClick={caricaDipendenti} className="mt-2 text-sm font-semibold underline">Riprova</button>
        </div>
      ) : (
        <>
          {activeTab === 'elenco' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {dipendenti.map(dip => (
                <div key={dip.id} className={`card bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden flex flex-col transition-opacity ${!dip.attivo ? 'opacity-60' : ''}`}>
                  <div className="p-6 flex-1">
                    <div className="flex justify-between items-start mb-4">
                      {dip.fotoUrl ? (
                         <img src={dip.fotoUrl} alt="Profilo" className="w-12 h-12 rounded-full object-cover shadow-sm" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-12 h-12 bg-fuchsia-500/20 rounded-full flex items-center justify-center text-zinc-900 text-xl font-playfair shadow-sm">
                          {dip.nome.charAt(0)}{dip.cognome.charAt(0)}
                        </div>
                      )}
                      <div className={`px-2 py-1 text-xs font-medium rounded-full ${dip.ruolo === 'admin' ? 'bg-amber-100 text-amber-800' : 'bg-zinc-100 text-zinc-900'} flex items-center gap-1`}>
                        {dip.ruolo === 'admin' && <Shield size={12} />}
                        <span className="capitalize">{dip.ruolo}</span>
                      </div>
                    </div>
                    
                    <h3 className="text-xl font-semibold text-zinc-900">{dip.nome} {dip.cognome}</h3>
                    <p className="text-sm text-zinc-500 mt-1 truncate">{dip.email}</p>
                  </div>

                  <div className="bg-zinc-100/30 px-6 py-4 flex justify-between items-center border-t border-zinc-200">
                    <button
                      onClick={() => setProfileView(dip)}
                      className="flex items-center gap-2 text-sm font-medium text-fuchsia-400 hover:text-fuchsia-300 transition-colors"
                    >
                      <Eye size={16} />
                      Vedi profilo operatore
                    </button>
                  </div>
                </div>
              ))}
              {dipendenti.length === 0 && (
                <div className="col-span-full text-center py-16 text-zinc-500 bg-white rounded-xl border border-dashed border-zinc-200">
                  Nessun dipendente trovato.
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6">
              <TurniCalendario dipendenti={dipendenti} refreshData={caricaDipendenti} />
            </div>
          )}
        </>
      )}

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden animate-in zoom-in-95 fade-in duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-6 border-b border-zinc-200 bg-zinc-100/30">
              <h2 className="text-xl font-playfair text-zinc-900 font-semibold">
                {editingData ? 'Modifica Dipendente' : 'Nuovo operatore'}
              </h2>
              <button 
                onClick={handleCloseModal}
                className="text-zinc-500 hover:text-zinc-900 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6">
              {formError && (
                <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border-l-4 border-red-500 flex items-start gap-2">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-500 mb-1">URL Foto Profilo</label>
                  <input
                    name="fotoUrl"
                    type="url"
                    placeholder="https://example.com/foto.jpg"
                    value={formData.fotoUrl || ''}
                    onChange={handleChange}
                    className="w-full p-2 border border-zinc-200 bg-white text-zinc-900 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-sans"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-500 mb-1">Nome *</label>
                    <input
                      name="nome"
                      type="text"
                      required
                      value={formData.nome}
                      onChange={handleChange}
                      className="w-full p-2 border border-zinc-200 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-500 mb-1">Cognome *</label>
                    <input
                      name="cognome"
                      type="text"
                      required
                      value={formData.cognome}
                      onChange={handleChange}
                      className="w-full p-2 border border-zinc-200 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-500 mb-1">Email *</label>
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full p-2 border border-zinc-200 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-sans"
                    placeholder="nome.cognome@email.com"
                  />
                  <p className="text-xs text-zinc-500 mt-1">Questa email sarà usata per il login su Supabase Auth.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-500 mb-1">Ruolo *</label>
                  <select
                    name="ruolo"
                    value={formData.ruolo}
                    onChange={handleChange}
                    className="w-full p-2 border border-zinc-200 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-sans bg-white"
                  >
                    <option value="dipendente">Dipendente (Vede solo i propri appuntamenti)</option>
                    <option value="admin">Amministratore (Accesso completo e Report)</option>
                  </select>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      name="attivo"
                      type="checkbox"
                      checked={formData.attivo}
                      onChange={handleChange}
                      className="w-4 h-4 text-fuchsia-500 focus:ring-fuchsia-500 border-zinc-200 rounded cursor-pointer"
                    />
                    <span className="text-sm font-medium text-zinc-900">Accesso abilitato</span>
                  </label>
                  <p className="text-xs text-zinc-500 mt-1 ml-6">
                    Se disattivato, il dipendente non potrà più accedere al gestionale o prendere appuntamenti.
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-6 mt-6 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-zinc-900 border border-zinc-200 rounded-md hover:bg-zinc-100 transition-colors"
                  disabled={formSaving}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={formSaving}
                  className="px-6 py-2 text-sm font-medium text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-md transition-colors flex items-center justify-center min-w-[120px]"
                >
                  {formSaving ? (
                    <span className="animate-pulse">Salvataggio...</span>
                  ) : (
                    <span className="flex items-center gap-2"><Check size={16}/> Salva</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Confirm Toggle Status Modal */}
      {confirmToggleStatus && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-zinc-900 mb-2">Conferma operazione</h3>
            <p className="text-zinc-500 text-sm mb-6">
              Vuoi davvero {confirmToggleStatus.attivo ? 'disattivare' : 'attivare'} l'accesso per {confirmToggleStatus.nome}?
            </p>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setConfirmToggleStatus(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
               >
                Annulla
               </button>
               <button 
                onClick={() => {
                  executeToggleStatus(confirmToggleStatus);
                  setConfirmToggleStatus(null);
                }}
                className={`flex-1 px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors ${confirmToggleStatus.attivo ? 'bg-red-600 hover:bg-red-500' : 'bg-green-600 hover:bg-green-500'}`}
               >
                 Conferma
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-zinc-900 mb-2">Conferma eliminazione</h3>
            <p className="text-zinc-500 text-sm mb-6">
              Vuoi davvero eliminare definitivamente il dipendente {confirmDelete.nome} {confirmDelete.cognome}? Questa operazione non può essere annullata.
            </p>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setConfirmDelete(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
               >
                Annulla
               </button>
               <button 
                onClick={() => {
                  executeDelete(confirmDelete);
                  setConfirmDelete(null);
                }}
                className="flex-1 px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors bg-red-600 hover:bg-red-500"
               >
                 Elimina
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Profilo Operatore Modal */}
      {profileView && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-200 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-6 border-b border-zinc-200 bg-zinc-50/50">
              <div className="flex items-center gap-4">
                {profileView.fotoUrl ? (
                  <img src={profileView.fotoUrl} alt="Profilo" className="w-14 h-14 rounded-full object-cover border border-fuchsia-500/30" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-14 h-14 bg-fuchsia-500/20 rounded-full flex items-center justify-center text-zinc-900 text-2xl font-playfair shadow-sm border border-fuchsia-500/30">
                    {profileView.nome.charAt(0)}{profileView.cognome.charAt(0)}
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-playfair text-zinc-900 font-semibold leading-tight">
                    {profileView.nome} {profileView.cognome}
                  </h2>
                  <p className="text-sm text-zinc-500 capitalize">{profileView.ruolo} • {profileView.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => { setProfileView(null); handleOpenModal(profileView); }}
                  className="p-2.5 bg-zinc-100 hover:bg-zinc-200 text-zinc-800 rounded-xl transition-colors shadow-sm border border-zinc-300" 
                  title="Modifica Anagrafica"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => setProfileView(null)}
                  className="p-2.5 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 rounded-xl transition-colors"
                >
                  <X size={24} />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 scrollbar-none space-y-8 bg-zinc-50/30">
              {/* Documenti Operatore */}
              <section>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2">
                    <FileText size={20} className="text-fuchsia-500" /> Documenti
                  </h3>
                </div>

                {/* Prima qui c'erano documenti finti con pulsanti che non
                    facevano nulla. Meglio dire com'è: il caricamento non c'è
                    ancora. */}
                <div className="bg-white border border-dashed border-zinc-300 rounded-xl p-8 flex flex-col items-center justify-center gap-2 text-center">
                  <div className="p-3 bg-zinc-100 rounded-full text-zinc-400">
                    <FileText size={22} />
                  </div>
                  <p className="text-sm font-medium text-zinc-700">Nessun documento</p>
                  <p className="text-xs text-zinc-500 max-w-xs">
                    Il caricamento dei documenti (identità, contratto, attestati) non è ancora attivo.
                  </p>
                </div>
              </section>

              {/* Impostazioni Accesso Rapide */}
              <section>
                <h3 className="text-lg font-semibold text-zinc-900 flex items-center gap-2 mb-4">
                  <Shield size={20} className="text-fuchsia-500" /> Sicurezza e accesso
                </h3>
                <div className="bg-white border border-zinc-200 rounded-xl overflow-hidden divide-y divide-zinc-200">
                  <div className="flex items-center justify-between p-4 bg-zinc-50/50">
                    <div>
                      <h4 className="font-medium text-zinc-800 text-sm">Stato account</h4>
                      <p className="text-xs text-zinc-500 mt-1">Sospendi temporaneamente l'accesso al sistema</p>
                    </div>
                    <button
                      onClick={() => setConfirmToggleStatus(profileView)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${profileView.attivo ? 'bg-red-500/10 text-red-500 border-red-500/20 hover:bg-red-500/20' : 'bg-green-500/10 text-green-500 border-green-500/20 hover:bg-green-500/20'}`}
                    >
                      {profileView.attivo ? 'Disattiva Accesso' : 'Attiva Accesso'}
                    </button>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-zinc-50/50">
                    <div>
                      <h4 className="font-medium text-zinc-800 text-sm">Elimina operatore</h4>
                      <p className="text-xs text-zinc-500 mt-1">Rimuovi definifivamente questo dipendente</p>
                    </div>
                    <button
                      onClick={() => setConfirmDelete(profileView)}
                      className="p-2 bg-zinc-100 text-zinc-500 hover:text-white hover:bg-red-600 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      <FloatingActionBar>
        <button
          onClick={() => handleOpenModal()}
          className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-medium text-sm"
        >
          <div className="bg-white/20 p-1.5 rounded-full">
            <Plus size={16} strokeWidth={2.5} />
          </div>
          <span>Nuovo operatore</span>
        </button>
      </FloatingActionBar>

    </div>
    </div>
  );
}
