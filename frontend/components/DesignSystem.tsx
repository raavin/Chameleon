
import React from 'react';

export const UI = {
  colors: {
    primary: 'emerald-600',
    primaryHover: 'emerald-700',
    surface: 'white',
    bg: 'slate-50',
    border: 'slate-200',
    text: 'slate-900',
    textMuted: 'slate-500',
  },
  card: "bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden",
  input: "w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-sm font-medium transition-all",
  button: {
    primary: "px-6 py-3 bg-slate-900 text-white font-black rounded-xl shadow-lg hover:scale-[1.02] active:scale-[0.98] transition-all text-sm",
    secondary: "px-6 py-3 border-2 border-slate-100 text-slate-900 font-bold rounded-xl hover:bg-slate-50 transition-all text-sm",
    action: "px-6 py-3 bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all text-sm"
  },
  text: {
    h1: "text-7xl font-black tracking-tight leading-[0.9]",
    h2: "text-4xl font-bold tracking-tight",
    h3: "text-xl font-bold",
    label: "text-[10px] font-black text-slate-400 uppercase tracking-widest"
  }
};

export const SectionHeader: React.FC<{ title: string; subtitle?: string }> = ({ title, subtitle }) => (
  <div className="mb-12">
    <h2 className={UI.text.h2}>{title}</h2>
    {subtitle && <p className="text-lg text-slate-500 font-medium mt-2">{subtitle}</p>}
  </div>
);
