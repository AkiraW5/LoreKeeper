import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit3, Target, Calendar, Trophy } from 'lucide-react';
import Modal from '../components/Modal';
import ConfirmDialog from '../components/ConfirmDialog';
import { MainMission } from '../types';
import { generateId, formatDateBR } from '../lib/utils';

const defaultMission: Omit<MainMission, 'id' | 'created_at' | 'updated_at'> = {
  name: '',
  description: '',
  total_games: 0,
  completed_games: 0,
  target_date: '',
};

export default function MissionsPage() {
  const [missions, setMissions] = useState<MainMission[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<MainMission | null>(null);
  const [formData, setFormData] = useState(defaultMission);
  const [deleteTarget, setDeleteTarget] = useState<MainMission | null>(null);

  useEffect(() => { loadMissions(); }, []);

  async function loadMissions() {
    const data = await window.api.db.getAll('main_missions', 'created_at DESC');
    setMissions(data);
  }

  function openAdd() {
    setEditing(null);
    setFormData({ ...defaultMission });
    setModalOpen(true);
  }

  function openEdit(m: MainMission) {
    setEditing(m);
    setFormData({
      name: m.name,
      description: m.description,
      total_games: m.total_games,
      completed_games: m.completed_games,
      target_date: m.target_date,
    });
    setModalOpen(true);
  }

  async function save() {
    if (!formData.name.trim()) return;
    const data = { ...formData, updated_at: new Date().toISOString() };
    if (editing) {
      await window.api.db.update('main_missions', editing.id, data);
    } else {
      await window.api.db.insert('main_missions', {
        id: generateId(),
        ...data,
        created_at: new Date().toISOString(),
      });
    }
    setModalOpen(false);
    loadMissions();
  }

  async function deleteMission() {
    if (!deleteTarget) return;
    await window.api.db.delete('main_missions', deleteTarget.id);
    setDeleteTarget(null);
    loadMissions();
  }

  async function syncFromGames(mission: MainMission) {
    // Count games marked with mission_complete
    const result = await window.api.db.queryOne(
      'SELECT COUNT(*) as count FROM completed_games WHERE mission_complete = 1'
    );
    const completedCount = result?.count || 0;
    await window.api.db.update('main_missions', mission.id, {
      completed_games: completedCount,
      updated_at: new Date().toISOString(),
    });
    loadMissions();
  }

  return (
    <div className="p-6 flex flex-col h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-2">
            <Target size={24} className="text-red-400" />
            Missões
          </h1>
          <p className="text-sm text-dark-400 mt-1">Defina metas de jogos para cumprir</p>
        </div>
        <button onClick={openAdd} className="btn-primary flex items-center gap-2">
          <Plus size={16} /> Nova Missão
        </button>
      </div>

      <div className="flex-1 overflow-auto space-y-4">
        {missions.map(m => {
          const pct = m.total_games > 0 ? Math.round((m.completed_games / m.total_games) * 100) : 0;
          const isComplete = pct >= 100;
          return (
            <div key={m.id} className="stat-card">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    {isComplete ? (
                      <Trophy size={20} className="text-yellow-400" />
                    ) : (
                      <Target size={20} className="text-red-400" />
                    )}
                    <h3 className={`text-lg font-semibold ${isComplete ? 'text-yellow-400' : 'text-dark-100'}`}>
                      {m.name}
                    </h3>
                  </div>
                  {m.description && (
                    <p className="text-sm text-dark-400 mt-1 ml-7">{m.description}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => syncFromGames(m)} className="p-1.5 rounded hover:bg-dark-600 transition-colors" title="Sincronizar com jogos zerados">
                    <Trophy size={14} className="text-dark-400 hover:text-green-400" />
                  </button>
                  <button onClick={() => openEdit(m)} className="p-1.5 rounded hover:bg-dark-600 transition-colors">
                    <Edit3 size={14} className="text-dark-400 hover:text-accent-400" />
                  </button>
                  <button onClick={() => setDeleteTarget(m)} className="p-1.5 rounded hover:bg-dark-600 transition-colors">
                    <Trash2 size={14} className="text-dark-400 hover:text-red-400" />
                  </button>
                </div>
              </div>

              <div className="mt-4 ml-7">
                <div className="flex items-center gap-4 mb-2">
                  <span className="text-sm text-dark-300">
                    {m.completed_games} / {m.total_games} jogos
                  </span>
                  <span className={`text-sm font-bold ${isComplete ? 'text-yellow-400' : 'text-accent-400'}`}>
                    {pct}%
                  </span>
                  {m.target_date && (
                    <span className="text-xs text-dark-500 flex items-center gap-1">
                      <Calendar size={12} /> Meta: {formatDateBR(m.target_date)}
                    </span>
                  )}
                </div>
                <div className="w-full h-3 bg-dark-700 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${isComplete ? 'bg-yellow-500' : 'bg-accent-500'}`}
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {missions.length === 0 && (
          <div className="text-center text-dark-400 py-12">
            <Target size={48} className="mx-auto mb-3 text-dark-600" />
            <p>Nenhuma missão criada</p>
            <p className="text-xs mt-1">Crie uma missão para rastrear quantos jogos você quer zerar!</p>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editing ? 'Editar Missão' : 'Nova Missão'} width="max-w-lg">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Nome da Missão</label>
            <input
              type="text"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="input-field"
              placeholder="Ex: Zerar 100 jogos em 2026"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Descrição</label>
            <textarea
              value={formData.description}
              onChange={e => setFormData({ ...formData, description: e.target.value })}
              className="input-field"
              rows={2}
              placeholder="Descrição opcional..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1">Total de Jogos (Meta)</label>
              <input
                type="number"
                value={formData.total_games}
                onChange={e => setFormData({ ...formData, total_games: Number(e.target.value) })}
                className="input-field"
                min={0}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-dark-300 mb-1">Jogos Concluídos</label>
              <input
                type="number"
                value={formData.completed_games}
                onChange={e => setFormData({ ...formData, completed_games: Number(e.target.value) })}
                className="input-field"
                min={0}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-dark-300 mb-1">Data Limite</label>
            <input
              type="date"
              value={formData.target_date}
              onChange={e => setFormData({ ...formData, target_date: e.target.value })}
              className="input-field"
            />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={() => setModalOpen(false)} className="btn-secondary">Cancelar</button>
          <button onClick={save} className="btn-primary">{editing ? 'Salvar' : 'Criar Missão'}</button>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={deleteMission}
        title="Excluir Missão"
        message={`Tem certeza que deseja excluir "${deleteTarget?.name}"?`}
      />
    </div>
  );
}
