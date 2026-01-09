
import React, { useMemo, useEffect, useRef } from 'react';

interface ResearcherOverlayProps {
  stream: string;
}

const ResearcherOverlay: React.FC<ResearcherOverlayProps> = ({ stream }) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  
  // Auto-scroll the log container
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [stream]);

  const { steps, downloadedFiles } = useMemo(() => {
    const lines = stream.split('\n');
    const extractedSteps: { type: string, msg: string }[] = [];
    const files: string[] = [];

    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.startsWith('[SEARCH]')) extractedSteps.push({ type: 'SEARCH', msg: trimmed.replace('[SEARCH]', '').trim() });
      else if (trimmed.startsWith('[DOWNLOAD]')) {
        const msg = trimmed.replace('[DOWNLOAD]', '').trim();
        extractedSteps.push({ type: 'DOWNLOAD', msg });
        // Extract filename more flexibly
        // Matches: "Saving filename.pdf..." or "Saving filename.pdf"
        const match = msg.match(/Saving\s+(.*?)(?:\s+\.\.\.|\s+to|$)/i);
        if (match && match[1]) files.push(match[1]);
        else files.push(msg.replace(/^Saving\s+/i, '').split(' ')[0] || "Unknown Document");
      }
      else if (trimmed.startsWith('[SCAN]')) extractedSteps.push({ type: 'SCAN', msg: trimmed.replace('[SCAN]', '').trim() });
      else if (trimmed.startsWith('[COMPLIANCE]')) extractedSteps.push({ type: 'COMPLIANCE', msg: trimmed.replace('[COMPLIANCE]', '').trim() });
      else if (trimmed.startsWith('[SYSTEM]')) extractedSteps.push({ type: 'SYSTEM', msg: trimmed.replace('[SYSTEM]', '').trim() });
    });
    return { steps: extractedSteps, downloadedFiles: files };
  }, [stream]);

  return (
    <div className="fixed inset-0 bg-slate-950 z-[200] flex flex-col items-center justify-center p-8 md:p-24 overflow-hidden">
      <div className="w-full max-w-7xl space-y-8">
        <div className="border-b border-white/10 pb-6 flex justify-between items-end">
          <div>
            <h2 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-2 animate-pulse">Deep Intelligence Node Active</h2>
            <h1 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter">Acquiring Statutory Documentation...</h1>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Local Repository</p>
            <p className="text-xl font-mono text-emerald-400">/usr/local/chameleon/research/</p>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Live Research Log */}
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Execution Stream</h3>
            <div ref={scrollRef} className="space-y-3 h-[500px] overflow-y-auto pr-4 custom-scrollbar bg-white/5 p-6 rounded-3xl border border-white/5">
              {steps.length === 0 && (
                <div className="flex flex-col gap-2 opacity-50">
                   <div className="h-2 w-3/4 bg-slate-700 rounded animate-pulse"></div>
                   <div className="h-2 w-1/2 bg-slate-700 rounded animate-pulse delay-75"></div>
                   <div className="h-2 w-2/3 bg-slate-700 rounded animate-pulse delay-150"></div>
                </div>
              )}
              {steps.map((step, i) => (
                <div key={i} className="flex gap-4 items-start animate-in fade-in slide-in-from-left-4 duration-300">
                  <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest min-w-[80px] text-center ${
                    step.type === 'SEARCH' ? 'bg-blue-500/20 text-blue-400' :
                    step.type === 'DOWNLOAD' ? 'bg-emerald-500/20 text-emerald-400' :
                    step.type === 'SCAN' ? 'bg-amber-500/20 text-amber-400' : 
                    step.type === 'SYSTEM' ? 'bg-fuchsia-500/20 text-fuchsia-400' : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {step.type}
                  </span>
                  <p className="text-xs text-slate-200 font-mono leading-relaxed pt-0.5">{step.msg}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Local Folder View */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Local Drive Storage</h3>
            <div className="bg-black border border-slate-800 rounded-3xl p-6 h-[500px] overflow-y-auto shadow-inner relative">
               <div className="absolute top-0 left-0 w-full h-8 bg-gradient-to-b from-black to-transparent pointer-events-none"></div>
               <div className="space-y-4">
                  {downloadedFiles.length === 0 && (
                     <div className="text-center mt-20 text-slate-600 italic text-xs">
                        Awaiting Downloads...
                     </div>
                  )}
                  {downloadedFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-slate-900/50 border border-slate-800 rounded-xl animate-in zoom-in duration-300">
                       <div className="w-8 h-8 bg-emerald-900/40 rounded-lg flex items-center justify-center text-lg">📄</div>
                       <div className="overflow-hidden">
                          <p className="text-[10px] font-bold text-slate-300 truncate">{file}</p>
                          <p className="text-[8px] text-emerald-600 font-mono uppercase tracking-wider">SAVED LOCALLY</p>
                       </div>
                    </div>
                  ))}
               </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResearcherOverlay;
