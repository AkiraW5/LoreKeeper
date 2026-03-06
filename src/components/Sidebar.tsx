import React from 'react';
import {
  LayoutDashboard,
  Gamepad2,
  ListTodo,
  Layers,
  Target,
  Trophy,
  Film,
  Tv,
  Play,
  BookOpen,
  Library,
  Settings,
} from 'lucide-react';
import { MediaSection } from '../types';

interface SidebarProps {
  activeSection: MediaSection;
  onSectionChange: (section: MediaSection) => void;
}

interface NavItem {
  id: MediaSection;
  label: string;
  icon: React.ReactNode;
  group: string;
}

const navItems: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} />, group: 'Geral' },
  { id: 'games-completed', label: 'Jogos Zerados', icon: <Gamepad2 size={18} />, group: 'Jogos' },
  { id: 'games-backlog', label: 'Backlog', icon: <ListTodo size={18} />, group: 'Jogos' },
  { id: 'games-series', label: 'Séries de Jogos', icon: <Layers size={18} />, group: 'Jogos' },
  { id: 'missions', label: 'Missões', icon: <Target size={18} />, group: 'Jogos' },
  { id: 'movies', label: 'Filmes', icon: <Film size={18} />, group: 'Mídia' },
  { id: 'tv-shows', label: 'Séries', icon: <Tv size={18} />, group: 'Mídia' },
  { id: 'anime', label: 'Animes', icon: <Play size={18} />, group: 'Mídia' },
  { id: 'manga', label: 'Mangás', icon: <BookOpen size={18} />, group: 'Mídia' },
  { id: 'books', label: 'Livros', icon: <Library size={18} />, group: 'Mídia' },
  { id: 'achievements', label: 'Conquistas', icon: <Trophy size={18} />, group: 'Sistema' },
  { id: 'settings', label: 'Configurações', icon: <Settings size={18} />, group: 'Sistema' },
];

export default function Sidebar({ activeSection, onSectionChange }: SidebarProps) {
  const groups = [...new Set(navItems.map(i => i.group))];

  return (
    <aside className="w-56 bg-dark-900/80 border-r border-dark-700/50 flex flex-col shrink-0">
      {/* Logo */}
      <div className="p-5 pb-3">
        <h1 className="text-lg font-bold text-gradient">LoreKeeper</h1>
        <p className="text-xs text-dark-400 mt-0.5">Rastreador de mídias</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-2 space-y-4 overflow-y-auto">
        {groups.map(group => (
          <div key={group}>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-dark-400 px-3 mb-1.5">
              {group}
            </p>
            <div className="space-y-0.5">
              {navItems
                .filter(i => i.group === group)
                .map(item => (
                  <button
                    key={item.id}
                    onClick={() => onSectionChange(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      ${
                        activeSection === item.id
                          ? 'bg-accent-500/15 text-accent-400 shadow-sm'
                          : 'text-dark-300 hover:text-dark-100 hover:bg-dark-700/50'
                      }`}
                  >
                    <span className={activeSection === item.id ? 'text-accent-400' : 'text-dark-400'}>
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-dark-700/50">
        <p className="text-[10px] text-dark-500 text-center">v1.0.0 • Feito com ♥</p>
      </div>
    </aside>
  );
}
