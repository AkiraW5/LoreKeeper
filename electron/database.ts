import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

let db: SqlJsDatabase;
let dbPath: string;

// ---- Config file (stores user preferences like custom DB path) ----
const CONFIG_FILE = 'lorekeeper-config.json';

interface AppConfig {
  dbFolder?: string; // custom folder (e.g. Google Drive)
  rawgApiKey?: string;
  tmdbApiKey?: string;
}

function getConfigPath(): string {
  return path.join(app.getPath('userData'), CONFIG_FILE);
}

export function loadConfig(): AppConfig {
  try {
    const cfgPath = getConfigPath();
    if (fs.existsSync(cfgPath)) {
      return JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
    }
  } catch { /* ignore */ }
  return {};
}

export function saveConfig(cfg: AppConfig) {
  fs.writeFileSync(getConfigPath(), JSON.stringify(cfg, null, 2), 'utf-8');
}

export function getDbPath(): string {
  return dbPath;
}

export function resolveDbPath(): string {
  const cfg = loadConfig();
  if (cfg.dbFolder && fs.existsSync(cfg.dbFolder)) {
    return path.join(cfg.dbFolder, 'lorekeeper.db');
  }
  return path.join(app.getPath('userData'), 'lorekeeper.db');
}

export async function initDatabase(customPath?: string) {
  // Locate the sql.js WASM file
  let wasmBinary: Buffer | undefined;

  // In production: check extraResources first
  const resourcesPath = (process as any).resourcesPath;
  if (resourcesPath) {
    const prodWasm = path.join(resourcesPath, 'sql-wasm.wasm');
    if (fs.existsSync(prodWasm)) {
      wasmBinary = fs.readFileSync(prodWasm);
    }
  }

  // In dev: load from node_modules
  if (!wasmBinary) {
    try {
      const sqlJsPath = path.dirname(require.resolve('sql.js'));
      const wasmPath = path.join(sqlJsPath, 'dist', 'sql-wasm.wasm');
      if (fs.existsSync(wasmPath)) {
        wasmBinary = fs.readFileSync(wasmPath);
      } else {
        const altPath = path.join(sqlJsPath, 'sql-wasm.wasm');
        if (fs.existsSync(altPath)) {
          wasmBinary = fs.readFileSync(altPath);
        }
      }
    } catch { /* not in dev */ }
  }

  const SQL = await initSqlJs(wasmBinary ? { wasmBinary } : undefined);
  dbPath = customPath || resolveDbPath();

  try {
    if (fs.existsSync(dbPath)) {
      const buffer = fs.readFileSync(dbPath);
      db = new SQL.Database(buffer);
    } else {
      db = new SQL.Database();
    }
  } catch {
    db = new SQL.Database();
  }

  db.run('PRAGMA foreign_keys = ON');
  createTables();
  saveDatabase();
  return db;
}

export function getDatabase() {
  return db;
}

export function saveDatabase() {
  if (!db || !dbPath) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

/** Helper: run a SELECT and return array of row objects */
export function queryAll(sql: string, params?: any[]): any[] {
  const stmt = db.prepare(sql);
  if (params) stmt.bind(params);
  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/** Helper: run a SELECT and return first row object or null */
export function queryOne(sql: string, params?: any[]): any {
  const rows = queryAll(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

/** Helper: run INSERT/UPDATE/DELETE */
export function runSql(sql: string, params?: any[]) {
  db.run(sql, params);
  saveDatabase();
}

function createTables() {
  const statements = [
    `CREATE TABLE IF NOT EXISTS completed_games (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      console TEXT NOT NULL DEFAULT 'PC',
      genre TEXT NOT NULL DEFAULT 'Ação',
      type TEXT NOT NULL DEFAULT '',
      completion_date TEXT NOT NULL,
      play_time TEXT NOT NULL DEFAULT '0:00:00',
      rating INTEGER NOT NULL DEFAULT 7,
      difficulty TEXT NOT NULL DEFAULT 'B',
      completion_condition TEXT NOT NULL DEFAULT 'Termine o jogo',
      is_gold INTEGER NOT NULL DEFAULT 0,
      mission_complete INTEGER NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS game_backlog (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      genre TEXT NOT NULL DEFAULT 'Ação',
      expected_hours REAL NOT NULL DEFAULT 10,
      desire_level INTEGER NOT NULL DEFAULT 3,
      mission_complete INTEGER NOT NULL DEFAULT 0,
      owned INTEGER NOT NULL DEFAULT 0,
      currently_playing INTEGER NOT NULL DEFAULT 0,
      platform TEXT NOT NULL DEFAULT 'PC',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS game_series (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      cover_url TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS game_series_entries (
      id TEXT PRIMARY KEY,
      series_id TEXT NOT NULL,
      name TEXT NOT NULL,
      cover_url TEXT DEFAULT '',
      is_main INTEGER NOT NULL DEFAULT 1,
      is_completed INTEGER NOT NULL DEFAULT 0,
      completion_date TEXT DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (series_id) REFERENCES game_series(id) ON DELETE CASCADE
    )`,
    `CREATE TABLE IF NOT EXISTS main_missions (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      total_games INTEGER NOT NULL DEFAULT 0,
      completed_games INTEGER NOT NULL DEFAULT 0,
      target_date TEXT DEFAULT '',
      cover_url TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS movies (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      genre TEXT NOT NULL DEFAULT 'Ação',
      director TEXT DEFAULT '',
      year INTEGER DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Planejado',
      watch_date TEXT NOT NULL,
      duration_min INTEGER NOT NULL DEFAULT 120,
      rating INTEGER NOT NULL DEFAULT 7,
      platform TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS tv_shows (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      genre TEXT NOT NULL DEFAULT 'Drama',
      seasons_watched INTEGER NOT NULL DEFAULT 0,
      total_seasons INTEGER NOT NULL DEFAULT 1,
      episodes_watched INTEGER NOT NULL DEFAULT 0,
      total_episodes INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Assistindo',
      rating INTEGER DEFAULT NULL,
      platform TEXT DEFAULT '',
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS animes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      genre TEXT NOT NULL DEFAULT 'Ação',
      type TEXT NOT NULL DEFAULT 'TV',
      seasons_watched INTEGER NOT NULL DEFAULT 0,
      total_seasons INTEGER NOT NULL DEFAULT 1,
      episodes_watched INTEGER NOT NULL DEFAULT 0,
      total_episodes INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Assistindo',
      rating INTEGER DEFAULT NULL,
      studio TEXT DEFAULT '',
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS manga (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      genre TEXT NOT NULL DEFAULT 'Ação',
      type TEXT NOT NULL DEFAULT 'Mangá',
      chapters_read INTEGER NOT NULL DEFAULT 0,
      total_chapters INTEGER NOT NULL DEFAULT 0,
      volumes_read INTEGER NOT NULL DEFAULT 0,
      total_volumes INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Lendo',
      rating INTEGER DEFAULT NULL,
      author TEXT DEFAULT '',
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      genre TEXT NOT NULL DEFAULT 'Ficção',
      type TEXT NOT NULL DEFAULT 'Livro',
      author TEXT DEFAULT '',
      pages_read INTEGER NOT NULL DEFAULT 0,
      total_pages INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'Lendo',
      rating INTEGER DEFAULT NULL,
      start_date TEXT DEFAULT '',
      end_date TEXT DEFAULT '',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    // Vincular entries de séries com jogos zerados
    `CREATE TABLE IF NOT EXISTS game_series_entries_link (
      entry_id TEXT NOT NULL,
      completed_game_id TEXT NOT NULL,
      PRIMARY KEY (entry_id, completed_game_id),
      FOREIGN KEY (entry_id) REFERENCES game_series_entries(id) ON DELETE CASCADE,
      FOREIGN KEY (completed_game_id) REFERENCES completed_games(id) ON DELETE CASCADE
    )`,
    // Conquistas
    `CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      key TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '🏆',
      xp INTEGER NOT NULL DEFAULT 50,
      unlocked_at TEXT DEFAULT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    // Perfil de XP
    `CREATE TABLE IF NOT EXISTS user_profile (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      total_xp INTEGER NOT NULL DEFAULT 0,
      level INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
  ];

  for (const sql of statements) {
    db.run(sql);
  }

  // Migrações de colunas (add cover, description, etc.)
  runMigrations();

  // Garantir que o perfil do usuário exista
  const profile = queryAll('SELECT * FROM user_profile WHERE id = 1');
  if (profile.length === 0) {
    db.run("INSERT INTO user_profile (id, total_xp, level) VALUES (1, 0, 1)");
  }

  // Inserir conquistas padrão (se não existirem)
  seedAchievements();
}

function runMigrations() {
  const columns = [
    'ALTER TABLE completed_games ADD COLUMN cover_url TEXT DEFAULT ""',
    'ALTER TABLE completed_games ADD COLUMN description TEXT DEFAULT ""',
    'ALTER TABLE completed_games ADD COLUMN developer TEXT DEFAULT ""',
    'ALTER TABLE completed_games ADD COLUMN mission_id TEXT DEFAULT ""',
    'ALTER TABLE game_backlog ADD COLUMN cover_url TEXT DEFAULT ""',
    'ALTER TABLE game_backlog ADD COLUMN description TEXT DEFAULT ""',
    'ALTER TABLE movies ADD COLUMN cover_url TEXT DEFAULT ""',
    'ALTER TABLE movies ADD COLUMN overview TEXT DEFAULT ""',
    'ALTER TABLE movies ADD COLUMN status TEXT NOT NULL DEFAULT "Concluído"',
    'ALTER TABLE tv_shows ADD COLUMN cover_url TEXT DEFAULT ""',
    'ALTER TABLE tv_shows ADD COLUMN overview TEXT DEFAULT ""',
    'ALTER TABLE animes ADD COLUMN cover_url TEXT DEFAULT ""',
    'ALTER TABLE animes ADD COLUMN overview TEXT DEFAULT ""',
    'ALTER TABLE manga ADD COLUMN cover_url TEXT DEFAULT ""',
    'ALTER TABLE books ADD COLUMN cover_url TEXT DEFAULT ""',
    'ALTER TABLE books ADD COLUMN description TEXT DEFAULT ""',
    'ALTER TABLE main_missions ADD COLUMN cover_url TEXT DEFAULT ""',
    'ALTER TABLE game_series ADD COLUMN cover_url TEXT DEFAULT ""',
    'ALTER TABLE game_series_entries ADD COLUMN cover_url TEXT DEFAULT ""',
  ];
  for (const sql of columns) {
    try { db.run(sql); } catch { /* column already exists */ }
  }
}

function seedAchievements() {
  const achievements = [
    { key: 'first_game', name: 'Primeiro Passo', description: 'Zerar o primeiro jogo', icon: '🎮', xp: 50 },
    { key: 'ten_games', name: 'Veterano', description: 'Zerar 10 jogos', icon: '⭐', xp: 100 },
    { key: 'fifty_games', name: 'Lendário', description: 'Zerar 50 jogos', icon: '👑', xp: 250 },
    { key: 'hundred_games', name: 'Centurião', description: 'Zerar 100 jogos', icon: '💎', xp: 500 },
    { key: 'speedrunner', name: 'Speedrunner', description: 'Zerar um jogo em menos de 2 horas', icon: '⚡', xp: 100 },
    { key: 'marathon', name: 'Maratonista', description: 'Zerar um jogo com mais de 100 horas', icon: '🏃', xp: 150 },
    { key: 'perfectionist', name: 'Perfeccionista', description: 'Obter 5 jogos com 100%/Platina', icon: '🏆', xp: 200 },
    { key: 'bookworm', name: 'Rato de Biblioteca', description: 'Ler 5 livros', icon: '📚', xp: 100 },
    { key: 'otaku', name: 'Otaku', description: 'Assistir 10 animes', icon: '🍥', xp: 100 },
    { key: 'cinephile', name: 'Cinéfilo', description: 'Assistir 20 filmes', icon: '🎬', xp: 100 },
    { key: 'binge_watcher', name: 'Binge Watcher', description: 'Concluir 5 séries de TV', icon: '📺', xp: 100 },
    { key: 'manga_reader', name: 'Leitor de Mangá', description: 'Ler 10 mangás', icon: '📖', xp: 100 },
    { key: 'all_platforms', name: 'Multiplataforma', description: 'Zerar jogos em 5+ plataformas diferentes', icon: '🌐', xp: 150 },
    { key: 'genre_explorer', name: 'Explorador de Gêneros', description: 'Zerar jogos de 8+ gêneros diferentes', icon: '🗺️', xp: 150 },
    { key: 'series_complete', name: 'Colecionador', description: 'Completar uma série de jogos inteira', icon: '📦', xp: 200 },
    { key: 'five_hundred_hours', name: '500 Horas', description: 'Acumular 500 horas de jogo', icon: '⏰', xp: 200 },
    { key: 'thousand_hours', name: 'Mil Horas', description: 'Acumular 1000 horas de jogo', icon: '🔥', xp: 500 },
    { key: 'max_rating', name: 'Jogo da Vida', description: 'Dar nota 11 para um jogo', icon: '💫', xp: 50 },
    { key: 'triple_aaa', name: 'Desafio AAA', description: 'Zerar 3 jogos com dificuldade AAA', icon: '💀', xp: 200 },
    { key: 'daily_player', name: 'Dedicado', description: 'Zerar jogos em 12+ meses diferentes', icon: '📅', xp: 150 },
    { key: 'twenty_five_games', name: 'Catálogo em Alta', description: 'Zerar 25 jogos', icon: '🕹️', xp: 140 },
    { key: 'seventy_five_games', name: 'Ritmo Implacável', description: 'Zerar 75 jogos', icon: '🚀', xp: 240 },
    { key: 'one_fifty_games', name: 'Arquivo Supremo', description: 'Zerar 150 jogos', icon: '📀', xp: 380 },
    { key: 'two_hundred_games', name: 'Muralha dos 200', description: 'Zerar 200 jogos', icon: '🏛️', xp: 500 },
    { key: 'three_hundred_games', name: 'Imperador do Backlog', description: 'Zerar 300 jogos', icon: '🧠', xp: 700 },
    { key: 'first_platinum', name: 'Primeira Platina', description: 'Conseguir o primeiro 100%/Platina', icon: '🥇', xp: 110 },
    { key: 'ten_platinums', name: 'Caçador de Troféus', description: 'Conseguir 10 platinas', icon: '🏅', xp: 260 },
    { key: 'twenty_five_platinums', name: 'Museu de Platinas', description: 'Conseguir 25 platinas', icon: '🏆', xp: 430 },
    { key: 'hundred_hours', name: 'Cem Horas', description: 'Acumular 100 horas de jogo', icon: '⌛', xp: 120 },
    { key: 'two_fifty_hours', name: 'Turno Extra', description: 'Acumular 250 horas de jogo', icon: '⏳', xp: 180 },
    { key: 'seven_fifty_hours', name: 'Noites em Claro', description: 'Acumular 750 horas de jogo', icon: '🌙', xp: 300 },
    { key: 'one_thousand_five_hundred_hours', name: 'Vida no Controle', description: 'Acumular 1500 horas de jogo', icon: '🧩', xp: 520 },
    { key: 'two_thousand_five_hundred_hours', name: 'Tempo Absoluto', description: 'Acumular 2500 horas de jogo', icon: '🪐', xp: 760 },
    { key: 'tri_platform', name: 'Tríade Gamer', description: 'Zerar em 3 plataformas diferentes', icon: '🎛️', xp: 120 },
    { key: 'seven_platforms', name: 'Poliglota de Plataforma', description: 'Zerar em 7 plataformas diferentes', icon: '🛰️', xp: 230 },
    { key: 'ten_platforms', name: 'Mestre Multiplataforma', description: 'Zerar em 10 plataformas diferentes', icon: '🌌', xp: 380 },
    { key: 'five_genres', name: 'Curioso', description: 'Zerar jogos de 5 gêneros diferentes', icon: '🧭', xp: 120 },
    { key: 'twelve_genres', name: 'Versátil', description: 'Zerar jogos de 12 gêneros diferentes', icon: '🎨', xp: 230 },
    { key: 'sixteen_genres', name: 'Enciclopédia Gamer', description: 'Zerar jogos de 16 gêneros diferentes', icon: '📚', xp: 360 },
    { key: 'six_months', name: 'Semestre Ativo', description: 'Zerar jogos em 6 meses diferentes', icon: '🗓️', xp: 120 },
    { key: 'twenty_four_months', name: 'Dois Anos de Foco', description: 'Zerar jogos em 24 meses diferentes', icon: '📆', xp: 280 },
    { key: 'thirty_six_months', name: 'Três Anos de Constância', description: 'Zerar jogos em 36 meses diferentes', icon: '🧱', xp: 420 },
    { key: 'five_movies', name: 'Sessão da Tarde', description: 'Concluir 5 filmes', icon: '🍿', xp: 90 },
    { key: 'fifty_movies', name: 'Maratona de Cinema', description: 'Concluir 50 filmes', icon: '🎞️', xp: 220 },
    { key: 'hundred_movies_plus', name: 'Tela Infinita', description: 'Concluir 100 filmes', icon: '📽️', xp: 360 },
    { key: 'ten_shows', name: 'Temporada Completa', description: 'Concluir 10 séries de TV', icon: '📺', xp: 180 },
    { key: 'twenty_shows', name: 'Rei das Séries', description: 'Concluir 20 séries de TV', icon: '🧷', xp: 320 },
    { key: 'twenty_five_anime', name: 'Clube Otaku', description: 'Concluir 25 animes', icon: '🍙', xp: 220 },
    { key: 'fifty_anime', name: 'Lenda Otaku', description: 'Concluir 50 animes', icon: '🎌', xp: 360 },
    { key: 'twenty_five_manga', name: 'Coleção de Mangás', description: 'Concluir 25 mangás', icon: '📗', xp: 220 },
    { key: 'fifty_manga', name: 'Mangaká Honorário', description: 'Concluir 50 mangás', icon: '📚', xp: 360 },
    { key: 'ten_books', name: 'Leitor Assíduo', description: 'Concluir 10 livros', icon: '📘', xp: 180 },
    { key: 'twenty_five_books', name: 'Biblioteca Portátil', description: 'Concluir 25 livros', icon: '📙', xp: 320 },
    { key: 'fifty_books', name: 'Guardião dos Livros', description: 'Concluir 50 livros', icon: '🧾', xp: 500 },
    { key: 'series_triple', name: 'Trilogia Fechada', description: 'Completar 3 séries de jogos', icon: '🧩', xp: 220 },
    { key: 'series_quintuple', name: 'Franquias em Dia', description: 'Completar 5 séries de jogos', icon: '🧱', xp: 360 },
    { key: 'series_decathlon', name: 'Arquiteto de Sagas', description: 'Completar 10 séries de jogos', icon: '🗃️', xp: 560 },
    { key: 'ten_aaa', name: 'Especialista AAA', description: 'Zerar 10 jogos com dificuldade AAA', icon: '⚔️', xp: 260 },
    { key: 'twenty_five_aaa', name: 'Titã AAA', description: 'Zerar 25 jogos com dificuldade AAA', icon: '🛡️', xp: 460 },
    { key: 'rating_master', name: 'Curadoria de Elite', description: 'Média de nota 9+ com ao menos 20 jogos', icon: '🌟', xp: 300 },
    { key: 'critic_mode', name: 'Crítico Imparcial', description: 'Ter ao menos uma nota 11 e uma nota 4 ou menor', icon: '🧪', xp: 220 },
    { key: 'mission_starter', name: 'Início de Missões', description: 'Concluir a primeira missão principal', icon: '🎯', xp: 120 },
    { key: 'mission_hunter', name: 'Caçador de Missões', description: 'Concluir 10 missões principais', icon: '🗡️', xp: 260 },
    { key: 'mission_legend', name: 'Lenda das Missões', description: 'Concluir 25 missões principais', icon: '🦾', xp: 480 },
    { key: 'backlog_builder', name: 'Planejador', description: 'Ter 25 jogos no backlog', icon: '📝', xp: 150 },
    { key: 'backlog_collector', name: 'Colecionador de Backlog', description: 'Ter 100 jogos no backlog', icon: '📥', xp: 320 },
    { key: 'media_generalist', name: 'Generalista', description: 'Concluir ao menos 1 item em cada mídia', icon: '🧬', xp: 250 },
    { key: 'total_media_100', name: 'Ecossistema 100', description: 'Concluir 100 itens no total entre todas as mídias', icon: '🧠', xp: 350 },
    { key: 'total_media_300', name: 'Ecossistema 300', description: 'Concluir 300 itens no total entre todas as mídias', icon: '🌠', xp: 650 },
    { key: 'year_rounder', name: 'Coleção de Eras', description: 'Zerar jogos em 5 anos diferentes', icon: '🏛️', xp: 220 },
  ];

  for (const a of achievements) {
    const existing = queryAll('SELECT id FROM achievements WHERE key = ?', [a.key]);
    if (existing.length === 0) {
      db.run(
        'INSERT INTO achievements (id, key, name, description, icon, xp) VALUES (?, ?, ?, ?, ?, ?)',
        [generateDbId(), a.key, a.name, a.description, a.icon, a.xp]
      );
    }
  }
}

function generateDbId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}
