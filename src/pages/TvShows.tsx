import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit3, Tv } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import SearchBar from '../components/SearchBar';
import ApiSearchBox from '../components/ApiSearchBox';
import { TvShow, MEDIA_GENRES, RATING_LABELS } from '../types';
import { generateId, formatDateBR, getRatingColor, getStatusColor } from '../lib/utils';

const defaultItem: Omit<TvShow, 'id' | 'created_at' | 'updated_at'> = {
  title: '', genre: 'Drama', seasons_watched: 0, total_seasons: 1,
  episodes_watched: 0, total_episodes: 0,
  status: 'Planejado', rating: null, platform: '',
  start_date: '', end_date: '', notes: '',
  cover_url: '', overview: '',
};

const STATUS_LIST = ['Assistindo', 'Concluído', 'Dropado', 'Pausado', 'Planejado'] as const;

export default function TvShowsPage() {
  const [items, setItems] = useState<TvShow[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<TvShow | null>(null);
  const [formData, setFormData] = useState(defaultItem);
  const [deleteTarget, setDeleteTarget] = useState<TvShow | null>(null);

  useEffect(() => { loadItems(); }, []);
  async function loadItems() { setItems(await window.api.db.getAll('tv_shows', 'updated_at DESC')); }

  function openAdd() { setEditing(null); setFormData({ ...defaultItem }); setModalOpen(true); }
  function openEdit(item: TvShow) {
    setEditing(item);
    setFormData({
      title: item.title, genre: item.genre, seasons_watched: item.seasons_watched,
      total_seasons: item.total_seasons, episodes_watched: item.episodes_watched,
      total_episodes: item.total_episodes, status: item.status, rating: item.rating,
      platform: item.platform, start_date: item.start_date, end_date: item.end_date, notes: item.notes,
      cover_url: item.cover_url || '', overview: item.overview || '',
    });
    setModalOpen(true);
  }

  async function save() {
    if (!formData.title.trim()) return;
    const data = { ...formData, updated_at: new Date().toISOString() };
    if (editing) await window.api.db.update('tv_shows', editing.id, data);
    else await window.api.db.insert('tv_shows', { id: generateId(), ...data, created_at: new Date().toISOString() });
    setModalOpen(false); loadItems();
  }

  async function deleteItem() {
    if (!deleteTarget) return;
    await window.api.db.delete('tv_shows', deleteTarget.id);
    setDeleteTarget(null); loadItems();
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
            <Tv size={24} className="text-pink-400" /> Séries de TV
          </h1>
          <p className="text-sm text-dark-400 mt-1">{items.length} séries rastreadas</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={16} /> Adicionar Série</button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-64"><SearchBar value={search} onChange={setSearch} placeholder="Buscar série..." /></div>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="select-field w-36 text-sm py-2">
          <option value="">Status</option>
          {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(item => (
            <div key={item.id} className="stat-card relative group">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3 flex-1">
                  {item.cover_url ? (
                    <img src={item.cover_url} alt="" className="w-12 h-16 object-cover rounded shrink-0 bg-dark-700" />
                  ) : null}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-dark-100">{item.title}</h3>
                    <p className="text-xs text-dark-400 mt-0.5">{item.genre} {item.platform && `• ${item.platform}`}</p>
                  </div>
                </div>
                <span className={`badge border text-[10px] ${getStatusColor(item.status)}`}>{item.status}</span>
              </div>

              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-dark-400">Temporadas</span>
                  <span className="text-dark-200">{item.seasons_watched} / {item.total_seasons}</span>
                </div>
                <div className="w-full h-1.5 bg-dark-700 rounded-full overflow-hidden">
                  <div className="h-full bg-accent-500 rounded-full" style={{ width: `${item.total_seasons > 0 ? (item.seasons_watched / item.total_seasons) * 100 : 0}%` }} />
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-dark-400">Episódios</span>
                  <span className="text-dark-200">{item.episodes_watched} / {item.total_episodes || '?'}</span>
                </div>
                {item.rating && (
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-dark-400">Nota</span>
                    <span className={`font-bold ${getRatingColor(item.rating)}`}>{item.rating} ({RATING_LABELS[item.rating]})</span>
                  </div>
                )}
              </div>

              <div className="absolute bottom-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-dark-600"><Edit3 size={13} className="text-dark-400 hover:text-accent-400" /></button>
                <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded hover:bg-dark-600"><Trash2 size={13} className="text-dark-400 hover:text-red-400" /></button>
              </div>
            </div>
          ))}
        </div>
        {filtered.length === 0 && <div className="text-center text-dark-400 py-12">Nenhuma série encontrada</div>}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Série' : 'Adicionar Série'}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <ApiSearchBox
              value={formData.title}
              onChange={title => setFormData(f => ({ ...f, title }))}
              placeholder="Ex: Breaking Bad, The Office..."
              label="Título"
              onSearch={async (query) => {
                const results = await window.api.search.tvShows(query);
                return results.map((r: any) => ({
                  id: r.tmdb_id,
                  title: r.title,
                  subtitle: `${r.year || 'N/A'}`,
                  cover_url: r.cover_url,
                }));
              }}
              onSelect={async (result) => {
                setFormData(f => ({ ...f, title: result.title, cover_url: result.cover_url }));
                const details = await window.api.search.tvShowDetails(result.id as number);
                if (details) {
                  setFormData(f => ({
                    ...f,
                    title: details.title,
                    cover_url: details.cover_url,
                    overview: details.overview,
                    total_seasons: details.total_seasons || f.total_seasons,
                    total_episodes: details.total_episodes || f.total_episodes,
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
            <label className="block text-xs font-medium text-dark-300 mb-1">Status</label>
            <select value={formData.status} onChange={e => setFormData(f => ({ ...f, status: e.target.value as any }))} className="select-field">
              {STATUS_LIST.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Temporadas Assistidas</label>
            <input type="number" min={0} value={formData.seasons_watched} onChange={e => setFormData(f => ({ ...f, seasons_watched: parseInt(e.target.value) || 0 }))} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Total de Temporadas</label>
            <input type="number" min={1} value={formData.total_seasons} onChange={e => setFormData(f => ({ ...f, total_seasons: parseInt(e.target.value) || 1 }))} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Episódios Assistidos</label>
            <input type="number" min={0} value={formData.episodes_watched} onChange={e => setFormData(f => ({ ...f, episodes_watched: parseInt(e.target.value) || 0 }))} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Total de Episódios</label>
            <input type="number" min={0} value={formData.total_episodes} onChange={e => setFormData(f => ({ ...f, total_episodes: parseInt(e.target.value) || 0 }))} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">
              Nota: {formData.rating !== null ? `${formData.rating} (${RATING_LABELS[formData.rating!]})` : 'Sem nota'}
            </label>
            <input type="range" min={1} max={11} value={formData.rating || 7} onChange={e => setFormData(f => ({ ...f, rating: parseInt(e.target.value) }))} className="w-full accent-accent-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Plataforma</label>
            <input type="text" value={formData.platform} onChange={e => setFormData(f => ({ ...f, platform: e.target.value }))} className="input-field" placeholder="Netflix, HBO, etc." />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Data Início</label>
            <input type="date" value={formData.start_date} onChange={e => setFormData(f => ({ ...f, start_date: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Data Fim</label>
            <input type="date" value={formData.end_date} onChange={e => setFormData(f => ({ ...f, end_date: e.target.value }))} className="input-field" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-dark-600">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={save} className="btn-primary">{editing ? 'Salvar' : 'Adicionar'}</button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={deleteItem} title="Excluir Série" message={`Excluir "${deleteTarget?.title}"?`} />
    </div>
  );
}
