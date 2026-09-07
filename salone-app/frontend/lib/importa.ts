// Lettura dei file di import clienti. Sta qui, fuori dal componente, perché
// è la parte che si può provare da sola: se sbaglia, si importano dati storti.

export type Campo =
  | 'nome' | 'cognome' | 'nome_completo'
  | 'telefono' | 'email' | 'note' | 'canale_acquisizione' | '';

export const CAMPI: { chiave: Campo; etichetta: string }[] = [
  { chiave: '', etichetta: 'Non importare' },
  { chiave: 'nome', etichetta: 'Nome' },
  { chiave: 'cognome', etichetta: 'Cognome' },
  { chiave: 'nome_completo', etichetta: 'Nome e cognome insieme' },
  { chiave: 'telefono', etichetta: 'Telefono' },
  { chiave: 'email', etichetta: 'Email' },
  { chiave: 'note', etichetta: 'Note' },
  { chiave: 'canale_acquisizione', etichetta: 'Come ci ha conosciuto' }
];

/** Come si chiama di solito quella colonna in un foglio fatto in salone. */
const SINONIMI: Record<Exclude<Campo, ''>, string[]> = {
  nome: ['nome', 'name', 'firstname', 'nomecliente'],
  cognome: ['cognome', 'surname', 'lastname', 'cognomecliente'],
  nome_completo: ['nomecompleto', 'nomeecognome', 'cliente', 'nominativo', 'fullname'],
  telefono: ['telefono', 'tel', 'cellulare', 'cell', 'numero', 'phone', 'mobile', 'recapito'],
  email: ['email', 'mail', 'posta', 'indirizzoemail'],
  note: ['note', 'nota', 'appunti', 'notes', 'commenti'],
  canale_acquisizione: ['canale', 'provenienza', 'origine', 'fonte', 'comecihaconosciuto']
};

export const normalizza = (s: any) =>
  (s ?? '').toString().toLowerCase().normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');

export const soloCifre = (s: any) => (s ?? '').toString().replace(/\D/g, '');

/** Legge un CSV gestendo virgolette, virgole e punto e virgola. */
export function leggiCsv(testo: string): string[][] {
  const primaRiga = testo.split('\n')[0] || '';
  const separatore = (primaRiga.match(/;/g) || []).length > (primaRiga.match(/,/g) || []).length ? ';' : ',';

  const righe: string[][] = [];
  let riga: string[] = [];
  let campo = '';
  let traVirgolette = false;

  for (let i = 0; i < testo.length; i++) {
    const c = testo[i];
    if (traVirgolette) {
      if (c === '"') {
        if (testo[i + 1] === '"') { campo += '"'; i++; }
        else traVirgolette = false;
      } else campo += c;
    } else if (c === '"') {
      traVirgolette = true;
    } else if (c === separatore) {
      riga.push(campo); campo = '';
    } else if (c === '\n') {
      riga.push(campo.replace(/\r$/, '')); righe.push(riga); riga = []; campo = '';
    } else {
      campo += c;
    }
  }
  if (campo || riga.length) { riga.push(campo.replace(/\r$/, '')); righe.push(riga); }
  return righe.filter(r => r.some(c => (c || '').trim() !== ''));
}

/** Indovina che cosa contiene ogni colonna guardando l'intestazione. */
export function indoviniMappatura(intestazioni: string[]): Campo[] {
  return intestazioni.map(t => {
    const n = normalizza(t);
    if (!n) return '' as Campo;
    for (const [campo, alias] of Object.entries(SINONIMI)) {
      if (alias.some(a => n === a)) return campo as Campo;
    }
    for (const [campo, alias] of Object.entries(SINONIMI)) {
      if (alias.some(a => a.length > 3 && n.includes(a))) return campo as Campo;
    }
    return '' as Campo;
  });
}

/** Trasforma una riga del foglio in un cliente, secondo la mappatura scelta. */
export function aCliente(riga: any[], mappatura: Campo[]) {
  const c: any = { nome: '', cognome: '', telefono: '', email: '', note: '', canale_acquisizione: '' };
  mappatura.forEach((campo, i) => {
    if (!campo) return;
    const valore = (riga[i] ?? '').toString().trim();
    if (!valore) return;
    if (campo === 'nome_completo') {
      const pezzi = valore.split(/\s+/);
      c.nome = pezzi.shift() || '';
      c.cognome = pezzi.join(' ');
    } else {
      c[campo] = valore;
    }
  });
  return c;
}

/** Chiavi con cui riconoscere un cliente già in anagrafica. */
export function chiaviCliente(c: any): string[] {
  const chiavi: string[] = [];
  const tel = soloCifre(c.telefono);
  if (tel.length >= 6) chiavi.push(`t:${tel}`);
  const nome = normalizza(c.nome), cognome = normalizza(c.cognome);
  if (nome || cognome) chiavi.push(`n:${nome}|${cognome}`);
  return chiavi;
}
