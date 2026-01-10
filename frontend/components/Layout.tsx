
import React, { useState, useEffect } from 'react';
import { Manifest } from '../types';
import { DB } from '../services/dbService';
import { useAuth } from '../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  viewMode: string;
  setViewMode: (v: any) => void;
  manifests: Manifest[];
  activeManifestId: string | null;
  setActiveManifestId: (id: string) => void;
  activeDomainId: string;
  setActiveDomainId: (id: string) => void;
  selectedClientId: string | null;
  onReset: () => void;
}

const Layout: React.FC<LayoutProps> = ({ 
  children, viewMode, setViewMode, manifests, activeManifestId, 
  setActiveManifestId, activeDomainId, setActiveDomainId, selectedClientId, onReset 
}) => {
  const { user, logout, isAuthenticated } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);

  // Check online status and pending sync count periodically
  useEffect(() => {
    const checkStatus = async () => {
      const online = await DB.isOnline();
      setIsOnline(online);
      const pending = await DB.getPendingSyncCount();
      setPendingCount(pending);

      // Auto-sync if online and have pending items
      if (online && pending > 0 && !syncing) {
        setSyncing(true);
        const result = await DB.syncPendingToServer();
        if (result.synced > 0) {
          setPendingCount(await DB.getPendingSyncCount());
        }
        setSyncing(false);
      }
    };

    checkStatus();
    const interval = setInterval(checkStatus, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, [syncing]);

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm z-20">
        <div className="p-8 pb-10">
          <button onClick={onReset} className="text-2xl font-black italic tracking-tighter hover:opacity-70 transition-opacity">CHAMELEON<span className="text-emerald-600">.</span></button>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Operator Command Center</p>
        </div>

        <nav className="flex-1 px-4 space-y-12 overflow-y-auto scrollbar-hide pb-8">
          {/* Main Terminal Section */}
          <section>
            <h3 className="px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">Core Terminal</h3>
            <div className="space-y-2">
              {[
                { id: 'directory', label: 'Client Directory', icon: '👥' },
                { id: 'home', label: 'Deploy Protocol', icon: '⚡' },
              ].map(item => (
                <button
                  key={item.id}
                  onClick={() => setViewMode(item.id)}
                  className={`w-full flex items-center gap-4 px-4 py-4 rounded-2xl text-sm font-bold transition-all ${viewMode === item.id ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
                >
                  <span className="text-lg">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </section>

          {/* Deployed Modules (The Actual Forms) */}
          <section>
            <h3 className="px-4 text-[10px] font-black text-emerald-600 uppercase tracking-widest mb-4">Active Modules</h3>
            <div className="space-y-2">
              {manifests.length === 0 ? (
                <p className="px-4 text-xs text-slate-400 italic">No protocols deployed</p>
              ) : (
                manifests.map(m => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setActiveManifestId(m.id);
                      setActiveDomainId(m.domains[0]?.id || '');
                      setViewMode('intake');
                    }}
                    className={`w-full flex items-center gap-4 px-4 py-4 rounded-xl text-xs font-bold transition-all ${activeManifestId === m.id && viewMode === 'intake' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    <span>🛡️</span>
                    <div className="text-left">
                      <p className="truncate w-44">{m.domains[0]?.title || 'Unknown'}</p>
                      <p className={`text-[9px] uppercase opacity-60 ${activeManifestId === m.id && viewMode === 'intake' ? 'text-white' : 'text-slate-400'}`}>{m.config.region}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </section>

          {/* System Admin Section (Source Specs) */}
          <section>
            <h3 className="px-4 text-[10px] font-black text-slate-300 uppercase tracking-widest mb-4">System Artifacts</h3>
            <div className="space-y-1">
              {manifests.map(m => (
                <button
                  key={m.id}
                  onClick={() => { setActiveManifestId(m.id); setViewMode('manifest'); }}
                  className={`w-full text-left px-4 py-3 rounded-xl text-[10px] font-bold transition-all ${activeManifestId === m.id && viewMode === 'manifest' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  📄 SPEC: {m.config.region} v{m.version}
                </button>
              ))}
            </div>
          </section>
        </nav>

        <div className="p-8 border-t border-slate-100 bg-slate-50/50 space-y-2">
          <div className="flex items-center gap-3">
            <div className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`}></div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
              {isOnline ? 'Server: Connected' : 'Server: Offline (Local Mode)'}
            </span>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-3">
              <div className={`w-2 h-2 rounded-full ${syncing ? 'bg-blue-500 animate-pulse' : 'bg-amber-500'}`}></div>
              <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest">
                {syncing ? 'Syncing...' : `${pendingCount} item${pendingCount > 1 ? 's' : ''} pending sync`}
              </span>
            </div>
          )}
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        <header className="h-20 bg-white border-b border-slate-200 flex items-center justify-between px-12 z-10">
          <div className="flex items-center gap-6">
            <h2 className="text-xl font-bold text-slate-900 italic tracking-tight">
              {viewMode === 'directory' ? 'Global Directory' : 
               viewMode === 'client_360' ? 'Unified Case Management' : 
               viewMode === 'intake' ? (manifests.find(m => m.id === activeManifestId)?.domains[0]?.title || 'Clinical Engine') : 
               viewMode === 'manifest' ? 'Protocol Architecture' : 'System Terminal'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
             {selectedClientId && (
               <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-100 rounded-lg">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Active Context: {selectedClientId.slice(0, 8)}...</span>
               </div>
             )}
             <div className="flex -space-x-2">
                {[1, 2, 3].map(i => <div key={i} className="w-8 h-8 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-[10px] font-bold text-slate-400">{i}</div>)}
             </div>
             {isAuthenticated && user ? (
               <div className="flex items-center gap-3">
                 <div className="text-right">
                   <p className="text-xs font-bold text-slate-700">{user.name}</p>
                   <p className="text-[10px] text-slate-400 uppercase">{user.role}</p>
                 </div>
                 <button 
                   onClick={logout}
                   className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-lg hover:bg-slate-700 transition-colors"
                   title="Logout"
                 >
                   {user.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                 </button>
               </div>
             ) : (
               <button className="w-10 h-10 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-xs shadow-lg">?</button>
             )}
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-12 relative bg-[#fcfdfe] scroll-smooth">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
