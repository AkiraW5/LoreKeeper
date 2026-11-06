import React, { useEffect, useState } from 'react';
import { Trophy } from 'lucide-react';
import { Achievement } from '../types';
import { getAchievementRarity, rarityMeta, TrophyRarity } from '../lib/achievements';

export const SOUND_KEY = 'lk:achievementSound';
const SHOW_MS = 5000;

const RARITY_STYLE: Record<TrophyRarity, { ring: string; glow: string; bar: string }> = {
  bronze: { ring: 'border-amber-600/50', glow: 'shadow-amber-600/20', bar: 'from-amber-700 to-amber-400' },
  silver: { ring: 'border-slate-300/50', glow: 'shadow-slate-300/20', bar: 'from-slate-500 to-slate-200' },
  gold: { ring: 'border-yellow-400/60', glow: 'shadow-yellow-400/25', bar: 'from-yellow-600 to-yellow-300' },
  platinum: { ring: 'border-cyan-300/60', glow: 'shadow-cyan-300/25', bar: 'from-cyan-600 to-cyan-200' },
};

// Arpejo curto gerado na hora (sem arquivo de áudio); raridades maiores ganham mais notas.
const NOTES: Record<TrophyRarity, number[]> = {
  bronze: [659.25, 987.77],
  silver: [587.33, 880, 1174.66],
  gold: [523.25, 783.99, 1046.5, 1567.98],
  platinum: [523.25, 659.25, 783.99, 1046.5, 1567.98],
};

let audio: AudioContext | null = null;

function playChime(rarity: TrophyRarity) {
  if (localStorage.getItem(SOUND_KEY) === 'off') return;
  try {
    audio ??= new AudioContext();
    const now = audio.currentTime;
    NOTES[rarity].forEach((freq, i) => {
      const t = now + i * 0.09;
      const osc = audio!.createOscillator();
      const gain = audio!.createGain();
      osc.type = i === NOTES[rarity].length - 1 ? 'sine' : 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.12, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      osc.connect(gain).connect(audio!.destination);
      osc.start(t);
      osc.stop(t + 0.95);
    });
  } catch { /* sem áudio disponível */ }
}

export default function AchievementToast({ onOpen }: { onOpen: () => void }) {
  const [queue, setQueue] = useState<Achievement[]>([]);
  const current = queue[0];

  useEffect(() => {
    const onUnlocked = (e: Event) => setQueue(q => [...q, ...(e as CustomEvent<Achievement[]>).detail]);
    window.addEventListener('achievements:unlocked', onUnlocked);
    return () => window.removeEventListener('achievements:unlocked', onUnlocked);
  }, []);

  useEffect(() => {
    if (!current) return;
    playChime(getAchievementRarity(current));
    const t = setTimeout(() => setQueue(q => q.slice(1)), SHOW_MS);
    return () => clearTimeout(t);
  }, [current]);

  if (!current) return null;

  const rarity = getAchievementRarity(current);
  const meta = rarityMeta(rarity);
  const style = RARITY_STYLE[rarity];

  return (
    <div className="fixed top-14 right-5 z-50 w-80" role="status" aria-live="polite">
      <button
        key={current.id}
        onClick={() => { setQueue([]); onOpen(); }}
        className={`toast-in relative w-full overflow-hidden rounded-xl border ${style.ring} bg-dark-800/95 backdrop-blur-md shadow-2xl ${style.glow} text-left`}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/10 via-transparent to-transparent" />
        <div className="relative flex items-center gap-3 p-3.5">
          <div className={`achievement-pop w-12 h-12 shrink-0 rounded-xl border ${style.ring} bg-dark-900/70 flex items-center justify-center text-2xl`}>
            {current.icon}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] uppercase tracking-[0.2em] text-yellow-300/90 flex items-center gap-1">
              <Trophy size={10} /> Conquista desbloqueada
              {queue.length > 1 && <span className="tracking-normal normal-case text-dark-400">· +{queue.length - 1}</span>}
            </p>
            <p className="text-sm font-semibold text-dark-50 truncate">{current.name}</p>
            <p className="text-[11px] text-dark-400 truncate">{current.description}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-xs font-bold text-gradient">+{current.xp} XP</p>
            <p className="text-[10px] text-dark-400">{meta.emoji} {meta.label}</p>
          </div>
        </div>
        <div className="h-0.5 bg-dark-700">
          <div
            className={`h-full bg-gradient-to-r ${style.bar}`}
            style={{ animation: `toast-progress ${SHOW_MS}ms linear forwards` }}
          />
        </div>
      </button>
    </div>
  );
}
