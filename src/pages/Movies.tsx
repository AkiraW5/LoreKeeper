import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit3, Film } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import SearchBar from '../components/SearchBar';
import ApiSearchBox from '../components/ApiSearchBox';
import { Movie, MEDIA_GENRES, RATING_LABELS } from '../types';
import { generateId, formatDateBR, getRatingColor } from '../lib/utils';

const defaultMovie: Omit<Movie, 'id' | 'created_at' | 'updated_at'> = {
  title: '',
  genre: 'Ação',
  director: '',
  year: new Date().getFullYear(),
  watch_date: new Date().toISOString().split('T')[0],
  duration_min: 120,
  rating: 7,
  platform: '',
  notes: '',
  cover_url: '',
  overview: '',
};

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
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Movie | null>(null);
  const [formData, setFormData] = useState(defaultMovie);
  const [deleteTarget, setDeleteTarget] = useState<Movie | null>(null);

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    setItems(await window.api.db.getAll('movies', 'watch_date DESC'));
  }

  function openAdd() { setEditing(null); setFormData({ ...defaultMovie }); setModalOpen(true); }

  function openEdit(item: Movie) {
    setEditing(item);
    setFormData({
      title: item.title, genre: item.genre, director: item.director, year: item.year,
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

  const filtered = items.filter(i => i.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-2">
            <Film size={24} className="text-purple-400" />
            Filmes
          </h1>
          <p className="text-sm text-dark-400 mt-1">{items.length} filmes assistidos</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Adicionar Filme
        </button>
      </div>

      <div className="w-72 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar filme..." />
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-dark-700/50">
        <table className="w-full text-sm">
          <thead className="bg-dark-800/80 sticky top-0">
            <tr>
              <th className="px-3 py-3 text-left text-dark-300 font-medium">Título</th>
              <th className="px-3 py-3 text-left text-dark-300 font-medium">Gênero</th>
              <th className="px-3 py-3 text-left text-dark-300 font-medium">Diretor</th>
              <th className="px-3 py-3 text-left text-dark-300 font-medium">Ano</th>
              <th className="px-3 py-3 text-left text-dark-300 font-medium">Assistido</th>
              <th className="px-3 py-3 text-left text-dark-300 font-medium">Duração</th>
              <th className="px-3 py-3 text-left text-dark-300 font-medium">Nota</th>
              <th className="px-3 py-3 text-center text-dark-300 font-medium w-16">Ações</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id} className="table-row">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {item.cover_url ? (
                      <img src={item.cover_url} alt="" className="w-8 h-11 object-cover rounded shrink-0 bg-dark-700" />
                    ) : null}
                    <span className="font-medium text-dark-100">{item.title}</span>
                  </div>
                </td>
                <td className="px-3 py-2.5 text-dark-300">{item.genre}</td>
                <td className="px-3 py-2.5 text-dark-400">{item.director}</td>
                <td className="px-3 py-2.5 text-dark-300">{item.year}</td>
                <td className="px-3 py-2.5 text-dark-300 font-mono text-xs">{formatDateBR(item.watch_date)}</td>
                <td className="px-3 py-2.5 text-dark-300">{item.duration_min}min</td>
                <td className="px-3 py-2.5">
                  <span className={`font-bold ${getRatingColor(item.rating)}`} title={RATING_LABELS[item.rating]}>
                    {item.rating}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <div className="flex items-center justify-center gap-1">
                    <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-dark-600">
                      <Edit3 size={14} className="text-dark-400 hover:text-accent-400" />
                    </button>
                    <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded hover:bg-dark-600">
                      <Trash2 size={14} className="text-dark-400 hover:text-red-400" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} className="px-4 py-12 text-center text-dark-400">Nenhum filme encontrado</td></tr>
            )}
          </tbody>
        </table>
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
            <label className="block text-xs font-medium text-dark-300 mb-1">Data que Assistiu</label>
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
