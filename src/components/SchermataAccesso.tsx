import React from 'react';

interface Props {
  modoOperatrice: boolean;
  setModoOperatrice: (v: boolean) => void;
  accessoInCorso: boolean;
  erroreAccesso: string | null;
  setErroreAccesso: (v: string | null) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  onGoogle: () => void;
  onOperatrice: (e: React.FormEvent) => void;
}

/**
 * La schermata di accesso: due strade.
 * La titolare entra con Google, com'è sempre stato. Le operatrici entrano con
 * l'indirizzo e la password che la titolare ha creato per loro: ognuna il suo,
 * così si sa chi ha fatto cosa e togliendone uno non si tocca quello delle altre.
 */
export default function SchermataAccesso({
  modoOperatrice, setModoOperatrice, accessoInCorso, erroreAccesso, setErroreAccesso,
  email, setEmail, password, setPassword, onGoogle, onOperatrice
}: Props) {
  const handleLogin = onGoogle;
  const handleLoginOperatrice = onOperatrice;
  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center border border-zinc-200">
            <div className="w-16 h-16 bg-fuchsia-600 rounded-2xl mx-auto flex items-center justify-center mb-6 shadow-lg shadow-fuchsia-900/20">
              <span className="text-3xl font-playfair font-bold text-white">R</span>
            </div>
            <h1 className="text-2xl font-bold font-sans text-zinc-900 mb-2 tracking-tight">Accedi a Rosy</h1>
            <p className="text-zinc-500 mb-8 font-sans text-sm">
              {modoOperatrice
                ? 'Usa l\'indirizzo e la password che ti ha dato la titolare.'
                : 'Gestisci il tuo salone, clienti e appuntamenti, sincronizzato sul cloud.'}
            </p>
  
            {!modoOperatrice ? (
              <button
                onClick={handleLogin}
                className="w-full bg-zinc-100 text-zinc-900 hover:bg-zinc-50 transition-colors py-3 rounded-lg font-medium flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5 bg-white rounded-full" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                {accessoInCorso ? 'Attendi...' : 'Accedi con Google'}
              </button>
            ) : (
              <form onSubmit={handleLoginOperatrice} className="flex flex-col gap-3 text-left">
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1">Indirizzo</label>
                  <input
                    type="email"
                    autoComplete="username"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="giulia@salone.it"
                    className="w-full border border-zinc-300 bg-zinc-50/50 text-zinc-900 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-fuchsia-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-600 mb-1">Password</label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full border border-zinc-300 bg-zinc-50/50 text-zinc-900 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-fuchsia-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={accessoInCorso}
                  className="w-full bg-fuchsia-600 hover:bg-fuchsia-500 text-white transition-colors py-3 rounded-lg font-bold disabled:opacity-60"
                >
                  {accessoInCorso ? 'Attendi…' : 'Entra'}
                </button>
              </form>
            )}
  
            {erroreAccesso && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-left">
                <p className="text-sm text-red-700 leading-relaxed">{erroreAccesso}</p>
              </div>
            )}
  
            <button
              onClick={() => { setModoOperatrice(!modoOperatrice); setErroreAccesso(null); }}
              className="mt-6 text-sm font-medium text-zinc-500 hover:text-zinc-900 transition-colors underline underline-offset-2"
            >
              {modoOperatrice ? 'Sono la titolare, entro con Google' : 'Sono un\'operatrice, entro con la password'}
            </button>
          </div>
        </div>
  );
}
