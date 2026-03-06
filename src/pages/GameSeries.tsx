import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Layers, Check, Edit3, Link2, Unlink } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import SearchBar from '../components/SearchBar';
import { GameSeries, GameSeriesEntry, CompletedGame } from '../types';
import { generateId, formatDateBR } from '../lib/utils';

export default function GameSeriesPage() {
  const [seriesList, setSeriesList] = useState<GameSeries[]>([]);
  const [search, setSearch] = useState('');
  const [expandedSeries, setExpandedSeries] = useState<Set<string>>(new Set());
  const [addSeriesModal, setAddSeriesModal] = useState(false);
  const [addEntryModal, setAddEntryModal] = useState<string | null>(null);
  const [editEntryModal, setEditEntryModal] = useState<GameSeriesEntry | null>(null);
  const [linkModal, setLinkModal] = useState<GameSeriesEntry | null>(null);
  const [newSeriesName, setNewSeriesName] = useState('');
  const [newEntryName, setNewEntryName] = useState('');
  const [newEntryIsMain, setNewEntryIsMain] = useState(true);
  const [editEntryDate, setEditEntryDate] = useState('');
  const [editEntryCompleted, setEditEntryCompleted] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'series' | 'entry'; id: string; name: string } | null>(null);
  const [completedGames, setCompletedGames] = useState<CompletedGame[]>([]);
  const [linkSearch, setLinkSearch] = useState('');

  useEffect(() => {
    loadSeries();
  }, []);

  async function loadSeries() {
    const series = await window.api.db.getAll('game_series', 'name ASC');
    const withEntries = await Promise.all(
      series.map(async (s: any) => {
        const entries = await window.api.db.query(
          'SELECT gse.*, gsel.completed_game_id as linked_game_id FROM game_series_entries gse LEFT JOIN game_series_entries_link gsel ON gsel.entry_id = gse.id WHERE gse.series_id = ? ORDER BY gse.sort_order ASC, gse.name ASC',
          [s.id]
        );
        const mainEntries = entries.filter((e: any) => e.is_main);
        const spinoffEntries = entries.filter((e: any) => !e.is_main);
        return {
          ...s,
          entries,
          totalCount: entries.length,
          completedCount: entries.filter((e: any) => e.is_completed).length,
          mainCount: mainEntries.length,
          mainCompleted: mainEntries.filter((e: any) => e.is_completed).length,
          spinoffCount: spinoffEntries.length,
          spinoffCompleted: spinoffEntries.filter((e: any) => e.is_completed).length,
        };
      })
    );
    setSeriesList(withEntries);
  }

  function toggleExpand(id: string) {
    setExpandedSeries(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function addSeries() {
    if (!newSeriesName.trim()) return;
    await window.api.db.insert('game_series', {
      id: generateId(),
      name: newSeriesName.trim(),
      created_at: new Date().toISOString(),
    });
    setNewSeriesName('');
    setAddSeriesModal(false);
    loadSeries();
  }

  async function addEntry() {
    if (!newEntryName.trim() || !addEntryModal) return;
    const entries = await window.api.db.query(
      'SELECT MAX(sort_order) as maxOrder FROM game_series_entries WHERE series_id = ?',
      [addEntryModal]
    );
    const nextOrder = ((entries[0] as any)?.maxOrder || 0) + 1;

    await window.api.db.insert('game_series_entries', {
      id: generateId(),
      series_id: addEntryModal,
      name: newEntryName.trim(),
      is_main: newEntryIsMain ? 1 : 0,
      is_completed: 0,
      completion_date: '',
      sort_order: nextOrder,
      created_at: new Date().toISOString(),
    });
    setNewEntryName('');
    setNewEntryIsMain(true);
    setAddEntryModal(null);
    loadSeries();
  }

  async function toggleEntryCompletion(entry: GameSeriesEntry) {
    await window.api.db.update('game_series_entries', entry.id, {
      is_completed: entry.is_completed ? 0 : 1,
      completion_date: entry.is_completed ? '' : new Date().toISOString().split('T')[0],
    });
    loadSeries();
  }

  function openEditEntry(entry: GameSeriesEntry) {
    setEditEntryModal(entry);
    setEditEntryDate(entry.completion_date || '');
    setEditEntryCompleted(!!entry.is_completed);
  }

  async function saveEntryEdit() {
    if (!editEntryModal) return;
    await window.api.db.update('game_series_entries', editEntryModal.id, {
      is_completed: editEntryCompleted ? 1 : 0,
      completion_date: editEntryDate,
    });
    setEditEntryModal(null);
    loadSeries();
  }

  async function openLinkModal(entry: GameSeriesEntry) {
    const games = await window.api.db.getAll('completed_games', 'name ASC');
    setCompletedGames(games);
    setLinkModal(entry);
    setLinkSearch('');
  }

  async function linkGame(entry: GameSeriesEntry, gameId: string) {
    await window.api.db.run('DELETE FROM game_series_entries_link WHERE entry_id = ?', [entry.id]);
    await window.api.db.run(
      'INSERT INTO game_series_entries_link (entry_id, completed_game_id) VALUES (?, ?)',
      [entry.id, gameId]
    );
    const game = completedGames.find(g => g.id === gameId);
    if (game) {
      await window.api.db.update('game_series_entries', entry.id, {
        is_completed: 1,
        completion_date: game.completion_date || new Date().toISOString().split('T')[0],
      });
    }
    setLinkModal(null);
    loadSeries();
  }

  async function unlinkGame(entry: GameSeriesEntry) {
    await window.api.db.run('DELETE FROM game_series_entries_link WHERE entry_id = ?', [entry.id]);
    loadSeries();
  }

  async function autoLinkAll(seriesId: string) {
    const entries = await window.api.db.query(
      'SELECT gse.*, gsel.completed_game_id as linked_game_id FROM game_series_entries gse LEFT JOIN game_series_entries_link gsel ON gsel.entry_id = gse.id WHERE gse.series_id = ?',
      [seriesId]
    );
    const games = await window.api.db.getAll('completed_games', 'name ASC');
    for (const entry of entries) {
      if ((entry as any).linked_game_id) continue;
      const match = games.find((g: any) =>
        g.name.toLowerCase().includes((entry as any).name.toLowerCase()) ||
        (entry as any).name.toLowerCase().includes(g.name.toLowerCase())
      );
      if (match) {
        await window.api.db.run(
          'INSERT OR IGNORE INTO game_series_entries_link (entry_id, completed_game_id) VALUES (?, ?)',
          [entry.id, match.id]
        );
        await window.api.db.update('game_series_entries', entry.id, {
          is_completed: 1,
          completion_date: match.completion_date || new Date().toISOString().split('T')[0],
        });
      }
    }
    loadSeries();
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    if (deleteTarget.type === 'series') {
      await window.api.db.run('DELETE FROM game_series_entries_link WHERE entry_id IN (SELECT id FROM game_series_entries WHERE series_id = ?)', [deleteTarget.id]);
      await window.api.db.run('DELETE FROM game_series_entries WHERE series_id = ?', [deleteTarget.id]);
      await window.api.db.delete('game_series', deleteTarget.id);
    } else {
      await window.api.db.run('DELETE FROM game_series_entries_link WHERE entry_id = ?', [deleteTarget.id]);
      await window.api.db.delete('game_series_entries', deleteTarget.id);
    }
    setDeleteTarget(null);
    loadSeries();
  }

  const filtered = seriesList.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  const filteredGames = completedGames.filter(g =>
    g.name.toLowerCase().includes(linkSearch.toLowerCase())
  );

  return (
    <div className="p-6 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-2">
            <Layers size={24} className="text-purple-400" />
            Séries de Jogos
          </h1>
          <p className="text-sm text-dark-400 mt-1">
            {seriesList.length} séries rastreadas
          </p>
        </div>
        <button onClick={() => setAddSeriesModal(true)} className="btn-primary flex items-center gap-2">
          <Plus size={16} />
          Nova Série
        </button>
      </div>

      {/* Search */}
      <div className="w-72 mb-4">
        <SearchBar value={search} onChange={setSearch} placeholder="Buscar série..." />
      </div>

      {/* Series List */}
      <div className="flex-1 overflow-auto space-y-3">
        {filtered.map((series: any) => {
          const isExpanded = expandedSeries.has(series.id);
          const pct = series.totalCount > 0
            ? Math.round((series.completedCount / series.totalCount) * 100)
            : 0;

          return (
            <div key={series.id} className="stat-card">
              {/* Series Header */}
              <div
                className="flex items-center justify-between cursor-pointer"
                onClick={() => toggleExpand(series.id)}
              >
                <div className="flex items-center gap-3">
                  {isExpanded ? (
                    <ChevronDown size={18} className="text-dark-400" />
                  ) : (
                    <ChevronRight size={18} className="text-dark-400" />
                  )}
                  <div>
                    <h3 className="font-semibold text-dark-100">{series.name}</h3>
                    <p className="text-xs text-dark-400 mt-0.5">
                      Zerado: {series.completedCount} / {series.totalCount} — {pct}%
                      {series.mainCount > 0 && (
                        <span className="ml-2">
                          • Principal: {series.mainCompleted}/{series.mainCount}
                        </span>
                      )}
                      {series.spinoffCount > 0 && (
                        <span className="ml-2">
                          • Spin-off: {series.spinoffCompleted}/{series.spinoffCount}
                        </span>
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Progress bar */}
                  <div className="w-32 h-2 bg-dark-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent-500 rounded-full transition-all duration-300"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-mono text-dark-300 w-10 text-right">{pct}%</span>

                  <button
                    onClick={e => { e.stopPropagation(); autoLinkAll(series.id); }}
                    className="p-1.5 rounded hover:bg-dark-600 transition-colors"
                    title="Auto-vincular com jogos zerados"
                  >
                    <Link2 size={14} className="text-dark-400 hover:text-green-400" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setAddEntryModal(series.id); }}
                    className="p-1.5 rounded hover:bg-dark-600 transition-colors"
                    title="Adicionar jogo"
                  >
                    <Plus size={14} className="text-dark-400 hover:text-accent-400" />
                  </button>
                  <button
                    onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'series', id: series.id, name: series.name }); }}
                    className="p-1.5 rounded hover:bg-dark-600 transition-colors"
                    title="Excluir série"
                  >
                    <Trash2 size={14} className="text-dark-400 hover:text-red-400" />
                  </button>
                </div>
              </div>

              {/* Entries */}
              {isExpanded && series.entries && (
                <div className="mt-4 ml-7 space-y-1">
                  {series.entries.length > 0 && (
                    <>
                      {/* Main entries */}
                      {series.entries.filter((e: any) => e.is_main).length > 0 && (
                        <div className="mb-2">
                          <p className="text-[10px] uppercase tracking-wider text-dark-400 font-semibold mb-1">
                            Série Principal
                          </p>
                          {series.entries.filter((e: any) => e.is_main).map((entry: any) => (
                            <EntryRow
                              key={entry.id}
                              entry={entry}
                              onToggle={toggleEntryCompletion}
                              onEdit={openEditEntry}
                              onLink={openLinkModal}
                              onUnlink={unlinkGame}
                              onDelete={(e) => setDeleteTarget({ type: 'entry', id: e.id, name: e.name })}
                            />
                          ))}
                        </div>
                      )}
                      {/* Spinoffs */}
                      {series.entries.filter((e: any) => !e.is_main).length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-dark-400 font-semibold mb-1">
                            Spin-offs
                          </p>
                          {series.entries.filter((e: any) => !e.is_main).map((entry: any) => (
                            <EntryRow
                              key={entry.id}
                              entry={entry}
                              onToggle={toggleEntryCompletion}
                              onEdit={openEditEntry}
                              onLink={openLinkModal}
                              onUnlink={unlinkGame}
                              onDelete={(e) => setDeleteTarget({ type: 'entry', id: e.id, name: e.name })}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  )}
                  {series.entries.length === 0 && (
                    <p className="text-xs text-dark-500 py-2">Nenhum jogo nessa série</p>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center text-dark-400 py-12">Nenhuma série encontrada</div>
        )}
      </div>

      {/* Add Series Modal */}
      <Modal isOpen={addSeriesModal} onClose={() => setAddSeriesModal(false)} title="Nova Série" width="max-w-md">
        <div>
          <label className="block text-xs font-medium text-dark-300 mb-1">Nome da Série</label>
          <input
            type="text"
            value={newSeriesName}
            onChange={e => setNewSeriesName(e.target.value)}
            className="input-field"
            placeholder="Ex: Final Fantasy"
            onKeyDown={e => e.key === 'Enter' && addSeries()}
          />
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setAddSeriesModal(false)} className="btn-secondary">Cancelar</button>
          <button onClick={addSeries} className="btn-primary">Criar Série</button>
        </div>
      </Modal>

      {/* Add Entry Modal */}
      <Modal isOpen={!!addEntryModal} onClose={() => setAddEntryModal(null)} title="Adicionar Jogo à Série" width="max-w-md">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Nome do Jogo</label>
            <input
              type="text"
              value={newEntryName}
              onChange={e => setNewEntryName(e.target.value)}
              className="input-field"
              placeholder="Ex: Final Fantasy VII Remake"
              onKeyDown={e => e.key === 'Enter' && addEntry()}
            />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newEntryIsMain}
              onChange={e => setNewEntryIsMain(e.target.checked)}
              className="accent-accent-500 w-4 h-4"
            />
            <span className="text-sm text-dark-200">Série Principal (desmarque para Spin-off)</span>
          </label>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setAddEntryModal(null)} className="btn-secondary">Cancelar</button>
          <button onClick={addEntry} className="btn-primary">Adicionar</button>
        </div>
      </Modal>

      {/* Edit Entry Modal */}
      <Modal isOpen={!!editEntryModal} onClose={() => setEditEntryModal(null)} title="Editar Jogo" width="max-w-md">
        <div className="space-y-4">
          <p className="text-sm font-medium text-dark-100">{editEntryModal?.name}</p>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={editEntryCompleted}
              onChange={e => {
                setEditEntryCompleted(e.target.checked);
                if (e.target.checked && !editEntryDate) {
                  setEditEntryDate(new Date().toISOString().split('T')[0]);
                }
              }}
              className="accent-accent-500 w-4 h-4"
            />
            <span className="text-sm text-dark-200">Concluído</span>
          </label>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Data de Conclusão</label>
            <input
              type="date"
              value={editEntryDate}
              onChange={e => setEditEntryDate(e.target.value)}
              className="input-field"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setEditEntryModal(null)} className="btn-secondary">Cancelar</button>
          <button onClick={saveEntryEdit} className="btn-primary">Salvar</button>
        </div>
      </Modal>

      {/* Link Game Modal */}
      <Modal isOpen={!!linkModal} onClose={() => setLinkModal(null)} title="Vincular com Jogo Zerado" width="max-w-lg">
        <div className="space-y-3">
          <p className="text-xs text-dark-400">
            Vincular <strong className="text-dark-200">{linkModal?.name}</strong> com um jogo zerado.
            A data de conclusão será preenchida automaticamente.
          </p>
          <input
            type="text"
            value={linkSearch}
            onChange={e => setLinkSearch(e.target.value)}
            className="input-field"
            placeholder="Buscar jogo zerado..."
          />
          <div className="max-h-64 overflow-auto space-y-1">
            {filteredGames.map(game => (
              <button
                key={game.id}
                onClick={() => linkModal && linkGame(linkModal, game.id)}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-dark-700/50 transition-colors flex items-center justify-between"
              >
                <div>
                  <p className="text-sm text-dark-100">{game.name}</p>
                  <p className="text-xs text-dark-400">{game.console} • {formatDateBR(game.completion_date)}</p>
                </div>
                <Link2 size={14} className="text-dark-500" />
              </button>
            ))}
            {filteredGames.length === 0 && (
              <p className="text-xs text-dark-500 text-center py-4">Nenhum jogo encontrado</p>
            )}
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.type === 'series' ? 'Excluir Série' : 'Excluir Jogo'}
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}"?${
          deleteTarget?.type === 'series' ? ' Todos os jogos da série serão removidos.' : ''
        }`}
      />
    </div>
  );
}

function EntryRow({
  entry,
  onToggle,
  onEdit,
  onLink,
  onUnlink,
  onDelete,
}: {
  entry: GameSeriesEntry & { linked_game_id?: string };
  onToggle: (e: GameSeriesEntry) => void;
  onEdit: (e: GameSeriesEntry) => void;
  onLink: (e: GameSeriesEntry) => void;
  onUnlink: (e: GameSeriesEntry) => void;
  onDelete: (e: GameSeriesEntry) => void;
}) {
  return (
    <div className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-dark-700/30 group">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onToggle(entry)}
          className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
            entry.is_completed
              ? 'bg-green-500/20 border-green-500 text-green-400'
              : 'border-dark-500 hover:border-dark-300'
          }`}
        >
          {entry.is_completed && <Check size={12} />}
        </button>
        <span className={`text-sm ${entry.is_completed ? 'text-dark-300 line-through' : 'text-dark-100'}`}>
          {entry.name}
        </span>
        {entry.linked_game_id && (
          <span className="text-[9px] bg-accent-500/20 text-accent-300 px-1.5 py-0.5 rounded-full">vinculado</span>
        )}
      </div>
      <div className="flex items-center gap-2">
        {entry.completion_date && (
          <span className="text-[10px] text-dark-500 font-mono">{formatDateBR(entry.completion_date)}</span>
        )}
        <button
          onClick={() => onEdit(entry)}
          className="p-1 rounded hover:bg-dark-600 opacity-0 group-hover:opacity-100 transition-opacity"
          title="Editar data"
        >
          <Edit3 size={12} className="text-dark-400 hover:text-accent-400" />
        </button>
        <button
          onClick={() => entry.linked_game_id ? onUnlink(entry) : onLink(entry)}
          className="p-1 rounded hover:bg-dark-600 opacity-0 group-hover:opacity-100 transition-opacity"
          title={entry.linked_game_id ? 'Desvincular' : 'Vincular com jogo zerado'}
        >
          {entry.linked_game_id ? (
            <Unlink size={12} className="text-accent-400 hover:text-red-400" />
          ) : (
            <Link2 size={12} className="text-dark-400 hover:text-green-400" />
          )}
        </button>
        <button
          onClick={() => onDelete(entry)}
          className="p-1 rounded hover:bg-dark-600 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={12} className="text-dark-400 hover:text-red-400" />
        </button>
      </div>
    </div>
  );
}
