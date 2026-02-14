import { v4 as uuidv4 } from 'uuid';
import { format, parse } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function generateId(): string {
  return uuidv4();
}

export function formatDateBR(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return format(date, 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return dateStr;
  }
}

export function parseDateBR(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    return dateStr;
  } catch {
    return dateStr;
  }
}

export function formatTime(timeStr: string): string {
  if (!timeStr) return '0:00:00';
  return timeStr;
}

export function parseTimeToSeconds(timeStr: string): number {
  if (!timeStr) return 0;
  const parts = timeStr.split(':').map(Number);
  if (parts.length === 3) {
    return parts[0] * 3600 + parts[1] * 60 + parts[2];
  }
  if (parts.length === 2) {
    return parts[0] * 3600 + parts[1] * 60;
  }
  return 0;
}

export function secondsToTimeStr(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getRatingColor(rating: number): string {
  if (rating >= 10) return 'text-yellow-400';
  if (rating >= 9) return 'text-green-400';
  if (rating >= 8) return 'text-blue-400';
  if (rating >= 7) return 'text-cyan-400';
  if (rating >= 6) return 'text-gray-300';
  if (rating >= 5) return 'text-gray-400';
  if (rating >= 4) return 'text-orange-400';
  return 'text-red-400';
}

export function getDifficultyColor(diff: string): string {
  switch (diff) {
    case 'AAA': return 'text-red-500';
    case 'AA': return 'text-orange-400';
    case 'A': return 'text-yellow-400';
    case 'B': return 'text-blue-400';
    case 'C': return 'text-green-400';
    default: return 'text-gray-400';
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'Assistindo':
    case 'Lendo':
      return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    case 'Concluído':
      return 'bg-green-500/20 text-green-400 border-green-500/30';
    case 'Dropado':
      return 'bg-red-500/20 text-red-400 border-red-500/30';
    case 'Pausado':
      return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
    case 'Planejado':
      return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    default:
      return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  }
}

export function getYearFromDate(dateStr: string): number {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  return d.getFullYear();
}
