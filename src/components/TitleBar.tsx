import React from 'react';
import { Minus, Square, X } from 'lucide-react';

export default function TitleBar() {
  return (
    <div className="titlebar-drag h-9 bg-dark-900 border-b border-dark-700/50 flex items-center justify-between px-4 select-none shrink-0">
      <div className="flex items-center gap-2">
        <span className="text-accent-400 font-bold text-sm">📖</span>
        <span className="text-dark-300 text-xs font-medium tracking-wide">LOREKEEPER</span>
      </div>
      <div className="titlebar-no-drag flex items-center gap-1">
        <button
          onClick={() => window.api.minimize()}
          className="w-8 h-7 flex items-center justify-center rounded hover:bg-dark-700 transition-colors"
        >
          <Minus size={14} className="text-dark-300" />
        </button>
        <button
          onClick={() => window.api.maximize()}
          className="w-8 h-7 flex items-center justify-center rounded hover:bg-dark-700 transition-colors"
        >
          <Square size={11} className="text-dark-300" />
        </button>
        <button
          onClick={() => window.api.close()}
          className="w-8 h-7 flex items-center justify-center rounded hover:bg-red-600 transition-colors"
        >
          <X size={14} className="text-dark-300" />
        </button>
      </div>
    </div>
  );
}
