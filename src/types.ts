// ==========================================
// TIPOS GLOBAIS
// ==========================================

export interface CompletedGame {
  id: string;
  name: string;
  console: string;
  genre: string;
  type: string;
  completion_date: string;
  play_time: string;
  rating: number;
  difficulty: 'C' | 'B' | 'A' | 'AA' | 'AAA';
  completion_condition: string;
  is_gold: boolean;
  mission_complete: boolean;
  notes: string;
  cover_url: string;
  description: string;
  developer: string;
  created_at: string;
  updated_at: string;
}

export interface GameBacklog {
  id: string;
  name: string;
  genre: string;
  expected_hours: number;
  desire_level: number;
  mission_complete: boolean;
  owned: boolean;
  currently_playing: boolean;
  platform: string;
  notes: string;
  cover_url: string;
  description: string;
  created_at: string;
  updated_at: string;
}

export interface GameSeries {
  id: string;
  name: string;
  created_at: string;
  entries?: GameSeriesEntry[];
  totalCount?: number;
  completedCount?: number;
}

export interface GameSeriesEntry {
  id: string;
  series_id: string;
  name: string;
  is_main: boolean;
  is_completed: boolean;
  completion_date: string;
  sort_order: number;
  created_at: string;
  linked_game_id?: string; // linked completed game
}

export interface Achievement {
  id: string;
  key: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  unlocked_at: string | null;
  created_at: string;
}

export interface UserProfile {
  id: number;
  total_xp: number;
  level: number;
  updated_at: string;
}

export interface MainMission {
  id: string;
  name: string;
  description: string;
  total_games: number;
  completed_games: number;
  target_date: string;
  created_at: string;
  updated_at: string;
}

export interface Movie {
  id: string;
  title: string;
  genre: string;
  director: string;
  year: number;
  watch_date: string;
  duration_min: number;
  rating: number;
  platform: string;
  notes: string;
  cover_url: string;
  overview: string;
  created_at: string;
  updated_at: string;
}

export interface TvShow {
  id: string;
  title: string;
  genre: string;
  seasons_watched: number;
  total_seasons: number;
  episodes_watched: number;
  total_episodes: number;
  status: 'Assistindo' | 'Concluído' | 'Dropado' | 'Pausado' | 'Planejado';
  rating: number | null;
  platform: string;
  start_date: string;
  end_date: string;
  notes: string;
  cover_url: string;
  overview: string;
  created_at: string;
  updated_at: string;
}

export interface Anime {
  id: string;
  title: string;
  genre: string;
  type: 'TV' | 'Filme' | 'OVA' | 'ONA' | 'Especial';
  seasons_watched: number;
  total_seasons: number;
  episodes_watched: number;
  total_episodes: number;
  status: 'Assistindo' | 'Concluído' | 'Dropado' | 'Pausado' | 'Planejado';
  rating: number | null;
  studio: string;
  start_date: string;
  end_date: string;
  notes: string;
  cover_url: string;
  overview: string;
  created_at: string;
  updated_at: string;
}

export interface Manga {
  id: string;
  title: string;
  genre: string;
  type: 'Mangá' | 'Manhwa' | 'Manhua' | 'Webtoon';
  chapters_read: number;
  total_chapters: number;
  volumes_read: number;
  total_volumes: number;
  status: 'Lendo' | 'Concluído' | 'Dropado' | 'Pausado' | 'Planejado';
  rating: number | null;
  author: string;
  start_date: string;
  end_date: string;
  notes: string;
  cover_url: string;
  created_at: string;
  updated_at: string;
}

export interface Book {
  id: string;
  title: string;
  genre: string;
  type: 'Livro' | 'Light Novel' | 'Visual Novel' | 'HQ' | 'Comic';
  author: string;
  pages_read: number;
  total_pages: number;
  status: 'Lendo' | 'Concluído' | 'Dropado' | 'Pausado' | 'Planejado';
  rating: number | null;
  start_date: string;
  end_date: string;
  notes: string;
  cover_url: string;
  description: string;
  created_at: string;
  updated_at: string;
}

// ==========================================
// CONSTANTES
// ==========================================

export const RATING_LABELS: Record<number, string> = {
  1: 'Tragédia',
  2: 'Terrível',
  3: 'Ruim',
  4: 'Medíocre',
  5: 'Tanto faz',
  6: 'Decente',
  7: 'Bom',
  8: 'Muito bom',
  9: 'Ótimo',
  10: 'Incrível',
  11: 'Jogo da vida',
};

export const DIFFICULTY_LABELS: Record<string, string> = {
  C: 'C (Fácil)',
  B: 'B (Médio)',
  A: 'A (Complicado)',
  AA: 'AA (Difícil)',
  AAA: 'AAA (Imperdoável)',
};

export const CONSOLES = [
  'PC', 'PS1', 'PS2', 'PS3', 'PS4', 'PS5', 'PSP', 'PS Vita',
  'NES', 'SNES', 'N64', 'GameCube', 'Wii', 'Wii U', 'Switch',
  'GB/GBC', 'GBA', 'NDS', '3DS',
  'Master System', 'Mega Drive', 'Sega CD', '32X', 'Saturn', 'Dreamcast', 'Game Gear',
  'Xbox', 'Xbox 360', 'Xbox One', 'Xbox Series',
  'PC Engine', 'PCE CD', 'Neo Geo', 'NGPocket',
  'Arcade', 'MSX', 'Mobile/Java', 'Atari 2600', 'Lynx',
  'VB', 'WS/WSC', 'PC-FX', 'CDI', '3DO', 'PC-98',
  'Amstrad CPC', 'Sharp X68K',
];

export const GAME_GENRES = [
  'Ação', 'RPG', 'Plataforma', 'Shooter', 'Estratégia', 'Adventure',
  'Puzzle', 'Corrida', 'Luta', 'Esporte', 'Simulação', 'Visual Novel',
  'Ritmo', 'Card Game', 'Briga de Rua', 'Mesa', 'Outro',
];

export const GAME_TYPES: Record<string, string[]> = {
  'Ação': ['FPS', 'Hack & Slash', 'Mundo Aberto', 'Survival Horror', 'Furtivo', 'Rail Shooter', 'Exploração 3D', 'Top-View'],
  'RPG': ['Action RPG', 'RPG de Turno', 'RPG Estratégico', 'Estilo Ocidental', 'RPG Plataforma', 'Roguelike', 'Sui Generis'],
  'Plataforma': ['2D Clássico', '2.5D', 'Ambiente 3D', 'Cinemático', 'Collectathon', 'Estilo Kaizo', 'Explorativo', 'Elementos de RPG', 'Quebra-Cabeça', 'Run & Gun', 'Visão de Cima'],
  'Shooter': ['Atirador', 'Bullet Hell', 'Direção 3D', 'Direção Horizontal', 'Direção Isométrica', 'Direção Vertical', 'Point-of-View'],
  'Estratégia': ['Tempo Real', 'Turno/Isométrico', 'Turno/Unidades', 'Gerenciamento'],
  'Adventure': ['Exploração', 'Point & Click', 'Sandbox', 'Narrativo'],
  'Puzzle': ['Combativo', 'Combinativo', 'Conhecimentos', 'Labirinto', 'Lógico', 'Perceptivo', 'Reativo', 'Variado'],
  'Corrida': ['Combate Veícular', 'Contra o Tempo', 'Corrida Clássica', 'Estilo Kart', 'Simulador', 'Snowboard', 'Visão Isométrica', 'Visão Superior'],
  'Luta': ['1ª Pessoa', 'Esportivo', 'Luta 2D', 'Luta 3D', 'Luta em Turno', 'Luta em Área', 'Wrestling'],
  'Esporte': ['Futebol', 'Basquete', 'Beisebol', 'Football', 'Tênis', 'Golfe', 'Hóquei', 'Boliche', 'Ski/Skate', 'Olimpíadas', 'Original', 'Queimada', 'Arremesso', 'Minigolfe'],
  'Simulação': ['Aérea', 'Construção', 'Fazendinha', 'Pescaria', 'Profissão', 'Vida Real'],
  'Visual Novel': ['Filme', 'Textual'],
  'Ritmo': ['Dança', 'QTE'],
  'Card Game': ['Com História', 'Competitivo'],
  'Briga de Rua': ['3D Explorativo', '3D Linear', 'Isométrico', 'Musou', 'Side-Scroller', 'Vista de Cima'],
  'Mesa': ['Block Breaker', 'Cassino', 'Pinball', 'Sinuca', 'Tabuleiro'],
  'Outro': ['Aplicativo', 'Arte', 'Compilação', 'Educativo', 'Game Show', 'Inespecífico', 'Minigame', 'Multigênero'],
};

export const MEDIA_GENRES = [
  'Ação', 'Aventura', 'Comédia', 'Drama', 'Fantasia', 'Ficção Científica',
  'Horror', 'Mistério', 'Romance', 'Thriller', 'Suspense', 'Animação',
  'Documentário', 'Musical', 'Esporte', 'Guerra', 'Crime', 'Biografia',
  'Histórico', 'Sobrenatural', 'Mecha', 'Slice of Life', 'Isekai',
  'Shounen', 'Seinen', 'Shoujo', 'Josei', 'Ecchi', 'Outro',
];

export type MediaSection = 
  | 'dashboard'
  | 'games-completed'
  | 'games-backlog'
  | 'games-series'
  | 'missions'
  | 'movies'
  | 'tv-shows'
  | 'anime'
  | 'manga'
  | 'books'
  | 'achievements'
  | 'settings';
