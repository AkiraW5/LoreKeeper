import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  // Window controls
  minimize: () => ipcRenderer.invoke('window:minimize'),
  maximize: () => ipcRenderer.invoke('window:maximize'),
  close: () => ipcRenderer.invoke('window:close'),

  // Database operations
  db: {
    getAll: (table: string, orderBy?: string) => ipcRenderer.invoke('db:getAll', table, orderBy),
    getById: (table: string, id: string) => ipcRenderer.invoke('db:getById', table, id),
    insert: (table: string, data: Record<string, any>) => ipcRenderer.invoke('db:insert', table, data),
    update: (table: string, id: string, data: Record<string, any>) => ipcRenderer.invoke('db:update', table, id, data),
    delete: (table: string, id: string) => ipcRenderer.invoke('db:delete', table, id),
    query: (sql: string, params?: any[]) => ipcRenderer.invoke('db:query', sql, params),
    queryOne: (sql: string, params?: any[]) => ipcRenderer.invoke('db:queryOne', sql, params),
    run: (sql: string, params?: any[]) => ipcRenderer.invoke('db:run', sql, params),
  },

  // Settings
  settings: {
    getDbPath: () => ipcRenderer.invoke('settings:getDbPath'),
    getConfig: () => ipcRenderer.invoke('settings:getConfig'),
    selectDbFolder: () => ipcRenderer.invoke('settings:selectDbFolder'),
    setDbFolder: (folder: string | null) => ipcRenderer.invoke('settings:setDbFolder', folder),
  },

  // API Search
  search: {
    games: (query: string) => ipcRenderer.invoke('api:searchGames', query),
    gameDetails: (rawgId: number) => ipcRenderer.invoke('api:gameDetails', rawgId),
    movies: (query: string) => ipcRenderer.invoke('api:searchMovies', query),
    movieDetails: (tmdbId: number) => ipcRenderer.invoke('api:movieDetails', tmdbId),
    tvShows: (query: string) => ipcRenderer.invoke('api:searchTvShows', query),
    tvShowDetails: (tmdbId: number) => ipcRenderer.invoke('api:tvShowDetails', tmdbId),
    books: (query: string) => ipcRenderer.invoke('api:searchBooks', query),
  },

  // Config (API keys)
  config: {
    get: () => ipcRenderer.invoke('api:getConfig'),
    set: (key: string, value: string) => ipcRenderer.invoke('api:setConfig', key, value),
  },
});
