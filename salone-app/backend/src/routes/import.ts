import { Router, Request, Response } from 'express';
import { GoogleGenAI, Type } from '@google/genai';
import { v4  as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';

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

const mockFilePath = path.join(process.cwd(), 'clienti_db.json');

// POST /api/import/clienti
router.post('/clienti', async (req: Request, res: Response) => {
  try {
    const { fileData, mimeType } = req.body; // Assumiamo formato { data: "base64...", mimeType: "application/pdf" }

    const actAi = getAi();
    const response = await actAi.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: fileData,
              mimeType: mimeType,
            },
          },
          {
            text: "Extract a list of clients from this document. Ensure you capture the first name (nome), last name (cognome), phone number (telefono), and email (email) if present. If there are notes, put them in 'note'. Return an array of objects.",
          },
        ],
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              nome: { type: Type.STRING },
              cognome: { type: Type.STRING },
              telefono: { type: Type.STRING },
              email: { type: Type.STRING },
              note: { type: Type.STRING },
            },
            required: ["nome", "cognome"],
          },
        },
      },
    });

    const clientsExtracted = JSON.parse(response.text.trim());

    // Import extracted clients into local JSON db (mock)
    let currentClienti: any[] = [];
    if (fs.existsSync(mockFilePath)) {
      currentClienti = JSON.parse(fs.readFileSync(mockFilePath, 'utf-8'));
    }

    const imported = clientsExtracted.map((c: any) => ({
      id: uuidv4(),
      nome: c.nome,
      cognome: c.cognome,
      telefono: c.telefono || null,
      email: c.email || null,
      note: c.note || null,
    }));

    currentClienti = [...imported, ...currentClienti];
    fs.writeFileSync(mockFilePath, JSON.stringify(currentClienti, null, 2));

    res.json({ success: true, count: imported.length, imported });

  } catch (error: any) {
    console.error('Import error:', error);
    res.status(500).json({ error: "Errore durante l'importazione." });
  }
});

export default router;
