import { contextBridge, ipcRenderer } from 'electron';

// Avisa o renderer quando dados mudam (usado para checar conquistas na hora).
// Escritas em achievements/user_profile são da própria checagem e não contam, senão vira loop.
const dbListeners = new Set<() => void>();
function changed<T>(p: Promise<T>): Promise<T> {
  return p.then(r => { dbListeners.forEach(cb => cb()); return r; });
}

contextBridge.exposeInMainWorld('api', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),

  // Database operations
  db: {
    getAll: (table: string, orderBy?: string) => ipcRenderer.invoke('db:getAll', table, orderBy),
    getById: (table: string, id: string) => ipcRenderer.invoke('db:getById', table, id),
    insert: (table: string, data: Record<string, any>) => changed(ipcRenderer.invoke('db:insert', table, data)),
    update: (table: string, id: string, data: Record<string, any>) => changed(ipcRenderer.invoke('db:update', table, id, data)),
    delete: (table: string, id: string) => changed(ipcRenderer.invoke('db:delete', table, id)),
    query: (sql: string, params?: any[]) => ipcRenderer.invoke('db:query', sql, params),
    queryOne: (sql: string, params?: any[]) => ipcRenderer.invoke('db:queryOne', sql, params),
    run: (sql: string, params?: any[]) => {
      const p = ipcRenderer.invoke('db:run', sql, params);
      return /(achievements|user_profile)/i.test(sql) ? p : changed(p);
    },
    onChange: (cb: () => void) => {
      dbListeners.add(cb);
      return () => { dbListeners.delete(cb); };
    },
  },

  // Settings
  settings: {
    getDbPath: () => ipcRenderer.invoke('settings:getDbPath'),
    getConfig: () => ipcRenderer.invoke('settings:getConfig'),
    selectDbFolder: () => ipcRenderer.invoke('settings:selectDbFolder'),
    setDbFolder: (folder: string | null) => ipcRenderer.invoke('settings:setDbFolder', folder),
    selectImage: () => ipcRenderer.invoke('settings:selectImage'),
  },

  // API Search
  search: {
    games: (query: string) => ipcRenderer.invoke('api:searchGames', query),
    gameDetails: (id: string) => ipcRenderer.invoke('api:gameDetails', id),
    movies: (query: string) => ipcRenderer.invoke('api:searchMovies', query),
    movieDetails: (tmdbId: number) => ipcRenderer.invoke('api:movieDetails', tmdbId),
    tvShows: (query: string) => ipcRenderer.invoke('api:searchTvShows', query),
    tvShowDetails: (tmdbId: number) => ipcRenderer.invoke('api:tvShowDetails', tmdbId),
    books: (query: string) => ipcRenderer.invoke('api:searchBooks', query),
    manga: (query: string) => ipcRenderer.invoke('api:searchManga', query),
  },

  // Auto-update
  updates: {
    check: () => ipcRenderer.invoke('update:check'),
    download: () => ipcRenderer.invoke('update:download'),
    openNotes: (version: string) => ipcRenderer.invoke('update:openNotes', version),
    on: (channel: 'available' | 'progress' | 'error', cb: (payload: any) => void) => {
      const listener = (_e: Electron.IpcRendererEvent, payload: any) => cb(payload);
      ipcRenderer.on(`update:${channel}`, listener);
      return () => { ipcRenderer.removeListener(`update:${channel}`, listener); };
    },
  },

  // Helpers

  // Config (API keys)
  config: {
    get: () => ipcRenderer.invoke('api:getConfig'),
    set: (key: string, value: string) => ipcRenderer.invoke('api:setConfig', key, value),
  },
});
