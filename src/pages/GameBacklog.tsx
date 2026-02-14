import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit3, ListTodo, Gamepad2, Star, Clock, Shuffle, X } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import SearchBar from '../components/SearchBar';
import ApiSearchBox from '../components/ApiSearchBox';
import { GameBacklog, GAME_GENRES, CONSOLES } from '../types';
import { generateId } from '../lib/utils';

const defaultBacklog: Omit<GameBacklog, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  genre: 'Ação',
  expected_hours: 10,
  desire_level: 3,
  mission_complete: false,
  owned: false,
  currently_playing: false,
  platform: 'PC',
  notes: '',
  cover_url: '',
  description: '',
};

const GAME_GENRE_MAP: Record<string, string> = {
  'Action': 'Ação', 'RPG': 'RPG', 'Platformer': 'Plataforma', 'Shooter': 'Shooter',
  'Strategy': 'Estratégia', 'Adventure': 'Adventure', 'Puzzle': 'Puzzle',
  'Racing': 'Corrida', 'Fighting': 'Luta', 'Sports': 'Esporte', 'Simulation': 'Simulação',
  'Indie': 'Ação', 'Casual': 'Outro', 'Arcade': 'Ação', 'Board Games': 'Mesa',
  'Card': 'Card Game', 'Massively Multiplayer': 'RPG',
};

const desireLabels: Record<number, string> = {
  1: '😐', 2: '🙂', 3: '😊', 4: '🤩', 5: '🔥',
};

export default function GameBacklogPage() {
  const [items, setItems] = useState<GameBacklog[]>([]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<GameBacklog | null>(null);
  const [formData, setFormData] = useState(defaultBacklog);
  const [deleteTarget, setDeleteTarget] = useState<GameBacklog | null>(null);
  const [filterPlaying, setFilterPlaying] = useState(false);
  const [rouletteOpen, setRouletteOpen] = useState(false);
  const [rouletteResult, setRouletteResult] = useState<GameBacklog | null>(null);
  const [rouletteSpinning, setRouletteSpinning] = useState(false);
  const [rouletteGenre, setRouletteGenre] = useState('');
  const [rouletteMaxHours, setRouletteMaxHours] = useState(0);
  const [rouletteMinDesire, setRouletteMinDesire] = useState(1);
  const [rouletteOwnedOnly, setRouletteOwnedOnly] = useState(false);

  useEffect(() => {
    loadItems();
  }, []);

  async function loadItems() {
    const data = await window.api.db.getAll('game_backlog', 'desire_level DESC, name ASC');
    setItems(data);
  }

  function openAdd() {
    setEditing(null);
    setFormData({ ...defaultBacklog });
    setModalOpen(true);
  }

  function openEdit(item: GameBacklog) {
    setEditing(item);
    setFormData({
      name: item.name,
      genre: item.genre,
      expected_hours: item.expected_hours,
      desire_level: item.desire_level,
      mission_complete: !!item.mission_complete,
      owned: !!item.owned,
      currently_playing: !!item.currently_playing,
      platform: item.platform,
      notes: item.notes,
      cover_url: item.cover_url || '',
      description: item.description || '',
    });
    setModalOpen(true);
  }

  async function save() {
    if (!formData.name.trim()) return;

    const data = {
      ...formData,
      mission_complete: formData.mission_complete ? 1 : 0,
      owned: formData.owned ? 1 : 0,
      currently_playing: formData.currently_playing ? 1 : 0,
      updated_at: new Date().toISOString(),
    };

    if (editing) {
      await window.api.db.update('game_backlog', editing.id, data);
    } else {
      await window.api.db.insert('game_backlog', {
        id: generateId(),
        ...data,
        created_at: new Date().toISOString(),
      });
    }

    setModalOpen(false);
    loadItems();
  }

  async function deleteItem() {
    if (!deleteTarget) return;
    await window.api.db.delete('game_backlog', deleteTarget.id);
    setDeleteTarget(null);
    loadItems();
  }

  function spinRoulette() {
    let pool = items.filter(i => !i.currently_playing);
    if (rouletteGenre) pool = pool.filter(i => i.genre === rouletteGenre);
    if (rouletteMaxHours > 0) pool = pool.filter(i => i.expected_hours <= rouletteMaxHours);
    if (rouletteMinDesire > 1) pool = pool.filter(i => i.desire_level >= rouletteMinDesire);
    if (rouletteOwnedOnly) pool = pool.filter(i => i.owned);

    if (pool.length === 0) {
      setRouletteResult(null);
      return;
    }

    setRouletteSpinning(true);
    setRouletteResult(null);
    let count = 0;
    const maxTicks = 15;
    const interval = setInterval(() => {
      const rand = pool[Math.floor(Math.random() * pool.length)];
      setRouletteResult(rand);
      count++;
      if (count >= maxTicks) {
        clearInterval(interval);
        setRouletteSpinning(false);
        const final = pool[Math.floor(Math.random() * pool.length)];
        setRouletteResult(final);
      }
    }, 120);
  }

  const filtered = items.filter(i => {
    const matchSearch = i.name.toLowerCase().includes(search.toLowerCase());
    const matchPlaying = !filterPlaying || i.currently_playing;
    return matchSearch && matchPlaying;
  });

  const totalHours = filtered.reduce((sum, i) => sum + i.expected_hours, 0);

  return (
    <div className="p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-2">
            <ListTodo size={24} className="text-blue-400" />
            Backlog de Jogos
          </h1>
          <p className="text-sm text-dark-400 mt-1">
            {items.length} jogos no backlog • ~{totalHours}h estimadas
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { setRouletteResult(null); setRouletteOpen(true); }} className="btn-secondary flex items-center gap-2">
            <Shuffle size={16} />
            O que jogar?
          </button>
          <button onClick={openAdd} className="btn-primary flex items-center gap-2">
            <Plus size={16} />
            Adicionar ao Backlog
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-72">
          <SearchBar value={search} onChange={setSearch} placeholder="Buscar jogo..." />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={filterPlaying}
            onChange={e => setFilterPlaying(e.target.checked)}
            className="accent-accent-500 w-4 h-4"
          />
          <span className="text-sm text-dark-300">Jogando agora</span>
        </label>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(item => (
            <div
              key={item.id}
              className={`stat-card relative group ${
                item.currently_playing ? 'border-green-500/30 bg-green-500/5' : ''
              }`}
            >
              {!!item.currently_playing && (
                <div className="absolute top-3 right-3">
                  <span className="badge bg-green-500/20 text-green-400 border border-green-500/30">
                    <Gamepad2 size={10} className="mr-1" /> Jogando
                  </span>
                </div>
              )}

              <div className="flex items-start gap-3">
                {item.cover_url ? (
                  <img src={item.cover_url} alt="" className="w-12 h-16 object-cover rounded shrink-0 bg-dark-700" />
                ) : null}
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold text-dark-100 pr-20">{item.name}</h3>
                  <p className="text-xs text-dark-400 mt-1">{item.genre} • {item.platform}</p>
                </div>
              </div>

              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1">
                  <Clock size={12} className="text-dark-400" />
                  <span className="text-xs text-dark-300">~{item.expected_hours}h</span>
                </div>
                <div className="flex items-center gap-1">
                  <Star size={12} className="text-yellow-400" />
                  <span className="text-xs text-dark-300">
                    {desireLabels[item.desire_level]} {item.desire_level}/5
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 mt-3">
                {item.owned ? (
                  <span className="badge bg-blue-500/20 text-blue-400 border border-blue-500/30 text-[10px]">
                    ✔ Tenho
                  </span>
                ) : (
                  <span className="badge bg-dark-600 text-dark-400 border border-dark-500 text-[10px]">
                    ✖ Não tenho
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="absolute bottom-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <button onClick={() => openEdit(item)} className="p-1.5 rounded hover:bg-dark-600">
                  <Edit3 size={13} className="text-dark-400 hover:text-accent-400" />
                </button>
                <button onClick={() => setDeleteTarget(item)} className="p-1.5 rounded hover:bg-dark-600">
                  <Trash2 size={13} className="text-dark-400 hover:text-red-400" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {filtered.length === 0 && (
          <div className="text-center text-dark-400 py-12">Nenhum jogo no backlog</div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Editar Backlog' : 'Adicionar ao Backlog'}
      >
        <div className="space-y-4">
          <div>
            <ApiSearchBox
              value={formData.name}
              onChange={name => setFormData(f => ({ ...f, name }))}
              placeholder="Ex: Celeste, Hollow Knight..."
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
                const details = await window.api.search.gameDetails(result.id as number);
                if (details) {
                  const matchedGenre = details.genres
                    .map((g: string) => GAME_GENRE_MAP[g])
                    .find((g: string | undefined) => g && GAME_GENRES.includes(g)) || formData.genre;
                  setFormData(f => ({
                    ...f,
                    name: details.name,
                    cover_url: details.cover_url,
                    description: details.description,
                    genre: matchedGenre,
                  }));
                }
              }}
            />
          </div>

          {/* Cover Preview */}
          {formData.cover_url && (
            <div className="flex items-start gap-4 px-3 py-3 bg-dark-700/30 rounded-xl">
              <img src={formData.cover_url} alt="" className="w-16 h-22 object-cover rounded-lg shrink-0 bg-dark-700" />
              <div className="min-w-0 flex-1">
                {formData.description && (
                  <p className="text-xs text-dark-400 line-clamp-4 leading-relaxed">{formData.description}</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1">Gênero</label>
              <select
                value={formData.genre}
                onChange={e => setFormData(f => ({ ...f, genre: e.target.value }))}
                className="select-field"
              >
                {GAME_GENRES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1">Plataforma</label>
              <select
                value={formData.platform}
                onChange={e => setFormData(f => ({ ...f, platform: e.target.value }))}
                className="select-field"
              >
                {CONSOLES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1">
                Horas Estimadas: {formData.expected_hours}h
              </label>
              <input
                type="number"
                min={1}
                value={formData.expected_hours}
                onChange={e => setFormData(f => ({ ...f, expected_hours: parseInt(e.target.value) || 1 }))}
                className="input-field"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1">
                Vontade de Jogar: {desireLabels[formData.desire_level]} {formData.desire_level}/5
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={formData.desire_level}
                onChange={e => setFormData(f => ({ ...f, desire_level: parseInt(e.target.value) }))}
                className="w-full accent-accent-500"
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.owned}
                onChange={e => setFormData(f => ({ ...f, owned: e.target.checked }))}
                className="accent-blue-400 w-4 h-4"
              />
              <span className="text-sm text-dark-200">Tenho o jogo</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.currently_playing}
                onChange={e => setFormData(f => ({ ...f, currently_playing: e.target.checked }))}
                className="accent-green-400 w-4 h-4"
              />
              <span className="text-sm text-dark-200">Jogando no momento</span>
            </label>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-dark-600">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={save} className="btn-primary">
            {editing ? 'Salvar' : 'Adicionar'}
          </button>
        </div>
      </Modal>

      {/* Roulette Modal */}
      <Modal isOpen={rouletteOpen} onClose={() => setRouletteOpen(false)} title="🎰 O que jogar agora?" width="max-w-lg">
        <div className="space-y-4">
          {/* Filters */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1">Gênero</label>
              <select
                value={rouletteGenre}
                onChange={e => setRouletteGenre(e.target.value)}
                className="select-field"
              >
                <option value="">Todos</option>
                {GAME_GENRES.map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1">Máx. horas (0 = sem limite)</label>
              <input
                type="number"
                min={0}
                value={rouletteMaxHours}
                onChange={e => setRouletteMaxHours(parseInt(e.target.value) || 0)}
                className="input-field"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1">
                Vontade mínima: {desireLabels[rouletteMinDesire]} {rouletteMinDesire}/5
              </label>
              <input
                type="range"
                min={1}
                max={5}
                value={rouletteMinDesire}
                onChange={e => setRouletteMinDesire(parseInt(e.target.value))}
                className="w-full accent-accent-500"
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer self-end pb-1">
              <input
                type="checkbox"
                checked={rouletteOwnedOnly}
                onChange={e => setRouletteOwnedOnly(e.target.checked)}
                className="accent-blue-400 w-4 h-4"
              />
              <span className="text-sm text-dark-200">Só jogos que tenho</span>
            </label>
          </div>

          {/* Spin Button */}
          <div className="text-center pt-2">
            <button
              onClick={spinRoulette}
              disabled={rouletteSpinning}
              className={`px-6 py-3 rounded-xl font-bold text-lg transition-all ${
                rouletteSpinning
                  ? 'bg-accent-500/30 text-accent-300 animate-pulse cursor-not-allowed'
                  : 'bg-accent-500 hover:bg-accent-600 text-white shadow-lg shadow-accent-500/25'
              }`}
            >
              {rouletteSpinning ? '🎲 Girando...' : '🎲 Girar Roleta!'}
            </button>
          </div>

          {/* Result */}
          {rouletteResult && (
            <div className={`mt-4 p-4 rounded-xl border transition-all ${
              rouletteSpinning
                ? 'border-dark-600 bg-dark-700/50'
                : 'border-accent-500/50 bg-accent-500/10 shadow-lg shadow-accent-500/10'
            }`}>
              <p className="text-xs text-dark-400 mb-1">{rouletteSpinning ? 'Selecionando...' : '🎉 Você deve jogar:'}</p>
              <h3 className="text-xl font-bold text-dark-100">{rouletteResult.name}</h3>
              <div className="flex items-center gap-4 mt-2 text-sm text-dark-300">
                <span>{rouletteResult.genre}</span>
                <span>•</span>
                <span>{rouletteResult.platform}</span>
                <span>•</span>
                <span>~{rouletteResult.expected_hours}h</span>
                <span>•</span>
                <span>{desireLabels[rouletteResult.desire_level]} {rouletteResult.desire_level}/5</span>
              </div>
            </div>
          )}

          {rouletteResult === null && !rouletteSpinning && (
            <p className="text-xs text-dark-500 text-center py-2">
              Configure os filtros e clique em "Girar Roleta!"
            </p>
          )}
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteItem}
        title="Excluir do Backlog"
        message={`Tem certeza que deseja remover "${deleteTarget?.name}" do backlog?`}
      />
    </div>
  );
}
