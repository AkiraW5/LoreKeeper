import React, { useEffect, useState } from 'react';
import {
  Gamepad2, Film, Tv, Play, BookOpen, Library, Clock, Trophy, Star, TrendingUp,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { RATING_LABELS } from '../types';
import { secondsToTimeStr, parseTimeToSeconds } from '../lib/utils';

interface DashboardStats {
  totalGames: number;
  totalPlayTime: string;
  totalMovies: number;
  totalShows: number;
  totalAnime: number;
  totalManga: number;
  totalBooks: number;
  gamesByYear: { year: string; count: number; hours: number }[];
  gamesByRating: { rating: string; count: number }[];
  gamesByDifficulty: { difficulty: string; count: number }[];
  gamesByConsole: { console: string; count: number; time: string }[];
  gamesByGenre: { genre: string; count: number; time: string }[];
  recentGames: any[];
}

const CHART_COLORS = ['#7c3aed', '#a78bfa', '#c4b5fd', '#6d28d9', '#5b21b6', '#8b5cf6', '#ddd6fe'];
const DIFF_COLORS: Record<string, string> = {
  'C (Fácil)': '#22c55e',
  'B (Médio)': '#3b82f6',
  'A (Complicado)': '#eab308',
  'AA (Difícil)': '#f97316',
  'AAA (Imperdoável)': '#ef4444',
};

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      const db = window.api.db;

      // Basic counts
      const games = await db.query('SELECT * FROM completed_games');
      const movies = await db.query('SELECT COUNT(*) as count FROM movies');
      const shows = await db.query('SELECT COUNT(*) as count FROM tv_shows');
      const anime = await db.query('SELECT COUNT(*) as count FROM animes');
      const manga = await db.query('SELECT COUNT(*) as count FROM manga');
      const books = await db.query('SELECT COUNT(*) as count FROM books');

      // Total play time
      let totalSeconds = 0;
      games.forEach((g: any) => {
        totalSeconds += parseTimeToSeconds(g.play_time);
      });

      // Games by year
      const yearMap = new Map<string, { count: number; seconds: number }>();
      games.forEach((g: any) => {
        const year = g.completion_date ? new Date(g.completion_date).getFullYear().toString() : 'N/A';
        const current = yearMap.get(year) || { count: 0, seconds: 0 };
        current.count++;
        current.seconds += parseTimeToSeconds(g.play_time);
        yearMap.set(year, current);
      });
      const gamesByYear = Array.from(yearMap.entries())
        .map(([year, data]) => ({
          year,
          count: data.count,
          hours: Math.round(data.seconds / 3600),
        }))
        .sort((a, b) => a.year.localeCompare(b.year));

      // Games by rating
      const ratingMap = new Map<number, number>();
      games.forEach((g: any) => {
        ratingMap.set(g.rating, (ratingMap.get(g.rating) || 0) + 1);
      });
      const gamesByRating = Array.from(ratingMap.entries())
        .map(([rating, count]) => ({
          rating: `${rating} (${RATING_LABELS[rating] || ''})`,
          count,
        }))
        .sort((a, b) => {
          const rA = parseInt(a.rating);
          const rB = parseInt(b.rating);
          return rB - rA;
        });

      // Games by difficulty
      const diffLabels: Record<string, string> = {
        C: 'C (Fácil)', B: 'B (Médio)', A: 'A (Complicado)',
        AA: 'AA (Difícil)', AAA: 'AAA (Imperdoável)',
      };
      const diffMap = new Map<string, number>();
      games.forEach((g: any) => {
        const label = diffLabels[g.difficulty] || g.difficulty;
        diffMap.set(label, (diffMap.get(label) || 0) + 1);
      });
      const gamesByDifficulty = Array.from(diffMap.entries())
        .map(([difficulty, count]) => ({ difficulty, count }));

      // Games by console
      const consoleMap = new Map<string, { count: number; seconds: number }>();
      games.forEach((g: any) => {
        const current = consoleMap.get(g.console) || { count: 0, seconds: 0 };
        current.count++;
        current.seconds += parseTimeToSeconds(g.play_time);
        consoleMap.set(g.console, current);
      });
      const gamesByConsole = Array.from(consoleMap.entries())
        .map(([console_, data]) => ({
          console: console_,
          count: data.count,
          time: secondsToTimeStr(data.seconds),
        }))
        .sort((a, b) => b.count - a.count);

      // Games by genre
      const genreMap = new Map<string, { count: number; seconds: number }>();
      games.forEach((g: any) => {
        const current = genreMap.get(g.genre) || { count: 0, seconds: 0 };
        current.count++;
        current.seconds += parseTimeToSeconds(g.play_time);
        genreMap.set(g.genre, current);
      });
      const gamesByGenre = Array.from(genreMap.entries())
        .map(([genre, data]) => ({
          genre,
          count: data.count,
          time: secondsToTimeStr(data.seconds),
        }))
        .sort((a, b) => b.count - a.count);

      // Recent games
      const recentGames = games
        .sort((a: any, b: any) => new Date(b.completion_date).getTime() - new Date(a.completion_date).getTime())
        .slice(0, 5);

      setStats({
        totalGames: games.length,
        totalPlayTime: secondsToTimeStr(totalSeconds),
        totalMovies: movies[0]?.count || 0,
        totalShows: shows[0]?.count || 0,
        totalAnime: anime[0]?.count || 0,
        totalManga: manga[0]?.count || 0,
        totalBooks: books[0]?.count || 0,
        gamesByYear,
        gamesByRating,
        gamesByDifficulty,
        gamesByConsole,
        gamesByGenre,
        recentGames,
      });
    } catch (err) {
      console.error('Erro ao carregar stats:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-accent-500 border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="p-6 space-y-6 overflow-y-auto h-full">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-dark-100">Dashboard</h1>
        <p className="text-sm text-dark-400 mt-1">Visão geral de todas as suas mídias</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
        <StatCard icon={<Gamepad2 size={20} />} label="Jogos Zerados" value={stats.totalGames} color="text-green-400" />
        <StatCard icon={<Clock size={20} />} label="Tempo Total" value={stats.totalPlayTime} color="text-blue-400" small />
        <StatCard icon={<Film size={20} />} label="Filmes" value={stats.totalMovies} color="text-purple-400" />
        <StatCard icon={<Tv size={20} />} label="Séries" value={stats.totalShows} color="text-pink-400" />
        <StatCard icon={<Play size={20} />} label="Animes" value={stats.totalAnime} color="text-red-400" />
        <StatCard icon={<BookOpen size={20} />} label="Mangás" value={stats.totalManga} color="text-orange-400" />
        <StatCard icon={<Library size={20} />} label="Livros" value={stats.totalBooks} color="text-cyan-400" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Games by Year - COUNT */}
        {stats.gamesByYear.length > 0 && (
          <div className="stat-card">
            <h3 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2">
              <TrendingUp size={16} className="text-accent-400" />
              Jogos Zerados por Ano
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.gamesByYear}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" />
                <XAxis dataKey="year" tick={{ fill: '#a0a0a0', fontSize: 12 }} />
                <YAxis tick={{ fill: '#a0a0a0', fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: '#1e1e22',
                    border: '1px solid #404040',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                  }}
                  formatter={(value: any) => [`${value} jogos`, 'Jogos Zerados']}
                />
                <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} name="Jogos" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Hours by Year */}
        {stats.gamesByYear.length > 0 && (
          <div className="stat-card">
            <h3 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2">
              <Clock size={16} className="text-blue-400" />
              Horas Jogadas por Ano
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.gamesByYear}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" />
                <XAxis dataKey="year" tick={{ fill: '#a0a0a0', fontSize: 12 }} />
                <YAxis tick={{ fill: '#a0a0a0', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{
                    background: '#1e1e22',
                    border: '1px solid #404040',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                  }}
                  formatter={(value: any) => [`${value}h`, 'Horas']}
                />
                <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Horas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Rating Distribution */}
        {stats.gamesByRating.length > 0 && (
          <div className="stat-card">
            <h3 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2">
              <Star size={16} className="text-yellow-400" />
              Distribuição de Notas
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={stats.gamesByRating} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2e" />
                <XAxis type="number" tick={{ fill: '#a0a0a0', fontSize: 12 }} />
                <YAxis dataKey="rating" type="category" width={120} tick={{ fill: '#a0a0a0', fontSize: 10 }} />
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
          </div>
        )}

        {/* Difficulty Distribution */}
        {stats.gamesByDifficulty.length > 0 && (
          <div className="stat-card">
            <h3 className="text-sm font-semibold text-dark-200 mb-4 flex items-center gap-2">
              <Trophy size={16} className="text-orange-400" />
              Nível de Dificuldade
            </h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.gamesByDifficulty}
                  dataKey="count"
                  nameKey="difficulty"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ difficulty, count }) => `${difficulty}: ${count}`}
                  labelLine={false}
                >
                  {stats.gamesByDifficulty.map((entry) => (
                    <Cell key={entry.difficulty} fill={DIFF_COLORS[entry.difficulty] || '#7c3aed'} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: '#1e1e22',
                    border: '1px solid #404040',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Top Consoles */}
        {stats.gamesByConsole.length > 0 && (
          <div className="stat-card">
            <h3 className="text-sm font-semibold text-dark-200 mb-4">Jogos por Plataforma</h3>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {stats.gamesByConsole.map(c => (
                <div key={c.console} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-dark-700/30">
                  <span className="text-sm text-dark-200">{c.console}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-dark-400 font-mono">{c.time}</span>
                    <span className="text-sm font-semibold text-accent-400 w-6 text-right">{c.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Genre Stats */}
        {stats.gamesByGenre.length > 0 && (
          <div className="stat-card">
            <h3 className="text-sm font-semibold text-dark-200 mb-4">Jogos por Gênero</h3>
            <div className="space-y-2 max-h-[250px] overflow-y-auto">
              {stats.gamesByGenre.map(g => (
                <div key={g.genre} className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-dark-700/30">
                  <span className="text-sm text-dark-200">{g.genre}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-xs text-dark-400 font-mono">{g.time}</span>
                    <span className="text-sm font-semibold text-accent-400 w-6 text-right">{g.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Games */}
        {stats.recentGames.length > 0 && (
          <div className="stat-card">
            <h3 className="text-sm font-semibold text-dark-200 mb-4">Últimos Jogos Zerados</h3>
            <div className="space-y-3">
              {stats.recentGames.map((g: any) => (
                <div key={g.id} className="flex items-center justify-between py-2 px-2 rounded hover:bg-dark-700/30">
                  <div>
                    <p className="text-sm font-medium text-dark-100">{g.name}</p>
                    <p className="text-xs text-dark-400">{g.console} • {g.genre}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-mono text-accent-400">{g.rating}/11</p>
                    <p className="text-xs text-dark-400">{g.play_time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  small = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  small?: boolean;
}) {
  return (
    <div className="stat-card flex flex-col items-center text-center gap-2">
      <span className={color}>{icon}</span>
      <span className={`font-bold ${color} ${small ? 'text-lg font-mono' : 'text-2xl'}`}>{value}</span>
      <span className="text-xs text-dark-400">{label}</span>
    </div>
  );
}
