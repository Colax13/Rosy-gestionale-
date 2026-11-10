// Il riepilogo di oggi (o di ieri, della settimana, del mese) in cima al Report.
//
// Si calcola da solo sugli appuntamenti in agenda: non serve chiudere niente,
// premere niente, scrivere niente. Quello che è stato chiuso con il conto vale
// l'incasso vero; il resto vale il listino ed è segnato con ≈ (stima).

import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Sunrise, Info } from 'lucide-react';
import { riepilogoPeriodo, confiniPeriodo, confiniDomani, clientiNuove, Periodo } from '@/lib/riepilogo';
import { euro } from '@/lib/preconto';
import { nomeOperatore } from '@/lib/operatori';

export interface DatiGiornata {
  appuntamenti: any[];
  catalogo: any[];
  operatrici: { id: string; nome: string; cognome: string }[];
  nascite_clienti: string[];
}

const PERIODI: { chiave: Periodo; etichetta: string; fine: string }[] = [
  { chiave: 'oggi', etichetta: 'Oggi', fine: 'fine giornata' },
  { chiave: 'ieri', etichetta: 'Ieri', fine: 'fine giornata' },
  { chiave: 'settimana', etichetta: 'Settimana', fine: 'fine settimana' },
  { chiave: 'mese', etichetta: 'Mese', fine: 'fine mese' }
];

const giorno = (d: Date) => d.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });
const giornoCorto = (d: Date) => d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' });
const plurale = (n: number, uno: string, tanti: string) => `${n} ${n === 1 ? uno : tanti}`;

export default function RiepilogoPeriodo({ dati }: { dati: DatiGiornata }) {
  const [periodo, setPeriodo] = useState<Periodo>('oggi');

  const { r, nuove, domani, da, a } = useMemo(() => {
    const adesso = new Date();
    const confini = confiniPeriodo(periodo, adesso);
    const nascite = (dati.nascite_clienti || []).map(iso => ({ createdAt: iso }));
    const d = confiniDomani(adesso);
    return {
      ...confini,
      r: riepilogoPeriodo(dati.appuntamenti, dati.catalogo, confini.da, confini.a, adesso, dati.operatrici),
      nuove: clientiNuove(nascite, confini.da, confini.a),
      domani: riepilogoPeriodo(dati.appuntamenti, dati.catalogo, d.da, d.a, adesso, dati.operatrici)
    };
  }, [dati, periodo]);

  const scelto = PERIODI.find(p => p.chiave === periodo)!;
  // Spazi che non vanno a capo: "≈ 170,00 €" resta su una riga anche sul telefono.
  const circa = (n: number, stimato: boolean) => `${stimato ? '≈ ' : ''}${euro(n)}`.replace(/ /g, '\u00a0');
  const quandoE = periodo === 'oggi' || periodo === 'ieri' ? giorno(da) : `${giornoCorto(da)} – ${giornoCorto(a)}`;

  const tessere = [
    {
      etichetta: periodo === 'oggi' ? 'Incasso finora' : 'Incasso',
      valore: circa(r.finora, r.stima > 0),
      accento: true,
      nota: r.stima > 0
        ? `${euro(r.reale)} incassati + ≈ ${euro(r.stima)} stimati`
        : r.chiusi > 0 ? 'Tutto chiuso con il conto' : undefined
    },
    r.daFare > 0
      ? {
          etichetta: `Previsto a ${scelto.fine}`,
          valore: circa(r.totale, true),
          nota: `+ ≈ ${euro(r.previsto)} da ${plurale(r.daFare, 'appuntamento', 'appuntamenti')} ancora da fare`
        }
      : {
          etichetta: 'Chiusi con il conto',
          valore: `${r.chiusi} su ${r.appuntamenti}`,
          nota: r.nonChiusi > 0 ? `${plurale(r.nonChiusi, 'vale', 'valgono')} il listino, come stima` : undefined
        },
    {
      etichetta: 'Appuntamenti',
      valore: String(r.appuntamenti),
      nota: [
        r.daFare > 0 ? `${plurale(r.fatti, 'fatto', 'fatti')} · ${r.daFare} da fare` : '',
        r.annullati ? plurale(r.annullati, 'annullato', 'annullati') : '',
        r.richieste ? `${plurale(r.richieste, 'richiesta', 'richieste')} da confermare` : ''
      ].filter(Boolean).join(' · ') || undefined
    },
    { etichetta: 'Clienti nuove', valore: String(nuove), nota: undefined as string | undefined }
  ];

  return (
    <section className="mb-8" aria-label="Riepilogo">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl font-playfair text-zinc-900">Riepilogo</h2>
          <p className="text-sm text-zinc-500 first-letter:uppercase">{quandoE}</p>
        </div>
        <div className="flex gap-1 bg-white border border-zinc-200 rounded-lg p-1 self-start sm:self-auto" role="tablist" aria-label="Periodo">
          {PERIODI.map(p => (
            <button
              key={p.chiave}
              role="tab"
              aria-selected={periodo === p.chiave}
              onClick={() => setPeriodo(p.chiave)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${periodo === p.chiave ? 'bg-fuchsia-50 text-fuchsia-700' : 'text-zinc-500 hover:bg-zinc-100'}`}
            >
              {p.etichetta}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tessere.map(t => (
          <div key={t.etichetta} className="bg-white border border-zinc-200 rounded-xl p-4 min-w-0">
            <div className="text-[11px] uppercase tracking-wider font-semibold text-zinc-400 mb-1">{t.etichetta}</div>
            <div className={`text-lg sm:text-2xl font-playfair font-bold tabular-nums ${t.accento ? 'text-fuchsia-600' : 'text-zinc-900'}`}>{t.valore}</div>
            {t.nota && <div className="text-[11px] text-zinc-500 mt-1">{t.nota}</div>}
          </div>
        ))}
      </div>

      {r.perOperatrice.length > 0 && (
        <div className="bg-white border border-zinc-200 rounded-xl mt-3 divide-y divide-zinc-100">
          {r.perOperatrice.map(o => {
            const fatto = o.reale + o.stima;
            return (
              <div key={o.id} className="px-4 py-3 flex items-center gap-3">
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-zinc-900 truncate">{nomeOperatore(o)}</div>
                  <div className="text-xs text-zinc-500">
                    {plurale(o.appuntamenti, 'appuntamento', 'appuntamenti')}
                    {o.previsto > 0 ? ` · ancora ≈ ${euro(o.previsto)} da fare` : ''}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="text-sm font-semibold text-zinc-900 tabular-nums">{circa(fatto, o.stima > 0)}</div>
                  {o.stima > 0 && o.reale > 0 && (
                    <div className="text-[11px] text-zinc-500 tabular-nums">{euro(o.reale)} incassati</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {r.appuntamenti === 0 && (
        <div className="bg-white border border-zinc-200 rounded-xl mt-3 p-6 text-center text-sm text-zinc-500">
          Nessun appuntamento {periodo === 'oggi' ? 'oggi' : periodo === 'ieri' ? 'ieri' : 'in questo periodo'}.
        </div>
      )}

      {periodo === 'oggi' && (
        <div className="bg-white border border-zinc-200 rounded-xl mt-3 px-4 py-3 flex items-center gap-3 text-sm">
          <Sunrise size={18} className="text-fuchsia-500 shrink-0" />
          <span className="flex-1 text-zinc-700">
            <strong className="text-zinc-900">Domani:</strong>{' '}
            {domani.appuntamenti === 0
              ? 'nessun appuntamento in agenda.'
              : `${plurale(domani.appuntamenti, 'appuntamento', 'appuntamenti')}, ≈ ${euro(domani.totale)} previsti.`}
            {domani.richieste ? ` ${plurale(domani.richieste, 'richiesta', 'richieste')} da confermare.` : ''}
          </span>
          <Link to="/agenda" className="text-fuchsia-700 font-medium hover:underline shrink-0">Apri l'agenda</Link>
        </div>
      )}

      {(r.stima > 0 || r.previsto > 0 || r.senzaPrezzo > 0) && (
        <p className="text-xs text-zinc-500 mt-3 flex items-start gap-1.5">
          <Info size={13} className="shrink-0 mt-0.5" />
          <span>
            ≈ vuol dire stima: gli appuntamenti non chiusi con «Completa appuntamento» contano al prezzo di listino dei loro servizi.
            Chiudendoli, al posto della stima entra l'incasso vero. Chi non si è presentata va annullata in agenda, altrimenti conta.
            {r.senzaPrezzo > 0 ? ` ${plurale(r.senzaPrezzo, 'appuntamento ha', 'appuntamenti hanno')} servizi che a listino non si trovano: nella stima ${r.senzaPrezzo === 1 ? 'vale' : 'valgono'} zero.` : ''}
          </span>
        </p>
      )}
    </section>
  );
}
