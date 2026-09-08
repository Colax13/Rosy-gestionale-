'use client';

import { useState, useEffect } from 'react';
import { KeyRound, Plus, Trash2, Check, AlertCircle, CheckCircle2, Pause, Play, Copy } from 'lucide-react';
import { PAGINE_CONCEDIBILI, PROFILI, ChiavePagina, idSalone, sessioneCorrente } from '@/lib/sessione';
import { elencoMembri, creaAccesso, aggiornaAccesso, revocaAccesso, spiegaErroreAccesso, Membro } from '@/lib/accessi';

interface Props {
  dipendenti: any[];
}

/** Una password che si legge al telefono senza sbagliare. */
function passwordFacile(): string {
  const parole = ['forbice', 'phon', 'spazzola', 'piastra', 'ricci', 'balayage', 'shatush', 'tinta'];
  const parola = parole[Math.floor(Math.random() * parole.length)];
  const numero = String(Math.floor(Math.random() * 9000) + 1000);
  return `${parola}${numero}`;
}

/**
 * Chi può entrare nel programma, e in quali pagine.
 *
 * Ogni operatrice ha il suo accesso: si sa chi ha spostato un appuntamento, e
 * togliendo l'accesso a una non si tocca quello delle altre. I permessi non
 * sono solo un menù più corto: sono scritti anche nelle regole del database,
 * quindi una pagina negata resta negata anche a chi prova a girarci intorno.
 */
export default function AccessiOperatrici({ dipendenti }: Props) {
  const sessione = sessioneCorrente();
  const salonId = idSalone();

  const [membri, setMembri] = useState<Membro[]>([]);
  const [caricamento, setCaricamento] = useState(true);
  const [errore, setErrore] = useState<string | null>(null);

  const [moduloAperto, setModuloAperto] = useState(false);
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(passwordFacile());
  const [idDipendente, setIdDipendente] = useState('');
  const [permessi, setPermessi] = useState<ChiavePagina[]>(['agenda']);
  const [salvataggio, setSalvataggio] = useState(false);
  const [appenaCreato, setAppenaCreato] = useState<{ email: string; password: string } | null>(null);
  const [daRevocare, setDaRevocare] = useState<Membro | null>(null);

  const carica = async () => {
    if (!salonId) return;
    setCaricamento(true);
    try {
      setMembri(await elencoMembri(salonId));
      setErrore(null);
    } catch (e: any) {
      setErrore(spiegaErroreAccesso(e));
    } finally {
      setCaricamento(false);
    }
  };

  useEffect(() => { carica(); }, [salonId]);

  if (sessione && !sessione.titolare) {
    return (
      <div className="bg-white border border-zinc-200 rounded-2xl p-10 text-center">
        <KeyRound className="mx-auto text-zinc-300 mb-3" size={32} />
        <p className="text-zinc-600">Gli accessi li gestisce la titolare.</p>
      </div>
    );
  }

  const cambiaPermesso = (chiave: ChiavePagina) => {
    setPermessi(prev => prev.includes(chiave) ? prev.filter(x => x !== chiave) : [...prev, chiave]);
  };

  const azzeraModulo = () => {
    setNome(''); setEmail(''); setPassword(passwordFacile());
    setIdDipendente(''); setPermessi(['agenda']);
  };

  const crea = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salonId) return;
    setSalvataggio(true);
    setErrore(null);
    try {
      await creaAccesso({
        salonId, nome, email, password, permessi,
        idDipendente: idDipendente || null
      });
      setAppenaCreato({ email: email.trim(), password });
      setModuloAperto(false);
      azzeraModulo();
      carica();
    } catch (err: any) {
      setErrore(spiegaErroreAccesso(err));
    } finally {
      setSalvataggio(false);
    }
  };

  const cambiaPermessiMembro = async (m: Membro, chiave: ChiavePagina) => {
    const nuovi = m.permessi.includes(chiave)
      ? m.permessi.filter(x => x !== chiave)
      : [...m.permessi, chiave];
    setMembri(prev => prev.map(x => x.uid === m.uid ? { ...x, permessi: nuovi } : x));
    try {
      await aggiornaAccesso(m.uid, { permessi: nuovi });
    } catch (e: any) {
      setErrore(spiegaErroreAccesso(e));
      carica();
    }
  };

  const sospendi = async (m: Membro) => {
    setMembri(prev => prev.map(x => x.uid === m.uid ? { ...x, attivo: !m.attivo } : x));
    try {
      await aggiornaAccesso(m.uid, { attivo: !m.attivo });
    } catch (e: any) {
      setErrore(spiegaErroreAccesso(e));
      carica();
    }
  };

  const revoca = async (m: Membro) => {
    setDaRevocare(null);
    try {
      await revocaAccesso(m.uid);
      carica();
    } catch (e: any) {
      setErrore(spiegaErroreAccesso(e));
    }
  };

  return (
    <div className="flex flex-col gap-5 pb-24">
      {errore && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700 flex items-start gap-2">
          <AlertCircle size={18} className="shrink-0 mt-0.5" /> <span>{errore}</span>
        </div>
      )}

      {/* Le credenziali appena create: si vedono una volta sola */}
      {appenaCreato && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <div className="flex items-start gap-2 mb-3">
            <CheckCircle2 size={20} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-zinc-900">Accesso creato</h3>
              <p className="text-sm text-zinc-600 mt-0.5">
                Passale queste due righe. La password non si può più rileggere: se si perde, se ne fa una nuova.
              </p>
            </div>
          </div>
          <div className="bg-white border border-emerald-200 rounded-xl p-4 font-mono text-sm flex flex-wrap items-center justify-between gap-3">
            <div>
              <div><span className="text-zinc-500">indirizzo:</span> {appenaCreato.email}</div>
              <div><span className="text-zinc-500">password:</span> {appenaCreato.password}</div>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(`Indirizzo: ${appenaCreato.email}\nPassword: ${appenaCreato.password}`)}
              className="px-3 py-2 text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 rounded-lg flex items-center gap-1.5 font-sans"
            >
              <Copy size={14} /> Copia
            </button>
          </div>
          <button
            onClick={() => setAppenaCreato(null)}
            className="mt-3 text-sm font-semibold text-zinc-600 hover:text-zinc-900 underline underline-offset-2"
          >
            Ho finito, nascondi
          </button>
        </div>
      )}

      {/* Chi ha l'accesso */}
      <div className="bg-white border border-zinc-200 rounded-2xl overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-semibold text-zinc-900">Chi può entrare</h3>
            <p className="text-xs text-zinc-500 mt-0.5">
              Ognuna con il suo accesso: si sa chi ha fatto cosa, e togliendone uno non si tocca quello delle altre.
            </p>
          </div>
          <button
            onClick={() => { setModuloAperto(true); setAppenaCreato(null); }}
            className="px-4 py-2 text-sm font-bold text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-lg transition-colors flex items-center gap-1.5"
          >
            <Plus size={16} /> Dai l'accesso
          </button>
        </div>

        {caricamento ? (
          <div className="py-10 text-center text-zinc-500 text-sm">Carico…</div>
        ) : membri.length === 0 ? (
          <div className="py-10 px-6 text-center text-zinc-500 text-sm">
            Per ora entri solo tu. Dai l'accesso a un'operatrice per farla lavorare dal suo telefono.
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {membri.map(m => (
              <div key={m.uid} className="px-5 py-4">
                <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-zinc-900">{m.nome}</span>
                      {!m.attivo && (
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-amber-700 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                          sospeso
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-zinc-500 font-mono truncate">{m.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => sospendi(m)}
                      title={m.attivo ? "Sospendi l'accesso" : "Riattiva l'accesso"}
                      className="p-2 text-zinc-500 hover:text-zinc-900 hover:bg-zinc-100 rounded-lg transition-colors"
                    >
                      {m.attivo ? <Pause size={16} /> : <Play size={16} />}
                    </button>
                    <button
                      onClick={() => setDaRevocare(m)}
                      title="Togli l'accesso"
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {PAGINE_CONCEDIBILI.map(pagina => {
                    const dato = m.permessi.includes(pagina.chiave as ChiavePagina);
                    return (
                      <button
                        key={pagina.chiave}
                        onClick={() => cambiaPermessiMembro(m, pagina.chiave as ChiavePagina)}
                        className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors ${
                          dato
                            ? 'bg-fuchsia-50 border-fuchsia-300 text-fuchsia-700'
                            : 'bg-white border-zinc-200 text-zinc-400 hover:border-zinc-300'
                        }`}
                      >
                        {dato && <Check size={11} className="inline mr-1 -mt-0.5" />}
                        {pagina.etichetta}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Nuovo accesso */}
      {moduloAperto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-zinc-200 shrink-0">
              <h2 className="text-lg font-playfair font-semibold text-zinc-900">Dai l'accesso a un'operatrice</h2>
            </div>

            <form onSubmit={crea} className="flex flex-col min-h-0 flex-1">
              <div className="p-6 overflow-y-auto flex-1 min-h-0 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-1">Nome *</label>
                  <input
                    required value={nome} onChange={e => setNome(e.target.value)}
                    placeholder="Giulia"
                    className="w-full p-2.5 border border-zinc-300 bg-zinc-50/50 text-zinc-900 rounded-lg outline-none focus:border-fuchsia-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-1">Indirizzo per entrare *</label>
                  <input
                    required type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="giulia@salone.it"
                    className="w-full p-2.5 border border-zinc-300 bg-zinc-50/50 text-zinc-900 rounded-lg outline-none focus:border-fuchsia-500"
                  />
                  <p className="text-xs text-zinc-500 mt-1">
                    Va bene la sua email personale. Non le arriva niente: serve solo per entrare.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-1">Password *</label>
                  <div className="flex gap-2">
                    <input
                      required minLength={6} value={password} onChange={e => setPassword(e.target.value)}
                      className="flex-1 p-2.5 border border-zinc-300 bg-zinc-50/50 text-zinc-900 rounded-lg outline-none focus:border-fuchsia-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setPassword(passwordFacile())}
                      className="px-3 rounded-lg bg-zinc-100 hover:bg-zinc-200 text-zinc-600 text-xs font-medium whitespace-nowrap"
                    >
                      Un'altra
                    </button>
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">Gliela detti tu. Potrà cambiarla più avanti.</p>
                </div>

                {dipendenti.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-600 mb-1">A quale operatrice corrisponde</label>
                    <select
                      value={idDipendente} onChange={e => setIdDipendente(e.target.value)}
                      className="w-full p-2.5 border border-zinc-300 bg-zinc-50/50 text-zinc-900 rounded-lg outline-none focus:border-fuchsia-500"
                    >
                      <option value="">— nessuna in particolare —</option>
                      {dipendenti.map(d => (
                        <option key={d.id} value={d.id}>{d.nome} {d.cognome}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-zinc-600 mb-2">Che cosa può aprire</label>

                  <div className="flex flex-wrap gap-2 mb-3">
                    {PROFILI.map(profilo => (
                      <button
                        key={profilo.nome}
                        type="button"
                        onClick={() => setPermessi(profilo.permessi)}
                        title={profilo.descrizione}
                        className="px-3 py-1.5 rounded-full text-xs font-semibold bg-zinc-100 hover:bg-zinc-200 text-zinc-700 transition-colors"
                      >
                        {profilo.nome}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    {PAGINE_CONCEDIBILI.map(pagina => {
                      const dato = permessi.includes(pagina.chiave as ChiavePagina);
                      return (
                        <label key={pagina.chiave} className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-50 cursor-pointer">
                          <span className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${dato ? 'bg-fuchsia-600 border-fuchsia-600 text-white' : 'border-zinc-300 bg-white'}`}>
                            {dato && <Check size={13} strokeWidth={3} />}
                          </span>
                          <input type="checkbox" className="sr-only" checked={dato} onChange={() => cambiaPermesso(pagina.chiave as ChiavePagina)} />
                          <span className="text-sm text-zinc-800">{pagina.etichetta}</span>
                        </label>
                      );
                    })}
                  </div>

                  <p className="text-xs text-zinc-500 mt-2">
                    Le impostazioni del salone restano solo tue: non si possono concedere.
                  </p>
                </div>
              </div>

              <div className="shrink-0 flex justify-end gap-3 p-6 border-t border-zinc-200 bg-zinc-50/60">
                <button
                  type="button"
                  onClick={() => { setModuloAperto(false); azzeraModulo(); }}
                  className="px-5 py-2.5 font-medium text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={salvataggio || permessi.length === 0}
                  className="px-5 py-2.5 font-bold text-white bg-fuchsia-600 hover:bg-fuchsia-500 rounded-xl transition-colors disabled:opacity-60"
                >
                  {salvataggio ? 'Creo…' : "Crea l'accesso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Conferma revoca */}
      {daRevocare && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center flex flex-col gap-3">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
              <Trash2 size={22} />
            </div>
            <h3 className="text-lg font-bold text-zinc-900 font-playfair">Togli l'accesso a {daRevocare.nome}?</h3>
            <p className="text-zinc-600 text-sm leading-relaxed">
              Da subito non vedrà più niente del salone. Gli appuntamenti che ha fissato restano dove sono.
            </p>
            <div className="flex flex-col gap-2 mt-2">
              <button
                onClick={() => revoca(daRevocare)}
                className="w-full px-4 py-2.5 font-bold text-white bg-red-600 hover:bg-red-500 rounded-xl transition-colors"
              >
                Sì, togli l'accesso
              </button>
              <button
                onClick={() => setDaRevocare(null)}
                className="w-full px-4 py-2.5 font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 rounded-xl transition-colors"
              >
                No, lascia
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
