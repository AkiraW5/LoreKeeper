import React, { useEffect, useMemo, useState } from 'react';
import { Flag, Save, Pencil, Layers, Clock, Compass, Award, Sparkles } from 'lucide-react';
import { AnnualChallenge } from '../types';
import { generateId, parseTimeToSeconds } from '../lib/utils';

const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

type ChallengeType = 'volume' | 'time' | 'variety' | 'quality';

const TYPE_META: Record<ChallengeType, { label: string; icon: React.ReactNode; color: string; desc: string }> = {
  volume: { label: 'Volume', icon: <Layers size={16} />, color: '#22c55e', desc: 'Quantidade concluída no ano' },
  time: { label: 'Tempo & Esforço', icon: <Clock size={16} />, color: '#3b82f6', desc: 'Horas e páginas acumuladas' },
  variety: { label: 'Variedade', icon: <Compass size={16} />, color: '#a855f7', desc: 'Saia da zona de conforto' },
  quality: { label: 'Qualidade & Desafio', icon: <Award size={16} />, color: '#f59e0b', desc: 'Para os hardcore' },
};

interface ChallengeDef {
  key: string; type: ChallengeType; emoji: string; label: string; unit: string;
  metric: string; def: number; scale: boolean; project: boolean; gauge?: boolean;
}

const CATALOG: ChallengeDef[] = [
  { key: 'vol_games', type: 'volume', emoji: '🎮', label: 'Zerar jogos', unit: 'jogos', metric: 'games', def: 12, scale: true, project: true },
  { key: 'vol_movies', type: 'volume', emoji: '🎬', label: 'Assistir filmes', unit: 'filmes', metric: 'movies', def: 12, scale: true, project: true },
  { key: 'vol_books', type: 'volume', emoji: '📚', label: 'Ler livros', unit: 'livros', metric: 'books', def: 6, scale: true, project: true },
  { key: 'vol_shows', type: 'volume', emoji: '📺', label: 'Concluir séries', unit: 'séries', metric: 'shows', def: 6, scale: true, project: true },
  { key: 'vol_anime', type: 'volume', emoji: '🍥', label: 'Concluir animes', unit: 'animes', metric: 'anime', def: 8, scale: true, project: true },
  { key: 'time_hours', type: 'time', emoji: '⏱️', label: 'Horas de jogo', unit: 'h', metric: 'hours', def: 200, scale: true, project: true },
  { key: 'time_pages', type: 'time', emoji: '📖', label: 'Páginas lidas', unit: 'págs', metric: 'pages', def: 2000, scale: true, project: true },
  { key: 'var_genres', type: 'variety', emoji: '🎨', label: 'Gêneros de jogos diferentes', unit: 'gêneros', metric: 'genres', def: 8, scale: false, project: false },
  { key: 'var_platforms', type: 'variety', emoji: '🕹️', label: 'Plataformas diferentes', unit: 'plat.', metric: 'platforms', def: 5, scale: false, project: false },
  { key: 'var_media', type: 'variety', emoji: '🧬', label: 'Mídias diferentes', unit: 'mídias', metric: 'mediaVariety', def: 6, scale: false, project: false },
  { key: 'qual_aaa', type: 'quality', emoji: '💀', label: 'Jogos AAA zerados', unit: 'jogos', metric: 'aaa', def: 5, scale: true, project: false },
  { key: 'qual_plat', type: 'quality', emoji: '🏆', label: 'Platinas / 100%', unit: 'platinas', metric: 'plat', def: 5, scale: true, project: false },
  { key: 'qual_marathon', type: 'quality', emoji: '🎞️', label: 'Séries/animes maratonados', unit: 'maratonas', metric: 'marathon', def: 5, scale: true, project: false },
  { key: 'qual_avg', type: 'quality', emoji: '⭐', label: 'Nota média dos jogos', unit: '/11', metric: 'avg', def: 8, scale: false, project: false, gauge: true },
];

function parseDateSafe(raw: any): Date | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (br) { const d2 = new Date(`${br[3]}-${br[2]}-${br[1]}`); if (!Number.isNaN(d2.getTime())) return d2; }
  return null;
}
const yearOf = (raw: any): number | null => parseDateSafe(raw)?.getFullYear() ?? null;

type Metrics = Record<string, number>;

function computeMetrics(year: number, data: any): Metrics {
  const g = data.games.filter((x: any) => yearOf(x.completion_date) === year);
  const mv = data.movies.filter((x: any) => yearOf(x.watch_date) === year);
  const sh = data.shows.filter((x: any) => x.status === 'Concluído' && yearOf(x.end_date) === year);
  const an = data.anime.filter((x: any) => x.status === 'Concluído' && yearOf(x.end_date) === year);
  const mg = data.manga.filter((x: any) => x.status === 'Concluído' && yearOf(x.end_date) === year);
  const bk = data.books.filter((x: any) => x.status === 'Concluído' && yearOf(x.end_date) === year);
  const hours = g.reduce((s: number, x: any) => s + parseTimeToSeconds(x.play_time), 0) / 3600;
  const pages = bk.reduce((s: number, x: any) => s + (Number(x.total_pages) || 0), 0);
  const ratings = g.map((x: any) => Number(x.rating) || 0).filter((n: number) => n > 0);
  const avg = ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0;
  return {
    games: g.length, movies: mv.length, shows: sh.length, anime: an.length, manga: mg.length, books: bk.length,
    hours: Math.round(hours), pages,
    aaa: g.filter((x: any) => String(x.difficulty || '').toUpperCase() === 'AAA').length,
    plat: g.filter((x: any) => !!x.is_gold).length,
    avg: Math.round(avg * 10) / 10,
    genres: new Set(g.map((x: any) => String(x.genre || '').trim()).filter(Boolean)).size,
    platforms: new Set(g.map((x: any) => String(x.console || '').trim()).filter(Boolean)).size,
    marathon: sh.length + an.length,
    mediaVariety: [g.length, mv.length, sh.length, an.length, mg.length, bk.length].filter((n: number) => n >= 1).length,
  };
}

function Ring({ pct, color, size = 72, stroke = 6 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(1, pct / 100));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0 -rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2a2a30" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 700ms ease' }} />
    </svg>
  );
}

export default function ChallengePage() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [data, setData] = useState<any | null>(null);
  const [overrides, setOverrides] = useState<Record<string, AnnualChallenge>>({});
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, number>>({});

  useEffect(() => { loadData(); }, [year]);

  async function loadData() {
    const db = window.api.db;
    const [games, movies, shows, anime, manga, books, challenges] = await Promise.all([
      db.query('SELECT completion_date, play_time, rating, console, genre, difficulty, is_gold FROM completed_games'),
      db.query('SELECT watch_date FROM movies'),
      db.query('SELECT status, end_date FROM tv_shows'),
      db.query('SELECT status, end_date FROM animes'),
      db.query('SELECT status, end_date FROM manga'),
      db.query('SELECT status, end_date, total_pages FROM books'),
      db.query('SELECT * FROM annual_challenges WHERE year = ?', [year]),
    ]);
    const ov: Record<string, AnnualChallenge> = {};
    for (const ch of challenges as AnnualChallenge[]) ov[ch.category] = ch;
    setData({ games, movies, shows, anime, manga, books });
    setOverrides(ov);
  }

  const metrics = useMemo(() => data ? computeMetrics(year, data) : null, [data, year]);
  const prevMetrics = useMemo(() => data ? computeMetrics(year - 1, data) : null, [data, year]);

  function autoTarget(ch: ChallengeDef): number {
    if (ch.gauge) return ch.def;
    const prev = prevMetrics?.[ch.metric] || 0;
    if (ch.scale && prev > 0) {
      const round = (ch.metric === 'pages' || ch.metric === 'hours') ? 10 : 1;
      return Math.max(ch.def, Math.ceil((prev * 1.1) / round) * round);
    }
    return ch.def;
  }
  function effectiveTarget(ch: ChallengeDef): number {
    const ov = overrides[ch.key];
    return ov ? ov.target : autoTarget(ch);
  }

  function startEdit() {
    const d: Record<string, number> = {};
    for (const ch of CATALOG) d[ch.key] = effectiveTarget(ch);
    setDraft(d); setEditing(true);
  }
  async function saveTargets() {
    const now = new Date().toISOString();
    for (const ch of CATALOG) {
      const value = Math.max(0, Math.floor(draft[ch.key] || 0));
      const ex = overrides[ch.key];
      if (ex) await window.api.db.update('annual_challenges', ex.id, { target: value, updated_at: now });
      else await window.api.db.insert('annual_challenges', { id: generateId(), year, category: ch.key, target: value, created_at: now, updated_at: now });
    }
    setEditing(false); loadData();
  }

  function paceLabel(ch: ChallengeDef, current: number, target: number) {
    if (target <= 0) return { text: 'sem meta', cls: 'text-dark-500' };
    if (current >= target) return { text: '🎉 concluído!', cls: 'text-green-400' };
    if (year < currentYear) return { text: `faltaram ${Math.round(target - current)}`, cls: 'text-dark-500' };
    if (year > currentYear) return { text: 'meta futura', cls: 'text-dark-500' };
    const start = new Date(year, 0, 1).getTime();
    const now = Date.now();
    const daysElapsed = Math.max(1, Math.floor((now - start) / 86400000));
    if (ch.project && current > 0) {
      const daysNeeded = target / (current / daysElapsed);
      const daysInYear = ((year % 4 === 0 && year % 100 !== 0) || year % 400 === 0) ? 366 : 365;
      if (daysNeeded <= daysInYear) {
        const d = new Date(start + daysNeeded * 86400000);
        return { text: `no ritmo: fecha em ${MONTHS_SHORT[d.getMonth()]}`, cls: 'text-green-400' };
      }
      return { text: 'fora do ritmo', cls: 'text-orange-400' };
    }
    const frac = (now - start) / (new Date(year + 1, 0, 1).getTime() - start);
    const diff = current - target * frac;
    if (diff >= 0.5) return { text: 'à frente', cls: 'text-green-400' };
    if (diff <= -0.5) return { text: 'atrás do ritmo', cls: 'text-orange-400' };
    return { text: 'no ritmo', cls: 'text-accent-400' };
  }

  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const summary = useMemo(() => {
    if (!metrics) return { done: 0, total: 0, pct: 0 };
    let done = 0, total = 0;
    for (const ch of CATALOG) {
      const t = effectiveTarget(ch);
      if (t <= 0) continue;
      total++;
      if ((metrics[ch.metric] || 0) >= t) done++;
    }
    return { done, total, pct: total > 0 ? (done / total) * 100 : 0 };
  }, [metrics, overrides, prevMetrics]);

  return (
    <div className="p-6 h-full overflow-y-auto space-y-6">
      {/* Hero com anel geral */}
      <section className="rounded-3xl border border-dark-700/60 bg-dark-900/70 p-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-accent-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-12 w-56 h-56 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <div className="relative">
              <Ring pct={summary.pct} color="#6366f1" size={88} stroke={7} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-black text-dark-100 leading-none">{summary.done}</span>
                <span className="text-[9px] text-dark-400">de {summary.total}</span>
              </div>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.25em] text-dark-400 flex items-center gap-2"><Flag size={13} /> Quadro de Desafios</p>
              <h1 className="mt-1 text-2xl md:text-3xl font-bold text-dark-100">Desafio <span className="text-gradient">{year}</span></h1>
              <p className="mt-1 text-dark-300 text-sm flex items-center gap-1.5">
                <Sparkles size={13} className="text-yellow-400" />
                {summary.total > 0
                  ? <><span className="text-dark-100 font-semibold">{summary.done}/{summary.total}</span> desafios concluídos — metas automáticas pelo seu histórico.</>
                  : 'Metas sugeridas automaticamente — ajuste como quiser.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="select-field w-28 text-sm py-2">
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
            {editing
              ? <button onClick={saveTargets} className="btn-primary flex items-center gap-2"><Save size={16} /> Salvar</button>
              : <button onClick={startEdit} className="btn-secondary flex items-center gap-2"><Pencil size={16} /> Ajustar metas</button>}
          </div>
        </div>
      </section>

      {/* Desafios por tipo */}
      {(Object.keys(TYPE_META) as ChallengeType[]).map(type => {
        const meta = TYPE_META[type];
        const list = CATALOG.filter(c => c.type === type);
        return (
          <section key={type}>
            <div className="flex items-center gap-2 mb-3">
              <span style={{ color: meta.color }}>{meta.icon}</span>
              <h2 className="text-sm font-semibold text-dark-200">{meta.label}</h2>
              <span className="text-xs text-dark-500">— {meta.desc}</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {list.map(ch => {
                const current = metrics?.[ch.metric] ?? 0;
                const target = effectiveTarget(ch);
                const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
                const done = target > 0 && current >= target;
                const pace = paceLabel(ch, current, target);
                return (
                  <div key={ch.key}
                    className="rounded-2xl border p-4 flex items-center gap-4 transition-all hover:shadow-lg"
                    style={{
                      borderColor: done ? '#22c55e66' : `${meta.color}2e`,
                      background: done ? 'linear-gradient(135deg, #22c55e16, transparent 70%)' : `linear-gradient(135deg, ${meta.color}0f, transparent 70%)`,
                    }}>
                    <div className="relative">
                      <Ring pct={pct} color={done ? '#22c55e' : meta.color} />
                      <div className="absolute inset-0 flex items-center justify-center text-lg">{ch.emoji}</div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-dark-100 text-sm leading-tight">{ch.label}</h3>
                      {editing ? (
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="text-sm text-dark-400 font-mono">{ch.gauge ? current.toFixed(1) : current} /</span>
                          <input type="number" min={0} value={draft[ch.key] ?? 0}
                            onChange={e => setDraft(d => ({ ...d, [ch.key]: parseInt(e.target.value) || 0 }))}
                            className="input-field w-20 py-1 text-sm" />
                          <span className="text-xs text-dark-500">{ch.unit}</span>
                        </div>
                      ) : (
                        <>
                          <p className="text-xl font-black text-dark-100 leading-tight mt-0.5">
                            {ch.gauge ? current.toFixed(1) : current}
                            <span className="text-xs font-medium text-dark-400"> / {target || '—'} {ch.unit}</span>
                          </p>
                          <p className={`text-xs font-medium mt-0.5 ${pace.cls}`}>{pace.text}</p>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </div>
  );
}
