'use client';

import FloatingActionBar from '@/components/FloatingActionBar';
import { useState, useEffect, Fragment } from 'react';
import { catalogoApi } from '@/lib/api-client';
import { aNumero, aTesto } from '@/lib/numeri';
import { Plus, Edit2, Trash2, X, Scissors, Clock, Check, AlertCircle, FolderPlus } from 'lucide-react';

interface Servizio {
  id: string;
  nome: string;
  prezzo_base: number;
  durata_minuti: number;
  tempo_lavorazione_minuti?: number;
  tempo_posa_minuti?: number;
  tempo_finitura_minuti?: number;
  categoria: string;
  attivo: boolean;
  note_private?: string;
  note_pubbliche?: string;
}

// Il modulo tiene i numeri come testo; si convertono solo al salvataggio.
interface ModuloServizio {
  nome: string;
  prezzo_base: string;
  tempo_lavorazione_minuti: string;
  tempo_posa_minuti: string;
  tempo_finitura_minuti: string;
  categoria: string;
  attivo: boolean;
  note_private?: string;
  note_pubbliche?: string;
}

export default function GestioneCatalogo() {
  const [servizi, setServizi] = useState<Servizio[]>([]);
  const [categorie, setCategorie] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Stati per il modale Form Servizio
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Servizio | null>(null);
  // I campi numerici stanno qui come testo: vedi lib/numeri.ts.
  const moduloVuoto = (categoria: string): ModuloServizio => ({
    nome: '',
    prezzo_base: '',
    tempo_lavorazione_minuti: '',
    tempo_posa_minuti: '',
    tempo_finitura_minuti: '',
    categoria,
    attivo: true,
    note_private: '',
    note_pubbliche: ''
  });

  const [formData, setFormData] = useState<ModuloServizio>(moduloVuoto('Generico'));

  // Durata totale: si ricalcola sempre dai tre tempi, non si scrive a mano.
  const durataTotaleModulo =
    aNumero(formData.tempo_lavorazione_minuti) +
    aNumero(formData.tempo_posa_minuti) +
    aNumero(formData.tempo_finitura_minuti);
  
  // Stati per il modale Categoria
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [editingCategoria, setEditingCategoria] = useState<string | null>(null);
  const [catNameStr, setCatNameStr] = useState('');

  const [formSaving, setFormSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    caricaDati();
  }, []);

  const caricaDati = async () => {
    setLoading(true);
    setError(null);
    try {
      const [dataServizi, dataCategorie] = await Promise.all([
        catalogoApi.getAll(),
        catalogoApi.getCategorie()
      ]);
      setServizi(dataServizi);
      setCategorie(dataCategorie);
    } catch (err: any) {
      setError(err.message || 'Errore nel caricamento del catalogo');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (cat?: string, servizio?: Servizio) => {
    if (servizio) {
      setEditingService(servizio);
      setFormData({
        nome: servizio.nome || '',
        prezzo_base: aTesto(servizio.prezzo_base),
        tempo_lavorazione_minuti: aTesto(servizio.tempo_lavorazione_minuti ?? servizio.durata_minuti),
        tempo_posa_minuti: aTesto(servizio.tempo_posa_minuti),
        tempo_finitura_minuti: aTesto(servizio.tempo_finitura_minuti),
        categoria: servizio.categoria || '',
        attivo: servizio.attivo !== false,
        note_private: servizio.note_private || '',
        note_pubbliche: servizio.note_pubbliche || ''
      });
    } else {
      setEditingService(null);
      setFormData(moduloVuoto(cat || categorie[0] || 'Taglio'));
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
      // Si tiene quello che è stato scritto, così il campo può restare vuoto.
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSaving(true);
    setFormError(null);

    try {
      // Ensure category is added if new
      if (formData.categoria && !categorie.includes(formData.categoria)) {
        await catalogoApi.createCategoria(formData.categoria);
      }
      
      const lavorazione = aNumero(formData.tempo_lavorazione_minuti);
      if (lavorazione <= 0) {
        setFormError('La lavorazione deve durare almeno qualche minuto.');
        return;
      }

      const daSalvare = {
        nome: formData.nome.trim(),
        categoria: formData.categoria.trim(),
        attivo: formData.attivo,
        note_private: formData.note_private || '',
        note_pubbliche: formData.note_pubbliche || '',
        prezzo_base: aNumero(formData.prezzo_base),
        tempo_lavorazione_minuti: lavorazione,
        tempo_posa_minuti: aNumero(formData.tempo_posa_minuti),
        tempo_finitura_minuti: aNumero(formData.tempo_finitura_minuti),
        durata_minuti: durataTotaleModulo
      };

      if (editingService) {
        await catalogoApi.update(editingService.id, daSalvare);
      } else {
        await catalogoApi.create(daSalvare);
      }
      setIsModalOpen(false);
      caricaDati();
    } catch (err: any) {
      setFormError(err.message || 'Errore durante il salvataggio.');
    } finally {
      setFormSaving(false);
    }
  };

  const [deleteConfirmDialog, setDeleteConfirmDialog] = useState<{ tipo: 'servizio' | 'categoria', id: string, nome: string } | null>(null);

  const executeDeleteServizio = async (id: string) => {
    try {
      await catalogoApi.delete(id);
      caricaDati();
    } catch (err: any) {
      setFormError(err.message || 'Errore durante l\'eliminazione');
    }
  };

  const handleOpenCatModal = (cat?: string) => {
    setEditingCategoria(cat || null);
    setCatNameStr(cat || '');
    setFormError(null);
    setIsCatModalOpen(true);
  };

  const handleSaveCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catNameStr.trim()) return;
    setFormSaving(true);
    try {
      if (editingCategoria) {
         await catalogoApi.updateCategoria(editingCategoria, catNameStr.trim());
      } else {
         await catalogoApi.createCategoria(catNameStr.trim());
      }
      setIsCatModalOpen(false);
      caricaDati();
    } catch (err: any) {
      setFormError(err.message || 'Errore');
    } finally {
      setFormSaving(false);
    }
  };

  const executeDeleteCategoria = async (nome: string) => {
    try {
      await catalogoApi.deleteCategoria(nome);
      caricaDati();
    } catch (err: any) {
      setFormError(err.message || 'Errore durante l\'eliminazione');
    }
  };

  if (loading) {
    return <div className="p-6 flex justify-center items-center min-h-[50vh] text-zinc-500 animate-pulse">Caricamento catalogo in corso...</div>;
  }

  return (
    <div className="flex flex-col h-full w-full pb-24">
      
      {/* Intestazione */}
      <div className="w-full px-4 md:px-6 pt-4 md:pt-6">
        <div className="max-w-[1400px] mx-auto w-full">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4 sticky top-4 z-40 bg-white/80 backdrop-blur-md rounded-2xl p-4 border border-zinc-200 shadow-sm ">
            <div>
              <h1 className="text-3xl font-playfair font-bold text-zinc-900 flex items-center gap-3">
                <Scissors className="text-fuchsia-500" size={28} />
                Servizi
              </h1>
              <p className="text-zinc-500 mt-1 text-sm">Gestione dei servizi offerti, divisi per categoria.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1400px] mx-auto px-4 md:px-6 flex-1">
        {error ? (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 text-red-700 rounded mb-6">
          <p>{error}</p>
          <button onClick={caricaDati} className="mt-2 text-sm font-semibold underline">Riprova</button>
        </div>
      ) : (
        <div className="space-y-8">
          {categorie.length === 0 && (
             <div className="text-center py-16 text-zinc-500 bg-white rounded-xl border border-dashed border-zinc-200">
               Nessuna categoria nel catalogo.
             </div>
          )}

          {categorie.map(cat => (
            <div key={cat}>
               <div className="flex items-center justify-between mb-3 border-b border-zinc-200 pb-2">
                 <h2 className="text-xl font-playfair text-zinc-900 font-semibold">{cat}</h2>
                 <div className="flex items-center gap-2">
                   <button 
                     onClick={() => handleOpenModal(cat)}
                     className="px-3 py-1 flex items-center gap-1.5 text-xs font-medium bg-zinc-100 hover:bg-zinc-200 text-zinc-700 rounded transition-colors"
                   >
                     <Plus size={14}/> Servizio
                   </button>
                   <button 
                     onClick={() => handleOpenCatModal(cat)}
                     className="p-1.5 text-zinc-500 hover:text-zinc-700 transition-colors"
                     title="Rinomina categoria"
                   >
                     <Edit2 size={14}/>
                   </button>
                   <button 
                     onClick={() => setDeleteConfirmDialog({ tipo: 'categoria', id: cat, nome: cat })}
                     className="p-1.5 text-zinc-500 hover:text-red-500 transition-colors"
                     title="Elimina categoria"
                   >
                     <Trash2 size={14}/>
                   </button>
                 </div>
               </div>
               
               <div className="bg-white rounded-xl shadow-sm border border-zinc-200 overflow-hidden">
                 <table className="w-full text-left border-collapse">
                   <thead>
                     <tr className="bg-zinc-100/40 border-b border-zinc-200 text-zinc-500 text-xs font-semibold uppercase tracking-wider">
                       <th className="py-2.5 px-5">Nome servizio</th>
                       <th className="py-2.5 px-5 text-center">Durata</th>
                       <th className="py-2.5 px-5 text-right">Prezzo</th>
                       <th className="py-2.5 px-5 text-center">Stato</th>
                       <th className="py-2.5 px-5 text-right">Azioni</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-zinc-200">
                     {servizi.filter(s => s.categoria === cat).map(servizio => (
                       <tr key={servizio.id} className={`hover:bg-zinc-100/20 transition-colors ${!servizio.attivo ? 'opacity-50' : ''}`}>
                         <td className="py-3 px-5 text-zinc-900 font-medium text-sm">
                           {servizio.nome}
                         </td>
                         <td className="py-3 px-5 text-center text-zinc-500 text-sm">
                           <div className="flex flex-col items-center justify-center">
                             <div className="flex items-center gap-1 text-zinc-700">
                               <Clock size={13} />
                               {servizio.durata_minuti} min
                             </div>
                             <div className="text-[10px] text-zinc-500 mt-0.5">
                               L:{servizio.tempo_lavorazione_minuti || servizio.durata_minuti}m / P:{servizio.tempo_posa_minuti || 0}m / F:{servizio.tempo_finitura_minuti || 0}m
                             </div>
                           </div>
                         </td>
                         <td className="py-3 px-5 text-right text-zinc-900 font-medium text-sm">
                           €{servizio.prezzo_base.toFixed(2)}
                         </td>
                         <td className="py-3 px-5 text-center">
                           {servizio.attivo ? (
                             <span className="px-2 py-0.5 bg-green-500/10 text-green-400 text-[10px] uppercase font-bold rounded-full tracking-wider">Attivo</span>
                           ) : (
                             <span className="px-2 py-0.5 bg-zinc-500/10 text-zinc-500 text-[10px] uppercase font-bold rounded-full tracking-wider">Inattivo</span>
                           )}
                         </td>
                         <td className="py-3 px-5 text-right">
                           <div className="flex items-center justify-end gap-1">
                             <button 
                               onClick={() => handleOpenModal(cat, servizio)}
                               className="p-1.5 text-zinc-500 hover:text-zinc-900 rounded-lg hover:bg-zinc-100 transition-colors"
                               title="Modifica"
                             >
                               <Edit2 size={15} />
                             </button>
                             <button 
                               onClick={() => setDeleteConfirmDialog({ tipo: 'servizio', id: servizio.id, nome: servizio.nome })}
                               className="p-1.5 text-zinc-500 hover:text-red-500 rounded-lg hover:bg-red-500/10 transition-colors"
                               title="Elimina"
                             >
                               <Trash2 size={15} />
                             </button>
                           </div>
                         </td>
                       </tr>
                     ))}
                     {servizi.filter(s => s.categoria === cat).length === 0 && (
                       <tr>
                         <td colSpan={5} className="text-center py-8 text-zinc-500 text-sm italic border-t border-zinc-200 border-dashed">
                           Nessun servizio in questa categoria.
                         </td>
                       </tr>
                     )}
                   </tbody>
                 </table>
               </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Form Categoria */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 p-4 transition-opacity">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm overflow-hidden animate-in zoom-in-95 fade-in duration-200 border border-zinc-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-5 border-b border-zinc-200 bg-zinc-100/30">
              <h2 className="text-lg font-playfair text-zinc-900 font-semibold">
                {editingCategoria ? 'Rinomina Categoria' : 'Nuova categoria'}
              </h2>
              <button 
                onClick={() => setIsCatModalOpen(false)}
                className="text-zinc-500 hover:text-zinc-900 transition-colors p-1"
              >
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSaveCategoria} className="p-5">
               {formError && (
                 <div className="mb-4 p-2.5 bg-red-500/10 text-red-500 text-sm rounded-md border border-red-500/20 flex items-start gap-2">
                   <AlertCircle size={16} className="shrink-0 mt-0.5" />
                   <span>{formError}</span>
                 </div>
               )}
               <div>
                  <label className="block text-sm font-medium text-zinc-500 mb-1">Nome categoria *</label>
                  <input
                    type="text"
                    required
                    value={catNameStr}
                    onChange={(e) => setCatNameStr(e.target.value)}
                    className="w-full p-2 border border-zinc-300 bg-zinc-50/50 text-zinc-900 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-sans"
                    placeholder="Es. Trattamenti Viso"
                  />
               </div>
               <div className="flex justify-end gap-3 pt-5 mt-5 border-t border-zinc-200">
                 <button
                   type="button"
                   onClick={() => setIsCatModalOpen(false)}
                   className="px-4 py-1.5 text-sm font-medium text-zinc-700 border border-zinc-300 rounded-md hover:bg-zinc-100 transition-colors"
                   disabled={formSaving}
                 >
                   Annulla
                 </button>
                 <button
                   type="submit"
                   disabled={formSaving}
                   className="px-5 py-1.5 text-sm font-medium text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-md transition-colors flex items-center justify-center min-w-[100px]"
                 >
                   {formSaving ? 'Salvataggio...' : <><Check size={16} className="mr-1"/> Salva</>}
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Form Servizio */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 transition-opacity">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-lg overflow-hidden animate-in zoom-in-95 fade-in duration-200 border border-zinc-200 max-h-[90vh] flex flex-col">
            <div className="shrink-0 flex justify-between items-center p-6 border-b border-zinc-200 bg-zinc-100/30">
              <h2 className="text-xl font-playfair text-zinc-900 font-semibold">
                {editingService ? 'Modifica servizio' : 'Nuovo servizio'}
              </h2>
              <button 
                onClick={handleCloseModal}
                className="text-zinc-500 hover:text-zinc-900 transition-colors p-1"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col min-h-0 flex-1">
              <div className="p-6 overflow-y-auto flex-1 min-h-0">
              {formError && (
                <div className="mb-4 p-3 bg-red-500/10 text-red-500 text-sm rounded-md border border-red-500/20 flex items-start gap-2">
                  <AlertCircle size={18} className="shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-500 mb-1">Nome servizio *</label>
                  <input
                    name="nome"
                    type="text"
                    required
                    value={formData.nome}
                    onChange={handleChange}
                    className="w-full p-2 border border-zinc-300 bg-zinc-50/50 text-zinc-900 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-sans"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-500 mb-1">Prezzo base (€) *</label>
                    <input
                      name="prezzo_base"
                      type="number"
                      step="0.01"
                      min="0"
                      inputMode="decimal"
                      placeholder="0,00"
                      value={formData.prezzo_base}
                      onChange={handleChange}
                      className="w-full p-2 border border-zinc-300 bg-zinc-50/50 text-zinc-900 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-500 mb-1">Durata totale (min)</label>
                    <div className="w-full p-2 h-[42px] border border-zinc-200 bg-zinc-50/30 text-zinc-500 rounded-md font-sans flex items-center cursor-not-allowed">
                      {durataTotaleModulo} min
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 mb-1 leading-tight">Lavorazione (min) *</label>
                    <input
                      name="tempo_lavorazione_minuti"
                      type="number"
                      step="5"
                      min="0"
                      inputMode="numeric"
                      placeholder="30"
                      value={formData.tempo_lavorazione_minuti}
                      onChange={handleChange}
                      className="w-full p-2 border border-zinc-300 bg-zinc-50/50 text-zinc-900 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 mb-1 leading-tight">Posa (min) *</label>
                    <input
                      name="tempo_posa_minuti"
                      type="number"
                      step="5"
                      min="0"
                      inputMode="numeric"
                      placeholder="0"
                      value={formData.tempo_posa_minuti}
                      onChange={handleChange}
                      className="w-full p-2 border border-zinc-300 bg-zinc-50/50 text-zinc-900 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-zinc-500 mb-1 leading-tight">Finitura (min) *</label>
                    <input
                      name="tempo_finitura_minuti"
                      type="number"
                      step="5"
                      min="0"
                      inputMode="numeric"
                      placeholder="0"
                      value={formData.tempo_finitura_minuti}
                      onChange={handleChange}
                      className="w-full p-2 border border-zinc-300 bg-zinc-50/50 text-zinc-900 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-sans"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-500 mb-1">Categoria *</label>
                  <input
                    name="categoria"
                    type="text"
                    required
                    list="categorie-list"
                    value={formData.categoria}
                    onChange={handleChange}
                    className="w-full p-2 border border-zinc-300 bg-zinc-50/50 text-zinc-900 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-sans"
                    placeholder="Es. Taglio, Colore, Piega..."
                  />
                  <datalist id="categorie-list">
                    {categorie.map(c => <option key={c} value={c} />)}
                  </datalist>
                </div>

                <div className="pt-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      name="attivo"
                      type="checkbox"
                      checked={formData.attivo}
                      onChange={handleChange}
                      className="w-4 h-4 text-fuchsia-500 focus:ring-fuchsia-500 border-zinc-300 rounded cursor-pointer bg-white"
                    />
                    <span className="text-sm font-medium text-zinc-900">Servizio attivo nel catalogo</span>
                  </label>
                  <p className="text-xs text-zinc-500 mt-1 ml-6">
                    Se disattivato, non apparirà in fase di creazione di un nuovo appuntamento.
                  </p>
                </div>

                <div className="pt-2 border-t border-zinc-200">
                  <label className="block text-sm font-medium text-zinc-500 mb-1">Note private (solo per te)</label>
                  <textarea
                    name="note_private"
                    value={formData.note_private || ''}
                    // @ts-ignore
                    onChange={handleChange}
                    className="w-full p-2 border border-zinc-300 bg-zinc-50/50 text-zinc-900 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-sans text-sm h-16 resize-y"
                    placeholder="Es. Costo materiale fornitore, margini, ecc."
                  />
                  <p className="text-xs text-zinc-500 mt-1">Queste note non saranno mai visibili ai clienti.</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-500 mb-1">Avvisi pubblici (visibili alla cliente)</label>
                  <textarea
                    name="note_pubbliche"
                    value={formData.note_pubbliche || ''}
                    // @ts-ignore
                    onChange={handleChange}
                    className="w-full p-2 border border-blue-900/30 bg-blue-950/20 text-zinc-900 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-sans text-sm h-16 resize-y"
                    placeholder="Es. Il prezzo è variabile in base al fornitore..."
                  />
                  <p className="text-xs text-zinc-500 mt-1">Messaggio mostrato al cliente in fase di prenotazione pubblica per questo specifico servizio.</p>
                </div>
              </div>

              </div>

              {/* Pulsanti sempre visibili: prima stavano in fondo al modulo e
                  su schermi normali finivano fuori dalla finestra. */}
              <div className="shrink-0 flex justify-end gap-3 p-6 border-t border-zinc-200 bg-white">
                <button
                  type="button"
                  onClick={handleCloseModal}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 border border-zinc-300 rounded-md hover:bg-zinc-100 transition-colors"
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
      {/* Delete Confirmation Dialog */}
      {deleteConfirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white border border-zinc-200 rounded-2xl w-full max-w-sm shadow-2xl p-6 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-semibold text-zinc-900 mb-2">Conferma eliminazione</h3>
            <p className="text-zinc-500 text-sm mb-6">
              {deleteConfirmDialog.tipo === 'categoria' 
                ? `Eliminando la categoria "${deleteConfirmDialog.nome}", eliminerai anche tutti i servizi inclusi. Questa azione è irreversibile. Procedere?` 
                : `Sicuro di voler eliminare il servizio "${deleteConfirmDialog.nome}"?`}
            </p>
            <div className="flex gap-3 mt-6">
              <button 
                onClick={() => setDeleteConfirmDialog(null)}
                className="flex-1 px-4 py-2 text-sm font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-lg transition-colors"
              >
                Annulla
              </button>
              <button 
                onClick={() => {
                  if (deleteConfirmDialog.tipo === 'categoria') {
                    executeDeleteCategoria(deleteConfirmDialog.id);
                  } else {
                    executeDeleteServizio(deleteConfirmDialog.id);
                  }
                  setDeleteConfirmDialog(null);
                }}
                className="flex-1 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-500 rounded-lg transition-colors font-semibold"
              >
                Elimina
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Action Bar */}
      <FloatingActionBar>
        <button 
          onClick={() => handleOpenCatModal()}
          className="flex items-center gap-2 bg-zinc-100 hover:bg-zinc-200 text-zinc-900 rounded-full px-5 py-2.5 transition-colors text-sm font-medium"
        >
          <FolderPlus size={16} />
          Nuova categoria
        </button>
        
        <button
          onClick={() => handleOpenModal()}
          className="bg-fuchsia-600 hover:bg-fuchsia-500 text-white shadow-lg transition-transform hover:-translate-y-0.5 active:translate-y-0 flex items-center justify-center gap-2 px-6 py-2.5 rounded-full font-medium text-sm"
        >
          <div className="bg-white/20 p-1 rounded-full">
            <Plus size={16} strokeWidth={2.5} />
          </div>
          <span>Nuovo servizio</span>
        </button>
      </FloatingActionBar>

    </div>
    </div>
  );
}
