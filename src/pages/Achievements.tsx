import React, { useEffect, useState, useCallback } from 'react';
import { Trophy, Star, Zap, Lock, CheckCircle2 } from 'lucide-react';
import { Achievement, UserProfile } from '../types';
import { parseTimeToSeconds } from '../lib/utils';

// XP table: level -> xp needed
function xpForLevel(level: number): number {
  return level * 100 + (level - 1) * 50;
}

function getLevelFromXp(totalXp: number): { level: number; currentXp: number; nextLevelXp: number } {
  let level = 1;
  let remaining = totalXp;
  while (true) {
    const needed = xpForLevel(level);
    if (remaining < needed) {
      return { level, currentXp: remaining, nextLevelXp: needed };
    }
    remaining -= needed;
    level++;
  }
}

function getLevelTitle(level: number): string {
  if (level >= 50) return 'Deus Gamer';
  if (level >= 40) return 'Lenda Viva';
  if (level >= 30) return 'Mestre';
  if (level >= 20) return 'Veterano';
  if (level >= 15) return 'Experiente';
  if (level >= 10) return 'Dedicado';
  if (level >= 5) return 'Iniciante';
  return 'Novato';
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    const [achs, prof] = await Promise.all([
      window.api.db.getAll('achievements', 'unlocked_at IS NULL, name ASC'),
      window.api.db.queryOne('SELECT * FROM user_profile WHERE id = 1'),
    ]);
    setAchievements(achs);
    setProfile(prof);
  }

  async function checkAchievements() {
    setChecking(true);
    const db = window.api.db;
    
    // Get all data
    const games = await db.query('SELECT * FROM completed_games');
    const movies = await db.query('SELECT COUNT(*) as count FROM movies');
    const shows = await db.query("SELECT COUNT(*) as count FROM tv_shows WHERE status = 'Concluído'");
    const anime = await db.query("SELECT COUNT(*) as count FROM animes WHERE status = 'Concluído'");
    const manga = await db.query("SELECT COUNT(*) as count FROM manga WHERE status = 'Concluído'");
    const books = await db.query("SELECT COUNT(*) as count FROM books WHERE status = 'Concluído'");
    const completeSeries = await db.query(`
      SELECT gs.id FROM game_series gs
      WHERE NOT EXISTS (
        SELECT 1 FROM game_series_entries gse 
        WHERE gse.series_id = gs.id AND gse.is_completed = 0
      )
      AND (SELECT COUNT(*) FROM game_series_entries gse2 WHERE gse2.series_id = gs.id) > 0
    `);

    const totalSeconds = games.reduce((s: number, g: any) => s + parseTimeToSeconds(g.play_time), 0);
    const totalHours = totalSeconds / 3600;
    const goldCount = games.filter((g: any) => g.is_gold).length;
    const platforms = new Set(games.map((g: any) => g.console));
    const genres = new Set(games.map((g: any) => g.genre));
    const months = new Set(games.map((g: any) => {
      if (!g.completion_date) return '';
      const d = new Date(g.completion_date);
      return `${d.getFullYear()}-${d.getMonth()}`;
    }).filter(Boolean));
    const aaaCount = games.filter((g: any) => g.difficulty === 'AAA').length;
    const hasMaxRating = games.some((g: any) => g.rating === 11);
    const hasSpeedrun = games.some((g: any) => parseTimeToSeconds(g.play_time) > 0 && parseTimeToSeconds(g.play_time) < 7200);
    const hasMarathon = games.some((g: any) => parseTimeToSeconds(g.play_time) >= 360000);

    // Check conditions
    const checks: Record<string, boolean> = {
      first_game: games.length >= 1,
      ten_games: games.length >= 10,
      fifty_games: games.length >= 50,
      hundred_games: games.length >= 100,
      speedrunner: hasSpeedrun,
      marathon: hasMarathon,
      perfectionist: goldCount >= 5,
      bookworm: (books[0]?.count || 0) >= 5,
      otaku: (anime[0]?.count || 0) >= 10,
      cinephile: (movies[0]?.count || 0) >= 20,
      binge_watcher: (shows[0]?.count || 0) >= 5,
      manga_reader: (manga[0]?.count || 0) >= 10,
      all_platforms: platforms.size >= 5,
      genre_explorer: genres.size >= 8,
      series_complete: completeSeries.length > 0,
      five_hundred_hours: totalHours >= 500,
      thousand_hours: totalHours >= 1000,
      max_rating: hasMaxRating,
      triple_aaa: aaaCount >= 3,
      daily_player: months.size >= 12,
    };

    let newXp = 0;

    for (const ach of achievements) {
      if (ach.unlocked_at) continue; // Already unlocked
      if (checks[ach.key]) {
        await db.update('achievements', ach.id, {
          unlocked_at: new Date().toISOString(),
        });
        newXp += ach.xp;
      }
    }

    // Calculate XP from all media
    const baseXp = calculateBaseXp(games.length, movies[0]?.count || 0, shows[0]?.count || 0,
      anime[0]?.count || 0, manga[0]?.count || 0, books[0]?.count || 0);

    // Get achievement XP
    const unlockedAchs = await db.query('SELECT SUM(xp) as total FROM achievements WHERE unlocked_at IS NOT NULL');
    const achXp = unlockedAchs[0]?.total || 0;

    const totalXp = baseXp + achXp;
    const { level } = getLevelFromXp(totalXp);

    await db.run('UPDATE user_profile SET total_xp = ?, level = ?, updated_at = ? WHERE id = 1', [
      totalXp, level, new Date().toISOString(),
    ]);

    await loadData();
    setChecking(false);
  }

  function calculateBaseXp(games: number, movies: number, shows: number, anime: number, manga: number, books: number): number {
    // Each media gives XP
    return (games * 30) + (movies * 10) + (shows * 20) + (anime * 15) + (manga * 15) + (books * 20);
  }

  const unlocked = achievements.filter(a => a.unlocked_at);
  const locked = achievements.filter(a => !a.unlocked_at);

  const levelInfo = profile ? getLevelFromXp(profile.total_xp) : { level: 1, currentXp: 0, nextLevelXp: 100 };
  const levelPct = Math.round((levelInfo.currentXp / levelInfo.nextLevelXp) * 100);

  return (
    <div className="p-6 flex flex-col h-full overflow-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-2">
            <Trophy size={24} className="text-yellow-400" />
            Conquistas & Nível
          </h1>
          <p className="text-sm text-dark-400 mt-1">
            {unlocked.length}/{achievements.length} conquistas desbloqueadas
          </p>
        </div>
        <button
          onClick={checkAchievements}
          disabled={checking}
          className="btn-primary flex items-center gap-2"
        >
          <Zap size={16} />
          {checking ? 'Verificando...' : 'Verificar Conquistas'}
        </button>
      </div>

      {/* Level Card */}
      <div className="stat-card mb-6">
        <div className="flex items-center gap-5">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-accent-500 to-purple-600 flex items-center justify-center">
            <span className="text-3xl font-black text-white">{levelInfo.level}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <Star size={16} className="text-yellow-400" />
              <span className="text-lg font-bold text-dark-100">{getLevelTitle(levelInfo.level)}</span>
            </div>
            <p className="text-xs text-dark-400 mb-2">
              {profile?.total_xp || 0} XP total • {levelInfo.currentXp}/{levelInfo.nextLevelXp} XP para o nível {levelInfo.level + 1}
            </p>
            <div className="w-full h-3 bg-dark-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${levelPct}%` }}
              />
            </div>
          </div>
        </div>

        <div className="mt-4 pt-3 border-t border-dark-700/50 grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-lg font-bold text-accent-400">{unlocked.length}</p>
            <p className="text-[10px] text-dark-400">Conquistas</p>
          </div>
          <div>
            <p className="text-lg font-bold text-yellow-400">{profile?.total_xp || 0}</p>
            <p className="text-[10px] text-dark-400">XP Total</p>
          </div>
          <div>
            <p className="text-lg font-bold text-green-400">{levelInfo.level}</p>
            <p className="text-[10px] text-dark-400">Nível</p>
          </div>
        </div>
      </div>

      {/* Unlocked */}
      {unlocked.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-dark-200 mb-3 flex items-center gap-2">
            <CheckCircle2 size={16} className="text-green-400" />
            Desbloqueadas ({unlocked.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {unlocked.map(a => (
              <div key={a.id} className="stat-card border-green-500/20 bg-green-500/5">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-green-300 truncate">{a.name}</p>
                    <p className="text-xs text-dark-400 truncate">{a.description}</p>
                  </div>
                  <span className="text-xs font-bold text-yellow-400 shrink-0">+{a.xp}XP</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Locked */}
      {locked.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-dark-200 mb-3 flex items-center gap-2">
            <Lock size={16} className="text-dark-500" />
            Bloqueadas ({locked.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {locked.map(a => (
              <div key={a.id} className="stat-card opacity-60">
                <div className="flex items-center gap-3">
                  <span className="text-2xl grayscale">{a.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-dark-300 truncate">{a.name}</p>
                    <p className="text-xs text-dark-500 truncate">{a.description}</p>
                  </div>
                  <span className="text-xs font-bold text-dark-500 shrink-0">+{a.xp}XP</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
