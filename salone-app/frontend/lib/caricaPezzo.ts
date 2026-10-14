// Scaricare un pezzo del programma, con un paracadute.
//
// Il programma è diviso in pezzi che si scaricano quando servono. Se nel
// frattempo è uscita una versione nuova, i pezzi vecchi non ci sono più e il
// download fallisce: allora si ricarica la pagina, una volta sola, e si
// prende la versione nuova. Se fallisce di nuovo l'errore resta, così non si
// ricarica all'infinito.

const CHIAVE = 'rosy:ricaricato-per-pezzo';

export function caricaPezzo<T>(scarica: () => Promise<T>): () => Promise<T> {
  return () => scarica()
    .then(modulo => {
      try { sessionStorage.removeItem(CHIAVE); } catch { /* niente */ }
      return modulo;
    })
    .catch(err => {
      let gia = false;
      try { gia = sessionStorage.getItem(CHIAVE) === '1'; sessionStorage.setItem(CHIAVE, '1'); } catch { /* niente */ }
      if (!gia) {
        window.location.reload();
        return new Promise<T>(() => {}); // si aspetta il ricaricamento
      }
      throw err;
    });
}
