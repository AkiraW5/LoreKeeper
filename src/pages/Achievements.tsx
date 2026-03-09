import React, { useEffect, useState } from 'react';
import { Trophy, Star, Zap, Lock } from 'lucide-react';
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

type TrophyRarity = 'bronze' | 'silver' | 'gold' | 'platinum';

function getAchievementRarity(a: Achievement): TrophyRarity {
  if (a.xp >= 220) return 'gold';
  if (a.xp >= 120) return 'silver';
  return 'bronze';
}

function rarityMeta(r: TrophyRarity) {
  switch (r) {
    case 'bronze':
      return { label: 'Bronze', emoji: '🥉', className: 'border-amber-700/50 text-amber-300 bg-amber-700/10' };
    case 'silver':
      return { label: 'Prata', emoji: '🥈', className: 'border-slate-400/50 text-slate-200 bg-slate-500/10' };
    case 'gold':
      return { label: 'Ouro', emoji: '🥇', className: 'border-yellow-500/50 text-yellow-300 bg-yellow-500/10' };
    case 'platinum':
      return { label: 'Platina', emoji: '💎', className: 'border-cyan-400/60 text-cyan-300 bg-cyan-500/10' };
  }
}

function formatTimeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days} dia${days > 1 ? 's' : ''}`;
  const months = Math.floor(days / 30);
  return `há ${months} mês${months > 1 ? 'es' : ''}`;
}

function normalizeText(value: unknown): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();
}

function isTruthy(value: unknown): boolean {
  const normalized = normalizeText(value);
  return value === true || value === 1 || normalized === '1' || normalized === 'true' || normalized === 'sim';
}

function isCompletedStatus(status: unknown): boolean {
  const normalized = normalizeText(status);
  return normalized === 'concluido' || normalized === 'completed' || normalized === 'finalizado' || normalized === 'finalizada';
}

function isAaaDifficulty(value: unknown): boolean {
  const normalized = normalizeText(value).replace(/\s+/g, '');
  return normalized === 'aaa' || normalized === 'triplea';
}

function parseDateSafe(value: unknown): Date | null {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const direct = new Date(raw);
  if (!Number.isNaN(direct.getTime())) return direct;

  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(raw);
  if (br) {
    const [, dd, mm, yyyy] = br;
    const d = new Date(`${yyyy}-${mm}-${dd}`);
    if (!Number.isNaN(d.getTime())) return d;
  }

  return null;
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checking, setChecking] = useState(false);
  const [recentlyUnlockedIds, setRecentlyUnlockedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      await loadData();
      if (!cancelled) {
        checkAchievements();
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
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
    if (checking) return;
    setChecking(true);
    const db = window.api.db;
    try {
      // Fetch everything needed in parallel to reduce IPC round trips.
      const [
        currentAchievements,
        games,
        movies,
        shows,
        anime,
        manga,
        books,
        backlog,
        missions,
        completeSeries,
      ] = await Promise.all([
        db.getAll('achievements', 'name ASC'),
        db.query('SELECT play_time, is_gold, console, genre, completion_date, difficulty, rating FROM completed_games'),
        db.query('SELECT id, status, watch_date FROM movies'),
        db.query('SELECT id, status, end_date FROM tv_shows'),
        db.query('SELECT id, status, end_date FROM animes'),
        db.query('SELECT id, status, end_date FROM manga'),
        db.query('SELECT id, status, end_date FROM books'),
        db.query('SELECT COUNT(*) as count FROM game_backlog'),
        db.query('SELECT COUNT(*) as count FROM main_missions WHERE completed = 1'),
        db.query(`
          SELECT gs.id FROM game_series gs
          WHERE NOT EXISTS (
            SELECT 1 FROM game_series_entries gse
            WHERE gse.series_id = gs.id AND gse.is_completed = 0
          )
          AND (SELECT COUNT(*) FROM game_series_entries gse2 WHERE gse2.series_id = gs.id) > 0
        `),
      ]);

      const totalSeconds = games.reduce((s: number, g: any) => s + parseTimeToSeconds(g.play_time), 0);
      const totalHours = totalSeconds / 3600;
      const goldCount = games.filter((g: any) => isTruthy(g.is_gold)).length;
      const platforms = new Set(games.map((g: any) => String(g.console || '').trim()).filter(Boolean));
      const genres = new Set(games.map((g: any) => String(g.genre || '').trim()).filter(Boolean));
      const months = new Set(games.map((g: any) => {
        const d = parseDateSafe(g.completion_date);
        if (!d) return '';
        return `${d.getFullYear()}-${d.getMonth()}`;
      }).filter(Boolean));
      const aaaCount = games.filter((g: any) => isAaaDifficulty(g.difficulty)).length;
      const hasMaxRating = games.some((g: any) => Number(g.rating) === 11);
      const hasLowRating = games.some((g: any) => (Number(g.rating) || 0) <= 4);
      const averageRating = games.length > 0
        ? games.reduce((sum: number, g: any) => sum + (Number(g.rating) || 0), 0) / games.length
        : 0;
      const uniqueYears = new Set(games.map((g: any) => {
        const d = parseDateSafe(g.completion_date);
        if (!d) return '';
        return `${d.getFullYear()}`;
      }).filter(Boolean));
      const hasSpeedrun = games.some((g: any) => parseTimeToSeconds(g.play_time) > 0 && parseTimeToSeconds(g.play_time) < 7200);
      const hasMarathon = games.some((g: any) => parseTimeToSeconds(g.play_time) >= 360000);
      const moviesCount = movies.length;
      const showsCount = shows.filter((item: any) => isCompletedStatus(item.status) || !!item.end_date).length;
      const animeCount = anime.filter((item: any) => isCompletedStatus(item.status) || !!item.end_date).length;
      const mangaCount = manga.filter((item: any) => isCompletedStatus(item.status) || !!item.end_date).length;
      const booksCount = books.filter((item: any) => isCompletedStatus(item.status) || !!item.end_date).length;
      const backlogCount = backlog[0]?.count || 0;
      const completedMissions = missions[0]?.count || 0;
      const totalMediaCompleted = games.length + moviesCount + showsCount + animeCount + mangaCount + booksCount;

      // Check conditions
      const checks: Record<string, boolean> = {
        first_game: games.length >= 1,
        ten_games: games.length >= 10,
        fifty_games: games.length >= 50,
        hundred_games: games.length >= 100,
        speedrunner: hasSpeedrun,
        marathon: hasMarathon,
        perfectionist: goldCount >= 5,
        bookworm: booksCount >= 5,
        otaku: animeCount >= 10,
        cinephile: moviesCount >= 20,
        binge_watcher: showsCount >= 5,
        manga_reader: mangaCount >= 10,
        all_platforms: platforms.size >= 5,
        genre_explorer: genres.size >= 8,
        series_complete: completeSeries.length > 0,
        five_hundred_hours: totalHours >= 500,
        thousand_hours: totalHours >= 1000,
        max_rating: hasMaxRating,
        triple_aaa: aaaCount >= 3,
        daily_player: months.size >= 12,
        twenty_five_games: games.length >= 25,
        seventy_five_games: games.length >= 75,
        one_fifty_games: games.length >= 150,
        two_hundred_games: games.length >= 200,
        three_hundred_games: games.length >= 300,
        first_platinum: goldCount >= 1,
        ten_platinums: goldCount >= 10,
        twenty_five_platinums: goldCount >= 25,
        hundred_hours: totalHours >= 100,
        two_fifty_hours: totalHours >= 250,
        seven_fifty_hours: totalHours >= 750,
        one_thousand_five_hundred_hours: totalHours >= 1500,
        two_thousand_five_hundred_hours: totalHours >= 2500,
        tri_platform: platforms.size >= 3,
        seven_platforms: platforms.size >= 7,
        ten_platforms: platforms.size >= 10,
        five_genres: genres.size >= 5,
        twelve_genres: genres.size >= 12,
        sixteen_genres: genres.size >= 16,
        six_months: months.size >= 6,
        twenty_four_months: months.size >= 24,
        thirty_six_months: months.size >= 36,
        five_movies: moviesCount >= 5,
        fifty_movies: moviesCount >= 50,
        hundred_movies_plus: moviesCount >= 100,
        ten_shows: showsCount >= 10,
        twenty_shows: showsCount >= 20,
        twenty_five_anime: animeCount >= 25,
        fifty_anime: animeCount >= 50,
        twenty_five_manga: mangaCount >= 25,
        fifty_manga: mangaCount >= 50,
        ten_books: booksCount >= 10,
        twenty_five_books: booksCount >= 25,
        fifty_books: booksCount >= 50,
        series_triple: completeSeries.length >= 3,
        series_quintuple: completeSeries.length >= 5,
        series_decathlon: completeSeries.length >= 10,
        ten_aaa: aaaCount >= 10,
        twenty_five_aaa: aaaCount >= 25,
        rating_master: games.length >= 20 && averageRating >= 9,
        critic_mode: games.length >= 50 && hasMaxRating && hasLowRating,
        mission_starter: completedMissions >= 1,
        mission_hunter: completedMissions >= 10,
        mission_legend: completedMissions >= 25,
        backlog_builder: backlogCount >= 25,
        backlog_collector: backlogCount >= 100,
        media_generalist: games.length >= 1 && moviesCount >= 1 && showsCount >= 1 && animeCount >= 1 && mangaCount >= 1 && booksCount >= 1,
        total_media_100: totalMediaCompleted >= 100,
        total_media_300: totalMediaCompleted >= 300,
        year_rounder: uniqueYears.size >= 5,
      };

      const pending = currentAchievements.filter((a: Achievement) => !a.unlocked_at && checks[a.key]);
      const unlockedNowIds = pending.map((a: Achievement) => a.id);
      const unlockedNowKeys = pending.map((a: Achievement) => a.key);

      if (unlockedNowKeys.length > 0) {
        const placeholders = unlockedNowKeys.map(() => '?').join(', ');
        await db.run(
          `UPDATE achievements SET unlocked_at = ? WHERE unlocked_at IS NULL AND key IN (${placeholders})`,
          [new Date().toISOString(), ...unlockedNowKeys]
        );
      }

      // Calculate XP from all media
      const baseXp = calculateBaseXp(games.length, moviesCount, showsCount, animeCount, mangaCount, booksCount);

      // Get achievement XP
      const unlockedAchs = await db.query('SELECT SUM(xp) as total FROM achievements WHERE unlocked_at IS NOT NULL');
      const achXp = unlockedAchs[0]?.total || 0;

      const totalXp = baseXp + achXp;
      const { level } = getLevelFromXp(totalXp);

      await db.run('UPDATE user_profile SET total_xp = ?, level = ?, updated_at = ? WHERE id = 1', [
        totalXp, level, new Date().toISOString(),
      ]);

      await loadData();
      if (unlockedNowIds.length > 0) {
        setRecentlyUnlockedIds(new Set(unlockedNowIds));
        setTimeout(() => setRecentlyUnlockedIds(new Set()), 1800);
      }
    } catch (error) {
      console.error('Erro ao verificar conquistas:', error);
      // Keep UI populated even if auto-check fails.
      await loadData();
    } finally {
      setChecking(false);
    }
  }

  function calculateBaseXp(games: number, movies: number, shows: number, anime: number, manga: number, books: number): number {
    // Each media gives XP
    return (games * 30) + (movies * 10) + (shows * 20) + (anime * 15) + (manga * 15) + (books * 20);
  }

  const unlocked = achievements.filter(a => a.unlocked_at);
  const ordered = [...achievements].sort((a, b) => {
    const rarityWeight = { platinum: 4, gold: 3, silver: 2, bronze: 1 } as const;
    const ra = rarityWeight[getAchievementRarity(a)];
    const rb = rarityWeight[getAchievementRarity(b)];
    if (ra !== rb) return rb - ra;
    if (!!a.unlocked_at !== !!b.unlocked_at) return a.unlocked_at ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const platinumUnlocked = achievements.length > 0 && unlocked.length === achievements.length;
  const recentFeed = [...unlocked]
    .sort((a, b) => (b.unlocked_at || '').localeCompare(a.unlocked_at || ''))
    .slice(0, 8);

  const levelInfo = profile ? getLevelFromXp(profile.total_xp) : { level: 1, currentXp: 0, nextLevelXp: 100 };
  const levelPct = Math.round((levelInfo.currentXp / levelInfo.nextLevelXp) * 100);

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="sticky top-0 z-20 pb-4 mb-4 bg-dark-950/85 backdrop-blur-md border-b border-dark-700/40">
        <div className="flex items-center justify-between mb-4">
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

        <div className="rounded-2xl border border-dark-700/50 bg-dark-800/65 p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent-500 to-cyan-500 flex items-center justify-center shrink-0">
              <span className="text-2xl font-black text-white">{levelInfo.level}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Star size={15} className="text-yellow-400" />
                <span className="text-base font-bold text-dark-100">{getLevelTitle(levelInfo.level)}</span>
              </div>
              <p className="text-xs text-dark-400 mb-2">
                XP total: {profile?.total_xp || 0} • Atual: {levelInfo.currentXp}/{levelInfo.nextLevelXp} • Falta {Math.max(0, levelInfo.nextLevelXp - levelInfo.currentXp)} XP
              </p>
              <div className="w-full h-3 bg-dark-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent-500 to-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${levelPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${rarityMeta('bronze').className}`}>{rarityMeta('bronze').emoji} Bronze</span>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${rarityMeta('silver').className}`}>{rarityMeta('silver').emoji} Prata</span>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${rarityMeta('gold').className}`}>{rarityMeta('gold').emoji} Ouro</span>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${rarityMeta('platinum').className}`}>{rarityMeta('platinum').emoji} Platina</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {ordered.map((a) => {
              const unlockedNow = recentlyUnlockedIds.has(a.id);
              const unlockedState = !!a.unlocked_at;
              const rarity = rarityMeta(getAchievementRarity(a));

              return (
                <article
                  key={a.id}
                  className={`relative rounded-xl border p-3 transition-all duration-300 ${
                    unlockedState
                      ? `bg-dark-800/70 ${rarity.className}`
                      : 'bg-dark-900/70 border-dark-700/70 opacity-85'
                  } ${unlockedNow ? 'achievement-pop shadow-xl shadow-yellow-500/20' : ''}`}
                  title={a.description}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-2xl ${unlockedState ? '' : 'grayscale brightness-50 opacity-40'}`}>{a.icon}</span>
                    <span className="text-[10px] text-dark-400 font-mono">+{a.xp}XP</span>
                  </div>

                  {!unlockedState && (
                    <div className="absolute inset-0 rounded-xl bg-black/25 flex items-center justify-center">
                      <Lock size={16} className="text-dark-300" />
                    </div>
                  )}

                  <p className={`text-xs font-semibold line-clamp-1 ${unlockedState ? 'text-dark-100' : 'text-dark-400'}`}>{a.name}</p>
                  <p className={`text-[10px] mt-1 line-clamp-2 ${unlockedState ? 'text-dark-300' : 'text-dark-500'}`}>
                    {unlockedState ? a.description : '???'}
                  </p>
                  <p className="text-[10px] mt-1">{rarity.emoji} {rarity.label}</p>
                </article>
              );
            })}

            <article
              className={`relative rounded-xl border p-3 transition-all duration-300 ${
                platinumUnlocked
                  ? `${rarityMeta('platinum').className} bg-dark-800/80`
                  : 'bg-dark-900/70 border-dark-700/70 opacity-85'
              }`}
              title="Desbloqueie todas as outras conquistas"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-2xl ${platinumUnlocked ? '' : 'grayscale brightness-50 opacity-40'}`}>💎</span>
                <span className="text-[10px] text-dark-400 font-mono">MAX</span>
              </div>
              {!platinumUnlocked && (
                <div className="absolute inset-0 rounded-xl bg-black/25 flex items-center justify-center">
                  <Lock size={16} className="text-dark-300" />
                </div>
              )}
              <p className={`text-xs font-semibold ${platinumUnlocked ? 'text-cyan-200' : 'text-dark-400'}`}>Platina do LoreKeeper</p>
              <p className={`text-[10px] mt-1 ${platinumUnlocked ? 'text-dark-300' : 'text-dark-500'}`}>{platinumUnlocked ? 'Você desbloqueou tudo.' : 'Desbloqueie todas as outras conquistas.'}</p>
              <p className="text-[10px] mt-1">💎 Platina</p>
            </article>
          </div>
        </div>

        <aside className="xl:col-span-1">
          <div className="rounded-xl border border-dark-700/60 bg-dark-900/65 p-4">
            <h2 className="text-sm font-semibold text-dark-200 mb-3">Atividade Recente</h2>
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {recentFeed.map((a) => (
                <div key={a.id} className="rounded-lg border border-dark-700/60 bg-dark-800/60 px-3 py-2">
                  <p className="text-xs text-dark-200 line-clamp-1">{a.icon} {a.name}</p>
                  <p className="text-[10px] text-dark-500 mt-0.5">{a.unlocked_at ? formatTimeAgo(a.unlocked_at) : ''}</p>
                </div>
              ))}
              {recentFeed.length === 0 && (
                <p className="text-xs text-dark-500">Nenhuma conquista recente.</p>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-dark-700/50 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-base font-bold text-accent-400">{unlocked.length}</p>
                <p className="text-[10px] text-dark-500">Conq.</p>
              </div>
              <div>
                <p className="text-base font-bold text-yellow-400">{profile?.total_xp || 0}</p>
                <p className="text-[10px] text-dark-500">XP</p>
              </div>
              <div>
                <p className="text-base font-bold text-green-400">{levelInfo.level}</p>
                <p className="text-[10px] text-dark-500">Nível</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
