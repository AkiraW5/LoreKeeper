// =========================================
// API Services — Busca de metadados externos
// =========================================

export interface GameSearchResult {
  rawg_id: number;
  name: string;
  cover_url: string;
  released: string;
  genres: string[];
  platforms: string[];
}

export interface GameDetailsResult {
  name: string;
  cover_url: string;
  description: string;
  developer: string;
  genres: string[];
  platforms: string[];
  released: string;
}

export interface MovieSearchResult {
  tmdb_id: number;
  title: string;
  cover_url: string;
  overview: string;
  year: number;
}

export interface MovieDetailsResult {
  title: string;
  cover_url: string;
  overview: string;
  year: number;
  director: string;
  genres: string[];
  duration_min: number;
}

export interface TvSearchResult {
  tmdb_id: number;
  title: string;
  cover_url: string;
  overview: string;
  year: number;
}

export interface TvDetailsResult {
  title: string;
  cover_url: string;
  overview: string;
  year: number;
  genres: string[];
  total_seasons: number;
  total_episodes: number;
}

export interface BookSearchResult {
  title: string;
  author: string;
  cover_url: string;
  description: string;
  total_pages: number;
  genre: string;
}

// ==========================================
// RAWG.io — Jogos
// ==========================================

export async function searchGames(query: string, apiKey: string): Promise<GameSearchResult[]> {
  if (!apiKey || !query.trim()) return [];
  try {
    const url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(query)}&page_size=8`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).map((g: any) => ({
      rawg_id: g.id,
      name: g.name,
      cover_url: g.background_image || '',
      released: g.released || '',
      genres: (g.genres || []).map((x: any) => x.name),
      platforms: (g.platforms || []).map((p: any) => p.platform.name),
    }));
  } catch {
    return [];
  }
}

export async function getGameDetails(rawgId: number, apiKey: string): Promise<GameDetailsResult | null> {
  if (!apiKey) return null;
  try {
    const url = `https://api.rawg.io/api/games/${rawgId}?key=${apiKey}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const g = await res.json();
    return {
      name: g.name,
      cover_url: g.background_image || '',
      description: (g.description_raw || '').substring(0, 500),
      developer: (g.developers || []).map((d: any) => d.name).join(', '),
      genres: (g.genres || []).map((x: any) => x.name),
      platforms: (g.platforms || []).map((p: any) => p.platform.name),
      released: g.released || '',
    };
  } catch {
    return null;
  }
}

// ==========================================
// TMDB — Filmes
// ==========================================

const TMDB_IMG = 'https://image.tmdb.org/t/p/w300';

export async function searchMovies(query: string, apiKey: string): Promise<MovieSearchResult[]> {
  if (!apiKey || !query.trim()) return [];
  try {
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=pt-BR&page=1`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).slice(0, 8).map((m: any) => ({
      tmdb_id: m.id,
      title: m.title,
      cover_url: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : '',
      overview: m.overview || '',
      year: m.release_date ? parseInt(m.release_date.substring(0, 4)) : 0,
    }));
  } catch {
    return [];
  }
}

export async function getMovieDetails(tmdbId: number, apiKey: string): Promise<MovieDetailsResult | null> {
  if (!apiKey) return null;
  try {
    const url = `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${apiKey}&language=pt-BR&append_to_response=credits`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const m = await res.json();
    const director = (m.credits?.crew || []).find((c: any) => c.job === 'Director')?.name || '';
    return {
      title: m.title,
      cover_url: m.poster_path ? `${TMDB_IMG}${m.poster_path}` : '',
      overview: (m.overview || '').substring(0, 500),
      year: m.release_date ? parseInt(m.release_date.substring(0, 4)) : 0,
      director,
      genres: (m.genres || []).map((g: any) => g.name),
      duration_min: m.runtime || 0,
    };
  } catch {
    return null;
  }
}

// ==========================================
// TMDB — Séries de TV / Anime
// ==========================================

export async function searchTvShows(query: string, apiKey: string): Promise<TvSearchResult[]> {
  if (!apiKey || !query.trim()) return [];
  try {
    const url = `https://api.themoviedb.org/3/search/tv?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=pt-BR&page=1`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.results || []).slice(0, 8).map((s: any) => ({
      tmdb_id: s.id,
      title: s.name,
      cover_url: s.poster_path ? `${TMDB_IMG}${s.poster_path}` : '',
      overview: s.overview || '',
      year: s.first_air_date ? parseInt(s.first_air_date.substring(0, 4)) : 0,
    }));
  } catch {
    return [];
  }
}

export async function getTvShowDetails(tmdbId: number, apiKey: string): Promise<TvDetailsResult | null> {
  if (!apiKey) return null;
  try {
    const url = `https://api.themoviedb.org/3/tv/${tmdbId}?api_key=${apiKey}&language=pt-BR`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const s = await res.json();
    return {
      title: s.name,
      cover_url: s.poster_path ? `${TMDB_IMG}${s.poster_path}` : '',
      overview: (s.overview || '').substring(0, 500),
      year: s.first_air_date ? parseInt(s.first_air_date.substring(0, 4)) : 0,
      genres: (s.genres || []).map((g: any) => g.name),
      total_seasons: s.number_of_seasons || 1,
      total_episodes: s.number_of_episodes || 0,
    };
  } catch {
    return null;
  }
}

// ==========================================
// Google Books — Livros / Mangás / Light Novels
// ==========================================

export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  if (!query.trim()) return [];
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&langRestrict=pt`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((b: any) => ({
      title: b.volumeInfo?.title || '',
      author: (b.volumeInfo?.authors || []).join(', '),
      cover_url: b.volumeInfo?.imageLinks?.thumbnail?.replace('http://', 'https://') || '',
      description: (b.volumeInfo?.description || '').substring(0, 500),
      total_pages: b.volumeInfo?.pageCount || 0,
      genre: (b.volumeInfo?.categories || [])[0] || '',
    }));
  } catch {
    return [];
  }
}
