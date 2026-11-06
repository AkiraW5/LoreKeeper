import React, { useEffect, useState } from 'react';
import { Trophy, Star, Zap, Lock } from 'lucide-react';
import { Achievement, UserProfile } from '../types';
import { checkAchievements as runAchievementCheck, getLevelFromXp, getAchievementRarity, rarityMeta } from '../lib/achievements';

function getLevelTitle(level: number): string {
  if (level >= 50) return 'Deus Gamer';
  if (level >= 40) return 'Lenda Viva';
  if (level >= 30) return 'Mestre';
  if (level >= 20) return 'Veterano';
  if (level >= 15) return 'Experiente';
  if (level >= 10) return 'Dedicado';
  if (level >= 5) return 'Iniciante';
  return 'Novato';
}

function formatTimeAgo(isoDate: string): string {
  const diffMs = Date.now() - new Date(isoDate).getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `há ${days} dia${days > 1 ? 's' : ''}`;
  const months = Math.floor(days / 30);
  return `há ${months} mês${months > 1 ? 'es' : ''}`;
}

export default function AchievementsPage() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [checking, setChecking] = useState(false);
  const [recentlyUnlockedIds, setRecentlyUnlockedIds] = useState<Set<string>>(new Set());
  const [progress, setProgress] = useState<Record<string, { current: number; target: number }>>({});

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      await loadData();
      if (!cancelled) {
        checkAchievements();
      }
    };

    bootstrap();

    return () => {
      cancelled = true;
    };
  }, []);

  async function loadData() {
    const [achs, prof] = await Promise.all([
      window.api.db.getAll('achievements', 'unlocked_at IS NULL, name ASC'),
      window.api.db.queryOne('SELECT * FROM user_profile WHERE id = 1'),
    ]);
    setAchievements(achs);
    setProfile(prof);
  }

  async function checkAchievements() {
    if (checking) return;
    setChecking(true);
    try {
      const { unlocked, progress } = await runAchievementCheck();
      setProgress(progress);
      await loadData();
      if (unlocked.length > 0) {
        setRecentlyUnlockedIds(new Set(unlocked.map(a => a.id)));
        setTimeout(() => setRecentlyUnlockedIds(new Set()), 1800);
      }
    } catch (error) {
      console.error('Erro ao verificar conquistas:', error);
      // Keep UI populated even if auto-check fails.
      await loadData();
    } finally {
      setChecking(false);
    }
  }

  const unlocked = achievements.filter(a => a.unlocked_at);
  const ordered = [...achievements].sort((a, b) => {
    const rarityWeight = { platinum: 4, gold: 3, silver: 2, bronze: 1 } as const;
    const ra = rarityWeight[getAchievementRarity(a)];
    const rb = rarityWeight[getAchievementRarity(b)];
    if (ra !== rb) return rb - ra;
    if (!!a.unlocked_at !== !!b.unlocked_at) return a.unlocked_at ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  const platinumUnlocked = achievements.length > 0 && unlocked.length === achievements.length;
  const recentFeed = [...unlocked]
    .sort((a, b) => (b.unlocked_at || '').localeCompare(a.unlocked_at || ''))
    .slice(0, 8);

  const levelInfo = profile ? getLevelFromXp(profile.total_xp) : { level: 1, currentXp: 0, nextLevelXp: 100 };
  const levelPct = Math.round((levelInfo.currentXp / levelInfo.nextLevelXp) * 100);

  const nextToUnlock = achievements
    .filter(a => !a.unlocked_at && progress[a.key])
    .map(a => { const p = progress[a.key]; return { a, p, pct: p.target > 0 ? Math.min(100, (p.current / p.target) * 100) : 0 }; })
    .filter(x => x.pct > 0 && x.pct < 100)
    .sort((x, y) => y.pct - x.pct)
    .slice(0, 5);

  return (
    <div className="p-6 h-full overflow-y-auto">
      <div className="sticky top-0 z-20 pb-4 mb-4 bg-dark-950/85 backdrop-blur-md border-b border-dark-700/40">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-dark-100 flex items-center gap-2">
              <Trophy size={24} className="text-yellow-400" />
              Conquistas & Nível
            </h1>
            <p className="text-sm text-dark-400 mt-1">
              {unlocked.length}/{achievements.length} conquistas desbloqueadas
            </p>
          </div>
          <button
            onClick={checkAchievements}
            disabled={checking}
            className="btn-primary flex items-center gap-2"
          >
            <Zap size={16} />
            {checking ? 'Verificando...' : 'Verificar Conquistas'}
          </button>
        </div>

        <div className="rounded-2xl border border-dark-700/50 bg-dark-800/65 p-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gradient-to-br from-accent-500 to-cyan-500 flex items-center justify-center shrink-0">
              <span className="text-2xl font-black text-white">{levelInfo.level}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Star size={15} className="text-yellow-400" />
                <span className="text-base font-bold text-dark-100">{getLevelTitle(levelInfo.level)}</span>
              </div>
              <p className="text-xs text-dark-400 mb-2">
                XP total: {profile?.total_xp || 0} • Atual: {levelInfo.currentXp}/{levelInfo.nextLevelXp} • Falta {Math.max(0, levelInfo.nextLevelXp - levelInfo.currentXp)} XP
              </p>
              <div className="w-full h-3 bg-dark-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-accent-500 to-cyan-400 rounded-full transition-all duration-500"
                  style={{ width: `${levelPct}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4">
        <div className="xl:col-span-3">
          <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${rarityMeta('bronze').className}`}>{rarityMeta('bronze').emoji} Bronze</span>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${rarityMeta('silver').className}`}>{rarityMeta('silver').emoji} Prata</span>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${rarityMeta('gold').className}`}>{rarityMeta('gold').emoji} Ouro</span>
            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border ${rarityMeta('platinum').className}`}>{rarityMeta('platinum').emoji} Platina</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
            {ordered.map((a) => {
              const unlockedNow = recentlyUnlockedIds.has(a.id);
              const unlockedState = !!a.unlocked_at;
              const rarity = rarityMeta(getAchievementRarity(a));
              const prog = progress[a.key];
              const pct = prog && prog.target > 0 ? Math.min(100, (prog.current / prog.target) * 100) : 0;

              return (
                <article
                  key={a.id}
                  className={`relative rounded-xl border p-3 transition-all duration-300 ${
                    unlockedState
                      ? `bg-dark-800/70 ${rarity.className}`
                      : 'bg-dark-900/70 border-dark-700/70 opacity-85'
                  } ${unlockedNow ? 'achievement-pop shadow-xl shadow-yellow-500/20' : ''}`}
                  title={a.description}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`text-2xl ${unlockedState ? '' : 'grayscale brightness-50 opacity-40'}`}>{a.icon}</span>
                    <span className="text-[10px] text-dark-400 font-mono">+{a.xp}XP</span>
                  </div>

                  {!unlockedState && (
                    <div className="absolute inset-0 rounded-xl bg-black/25 flex items-center justify-center">
                      <Lock size={16} className="text-dark-300" />
                    </div>
                  )}

                  <p className={`text-xs font-semibold line-clamp-1 ${unlockedState ? 'text-dark-100' : 'text-dark-300'}`}>{a.name}</p>
                  <p className={`text-[10px] mt-1 line-clamp-2 ${unlockedState ? 'text-dark-300' : 'text-dark-500'}`}>
                    {a.description}
                  </p>

                  {!unlockedState && prog && (
                    <div className="mt-2">
                      <div className="flex justify-between text-[9px] text-dark-500 mb-0.5">
                        <span className="font-mono">{Math.min(prog.current, prog.target)}/{prog.target}</span>
                        <span>{Math.round(pct)}%</span>
                      </div>
                      <div className="h-1 bg-dark-700 rounded-full overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-accent-500 to-cyan-400 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}

                  <p className="text-[10px] mt-1.5">{rarity.emoji} {rarity.label}</p>
                </article>
              );
            })}

            <article
              className={`relative rounded-xl border p-3 transition-all duration-300 ${
                platinumUnlocked
                  ? `${rarityMeta('platinum').className} bg-dark-800/80`
                  : 'bg-dark-900/70 border-dark-700/70 opacity-85'
              }`}
              title="Desbloqueie todas as outras conquistas"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`text-2xl ${platinumUnlocked ? '' : 'grayscale brightness-50 opacity-40'}`}>💎</span>
                <span className="text-[10px] text-dark-400 font-mono">MAX</span>
              </div>
              {!platinumUnlocked && (
                <div className="absolute inset-0 rounded-xl bg-black/25 flex items-center justify-center">
                  <Lock size={16} className="text-dark-300" />
                </div>
              )}
              <p className={`text-xs font-semibold ${platinumUnlocked ? 'text-cyan-200' : 'text-dark-400'}`}>Platina do LoreKeeper</p>
              <p className={`text-[10px] mt-1 ${platinumUnlocked ? 'text-dark-300' : 'text-dark-500'}`}>{platinumUnlocked ? 'Você desbloqueou tudo.' : 'Desbloqueie todas as outras conquistas.'}</p>
              <p className="text-[10px] mt-1">💎 Platina</p>
            </article>
          </div>
        </div>

        <aside className="xl:col-span-1 space-y-4">
          {nextToUnlock.length > 0 && (
            <div className="rounded-xl border border-dark-700/60 bg-dark-900/65 p-4">
              <h2 className="text-sm font-semibold text-dark-200 mb-3 flex items-center gap-1.5">
                <Zap size={14} className="text-accent-400" /> Próximas a desbloquear
              </h2>
              <div className="space-y-3">
                {nextToUnlock.map(({ a, p, pct }) => (
                  <div key={a.id}>
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="text-xs text-dark-200 line-clamp-1 flex items-center gap-1.5">
                        <span>{a.icon}</span> {a.name}
                      </span>
                      <span className="text-[10px] text-dark-500 font-mono shrink-0">{Math.min(p.current, p.target)}/{p.target}</span>
                    </div>
                    <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-accent-500 to-cyan-400 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-xl border border-dark-700/60 bg-dark-900/65 p-4">
            <h2 className="text-sm font-semibold text-dark-200 mb-3">Atividade Recente</h2>
            <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
              {recentFeed.map((a) => (
                <div key={a.id} className="rounded-lg border border-dark-700/60 bg-dark-800/60 px-3 py-2">
                  <p className="text-xs text-dark-200 line-clamp-1">{a.icon} {a.name}</p>
                  <p className="text-[10px] text-dark-500 mt-0.5">{a.unlocked_at ? formatTimeAgo(a.unlocked_at) : ''}</p>
                </div>
              ))}
              {recentFeed.length === 0 && (
                <p className="text-xs text-dark-500">Nenhuma conquista recente.</p>
              )}
            </div>
            <div className="mt-3 pt-3 border-t border-dark-700/50 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-base font-bold text-accent-400">{unlocked.length}</p>
                <p className="text-[10px] text-dark-500">Conq.</p>
              </div>
              <div>
                <p className="text-base font-bold text-yellow-400">{profile?.total_xp || 0}</p>
                <p className="text-[10px] text-dark-500">XP</p>
              </div>
              <div>
                <p className="text-base font-bold text-green-400">{levelInfo.level}</p>
                <p className="text-[10px] text-dark-500">Nível</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
