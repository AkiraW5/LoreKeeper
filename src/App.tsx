import React, { useState } from 'react';
import TitleBar from './components/TitleBar';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import CompletedGamesPage from './pages/CompletedGames';
import GameBacklogPage from './pages/GameBacklog';
import GameSeriesPage from './pages/GameSeries';
import MoviesPage from './pages/Movies';
import TvShowsPage from './pages/TvShows';
import AnimePage from './pages/Anime';
import MangaPage from './pages/MangaPage';
import BooksPage from './pages/BooksPage';
import MissionsPage from './pages/Missions';
import AchievementsPage from './pages/Achievements';
import SettingsPage from './pages/Settings';
import { MediaSection } from './types';

export default function App() {
  const [activeSection, setActiveSection] = useState<MediaSection>('dashboard');

  function renderContent() {
    switch (activeSection) {
      case 'dashboard': return <Dashboard />;
      case 'games-completed': return <CompletedGamesPage />;
      case 'games-backlog': return <GameBacklogPage />;
      case 'games-series': return <GameSeriesPage />;
      case 'movies': return <MoviesPage />;
      case 'tv-shows': return <TvShowsPage />;
      case 'anime': return <AnimePage />;
      case 'manga': return <MangaPage />;
      case 'books': return <BooksPage />;
      case 'missions': return <MissionsPage />;
      case 'achievements': return <AchievementsPage />;
      case 'settings': return <SettingsPage />;
      default: return <Dashboard />;
    }
  }

  return (
    <div className="h-screen flex flex-col bg-dark-950">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activeSection={activeSection} onSectionChange={setActiveSection} />
        <main className="flex-1 overflow-hidden">
          {renderContent()}
        </main>
      </div>
    </div>
  );
}
