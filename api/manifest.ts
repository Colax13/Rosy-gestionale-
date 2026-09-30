// GET /api/manifest?salone=… — la "carta d'identità" della web app di un salone.
//
// Quando una cliente aggiunge la pagina di prenotazione alla schermata Home,
// il telefono legge questo file per sapere come chiamare l'icona e che cosa
// aprire toccandola. Dev'essere per salone: con un manifest solo, l'icona di
// RD Salon aprirebbe il gestionale invece della sua pagina di prenotazione.

import { database } from './_firebase';

interface Richiesta { url?: string; query?: Record<string, string | string[]> }
interface Risposta {
  status(codice: number): Risposta;
  json(corpo: unknown): void;
  setHeader(nome: string, valore: string): void;
}

const idValido = (v: any) => typeof v === 'string' && /^[A-Za-z0-9_-]{1,128}$/.test(v);

export default async function handler(req: Richiesta, res: Risposta) {
  const grezzo = req.query?.salone ?? new URL(req.url || '/', 'http://x').searchParams.get('salone');
  const salonId = Array.isArray(grezzo) ? grezzo[0] : grezzo;
  if (!idValido(salonId)) { res.status(400).json({ errore: 'Salone non indicato.' }); return; }

  // Il nome del salone. Se il server non lo trova si usa "Prenota": meglio
  // un'icona col nome generico che nessuna icona.
  let nome = '';
  try {
    const scheda = await database().collection('salons').doc(salonId as string).get();
    nome = ((scheda.data() as any)?.salonDetails?.nomeSalone || '').trim();
  } catch {
    // Server senza chiave, o salone che non esiste: si va avanti col generico.
  }

  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.status(200).json({
    id: `/${salonId}/prenota`,
    name: nome ? `${nome} · Prenota` : 'Prenota',
    short_name: (nome || 'Prenota').slice(0, 12),
    description: nome ? `Prenota da ${nome}` : 'Prenota il tuo appuntamento',
    lang: 'it',
    start_url: `/${salonId}/prenota`,
    scope: `/${salonId}/`,
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#fafafa',
    theme_color: '#c026d3',
    icons: [
      { src: '/icone/icona-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icone/icona-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icone/icona-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  });
}
