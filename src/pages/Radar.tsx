import React, { useEffect, useMemo, useState } from 'react';
import {
  Radar as RadarIcon, Heart, Gamepad2, Swords, Star, Gauge, Clock, Compass,
  Telescope, TrendingUp, Trophy, Hourglass, Zap, Crown, RotateCcw, CalendarRange,
} from 'lucide-react';
import { GAME_GENRES } from '../types';
import { parseTimeToSeconds } from '../lib/utils';

function parseDateSafe(raw: any): Date | null {
  const s = String(raw || '').trim();
  if (!s) return null;
  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) return d;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s);
  if (br) { const d2 = new Date(`${br[3]}-${br[2]}-${br[1]}`); if (!Number.isNaN(d2.getTime())) return d2; }
  return null;
}

interface Card {
  icon: React.ReactNode;
  color: string;
  title: string;
  value?: string;
  message: string;
}

interface RadarData {
  profile: Card[];
  suggestions: Card[];
  facts: Card[];
  hasGames: boolean;
}

function build(games: any[], backlog: any[]): RadarData {
  const now = Date.now();
  const monthsAgo = (t: number) => Math.floor((now - t) / (30 * 86400000));
  const total = games.length;

  const genreStat = new Map<string, { count: number; last: number }>();
  const platStat = new Map<string, { count: number; last: number; ratingSum: number; ratingN: number }>();
  const recentGenre = new Map<string, number>();
  const months = new Set<string>();
  const yearCount = new Map<number, number>();
  let aaaCount = 0, ratingSum = 0, ratingN = 0, maxRating = 0, totalSeconds = 0;
  let longest: { name: string; sec: number } | null = null;
  let fastest: { name: string; sec: number } | null = null;

  for (const g of games) {
    const d = parseDateSafe(g.completion_date);
    const t = d ? d.getTime() : 0;
    const ge = String(g.genre || '').trim();
    const pl = String(g.console || '').trim();
    const rating = Number(g.rating) || 0;
    const sec = parseTimeToSeconds(g.play_time);
    totalSeconds += sec;

    if (ge) {
      const s = genreStat.get(ge) || { count: 0, last: 0 };
      s.count++; s.last = Math.max(s.last, t); genreStat.set(ge, s);
      if (t && now - t < 90 * 86400000) recentGenre.set(ge, (recentGenre.get(ge) || 0) + 1);
    }
    if (pl) {
      const s = platStat.get(pl) || { count: 0, last: 0, ratingSum: 0, ratingN: 0 };
      s.count++; s.last = Math.max(s.last, t);
      if (rating > 0) { s.ratingSum += rating; s.ratingN++; }
      platStat.set(pl, s);
    }
    if (d) { months.add(`${d.getFullYear()}-${d.getMonth()}`); yearCount.set(d.getFullYear(), (yearCount.get(d.getFullYear()) || 0) + 1); }
    if (String(g.difficulty || '').toUpperCase() === 'AAA' || String(g.difficulty || '').toUpperCase() === 'AA') aaaCount++;
    if (rating > 0) { ratingSum += rating; ratingN++; maxRating = Math.max(maxRating, rating); }
    if (sec > 0) {
      if (!longest || sec > longest.sec) longest = { name: g.name, sec };
      if (!fastest || sec < fastest.sec) fastest = { name: g.name, sec };
    }
  }

  const favG = [...genreStat.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  const favP = [...platStat.entries()].sort((a, b) => b[1].count - a[1].count)[0];
  const avgRating = ratingN ? ratingSum / ratingN : 0;
  const totalHours = totalSeconds / 3600;
  const avgHours = total ? totalHours / total : 0;
  const pace = months.size ? total / months.size : 0;
  const aaaPct = total ? Math.round((aaaCount / total) * 100) : 0;
  const hours11 = games.filter((g: any) => Number(g.rating) === 11).length;

  const fmtH = (sec: number) => `${Math.round(sec / 3600)}h`;

  // ---------- PERFIL ----------
  const profile: Card[] = [];
  if (favG) profile.push({ icon: <Heart size={18} />, color: '#ec4899', title: 'Gênero favorito', value: favG[0], message: `${favG[1].count} jogos (${Math.round(favG[1].count / total * 100)}% do total).` });
  if (favP) profile.push({ icon: <Gamepad2 size={18} />, color: '#22c55e', title: 'Plataforma da casa', value: favP[0], message: `${favP[1].count} jogos zerados aqui.` });
  if (total > 0) profile.push({ icon: <Swords size={18} />, color: '#ef4444', title: 'Perfil de dificuldade', value: `${aaaPct}%`, message: aaaPct >= 40 ? 'Você vive no hard mode — AA/AAA dominam.' : aaaPct >= 15 ? 'Curte um desafio na medida certa.' : 'Prefere uma jornada mais tranquila.' });
  if (ratingN > 0) profile.push({ icon: <Star size={18} />, color: '#eab308', title: 'Como você avalia', value: avgRating.toFixed(1), message: avgRating >= 8.5 ? 'Coração mole: você é generoso com as notas.' : avgRating >= 6.5 ? 'Crítico equilibrado.' : 'Exigente — difícil te impressionar.' });
  if (total > 0) profile.push({ icon: <Gauge size={18} />, color: '#3b82f6', title: 'Seu ritmo', value: `${pace.toFixed(1)}/mês`, message: `Cerca de ${pace.toFixed(1)} jogos por mês ativo.` });
  if (total > 0) profile.push({ icon: <Hourglass size={18} />, color: '#a855f7', title: 'Tipo de jogador', value: avgHours >= 40 ? 'Maratonista' : avgHours >= 15 ? 'Equilibrado' : 'Direto ao ponto', message: `Média de ${avgHours.toFixed(0)}h por jogo.` });

  // ---------- SUGESTÕES ----------
  const suggestions: Card[] = [];
  const neglP = [...platStat.entries()].filter(([, s]) => s.count >= 2 && s.last > 0).sort((a, b) => a[1].last - b[1].last)[0];
  if (neglP && monthsAgo(neglP[1].last) >= 3) suggestions.push({ icon: <Clock size={18} />, color: '#3b82f6', title: 'Bate uma saudade?', message: `Faz ${monthsAgo(neglP[1].last)} meses que você não zera nada no ${neglP[0]}. Que tal voltar?` });

  const neglG = [...genreStat.entries()].filter(([, s]) => s.count >= 2 && s.last > 0).sort((a, b) => a[1].last - b[1].last)[0];
  if (neglG && monthsAgo(neglG[1].last) >= 4 && (!favG || neglG[0] !== favG[0])) suggestions.push({ icon: <RotateCcw size={18} />, color: '#a855f7', title: 'Resgate um gênero', message: `Seu último ${neglG[0]} foi há ${monthsAgo(neglG[1].last)} meses. Bora revisitar?` });

  const hot = [...recentGenre.entries()].sort((a, b) => b[1] - a[1])[0];
  if (hot && hot[1] >= 2) suggestions.push({ icon: <TrendingUp size={18} />, color: '#f59e0b', title: 'Sua fase atual', message: `Você tá numa vibe ${hot[0]}: ${hot[1]} zerados nos últimos 3 meses. Aproveite o embalo!` });

  const unexplored = GAME_GENRES.filter(g => !genreStat.has(g));
  if (unexplored.length) suggestions.push({ icon: <Telescope size={18} />, color: '#06b6d4', title: 'Território inexplorado', message: `Você nunca zerou um jogo de ${unexplored[0]}${unexplored[1] ? ` ou ${unexplored[1]}` : ''}. Topa o desafio?` });

  const comeback = [...backlog].filter((b: any) => !b.currently_playing).sort((a: any, b: any) => (Number(b.desire_level) || 0) - (Number(a.desire_level) || 0))[0];
  if (comeback) suggestions.push({ icon: <Zap size={18} />, color: '#22c55e', title: 'Tá te esperando', message: `"${comeback.name}" tá no backlog com vontade ${comeback.desire_level || '?'}/5. Hora de começar?` });

  // ---------- CURIOSIDADES ----------
  const facts: Card[] = [];
  if (longest) facts.push({ icon: <Hourglass size={18} />, color: '#8b5cf6', title: 'Sua maratona', value: fmtH(longest.sec), message: `${longest.name} foi seu jogo mais longo.` });
  if (fastest && (!longest || fastest.name !== longest.name)) facts.push({ icon: <Zap size={18} />, color: '#06b6d4', title: 'Rapidinho', value: fmtH(fastest.sec), message: `${fastest.name} foi o mais curto que você zerou.` });
  const bestYear = [...yearCount.entries()].sort((a, b) => b[1] - a[1])[0];
  if (bestYear) facts.push({ icon: <CalendarRange size={18} />, color: '#f59e0b', title: 'Seu melhor ano', value: String(bestYear[0]), message: `${bestYear[1]} jogos zerados — seu recorde anual.` });
  if (hours11 > 0) facts.push({ icon: <Crown size={18} />, color: '#eab308', title: 'Jogos da vida', value: String(hours11), message: `${hours11} ${hours11 === 1 ? 'jogo recebeu' : 'jogos receberam'} sua nota máxima (11).` });
  const bestPlat = [...platStat.entries()].filter(([, s]) => s.ratingN >= 3).map(([k, s]) => ({ k, avg: s.ratingSum / s.ratingN })).sort((a, b) => b.avg - a.avg)[0];
  if (bestPlat) facts.push({ icon: <Trophy size={18} />, color: '#22c55e', title: 'Plataforma mais querida', value: bestPlat.k, message: `Maior nota média: ${bestPlat.avg.toFixed(1)}/11.` });
  if (totalHours > 24) facts.push({ icon: <Clock size={18} />, color: '#3b82f6', title: 'Tempo de vida investido', value: `${Math.round(totalHours)}h`, message: `Equivale a cerca de ${Math.round(totalHours / 24)} dias inteiros de jogo.` });

  return { profile, suggestions, facts, hasGames: total > 0 };
}

function CardGrid({ cards }: { cards: Card[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
      {cards.map((c, i) => (
        <div key={i} className="rounded-2xl border p-4 flex items-start gap-3.5 relative overflow-hidden transition-all hover:shadow-lg"
          style={{ borderColor: `${c.color}33`, background: `linear-gradient(135deg, ${c.color}14, transparent 72%)` }}>
          <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${c.color}22`, color: c.color }}>
            {c.icon}
          </div>
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-dark-400">{c.title}</p>
            {c.value && <p className="text-lg font-black text-dark-100 leading-tight mt-0.5 truncate">{c.value}</p>}
            <p className="text-xs text-dark-400 mt-0.5 leading-relaxed">{c.message}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function RadarPage() {
  const [data, setData] = useState<RadarData | null>(null);

  useEffect(() => { load(); }, []);

  async function load() {
    const [games, backlog] = await Promise.all([
      window.api.db.query('SELECT name, completion_date, play_time, rating, console, genre, difficulty, is_gold FROM completed_games'),
      window.api.db.getAll('game_backlog', 'created_at DESC'),
    ]);
    setData(build(games, backlog));
  }

  const sections = useMemo(() => data ? [
    { key: 'profile', label: 'Seu Perfil', icon: <Gauge size={16} />, desc: 'quem você é como jogador', cards: data.profile },
    { key: 'suggestions', label: 'Sugestões', icon: <Compass size={16} />, desc: 'o que tentar a seguir', cards: data.suggestions },
    { key: 'facts', label: 'Curiosidades', icon: <Star size={16} />, desc: 'fatos do seu histórico', cards: data.facts },
  ] : [], [data]);

  return (
    <div className="p-6 h-full overflow-y-auto space-y-6">
      <section className="rounded-3xl border border-dark-700/60 bg-dark-900/70 p-6 relative overflow-hidden">
        <div className="absolute -top-20 -right-16 w-56 h-56 rounded-full bg-accent-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-12 w-56 h-56 rounded-full bg-pink-500/10 blur-3xl pointer-events-none" />
        <div className="relative">
          <p className="text-xs uppercase tracking-[0.25em] text-dark-400 flex items-center gap-2"><RadarIcon size={13} /> Radar de Hábitos</p>
          <h1 className="mt-2 text-2xl md:text-3xl font-bold text-dark-100">Quem você é <span className="text-gradient">jogando</span>.</h1>
          <p className="mt-2 text-dark-300 text-sm">Leituras do seu histórico: gostos, padrões e ideias do que encarar a seguir.</p>
        </div>
      </section>

      {data && !data.hasGames && (
        <div className="text-center text-dark-400 py-16">
          <RadarIcon size={48} className="mx-auto mb-3 text-dark-600" />
          <p>Ainda não há jogos zerados para analisar.</p>
          <p className="text-xs mt-1">Registre alguns jogos e o radar começa a te conhecer.</p>
        </div>
      )}

      {sections.filter(s => s.cards.length > 0).map(s => (
        <section key={s.key}>
          <div className="flex items-center gap-2 mb-3">
            <span className="text-accent-400">{s.icon}</span>
            <h2 className="text-sm font-semibold text-dark-200">{s.label}</h2>
            <span className="text-xs text-dark-500">— {s.desc}</span>
          </div>
          <CardGrid cards={s.cards} />
        </section>
      ))}
    </div>
  );
}
