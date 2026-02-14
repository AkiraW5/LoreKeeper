import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { initDatabase, queryAll, queryOne, runSql, saveDatabase, loadConfig, saveConfig, getDbPath, resolveDbPath } from './database';
import { searchGames, getGameDetails, searchMovies, getMovieDetails, searchTvShows, getTvShowDetails, searchBooks } from './api-services';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    frame: false,
    backgroundColor: '#0a0a0e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // DevTools com F12 — apenas em modo de desenvolvimento
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.webContents.on('before-input-event', (_event, input) => {
      if (input.key === 'F12') {
        mainWindow?.webContents.toggleDevTools();
      }
    });
  }
}

app.whenReady().then(async () => {
  await initDatabase();
  setupIpcHandlers();
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// Window controls — use handle (invoke) so the renderer gets a response
ipcMain.handle('window:minimize', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.minimize();
});
ipcMain.handle('window:maximize', (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win?.isMaximized()) {
    win.unmaximize();
  } else {
    win?.maximize();
  }
});
ipcMain.handle('window:close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});

// Whitelist de tabelas válidas para evitar SQL injection
const ALLOWED_TABLES = [
  'completed_games', 'game_backlog', 'game_series', 'game_series_entries',
  'movies', 'tv_shows', 'animes', 'manga', 'books', 'missions', 'achievements',
];

function assertTable(table: string) {
  if (!ALLOWED_TABLES.includes(table)) {
    throw new Error(`Tabela não permitida: ${table}`);
  }
}

const ALLOWED_ORDER_COLUMNS = [
  'created_at', 'updated_at', 'completion_date', 'name', 'title', 'watch_date',
  'start_date', 'end_date', 'rating', 'play_time', 'sort_order',
];

function sanitizeOrderBy(orderBy: string): string {
  const parts = orderBy.trim().split(/\s+/);
  const col = parts[0];
  const dir = (parts[1] || 'DESC').toUpperCase();
  if (!ALLOWED_ORDER_COLUMNS.includes(col)) return 'created_at DESC';
  if (dir !== 'ASC' && dir !== 'DESC') return `${col} DESC`;
  return `${col} ${dir}`;
}

function setupIpcHandlers() {
  // === GENERIC CRUD ===
  ipcMain.handle('db:getAll', (_event, table: string, orderBy?: string) => {
    assertTable(table);
    const order = sanitizeOrderBy(orderBy || 'created_at DESC');
    return queryAll(`SELECT * FROM ${table} ORDER BY ${order}`);
  });

  ipcMain.handle('db:getById', (_event, table: string, id: string) => {
    assertTable(table);
    return queryOne(`SELECT * FROM ${table} WHERE id = ?`, [id]);
  });

  ipcMain.handle('db:insert', (_event, table: string, data: Record<string, any>) => {
    assertTable(table);
    const keys = Object.keys(data);
    const placeholders = keys.map(() => '?').join(', ');
    const values = Object.values(data);
    runSql(`INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders})`, values);
    return { changes: 1 };
  });

  ipcMain.handle('db:update', (_event, table: string, id: string, data: Record<string, any>) => {
    assertTable(table);
    const sets = Object.keys(data).map(k => `${k} = ?`).join(', ');
    const values = [...Object.values(data), id];
    runSql(`UPDATE ${table} SET ${sets} WHERE id = ?`, values);
    return { changes: 1 };
  });

  ipcMain.handle('db:delete', (_event, table: string, id: string) => {
    assertTable(table);
    runSql(`DELETE FROM ${table} WHERE id = ?`, [id]);
    return { changes: 1 };
  });

  // === STATS / CUSTOM QUERIES ===
  ipcMain.handle('db:query', (_event, sql: string, params?: any[]) => {
    return queryAll(sql, params);
  });

  ipcMain.handle('db:queryOne', (_event, sql: string, params?: any[]) => {
    return queryOne(sql, params);
  });

  ipcMain.handle('db:run', (_event, sql: string, params?: any[]) => {
    runSql(sql, params);
    return { changes: 1 };
  });

  // === SETTINGS ===
  ipcMain.handle('settings:getDbPath', () => {
    return getDbPath();
  });

  ipcMain.handle('settings:getConfig', () => {
    return loadConfig();
  });

  ipcMain.handle('settings:selectDbFolder', async () => {
    const result = await dialog.showOpenDialog(mainWindow!, {
      title: 'Selecionar pasta para o banco de dados',
      properties: ['openDirectory'],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  ipcMain.handle('settings:setDbFolder', async (_event, folderPath: string | null) => {
    const cfg = loadConfig();
    const oldDbPath = getDbPath();

    if (folderPath) {
      // Copy DB to new location if it doesn't exist there
      const newDbPath = path.join(folderPath, 'lorekeeper.db');
      if (!fs.existsSync(newDbPath) && fs.existsSync(oldDbPath)) {
        fs.copyFileSync(oldDbPath, newDbPath);
      }
      cfg.dbFolder = folderPath;
    } else {
      // Revert to default — copy back if needed
      const defaultPath = resolveDbPath();
      if (!fs.existsSync(defaultPath) && fs.existsSync(oldDbPath)) {
        fs.copyFileSync(oldDbPath, defaultPath);
      }
      delete cfg.dbFolder;
    }

    saveConfig(cfg);
    // Reinitialize database with new path
    await initDatabase();
    return { success: true, newPath: getDbPath() };
  });

  // === API SEARCH ===
  ipcMain.handle('api:searchGames', async (_event, query: string) => {
    const cfg = loadConfig();
    return searchGames(query, cfg.rawgApiKey || '');
  });

  ipcMain.handle('api:gameDetails', async (_event, rawgId: number) => {
    const cfg = loadConfig();
    return getGameDetails(rawgId, cfg.rawgApiKey || '');
  });

  ipcMain.handle('api:searchMovies', async (_event, query: string) => {
    const cfg = loadConfig();
    return searchMovies(query, cfg.tmdbApiKey || '');
  });

  ipcMain.handle('api:movieDetails', async (_event, tmdbId: number) => {
    const cfg = loadConfig();
    return getMovieDetails(tmdbId, cfg.tmdbApiKey || '');
  });

  ipcMain.handle('api:searchTvShows', async (_event, query: string) => {
    const cfg = loadConfig();
    return searchTvShows(query, cfg.tmdbApiKey || '');
  });

  ipcMain.handle('api:tvShowDetails', async (_event, tmdbId: number) => {
    const cfg = loadConfig();
    return getTvShowDetails(tmdbId, cfg.tmdbApiKey || '');
  });

  ipcMain.handle('api:searchBooks', async (_event, query: string) => {
    return searchBooks(query);
  });

  ipcMain.handle('api:getConfig', () => {
    return loadConfig();
  });

  ipcMain.handle('api:setConfig', (_event, key: string, value: string) => {
    const cfg = loadConfig();
    (cfg as any)[key] = value;
    saveConfig(cfg);
    return { success: true };
  });
}
