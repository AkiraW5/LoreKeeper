import React, { useEffect, useState, useMemo } from 'react';
import { Plus, Trash2, Edit3, Trophy, ArrowUpDown } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import SearchBar from '../components/SearchBar';
import ApiSearchBox from '../components/ApiSearchBox';
import {
  CompletedGame, GAME_GENRES, GAME_TYPES, CONSOLES,
  RATING_LABELS, DIFFICULTY_LABELS,
} from '../types';
import {
  generateId, formatDateBR, getRatingColor, getDifficultyColor,
  parseTimeToSeconds, secondsToTimeStr,
} from '../lib/utils';

const defaultGame: Omit<CompletedGame, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  console: 'PC',
  genre: 'Ação',
  type: '',
  completion_date: new Date().toISOString().split('T')[0],
  play_time: '0:00:00',
  rating: 7,
  difficulty: 'B',
  completion_condition: 'Termine o jogo',
  is_gold: false,
  mission_complete: false,
  notes: '',
  cover_url: '',
  description: '',
  developer: '',
};

type SortField = 'name' | 'completion_date' | 'play_time' | 'rating';

export default function CompletedGamesPage() {
  const [items, setItems] = useState<CompletedGame[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CompletedGame | null>(null);
  const [formData, setFormData] = useState(defaultGame);
  const [deleteTarget, setDeleteTarget] = useState<CompletedGame | null>(null);
  const [sortField, setSortField] = useState<SortField>('completion_date');
  const [sortAsc, setSortAsc] = useState(false);
  const [filterGenre, setFilterGenre] = useState('');
  const [filterConsole, setFilterConsole] = useState('');

  useEffect(() => { loadItems(); }, []);

  async function loadItems() {
    setItems(await window.api.db.getAll('completed_games', 'completion_date DESC'));
  }

  function openAdd() { setEditing(null); setFormData({ ...defaultGame }); setModalOpen(true); }

  function openEdit(item: CompletedGame) {
    setEditing(item);
    setFormData({
      name: item.name, console: item.console, genre: item.genre, type: item.type,
      completion_date: item.completion_date, play_time: item.play_time, rating: item.rating,
      difficulty: item.difficulty as any, completion_condition: item.completion_condition,
      is_gold: !!item.is_gold, mission_complete: !!item.mission_complete, notes: item.notes,
      cover_url: item.cover_url || '', description: item.description || '', developer: item.developer || '',
    });
    setModalOpen(true);
  }

  async function save() {
    if (!formData.name.trim()) return;
    const data = {
      ...formData,
      is_gold: formData.is_gold ? 1 : 0,
      mission_complete: formData.mission_complete ? 1 : 0,
      updated_at: new Date().toISOString(),
    };
    if (editing) {
      await window.api.db.update('completed_games', editing.id, data);
    } else {
      await window.api.db.insert('completed_games', { id: generateId(), ...data, created_at: new Date().toISOString() });
    }
    setModalOpen(false);
    loadItems();
  }

  async function deleteItem() {
    if (!deleteTarget) return;
    await window.api.db.delete('completed_games', deleteTarget.id);
    setDeleteTarget(null);
    loadItems();
  }

  function toggleSort(field: SortField) {
    if (sortField === field) setSortAsc(!sortAsc);
    else { setSortField(field); setSortAsc(false); }
  }

  const sorted = useMemo(() => {
    let list = [...items];
    if (search) list = list.filter(i => i.name.toLowerCase().includes(search.toLowerCase()));
    if (filterGenre) list = list.filter(i => i.genre === filterGenre);
    if (filterConsole) list = list.filter(i => i.console === filterConsole);

    list.sort((a, b) => {
      let cmp = 0;
      switch (sortField) {
        case 'name': cmp = a.name.localeCompare(b.name); break;
        case 'completion_date': cmp = new Date(a.completion_date).getTime() - new Date(b.completion_date).getTime(); break;
        case 'play_time': cmp = parseTimeToSeconds(a.play_time) - parseTimeToSeconds(b.play_time); break;
        case 'rating': cmp = a.rating - b.rating; break;
      }
      return sortAsc ? cmp : -cmp;
    });
    return list;
  }, [items, search, filterGenre, filterConsole, sortField, sortAsc]);

  const totalTime = secondsToTimeStr(items.reduce((s, i) => s + parseTimeToSeconds(i.play_time), 0));
  const avgRating = items.length > 0 ? (items.reduce((s, i) => s + i.rating, 0) / items.length).toFixed(1) : '0';
  const availableTypes = GAME_TYPES[formData.genre] || [];
  const usedGenres = [...new Set(items.map(i => i.genre))].sort();
  const usedConsoles = [...new Set(items.map(i => i.console))].sort();

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-2">
            <Trophy size={24} className="text-yellow-400" />
            Jogos Zerados
          </h1>
          <p className="text-sm text-dark-400 mt-1">
            {items.length} jogos • Tempo total: {totalTime} • Média: {avgRating}/11
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Adicionar Jogo
        </button>
      </div>

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="w-64">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar jogo..." />
        </div>
        <select value={filterGenre} onChange={e => setFilterGenre(e.target.value)} className="select-field w-36 text-sm py-2">
          <option value="">Gênero</option>
          {usedGenres.map(g => <option key={g} value={g}>{g}</option>)}
        </select>
        <select value={filterConsole} onChange={e => setFilterConsole(e.target.value)} className="select-field w-36 text-sm py-2">
          <option value="">Plataforma</option>
          {usedConsoles.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="flex-1 overflow-auto rounded-xl border border-dark-700/50">
        <table className="w-full text-sm">
          <thead className="bg-dark-800/80 sticky top-0 z-10">
            <tr>
              <SortHeader label="Jogo" field="name" current={sortField} asc={sortAsc} onSort={toggleSort} />
              <th className="px-3 py-3 text-left text-dark-300 font-medium">Console</th>
              <th className="px-3 py-3 text-left text-dark-300 font-medium">Gênero</th>
              <th className="px-3 py-3 text-left text-dark-300 font-medium">Tipo</th>
              <SortHeader label="Data" field="completion_date" current={sortField} asc={sortAsc} onSort={toggleSort} />
              <SortHeader label="Tempo" field="play_time" current={sortField} asc={sortAsc} onSort={toggleSort} />
              <SortHeader label="Nota" field="rating" current={sortField} asc={sortAsc} onSort={toggleSort} />
              <th className="px-3 py-3 text-left text-dark-300 font-medium">Dif.</th>
              <th className="px-3 py-3 text-left text-dark-300 font-medium">Condição</th>
              <th className="px-3 py-3 text-center text-dark-300 font-medium w-16">Ações</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(item => (
              <tr key={item.id} className="table-row">
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    {item.cover_url ? (
                      <img src={item.cover_url} alt="" className="w-8 h-11 object-cover rounded shrink-0 bg-dark-700" />
                    ) : null}
                    <span className="font-medium text-dark-100">{item.name}</span>
                    {!!item.is_gold && <span className="text-yellow-400 text-[10px]" title="100% / Platina">🏆</span>}
                  </div>
                </td>
                <td className="px-3 py-2.5 text-dark-300">{item.console}</td>
                <td className="px-3 py-2.5 text-dark-300">{item.genre}</td>
                <td className="px-3 py-2.5 text-dark-400 text-xs">{item.type}</td>
                <td className="px-3 py-2.5 text-dark-300 font-mono text-xs">{formatDateBR(item.completion_date)}</td>
                <td className="px-3 py-2.5 text-dark-300 font-mono text-xs">{item.play_time}</td>
                <td className="px-3 py-2.5">
                  <span className={`font-bold ${getRatingColor(item.rating)}`} title={RATING_LABELS[item.rating]}>{item.rating}</span>
                </td>
                <td className="px-3 py-2.5">
                  <span className={`font-bold text-xs ${getDifficultyColor(item.difficulty)}`}>{item.difficulty}</span>
                </td>
                <td className="px-3 py-2.5 text-dark-400 text-xs max-w-[150px] truncate" title={item.completion_condition}>
                  {item.completion_condition}
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
            {sorted.length === 0 && (
              <tr><td colSpan={10} className="px-4 py-12 text-center text-dark-400">Nenhum jogo encontrado</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Jogo' : 'Novo Jogo Zerado'} width="max-w-3xl">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <ApiSearchBox
              value={formData.name}
              onChange={name => setFormData(f => ({ ...f, name }))}
              placeholder="Ex: Celeste, Metal Slug..."
              label="Nome do Jogo"
              onSearch={async (query) => {
                const results = await window.api.search.games(query);
                return results.map((r: any) => ({
                  id: r.rawg_id,
                  title: r.name,
                  subtitle: `${r.released || 'N/A'} • ${r.genres.join(', ')}`,
                  cover_url: r.cover_url,
                }));
              }}
              onSelect={async (result) => {
                setFormData(f => ({ ...f, name: result.title, cover_url: result.cover_url }));
                // Fetch full details
                const details = await window.api.search.gameDetails(result.id as number);
                if (details) {
                  // Try to match genre
                  const GAME_GENRE_MAP: Record<string, string> = {
                    'Action': 'Ação', 'RPG': 'RPG', 'Platformer': 'Plataforma', 'Shooter': 'Shooter',
                    'Strategy': 'Estratégia', 'Adventure': 'Adventure', 'Puzzle': 'Puzzle',
                    'Racing': 'Corrida', 'Fighting': 'Luta', 'Sports': 'Esporte', 'Simulation': 'Simulação',
                    'Indie': 'Ação', 'Casual': 'Outro', 'Arcade': 'Ação', 'Board Games': 'Mesa',
                    'Card': 'Card Game', 'Educational': 'Outro', 'Family': 'Outro', 'Massively Multiplayer': 'RPG',
                  };
                  const matchedGenre = details.genres
                    .map((g: string) => GAME_GENRE_MAP[g])
                    .find((g: string | undefined) => g && GAME_GENRES.includes(g)) || formData.genre;

                  setFormData(f => ({
                    ...f,
                    name: details.name,
                    cover_url: details.cover_url,
                    description: details.description,
                    developer: details.developer,
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
                {formData.developer && (
                  <p className="text-xs text-dark-400 mb-1">🏢 {formData.developer}</p>
                )}
                {formData.description && (
                  <p className="text-xs text-dark-400 line-clamp-4 leading-relaxed">{formData.description}</p>
                )}
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Console</label>
            <select value={formData.console} onChange={e => setFormData(f => ({ ...f, console: e.target.value }))} className="select-field">
              {CONSOLES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Gênero</label>
            <select value={formData.genre} onChange={e => setFormData(f => ({ ...f, genre: e.target.value, type: '' }))} className="select-field">
              {GAME_GENRES.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Tipo</label>
            <select value={formData.type} onChange={e => setFormData(f => ({ ...f, type: e.target.value }))} className="select-field">
              <option value="">Selecionar...</option>
              {availableTypes.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Data de Conclusão</label>
            <input type="date" value={formData.completion_date} onChange={e => setFormData(f => ({ ...f, completion_date: e.target.value }))} className="input-field" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Tempo de Jogo (HH:MM:SS)</label>
            <input type="text" value={formData.play_time} onChange={e => setFormData(f => ({ ...f, play_time: e.target.value }))} className="input-field font-mono" placeholder="10:30:00" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Nota: {formData.rating} ({RATING_LABELS[formData.rating]})</label>
            <input type="range" min={1} max={11} value={formData.rating} onChange={e => setFormData(f => ({ ...f, rating: parseInt(e.target.value) }))} className="w-full accent-accent-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Dificuldade</label>
            <select value={formData.difficulty} onChange={e => setFormData(f => ({ ...f, difficulty: e.target.value as any }))} className="select-field">
              {Object.entries(DIFFICULTY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Condição de Zeramento</label>
            <input type="text" value={formData.completion_condition} onChange={e => setFormData(f => ({ ...f, completion_condition: e.target.value }))} className="input-field" placeholder="Termine o jogo" />
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.is_gold} onChange={e => setFormData(f => ({ ...f, is_gold: e.target.checked }))} className="accent-yellow-400 w-4 h-4" />
              <span className="text-sm text-dark-200">🏆 Gold / Platina</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={formData.mission_complete} onChange={e => setFormData(f => ({ ...f, mission_complete: e.target.checked }))} className="accent-green-400 w-4 h-4" />
              <span className="text-sm text-dark-200">✔ Missão Completa</span>
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-dark-600">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={save} className="btn-primary">{editing ? 'Salvar' : 'Adicionar'}</button>
        </div>
      </Modal>

      <ConfirmDialog isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={deleteItem} title="Excluir Jogo" message={`Excluir "${deleteTarget?.name}"?`} />
    </div>
  );
}

function SortHeader({ label, field, current, asc, onSort }: {
  label: string; field: SortField; current: SortField; asc: boolean; onSort: (f: SortField) => void;
}) {
  return (
    <th className="px-3 py-3 text-left text-dark-300 font-medium cursor-pointer hover:text-dark-100 select-none" onClick={() => onSort(field)}>
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown size={12} className={current === field ? 'text-accent-400' : 'text-dark-500'} />
      </div>
    </th>
  );
}
