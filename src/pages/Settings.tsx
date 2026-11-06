import React, { useEffect, useState } from 'react';
import {
  Settings, FolderOpen, HardDrive, Cloud, RotateCcw, Key, Eye, EyeOff, CheckCircle,
  Gamepad2, Film, BookOpen, ExternalLink, Sparkles, ShieldCheck,
} from 'lucide-react';
import { version } from '../../package.json';

type Config = Record<string, string | undefined>;

function SecretField({ value, onChange, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative flex-1">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="input-field pr-10 font-mono text-xs"
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={() => setShow(!show)}
        aria-label={show ? 'Ocultar' : 'Mostrar'}
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-dark-400 hover:text-dark-200"
      >
        {show ? <EyeOff size={14} /> : <Eye size={14} />}
      </button>
    </div>
  );
}

function SourceCard({ icon, color, title, subtitle, configured, badge, saved, children }: {
  icon: React.ReactNode;
  color: string;
  title: string;
  subtitle: string;
  configured: boolean;
  badge?: string;
  saved?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-dark-700/60 bg-dark-900/40 p-4">
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-dark-100">{title}</h3>
            {badge && <span className="badge bg-accent-500/15 text-accent-300">{badge}</span>}
            {saved && <CheckCircle size={13} className="text-green-400" />}
          </div>
          <p className="text-[11px] text-dark-400">{subtitle}</p>
        </div>
        <span className={`badge shrink-0 ${configured ? 'bg-green-500/15 text-green-300' : 'bg-dark-700 text-dark-400'}`}>
          {configured ? 'Ativo' : 'Sem chave'}
        </span>
      </div>
      {children}
    </div>
  );
}

export default function SettingsPage() {
  const [dbPath, setDbPath] = useState('');
  const [customFolder, setCustomFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [saved, setSaved] = useState<Config>({});
  const [draft, setDraft] = useState<Config>({});
  const [justSaved, setJustSaved] = useState<string | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const [path, config] = await Promise.all([
      window.api.settings.getDbPath(),
      window.api.settings.getConfig(),
    ]);
    setDbPath(path);
    setCustomFolder(config.dbFolder || null);
    setSaved(config);
    setDraft(config);
  }

  async function selectFolder() {
    const folder = await window.api.settings.selectDbFolder();
    if (!folder) return;

    setLoading(true);
    setMessage(null);
    try {
      const result = await window.api.settings.setDbFolder(folder);
      if (result.success) {
        setCustomFolder(folder);
        setDbPath(result.newPath);
        setMessage({ text: 'Pasta alterada com sucesso! O banco de dados foi movido.', type: 'success' });
      }
    } catch (err: any) {
      setMessage({ text: `Erro ao alterar pasta: ${err.message}`, type: 'error' });
    }
    setLoading(false);
  }

  async function resetToDefault() {
    setLoading(true);
    setMessage(null);
    try {
      const result = await window.api.settings.setDbFolder(null);
      if (result.success) {
        setCustomFolder(null);
        setDbPath(result.newPath);
        setMessage({ text: 'Restaurado para a pasta padrão.', type: 'success' });
      }
    } catch (err: any) {
      setMessage({ text: `Erro: ${err.message}`, type: 'error' });
    }
    setLoading(false);
  }

  async function saveKeys(group: string, keys: string[]) {
    for (const k of keys) await window.api.config.set(k, (draft[k] || '').trim());
    setSaved(s => ({ ...s, ...Object.fromEntries(keys.map(k => [k, (draft[k] || '').trim()])) }));
    setJustSaved(group);
    setTimeout(() => setJustSaved(null), 2000);
  }

  const field = (key: string) => ({
    value: draft[key] || '',
    onChange: (v: string) => setDraft(d => ({ ...d, [key]: v })),
  });
  const dirty = (keys: string[]) => keys.some(k => (draft[k] || '').trim() !== (saved[k] || ''));

  const igdbOn = !!(saved.igdbClientId && saved.igdbClientSecret);
  const rawgOn = !!saved.rawgApiKey;
  const tmdbOn = !!saved.tmdbApiKey;
  const activeSources = [igdbOn || rawgOn, tmdbOn, true].filter(Boolean).length;

  return (
    <div className="p-6 h-full overflow-y-auto space-y-6">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-dark-700/60">
        <div className="absolute inset-0 bg-gradient-to-br from-accent-500/20 via-dark-900 to-purple-500/15" />
        <div className="absolute -right-10 -top-10 w-56 h-56 rounded-full bg-accent-500/10 blur-3xl" />
        <div className="relative z-10 px-6 py-7 md:px-8 flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-dark-300 flex items-center gap-2">
              <Settings size={13} /> Configurações
            </p>
            <h1 className="mt-2 text-3xl md:text-4xl font-black text-dark-50">Seu LoreKeeper, do seu jeito</h1>
            <p className="mt-1 text-sm text-dark-300">Onde seus dados ficam e de onde vêm capas e metadados.</p>
          </div>
          <div className="flex gap-3">
            <div className="px-4 py-3 rounded-xl bg-dark-950/50 border border-dark-700/60 text-center min-w-[96px]">
              <p className="text-2xl font-bold text-dark-50">{activeSources}/3</p>
              <p className="text-[10px] uppercase tracking-wide text-dark-400">Fontes ativas</p>
            </div>
            <div className="px-4 py-3 rounded-xl bg-dark-950/50 border border-dark-700/60 text-center min-w-[96px]">
              <p className="text-2xl font-bold text-gradient">v{version}</p>
              <p className="text-[10px] uppercase tracking-wide text-dark-400">Versão</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
        {/* Metadata sources */}
        <section className="stat-card xl:col-span-3 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/15 flex items-center justify-center">
              <Key size={20} className="text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-100">Fontes de Metadados</h2>
              <p className="text-xs text-dark-400">Chaves gratuitas para buscar capas, descrições e gêneros</p>
            </div>
          </div>

          <SourceCard
            icon={<Gamepad2 size={18} className="text-purple-300" />}
            color="bg-purple-500/15"
            title="IGDB (Jogos)"
            subtitle="Capas oficiais e dados completos. Usado primeiro na busca."
            badge="Recomendado"
            configured={igdbOn}
            saved={justSaved === 'igdb'}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <SecretField {...field('igdbClientId')} placeholder="Client ID" />
              <SecretField {...field('igdbClientSecret')} placeholder="Client Secret" />
            </div>
            <div className="flex items-center justify-between gap-3 mt-2">
              <p className="text-[10px] text-dark-500">
                Entre em <span className="text-accent-400">dev.twitch.tv/console</span> → Register Your Application
                (OAuth Redirect: <span className="font-mono">http://localhost</span>) e copie o Client ID e um novo Secret.
              </p>
              <button
                onClick={() => saveKeys('igdb', ['igdbClientId', 'igdbClientSecret'])}
                disabled={!dirty(['igdbClientId', 'igdbClientSecret'])}
                className="btn-primary text-xs px-4 shrink-0 disabled:opacity-40"
              >
                Salvar
              </button>
            </div>
          </SourceCard>

          <SourceCard
            icon={<Gamepad2 size={18} className="text-sky-300" />}
            color="bg-sky-500/15"
            title="RAWG.io (Jogos)"
            subtitle={igdbOn ? 'Reserva: usado só quando o IGDB não responde.' : 'Usado na busca de jogos enquanto o IGDB não estiver configurado.'}
            badge={igdbOn ? 'Fallback' : undefined}
            configured={rawgOn}
            saved={justSaved === 'rawg'}
          >
            <div className="flex gap-2">
              <SecretField {...field('rawgApiKey')} placeholder="Cole sua API key do rawg.io" />
              <button
                onClick={() => saveKeys('rawg', ['rawgApiKey'])}
                disabled={!dirty(['rawgApiKey'])}
                className="btn-primary text-xs px-4 disabled:opacity-40"
              >
                Salvar
              </button>
            </div>
            <p className="text-[10px] text-dark-500 mt-2">
              Crie uma conta gratuita em <span className="text-accent-400">rawg.io/apidocs</span> para obter a key
            </p>
          </SourceCard>

          <SourceCard
            icon={<Film size={18} className="text-rose-300" />}
            color="bg-rose-500/15"
            title="TMDB (Filmes, Séries, Animes)"
            subtitle="Pôsteres, sinopses e elenco em português."
            configured={tmdbOn}
            saved={justSaved === 'tmdb'}
          >
            <div className="flex gap-2">
              <SecretField {...field('tmdbApiKey')} placeholder="Cole sua API key do TMDB" />
              <button
                onClick={() => saveKeys('tmdb', ['tmdbApiKey'])}
                disabled={!dirty(['tmdbApiKey'])}
                className="btn-primary text-xs px-4 disabled:opacity-40"
              >
                Salvar
              </button>
            </div>
            <p className="text-[10px] text-dark-500 mt-2">
              Crie uma conta gratuita em <span className="text-accent-400">themoviedb.org</span> → Settings → API
            </p>
          </SourceCard>

          <SourceCard
            icon={<BookOpen size={18} className="text-emerald-300" />}
            color="bg-emerald-500/15"
            title="Google Books (Livros)"
            subtitle="Não precisa de chave. A busca de livros já funciona."
            configured
          >
            <p className="text-[11px] text-dark-400 flex items-center gap-1.5">
              <ShieldCheck size={12} className="text-emerald-400" /> Nada para configurar.
            </p>
          </SourceCard>

          <div className="pt-3 border-t border-dark-700/50">
            <h3 className="text-sm font-medium text-dark-200 mb-1 flex items-center gap-1.5">
              <Sparkles size={14} className="text-accent-400" /> Como funciona
            </h3>
            <p className="text-xs text-dark-400 leading-relaxed">
              Ao adicionar um jogo, filme, série ou livro, clique em <strong className="text-dark-300">🔍 Buscar</strong> para
              preencher capa, descrição, gênero e outros dados. Nos jogos, se o IGDB estiver fora do ar, o RAWG é usado
              automaticamente.
            </p>
          </div>
        </section>

        <div className="xl:col-span-2 space-y-6">
          {/* Database Location */}
          <section className="stat-card">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-accent-500/15 flex items-center justify-center">
                <HardDrive size={20} className="text-accent-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-dark-100">Banco de Dados</h2>
                <p className="text-xs text-dark-400">Onde seus dados são armazenados</p>
              </div>
            </div>

            <label className="text-xs font-medium text-dark-400 uppercase tracking-wide">Caminho atual</label>
            <p className="text-xs text-dark-200 mt-1 mb-4 bg-dark-900 px-3 py-2 rounded-lg border border-dark-600 font-mono break-all">
              {dbPath || 'Carregando...'}
            </p>

            {customFolder && (
              <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
                <Cloud size={16} className="text-green-400 shrink-0" />
                <p className="text-xs text-green-300">
                  Sincronizando com pasta personalizada: <span className="font-mono break-all">{customFolder}</span>
                </p>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <button onClick={selectFolder} disabled={loading} className="btn-primary flex items-center gap-2 text-sm">
                <FolderOpen size={16} />
                {customFolder ? 'Alterar Pasta' : 'Usar Pasta na Nuvem'}
              </button>
              {customFolder && (
                <button onClick={resetToDefault} disabled={loading} className="btn-secondary flex items-center gap-2 text-sm">
                  <RotateCcw size={16} />
                  Restaurar Padrão
                </button>
              )}
            </div>

            {message && (
              <div className={`mt-4 px-3 py-2 rounded-lg text-sm ${
                message.type === 'success'
                  ? 'bg-green-500/10 border border-green-500/20 text-green-300'
                  : 'bg-red-500/10 border border-red-500/20 text-red-300'
              }`}>
                {message.text}
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-dark-700/50">
              <h3 className="text-sm font-medium text-dark-200 mb-2">💡 Sincronize com a nuvem</h3>
              <p className="text-xs text-dark-400 leading-relaxed">
                Escolha uma pasta do <strong className="text-dark-300">Google Drive</strong>,{' '}
                <strong className="text-dark-300">OneDrive</strong> ou{' '}
                <strong className="text-dark-300">Dropbox</strong> para acessar seus dados de qualquer computador.
              </p>
            </div>
          </section>

          {/* App Info */}
          <section className="stat-card">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center">
                <span className="text-lg">📖</span>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-dark-100">LoreKeeper</h2>
                <p className="text-xs text-dark-400">Versão {version}</p>
              </div>
            </div>
            <p className="text-xs text-dark-400 mb-4">
              Rastreador pessoal de mídias: Jogos, Filmes, Séries, Animes, Mangás e Livros.
            </p>
            <button
              onClick={() => window.api.updates.openNotes(version)}
              className="btn-secondary w-full flex items-center justify-center gap-2 text-sm"
            >
              <ExternalLink size={14} />
              Novidades desta versão
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
