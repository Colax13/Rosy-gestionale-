import { useState } from 'react';
import { clientiApi } from '../lib/api-client';
import { X } from 'lucide-react';

interface ClienteFormData {
  nome: string;
  cognome: string;
  telefono: string;
  email: string;
  note: string;
  canale_acquisizione: string;
}

interface FormNuovoClienteProps {
  onChiudi: () => void;
  onClienteCreato: () => void;
}

export default function FormNuovoCliente({ onChiudi, onClienteCreato }: FormNuovoClienteProps) {
  const [formData, setFormData] = useState<ClienteFormData>({
    nome: '',
    cognome: '',
    telefono: '',
    email: '',
    note: '',
    canale_acquisizione: 'Instagram'
  });
  const [loading, setLoading] = useState(false);
  const [errore, setErrore] = useState<string | null>(null);

  const [isNuovoCanale, setIsNuovoCanale] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrore(null);

    try {
      if (!formData.nome || !formData.cognome) {
        throw new Error('Nome e cognome sono obbligatori');
      }

      await clientiApi.create(formData);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 transition-opacity">
      <div className="bg-zinc-900 rounded-xl shadow-lg w-full max-w-lg overflow-hidden animate-in zoom-in-95 fade-in duration-200">
        <div className="flex justify-between items-center p-6 border-b border-zinc-800 bg-zinc-800/30">
          <h2 className="text-xl font-playfair text-zinc-100 font-semibold">Nuovo Cliente</h2>
          <button 
            onClick={onChiudi}
            className="text-zinc-400 hover:text-zinc-100 transition-colors p-1"
            aria-label="Chiudi"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {errore && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-md border-l-4 border-red-500">
              {errore}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="nome" className="block text-sm font-medium text-zinc-400 mb-1">Nome *</label>
              <input
                id="nome"
                name="nome"
                type="text"
                required
                value={formData.nome}
                onChange={handleChange}
                className="w-full p-2 border border-zinc-800 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-sans"
              />
            </div>
            <div>
              <label htmlFor="cognome" className="block text-sm font-medium text-zinc-400 mb-1">Cognome *</label>
              <input
                id="cognome"
                name="cognome"
                type="text"
                required
                value={formData.cognome}
                onChange={handleChange}
                className="w-full p-2 border border-zinc-800 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-sans"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label htmlFor="telefono" className="block text-sm font-medium text-zinc-400 mb-1">Telefono</label>
              <input
                id="telefono"
                name="telefono"
                type="tel"
                value={formData.telefono}
                onChange={handleChange}
                className="w-full p-2 border border-zinc-800 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-sans"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-zinc-400 mb-1">Email</label>
              <input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleChange}
                className="w-full p-2 border border-zinc-800 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-sans"
              />
            </div>
          </div>

          <div className="mb-4">
            <label htmlFor="canale_acquisizione" className="block text-sm font-medium text-zinc-400 mb-1">Canale di Acquisizione</label>
            <div className="flex gap-2">
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
                className="w-full p-2 border border-zinc-800 bg-zinc-950 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-sans text-zinc-100"
              >
                <option value="Instagram">Instagram</option>
                <option value="TikTok">TikTok</option>
                <option value="Facebook">Facebook</option>
                <option value="Google">Google</option>
                <option value="Passaparola">Passaparola</option>
                <option value="Altro">Altro / Passante</option>
                <option value="Nuovo">+ Nuovo Canale</option>
              </select>
            </div>
            {isNuovoCanale && (
               <input 
                 type="text" 
                 placeholder="Scrivi nuovo canale..."
                 className="w-full mt-2 p-2 border border-zinc-800 bg-zinc-950 rounded-md outline-none font-sans text-zinc-100 placeholder-zinc-500 focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500" 
                 onChange={(e) => setFormData(prev => ({ ...prev, canale_acquisizione: e.target.value }))}
               />
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="note" className="block text-sm font-medium text-zinc-400 mb-1">Note (Allergie, preferenze, ecc.)</label>
            <textarea
              id="note"
              name="note"
              rows={3}
              value={formData.note}
              onChange={handleChange}
              className="w-full p-2 border border-zinc-800 rounded-md focus:border-fuchsia-500 focus:ring-1 focus:ring-fuchsia-500 outline-none font-sans resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-zinc-800">
            <button
              type="button"
              onClick={onChiudi}
              className="px-4 py-2 text-sm font-medium text-zinc-100 border border-zinc-800 rounded-md hover:bg-zinc-800 transition-colors"
              disabled={loading}
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm font-medium text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-md transition-colors flex items-center justify-center min-w-[120px]"
            >
              {loading ? (
                <span className="animate-pulse">Salvataggio...</span>
              ) : (
                'Salva Cliente'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
