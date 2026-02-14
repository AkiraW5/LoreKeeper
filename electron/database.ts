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
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS game_series_entries (
      id TEXT PRIMARY KEY,
      series_id TEXT NOT NULL,
      name TEXT NOT NULL,
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
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS movies (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      genre TEXT NOT NULL DEFAULT 'Ação',
      director TEXT DEFAULT '',
      year INTEGER DEFAULT 0,
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
    'ALTER TABLE game_backlog ADD COLUMN cover_url TEXT DEFAULT ""',
    'ALTER TABLE game_backlog ADD COLUMN description TEXT DEFAULT ""',
    'ALTER TABLE movies ADD COLUMN cover_url TEXT DEFAULT ""',
    'ALTER TABLE movies ADD COLUMN overview TEXT DEFAULT ""',
    'ALTER TABLE tv_shows ADD COLUMN cover_url TEXT DEFAULT ""',
    'ALTER TABLE tv_shows ADD COLUMN overview TEXT DEFAULT ""',
    'ALTER TABLE animes ADD COLUMN cover_url TEXT DEFAULT ""',
    'ALTER TABLE animes ADD COLUMN overview TEXT DEFAULT ""',
    'ALTER TABLE manga ADD COLUMN cover_url TEXT DEFAULT ""',
    'ALTER TABLE books ADD COLUMN cover_url TEXT DEFAULT ""',
    'ALTER TABLE books ADD COLUMN description TEXT DEFAULT ""',
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
