// Il traduttore fra Gemini e i fornitori "alla OpenAI" (Groq, OpenRouter).
//
// Rosy pensa nel formato di Gemini: messaggi con "parts", strumenti con
// "functionCall" e "functionResponse". Groq e OpenRouter parlano invece il
// formato di OpenAI: "messages", "tool_calls", messaggi "tool". Qui si passa
// dall'uno all'altro, andata e ritorno, così il cervello di Rosy non cambia
// qualunque sia il fornitore che risponde.
//
// Niente rete, niente stato: si prova da solo.

/** Gli schemi di Gemini scrivono i tipi in maiuscolo ("OBJECT"), OpenAI in minuscolo. */
export function schemaPerOpenAI(schema: any): any {
  if (Array.isArray(schema)) return schema.map(schemaPerOpenAI);
  if (!schema || typeof schema !== 'object') return schema;
  return Object.fromEntries(Object.entries(schema).map(([k, v]) => [
    k,
    k === 'type' && typeof v === 'string' ? v.toLowerCase() : schemaPerOpenAI(v)
  ]));
}

/**
 * L'identificativo di una chiamata a strumento. OpenAI vuole che ogni
 * risposta dica a quale chiamata risponde; Gemini le abbina per ordine. Qui
 * si ricava dalla posizione, così non serve ricordarlo da nessuna parte.
 */
const idChiamata = (turno: number, n: number) => `chiamata_${turno}_${n}`;

/** Una richiesta nel formato di Gemini → la stessa nel formato di OpenAI. */
export function richiestaPerOpenAI(corpo: any, modello: string, extra: Record<string, any> | null = null): any {
  const messages: any[] = [];
  const sistema = (corpo.systemInstruction?.parts || []).map((p: any) => p.text || '').join('\n').trim();
  if (sistema) messages.push({ role: 'system', content: sistema });

  (corpo.contents || []).forEach((c: any, turno: number) => {
    const parti: any[] = c.parts || [];
    const testo = parti.map(p => p.text || '').join('').trim();

    if (c.role === 'model') {
      const chiamate = parti.filter(p => p.functionCall);
      messages.push({
        role: 'assistant',
        content: testo || (chiamate.length ? null : ''),
        ...(chiamate.length ? {
          tool_calls: chiamate.map((p, n) => ({
            id: idChiamata(turno, n),
            type: 'function',
            function: { name: p.functionCall.name, arguments: JSON.stringify(p.functionCall.args || {}) }
          }))
        } : {})
      });
      return;
    }

    const risposte = parti.filter(p => p.functionResponse);
    if (risposte.length) {
      // Le risposte rispondono, in ordine, alle chiamate del turno prima.
      risposte.forEach((p, n) => messages.push({
        role: 'tool',
        tool_call_id: idChiamata(turno - 1, n),
        content: JSON.stringify(p.functionResponse.response ?? {})
      }));
      return;
    }
    messages.push({ role: 'user', content: testo });
  });

  const dichiarazioni = (corpo.tools || []).flatMap((t: any) => t.functionDeclarations || []);
  return {
    model: modello,
    messages,
    ...(dichiarazioni.length ? {
      tools: dichiarazioni.map((d: any) => ({
        type: 'function',
        function: { name: d.name, description: d.description, parameters: schemaPerOpenAI(d.parameters || { type: 'OBJECT', properties: {} }) }
      })),
      tool_choice: 'auto'
    } : {}),
    temperature: corpo.generationConfig?.temperature ?? 0.3,
    ...(extra || {})
  };
}

/** Una risposta nel formato di OpenAI → la stessa nel formato di Gemini. */
export function rispostaDaOpenAI(json: any): any {
  const messaggio = json?.choices?.[0]?.message || {};
  const parts: any[] = [];
  const testo = typeof messaggio.content === 'string' ? messaggio.content.trim() : '';
  if (testo) parts.push({ text: testo });
  for (const c of messaggio.tool_calls || []) {
    let args: any = {};
    try { args = c.function?.arguments ? JSON.parse(c.function.arguments) : {}; } catch { args = {}; }
    parts.push({ functionCall: { name: c.function?.name, args } });
  }
  return { candidates: [{ content: { role: 'model', parts } }] };
}
