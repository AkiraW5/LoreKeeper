import React, { useEffect, useMemo, useState } from 'react';
import { Flame, CalendarDays, Activity, Star } from 'lucide-react';

const MONTH_ABBR = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function parseDateSafe(raw: any): Date | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (br) {
    const d2 = new Date(`${br[3]}-${br[2]}-${br[1]}`);
    if (!Number.isNaN(d2.getTime())) return d2;
  }
  return null;
}

const keyOf = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

function levelClass(count: number): string {
  if (count <= 0) return 'bg-dark-700/40';
  if (count === 1) return 'bg-green-500/30';
  if (count === 2) return 'bg-green-500/55';
  if (count <= 4) return 'bg-green-500/80';
  return 'bg-green-400';
}

export default function ActivityHeatmap() {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [counts, setCounts] = useState<Map<string, number>>(new Map());

  useEffect(() => { load(); }, []);

  async function load() {
    const db = window.api.db;
    const [games, movies, shows, anime, manga, books] = await Promise.all([
      db.query('SELECT completion_date AS d FROM completed_games'),
      db.query('SELECT watch_date AS d FROM movies'),
      db.query("SELECT end_date AS d FROM tv_shows WHERE status = 'Concluído'"),
      db.query("SELECT end_date AS d FROM animes WHERE status = 'Concluído'"),
      db.query("SELECT end_date AS d FROM manga WHERE status = 'Concluído'"),
      db.query("SELECT end_date AS d FROM books WHERE status = 'Concluído'"),
    ]);
    const map = new Map<string, number>();
    for (const row of [...games, ...movies, ...shows, ...anime, ...manga, ...books]) {
      const d = parseDateSafe((row as any).d);
      if (!d) continue;
      const k = keyOf(d);
      map.set(k, (map.get(k) || 0) + 1);
    }
    setCounts(map);
  }

  const { weeks, total, activeDays, bestStreak, favWeekday } = useMemo(() => {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);

    // grade alinhada a domingo
    const cursor = new Date(start);
    cursor.setDate(start.getDate() - start.getDay());
    const result: ({ date: Date; count: number } | null)[][] = [];
    while (cursor <= end) {
      const week: ({ date: Date; count: number } | null)[] = [];
      for (let i = 0; i < 7; i++) {
        if (cursor.getFullYear() === year) {
          week.push({ date: new Date(cursor), count: counts.get(keyOf(cursor)) || 0 });
        } else week.push(null);
        cursor.setDate(cursor.getDate() + 1);
      }
      result.push(week);
    }

    // estatísticas percorrendo todos os dias do ano
    let sum = 0, active = 0, streak = 0, best = 0;
    const weekdayTally = new Array(7).fill(0);
    const day = new Date(start);
    while (day <= end) {
      const c = counts.get(keyOf(day)) || 0;
      sum += c;
      if (c > 0) { active++; streak++; best = Math.max(best, streak); weekdayTally[day.getDay()] += c; }
      else streak = 0;
      day.setDate(day.getDate() + 1);
    }
    let favIdx = -1, favN = 0;
    weekdayTally.forEach((n, i) => { if (n > favN) { favN = n; favIdx = i; } });

    return { weeks: result, total: sum, activeDays: active, bestStreak: best, favWeekday: favIdx >= 0 ? WEEKDAYS[favIdx] : '—' };
  }, [year, counts]);

  const monthLabels = useMemo(() => {
    const labels: { col: number; label: string }[] = [];
    let last = -1;
    weeks.forEach((week, col) => {
      const first = week.find(c => c !== null);
      if (first) { const m = first.date.getMonth(); if (m !== last) { labels.push({ col, label: MONTH_ABBR[m] }); last = m; } }
    });
    return labels;
  }, [weeks]);

  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  return (
    <section className="rounded-3xl border border-dark-700/60 bg-dark-900/70 p-6 relative overflow-hidden">
      <div className="absolute -top-16 -right-10 w-48 h-48 rounded-full bg-green-500/5 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-dark-400">Mapa de Atividade</p>
            <h2 className="mt-1 text-xl font-bold text-dark-100">Sua consistência em {year}</h2>
          </div>
          <select value={year} onChange={e => setYear(parseInt(e.target.value))} className="select-field w-24 text-xs py-1.5">
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {/* stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
          <StatChip icon={<Activity size={15} />} color="text-green-400" value={total} label="conclusões" />
          <StatChip icon={<CalendarDays size={15} />} color="text-accent-400" value={activeDays} label="dias ativos" />
          <StatChip icon={<Flame size={15} />} color="text-orange-400" value={bestStreak} label="melhor sequência" />
          <StatChip icon={<Star size={15} />} color="text-yellow-400" value={favWeekday} label="dia favorito" />
        </div>

        <div className="overflow-x-auto pb-1">
          <div className="inline-block">
            <div className="flex gap-[3px] mb-1 ml-[30px]">
              {weeks.map((_, col) => {
                const label = monthLabels.find(m => m.col === col);
                return (
                  <div key={col} className="w-[12px] text-[9px] text-dark-500 relative">
                    {label && <span className="absolute left-0 -top-0.5 whitespace-nowrap">{label.label}</span>}
                  </div>
                );
              })}
            </div>
            <div className="flex">
              <div className="flex flex-col gap-[3px] mr-1.5 text-[9px] text-dark-500">
                {['', 'Seg', '', 'Qua', '', 'Sex', ''].map((d, i) => (
                  <div key={i} className="h-[12px] leading-[12px]">{d}</div>
                ))}
              </div>
              <div className="flex gap-[3px]">
                {weeks.map((week, col) => (
                  <div key={col} className="flex flex-col gap-[3px]">
                    {week.map((cell, row) => (
                      <div
                        key={row}
                        className={`w-[12px] h-[12px] rounded-[3px] transition-colors hover:ring-1 hover:ring-green-400/60 ${cell ? levelClass(cell.count) : 'bg-transparent'}`}
                        title={cell ? `${cell.date.toLocaleDateString('pt-BR')} • ${cell.count} ${cell.count === 1 ? 'conclusão' : 'conclusões'}` : ''}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-1.5 mt-2 text-[9px] text-dark-500">
              <span>menos</span>
              {['bg-dark-700/40', 'bg-green-500/30', 'bg-green-500/55', 'bg-green-500/80', 'bg-green-400'].map(c => (
                <div key={c} className={`w-[12px] h-[12px] rounded-[3px] ${c}`} />
              ))}
              <span>mais</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatChip({ icon, color, value, label }: { icon: React.ReactNode; color: string; value: React.ReactNode; label: string }) {
  return (
    <div className="rounded-2xl border border-dark-700/50 bg-dark-800/50 px-3 py-2.5 flex items-center gap-3">
      <span className={color}>{icon}</span>
      <div className="leading-tight min-w-0">
        <p className="text-lg font-bold text-dark-100 truncate">{value}</p>
        <p className="text-[10px] text-dark-400">{label}</p>
      </div>
    </div>
  );
}
