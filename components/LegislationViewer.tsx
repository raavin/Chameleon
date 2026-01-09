
import React from 'react';
import { LegislationLibrary } from '../types';

interface LegislationViewerProps {
  citationId: string | null;
  library: LegislationLibrary;
  onClose: () => void;
}

const LegislationViewer: React.FC<LegislationViewerProps> = ({ citationId, library, onClose }) => {
  if (!citationId || !library[citationId]) return null;

  const item = library[citationId];

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] animate-in fade-in" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-white shadow-2xl z-[110] flex flex-col animate-in slide-in-from-right duration-500 overflow-hidden rounded-l-[3rem]">
        <div className="p-10 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">Compliance Artifact</h3>
            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-[0.2em] mt-1">Legislation Database Node</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-full transition-colors text-slate-400">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-12 space-y-12">
          <section className="space-y-4">
            <div className="inline-block px-3 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full uppercase tracking-widest">Regulatory Instrument</div>
            <h2 className="text-4xl font-black text-slate-900 leading-tight">{item.act_name}</h2>
            <div className="flex items-center gap-3 font-mono text-sm text-slate-500 font-bold border-b border-slate-100 pb-4">
              <span>SECTION:</span>
              <span className="text-emerald-600">{item.section_title}</span>
            </div>
          </section>

          <section className="space-y-4">
            <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Statutory Text</h4>
            <div className="bg-slate-50 border-l-4 border-emerald-500 p-8 rounded-r-[2rem] italic text-slate-700 leading-relaxed font-serif text-xl shadow-inner">
              "{item.content}"
            </div>
          </section>

          {item.analysis && (
            <section className="space-y-4">
              <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Deep-Dive Analysis</h4>
              <div className="p-8 bg-blue-50/50 rounded-[2rem] border border-blue-100 text-blue-900 text-lg leading-relaxed font-medium">
                {item.analysis}
              </div>
            </section>
          )}

          <div className="p-6 bg-slate-900 text-white rounded-[2rem] flex gap-6 items-center">
            <div className="text-3xl">🛡️</div>
            <div>
              <p className="text-xs font-black uppercase tracking-widest opacity-60">Compliance Verification</p>
              <p className="text-sm font-bold mt-1 leading-relaxed">Collecting this data satisfies regional reporting mandates. Use break-glass override only in extreme crisis.</p>
            </div>
          </div>
        </div>

        <div className="p-10 border-t border-slate-100 bg-slate-50 flex justify-end">
           <button onClick={onClose} className="px-12 py-5 bg-slate-900 text-white font-black rounded-2xl hover:bg-slate-800 transition-colors shadow-2xl">
             Return to Workflow
           </button>
        </div>
      </div>
    </>
  );
};

export default LegislationViewer;
