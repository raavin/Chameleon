
import React from 'react';
import { Submission, Manifest, ClientRecord } from '../types';
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

interface ClientDashboardProps {
  clientId: string;
  submissions: Submission[];
  manifests: Manifest[];
  clients?: ClientRecord[];
  onIntake: (mid: string, did: string) => void;
  onViewEpisode: (sub: Submission) => void;
  onReorder?: (ids: string[]) => void;
}

// Sortable Item Component
const SortableManifestItem: React.FC<{ manifest: Manifest, onIntake: (mid: string, did: string) => void }> = ({ manifest, onIntake }) => {
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
    opacity: isDragging ? 0.8 : 1,
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      {...attributes}
      className={`bg-white p-8 rounded-[2.5rem] border transition-all shadow-sm group relative ${isDragging ? 'border-emerald-500 shadow-xl' : 'border-slate-200 hover:border-emerald-500'}`}
    >
      <div 
        ref={setActivatorNodeRef}
        {...listeners}
        style={{ touchAction: 'none' }}
        className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-300 cursor-grab active:cursor-grabbing hover:text-slate-500 touch-none z-20"
      >
        ⋮⋮
      </div>
      <div className="flex justify-between items-center pl-6">
        <div>
          <h4 className="text-xl font-bold text-slate-800">{manifest.domains[0]?.title}</h4>
          <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">{manifest.config.region}</p>
        </div>
        <button 
          onPointerDown={(e) => e.stopPropagation()}
          onClick={() => onIntake(manifest.id, manifest.domains[0]?.id)}
          className="px-6 py-3 bg-slate-900 text-white font-black rounded-xl text-xs hover:bg-emerald-600 transition-colors shadow-lg cursor-pointer z-10"
        >
          New Intake
        </button>
      </div>
    </div>
  );
};

const ClientDashboard: React.FC<ClientDashboardProps> = ({ clientId, submissions, manifests, clients, onIntake, onViewEpisode, onReorder }) => {
  const clientSubs = submissions.filter(s => s.subject_id === clientId);
  const latestSubmission = clientSubs.reduce((latest, current) => {
    if (!latest) return current;
    return new Date(current.timestamp).getTime() > new Date(latest.timestamp).getTime()
      ? current
      : latest;
  }, null as Submission | null);
  // Get latest name from history
  const clientRecord = clients?.find((c) => c.id === clientId);
  const latestData = latestSubmission?.data || {};
  const displayName =
    clientRecord?.name ||
    latestData.full_name ||
    latestData.name ||
    [latestData.given_name, latestData.family_name].filter(Boolean).join(' ') ||
    clientId;

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: {
        distance: 10,
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 250,
        tolerance: 5,
      },
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && onReorder) {
      const oldIndex = manifests.findIndex((m) => m.id === active.id);
      const newIndex = manifests.findIndex((m) => m.id === over.id);
      
      const newOrder = arrayMove<Manifest>(manifests, oldIndex, newIndex);
      
      onReorder(newOrder.map(m => m.id));
    }
  };
  
  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl flex flex-col md:flex-row gap-8 items-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-50 rounded-full -mr-24 -mt-24 opacity-30 blur-3xl"></div>
        <div className="w-24 h-24 bg-slate-900 rounded-[2rem] flex items-center justify-center text-4xl font-black text-white shadow-2xl relative z-10">
          {displayName.charAt(0)}
        </div>
        <div className="flex-1 space-y-4 relative z-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">{displayName}</h1>
            <p className="text-xs text-slate-400 font-mono mt-1 uppercase font-bold tracking-widest">Identity Record: {clientId}</p>
          </div>
          <div className="flex gap-8 pt-2">
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Total Artifacts</p>
               <p className="text-lg font-black text-slate-800">{clientSubs.length}</p>
             </div>
             <div>
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
               <p className="text-lg font-black text-emerald-600">Active</p>
             </div>
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <section className="space-y-4">
          <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Available Modules</h3>
          <div className="grid grid-cols-1 gap-3">
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={manifests.map(m => m.id)}
                strategy={verticalListSortingStrategy}
              >
                {manifests.map(m => (
                  <SortableManifestItem 
                    key={m.id} 
                    manifest={m} 
                    onIntake={onIntake} 
                  />
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </section>

        <section className="space-y-4">
           <h3 className="px-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Chronological History</h3>
          <div className="bg-white rounded-[2rem] border border-slate-200 p-6 space-y-6 shadow-sm">
            {clientSubs.length === 0 ? (
              <div className="text-center py-12 text-slate-300 font-black uppercase text-xs">No records stored</div>
            ) : (
              clientSubs.map((sub) => {
                const manifest = manifests.find(m => m.id === sub.manifest_id);
                return (
                  <div key={sub.id} className="relative pl-8 border-l-2 border-slate-100 last:border-0 pb-6 last:pb-0 group">
                    <div className="absolute -left-[7px] top-1 w-3 h-3 rounded-full bg-white border-2 border-emerald-500" />
                    <div className="flex justify-between items-start">
                      <div className="cursor-pointer" onClick={() => onViewEpisode(sub)}>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{new Date(sub.timestamp).toLocaleDateString()} — {new Date(sub.timestamp).toLocaleTimeString()}</p>
                        <h5 className="text-base font-black text-slate-800 group-hover:text-emerald-600 transition-colors underline decoration-slate-200 underline-offset-4 decoration-2">{manifest?.domains[0]?.title || 'Protocol Record'}</h5>
                        <p className="text-[11px] text-slate-400 mt-1.5 line-clamp-2">Analysis stored under regional statutory node {sub.id.slice(0,8)}...</p>
                      </div>
                      <button 
                        onClick={() => onViewEpisode(sub)}
                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-400 hover:text-emerald-600 hover:border-emerald-200 transition-all"
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
