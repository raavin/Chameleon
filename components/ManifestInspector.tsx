
import React from 'react';
import { Manifest } from '../types';

interface ManifestInspectorProps {
  manifest: Manifest;
}

const ManifestInspector: React.FC<ManifestInspectorProps> = ({ manifest }) => {
  const primaryDomain = manifest?.domains?.[0];

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-24">
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between items-start gap-8">
        <div>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Protocol Specification</h2>
          <p className="text-sm text-slate-400 font-bold uppercase tracking-widest mt-1">{manifest.config?.region || 'Unknown Region'} // v{manifest.version}</p>
        </div>
        <div className="flex gap-4">
          <button 
            onClick={() => {
              const blob = new Blob([JSON.stringify(manifest, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `manifest_${manifest.id?.slice(0,8)}.json`;
              a.click();
            }}
            className="px-6 py-3 bg-slate-900 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-xl hover:bg-slate-800 transition-all"
          >
            Export Artifact
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-black rounded-[3rem] border border-slate-800 p-10 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8">
             <div className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Read-Only Statutory Payload</div>
          </div>
          <pre className="text-[11px] font-mono text-emerald-400/90 leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-[800px] custom-scrollbar">
            {JSON.stringify(manifest, null, 2)}
          </pre>
        </div>

        <div className="space-y-8">
          <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Research Nodes</h3>
             <div className="space-y-4">
                {primaryDomain?.research_artifacts?.map((art, i) => (
                  <div key={art.id || i} className="p-4 bg-slate-50 border border-slate-100 rounded-2xl group/art hover:border-emerald-200 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">{art.source}</p>
                      {art.cached_content && (
                        <button
                          onClick={() => {
                            const blob = new Blob([art.cached_content!], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            // Sanitize title for filename
                            const safeTitle = art.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
                            a.download = `${safeTitle}.txt`;
                            a.click();
                          }}
                          className="text-[9px] font-black text-slate-400 hover:text-emerald-600 uppercase tracking-widest flex items-center gap-1"
                        >
                          Download Text ↓
                        </button>
                      )}
                    </div>
                    <p className="text-sm font-bold text-slate-800 mt-1">{art.title}</p>
                    <p className="text-[10px] text-slate-400 mt-2 line-clamp-2">{art.content_summary}</p>
                    {art.url && <a href={art.url} target="_blank" rel="noreferrer" className="text-[9px] text-blue-400 mt-2 block hover:underline truncate">{art.url}</a>}
                  </div>
                ))}
                {(!primaryDomain?.research_artifacts || primaryDomain.research_artifacts.length === 0) && (
                  <p className="text-xs text-slate-400 italic font-medium">No research artifacts indexed.</p>
                )}
             </div>
          </section>

          <section className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
             <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6">Compliance Rules</h3>
             <div className="space-y-4">
                {primaryDomain?.governance_rules?.map((rule, i) => (
                  <div key={i} className="flex gap-4 items-start">
                    <span className="w-2 h-2 rounded-full bg-blue-500 mt-1.5 flex-shrink-0"></span>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">{rule.description || rule}</p>
                  </div>
                ))}
                {(!primaryDomain?.governance_rules || primaryDomain.governance_rules.length === 0) && (
                   <p className="text-xs text-slate-400 italic font-medium">Standard governance applied.</p>
                )}
             </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ManifestInspector;
