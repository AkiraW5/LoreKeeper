// =========================================
// API Services — Busca de metadados externos
// =========================================

export interface GameSearchResult {
  id: string; // "igdb:123" ou "rawg:123"
  name: string;
  cover_url: string;
  released: string;
  genres: string[];
  platforms: string[];
  playtime: number;
}

export interface GameDetailsResult {
  name: string;
  cover_url: string;
  description: string;
  developer: string;
  genres: string[];
  platforms: string[];
  released: string;
  playtime: number;
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
// Jogos — IGDB (principal) com fallback para RAWG.io
// ==========================================

const TIMEOUT_MS = 8000;

export interface GameApiKeys {
  igdbClientId?: string;
  igdbClientSecret?: string;
  rawgApiKey?: string;
}

// IGDB usa nomes de gênero diferentes; normaliza para os do RAWG, que é o que as telas mapeiam
const IGDB_GENRES: Record<string, string> = {
  'Role-playing (RPG)': 'RPG',
  'Platform': 'Platformer',
  'Sport': 'Sports',
  'Simulator': 'Simulation',
  'Real Time Strategy (RTS)': 'Strategy',
  'Turn-based strategy (TBS)': 'Strategy',
  'Tactical': 'Strategy',
  "Hack and slash/Beat 'em up": 'Action',
  'Card & Board Game': 'Card',
  'Point-and-click': 'Adventure',
  'Visual Novel': 'Adventure',
};

const IGDB_FIELDS = 'name,cover.image_id,first_release_date,genres.name,platforms.name';

let igdbToken: { clientId: string; value: string; expires: number } | null = null;

async function igdbQuery(endpoint: string, body: string, keys: GameApiKeys): Promise<any[]> {
  const clientId = keys.igdbClientId!;
  if (!igdbToken || igdbToken.clientId !== clientId || Date.now() > igdbToken.expires) {
    const auth = await fetch(
      `https://id.twitch.tv/oauth2/token?client_id=${encodeURIComponent(clientId)}&client_secret=${encodeURIComponent(keys.igdbClientSecret!)}&grant_type=client_credentials`,
      { method: 'POST', signal: AbortSignal.timeout(TIMEOUT_MS) },
    );
    if (!auth.ok) throw new Error(`Twitch auth ${auth.status}`);
    const t = await auth.json();
    igdbToken = { clientId, value: t.access_token, expires: Date.now() + (t.expires_in - 60) * 1000 };
  }
  const res = await fetch(`https://api.igdb.com/v4/${endpoint}`, {
    method: 'POST',
    headers: { 'Client-ID': clientId, Authorization: `Bearer ${igdbToken.value}` },
    body,
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  if (res.status === 401) igdbToken = null;
  if (!res.ok) throw new Error(`IGDB ${res.status}`);
  return res.json();
}

function mapIgdbGame(g: any) {
  return {
    name: g.name,
    cover_url: g.cover?.image_id ? `https://images.igdb.com/igdb/image/upload/t_cover_big_2x/${g.cover.image_id}.jpg` : '',
    released: g.first_release_date ? new Date(g.first_release_date * 1000).toISOString().slice(0, 10) : '',
    genres: (g.genres || []).map((x: any) => IGDB_GENRES[x.name] || x.name),
    platforms: (g.platforms || []).map((p: any) => p.name),
    playtime: 0, // ponytail: IGDB não traz tempo médio aqui; dá pra puxar de game_time_to_beats se fizer falta
  };
}

async function igdbSearch(query: string, keys: GameApiKeys): Promise<GameSearchResult[]> {
  const q = query.replace(/["\\]/g, '');
  const games = await igdbQuery('games', `search "${q}"; fields ${IGDB_FIELDS}; limit 8;`, keys);
  return games.map(g => ({ id: `igdb:${g.id}`, ...mapIgdbGame(g) }));
}

async function igdbDetails(id: number, keys: GameApiKeys): Promise<GameDetailsResult | null> {
  const [g] = await igdbQuery(
    'games',
    `fields ${IGDB_FIELDS},summary,involved_companies.developer,involved_companies.company.name; where id = ${id};`,
    keys,
  );
  if (!g) return null;
  return {
    ...mapIgdbGame(g),
    description: (g.summary || '').substring(0, 500),
    developer: (g.involved_companies || []).filter((c: any) => c.developer).map((c: any) => c.company?.name).join(', '),
  };
}

async function rawgSearch(query: string, apiKey: string): Promise<GameSearchResult[]> {
  const url = `https://api.rawg.io/api/games?key=${apiKey}&search=${encodeURIComponent(query)}&page_size=8`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`RAWG ${res.status}`);
  const data = await res.json();
  return (data.results || []).map((g: any) => ({
    id: `rawg:${g.id}`,
    name: g.name,
    cover_url: g.background_image || '',
    released: g.released || '',
    genres: (g.genres || []).map((x: any) => x.name),
    platforms: (g.platforms || []).map((p: any) => p.platform.name),
    playtime: Math.max(0, Math.round(g.playtime || 0)),
  }));
}

async function rawgDetails(id: number, apiKey: string): Promise<GameDetailsResult | null> {
  const url = `https://api.rawg.io/api/games/${id}?key=${apiKey}`;
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!res.ok) throw new Error(`RAWG ${res.status}`);
  const g = await res.json();
  return {
    name: g.name,
    cover_url: g.background_image || '',
    description: (g.description_raw || '').substring(0, 500),
    developer: (g.developers || []).map((d: any) => d.name).join(', '),
    genres: (g.genres || []).map((x: any) => x.name),
    platforms: (g.platforms || []).map((p: any) => p.platform.name),
    released: g.released || '',
    playtime: Math.max(0, Math.round(g.playtime || 0)),
  };
}

// Tenta IGDB e depois RAWG. Lança erro (mostrado na busca) se nada estiver configurado ou tudo falhar.
export async function searchGames(query: string, keys: GameApiKeys): Promise<GameSearchResult[]> {
  if (!query.trim()) return [];
  const sources: (() => Promise<GameSearchResult[]>)[] = [];
  if (keys.igdbClientId && keys.igdbClientSecret) sources.push(() => igdbSearch(query, keys));
  if (keys.rawgApiKey) sources.push(() => rawgSearch(query, keys.rawgApiKey!));
  if (sources.length === 0) throw new Error('Configure o IGDB ou o RAWG em Configurações para buscar jogos.');
  for (const source of sources) {
    try {
      return await source();
    } catch (err) {
      console.warn('Busca de jogos falhou:', err);
    }
  }
  throw new Error('Os serviços de jogos não responderam. Tente de novo em instantes.');
}

export async function getGameDetails(id: string, keys: GameApiKeys): Promise<GameDetailsResult | null> {
  const [source, rawId] = String(id).split(':');
  try {
    if (source === 'igdb' && keys.igdbClientId && keys.igdbClientSecret) return await igdbDetails(Number(rawId), keys);
    if (source === 'rawg' && keys.rawgApiKey) return await rawgDetails(Number(rawId), keys.rawgApiKey);
  } catch (err) {
    console.warn('Detalhes do jogo falharam:', err);
  }
  return null;
}

// ==========================================
// TMDB — Filmes
// ==========================================

const TMDB_IMG = 'https://image.tmdb.org/t/p/w300';

export async function searchMovies(query: string, apiKey: string): Promise<MovieSearchResult[]> {
  if (!apiKey || !query.trim()) return [];
  try {
    const url = `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(query)}&language=pt-BR&page=1`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
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
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
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
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
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
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
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
// Open Library + Google Books — Livros / Mangás / Light Novels
// ==========================================

const OL_COVER = 'https://covers.openlibrary.org/b/olid';

async function searchBooksOpenLibrary(query: string): Promise<BookSearchResult[]> {
  try {
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=8&fields=title,author_name,cover_edition_key,first_sentence,number_of_pages_median,subject,edition_key,cover_i&lang=pt`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.docs || [])
      .filter((b: any) => b.title)
      .slice(0, 8)
      .map((b: any) => {
        // Build cover URL — prefer cover_edition_key (OLID), fallback to cover_i (ID)
        let cover_url = '';
        if (b.cover_edition_key) {
          cover_url = `${OL_COVER}/${b.cover_edition_key}-L.jpg`;
        } else if (b.cover_i) {
          cover_url = `https://covers.openlibrary.org/b/id/${b.cover_i}-L.jpg`;
        }
        return {
          title: b.title,
          author: (b.author_name || []).join(', '),
          cover_url,
          description: Array.isArray(b.first_sentence) ? b.first_sentence[0] || '' : (b.first_sentence || ''),
          total_pages: b.number_of_pages_median || 0,
          genre: (b.subject || [])[0] || '',
        };
      });
  } catch {
    return [];
  }
}

async function searchBooksGoogle(query: string): Promise<BookSearchResult[]> {
  try {
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=8&langRestrict=pt`;
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.items || []).map((b: any) => ({
      title: b.volumeInfo?.title || '',
      author: (b.volumeInfo?.authors || []).join(', '),
      cover_url: (b.volumeInfo?.imageLinks?.thumbnail || '').replace('http://', 'https://').replace('&edge=curl', ''),
      description: (b.volumeInfo?.description || '').substring(0, 500),
      total_pages: b.volumeInfo?.pageCount || 0,
      genre: (b.volumeInfo?.categories || [])[0] || '',
    }));
  } catch {
    return [];
  }
}

// Consulta as duas fontes juntas: o Google Books sem chave vive estourando a cota (429) e o Open Library
// às vezes traz edições sem capa. Junta tudo, tira títulos repetidos e põe quem tem capa primeiro.
export async function searchBooks(query: string): Promise<BookSearchResult[]> {
  if (!query.trim()) return [];
  const [ol, google] = await Promise.all([searchBooksOpenLibrary(query), searchBooksGoogle(query)]);
  const seen = new Set<string>();
  return [...ol, ...google]
    .filter(b => {
      const key = `${b.title}|${b.author}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .sort((a, b) => Number(!a.cover_url) - Number(!b.cover_url))
    .slice(0, 8);
}

// ==========================================
// AniList — Mangás / Manhwas / Manhuas (sem chave)
// ==========================================

export interface MangaSearchResult {
  title: string;
  author: string;
  cover_url: string;
  genre: string;
  type: string;
  total_chapters: number;
  total_volumes: number;
}

const ANILIST_GENRES: Record<string, string> = {
  Action: 'Ação', Adventure: 'Aventura', Comedy: 'Comédia', Drama: 'Drama', Fantasy: 'Fantasia',
  'Sci-Fi': 'Ficção Científica', Horror: 'Horror', Mystery: 'Mistério', Romance: 'Romance',
  Thriller: 'Thriller', Psychological: 'Suspense', Sports: 'Esporte', Supernatural: 'Sobrenatural',
  Mecha: 'Mecha', 'Slice of Life': 'Slice of Life', Ecchi: 'Ecchi',
};

const ANILIST_TYPES: Record<string, string> = { JP: 'Mangá', KR: 'Manhwa', CN: 'Manhua', TW: 'Manhua' };

const ANILIST_QUERY = `query ($search: String) {
  Page(perPage: 8) {
    media(search: $search, type: MANGA, sort: SEARCH_MATCH) {
      title { romaji english }
      coverImage { extraLarge }
      chapters volumes genres countryOfOrigin
      staff(perPage: 4) { edges { role node { name { full } } } }
    }
  }
}`;

export async function searchManga(query: string): Promise<MangaSearchResult[]> {
  if (!query.trim()) return [];
  try {
    const res = await fetch('https://graphql.anilist.co', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query: ANILIST_QUERY, variables: { search: query } }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`AniList ${res.status}`);
    const data = await res.json();
    return (data.data?.Page?.media || []).map((m: any) => {
      const staff = m.staff?.edges || [];
      // Prefere quem escreveu a história; se não houver, quem aparece primeiro
      const writer = staff.find((e: any) => /story|original/i.test(e.role)) || staff[0];
      return {
        title: m.title?.english || m.title?.romaji || '',
        author: writer?.node?.name?.full || '',
        cover_url: m.coverImage?.extraLarge || '',
        genre: (m.genres || []).map((g: string) => ANILIST_GENRES[g]).find(Boolean) || '',
        type: ANILIST_TYPES[m.countryOfOrigin] || 'Mangá',
        total_chapters: m.chapters || 0,
        total_volumes: m.volumes || 0,
      };
    });
  } catch (err) {
    console.warn('AniList falhou, usando busca de livros:', err);
    const books = await searchBooks(`${query} manga`);
    return books.map(b => ({
      title: b.title, author: b.author, cover_url: b.cover_url, genre: '', type: 'Mangá', total_chapters: 0, total_volumes: 0,
    }));
  }
}
