import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit3, Library } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import SearchBar from '../components/SearchBar';
import ApiSearchBox from '../components/ApiSearchBox';
import { Book, MEDIA_GENRES, RATING_LABELS } from '../types';
import { generateId, getRatingColor, getStatusColor } from '../lib/utils';

const defaultItem: Omit<Book, 'id' | 'created_at' | 'updated_at'> = {
  title: '', genre: 'Ficção', type: 'Livro',
  author: '', pages_read: 0, total_pages: 0,
  status: 'Planejado', rating: null,
  start_date: '', end_date: '', notes: '',
  cover_url: '', description: '',
};

const STATUS_LIST = ['Lendo', 'Concluído', 'Dropado', 'Pausado', 'Planejado'] as const;
const BOOK_TYPES = ['Livro', 'Light Novel', 'Visual Novel', 'HQ', 'Comic'] as const;

export default function BooksPage() {
  const [items, setItems] = useState<Book[]>([]);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Book | null>(null);
  const [formData, setFormData] = useState(defaultItem);
  const [deleteTarget, setDeleteTarget] = useState<Book | null>(null);

  useEffect(() => { loadItems(); }, []);
  async function loadItems() { setItems(await window.api.db.getAll('books', 'updated_at DESC')); }

  function openAdd() { setEditing(null); setFormData({ ...defaultItem }); setModalOpen(true); }
  function openEdit(item: Book) {
    setEditing(item);
    setFormData({
      title: item.title, genre: item.genre, type: item.type,
      author: item.author, pages_read: item.pages_read, total_pages: item.total_pages,
      status: item.status, rating: item.rating,
      start_date: item.start_date, end_date: item.end_date, notes: item.notes,
      cover_url: item.cover_url || '', description: item.description || '',
    });
    setModalOpen(true);
  }

  async function save() {
    if (!formData.title.trim()) return;
    const data = { ...formData, updated_at: new Date().toISOString() };
    if (editing) await window.api.db.update('books', editing.id, data);
    else await window.api.db.insert('books', { id: generateId(), ...data, created_at: new Date().toISOString() });
    setModalOpen(false); loadItems();
  }

  async function deleteItem() {
    if (!deleteTarget) return;
    await window.api.db.delete('books', deleteTarget.id);
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
            <Library size={24} className="text-cyan-400" /> Livros / Light Novels
          </h1>
          <p className="text-sm text-dark-400 mt-1">{items.length} títulos rastreados</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2"><Plus size={16} /> Adicionar</button>
      </div>

      <div className="flex items-center gap-3 mb-4">
        <div className="w-64"><SearchBar value={search} onChange={setSearch} placeholder="Buscar..." /></div>
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
                    <p className="text-xs text-dark-400 mt-0.5">{item.type} • {item.genre} {item.author && `• ${item.author}`}</p>
                  </div>
                </div>
                <span className={`badge border text-[10px] ${getStatusColor(item.status)}`}>{item.status}</span>
              </div>

              <div className="mt-3 space-y-1.5">
                <div className="flex justify-between text-xs">
                  <span className="text-dark-400">Páginas</span>
                  <span className="text-dark-200">{item.pages_read} / {item.total_pages || '?'}</span>
                </div>
                <div className="w-full h-1.5 bg-dark-700 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-500 rounded-full" style={{
                    width: `${item.total_pages > 0 ? (item.pages_read / item.total_pages) * 100 : 0}%`
                  }} />
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
        {filtered.length === 0 && <div className="text-center text-dark-400 py-12">Nenhum título encontrado</div>}
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar' : 'Adicionar'}>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <ApiSearchBox
              value={formData.title}
              onChange={title => setFormData(f => ({ ...f, title }))}
              placeholder="Ex: O Senhor dos Anéis, 1984..."
              label="Título"
              onSearch={async (query) => {
                const results = await window.api.search.books(query);
                return results.map((r: any, i: number) => ({
                  id: i,
                  title: r.title,
                  subtitle: r.author || 'Autor desconhecido',
                  cover_url: r.cover_url,
                }));
              }}
              onSelect={async (result) => {
                const results = await window.api.search.books(formData.title);
                const match = results[result.id as number];
                if (match) {
                  setFormData(f => ({
                    ...f,
                    title: match.title,
                    author: match.author || f.author,
                    cover_url: match.cover_url,
                    description: match.description,
                    total_pages: match.total_pages || f.total_pages,
                  }));
                } else {
                  setFormData(f => ({ ...f, title: result.title, cover_url: result.cover_url }));
                }
              }}
            />
          </div>
          {/* Cover Preview */}
          {formData.cover_url && (
            <div className="col-span-2 flex items-start gap-4 px-3 py-3 bg-dark-700/30 rounded-xl">
              <img src={formData.cover_url} alt="" className="w-20 h-28 object-cover rounded-lg shrink-0 bg-dark-700" />
              <div className="min-w-0 flex-1">
                {formData.author && <p className="text-xs text-dark-400 mb-1">✍️ {formData.author}</p>}
                {formData.description && <p className="text-xs text-dark-400 line-clamp-4 leading-relaxed">{formData.description}</p>}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Tipo</label>
            <select value={formData.type} onChange={e => setFormData(f => ({ ...f, type: e.target.value as any }))} className="select-field">
              {BOOK_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
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
            <label className="block text-xs font-medium text-dark-300 mb-1">Autor</label>
            <input type="text" value={formData.author} onChange={e => setFormData(f => ({ ...f, author: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Páginas Lidas</label>
            <input type="number" min={0} value={formData.pages_read} onChange={e => setFormData(f => ({ ...f, pages_read: parseInt(e.target.value) || 0 }))} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Total de Páginas</label>
            <input type="number" min={0} value={formData.total_pages} onChange={e => setFormData(f => ({ ...f, total_pages: parseInt(e.target.value) || 0 }))} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">
              Nota: {formData.rating !== null ? `${formData.rating} (${RATING_LABELS[formData.rating!]})` : 'Sem nota'}
            </label>
            <input type="range" min={1} max={11} value={formData.rating || 7} onChange={e => setFormData(f => ({ ...f, rating: parseInt(e.target.value) }))} className="w-full accent-accent-500" />
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

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={deleteItem} title="Excluir" message={`Excluir "${deleteTarget?.title}"?`} />
    </div>
  );
}
