import React, { useEffect, useMemo, useState } from 'react';
import {
  Gamepad2, Film, Tv, Play, BookOpen, Library, Clock, Star, Sparkles, Layers3,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { RATING_LABELS } from '../types';
import { parseTimeToSeconds, secondsToTimeStr } from '../lib/utils';

type DashboardTab = 'games' | 'media' | 'general';

type MediaRecentItem = {
  id: string;
  title: string;
  cover_url?: string;
  kind: 'Filme' | 'Serie' | 'Anime' | 'Manga' | 'Livro';
  updated_at: string;
};

interface YearItem {
  year: string;
  count: number;
  hours: number;
  games: any[];
}

interface DashboardStats {
  totalGames: number;
  totalHours: number;
  totalPlayTime: string;
  totalMovies: number;
  totalShows: number;
  totalAnime: number;
  totalManga: number;
  totalBooks: number;
  yearsSpan: number;
  gamesByYear: YearItem[];
  gamesByRating: { rating: string; count: number }[];
  recentGames: any[];
  insightLines: string[];
  mediaHeroHours: number;
  mediaInsights: string[];
  mediaRecent: MediaRecentItem[];
}

function parseDateSafe(raw: string): Date | null {
  if (!raw) return null;

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;

  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw.trim());
  if (br) {
    const [, dd, mm, yyyy] = br;
    const fromBr = new Date(`${yyyy}-${mm}-${dd}`);
    if (!Number.isNaN(fromBr.getTime())) return fromBr;
  }

  return null;
}

function normalizeDateValue(raw: unknown): number {
  return parseDateSafe(String(raw || ''))?.getTime() || 0;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [hoveredYear, setHoveredYear] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DashboardTab>('games');

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const db = window.api.db;

      const [
        games,
        moviesCount,
        showsCount,
        animeCount,
        mangaCount,
        booksCount,
        moviesRaw,
        showsRaw,
        animeRaw,
        mangaRaw,
        booksRaw,
      ] = await Promise.all([
        db.query('SELECT id, name, console, genre, completion_date, play_time, rating, difficulty, cover_url FROM completed_games'),
        db.query('SELECT COUNT(*) as count FROM movies'),
        db.query('SELECT COUNT(*) as count FROM tv_shows'),
        db.query('SELECT COUNT(*) as count FROM animes'),
        db.query('SELECT COUNT(*) as count FROM manga'),
        db.query('SELECT COUNT(*) as count FROM books'),
        db.query('SELECT id, title, cover_url, updated_at, duration_min, status FROM movies ORDER BY updated_at DESC LIMIT 18'),
        db.query('SELECT id, title, cover_url, updated_at, episodes_watched, status FROM tv_shows ORDER BY updated_at DESC LIMIT 18'),
        db.query('SELECT id, title, cover_url, updated_at, episodes_watched, status FROM animes ORDER BY updated_at DESC LIMIT 18'),
        db.query('SELECT id, title, cover_url, updated_at, chapters_read, status FROM manga ORDER BY updated_at DESC LIMIT 12'),
        db.query('SELECT id, title, cover_url, updated_at, pages_read, status FROM books ORDER BY updated_at DESC LIMIT 12'),
      ]);

      const totalSeconds = games.reduce((acc: number, g: any) => acc + parseTimeToSeconds(g.play_time), 0);
      const totalHours = Math.round(totalSeconds / 3600);

      const orderedByDate = [...games].sort((a: any, b: any) => normalizeDateValue(b.completion_date) - normalizeDateValue(a.completion_date));
      const recentGames = orderedByDate.slice(0, 6);

      const yearMap = new Map<string, { count: number; seconds: number; games: any[] }>();
      games.forEach((g: any) => {
        const date = parseDateSafe(g.completion_date);
        const year = date ? date.getFullYear().toString() : 'N/A';
        const current = yearMap.get(year) || { count: 0, seconds: 0, games: [] };
        current.count += 1;
        current.seconds += parseTimeToSeconds(g.play_time);
        current.games.push(g);
        yearMap.set(year, current);
      });

      const gamesByYear: YearItem[] = Array.from(yearMap.entries())
        .map(([year, data]) => ({
          year,
          count: data.count,
          hours: Math.round(data.seconds / 3600),
          games: data.games
            .sort((a: any, b: any) => normalizeDateValue(b.completion_date) - normalizeDateValue(a.completion_date))
            .slice(0, 10),
        }))
        .sort((a, b) => a.year.localeCompare(b.year));

      const yearsOnly = gamesByYear.map(y => Number(y.year)).filter(y => Number.isFinite(y));
      const yearsSpan = yearsOnly.length > 0 ? (Math.max(...yearsOnly) - Math.min(...yearsOnly) + 1) : 0;

      const ratingMap = new Map<number, number>();
      games.forEach((g: any) => {
        const rating = Number(g.rating) || 0;
        if (rating > 0) ratingMap.set(rating, (ratingMap.get(rating) || 0) + 1);
      });

      const gamesByRating = Array.from(ratingMap.entries())
        .map(([rating, count]) => ({ rating: `${rating} (${RATING_LABELS[rating] || ''})`, count }))
        .sort((a, b) => parseInt(b.rating) - parseInt(a.rating));

      const difficultCount = games.filter((g: any) => ['AA', 'AAA'].includes(String(g.difficulty || '').toUpperCase())).length;
      const difficultPct = games.length > 0 ? Math.round((difficultCount / games.length) * 100) : 0;

      const rpgGames = games.filter((g: any) => String(g.genre || '').toLowerCase().includes('rpg'));
      const nonRpgGames = games.filter((g: any) => !String(g.genre || '').toLowerCase().includes('rpg'));
      const avgRpg = rpgGames.length > 0
        ? rpgGames.reduce((sum: number, g: any) => sum + parseTimeToSeconds(g.play_time), 0) / rpgGames.length
        : 0;
      const avgNonRpg = nonRpgGames.length > 0
        ? nonRpgGames.reduce((sum: number, g: any) => sum + parseTimeToSeconds(g.play_time), 0) / nonRpgGames.length
        : 0;

      const secondSemesterCount = games.filter((g: any) => {
        const d = parseDateSafe(g.completion_date);
        return d ? (d.getMonth() + 1) >= 7 : false;
      }).length;
      const secondSemesterPct = games.length > 0 ? Math.round((secondSemesterCount / games.length) * 100) : 0;

      const consoleMap = new Map<string, number>();
      games.forEach((g: any) => {
        const key = String(g.console || '').trim() || 'N/A';
        consoleMap.set(key, (consoleMap.get(key) || 0) + 1);
      });
      const topConsole = Array.from(consoleMap.entries()).sort((a, b) => b[1] - a[1])[0];

      const gameInsights: string[] = [];
      if (games.length > 0) gameInsights.push(`Você tende a desafios altos: ${difficultPct}% dos jogos estão em AA ou AAA.`);
      if (rpgGames.length >= 2 && nonRpgGames.length >= 2 && avgNonRpg > 0) {
        const ratio = avgRpg / avgNonRpg;
        if (ratio >= 1.8) gameInsights.push(`Seus RPGs duram quase ${ratio.toFixed(1)}x mais que os outros gêneros.`);
      }
      if (games.length > 0) gameInsights.push(`Seu ritmo cresce no segundo semestre: ${secondSemesterPct}% das conclusões acontecem de julho a dezembro.`);
      if (topConsole) gameInsights.push(`Sua casa principal é ${topConsole[0]} com ${topConsole[1]} jogos concluídos.`);

      const moviesMinutes = moviesRaw.reduce((sum: number, m: any) => sum + (Number(m.duration_min) || 0), 0);
      const showsMinutes = showsRaw.reduce((sum: number, s: any) => sum + ((Number(s.episodes_watched) || 0) * 45), 0);
      const animeMinutes = animeRaw.reduce((sum: number, a: any) => sum + ((Number(a.episodes_watched) || 0) * 24), 0);
      const mediaHeroHours = Math.round((moviesMinutes + showsMinutes + animeMinutes) / 60);

      const mediaRecent: MediaRecentItem[] = [
        ...moviesRaw.map((m: any) => ({ id: `movie-${m.id}`, title: m.title, cover_url: m.cover_url, kind: 'Filme' as const, updated_at: m.updated_at })),
        ...showsRaw.map((s: any) => ({ id: `show-${s.id}`, title: s.title, cover_url: s.cover_url, kind: 'Serie' as const, updated_at: s.updated_at })),
        ...animeRaw.map((a: any) => ({ id: `anime-${a.id}`, title: a.title, cover_url: a.cover_url, kind: 'Anime' as const, updated_at: a.updated_at })),
        ...mangaRaw.map((m: any) => ({ id: `manga-${m.id}`, title: m.title, cover_url: m.cover_url, kind: 'Manga' as const, updated_at: m.updated_at })),
        ...booksRaw.map((b: any) => ({ id: `book-${b.id}`, title: b.title, cover_url: b.cover_url, kind: 'Livro' as const, updated_at: b.updated_at })),
      ]
        .sort((a, b) => normalizeDateValue(b.updated_at) - normalizeDateValue(a.updated_at))
        .slice(0, 12);

      const screenTotal = moviesRaw.length + showsRaw.length + animeRaw.length;
      const seriesShare = screenTotal > 0 ? Math.round(((showsRaw.length + animeRaw.length) / screenTotal) * 100) : 0;
      const readingTotal = mangaRaw.length + booksRaw.length;
      const mediaInsights: string[] = [
        `Seu universo audiovisual soma cerca de ${mediaHeroHours} horas estimadas de tela.`,
        `${seriesShare}% do seu consumo de tela recente vem de histórias seriadas (séries + animes).`,
        `Seu catálogo literário atual tem ${readingTotal} títulos entre mangás e livros.`,
        `Você mantém ${moviesRaw.length} filmes, ${showsRaw.length} séries e ${animeRaw.length} animes no ecossistema.`,
      ];

      setStats({
        totalGames: games.length,
        totalHours,
        totalPlayTime: secondsToTimeStr(totalSeconds),
        totalMovies: moviesCount[0]?.count || 0,
        totalShows: showsCount[0]?.count || 0,
        totalAnime: animeCount[0]?.count || 0,
        totalManga: mangaCount[0]?.count || 0,
        totalBooks: booksCount[0]?.count || 0,
        yearsSpan,
        gamesByYear,
        gamesByRating,
        recentGames,
        insightLines: gameInsights.slice(0, 4),
        mediaHeroHours,
        mediaInsights: mediaInsights.slice(0, 4),
        mediaRecent,
      });
    } catch (err) {
      console.error('Erro ao carregar stats:', err);
    } finally {
      setLoading(false);
    }
  }

  const totalItems = useMemo(() => {
    if (!stats) return 0;
    return stats.totalGames + stats.totalMovies + stats.totalShows + stats.totalAnime + stats.totalManga + stats.totalBooks;
  }, [stats]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!stats) return null;

  const activeYear = hoveredYear
    ? stats.gamesByYear.find(y => y.year === hoveredYear)
    : stats.gamesByYear[stats.gamesByYear.length - 1];

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      <div className="flex flex-wrap gap-2">
        <TabButton
          icon={<Gamepad2 size={16} />}
          label="Jogos"
          active={activeTab === 'games'}
          onClick={() => setActiveTab('games')}
        />
        <TabButton
          icon={<Film size={16} />}
          label="Mídias"
          active={activeTab === 'media'}
          onClick={() => setActiveTab('media')}
        />
        <TabButton
          icon={<Layers3 size={16} />}
          label="Geral"
          active={activeTab === 'general'}
          onClick={() => setActiveTab('general')}
        />
      </div>

      {activeTab === 'games' && (
        <>
          <section className="relative overflow-hidden rounded-3xl border border-dark-700/60 min-h-[280px]">
            <div className="absolute inset-0 grid grid-cols-3 md:grid-cols-6">
              {stats.recentGames.length > 0 ? stats.recentGames.map((g: any) => (
                <div key={g.id} className="relative">
                  {g.cover_url ? (
                    <img src={g.cover_url} alt={g.name} className="w-full h-full object-cover blur-[2px] scale-110 opacity-60" />
                  ) : (
                    <div className="w-full h-full bg-dark-800" />
                  )}
                </div>
              )) : (
                <div className="col-span-full bg-gradient-to-r from-dark-900 via-dark-800 to-dark-900" />
              )}
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-dark-950/75 via-dark-950/70 to-dark-950/95" />

            <div className="relative z-10 h-full px-6 py-8 md:px-10 md:py-10 flex flex-col justify-center">
              <p className="text-xs uppercase tracking-[0.25em] text-dark-300">Sua Jornada</p>
              <h1 className="mt-3 text-5xl md:text-7xl font-black text-dark-50 leading-none">{stats.totalHours}h</h1>
              <p className="mt-2 text-sm md:text-base text-dark-300">
                {stats.totalHours} horas em {stats.totalGames} jogos ao longo de {stats.yearsSpan || 1} {stats.yearsSpan === 1 ? 'ano' : 'anos'}.
              </p>
            </div>
          </section>

          <section className="stat-card">
            <div className="flex items-center justify-between mb-5 gap-3">
              <h2 className="text-lg font-semibold text-dark-100">Linha do Tempo da Sua História</h2>
              {activeYear && <span className="text-xs text-dark-400">Ano em foco: {activeYear.year}</span>}
            </div>

            {stats.gamesByYear.length > 0 ? (
              <>
                <div className="relative pb-6">
                  <div className="absolute left-0 right-0 top-5 h-px bg-dark-700" />
                  <div className="relative flex items-start justify-between gap-2 overflow-x-auto pb-2">
                    {stats.gamesByYear.map((item) => {
                      const isActive = activeYear?.year === item.year;
                      return (
                        <button
                          key={item.year}
                          onMouseEnter={() => setHoveredYear(item.year)}
                          onFocus={() => setHoveredYear(item.year)}
                          onClick={() => setHoveredYear(item.year)}
                          className="group min-w-[84px] text-center"
                        >
                          <div className={`mx-auto w-4 h-4 rounded-full border-2 transition-all ${isActive ? 'bg-accent-500 border-accent-300 shadow-lg shadow-accent-500/30' : 'bg-dark-800 border-dark-500 group-hover:border-accent-400'}`} />
                          <p className={`mt-3 text-xs ${isActive ? 'text-dark-100' : 'text-dark-400'}`}>{item.year}</p>
                          <p className="text-[11px] text-dark-500">{item.count} jogos</p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {activeYear && (
                  <div className="rounded-2xl border border-dark-700/60 bg-dark-900/50 p-4">
                    <p className="text-sm text-dark-200 mb-3">{activeYear.year}: {activeYear.count} jogos, {activeYear.hours}h</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                      {activeYear.games.slice(0, 6).map((g: any) => (
                        <div key={g.id} className="group">
                          <div className="aspect-[2/3] rounded-lg overflow-hidden bg-dark-800 border border-dark-700/70">
                            {g.cover_url ? (
                              <img src={g.cover_url} alt={g.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[10px] text-dark-500">Sem capa</div>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] text-dark-300 line-clamp-1" title={g.name}>{g.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-dark-400">Ainda sem jogos para montar a timeline.</p>
            )}
          </section>

          <section className="rounded-2xl border border-dark-700/60 bg-gradient-to-r from-dark-900/90 via-dark-800/70 to-dark-900/90 p-4 flex items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-wider text-dark-400">Transição</p>
              <p className="text-sm text-dark-200 mt-1">E fora dos jogos... seu universo de mídias também conta uma história.</p>
            </div>
            <button
              onClick={() => setActiveTab('media')}
              className="btn-secondary text-sm px-3 py-2 inline-flex items-center gap-2"
            >
              <Sparkles size={14} /> Ver Mídias
            </button>
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 stat-card">
              <h2 className="text-lg font-semibold text-dark-100 mb-4">Seu Perfil de Jogador</h2>
              <div className="space-y-3">
                {stats.insightLines.length > 0 ? stats.insightLines.map((line, idx) => (
                  <p key={idx} className="text-base md:text-lg text-dark-200 leading-relaxed border-l-2 border-accent-500/50 pl-4">
                    {line}
                  </p>
                )) : (
                  <p className="text-sm text-dark-400">Adicione mais jogos para gerar insights sobre seu estilo.</p>
                )}
              </div>
            </div>

            <div className="stat-card">
              <h3 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2">
                <Star size={16} className="text-yellow-400" />
                Distribuição de Notas
              </h3>

              {stats.gamesByRating.length > 0 ? (
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats.gamesByRating} layout="vertical" margin={{ left: 8, right: 12 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" />
                    <XAxis type="number" tick={{ fill: '#a0a0a0', fontSize: 12 }} allowDecimals={false} />
                    <YAxis dataKey="rating" type="category" width={112} tick={{ fill: '#a0a0a0', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{
                        background: '#1e1e22',
                        border: '1px solid #404040',
                        borderRadius: '8px',
                        color: '#e0e0e0',
                      }}
                    />
                    <Bar dataKey="count" fill="#7c3aed" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-sm text-dark-400">Sem notas suficientes para o gráfico.</p>
              )}
            </div>
          </section>
        </>
      )}

      {activeTab === 'media' && (
        <>
          <section className="relative overflow-hidden rounded-3xl border border-dark-700/60 min-h-[220px] bg-gradient-to-r from-blue-950/50 via-cyan-950/30 to-indigo-950/50">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.25),transparent_50%),radial-gradient(circle_at_80%_60%,rgba(99,102,241,0.22),transparent_45%)]" />
            <div className="relative z-10 h-full px-6 py-8 md:px-10 md:py-10 flex flex-col justify-center">
              <p className="text-xs uppercase tracking-[0.25em] text-dark-300">Universo de Mídias</p>
              <h1 className="mt-2 text-4xl md:text-6xl font-black text-cyan-200 leading-none">{stats.mediaHeroHours}h</h1>
              <p className="mt-2 text-sm md:text-base text-dark-300">Horas estimadas de tela em filmes, séries e animes.</p>
            </div>
          </section>

          <section className="stat-card">
            <h2 className="text-lg font-semibold text-dark-100 mb-4">Capítulos Recentes Fora dos Jogos</h2>
            {stats.mediaRecent.length > 0 ? (
              <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3">
                {stats.mediaRecent.map((item) => (
                  <article key={item.id} className="group">
                    <div className="aspect-[2/3] rounded-lg overflow-hidden bg-dark-800 border border-dark-700/70 relative">
                      {item.cover_url ? (
                        <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-dark-500">Sem capa</div>
                      )}
                      <span className="absolute left-1.5 top-1.5 text-[10px] px-1.5 py-0.5 rounded-full bg-dark-950/90 border border-dark-500/60 text-dark-200">{item.kind}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-dark-300 line-clamp-1" title={item.title}>{item.title}</p>
                  </article>
                ))}
              </div>
            ) : (
              <p className="text-sm text-dark-400">Sem mídias recentes para exibir.</p>
            )}
          </section>

          <section className="stat-card">
            <h2 className="text-lg font-semibold text-dark-100 mb-4">Perfil de Consumo de Mídias</h2>
            <div className="space-y-3">
              {stats.mediaInsights.map((line, idx) => (
                <p key={idx} className="text-base md:text-lg text-dark-200 leading-relaxed border-l-2 border-cyan-500/50 pl-4">
                  {line}
                </p>
              ))}
            </div>
          </section>
        </>
      )}

      {activeTab === 'general' && (
        <>
          <section className="rounded-3xl border border-dark-700/60 bg-dark-900/70 p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-dark-400">Visão Geral</p>
            <h2 className="mt-2 text-2xl md:text-3xl font-bold text-dark-100">Seu ecossistema pessoal tem {totalItems} itens rastreados.</h2>
            <p className="mt-2 text-dark-300 text-sm">Um resumo rápido para entender o todo antes de mergulhar em cada universo.</p>
          </section>

          <section className="rounded-2xl border border-dark-700/60 bg-dark-900/55 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
              <MediaStat icon={<Gamepad2 size={16} />} label="Jogos" value={stats.totalGames} color="text-green-400" />
              <MediaStat icon={<Clock size={16} />} label="Tempo" value={stats.totalPlayTime} color="text-blue-400" />
              <MediaStat icon={<Film size={16} />} label="Filmes" value={stats.totalMovies} color="text-purple-400" />
              <MediaStat icon={<Tv size={16} />} label="Séries" value={stats.totalShows} color="text-pink-400" />
              <MediaStat icon={<Play size={16} />} label="Animes" value={stats.totalAnime} color="text-red-400" />
              <MediaStat icon={<BookOpen size={16} />} label="Mangás" value={stats.totalManga} color="text-orange-400" />
              <MediaStat icon={<Library size={16} />} label="Livros" value={stats.totalBooks} color="text-cyan-400" />
            </div>
          </section>

          <section className="stat-card">
            <h3 className="text-sm font-semibold text-dark-200 mb-4">Distribuição do Ecossistema</h3>
            <div className="space-y-3">
              {[
                { label: 'Jogos', value: stats.totalGames, color: 'bg-green-500' },
                { label: 'Filmes', value: stats.totalMovies, color: 'bg-purple-500' },
                { label: 'Séries', value: stats.totalShows, color: 'bg-pink-500' },
                { label: 'Animes', value: stats.totalAnime, color: 'bg-red-500' },
                { label: 'Mangás', value: stats.totalManga, color: 'bg-orange-500' },
                { label: 'Livros', value: stats.totalBooks, color: 'bg-cyan-500' },
              ].map((row) => {
                const pct = totalItems > 0 ? Math.round((row.value / totalItems) * 100) : 0;
                return (
                  <div key={row.label}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-dark-300">{row.label}</span>
                      <span className="text-dark-500">{row.value} ({pct}%)</span>
                    </div>
                    <div className="h-2 rounded-full bg-dark-700/80 overflow-hidden">
                      <div className={`h-full ${row.color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function TabButton({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm transition-colors ${
        active
          ? 'bg-accent-500/20 border-accent-400/60 text-accent-300'
          : 'bg-dark-900/70 border-dark-700/70 text-dark-300 hover:border-dark-500'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

function MediaStat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-dark-700/70 bg-dark-950/45 px-3 py-1.5">
      <span className={color}>{icon}</span>
      <span className="text-dark-300">{label}</span>
      <span className={`font-semibold ${color}`}>{value}</span>
    </div>
  );
}
