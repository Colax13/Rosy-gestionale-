import { Router, Request, Response } from 'express';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import fs from 'fs';
import path from 'path';
import * as admin from 'firebase-admin';
import { db } from '../../../../src/lib/firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

const router = Router();
let ai: GoogleGenAI;
const getAi = () => {
  if (!ai) {
    ai = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || "missing_key",
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
  }
  return ai;
};

// Auth middleware check
const verifyToken = async (req: Request, res: Response, next: Function) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ reply: 'Non autorizzato: token mancante. Effettua il login.' });
  }
  const token = authHeader.split('Bearer ')[1];
  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    (req as any).user = decodedToken;
    next();
  } catch (error) {
    console.error('Error verifying auth token', error);
    res.status(401).json({ reply: 'Non autorizzato: token non valido. Effettua il login.' });
  }
};

const getAppuntamenti: FunctionDeclaration = {
  name: "getAppuntamenti",
  description: "Restituisce la lista di tutti gli appuntamenti. Utile per capire orari, cliente e operatore assegnato.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      date: { type: Type.STRING, description: "Opzionale. Filtra per data in formato YYYY-MM-DD" }
    }
  }
};

const getClienti: FunctionDeclaration = {
  name: "getClienti",
  description: "Restituisce l'anagrafica di tutti i clienti.",
  parameters: {
    type: Type.OBJECT,
    properties: {}
  }
};

const creaCliente: FunctionDeclaration = {
  name: "creaCliente",
  description: "Crea un nuovo cliente nel database.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      nome: { type: Type.STRING, description: "Nome del cliente" },
      cognome: { type: Type.STRING, description: "Cognome del cliente" },
      telefono: { type: Type.STRING, description: "Numero di telefono" }
    },
    required: ["nome", "cognome"]
  }
};

const creaAppuntamento: FunctionDeclaration = {
  name: "creaAppuntamento",
  description: "Crea un nuovo appuntamento.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      data_ora: { type: Type.STRING, description: "Data e ora prenotazione (es: 2026-06-15T10:00:00Z)" },
      id_dipendente: { type: Type.STRING },
      id_cliente: { type: Type.STRING },
      servizio: { type: Type.STRING }
    },
    required: ["data_ora", "id_dipendente", "id_cliente", "servizio"]
  }
};

const creaServizio: FunctionDeclaration = {
  name: "creaServizio",
  description: "Crea un nuovo servizio nel catalogo.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      nome: { type: Type.STRING, description: "Nome del servizio" },
      prezzo_base: { type: Type.NUMBER, description: "Prezzo base in euro" },
      durata_minuti: { type: Type.NUMBER, description: "Durata in minuti" },
      categoria: { type: Type.STRING, description: "Categoria del servizio" }
    },
    required: ["nome", "prezzo_base", "durata_minuti"]
  }
};

const readLocalData = (filename: string) => {
  const p = path.join(process.cwd(), filename);
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  return [];
};

router.post('/', verifyToken, async (req: Request, res: Response) => {
  try {
    const { message, history } = req.body;
    
    // Validazione array history
    if (!message || !Array.isArray(history)) {
      return res.status(400).json({ reply: 'Richiesta non valida. Assicurati di inviare un file message e un array history.' });
    }
    
    // Configura Rosy Assistente
    const systemInstruction = `
Sei Rosy, l'assistente virtuale e orchestratore generale del salone di bellezza.
Puoi gestire tutta l'app: leggere e creare clienti, appuntamenti, e servizi nel catalogo.
Usa gli strumenti specifici forniti (creaCliente, creaAppuntamento, creaServizio, ecc.).

IMPORTANTE REGOLA SULLE MODIFICHE:
Prima di invocare qualsiasi strumento di creazione DEVI SEMPRE chiedere conferma all'utente elencando le modifiche.

Tieniti sintetico e professionale.
    `;

    const actAi = getAi();
    const chat = actAi.chats.create({
      model: "gemini-3.1-pro-preview",
      config: {
        systemInstruction,
        temperature: 0.7,
        tools: [{ functionDeclarations: [getAppuntamenti, getClienti, creaCliente, creaAppuntamento, creaServizio] }]
      },
    });

    const serializedHistory = history.map((m: any) => `${m.role}: ${m.content}`).join('\n');
    let prompt = serializedHistory ? `${serializedHistory}\nuser: ${message}` : message;
    
    let response = await chat.sendMessage({ message: prompt });
    
    // Controlliamo se ci sono function calls
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      let functionResponse: any = [];
      const args = call.args as any;
      if (call.name === 'getAppuntamenti') {
        const userId = (req as any).user?.uid;
        let q = query(collection(db, 'appuntamenti'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        const apps = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
        functionResponse = args.date ? apps.filter((a:any) => a.data_ora?.startsWith(args.date)) : apps;
      } else if (call.name === 'getClienti') {
        const userId = (req as any).user?.uid;
        const q = query(collection(db, 'clienti'), where('userId', '==', userId));
        const snapshot = await getDocs(q);
        functionResponse = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
      } else if (call.name === 'creaCliente') {
        try {
          const userId = (req as any).user?.uid;
          const payload = {
             nome: args.nome, cognome: args.cognome, telefono: args.telefono,
             userId,
             createdAt: serverTimestamp(),
             updatedAt: serverTimestamp()
          };
          const docRef = await addDoc(collection(db, 'clienti'), payload);
          functionResponse = { success: true, id: docRef.id };
        } catch(e: any) {
          functionResponse = { error: e.message };
        }
      } else if (call.name === 'creaAppuntamento') {
        try {
          const userId = (req as any).user?.uid;
          const dipendentiQuery = query(collection(db, 'dipendenti'), where('userId', '==', userId));
          const dipendenti = await getDocs(dipendentiQuery);
          const dList = dipendenti.docs.map(d => ({id: d.id, ...d.data()}));
          const dipAssigned = dList.find((d:any) => d.id === args.id_dipendente) || { nome: 'Operatore AI' };
          
          const payload = {
            data_ora: args.data_ora,
            note: 'Prenotato via AI: ' + args.servizio,
            id_dipendente: args.id_dipendente || '2',
            dipendenti: { nome: (dipAssigned as any).nome, id: args.id_dipendente || '2' },
            id_cliente: args.id_cliente,
            clienti: { id: args.id_cliente, nome: 'Cliente' },
            stato: 'confermato',
            userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          const docRef = await addDoc(collection(db, 'appuntamenti'), payload);
          functionResponse = { success: true, id: docRef.id };
        } catch(e: any) {
          functionResponse = { error: e.message };
        }
      } else if (call.name === 'creaServizio') {
        try {
          const userId = (req as any).user?.uid;
          const payload = {
            nome: args.nome,
            prezzo_base: args.prezzo_base,
            durata_minuti: args.durata_minuti,
            categoria: args.categoria || "Generico",
            attivo: true,
            userId,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          const docRef = await addDoc(collection(db, 'catalogo'), payload);
          functionResponse = { success: true, id: docRef.id };
        } catch(e: any) {
          functionResponse = { error: e.message };
        }
      }

      // Rispondiamo al modello passandogli i risultati della funzione. 
      // Ma con @google/genai potrei passare semplicemente i dati raw se volessi un altro turno.
      // Eseguiamo il turno di tool response (workaround semplificato per genai):
      let response2 = await chat.sendMessage({
         message: `Dati dal DB in risposta a ${call.name}:\n` + JSON.stringify(functionResponse).substring(0, 5000)
      });
      res.json({ reply: response2.text });
      return;
    }

    res.json({ reply: response.text });
  } catch (error: any) {
    console.error('Gemini error:', error);
    res.status(500).json({ reply: "Scusa, ho avuto un problema nell'elaborare la richiesta." });
  }
});

export default router;
