import { useState, useEffect } from 'react';
import { clientiApi } from '../lib/api-client';
import { CAMPI_EXTRA_CLIENTE, schedaVuota } from '../lib/cliente';
import { X, ChevronDown } from 'lucide-react';

interface FormNuovoClienteProps {
  onChiudi: () => void;
  onClienteCreato: () => void;
}

const CANALI = ['Instagram', 'TikTok', 'Facebook', 'Google', 'Passaparola', 'Altro'];

export default function FormNuovoCliente({ onChiudi, onClienteCreato }: FormNuovoClienteProps) {
  const [formData, setFormData] = useState<Record<string, string>>({
    nome: '',
    cognome: '',
    telefono: '',
    email: '',
    note: '',
    canale_acquisizione: 'Instagram',
    ...schedaVuota()
  });
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);
  const [isNuovoCanale, setIsNuovoCanale] = useState(false);

  // Gli altri dati stanno chiusi: chi aggiunge una cliente mentre è al
  // telefono ha bisogno di quattro caselle, non di dieci.
  const [altriAperti, setAltriAperti] = useState(false);

  // Mentre la finestrella è aperta la pagina sotto non si muove: altrimenti sul
  // telefono si scorre quella invece del modulo, e sembra che non scorra niente.
  useEffect(() => {
    const prima = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prima; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrore(null);

    try {
      if (!formData.nome || !formData.cognome) {
        throw new Error('Nome e cognome sono obbligatori');
      }

      // I campi lasciati vuoti non si salvano: meglio una scheda corta che una
      // piena di caselle vuote.
      const daSalvare = Object.fromEntries(
        Object.entries(formData).filter(([, v]) => `${v}`.trim() !== '')
      );

      await clientiApi.create(daSalvare);
      onClienteCreato();
      onChiudi();
    } catch (err: any) {
      setErrore(err.message || 'Si è verificato un errore durante la creazione del cliente.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const classeCampo = 'w-full p-2 border border-zinc-200 bg-white text-zinc-900 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-sans';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity">
      {/* La finestrella è alta al massimo quanto lo schermo, e a scorrere è
          solo la parte centrale: intestazione e bottoni restano dove sono. */}
      <div className="bg-white rounded-xl shadow-lg w-full max-w-lg flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-zinc-200 bg-zinc-100/30 shrink-0">
          <h2 className="text-xl font-playfair text-zinc-900 font-semibold">Nuovo cliente</h2>
          <button
            onClick={onChiudi}
            className="text-zinc-500 hover:text-zinc-900 transition-colors p-1"
            aria-label="Chiudi"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-6">
            {errore && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border-l-4 border-red-500">
                {errore}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="nome" className="block text-sm font-medium text-zinc-500 mb-1">Nome *</label>
                <input id="nome" name="nome" type="text" required value={formData.nome} onChange={handleChange} className={classeCampo} />
              </div>
              <div>
                <label htmlFor="cognome" className="block text-sm font-medium text-zinc-500 mb-1">Cognome *</label>
                <input id="cognome" name="cognome" type="text" required value={formData.cognome} onChange={handleChange} className={classeCampo} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label htmlFor="telefono" className="block text-sm font-medium text-zinc-500 mb-1">Telefono</label>
                <input id="telefono" name="telefono" type="tel" value={formData.telefono} onChange={handleChange} className={classeCampo} />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-zinc-500 mb-1">Email</label>
                <input id="email" name="email" type="email" value={formData.email} onChange={handleChange} className={classeCampo} />
              </div>
            </div>

            <div className="mb-4">
              <label htmlFor="canale_acquisizione" className="block text-sm font-medium text-zinc-500 mb-1">Canale di acquisizione</label>
              <select
                id="canale_acquisizione"
                name="canale_acquisizione"
                value={isNuovoCanale ? 'Nuovo' : formData.canale_acquisizione}
                onChange={(e) => {
                  if (e.target.value !== 'Nuovo') {
                    setIsNuovoCanale(false);
                    setFormData(prev => ({ ...prev, canale_acquisizione: e.target.value }));
                  } else {
                    setIsNuovoCanale(true);
                    setFormData(prev => ({ ...prev, canale_acquisizione: '' }));
                  }
                }}
                className={classeCampo}
              >
                {CANALI.map(c => <option key={c} value={c}>{c === 'Altro' ? 'Altro / Passante' : c}</option>)}
                <option value="Nuovo">+ Nuovo Canale</option>
              </select>
              {isNuovoCanale && (
                <input
                  type="text"
                  placeholder="Scrivi nuovo canale..."
                  className={`${classeCampo} mt-2 placeholder-zinc-500`}
                  onChange={(e) => setFormData(prev => ({ ...prev, canale_acquisizione: e.target.value }))}
                />
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="note" className="block text-sm font-medium text-zinc-500 mb-1">Note (Allergie, preferenze, ecc.)</label>
              <textarea
                id="note"
                name="note"
                rows={3}
                value={formData.note}
                onChange={handleChange}
                className={`${classeCampo} resize-none`}
              />
            </div>

            {/* Altri dati: quelli che arrivano dal vecchio gestionale. Nessuno
                è obbligatorio, si può salvare lasciandoli tutti vuoti. */}
            <div className="border border-zinc-200 rounded-md overflow-hidden">
              <button
                type="button"
                onClick={() => setAltriAperti(!altriAperti)}
                className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                <span>Altri dati <span className="text-zinc-400 font-normal">· facoltativi</span></span>
                <ChevronDown size={16} className={`transition-transform ${altriAperti ? 'rotate-180' : ''}`} />
              </button>

              {altriAperti && (
                <div className="p-4 pt-1 border-t border-zinc-200 grid grid-cols-1 md:grid-cols-2 gap-4">
                  {CAMPI_EXTRA_CLIENTE.map(campo => (
                    <div key={campo.chiave} className={campo.tipo === 'testo' && campo.chiave === 'note_appuntamento' ? 'md:col-span-2' : ''}>
                      <label htmlFor={campo.chiave} className="block text-sm font-medium text-zinc-500 mb-1">{campo.etichetta}</label>
                      {campo.tipo === 'scelta' ? (
                        <select id={campo.chiave} name={campo.chiave} value={formData[campo.chiave] || ''} onChange={handleChange} className={classeCampo}>
                          <option value="">—</option>
                          {(campo.scelte || []).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      ) : (
                        <input
                          id={campo.chiave}
                          name={campo.chiave}
                          type={campo.tipo === 'data' ? 'date' : campo.tipo === 'numero' ? 'number' : 'text'}
                          value={formData[campo.chiave] || ''}
                          onChange={handleChange}
                          className={classeCampo}
                        />
                      )}
                      {campo.aiuto && <p className="text-[11px] text-zinc-400 mt-1 leading-snug">{campo.aiuto}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end gap-3 p-4 border-t border-zinc-200 bg-white shrink-0">
            <button
              type="button"
              onClick={onChiudi}
              className="px-4 py-2 text-sm font-medium text-zinc-900 border border-zinc-200 rounded-md hover:bg-zinc-100 transition-colors"
              disabled={loading}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-md transition-colors flex items-center justify-center min-w-[120px]"
            >
              {loading ? <span className="animate-pulse">Salvataggio...</span> : 'Salva Cliente'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
