import { Router, Request, Response } from 'express';
import { GoogleGenAI, Type, FunctionDeclaration } from '@google/genai';
import rateLimit from 'express-rate-limit';
import fs from 'fs';
import path from 'path';
import * as admin from 'firebase-admin';
import { db } from '../../../../src/lib/firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';

// Rate Limiting Config
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minuti
  max: 20, // Limita ogni IP a 20 richieste
  message: { reply: 'Troppe richieste. Riprova più tardi.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const router = Router();
router.use(apiLimiter);
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

const getDisponibilita: FunctionDeclaration = {
  name: "getDisponibilita",
  description: "Restituisce la disponibilità settimanale degli operatori e le prenotazioni esistenti per calcolare quando c'è spazio libero. Usa questa funzione prima di confermare un orario al cliente.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      data: { type: Type.STRING, description: "La data in formato YYYY-MM-DD per cui cercare disponibilità." }
    }
  }
};

const prenotaAppuntamento: FunctionDeclaration = {
  name: "prenotaAppuntamento",
  description: "Da eseguire solo dopo aver avvisato il cliente e ricevuto conferma. Crea un appuntamento effettivo nel calendario del salone. Usa salon_id letto dal contesto della pagina.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      data_ora: { type: Type.STRING, description: "Data e ora prenotazione (es: 2026-06-15T10:00:00Z)" },
      id_dipendente: { type: Type.STRING },
      note: { type: Type.STRING },
      nome_cliente: { type: Type.STRING },
      servizio: { type: Type.STRING },
      salon_id: { type: Type.STRING, description: "ID del salone su cui prenotare." }
    },
    required: ["data_ora", "nome_cliente", "salon_id"]
  }
};

const readLocalData = (filename: string) => {
  const p = path.join(process.cwd(), filename);
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, 'utf-8'));
  return [];
};

router.post('/', async (req: Request, res: Response) => {
  try {
    const { message, history, salonId } = req.body;
    
    // Validate body
    if (!message || !Array.isArray(history)) {
       return res.status(400).json({ reply: 'Richiesta malformata. Invia message e history come array.' });
    }
    
    // Ensure tenant is provided (for multi-tenant context)
    const activeSalonId = salonId || 'default-salone';

    const systemInstruction = `
Sei l'assistente per le prenotazioni pubbliche del salone con ID "${activeSalonId}".
Il tuo obiettivo è fare da receptionist al cliente.
Devi parlarci in modo cordiale.
Usa la funzione getDisponibilita per sapere quando c'è posto (leggendo turni e impegni dei dipendenti).
Verifica sempre se la data / ora richiesta coincide con i turni attivi di un dipendente e non è sovrapposta ad altri appuntamenti.
Una volta trovato un momento, chiedi conferma e il nome per la prenotazione.
Quando approva, usa prenotaAppuntamento e includi sempre il salon_id "${activeSalonId}".
    `;

    const actAi = getAi();
    const chat = actAi.chats.create({
      model: "gemini-3.1-pro-preview",
      config: {
        systemInstruction,
        temperature: 0.5,
        tools: [{ functionDeclarations: [getDisponibilita, prenotaAppuntamento] }]
      },
    });

    const serializedHistory = history.map((m: any) => `${m.role}: ${m.content}`).join('\n');
    let prompt = serializedHistory ? `${serializedHistory}\nuser: ${message}` : message;
    
    let response = await chat.sendMessage({ message: prompt });
    
    if (response.functionCalls && response.functionCalls.length > 0) {
      const call = response.functionCalls[0];
      const args = call.args as any;
      let functionResponse: any = {};
      
      if (call.name === 'getDisponibilita') {
         try {
           let q = query(collection(db, 'appuntamenti'), where('userId', '==', activeSalonId));
           const snapshot = await getDocs(q);
           const apps = snapshot.docs.map(d => ({id: d.id, ...d.data()}));
           functionResponse = {
             appuntamenti_della_data: args.data ? apps.filter((a:any) => a.data_ora?.startsWith(args.data)) : apps,
             turni_generici: "Aperto tutti i giorni 09:00 - 19:00 eccetto Domenica. Marco c'è sempre."
           };
         } catch(e) {
           functionResponse = { error: 'Errore fetch appuntamenti' };
         }
      } else if (call.name === 'prenotaAppuntamento') {
         // Create in Firestore via Client SDK
         try {
           const payload = {
             data_ora: args.data_ora,
             note: args.note || 'Prenotato via AI: ' + args.servizio,
             dipendenti: { nome: 'Operatore AI', id: args.id_dipendente || '2' },
             id_dipendente: args.id_dipendente || '2',
             clienti: { nome: args.nome_cliente, cognome: '' },
             stato: 'confermato',
             userId: activeSalonId,
             source: 'web_public',
             createdAt: serverTimestamp(),
             updatedAt: serverTimestamp()
           };
           
           const docRef = await addDoc(collection(db, 'appuntamenti'), payload);
           functionResponse = { success: true, message: 'Appuntamento salvato nel sistema con ID ' + docRef.id };
         } catch(e) {
           console.error("Firebase admin write error:", e)
           functionResponse = { success: false, error: 'Errore server nel salvataggio.' };
         }
      }

      let response2 = await chat.sendMessage({
         message: `Dati sistema (risultato ${call.name}):\n` + JSON.stringify(functionResponse)
      });
      res.json({ reply: response2.text });
      return;
    }

    res.json({ reply: response.text });
  } catch(e) {
    console.error('Booking AI error:', e);
    res.status(500).json({ reply: 'Errore di connessione al nostro assistente.' });
  }
});

export default router;
