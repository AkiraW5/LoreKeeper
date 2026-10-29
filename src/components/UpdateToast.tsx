import React, { useEffect, useState } from 'react';
import { Sparkles, X, ExternalLink, AlertTriangle } from 'lucide-react';

type UpdateState =
  | { status: 'idle' }
  | { status: 'available'; version: string }
  | { status: 'downloading'; version: string; percent: number }
  | { status: 'error'; version: string; message: string };

export default function UpdateToast() {
  const [state, setState] = useState<UpdateState>({ status: 'idle' });

  useEffect(() => {
    const api = window.api?.updates;
    if (!api) return;
    const offs = [
      api.on('available', ({ version }) => setState({ status: 'available', version })),
      api.on('progress', percent =>
        setState(s => (s.status === 'downloading' ? { ...s, percent } : s))),
      // Erro só aparece se o usuário pediu a atualização; falha na checagem (ex.: offline) fica silenciosa.
      api.on('error', message =>
        setState(s => (s.status === 'downloading' ? { status: 'error', version: s.version, message } : s))),
    ];
    api.check();
    return () => offs.forEach(off => off());
  }, []);

  if (state.status === 'idle') return null;

  const dismiss = () => setState({ status: 'idle' });
  const startDownload = () => {
    setState({ status: 'downloading', version: state.version, percent: 0 });
    window.api.updates.download().catch(() => {});
  };

  return (
    <div className="fixed bottom-5 right-5 z-40 w-80 toast-in">
      <div className="relative overflow-hidden rounded-xl border border-accent-500/30 bg-dark-800/90 backdrop-blur-md shadow-2xl shadow-accent-500/10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-accent-400/60 to-transparent" />

        <div className="flex gap-3 p-4">
          <div className={`flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center ${
            state.status === 'error'
              ? 'bg-red-500/15 text-red-400'
              : 'bg-gradient-to-br from-accent-500/30 to-purple-500/20 text-accent-300'
          }`}>
            {state.status === 'error' ? <AlertTriangle size={18} /> : <Sparkles size={18} />}
          </div>

          <div className="flex-1 min-w-0">
            {state.status === 'available' && (
              <>
                <p className="text-sm font-semibold text-dark-100">Nova versão disponível</p>
                <p className="text-xs text-dark-300 mt-0.5">
                  LoreKeeper <span className="text-gradient font-semibold">v{state.version}</span> está pronto para instalar.
                </p>
                <button
                  onClick={() => window.api.updates.openNotes(state.version)}
                  className="inline-flex items-center gap-1 mt-1.5 text-xs text-accent-400 hover:text-accent-300 transition-colors"
                >
                  Ver novidades <ExternalLink size={11} />
                </button>
                <div className="flex gap-2 mt-3">
                  <button onClick={dismiss} className="btn-secondary text-xs px-3 py-1.5">Depois</button>
                  <button onClick={startDownload} className="btn-primary text-xs px-3 py-1.5">Atualizar agora</button>
                </div>
              </>
            )}

            {state.status === 'downloading' && (
              <>
                <p className="text-sm font-semibold text-dark-100">Baixando v{state.version}…</p>
                <p className="text-xs text-dark-400 mt-0.5">O app reinicia sozinho ao terminar.</p>
                <div className="mt-3 h-1.5 rounded-full bg-dark-700 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent-500 to-purple-400 transition-all duration-300"
                    style={{ width: `${state.percent}%` }}
                  />
                </div>
                <p className="text-[11px] text-dark-400 mt-1 text-right tabular-nums">{state.percent}%</p>
              </>
            )}

            {state.status === 'error' && (
              <>
                <p className="text-sm font-semibold text-dark-100">Não foi possível atualizar</p>
                <p className="text-xs text-dark-400 mt-0.5 line-clamp-2" title={state.message}>{state.message}</p>
                <div className="flex gap-2 mt-3">
                  <button onClick={dismiss} className="btn-secondary text-xs px-3 py-1.5">Fechar</button>
                  <button onClick={startDownload} className="btn-primary text-xs px-3 py-1.5">Tentar de novo</button>
                </div>
              </>
            )}
          </div>

          {state.status !== 'downloading' && (
            <button onClick={dismiss} className="self-start text-dark-500 hover:text-dark-200 transition-colors" aria-label="Fechar">
              <X size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
