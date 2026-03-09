import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit3, Film } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import SearchBar from '../components/SearchBar';
import ApiSearchBox from '../components/ApiSearchBox';
import { Movie, MEDIA_GENRES, RATING_LABELS } from '../types';
import { generateId, formatDateBR, getRatingColor, getStatusColor } from '../lib/utils';

const defaultMovie: Omit<Movie, 'id' | 'created_at' | 'updated_at'> = {
  title: '',
  genre: 'Ação',
  director: '',
  year: new Date().getFullYear(),
  status: 'Planejado',
  watch_date: '',
  duration_min: 120,
  rating: 7,
  platform: '',
  notes: '',
  cover_url: '',
  overview: '',
};

const STATUS_LIST = ['Assistindo', 'Concluído', 'Dropado', 'Pausado', 'Planejado'] as const;

const MOVIE_GENRE_MAP: Record<string, string> = {
  'Ação': 'Ação', 'Aventura': 'Aventura', 'Animação': 'Animação', 'Comédia': 'Comédia',
  'Crime': 'Crime', 'Documentário': 'Documentário', 'Drama': 'Drama',
  'Família': 'Família', 'Fantasia': 'Fantasia', 'História': 'História',
  'Terror': 'Terror', 'Música': 'Música', 'Mistério': 'Mistério',
  'Romance': 'Romance', 'Ficção científica': 'Ficção', 'Cinema TV': 'Drama',
  'Thriller': 'Thriller', 'Guerra': 'Guerra', 'Faroeste': 'Western',
  'Action': 'Ação', 'Adventure': 'Aventura', 'Animation': 'Animação', 'Comedy': 'Comédia',
  'Documentary': 'Documentário', 'Family': 'Família', 'Fantasy': 'Fantasia',
  'History': 'História', 'Horror': 'Terror', 'Music': 'Música', 'Mystery': 'Mistério',
  'Science Fiction': 'Ficção', 'War': 'Guerra', 'Western': 'Western',
};

export default function MoviesPage() {
  const [items, setItems] = useState<Movie[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Movie | null>(null);
  const [formData, setFormData] = useState(defaultMovie);
  const [deleteTarget, setDeleteTarget] = useState<Movie | null>(null);

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    setItems(await window.api.db.getAll('movies', 'updated_at DESC'));
  }

  function openAdd() { setEditing(null); setFormData({ ...defaultMovie }); setModalOpen(true); }

  function openEdit(item: Movie) {
    setEditing(item);
    setFormData({
      title: item.title, genre: item.genre, director: item.director, year: item.year,
      status: item.status || 'Concluído',
      watch_date: item.watch_date, duration_min: item.duration_min, rating: item.rating,
      platform: item.platform, notes: item.notes,
      cover_url: item.cover_url || '', overview: item.overview || '',
    });
    setModalOpen(true);
  }

  async function save() {
    if (!formData.title.trim()) return;
    const data = { ...formData, updated_at: new Date().toISOString() };
    if (editing) {
      await window.api.db.update('movies', editing.id, data);
    } else {
      await window.api.db.insert('movies', { id: generateId(), ...data, created_at: new Date().toISOString() });
    }
    setModalOpen(false);
    loadItems();
  }

  async function deleteItem() {
    if (!deleteTarget) return;
    await window.api.db.delete('movies', deleteTarget.id);
    setDeleteTarget(null);
    loadItems();
  }

  const filtered = items.filter(i => {
    const matchSearch = i.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = !filterStatus || i.status === filterStatus;
    return matchSearch && matchStatus;
  });

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-2">
            <Film size={24} className="text-purple-400" />
            Filmes
          </h1>
          <p className="text-sm text-dark-400 mt-1">{items.length} filmes rastreados</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Adicionar Filme
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-72">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar filme..." />
        </div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select-field w-36 text-sm py-2">
          <option value="">Status</option>
          {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filtered.map(item => (
            <article key={item.id} className="group bg-dark-800/50 border border-dark-700/50 rounded-xl overflow-hidden hover:border-accent-500/40 transition-all duration-200">
              <div className="aspect-[2/3] bg-dark-700 overflow-hidden relative">
                {item.cover_url ? (
                  <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-dark-500 text-xs">Sem capa</div>
                )}
                <span className={`badge border text-[10px] absolute top-2 left-2 ${getStatusColor(item.status)} bg-dark-950/85 border-dark-500/70 shadow-md backdrop-blur-sm`}>{item.status}</span>
                <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-dark-950/90 border border-dark-500/60 shadow-md text-xs font-bold">
                  <span className={getRatingColor(item.rating)}>{item.rating}</span>
                </div>
              </div>
              <div className="p-3">
                <h3 className="font-semibold text-dark-100 line-clamp-1" title={item.title}>{item.title}</h3>
                <p className="text-xs text-dark-400 mt-1 line-clamp-1">{item.genre} {item.year ? `• ${item.year}` : ''}</p>
                <p className="text-xs text-dark-500 mt-1 line-clamp-1">{item.director || 'Diretor não informado'}</p>
                <div className="mt-2 text-[11px] text-dark-400 flex items-center justify-between">
                  <span className="font-mono">{item.watch_date ? formatDateBR(item.watch_date) : 'Sem data'}</span>
                  <span>{item.duration_min}min</span>
                </div>
                <div className="mt-2 flex items-center justify-end gap-1">
                  <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-dark-700" title="Editar">
                    <Edit3 size={14} className="text-dark-400 hover:text-accent-400" />
                  </button>
                  <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded hover:bg-dark-700" title="Excluir">
                    <Trash2 size={14} className="text-dark-400 hover:text-red-400" />
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
        {filtered.length === 0 && (
          <div className="text-center text-dark-400 py-12">Nenhum filme encontrado</div>
        )}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Filme' : 'Adicionar Filme'}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <ApiSearchBox
              value={formData.title}
              onChange={title => setFormData(f => ({ ...f, title }))}
              placeholder="Ex: Interestelar, Matrix..."
              label="Título"
              onSearch={async (query) => {
                const results = await window.api.search.movies(query);
                return results.map((r: any) => ({
                  id: r.tmdb_id,
                  title: r.title,
                  subtitle: `${r.year || 'N/A'}`,
                  cover_url: r.cover_url,
                }));
              }}
              onSelect={async (result) => {
                setFormData(f => ({ ...f, title: result.title, cover_url: result.cover_url }));
                const details = await window.api.search.movieDetails(result.id as number);
                if (details) {
                  const matchedGenre = details.genres
                    .map((g: string) => MOVIE_GENRE_MAP[g])
                    .find((g: string | undefined) => g && MEDIA_GENRES.includes(g)) || formData.genre;
                  setFormData(f => ({
                    ...f,
                    title: details.title,
                    cover_url: details.cover_url,
                    overview: details.overview,
                    year: details.year || f.year,
                    director: details.director || f.director,
                    duration_min: details.duration_min || f.duration_min,
                    genre: matchedGenre,
                  }));
                }
              }}
            />
          </div>
          {/* Cover Preview */}
          {formData.cover_url && (
            <div className="col-span-2 flex items-start gap-4 px-3 py-3 bg-dark-700/30 rounded-xl">
              <img src={formData.cover_url} alt="" className="w-20 h-28 object-cover rounded-lg shrink-0 bg-dark-700" />
              <div className="min-w-0 flex-1">
                {formData.director && <p className="text-xs text-dark-400 mb-1">🎬 {formData.director}</p>}
                {formData.overview && <p className="text-xs text-dark-400 line-clamp-4 leading-relaxed">{formData.overview}</p>}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Gênero</label>
            <select value={formData.genre} onChange={e => setFormData(f => ({ ...f, genre: e.target.value }))} className="select-field">
              {MEDIA_GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Diretor</label>
            <input type="text" value={formData.director} onChange={e => setFormData(f => ({ ...f, director: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Ano</label>
            <input type="number" value={formData.year} onChange={e => setFormData(f => ({ ...f, year: parseInt(e.target.value) || 2024 }))} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Status</label>
            <select value={formData.status} onChange={e => setFormData(f => ({ ...f, status: e.target.value as Movie['status'] }))} className="select-field">
              {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">{formData.status === 'Concluído' ? 'Data que Assistiu' : 'Data (opcional)'}</label>
            <input type="date" value={formData.watch_date} onChange={e => setFormData(f => ({ ...f, watch_date: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Duração (minutos)</label>
            <input type="number" value={formData.duration_min} onChange={e => setFormData(f => ({ ...f, duration_min: parseInt(e.target.value) || 0 }))} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Nota: {formData.rating} ({RATING_LABELS[formData.rating]})</label>
            <input type="range" min={1} max={11} value={formData.rating} onChange={e => setFormData(f => ({ ...f, rating: parseInt(e.target.value) }))} className="w-full accent-accent-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Plataforma</label>
            <input type="text" value={formData.platform} onChange={e => setFormData(f => ({ ...f, platform: e.target.value }))} className="input-field" placeholder="Netflix, Cinema, etc." />
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-dark-300 mb-1">Notas</label>
            <textarea value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} className="input-field resize-none h-20" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-dark-600">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={save} className="btn-primary">{editing ? 'Salvar' : 'Adicionar'}</button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={deleteItem} title="Excluir Filme" message={`Excluir "${deleteTarget?.title}"?`} />
    </div>
  );
}
