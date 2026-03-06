/// <reference types="vite/client" />

interface Window {
  api: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    db: {
      getAll: (table: string, orderBy?: string) => Promise<any[]>;
      getById: (table: string, id: string) => Promise<any>;
      insert: (table: string, data: Record<string, any>) => Promise<any>;
      update: (table: string, id: string, data: Record<string, any>) => Promise<any>;
      delete: (table: string, id: string) => Promise<any>;
      query: (sql: string, params?: any[]) => Promise<any[]>;
      queryOne: (sql: string, params?: any[]) => Promise<any>;
      run: (sql: string, params?: any[]) => Promise<any>;
    };
    settings: {
      getDbPath: () => Promise<string>;
      getConfig: () => Promise<any>;
      selectDbFolder: () => Promise<string | null>;
      setDbFolder: (folder: string | null) => Promise<any>;
    };
    search: {
      games: (query: string) => Promise<any[]>;
      gameDetails: (rawgId: number) => Promise<any>;
      movies: (query: string) => Promise<any[]>;
      movieDetails: (tmdbId: number) => Promise<any>;
      tvShows: (query: string) => Promise<any[]>;
      tvShowDetails: (tmdbId: number) => Promise<any>;
      books: (query: string) => Promise<any[]>;
    };
    config: {
      get: () => Promise<any>;
      set: (key: string, value: string) => Promise<any>;
    };
  };
}
