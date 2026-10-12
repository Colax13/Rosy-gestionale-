'use client';

// L'informativa privacy del salone, pubblica: la apre il link accanto alla
// spunta nella prenotazione online. Il testo sta in `lib/privacy`, i dati del
// titolare li scrive il salone in Impostazioni.

import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ShieldCheck, Loader2 } from 'lucide-react';
import { db } from '../../../../../../src/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { testoInformativa, DatiTitolare, VERSIONE_INFORMATIVA } from '@/lib/privacy';

export default function InformativaPrivacy() {
  const { salonId = '' } = useParams();
  const [dati, setDati] = useState<DatiTitolare | null>(null);

  useEffect(() => {
    if (!salonId) return;
    getDoc(doc(db, 'salons', salonId))
      .then(snap => setDati(((snap.data() as any)?.salonDetails || {}) as DatiTitolare))
      .catch(() => setDati({}));
  }, [salonId]);

  useEffect(() => {
    document.title = dati?.nomeSalone ? `${dati.nomeSalone} · Informativa privacy` : 'Informativa privacy';
  }, [dati?.nomeSalone]);

  const [anno, mese, giorno] = VERSIONE_INFORMATIVA.split('-');

  return (
    <div className="min-h-[100dvh] bg-zinc-50 text-zinc-900 font-sans">
      <main className="max-w-2xl mx-auto px-4 py-8 sm:py-12">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-11 h-11 rounded-2xl bg-fuchsia-100 text-fuchsia-700 flex items-center justify-center shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div className="min-w-0">
            <h1 className="font-playfair font-bold text-2xl sm:text-3xl leading-tight">Informativa privacy</h1>
            <p className="text-sm text-zinc-500">{dati?.nomeSalone || ' '}</p>
          </div>
        </div>

        {!dati ? (
          <div className="flex items-center gap-2 text-zinc-500 py-10 justify-center">
            <Loader2 className="animate-spin" size={18} /> Carico…
          </div>
        ) : (
          <div className="bg-white border border-zinc-200 rounded-2xl p-5 sm:p-7 space-y-6 shadow-sm">
            <p className="text-sm text-zinc-600 leading-relaxed">
              Ai sensi dell'art. 13 del Regolamento (UE) 2016/679 (GDPR), ti spieghiamo come usiamo i dati che ci lasci quando prenoti.
            </p>
            {testoInformativa(dati).map(sezione => (
              <section key={sezione.titolo}>
                <h2 className="font-semibold text-zinc-900 mb-2">{sezione.titolo}</h2>
                <div className="space-y-2">
                  {sezione.paragrafi.map((p, i) => (
                    <p key={i} className="text-sm text-zinc-700 leading-relaxed break-words">{p}</p>
                  ))}
                </div>
              </section>
            ))}
            <p className="text-xs text-zinc-400 pt-2 border-t border-zinc-100">
              Ultimo aggiornamento: {giorno}/{mese}/{anno}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
