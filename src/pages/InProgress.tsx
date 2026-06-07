import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Plus, Gamepad2, Tv, Play, BookOpen, Library, Flame } from 'lucide-react';
import ActivityHeatmap from '../components/ActivityHeatmap';

interface TrackConfig {
  table: string;
  kind: string;
  emoji: string;
  icon: React.ReactNode;
  gradient: string;
  ring: string;
  progressField: string;
  totalField: string;
  unitLabel: string;
  unitShort: string;
  step: number;
  status: string;
}

const TRACKS: TrackConfig[] = [
  { table: 'tv_shows', kind: 'Séries', emoji: '📺', icon: <Tv size={14} />, gradient: 'from-pink-500 to-rose-400', ring: 'text-pink-400', progressField: 'episodes_watched', totalField: 'total_episodes', unitLabel: 'Episódios', unitShort: 'ep', step: 1, status: 'Assistindo' },
  { table: 'animes', kind: 'Animes', emoji: '🍥', icon: <Play size={14} />, gradient: 'from-purple-500 to-fuchsia-400', ring: 'text-purple-400', progressField: 'episodes_watched', totalField: 'total_episodes', unitLabel: 'Episódios', unitShort: 'ep', step: 1, status: 'Assistindo' },
  { table: 'manga', kind: 'Mangás', emoji: '📖', icon: <BookOpen size={14} />, gradient: 'from-blue-500 to-cyan-400', ring: 'text-blue-400', progressField: 'chapters_read', totalField: 'total_chapters', unitLabel: 'Capítulos', unitShort: 'cap', step: 1, status: 'Lendo' },
  { table: 'books', kind: 'Livros', emoji: '📚', icon: <Library size={14} />, gradient: 'from-green-500 to-emerald-400', ring: 'text-green-400', progressField: 'pages_read', totalField: 'total_pages', unitLabel: 'Páginas', unitShort: 'pág', step: 10, status: 'Lendo' },
];

interface ProgressItem {
  id: string;
  table: string;
  config: TrackConfig;
  title: string;
  cover_url: string;
  current: number;
  total: number;
  updated_at: string;
  pct: number;
}

const todayISO = () => new Date().toISOString().split('T')[0];

function timeAgo(raw: string): string {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return '';
  const mins = Math.max(1, Math.floor((Date.now() - d.getTime()) / 60000));
  if (mins < 60) return `há ${mins} min`;
  const h = Math.floor(mins / 60);
  if (h < 24) return `há ${h}h`;
  const days = Math.floor(h / 24);
  if (days < 30) return `há ${days}d`;
  const mo = Math.floor(days / 30);
  return `há ${mo} mês${mo > 1 ? 'es' : ''}`;
}

export default function InProgressPage() {
  const [items, setItems] = useState<ProgressItem[]>([]);
  const [playingGames, setPlayingGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    setLoading(true);
    const [tracked, backlog] = await Promise.all([
      Promise.all(TRACKS.map(async (cfg) => {
        const rows = await window.api.db.getAll(cfg.table, 'updated_at DESC');
        return rows.filter((r: any) => r.status === cfg.status).map((r: any): ProgressItem => {
          const current = Number(r[cfg.progressField]) || 0;
          const total = Number(r[cfg.totalField]) || 0;
          return {
            id: r.id, table: cfg.table, config: cfg, title: r.title, cover_url: r.cover_url || '',
            current, total, updated_at: r.updated_at || '',
            pct: total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0,
          };
        });
      })),
      window.api.db.getAll('game_backlog', 'updated_at DESC'),
    ]);
    setItems(tracked.flat());
    setPlayingGames(backlog.filter((g: any) => !!g.currently_playing));
    setLoading(false);
  }

  async function bump(item: ProgressItem) {
    const next = item.current + item.config.step;
    const reachedEnd = item.total > 0 && next >= item.total;
    const patch: Record<string, any> = {
      [item.config.progressField]: reachedEnd ? item.total : next,
      updated_at: new Date().toISOString(),
    };
    if (reachedEnd) { patch.status = 'Concluído'; patch.end_date = todayISO(); }
    await window.api.db.update(item.table, item.id, patch);
    loadAll();
  }

  const totalInProgress = items.length + playingGames.length;

  // Destaque: item com barra mais avançada (mas não terminado)
  const highlight = useMemo(() => {
    const candidates = items.filter(i => i.total > 0 && i.pct > 0 && i.pct < 100);
    if (candidates.length === 0) return null;
    return candidates.sort((a, b) => b.pct - a.pct)[0];
  }, [items]);

  const grouped = useMemo(() => {
    return TRACKS.map(cfg => ({
      cfg,
      list: items.filter(i => i.table === cfg.table && (!highlight || i.id !== highlight.id || i.table !== highlight.table)),
    })).filter(g => g.list.length > 0);
  }, [items, highlight]);

  return (
    <div className="p-6 h-full overflow-y-auto space-y-6">
      {/* Hero */}
      <section className="rounded-3xl border border-dark-700/60 bg-dark-900/70 p-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-accent-500/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.25em] text-dark-400 flex items-center gap-2">
            <Activity size={13} /> Em Andamento
          </p>
          <h1 className="mt-2 text-2xl md:text-3xl font-bold text-dark-100">
            {totalInProgress === 0
              ? 'Nada em andamento agora.'
              : <>Você tem <span className="text-gradient">{totalInProgress}</span> {totalInProgress === 1 ? 'história aberta' : 'histórias abertas'}.</>}
          </h1>
          <p className="mt-2 text-dark-300 text-sm">
            {highlight
              ? <>Mais perto do fim: <span className="text-dark-100 font-semibold">{highlight.title}</span> ({highlight.pct}%). Continue de onde parou.</>
              : 'Marque jogos como "jogando" e séries/livros como "assistindo/lendo" para acompanhar tudo aqui.'}
          </p>
        </div>
      </section>

      {/* Destaque */}
      {highlight && (
        <section className="relative rounded-3xl overflow-hidden border border-dark-700/60 min-h-[180px] flex">
          {highlight.cover_url && (
            <img src={highlight.cover_url} alt="" className="absolute inset-0 w-full h-full object-cover opacity-30 blur-sm scale-110" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-dark-950 via-dark-950/90 to-dark-900/60" />
          <div className="relative flex items-center gap-6 p-6 w-full">
            {highlight.cover_url
              ? <img src={highlight.cover_url} alt="" className="w-28 h-40 object-cover rounded-xl shrink-0 shadow-xl shadow-black/40" />
              : <div className="w-28 h-40 rounded-xl shrink-0 bg-dark-700 flex items-center justify-center text-4xl">{highlight.config.emoji}</div>}
            <div className="min-w-0 flex-1">
              <span className="inline-flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-accent-400">
                <Flame size={12} /> Quase lá • {highlight.config.kind}
              </span>
              <h2 className="text-2xl font-bold text-dark-100 mt-1 line-clamp-2">{highlight.title}</h2>
              <p className="text-xs text-dark-400 mt-1">{highlight.config.unitLabel}: {highlight.current} / {highlight.total} • {timeAgo(highlight.updated_at)}</p>
              <div className="mt-3 max-w-md">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-dark-300">{highlight.pct}%</span>
                  <span className="text-dark-500">faltam {highlight.total - highlight.current} {highlight.config.unitShort}</span>
                </div>
                <div className="h-2.5 bg-dark-700/80 rounded-full overflow-hidden">
                  <div className={`h-full bg-gradient-to-r ${highlight.config.gradient} rounded-full transition-all duration-500`} style={{ width: `${highlight.pct}%` }} />
                </div>
              </div>
              <button onClick={() => bump(highlight)} className="btn-primary text-sm mt-4 inline-flex items-center gap-1.5">
                <Plus size={15} /> +{highlight.config.step} {highlight.config.unitShort}
              </button>
            </div>
          </div>
        </section>
      )}

      {/* Jogos em andamento */}
      {playingGames.length > 0 && (
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-dark-400 mb-2.5 flex items-center gap-1.5">
            <Gamepad2 size={13} className="text-accent-400" /> Jogando agora
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {playingGames.map(g => (
              <div key={g.id} className="stat-card flex items-start gap-3">
                {g.cover_url
                  ? <img src={g.cover_url} alt="" className="w-12 h-16 object-cover rounded shrink-0 bg-dark-700" />
                  : <div className="w-12 h-16 rounded shrink-0 bg-dark-700 flex items-center justify-center text-lg">🎮</div>}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-dark-100 line-clamp-1" title={g.name}>{g.name}</h3>
                  <p className="text-xs text-dark-400 mt-0.5 line-clamp-1">{g.platform || 'PC'} • {g.genre}</p>
                  <span className="inline-block mt-2 text-[10px] px-2 py-0.5 rounded-full bg-accent-500/15 text-accent-400 border border-accent-500/30">
                    🎮 Jogando{g.expected_hours ? ` • ~${g.expected_hours}h` : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Mídia episódica / leitura, por tipo */}
      {grouped.map(({ cfg, list }) => (
        <section key={cfg.table}>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-dark-400 mb-2.5 flex items-center gap-1.5">
            <span className={cfg.ring}>{cfg.icon}</span> {cfg.kind} • {cfg.emoji}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {list.map(item => (
              <div key={`${item.table}-${item.id}`} className="stat-card flex flex-col group">
                <div className="flex items-start gap-3">
                  {item.cover_url
                    ? <img src={item.cover_url} alt="" className="w-12 h-16 object-cover rounded shrink-0 bg-dark-700 group-hover:scale-105 transition-transform" />
                    : <div className="w-12 h-16 rounded shrink-0 bg-dark-700 flex items-center justify-center text-lg">{cfg.emoji}</div>}
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-dark-100 line-clamp-2 leading-tight" title={item.title}>{item.title}</h3>
                    {item.updated_at && <p className="text-[10px] text-dark-500 mt-1">{timeAgo(item.updated_at)}</p>}
                  </div>
                </div>
                <div className="mt-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-dark-400">{cfg.unitLabel}</span>
                    <span className="text-dark-200 font-mono">{item.current} / {item.total || '?'}</span>
                  </div>
                  <div className="w-full h-1.5 bg-dark-700 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${cfg.gradient} rounded-full transition-all duration-300`} style={{ width: `${item.pct}%` }} />
                  </div>
                </div>
                <button onClick={() => bump(item)} className="btn-secondary text-xs py-1.5 mt-3 flex items-center justify-center gap-1.5">
                  <Plus size={13} /> +{cfg.step} {cfg.unitShort}
                </button>
              </div>
            ))}
          </div>
        </section>
      ))}

      {/* Heatmap de atividade */}
      <ActivityHeatmap />

      {!loading && totalInProgress === 0 && (
        <div className="text-center text-dark-500 text-xs pb-4">
          Dica: o mapa acima mostra tudo que você já concluiu ao longo do ano.
        </div>
      )}
    </div>
  );
}
