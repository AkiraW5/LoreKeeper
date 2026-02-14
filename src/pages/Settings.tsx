import React, { useEffect, useState } from 'react';
import { Settings, FolderOpen, HardDrive, Cloud, RotateCcw, Key, Eye, EyeOff, CheckCircle } from 'lucide-react';

export default function SettingsPage() {
  const [dbPath, setDbPath] = useState('');
  const [customFolder, setCustomFolder] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [rawgKey, setRawgKey] = useState('');
  const [tmdbKey, setTmdbKey] = useState('');
  const [showRawg, setShowRawg] = useState(false);
  const [showTmdb, setShowTmdb] = useState(false);
  const [keySaved, setKeySaved] = useState<string | null>(null);

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
    setRawgKey(config.rawgApiKey || '');
    setTmdbKey(config.tmdbApiKey || '');
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

  async function saveApiKey(key: string, value: string) {
    await window.api.config.set(key, value);
    setKeySaved(key);
    setTimeout(() => setKeySaved(null), 2000);
  }

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-2">
          <Settings size={24} className="text-dark-300" />
          Configurações
        </h1>
        <p className="text-sm text-dark-400 mt-1">Ajustes gerais do aplicativo</p>
      </div>

      <div className="max-w-2xl space-y-6">
        {/* Database Location */}
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-accent-500/15 flex items-center justify-center">
              <HardDrive size={20} className="text-accent-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-100">Local do Banco de Dados</h2>
              <p className="text-xs text-dark-400">Onde seus dados são armazenados</p>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs font-medium text-dark-400 uppercase tracking-wide">Caminho atual</label>
            <p className="text-sm text-dark-200 mt-1 bg-dark-900 px-3 py-2 rounded-lg border border-dark-600 font-mono break-all">
              {dbPath || 'Carregando...'}
            </p>
          </div>

          {customFolder && (
            <div className="mb-4 flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-lg">
              <Cloud size={16} className="text-green-400 shrink-0" />
              <p className="text-xs text-green-300">
                Sincronizando com pasta personalizada: <span className="font-mono">{customFolder}</span>
              </p>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={selectFolder}
              disabled={loading}
              className="btn-primary flex items-center gap-2"
            >
              <FolderOpen size={16} />
              {customFolder ? 'Alterar Pasta' : 'Usar Google Drive / Pasta Custom'}
            </button>

            {customFolder && (
              <button
                onClick={resetToDefault}
                disabled={loading}
                className="btn-secondary flex items-center gap-2"
              >
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
            <h3 className="text-sm font-medium text-dark-200 mb-2">💡 Dica: Sincronize com a nuvem</h3>
            <p className="text-xs text-dark-400 leading-relaxed">
              Para acessar seus dados de qualquer computador, selecione uma pasta sincronizada pelo
              <strong className="text-dark-300"> Google Drive</strong>,{' '}
              <strong className="text-dark-300">OneDrive</strong> ou{' '}
              <strong className="text-dark-300">Dropbox</strong>.
              O banco de dados será salvo nessa pasta e sincronizado automaticamente.
            </p>
          </div>
        </div>

        {/* App Info */}
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/15 flex items-center justify-center">
              <span className="text-lg">📖</span>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-100">LoreKeeper</h2>
              <p className="text-xs text-dark-400">v1.0.0</p>
            </div>
          </div>
          <p className="text-xs text-dark-400">
            Rastreador pessoal de mídias — Jogos, Filmes, Séries, Animes, Mangás e Livros.
          </p>
        </div>

        {/* API Keys */}
        <div className="stat-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-yellow-500/15 flex items-center justify-center">
              <Key size={20} className="text-yellow-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-100">Chaves de API</h2>
              <p className="text-xs text-dark-400">Para buscar capas, descrições e metadados automaticamente</p>
            </div>
          </div>

          {/* RAWG */}
          <div className="mb-4">
            <label className="text-xs font-medium text-dark-300 uppercase tracking-wide flex items-center gap-2 mb-1">
              🎮 RAWG.io (Jogos)
              {keySaved === 'rawgApiKey' && <CheckCircle size={12} className="text-green-400" />}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showRawg ? 'text' : 'password'}
                  value={rawgKey}
                  onChange={e => setRawgKey(e.target.value)}
                  className="input-field pr-10 font-mono text-xs"
                  placeholder="Cole sua API key do rawg.io"
                />
                <button
                  onClick={() => setShowRawg(!showRawg)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-dark-400 hover:text-dark-200"
                >
                  {showRawg ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                onClick={() => saveApiKey('rawgApiKey', rawgKey)}
                className="btn-primary text-xs px-4"
              >
                Salvar
              </button>
            </div>
            <p className="text-[10px] text-dark-500 mt-1">
              Crie uma conta gratuita em <span className="text-accent-400">rawg.io/apidocs</span> para obter a key
            </p>
          </div>

          {/* TMDB */}
          <div className="mb-4">
            <label className="text-xs font-medium text-dark-300 uppercase tracking-wide flex items-center gap-2 mb-1">
              🎬 TMDB (Filmes, Séries, Animes)
              {keySaved === 'tmdbApiKey' && <CheckCircle size={12} className="text-green-400" />}
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showTmdb ? 'text' : 'password'}
                  value={tmdbKey}
                  onChange={e => setTmdbKey(e.target.value)}
                  className="input-field pr-10 font-mono text-xs"
                  placeholder="Cole sua API key do TMDB"
                />
                <button
                  onClick={() => setShowTmdb(!showTmdb)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-dark-400 hover:text-dark-200"
                >
                  {showTmdb ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <button
                onClick={() => saveApiKey('tmdbApiKey', tmdbKey)}
                className="btn-primary text-xs px-4"
              >
                Salvar
              </button>
            </div>
            <p className="text-[10px] text-dark-500 mt-1">
              Crie uma conta gratuita em <span className="text-accent-400">themoviedb.org</span> → Settings → API
            </p>
          </div>

          {/* Google Books info */}
          <div className="px-3 py-2 bg-dark-700/30 rounded-lg">
            <p className="text-xs text-dark-400">
              📚 <strong className="text-dark-300">Google Books</strong> — Não precisa de chave! A busca de livros funciona automaticamente.
            </p>
          </div>

          <div className="mt-4 pt-3 border-t border-dark-700/50">
            <h3 className="text-sm font-medium text-dark-200 mb-2">💡 Como funciona</h3>
            <p className="text-xs text-dark-400 leading-relaxed">
              Com as chaves configuradas, ao adicionar um jogo, filme, série ou livro, você poderá clicar em
              <strong className="text-dark-300"> 🔍 Buscar</strong> para preencher automaticamente a capa, descrição,
              gênero e outros dados. Tudo grátis!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
