# UX Guidelines

The user provided the following strong instructions regarding User Experience (UX):

1. **Separate Read vs. Edit Modes**: The initial view must always be separated from the editing management. You should not modify the data in the same spot where you view it (especially for lists or tables). Create a read-only list/table and add an "Edit" button that opens a dedicated panel, modal, or separate page explicitly for editing. Do not render input fields inline inside a table for direct viewing.
2. **Scrollbars**: Avoid using ugly horizontal scrollbars. If tables contain too much data, try making the UI more compact, wrapping properly, or using a responsive grid layout. Use custom styled scrollbars if absolutely necessary, but try to avoid them in main content areas.

# Roadmap & Upcoming Features
- **Public Booking Interface**: A dedicated, highly polished customer-facing UI where clients can book appointments, selecting specific operators and services. It must automatically calculate available time slots based on the operator's configured shifts, holidays, and breaks.
- **AI Booking Assistant**: Integrate a simple, seamless AI assistant (powered by Gemini) directly into the customer booking interface to help users find slots and book appointments through natural language.
- **Impostazioni (Settings)**: Creare una sezione divisa in 3 sotto-pagine principali dove l'utente modificherà i dettagli essenziali del salone (orari, foto, informazioni varie, sede, ecc.). I dettagli specifici verranno decisi in seguito.
- **Aggiornamento Piano Contabile**: Implementazione e gestione dell'aggiornamento per la contabilità.
- **Tema Chiaro / Scuro (Dark Mode)**: Inserimento della possibilità di switchare da aspetto chiaro a scuro.
- **Onboarding Cliente**: Impostazione di un flusso di onboarding dedicato al cliente.
- **Gestore Messaggistica & Automazioni**: Sistema di comunicazione con il cliente e avvio di automazioni per messaggi, email, notifiche, ecc.
- **Gestione Prodotti e Offerte/Buoni**: Sezione dedicata per gestire il catalogo prodotti fisici e per poter creare voucher, sconti, o promozioni specifiche (dettagli da decidere).

# Workflow Preferences
3. **Step-by-Step Approval**: Before implementing code changes, you MUST provide a high-level, general step-by-step plan of what you intend to modify. You MUST then stop and ask for the user's explicit permission to proceed before calling any code modification tools.
