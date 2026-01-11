
import React, { useState, useEffect } from 'react';
import { Manifest } from '../types';
import { DB } from '../services/dbService';
import { useAuth } from '../contexts/AuthContext';
import {
  DndContext,
  closestCenter,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
  archivedManifestIds: string[];
  onToggleArchive: (manifestId: string) => void;
  archivedArtifactIds: string[];
  onToggleArchiveArtifact: (manifestId: string) => void;
  onDeleteManifest: (manifestId: string) => void;
  onReorderManifests?: (ids: string[]) => void;
}

const SortableActiveManifestItem: React.FC<{
  manifest: Manifest;
  isActive: boolean;
  viewMode: string;
  onSelect: () => void;
  onArchive: (e: React.MouseEvent) => void;
}> = ({ manifest, isActive, viewMode, onSelect, onArchive }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: manifest.id });

  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
    opacity: isDragging ? 0.85 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-bold transition-all ${isActive && viewMode === 'intake' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
    >
      <div
        ref={setActivatorNodeRef}
        {...listeners}
        style={{ touchAction: 'none' }}
        className={`text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500 ${isActive && viewMode === 'intake' ? 'text-emerald-100 hover:text-white' : ''}`}
      >
        ⋮⋮
      </div>
      <button
        onClick={onSelect}
        className="flex-1 flex items-center gap-3 text-left"
      >
        <span>🛡️</span>
        <div>
          <p className="truncate w-36">{manifest.domains[0]?.title || 'Unknown'}</p>
          <p className={`text-[9px] uppercase opacity-60 ${isActive && viewMode === 'intake' ? 'text-white' : 'text-slate-400'}`}>{manifest.config?.region || 'Unknown'}</p>
        </div>
      </button>
      <button
        onClick={onArchive}
        className={`p-1.5 rounded-md transition-colors ${isActive && viewMode === 'intake' ? 'hover:bg-emerald-700 text-white/70 hover:text-white' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'}`}
        title="Archive module"
      >
        📦
      </button>
    </div>
  );
};

const Layout: React.FC<LayoutProps> = ({ 
  children, viewMode, setViewMode, manifests, activeManifestId, 
  setActiveManifestId, activeDomainId, setActiveDomainId, selectedClientId, onReset,
  archivedManifestIds, onToggleArchive, archivedArtifactIds, onToggleArchiveArtifact, onDeleteManifest,
  onReorderManifests
}) => {
  const { user, logout, isAuthenticated } = useAuth();
  const [isOnline, setIsOnline] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  
  // Collapsible section states
  const [modulesExpanded, setModulesExpanded] = useState(true);
  const [archivedExpanded, setArchivedExpanded] = useState(false);
  const [artifactsExpanded, setArtifactsExpanded] = useState(true);

  // Filter active vs archived manifests
  const activeManifests = manifests.filter(m => !archivedManifestIds.includes(m.id));
  const archivedManifests = manifests.filter(m => archivedManifestIds.includes(m.id));
  
  // Filter active vs archived artifacts
  const activeArtifacts = manifests.filter(m => !archivedArtifactIds.includes(m.id));
  const archivedArtifacts = manifests.filter(m => archivedArtifactIds.includes(m.id));
  
  // Combined archived count
  const totalArchivedCount = archivedManifests.length + archivedArtifacts.length;

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

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 10 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  );

  const handleActiveModulesDragEnd = (event: DragEndEvent) => {
    if (!onReorderManifests) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const filteredActive = activeManifests.filter(m => m.domains && m.domains.length > 0);
    const oldIndex = filteredActive.findIndex(m => m.id === active.id);
    const newIndex = filteredActive.findIndex(m => m.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reorderedActive = arrayMove(filteredActive, oldIndex, newIndex);
    const archivedIds = manifests
      .filter(m => archivedManifestIds.includes(m.id))
      .map(m => m.id);
    const nextOrderIds = [...reorderedActive.map(m => m.id), ...archivedIds];

    onReorderManifests(nextOrderIds);
  };

  return (
    <div className="flex h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className="w-80 bg-white border-r border-slate-200 flex flex-col shadow-sm z-20">
        <div className="p-8 pb-10">
          <button onClick={onReset} className="text-2xl font-black italic tracking-tighter hover:opacity-70 transition-opacity">CHAMELEON<span className="text-emerald-600">.</span></button>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-2">Operator Command Center</p>
        </div>

        <nav className="flex-1 px-4 overflow-y-auto scrollbar-hide pb-8 flex flex-col">
          {/* Top section with main navigation */}
          <div className="space-y-8">
            {/* Client Directory - standalone at top */}
            <section>
              <button
                onClick={() => setViewMode('directory')}
                className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${viewMode === 'directory' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
              >
                <span className="text-base">👥</span>
                Client Directory
              </button>
            </section>

            {/* Active Modules */}
            <section>
              <button 
                onClick={() => setModulesExpanded(!modulesExpanded)}
                className="w-full flex items-center justify-between px-4 mb-3 group"
              >
                <h3 className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Active Modules</h3>
                <span className={`text-emerald-600 transition-transform duration-200 ${modulesExpanded ? 'rotate-0' : '-rotate-90'}`}>
                  ▼
                </span>
              </button>
              {modulesExpanded && (
                <div className="space-y-1">
                  {activeManifests.length === 0 ? (
                    <p className="px-4 text-xs text-slate-400 italic">No protocols deployed</p>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={handleActiveModulesDragEnd}
                    >
                      <SortableContext
                        items={activeManifests.filter(m => m.domains && m.domains.length > 0).map(m => m.id)}
                        strategy={verticalListSortingStrategy}
                      >
                        {activeManifests.filter(m => m.domains && m.domains.length > 0).map(m => (
                          <SortableActiveManifestItem
                            key={m.id}
                            manifest={m}
                            isActive={activeManifestId === m.id}
                            viewMode={viewMode}
                            onSelect={() => {
                              setActiveManifestId(m.id);
                              setActiveDomainId(m.domains[0]?.id || '');
                              setViewMode('intake');
                            }}
                            onArchive={(e) => {
                              e.stopPropagation();
                              onToggleArchive(m.id);
                            }}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>
                  )}
                </div>
              )}
            </section>
          </div>

          {/* Spacer to push bottom section down */}
          <div className="flex-1" />

          {/* Bottom section - Deploy, Artifacts, Archived */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            {/* Deploy Protocol */}
            <button
              onClick={() => setViewMode('home')}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${viewMode === 'home' ? 'bg-slate-900 text-white shadow-xl shadow-slate-200' : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <span className="text-base">⚡</span>
              Deploy Protocol
            </button>

            {/* System Artifacts */}
            <section>
              <button 
                onClick={() => setArtifactsExpanded(!artifactsExpanded)}
                className="w-full flex items-center justify-between px-4 mb-2 group"
              >
                <h3 className="text-[10px] font-black text-slate-300 uppercase tracking-widest">System Artifacts</h3>
                <span className={`text-slate-400 transition-transform duration-200 ${artifactsExpanded ? 'rotate-0' : '-rotate-90'}`}>
                  ▼
                </span>
              </button>
              {artifactsExpanded && (
                <div className="space-y-1">
                  {activeArtifacts.length === 0 ? (
                    <p className="px-4 text-xs text-slate-400 italic">No artifacts</p>
                  ) : (
                    activeArtifacts.map(m => (
                      <div
                        key={m.id}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeManifestId === m.id && viewMode === 'manifest' ? 'bg-slate-100 text-slate-900' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                      >
                        <button
                          onClick={() => { setActiveManifestId(m.id); setViewMode('manifest'); }}
                          className="flex-1 text-left"
                        >
                          📄 SPEC: {m.config?.region || 'Unknown'} v{m.version || '1.0'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleArchiveArtifact(m.id);
                          }}
                          className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors"
                          title="Archive artifact"
                        >
                          📦
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </section>

            {/* Archived Section */}
            {totalArchivedCount > 0 && (
              <section>
                <button 
                  onClick={() => setArchivedExpanded(!archivedExpanded)}
                  className="w-full flex items-center justify-between px-4 mb-2 group"
                >
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Archived ({totalArchivedCount})</h3>
                  <span className={`text-slate-400 transition-transform duration-200 ${archivedExpanded ? 'rotate-0' : '-rotate-90'}`}>
                    ▼
                  </span>
                </button>
                {archivedExpanded && (
                  <div className="space-y-1">
                    {/* Archived Modules */}
                    {archivedManifests.filter(m => m.domains && m.domains.length > 0).map(m => (
                      <div
                        key={`mod-${m.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:bg-slate-50 transition-all"
                      >
                        <button
                          onClick={() => {
                            setActiveManifestId(m.id);
                            setActiveDomainId(m.domains[0]?.id || '');
                            setViewMode('intake');
                          }}
                          className="flex-1 flex items-center gap-2 text-left opacity-60"
                        >
                          <span>🛡️</span>
                          <span className="truncate">{m.domains[0]?.title || 'Unknown'}</span>
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleArchive(m.id);
                          }}
                          className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-emerald-600 transition-colors"
                          title="Restore module"
                        >
                          ↩️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteManifest(m.id);
                          }}
                          className="p-1 rounded-md hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete permanently"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                    {/* Archived Artifacts */}
                    {archivedArtifacts.map(m => (
                      <div
                        key={`art-${m.id}`}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold text-slate-400 hover:bg-slate-50 transition-all"
                      >
                        <button
                          onClick={() => { setActiveManifestId(m.id); setViewMode('manifest'); }}
                          className="flex-1 text-left opacity-60"
                        >
                          📄 SPEC: {m.config?.region || 'Unknown'} v{m.version || '1.0'}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleArchiveArtifact(m.id);
                          }}
                          className="p-1 rounded-md hover:bg-slate-200 text-slate-400 hover:text-emerald-600 transition-colors"
                          title="Restore artifact"
                        >
                          ↩️
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteManifest(m.id);
                          }}
                          className="p-1 rounded-md hover:bg-red-100 text-slate-400 hover:text-red-600 transition-colors"
                          title="Delete permanently"
                        >
                          🗑️
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}
          </div>
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
