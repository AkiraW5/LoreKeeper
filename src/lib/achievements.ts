import { Achievement } from '../types';
import { parseTimeToSeconds } from './utils';

// Verificação de conquistas compartilhada: roda na página de Conquistas e sozinha após mudanças no banco.

// XP table: level -> xp needed
function xpForLevel(level: number): number {
  return level * 100 + (level - 1) * 50;
}

export function getLevelFromXp(totalXp: number): { level: number; currentXp: number; nextLevelXp: number } {
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

export type TrophyRarity = 'bronze' | 'silver' | 'gold' | 'platinum';

export function getAchievementRarity(a: Achievement): TrophyRarity {
  if (a.xp >= 220) return 'gold';
  if (a.xp >= 120) return 'silver';
  return 'bronze';
}

export function rarityMeta(r: TrophyRarity) {
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

function calculateBaseXp(games: number, movies: number, shows: number, anime: number, manga: number, books: number): number {
  // Each media gives XP
  return (games * 30) + (movies * 10) + (shows * 20) + (anime * 15) + (manga * 15) + (books * 20);
}

export type AchievementProgress = Record<string, { current: number; target: number }>;

let queue: Promise<unknown> = Promise.resolve();

// Desbloqueia o que foi atingido, recalcula XP/nível e avisa (evento 'achievements:unlocked') o que acabou de desbloquear.
export function checkAchievements() {
  // Em fila: duas checagens simultâneas desbloqueariam (e notificariam) a mesma conquista duas vezes
  const run = queue.then(runCheck);
  queue = run.catch(() => {});
  return run;
}

async function runCheck(): Promise<{ unlocked: Achievement[]; progress: AchievementProgress }> {
  const db = window.api.db;
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
    db.query('SELECT COUNT(*) as count FROM main_missions WHERE total_games > 0 AND completed_games >= total_games'),
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

  // Progresso (atual/meta) de cada conquista — permite barra de progresso nas bloqueadas
  const P = (current: number, target: number) => ({ current, target });
  const B = (cond: boolean) => ({ current: cond ? 1 : 0, target: 1 });
  const mediaGeneralistDone = [games.length, moviesCount, showsCount, animeCount, mangaCount, booksCount].filter(n => n >= 1).length;

  const progressMap: Record<string, { current: number; target: number }> = {
    first_game: P(games.length, 1),
    ten_games: P(games.length, 10),
    fifty_games: P(games.length, 50),
    hundred_games: P(games.length, 100),
    speedrunner: B(hasSpeedrun),
    marathon: B(hasMarathon),
    perfectionist: P(goldCount, 5),
    bookworm: P(booksCount, 5),
    otaku: P(animeCount, 10),
    cinephile: P(moviesCount, 20),
    binge_watcher: P(showsCount, 5),
    manga_reader: P(mangaCount, 10),
    all_platforms: P(platforms.size, 5),
    genre_explorer: P(genres.size, 8),
    series_complete: P(completeSeries.length, 1),
    five_hundred_hours: P(Math.floor(totalHours), 500),
    thousand_hours: P(Math.floor(totalHours), 1000),
    max_rating: B(hasMaxRating),
    triple_aaa: P(aaaCount, 3),
    daily_player: P(months.size, 12),
    twenty_five_games: P(games.length, 25),
    seventy_five_games: P(games.length, 75),
    one_fifty_games: P(games.length, 150),
    two_hundred_games: P(games.length, 200),
    three_hundred_games: P(games.length, 300),
    first_platinum: P(goldCount, 1),
    ten_platinums: P(goldCount, 10),
    twenty_five_platinums: P(goldCount, 25),
    hundred_hours: P(Math.floor(totalHours), 100),
    two_fifty_hours: P(Math.floor(totalHours), 250),
    seven_fifty_hours: P(Math.floor(totalHours), 750),
    one_thousand_five_hundred_hours: P(Math.floor(totalHours), 1500),
    two_thousand_five_hundred_hours: P(Math.floor(totalHours), 2500),
    tri_platform: P(platforms.size, 3),
    seven_platforms: P(platforms.size, 7),
    ten_platforms: P(platforms.size, 10),
    five_genres: P(genres.size, 5),
    twelve_genres: P(genres.size, 12),
    sixteen_genres: P(genres.size, 16),
    six_months: P(months.size, 6),
    twenty_four_months: P(months.size, 24),
    thirty_six_months: P(months.size, 36),
    five_movies: P(moviesCount, 5),
    fifty_movies: P(moviesCount, 50),
    hundred_movies_plus: P(moviesCount, 100),
    ten_shows: P(showsCount, 10),
    twenty_shows: P(showsCount, 20),
    twenty_five_anime: P(animeCount, 25),
    fifty_anime: P(animeCount, 50),
    twenty_five_manga: P(mangaCount, 25),
    fifty_manga: P(mangaCount, 50),
    ten_books: P(booksCount, 10),
    twenty_five_books: P(booksCount, 25),
    fifty_books: P(booksCount, 50),
    series_triple: P(completeSeries.length, 3),
    series_quintuple: P(completeSeries.length, 5),
    series_decathlon: P(completeSeries.length, 10),
    ten_aaa: P(aaaCount, 10),
    twenty_five_aaa: P(aaaCount, 25),
    rating_master: B(games.length >= 20 && averageRating >= 9),
    critic_mode: B(games.length >= 50 && hasMaxRating && hasLowRating),
    mission_starter: P(completedMissions, 1),
    mission_hunter: P(completedMissions, 10),
    mission_legend: P(completedMissions, 25),
    backlog_builder: P(backlogCount, 25),
    backlog_collector: P(backlogCount, 100),
    media_generalist: P(mediaGeneralistDone, 6),
    total_media_100: P(totalMediaCompleted, 100),
    total_media_300: P(totalMediaCompleted, 300),
    year_rounder: P(uniqueYears.size, 5),
  };

  const isUnlocked = (key: string) => {
    const p = progressMap[key];
    return !!p && p.current >= p.target;
  };
  const pending = currentAchievements.filter((a: Achievement) => !a.unlocked_at && isUnlocked(a.key));
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

  if (pending.length > 0) {
    window.dispatchEvent(new CustomEvent<Achievement[]>('achievements:unlocked', { detail: pending }));
  }
  return { unlocked: pending, progress: progressMap };
}
