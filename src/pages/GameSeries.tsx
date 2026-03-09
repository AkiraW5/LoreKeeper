import React, { useEffect, useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight, Layers, Check, Edit3, Link2, Unlink } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import SearchBar from '../components/SearchBar';
import ApiSearchBox from '../components/ApiSearchBox';
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
  const [newEntryCoverUrl, setNewEntryCoverUrl] = useState('');
  const [newEntryIsMain, setNewEntryIsMain] = useState(true);
  const [editEntryName, setEditEntryName] = useState('');
  const [editEntryCoverUrl, setEditEntryCoverUrl] = useState('');
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
    // Load all completed games once to map linked entries
    const completed = await window.api.db.getAll('completed_games', 'name ASC');
    const completedMap: Record<string, any> = {};
    for (const g of completed) completedMap[g.id] = g;

    const withEntries = await Promise.all(
      series.map(async (s: any) => {
        const entries = await window.api.db.query(
          'SELECT gse.*, gsel.completed_game_id as linked_game_id FROM game_series_entries gse LEFT JOIN game_series_entries_link gsel ON gsel.entry_id = gse.id WHERE gse.series_id = ? ORDER BY gse.sort_order ASC, gse.name ASC',
          [s.id]
        );
        // Attach linked game object if present
        const enhanced = entries.map((e: any) => ({
          ...e,
          linked_game: e.linked_game_id ? completedMap[e.linked_game_id] : null,
        }));
        const mainEntries = enhanced.filter((e: any) => e.is_main);
        const spinoffEntries = enhanced.filter((e: any) => !e.is_main);
        return {
          ...s,
          entries: enhanced,
          totalCount: enhanced.length,
          completedCount: enhanced.filter((e: any) => e.is_completed).length,
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
      cover_url: newEntryCoverUrl || '',
      is_main: newEntryIsMain ? 1 : 0,
      is_completed: 0,
      completion_date: '',
      sort_order: nextOrder,
      created_at: new Date().toISOString(),
    });
    setNewEntryName('');
    setNewEntryCoverUrl('');
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
    setEditEntryName(entry.name || '');
    setEditEntryCoverUrl((entry as any).cover_url || '');
    setEditEntryDate(entry.completion_date || '');
    setEditEntryCompleted(!!entry.is_completed);
  }

  async function saveEntryEdit() {
    if (!editEntryModal) return;
    await window.api.db.update('game_series_entries', editEntryModal.id, {
      name: editEntryName.trim() || editEntryModal.name,
      cover_url: editEntryCoverUrl || '',
      is_completed: editEntryCompleted ? 1 : 0,
      completion_date: editEntryDate,
    });
    setEditEntryModal(null);
    setEditEntryName('');
    setEditEntryCoverUrl('');
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
    // Prevent assigning the same completed game to multiple entries
    const usedGameIds = new Set<string>();

    const normalize = (s: string) => (s || '').toLowerCase().replace(/[^a-z0-9\s]+/g, '').replace(/\s+/g, ' ').trim();
    const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (const entry of entries) {
      if ((entry as any).linked_game_id) continue;
      const entryName = (entry as any).name || '';
      const entryNorm = normalize(entryName);
      if (!entryNorm) continue;

      // 1) Prefer exact normalized name matches
      let match = games.find((g: any) => !usedGameIds.has(g.id) && normalize(g.name) === entryNorm);

      // 2) Then prefer whole-word match (e.g. "Chronicles" matching whole word in game name)
      if (!match) {
        const re = new RegExp('\\b' + escapeRegExp(entryNorm).replace(/\s+/g, '\\s+') + '\\b');
        match = games.find((g: any) => !usedGameIds.has(g.id) && re.test(normalize(g.name)));
      }

      // 3) Fallback: substring match but only for reasonably long names and unused games
      if (!match && entryNorm.length > 3) {
        match = games.find((g: any) => {
          if (usedGameIds.has(g.id)) return false;
          const gNorm = normalize(g.name);
          return gNorm.includes(entryNorm) || entryNorm.includes(gNorm);
        });
      }

      if (match) {
        usedGameIds.add(match.id);
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

      {/* Series Grid */}
      <div className="flex-1 overflow-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((series: any) => {
            const isExpanded = expandedSeries.has(series.id);
            const pct = series.totalCount > 0
              ? Math.round((series.completedCount / series.totalCount) * 100)
              : 0;

            const entries = series.entries || [];
            const byRecentCompleted = [...entries]
              .filter((e: any) => e.is_completed && (e.cover_url || e.linked_game?.cover_url))
              .sort((a: any, b: any) => (b.completion_date || '').localeCompare(a.completion_date || ''));
            const mainWithCover = entries.find((e: any) => e.is_main && (e.cover_url || e.linked_game?.cover_url));
            const firstWithCover = entries.find((e: any) => e.cover_url || e.linked_game?.cover_url);
            const coverEntry = byRecentCompleted[0] || mainWithCover || firstWithCover;
            const seriesCover = coverEntry ? ((coverEntry as any).cover_url || coverEntry.linked_game?.cover_url || '') : '';

            const mainEntries = entries.filter((e: any) => e.is_main);
            const spinoffEntries = entries.filter((e: any) => !e.is_main);

            return (
              <article key={series.id} className="bg-dark-800/50 border border-dark-700/50 rounded-2xl overflow-hidden">
                <div className="p-4">
                  <div className="flex gap-4">
                    <button
                      className="w-20 h-28 shrink-0 rounded-lg bg-dark-700 overflow-hidden border border-dark-600/70"
                      onClick={() => toggleExpand(series.id)}
                      title={isExpanded ? 'Recolher série' : 'Expandir série'}
                    >
                      {seriesCover ? (
                        <img src={seriesCover} alt={series.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-[10px] text-dark-500">Sem capa</div>
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <button className="w-full text-left" onClick={() => toggleExpand(series.id)}>
                        <div className="flex items-center gap-2">
                          {isExpanded ? <ChevronDown size={17} className="text-dark-400" /> : <ChevronRight size={17} className="text-dark-400" />}
                          <h3 className="font-semibold text-dark-100 truncate">{series.name}</h3>
                        </div>
                      </button>

                      <p className="text-xs text-dark-400 mt-2">
                        Zerado: {series.completedCount} / {series.totalCount} — {pct}%
                        {series.mainCount > 0 && <span className="ml-2">• Principal: {series.mainCompleted}/{series.mainCount}</span>}
                        {series.spinoffCount > 0 && <span className="ml-2">• Spin-off: {series.spinoffCompleted}/{series.spinoffCount}</span>}
                      </p>

                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex-1 h-2 bg-dark-700 rounded-full overflow-hidden">
                          <div className="h-full bg-accent-500 rounded-full transition-all duration-300" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-mono text-dark-300 w-10 text-right">{pct}%</span>
                      </div>

                      <div className="mt-3 flex items-center gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); autoLinkAll(series.id); }}
                          className="p-1.5 rounded hover:bg-dark-700 transition-colors"
                          title="Auto-vincular com jogos zerados"
                        >
                          <Link2 size={14} className="text-dark-400 hover:text-green-400" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setAddEntryModal(series.id); }}
                          className="p-1.5 rounded hover:bg-dark-700 transition-colors"
                          title="Adicionar jogo"
                        >
                          <Plus size={14} className="text-dark-400 hover:text-accent-400" />
                        </button>
                        <button
                          onClick={e => { e.stopPropagation(); setDeleteTarget({ type: 'series', id: series.id, name: series.name }); }}
                          className="p-1.5 rounded hover:bg-dark-700 transition-colors"
                          title="Excluir série"
                        >
                          <Trash2 size={14} className="text-dark-400 hover:text-red-400" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 space-y-3">
                      {mainEntries.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-dark-400 font-semibold mb-2">Série Principal</p>
                          <div className="flex items-center gap-2 overflow-x-auto pb-2">
                            {mainEntries.map((entry: any, idx: number) => (
                              <React.Fragment key={entry.id}>
                                <EntryRow
                                  entry={entry}
                                  onToggle={toggleEntryCompletion}
                                  onEdit={openEditEntry}
                                  onLink={openLinkModal}
                                  onUnlink={unlinkGame}
                                  onDelete={(e) => setDeleteTarget({ type: 'entry', id: e.id, name: e.name })}
                                />
                                {idx < mainEntries.length - 1 && <ChevronRight size={14} className="text-dark-500 shrink-0" />}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      )}

                      {spinoffEntries.length > 0 && (
                        <div>
                          <p className="text-[10px] uppercase tracking-wider text-dark-400 font-semibold mb-2">Spin-offs</p>
                          <div className="flex items-center gap-2 overflow-x-auto pb-2">
                            {spinoffEntries.map((entry: any, idx: number) => (
                              <React.Fragment key={entry.id}>
                                <EntryRow
                                  entry={entry}
                                  onToggle={toggleEntryCompletion}
                                  onEdit={openEditEntry}
                                  onLink={openLinkModal}
                                  onUnlink={unlinkGame}
                                  onDelete={(e) => setDeleteTarget({ type: 'entry', id: e.id, name: e.name })}
                                />
                                {idx < spinoffEntries.length - 1 && <ChevronRight size={14} className="text-dark-500 shrink-0" />}
                              </React.Fragment>
                            ))}
                          </div>
                        </div>
                      )}

                      {entries.length === 0 && (
                        <p className="text-xs text-dark-500 py-2">Nenhum jogo nessa série</p>
                      )}
                    </div>
                  )}
                </div>
              </article>
            );
          })}

        {filtered.length === 0 && (
          <div className="text-center text-dark-400 py-12">Nenhuma série encontrada</div>
        )}
      </div>
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
            <ApiSearchBox
              value={newEntryName}
              onChange={setNewEntryName}
              placeholder="Ex: Final Fantasy VII Remake"
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
                setNewEntryName(result.title);
                setNewEntryCoverUrl(result.cover_url || '');
              }}
            />
          </div>
          {newEntryCoverUrl && (
            <div className="px-3 py-3 bg-dark-700/30 rounded-xl flex items-center gap-3">
              <img src={newEntryCoverUrl} alt="" className="w-14 h-20 object-cover rounded bg-dark-700" />
              <p className="text-xs text-dark-400">Capa será salva junto com a entrada da série.</p>
            </div>
          )}
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
          <button onClick={() => {
            setAddEntryModal(null);
            setNewEntryName('');
            setNewEntryCoverUrl('');
            setNewEntryIsMain(true);
          }} className="btn-secondary">Cancelar</button>
          <button onClick={addEntry} className="btn-primary">Adicionar</button>
        </div>
      </Modal>

      {/* Edit Entry Modal */}
      <Modal isOpen={!!editEntryModal} onClose={() => {
        setEditEntryModal(null);
        setEditEntryName('');
        setEditEntryCoverUrl('');
      }} title="Editar Jogo" width="max-w-lg">
        <div className="space-y-4">
          <ApiSearchBox
            value={editEntryName}
            onChange={setEditEntryName}
            placeholder="Ex: Castlevania III: Dracula's Curse"
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
              setEditEntryName(result.title);
              setEditEntryCoverUrl(result.cover_url || '');
            }}
          />
          {editEntryCoverUrl && (
            <div className="px-3 py-3 bg-dark-700/30 rounded-xl flex items-center gap-3">
              <img src={editEntryCoverUrl} alt="" className="w-14 h-20 object-cover rounded bg-dark-700" />
              <p className="text-xs text-dark-400">Capa da entrada da série.</p>
            </div>
          )}
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
  const previewCover = (entry as any).cover_url || (entry as any).linked_game?.cover_url || '';

  return (
    <div className="group w-40 shrink-0 bg-dark-900/60 border border-dark-700/60 rounded-xl overflow-hidden">
      <div className="relative h-24 bg-dark-800">
        {previewCover ? (
          <img src={previewCover} alt={entry.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-[10px] text-dark-500">Sem capa</div>
        )}
        <button
          onClick={() => onToggle(entry)}
          className={`absolute top-1.5 left-1.5 w-5 h-5 rounded border flex items-center justify-center transition-colors ${
            entry.is_completed
              ? 'bg-green-500/25 border-green-500 text-green-300'
              : 'bg-dark-950/85 border-dark-500 text-dark-300 hover:border-dark-300'
          }`}
          title={entry.is_completed ? 'Marcar como não concluído' : 'Marcar como concluído'}
        >
          {!!entry.is_completed && <Check size={11} />}
        </button>
      </div>

      <div className="p-2">
        <p className={`text-xs font-medium line-clamp-2 ${entry.is_completed ? 'text-dark-300 line-through' : 'text-dark-100'}`} title={entry.name}>{entry.name}</p>
        <p className="text-[10px] text-dark-500 font-mono mt-1">{entry.completion_date ? formatDateBR(entry.completion_date) : '—'}</p>

        <div className="mt-1.5 flex items-center justify-end gap-1 opacity-90 group-hover:opacity-100">
          <button onClick={() => onEdit(entry)} className="p-1 rounded hover:bg-dark-700" title="Editar data">
            <Edit3 size={11} className="text-dark-400 hover:text-accent-400" />
          </button>
          <button
            onClick={() => entry.linked_game ? onUnlink(entry) : onLink(entry)}
            className="p-1 rounded hover:bg-dark-700"
            title={entry.linked_game ? 'Desvincular' : 'Vincular com jogo zerado'}
          >
            {entry.linked_game ? (
              <Unlink size={11} className="text-accent-400 hover:text-red-400" />
            ) : (
              <Link2 size={11} className="text-dark-400 hover:text-green-400" />
            )}
          </button>
          <button onClick={() => onDelete(entry)} className="p-1 rounded hover:bg-dark-700" title="Excluir entrada">
            <Trash2 size={11} className="text-dark-400 hover:text-red-400" />
          </button>
        </div>
      </div>
    </div>
  );
}
