
import React from 'react';
import { Submission, Manifest } from '../types';

interface ClientDashboardProps {
  clientId: string;
  submissions: Submission[];
  manifests: Manifest[];
  onIntake: (mid: string, did: string) => void;
  onViewEpisode: (sub: Submission) => void;
}

const ClientDashboard: React.FC<ClientDashboardProps> = ({ clientId, submissions, manifests, onIntake, onViewEpisode }) => {
  const clientSubs = submissions.filter(s => s.subject_id === clientId);
  // Get latest name from history
  const latestData = clientSubs[0]?.data || {};
  const displayName = latestData.full_name || latestData.name || clientId;
  
  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24">
      <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-xl flex flex-col md:flex-row gap-12 items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-50 rounded-full -mr-32 -mt-32 opacity-30 blur-3xl"></div>
        <div className="w-32 h-32 bg-slate-900 rounded-[2.5rem] flex items-center justify-center text-5xl font-black text-white shadow-2xl relative z-10">
          {displayName.charAt(0)}
        </div>
        <div className="flex-1 space-y-4 relative z-10">
          <div>
            <h1 className="text-5xl font-black text-slate-900 tracking-tighter">{displayName}</h1>
            <p className="text-sm text-slate-400 font-mono mt-1 uppercase font-bold tracking-widest">Identity Record: {clientId}</p>
          </div>
          <div className="flex gap-12 pt-4">
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Artifacts</p>
               <p className="text-xl font-black text-slate-800">{clientSubs.length}</p>
             </div>
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
               <p className="text-xl font-black text-emerald-600">Active</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-12">
        <section className="space-y-6">
          <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Modules</h3>
          <div className="grid grid-cols-1 gap-4">
            {manifests.map(m => (
              <div key={m.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 hover:border-emerald-500 transition-all shadow-sm group">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xl font-bold text-slate-800">{m.domains[0]?.title}</h4>
                    <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">{m.config.region}</p>
                  </div>
                  <button 
                    onClick={() => onIntake(m.id, m.domains[0]?.id)}
                    className="px-6 py-3 bg-slate-900 text-white font-black rounded-xl text-xs hover:bg-emerald-600 transition-colors shadow-lg"
                  >
                    New Intake
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
           <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Chronological History</h3>
          <div className="bg-white rounded-[2.5rem] border border-slate-200 p-10 space-y-10 shadow-sm">
            {clientSubs.length === 0 ? (
              <div className="text-center py-12 text-slate-300 font-black uppercase text-xs">No records stored</div>
            ) : (
              clientSubs.map((sub) => {
                const manifest = manifests.find(m => m.id === sub.manifest_id);
                return (
                  <div key={sub.id} className="relative pl-10 border-l-2 border-slate-100 last:border-0 pb-10 last:pb-0 group">
                    <div className="absolute -left-[9px] top-1 w-4 h-4 rounded-full bg-white border-2 border-emerald-500" />
                    <div className="flex justify-between items-start">
                      <div className="cursor-pointer" onClick={() => onViewEpisode(sub)}>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{new Date(sub.timestamp).toLocaleDateString()} — {new Date(sub.timestamp).toLocaleTimeString()}</p>
                        <h5 className="text-lg font-black text-slate-800 group-hover:text-emerald-600 transition-colors underline decoration-slate-200 underline-offset-4 decoration-2">{manifest?.domains[0]?.title || 'Protocol Record'}</h5>
                        <p className="text-xs text-slate-400 mt-2 line-clamp-2">Analysis stored under regional statutory node {sub.id.slice(0,8)}...</p>
                      </div>
                      <button 
                        onClick={() => onViewEpisode(sub)}
                        className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all"
                        title="Review Episode"
                      >
                        👁️
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ClientDashboard;
