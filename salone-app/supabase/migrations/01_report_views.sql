-- =======================================================
-- 1. Vista: INCASSI MENSILI
-- Restituisce l'abbinamento Mese -> Totale incassato.
-- Utile per evitare di trasferire migliaia di righe al backend Node. 
-- =======================================================
CREATE OR REPLACE VIEW vista_incassi_mensili AS
SELECT 
  DATE_TRUNC('month', data_pagamento) as mese,
  SUM(importo) as totale_incassato
FROM pagamenti
GROUP BY DATE_TRUNC('month', data_pagamento)
ORDER BY mese DESC;

-- =======================================================
-- 2. Vista: TOTALI DIPENDENTI
-- Mostra per ogni dipendente il n. totale di appuntamenti 
-- e il totale economico generato.
-- =======================================================
CREATE OR REPLACE VIEW vista_totali_dipendenti AS
SELECT 
  d.id,
  d.nome,
  d.cognome,
  COUNT(DISTINCT a.id) as numero_appuntamenti,
  COALESCE(SUM(p.importo), 0) as totale_incassato
FROM dipendenti d
LEFT JOIN appuntamenti a 
       ON d.id = a.id_dipendente 
      AND a.stato = 'completato' -- (opzionale: calcola solo su appuntamenti completati)
LEFT JOIN pagamenti p 
       ON a.id = p.id_appuntamento
WHERE d.ruolo != 'admin' -- (opzionale, per escludere i titolari dalla chart produttività)
GROUP BY d.id, d.nome, d.cognome
ORDER BY totale_incassato DESC;
