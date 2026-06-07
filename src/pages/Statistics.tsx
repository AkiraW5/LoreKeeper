import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3, Gamepad2, Clock, Trophy, Star, Layers, CalendarRange,
} from 'lucide-react';
import {
  BarChart, Bar, AreaChart, Area, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { parseTimeToSeconds } from '../lib/utils';

const MEDIA_COLORS: Record<string, string> = {
  games: '#22c55e', movies: '#a855f7', shows: '#ec4899', anime: '#ef4444', manga: '#f59e0b', books: '#06b6d4',
};
const DIFF_COLORS: Record<string, string> = { C: '#22c55e', B: '#3b82f6', A: '#eab308', AA: '#f97316', AAA: '#ef4444' };

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

const tooltipStyle = { background: '#16161c', border: '1px solid #2a2a32', borderRadius: 12, fontSize: 12, color: '#e5e5e5' };

interface Stats {
  kpis: { games: number; hours: number; platinums: number; avgRating: number; totalMedia: number; activeYears: number };
  byYear: any[];
  hoursByYear: { year: string; horas: number }[];
  ratingDist: { nota: string; jogos: number }[];
  genreTop: { name: string; value: number }[];
  platTop: { name: string; value: number }[];
  difficulty: { name: string; value: number }[];
  mediaComparison: { name: string; value: number; key: string }[];
}

export default function StatisticsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    const db = window.api.db;
    const [games, movies, shows, anime, manga, books] = await Promise.all([
      db.query('SELECT completion_date, play_time, rating, console, genre, difficulty, is_gold FROM completed_games'),
      db.query('SELECT watch_date FROM movies'),
      db.query("SELECT end_date FROM tv_shows WHERE status = 'Concluído'"),
      db.query("SELECT end_date FROM animes WHERE status = 'Concluído'"),
      db.query("SELECT end_date FROM manga WHERE status = 'Concluído'"),
      db.query("SELECT end_date FROM books WHERE status = 'Concluído'"),
    ]);

    // Conclusões por ano (todas as mídias)
    const yearMap = new Map<number, any>();
    const add = (y: number | null, key: string) => {
      if (!y) return;
      const e = yearMap.get(y) || { year: y, games: 0, movies: 0, shows: 0, anime: 0, manga: 0, books: 0 };
      e[key]++; yearMap.set(y, e);
    };
    games.forEach((g: any) => add(yearOf(g.completion_date), 'games'));
    movies.forEach((m: any) => add(yearOf(m.watch_date), 'movies'));
    shows.forEach((s: any) => add(yearOf(s.end_date), 'shows'));
    anime.forEach((a: any) => add(yearOf(a.end_date), 'anime'));
    manga.forEach((m: any) => add(yearOf(m.end_date), 'manga'));
    books.forEach((b: any) => add(yearOf(b.end_date), 'books'));
    const byYear = [...yearMap.values()].map(e => ({ ...e, year: String(e.year) })).sort((a, b) => Number(a.year) - Number(b.year));

    // Horas por ano
    const hoursMap = new Map<number, number>();
    let totalSeconds = 0;
    games.forEach((g: any) => {
      const y = yearOf(g.completion_date);
      const sec = parseTimeToSeconds(g.play_time);
      totalSeconds += sec;
      if (y) hoursMap.set(y, (hoursMap.get(y) || 0) + sec);
    });
    const hoursByYear = [...hoursMap.entries()].sort((a, b) => a[0] - b[0]).map(([y, sec]) => ({ year: String(y), horas: Math.round(sec / 3600) }));

    // Distribuição de notas
    const ratingMap = new Map<number, number>();
    games.forEach((g: any) => { const r = Number(g.rating) || 0; if (r > 0) ratingMap.set(r, (ratingMap.get(r) || 0) + 1); });
    const ratingDist = Array.from({ length: 11 }, (_, i) => ({ nota: String(i + 1), jogos: ratingMap.get(i + 1) || 0 }));

    // Top gêneros / plataformas
    const tally = (field: string) => {
      const m = new Map<string, number>();
      games.forEach((g: any) => { const k = String(g[field] || '').trim(); if (k) m.set(k, (m.get(k) || 0) + 1); });
      return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
    };
    const genreTop = tally('genre');
    const platTop = tally('console');

    // Dificuldade
    const diffMap = new Map<string, number>();
    games.forEach((g: any) => { const k = String(g.difficulty || '').toUpperCase(); if (DIFF_COLORS[k]) diffMap.set(k, (diffMap.get(k) || 0) + 1); });
    const difficulty = ['C', 'B', 'A', 'AA', 'AAA'].map(name => ({ name, value: diffMap.get(name) || 0 })).filter(d => d.value > 0);

    // Comparativo de mídias
    const mediaComparison = [
      { name: 'Jogos', value: games.length, key: 'games' },
      { name: 'Filmes', value: movies.length, key: 'movies' },
      { name: 'Séries', value: shows.length, key: 'shows' },
      { name: 'Animes', value: anime.length, key: 'anime' },
      { name: 'Mangás', value: manga.length, key: 'manga' },
      { name: 'Livros', value: books.length, key: 'books' },
    ].filter(m => m.value > 0);

    const ratings = games.map((g: any) => Number(g.rating) || 0).filter((n: number) => n > 0);
    const avgRating = ratings.length ? ratings.reduce((a: number, b: number) => a + b, 0) / ratings.length : 0;
    const activeYears = new Set<number>();
    [...yearMap.keys()].forEach(y => activeYears.add(y));

    setStats({
      kpis: {
        games: games.length,
        hours: Math.round(totalSeconds / 3600),
        platinums: games.filter((g: any) => !!g.is_gold).length,
        avgRating: Math.round(avgRating * 10) / 10,
        totalMedia: games.length + movies.length + shows.length + anime.length + manga.length + books.length,
        activeYears: activeYears.size,
      },
      byYear, hoursByYear, ratingDist, genreTop, platTop, difficulty, mediaComparison,
    });
    setLoading(false);
  }

  const kpiCards = useMemo(() => stats ? [
    { icon: <Gamepad2 size={18} />, color: '#22c55e', label: 'Jogos zerados', value: stats.kpis.games },
    { icon: <Clock size={18} />, color: '#3b82f6', label: 'Horas de jogo', value: `${stats.kpis.hours}h` },
    { icon: <Trophy size={18} />, color: '#eab308', label: 'Platinas / 100%', value: stats.kpis.platinums },
    { icon: <Star size={18} />, color: '#ec4899', label: 'Nota média', value: stats.kpis.avgRating || '—' },
    { icon: <Layers size={18} />, color: '#a855f7', label: 'Total de mídias', value: stats.kpis.totalMedia },
    { icon: <CalendarRange size={18} />, color: '#06b6d4', label: 'Anos ativos', value: stats.kpis.activeYears },
  ] : [], [stats]);

  if (loading) {
    return <div className="flex items-center justify-center h-full"><div className="animate-spin w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full" /></div>;
  }
  if (!stats) return null;

  return (
    <div className="p-6 h-full overflow-y-auto space-y-6">
      {/* Hero */}
      <section className="rounded-3xl border border-dark-700/60 bg-dark-900/70 p-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-accent-500/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.25em] text-dark-400 flex items-center gap-2"><BarChart3 size={13} /> Estatísticas</p>
          <h1 className="mt-2 text-2xl md:text-3xl font-bold text-dark-100">Seus números, <span className="text-gradient">em gráficos</span>.</h1>
          <p className="mt-2 text-dark-300 text-sm">Tudo que você concluiu, visualizado por ano, nota, gênero, plataforma e mídia.</p>
        </div>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
        {kpiCards.map((k, i) => (
          <div key={i} className="rounded-2xl border p-4" style={{ borderColor: `${k.color}30`, background: `linear-gradient(135deg, ${k.color}12, transparent 75%)` }}>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: `${k.color}22`, color: k.color }}>{k.icon}</div>
            <p className="text-2xl font-black text-dark-100 mt-2 leading-none">{k.value}</p>
            <p className="text-[11px] text-dark-400 mt-1">{k.label}</p>
          </div>
        ))}
      </div>

      {/* Conclusões por ano */}
      <ChartCard title="Conclusões por ano" subtitle="todas as mídias">
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={stats.byYear}>
            <CartesianGrid strokeDasharray="3 3" stroke="#23232a" vertical={false} />
            <XAxis dataKey="year" tick={{ fill: '#8a8a93', fontSize: 11 }} axisLine={{ stroke: '#2a2a32' }} tickLine={false} />
            <YAxis tick={{ fill: '#8a8a93', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
            <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#ffffff08' }} />
            {(['games', 'movies', 'shows', 'anime', 'manga', 'books'] as const).map(k => (
              <Bar key={k} dataKey={k} stackId="a" fill={MEDIA_COLORS[k]} radius={k === 'books' ? [3, 3, 0, 0] : undefined as any} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Horas por ano */}
        <ChartCard title="Horas de jogo por ano">
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={stats.hoursByYear}>
              <defs>
                <linearGradient id="hoursGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.6} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#23232a" vertical={false} />
              <XAxis dataKey="year" tick={{ fill: '#8a8a93', fontSize: 11 }} axisLine={{ stroke: '#2a2a32' }} tickLine={false} />
              <YAxis tick={{ fill: '#8a8a93', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ stroke: '#3b82f6', strokeOpacity: 0.3 }} />
              <Area type="monotone" dataKey="horas" stroke="#3b82f6" strokeWidth={2} fill="url(#hoursGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Distribuição de notas */}
        <ChartCard title="Distribuição de notas" subtitle="jogos zerados">
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.ratingDist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#23232a" vertical={false} />
              <XAxis dataKey="nota" tick={{ fill: '#8a8a93', fontSize: 11 }} axisLine={{ stroke: '#2a2a32' }} tickLine={false} />
              <YAxis tick={{ fill: '#8a8a93', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#ffffff08' }} />
              <Bar dataKey="jogos" radius={[3, 3, 0, 0]}>
                {stats.ratingDist.map((r, i) => {
                  const n = Number(r.nota);
                  const fill = n >= 10 ? '#eab308' : n >= 8 ? '#22c55e' : n >= 6 ? '#3b82f6' : n >= 4 ? '#f97316' : '#ef4444';
                  return <Cell key={i} fill={fill} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top gêneros */}
        <ChartCard title="Top gêneros" subtitle="jogos">
          <ResponsiveContainer width="100%" height={Math.max(180, stats.genreTop.length * 30)}>
            <BarChart data={stats.genreTop} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#23232a" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#8a8a93', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#c5c5cc', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#ffffff08' }} />
              <Bar dataKey="value" fill="#a855f7" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Top plataformas */}
        <ChartCard title="Top plataformas" subtitle="jogos">
          <ResponsiveContainer width="100%" height={Math.max(180, stats.platTop.length * 30)}>
            <BarChart data={stats.platTop} layout="vertical" margin={{ left: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#23232a" horizontal={false} />
              <XAxis type="number" tick={{ fill: '#8a8a93', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fill: '#c5c5cc', fontSize: 11 }} axisLine={false} tickLine={false} width={90} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#ffffff08' }} />
              <Bar dataKey="value" fill="#22c55e" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        {/* Dificuldade */}
        {stats.difficulty.length > 0 && (
          <ChartCard title="Dificuldade dos jogos">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={stats.difficulty}>
                <CartesianGrid strokeDasharray="3 3" stroke="#23232a" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: '#8a8a93', fontSize: 11 }} axisLine={{ stroke: '#2a2a32' }} tickLine={false} />
                <YAxis tick={{ fill: '#8a8a93', fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={tooltipStyle} cursor={{ fill: '#ffffff08' }} />
                <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                  {stats.difficulty.map((d, i) => <Cell key={i} fill={DIFF_COLORS[d.name]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        )}

        {/* Comparativo de mídias */}
        {stats.mediaComparison.length > 0 && (
          <ChartCard title="Comparativo de mídias" subtitle="itens concluídos">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={stats.mediaComparison} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={2}>
                  {stats.mediaComparison.map((m, i) => <Cell key={i} fill={MEDIA_COLORS[m.key]} stroke="#0a0a0e" strokeWidth={2} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
              {stats.mediaComparison.map((m, i) => (
                <span key={i} className="text-[11px] text-dark-400 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm" style={{ background: MEDIA_COLORS[m.key] }} /> {m.name} ({m.value})
                </span>
              ))}
            </div>
          </ChartCard>
        )}
      </div>
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="stat-card">
      <div className="flex items-baseline gap-2 mb-4">
        <h3 className="text-sm font-semibold text-dark-200">{title}</h3>
        {subtitle && <span className="text-xs text-dark-500">— {subtitle}</span>}
      </div>
      {children}
    </section>
  );
}
