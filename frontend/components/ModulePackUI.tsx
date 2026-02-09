/**
 * Module Pack UI - Chameleon Protocol
 *
 * Interface for creating and managing module packs:
 * - Create new packs with expert research
 * - Monitor generation progress
 * - View and load generated manifests
 */

import React, { useState, useEffect, useRef } from 'react';
import { UI } from './DesignSystem';

interface ModulePack {
  id: string;
  name: string;
  description?: string;
  status: 'draft' | 'researching' | 'ideating' | 'generating' | 'completed' | 'failed' | 'partial';
  current_phase: string;
  config: {
    region: string;
    currency: string;
    locale: string;
    service_types: string[];
  };
  original_request: {
    prompt: string;
    domains: string[];
    additional_context: string;
  };
  progress: {
    expert_mode_complete: boolean;
    ideation_complete: boolean;
    modules_planned: number;
    modules_generated: number;
    modules_failed: number;
  };
  modules?: Array<{
    manifest_id: string;
    module_type: string;
    title: string;
    status: string;
    fields_count?: number;
  }>;
  expert_context?: {
    summary: string;
    key_insights: string[];
    recommended_modules: Array<{ title: string; module_type: string }>;
  };
  ideation_document?: {
    summary: string;
    proposed_modules: Array<{ title: string; module_type: string; priority: number }>;
  };
  progress_log?: Array<{
    phase: string;
    status: string;
    message: string;
    timestamp: string;
  }>;
  createdAt: string;
}

interface ProgressEvent {
  phase: string;
  status: string;
  message: string;
  timestamp?: string;
  progress?: number;
  currentModule?: string;
  summary?: any;
  details?: {
    question?: string;
    answer?: string;
    category?: string;
    insights?: string[];
    title?: string;
    confidence?: number;
    sources_count?: number;
    content_preview?: string;
    question_id?: string;
    [key: string]: any;
  };
}

interface SimpleManifest {
  id: string;
  config?: { region?: string };
  domains?: Array<{ id: string; title: string; fields?: any[] }>;
  module_pack_id?: string;
}

interface ModulePackUIProps {
  onLoadManifests?: (manifestIds: string[]) => void;
  availableManifests?: SimpleManifest[];
  onClearManifests?: () => void;
}

const API_BASE = '/api/module-packs';

export default function ModulePackUI({ onLoadManifests, availableManifests = [], onClearManifests }: ModulePackUIProps) {
  const [modulePacks, setModulePacks] = useState<ModulePack[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showPackFromExisting, setShowPackFromExisting] = useState(false);
  const [selectedPack, setSelectedPack] = useState<ModulePack | null>(null);
  const [progressEvents, setProgressEvents] = useState<ProgressEvent[]>([]);
  const [activeGeneration, setActiveGeneration] = useState<string | null>(null);
  const [selectedManifestIds, setSelectedManifestIds] = useState<string[]>([]);
  const [packFromExistingName, setPackFromExistingName] = useState('');
  const [showOverlay, setShowOverlay] = useState(false);
  const [generationComplete, setGenerationComplete] = useState(false);
  const [completedPackId, setCompletedPackId] = useState<string | null>(null);
  const [completedSummary, setCompletedSummary] = useState<any>(null);
  const progressEndRef = useRef<HTMLDivElement>(null);
  const overlayScrollRef = useRef<HTMLDivElement>(null);

  // Filter manifests that aren't already in a pack
  const unpackedManifests = availableManifests.filter(m => !m.module_pack_id);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    topic: '',
    domains: '',
    region: '',
    projectName: '',
    fundingBody: '',
    additionalContext: '',
    researchDepth: 'comprehensive' as 'quick' | 'standard' | 'comprehensive',
    locale: 'en-US'
  });
  const [complianceFiles, setComplianceFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load module packs on mount
  useEffect(() => {
    fetchModulePacks();
  }, []);

  // Auto-scroll progress
  useEffect(() => {
    progressEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    overlayScrollRef.current?.scrollTo({ top: overlayScrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [progressEvents]);

  const fetchModulePacks = async () => {
    try {
      const res = await fetch(API_BASE);
      const data = await res.json();
      setModulePacks(data.modulePacks || []);
    } catch (err) {
      console.error('Failed to fetch module packs:', err);
    } finally {
      setLoading(false);
    }
  };

  const createModulePack = async (autoStart: boolean) => {
    if (!formData.topic || !formData.region || !formData.domains) {
      alert('Please fill in Region, Topic, and Focus Domains');
      return;
    }

    setCreating(true);
    setProgressEvents([]);

    const domains = formData.domains.split(',').map(d => d.trim()).filter(Boolean);
    const name = formData.projectName || formData.name || `${domains[0]} - ${formData.region}`;

    // Read compliance files if any
    let complianceContent = '';
    if (complianceFiles.length > 0) {
      for (const file of complianceFiles) {
        try {
          const text = await file.text();
          complianceContent += `\n\n--- ${file.name} ---\n${text}`;
        } catch (e) {
          console.error(`Failed to read ${file.name}:`, e);
        }
      }
    }

    // Combine additional context with compliance content
    const fullContext = [
      formData.additionalContext,
      complianceContent ? `\n\nUploaded Compliance Documents:${complianceContent}` : ''
    ].filter(Boolean).join('\n');

    try {
      const res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          topic: formData.topic,
          domains,
          region: formData.region,
          locale: formData.locale,
          projectName: formData.projectName,
          fundingBody: formData.fundingBody,
          additionalContext: fullContext,
          researchDepth: formData.researchDepth,
          autoStart
        })
      });

      if (autoStart) {
        // Handle SSE stream - show full-screen overlay
        setActiveGeneration(name);
        setShowOverlay(true);
        setGenerationComplete(false);
        setCompletedPackId(null);
        setCompletedSummary(null);

        const reader = res.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const text = decoder.decode(value);
            const lines = text.split('\n').filter(line => line.startsWith('data: '));

            for (const line of lines) {
              try {
                const event = JSON.parse(line.slice(6));
                if (event.done) {
                  // Don't close overlay - wait for user to click Continue
                  setActiveGeneration(null);
                  setGenerationComplete(true);
                  setCompletedPackId(event.modulePackId);
                  fetchModulePacks();
                } else if (event.error) {
                  setProgressEvents(prev => [...prev, {
                    phase: 'error',
                    status: 'failed',
                    message: event.error
                  }]);
                  setGenerationComplete(true);
                } else {
                  setProgressEvents(prev => [...prev, event]);
                  // Capture completion summary
                  if (event.status === 'pipeline_complete' && event.summary) {
                    setCompletedSummary(event.summary);
                  }
                }
              } catch (e) {
                // Skip invalid JSON
              }
            }
          }
        }
      } else {
        const data = await res.json();
        if (data.success) {
          fetchModulePacks();
          setShowCreateForm(false);
        }
      }
    } catch (err) {
      console.error('Failed to create module pack:', err);
      setProgressEvents(prev => [...prev, {
        phase: 'error',
        status: 'failed',
        message: String(err)
      }]);
    } finally {
      setCreating(false);
    }
  };

  const runPhase = async (packId: string, phase: 'expert-research' | 'ideation' | 'generate-modules') => {
    const phaseName = phase.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    setProgressEvents([]);
    setActiveGeneration(phaseName);
    setShowOverlay(true);
    setGenerationComplete(false);
    setCompletedPackId(null);
    setCompletedSummary(null);

    try {
      const res = await fetch(`${API_BASE}/${packId}/${phase}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const text = decoder.decode(value);
          const lines = text.split('\n').filter(line => line.startsWith('data: '));

          for (const line of lines) {
            try {
              const event = JSON.parse(line.slice(6));
              if (event.done) {
                setActiveGeneration(null);
                setGenerationComplete(true);
                setCompletedPackId(packId);
                fetchModulePacks();
                // Refresh selected pack
                const packRes = await fetch(`${API_BASE}/${packId}`);
                const packData = await packRes.json();
                setSelectedPack(packData.modulePack);
              } else {
                setProgressEvents(prev => [...prev, event]);
                // Capture summary from completion events
                if (event.summary) {
                  setCompletedSummary(event.summary);
                }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
    } catch (err) {
      console.error(`Failed to run ${phase}:`, err);
      setProgressEvents(prev => [...prev, {
        phase: 'error',
        status: 'failed',
        message: `Failed to run ${phaseName}: ${err}`
      }]);
      setGenerationComplete(true);
    } finally {
      setActiveGeneration(null);
    }
  };

  const loadPackManifests = async (pack: ModulePack) => {
    const manifestIds = pack.modules?.filter(m => m.manifest_id).map(m => m.manifest_id) || [];
    if (manifestIds.length > 0 && onLoadManifests) {
      onLoadManifests(manifestIds);
    }
  };

  const deletePack = async (packId: string) => {
    if (!confirm('Delete this module pack? This will also delete all generated manifests.')) {
      return;
    }

    try {
      await fetch(`${API_BASE}/${packId}?deleteManifests=true`, { method: 'DELETE' });
      fetchModulePacks();
      if (selectedPack?.id === packId) {
        setSelectedPack(null);
      }
    } catch (err) {
      console.error('Failed to delete pack:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-emerald-500';
      case 'failed': return 'bg-red-500';
      case 'partial': return 'bg-amber-500';
      case 'researching':
      case 'ideating':
      case 'generating': return 'bg-blue-500 animate-pulse';
      default: return 'bg-slate-400';
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'expert_research':
      case 'deep_research': return '🔬';
      case 'ideation':
      case 'self_interview': return '💭';
      case 'module_generation':
      case 'generating': return '⚙️';
      case 'complete': return '✓';
      case 'error': return '✗';
      default: return '•';
    }
  };

  // Close overlay and go back to list
  const handleCloseOverlay = () => {
    setShowOverlay(false);
    setShowCreateForm(false);
    setProgressEvents([]);
    setGenerationComplete(false);
    setCompletedPackId(null);
    setCompletedSummary(null);
    if (completedPackId) {
      // Select the newly created pack
      fetchModulePacks().then(() => {
        const pack = modulePacks.find(p => p.id === completedPackId);
        if (pack) setSelectedPack(pack);
      });
    }
  };

  return (
    <>
      {/* Full-screen Generation Overlay */}
      {showOverlay && (
        <div className="fixed inset-0 bg-slate-950 z-[200] flex flex-col items-center justify-center p-8 md:p-24 overflow-hidden">
          <div className="w-full max-w-7xl space-y-8">
            {/* Header */}
            <div className="border-b border-white/10 pb-6 flex justify-between items-end">
              <div>
                <h2 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.4em] mb-2 animate-pulse">
                  {generationComplete ? 'Generation Complete' : 'Module Pack Factory Active'}
                </h2>
                <h1 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter">
                  {activeGeneration || 'Processing...'}
                </h1>
              </div>
              <div className="text-right hidden md:block">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Current Phase</p>
                <p className="text-xl font-mono text-emerald-400">
                  {progressEvents[progressEvents.length - 1]?.phase || 'Initializing'}
                </p>
              </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Live Progress Log */}
              <div className="lg:col-span-2 space-y-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Execution Stream</h3>
                <div
                  ref={overlayScrollRef}
                  className="space-y-3 h-[500px] overflow-y-auto pr-4 custom-scrollbar bg-white/5 p-6 rounded-3xl border border-white/5"
                >
                  {progressEvents.length === 0 && (
                    <div className="flex flex-col gap-2 opacity-50">
                      <div className="h-2 w-3/4 bg-slate-700 rounded animate-pulse"></div>
                      <div className="h-2 w-1/2 bg-slate-700 rounded animate-pulse delay-75"></div>
                      <div className="h-2 w-2/3 bg-slate-700 rounded animate-pulse delay-150"></div>
                    </div>
                  )}
                  {progressEvents.map((event, i) => (
                    <div key={i} className="flex gap-4 items-start animate-in fade-in slide-in-from-left-4 duration-300">
                      <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-widest min-w-[100px] text-center shrink-0 ${
                        event.phase === 'expert_research' || event.phase === 'deep_research' ? 'bg-blue-500/20 text-blue-400' :
                        event.phase === 'ideation' || event.phase === 'self_interview' ? 'bg-purple-500/20 text-purple-400' :
                        event.phase === 'module_generation' || event.phase === 'generating' ? 'bg-emerald-500/20 text-emerald-400' :
                        event.phase === 'complete' || event.status === 'pipeline_complete' ? 'bg-green-500/20 text-green-400' :
                        event.phase === 'error' ? 'bg-red-500/20 text-red-400' :
                        'bg-slate-500/20 text-slate-400'
                      }`}>
                        {event.phase?.replace(/_/g, ' ') || event.status}
                      </span>
                      <div className="flex-1 min-w-0">
                        {event.status === 'qa_detail' ? (
                          <div className="space-y-1">
                            <p className="text-xs text-white font-bold leading-relaxed">Q: {event.details?.question?.substring(0, 150)}</p>
                            <p className="text-xs text-slate-400 font-mono leading-relaxed">{event.details?.answer?.substring(0, 200)}</p>
                            {event.details?.insights && event.details.insights.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1">
                                {event.details.insights.map((ins: string, j: number) => (
                                  <span key={j} className="text-[9px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">{ins.substring(0, 60)}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : event.status === 'category_detail' ? (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-white font-bold">{event.details?.title}</p>
                              {event.details?.confidence != null && (
                                <span className="text-[9px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
                                  {Math.round(event.details.confidence * 100)}% confidence
                                </span>
                              )}
                              {(event.details?.sources_count ?? 0) > 0 && (
                                <span className="text-[9px] bg-slate-500/20 text-slate-400 px-2 py-0.5 rounded-full">
                                  {event.details!.sources_count} sources
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-slate-400 font-mono leading-relaxed">{event.details?.content_preview?.substring(0, 200)}</p>
                          </div>
                        ) : event.status === 'question_preview' ? (
                          <div className="flex items-start gap-2">
                            <span className="text-[9px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full shrink-0">{event.details?.category}</span>
                            <p className="text-xs text-slate-300 font-mono leading-relaxed">{event.message}</p>
                          </div>
                        ) : event.status === 'key_insight' ? (
                          <div className="flex items-start gap-2">
                            <span className="text-emerald-400 shrink-0">*</span>
                            <p className="text-xs text-emerald-200 leading-relaxed">{event.message}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-200 font-mono leading-relaxed pt-0.5">{event.message}</p>
                        )}
                      </div>
                    </div>
                  ))}
                  {!generationComplete && (
                    <div className="flex items-center gap-2 text-blue-400 mt-4">
                      <span className="animate-spin">⟳</span>
                      <span className="text-xs font-mono">Processing...</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Panel */}
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Generation Status</h3>
                <div className="bg-black border border-slate-800 rounded-3xl p-6 h-[500px] overflow-y-auto shadow-inner relative">
                  <div className="space-y-6">
                    {/* Phase Progress */}
                    <div className="space-y-4">
                      <div className={`flex items-center gap-3 ${progressEvents.some(e => e.phase === 'expert_research') ? 'text-white' : 'text-slate-600'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                          progressEvents.some(e => e.phase === 'expert_research' && e.status === 'complete') ? 'bg-emerald-500/30 text-emerald-400' :
                          progressEvents.some(e => e.phase === 'expert_research') ? 'bg-blue-500/30 text-blue-400 animate-pulse' :
                          'bg-slate-800'
                        }`}>
                          {progressEvents.some(e => e.phase === 'expert_research' && e.status === 'complete') ? '✓' : '1'}
                        </div>
                        <span className="text-sm font-bold">Expert Research</span>
                      </div>

                      <div className={`flex items-center gap-3 ${progressEvents.some(e => e.phase === 'ideation') ? 'text-white' : 'text-slate-600'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                          progressEvents.some(e => e.phase === 'ideation' && e.status === 'complete') ? 'bg-emerald-500/30 text-emerald-400' :
                          progressEvents.some(e => e.phase === 'ideation') ? 'bg-purple-500/30 text-purple-400 animate-pulse' :
                          'bg-slate-800'
                        }`}>
                          {progressEvents.some(e => e.phase === 'ideation' && e.status === 'complete') ? '✓' : '2'}
                        </div>
                        <span className="text-sm font-bold">Ideation</span>
                      </div>

                      <div className={`flex items-center gap-3 ${progressEvents.some(e => e.phase === 'module_generation') ? 'text-white' : 'text-slate-600'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm ${
                          progressEvents.some(e => e.status === 'pipeline_complete') ? 'bg-emerald-500/30 text-emerald-400' :
                          progressEvents.some(e => e.phase === 'module_generation') ? 'bg-emerald-500/30 text-emerald-400 animate-pulse' :
                          'bg-slate-800'
                        }`}>
                          {progressEvents.some(e => e.status === 'pipeline_complete') ? '✓' : '3'}
                        </div>
                        <span className="text-sm font-bold">Module Generation</span>
                      </div>
                    </div>

                    {/* Summary when complete */}
                    {completedSummary && (
                      <div className="mt-8 pt-6 border-t border-slate-800 space-y-3">
                        <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Results</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-slate-400">Research Categories</span>
                            <span className="text-white font-bold">{completedSummary.expertCategories || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Questions Answered</span>
                            <span className="text-white font-bold">{completedSummary.questionsAnswered || 0}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Modules Generated</span>
                            <span className="text-emerald-400 font-bold">{completedSummary.modulesGenerated || 0}</span>
                          </div>
                          {completedSummary.modulesFailed > 0 && (
                            <div className="flex justify-between">
                              <span className="text-slate-400">Modules Failed</span>
                              <span className="text-red-400 font-bold">{completedSummary.modulesFailed}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Continue Button */}
                    {generationComplete && (
                      <div className="mt-8">
                        <button
                          onClick={handleCloseOverlay}
                          className="w-full py-4 bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 transition-all text-sm uppercase tracking-widest"
                        >
                          Continue
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    <div className="h-full flex">
      {/* Left Panel - Pack List */}
      <div className="w-96 border-r border-slate-200 bg-slate-50 flex flex-col">
        <div className="p-6 border-b border-slate-200 bg-white">
          <h2 className={UI.text.h2}>Module Packs</h2>
          <p className="text-slate-500 text-sm mt-1">AI-generated application modules</p>
        </div>

        <div className="p-4 space-y-2">
          <button
            onClick={() => { setShowCreateForm(true); setShowPackFromExisting(false); }}
            className={`${UI.button.action} w-full`}
          >
            + Create with AI Research
          </button>
          {unpackedManifests.length > 0 && (
            <button
              onClick={() => { setShowPackFromExisting(true); setShowCreateForm(false); }}
              className={`${UI.button.secondary} w-full`}
            >
              Pack Existing Modules ({unpackedManifests.length})
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center text-slate-400 py-8">Loading...</div>
          ) : modulePacks.length === 0 ? (
            <div className="text-center text-slate-400 py-8">
              No module packs yet.<br />Create one to get started.
            </div>
          ) : (
            modulePacks.map(pack => (
              <div
                key={pack.id}
                onClick={() => setSelectedPack(pack)}
                className={`${UI.card} p-4 cursor-pointer transition-all hover:shadow-xl ${
                  selectedPack?.id === pack.id ? 'ring-2 ring-emerald-500' : ''
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-slate-900 truncate">{pack.name}</h3>
                    <p className="text-xs text-slate-500 mt-1 truncate">
                      {pack.config.region}
                    </p>
                  </div>
                  <div className={`w-2 h-2 rounded-full ${getStatusColor(pack.status)} ml-2 mt-1`} />
                </div>

                <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    pack.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    pack.status === 'failed' ? 'bg-red-100 text-red-700' :
                    pack.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {pack.status}
                  </span>
                  {pack.progress.modules_generated > 0 && (
                    <span>{pack.progress.modules_generated} modules</span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Panel - Details or Create Form */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {showPackFromExisting ? (
          // Pack from Existing Modules Form
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className={UI.text.h2}>Pack Existing Modules</h2>
                <button
                  onClick={() => setShowPackFromExisting(false)}
                  className="text-slate-400 hover:text-slate-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                <div>
                  <label className={UI.text.label}>Pack Name *</label>
                  <input
                    type="text"
                    value={packFromExistingName}
                    onChange={e => setPackFromExistingName(e.target.value)}
                    placeholder="e.g., My Custom Module Pack"
                    className={`${UI.input} mt-2`}
                  />
                </div>

                <div>
                  <label className={UI.text.label}>Select Modules to Include</label>
                  <p className="text-xs text-slate-500 mt-1 mb-3">
                    Choose modules from your active list to bundle into a pack
                  </p>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {unpackedManifests.map(manifest => (
                      <label
                        key={manifest.id}
                        className={`flex items-center gap-3 p-4 rounded-xl cursor-pointer transition-all ${
                          selectedManifestIds.includes(manifest.id)
                            ? 'bg-emerald-50 border-2 border-emerald-500'
                            : 'bg-slate-50 border-2 border-transparent hover:bg-slate-100'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedManifestIds.includes(manifest.id)}
                          onChange={e => {
                            if (e.target.checked) {
                              setSelectedManifestIds([...selectedManifestIds, manifest.id]);
                            } else {
                              setSelectedManifestIds(selectedManifestIds.filter(id => id !== manifest.id));
                            }
                          }}
                          className="w-5 h-5 rounded text-emerald-600"
                        />
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900">
                            {manifest.domains?.[0]?.title || manifest.id}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {manifest.config?.region} • {manifest.domains?.length || 0} domains • {
                              manifest.domains?.reduce((sum, d) => sum + (d.fields?.length || 0), 0) || 0
                            } fields
                          </p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => {
                      setShowPackFromExisting(false);
                      setSelectedManifestIds([]);
                      setPackFromExistingName('');
                    }}
                    className={`${UI.button.secondary} flex-1`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      if (!packFromExistingName || selectedManifestIds.length === 0) {
                        alert('Please enter a name and select at least one module');
                        return;
                      }
                      // Create pack with existing manifests
                      try {
                        const res = await fetch(`${API_BASE}/from-existing`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            name: packFromExistingName,
                            manifestIds: selectedManifestIds
                          })
                        });
                        if (res.ok) {
                          fetchModulePacks();
                          setShowPackFromExisting(false);
                          setSelectedManifestIds([]);
                          setPackFromExistingName('');
                        }
                      } catch (err) {
                        console.error('Failed to create pack:', err);
                      }
                    }}
                    disabled={!packFromExistingName || selectedManifestIds.length === 0}
                    className={`${UI.button.action} flex-1`}
                  >
                    Create Pack ({selectedManifestIds.length} modules)
                  </button>
                </div>

                {/* Clear Modules Option */}
                {onClearManifests && unpackedManifests.length > 0 && (
                  <div className="pt-6 border-t border-slate-200">
                    <button
                      onClick={() => {
                        if (confirm('Clear all unpacked modules from your active list?')) {
                          onClearManifests();
                        }
                      }}
                      className="text-sm text-red-500 hover:text-red-700 font-bold"
                    >
                      Clear All Unpacked Modules
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : showCreateForm ? (
          // Create Form
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-2xl mx-auto p-8">
              <div className="flex items-center justify-between mb-8">
                <h2 className={UI.text.h2}>Create Module Pack</h2>
                <button
                  onClick={() => setShowCreateForm(false)}
                  className="text-slate-400 hover:text-slate-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-6">
                {/* Row 1: Region and Project Name */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={UI.text.label}>Jurisdiction / Region *</label>
                    <input
                      type="text"
                      value={formData.region}
                      onChange={e => setFormData({ ...formData, region: e.target.value })}
                      placeholder="e.g., Sydney, Australia"
                      className={`${UI.input} mt-2`}
                    />
                  </div>
                  <div>
                    <label className={UI.text.label}>Project Name</label>
                    <input
                      type="text"
                      value={formData.projectName}
                      onChange={e => setFormData({ ...formData, projectName: e.target.value, name: e.target.value || formData.name })}
                      placeholder="e.g., Emergency Health Node"
                      className={`${UI.input} mt-2`}
                    />
                  </div>
                </div>

                {/* Row 2: Locale and Funding Body */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={UI.text.label}>Locale / Language</label>
                    <select
                      value={formData.locale}
                      onChange={e => setFormData({ ...formData, locale: e.target.value })}
                      className={`${UI.input} mt-2`}
                    >
                      <option value="en-US">English (US)</option>
                      <option value="en-GB">English (UK)</option>
                      <option value="en-AU">English (Australia)</option>
                      <option value="es-ES">Spanish (Spain)</option>
                      <option value="es-MX">Spanish (Mexico)</option>
                      <option value="fr-FR">French (France)</option>
                      <option value="pt-BR">Portuguese (Brazil)</option>
                      <option value="sw-KE">Swahili (Kenya)</option>
                      <option value="ar-SA">Arabic (Saudi Arabia)</option>
                      <option value="hi-IN">Hindi (India)</option>
                      <option value="zh-CN">Chinese (Simplified)</option>
                      <option value="de-DE">German (Germany)</option>
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      Field labels and options will be generated in this language
                    </p>
                  </div>
                  <div>
                    <label className={UI.text.label}>Funding Body / Organization</label>
                    <input
                      type="text"
                      value={formData.fundingBody}
                      onChange={e => setFormData({ ...formData, fundingBody: e.target.value })}
                      placeholder="e.g., WHO, USAID, Local Ministry"
                      className={`${UI.input} mt-2`}
                    />
                  </div>
                  <div>
                    <label className={UI.text.label}>Focus Domains (comma separated) *</label>
                    <input
                      type="text"
                      value={formData.domains}
                      onChange={e => setFormData({ ...formData, domains: e.target.value })}
                      placeholder="e.g., Mental Health, Legal Aid, Shelter"
                      className={`${UI.input} mt-2`}
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      Separate specific focus areas with commas. These will drive the document search.
                    </p>
                  </div>
                </div>

                {/* Topic / Service Domain */}
                <div>
                  <label className={UI.text.label}>Topic / Service Domain *</label>
                  <textarea
                    value={formData.topic}
                    onChange={e => setFormData({ ...formData, topic: e.target.value })}
                    placeholder="Describe the service domain you want to build modules for. Be specific about the type of services, target population, and key requirements."
                    rows={3}
                    className={`${UI.input} mt-2`}
                  />
                </div>

                {/* Compliance Documents Upload */}
                <div>
                  <label className={UI.text.label}>Upload Compliance Documents (Optional)</label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="mt-2 border-2 border-dashed border-slate-300 rounded-2xl p-8 text-center cursor-pointer hover:border-emerald-500 hover:bg-emerald-50/50 transition-all"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept=".pdf,.txt,.doc,.docx"
                      className="hidden"
                      onChange={e => {
                        if (e.target.files) {
                          setComplianceFiles(Array.from(e.target.files));
                        }
                      }}
                    />
                    <div className="text-4xl mb-2">📄</div>
                    {complianceFiles.length > 0 ? (
                      <div>
                        <p className="font-bold text-emerald-600">{complianceFiles.length} file(s) selected</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {complianceFiles.map(f => f.name).join(', ')}
                        </p>
                      </div>
                    ) : (
                      <>
                        <p className="font-bold text-slate-600">Click to upload compliance documents</p>
                        <p className="text-xs text-slate-500 mt-1">
                          PDF, TXT, DOC, DOCX (legislation, WHO standards, local regulations)
                        </p>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Upload your compliance documents and the AI will extract requirements to generate forms.
                  </p>
                </div>

                {/* Additional Context */}
                <div>
                  <label className={UI.text.label}>Additional Requirements & Local Context</label>
                  <textarea
                    value={formData.additionalContext}
                    onChange={e => setFormData({ ...formData, additionalContext: e.target.value })}
                    placeholder="Any specific requirements, compliance needs, local context, or constraints..."
                    rows={4}
                    className={`${UI.input} mt-2`}
                  />
                </div>

                {/* Research Depth */}
                <div>
                  <label className={UI.text.label}>Research Depth</label>
                  <div className="flex gap-3 mt-2">
                    {(['quick', 'standard', 'comprehensive'] as const).map(depth => (
                      <button
                        key={depth}
                        type="button"
                        onClick={() => setFormData({ ...formData, researchDepth: depth })}
                        className={`flex-1 py-3 px-4 rounded-xl font-bold text-sm transition-all ${
                          formData.researchDepth === depth
                            ? 'bg-emerald-600 text-white shadow-lg'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {depth.charAt(0).toUpperCase() + depth.slice(1)}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    {formData.researchDepth === 'quick' && 'Fast research, basic coverage'}
                    {formData.researchDepth === 'standard' && 'Balanced research with good coverage'}
                    {formData.researchDepth === 'comprehensive' && 'Deep research using Google Deep Research API'}
                  </p>
                </div>

                <div className="pt-4 flex gap-3">
                  <button
                    onClick={() => createModulePack(false)}
                    disabled={creating}
                    className={`${UI.button.secondary} flex-1`}
                  >
                    Save Draft
                  </button>
                  <button
                    onClick={() => createModulePack(true)}
                    disabled={creating}
                    className={`${UI.button.action} flex-1`}
                  >
                    {creating ? 'Creating...' : 'Create & Generate'}
                  </button>
                </div>
              </div>

              {/* Progress Display */}
              {(progressEvents.length > 0 || activeGeneration) && (
                <div className="mt-8 bg-slate-900 rounded-2xl p-6 text-white">
                  <h3 className="font-bold mb-4">Generation Progress</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-sm">
                    {progressEvents.map((event, i) => (
                      <div key={i} className={`flex items-start gap-2 ${
                        event.status === 'failed' ? 'text-red-400' :
                        event.status === 'complete' || event.status === 'success' ? 'text-emerald-400' :
                        'text-slate-300'
                      }`}>
                        <span>{getPhaseIcon(event.phase)}</span>
                        <span>{event.message}</span>
                      </div>
                    ))}
                    {activeGeneration && (
                      <div className="flex items-center gap-2 text-blue-400">
                        <span className="animate-spin">⟳</span>
                        <span>Processing...</span>
                      </div>
                    )}
                    <div ref={progressEndRef} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : selectedPack ? (
          // Pack Details
          <div className="flex-1 overflow-y-auto">
            <div className="p-8">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h2 className={UI.text.h2}>{selectedPack.name}</h2>
                  <p className="text-slate-500 mt-1">{selectedPack.config.region}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                    selectedPack.status === 'completed' ? 'bg-emerald-100 text-emerald-700' :
                    selectedPack.status === 'failed' ? 'bg-red-100 text-red-700' :
                    selectedPack.status === 'partial' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-100 text-slate-600'
                  }`}>
                    {selectedPack.status}
                  </span>
                  {selectedPack.progress_log && selectedPack.progress_log.length > 0 && (
                    <button
                      onClick={() => {
                        // Load the saved progress log into the overlay
                        setProgressEvents(selectedPack.progress_log!.map(log => ({
                          phase: log.phase,
                          status: log.status,
                          message: log.message,
                          timestamp: log.timestamp
                        })));
                        setActiveGeneration(selectedPack.name);
                        setGenerationComplete(true);
                        setShowOverlay(true);
                      }}
                      className="px-3 py-1 text-sm font-bold text-slate-500 hover:text-slate-700 transition-colors"
                      title="View Generation Log"
                    >
                      📋 Log
                    </button>
                  )}
                  <button
                    onClick={() => deletePack(selectedPack.id)}
                    className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                  >
                    🗑
                  </button>
                </div>
              </div>

              {/* Original Request */}
              <div className={`${UI.card} p-6 mb-6`}>
                <h3 className={`${UI.text.label} mb-3`}>Original Request</h3>
                <p className="text-slate-700">{selectedPack.original_request.prompt}</p>
                {selectedPack.original_request.domains.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {selectedPack.original_request.domains.map((d, i) => (
                      <span key={i} className="px-2 py-1 bg-slate-100 rounded-lg text-xs font-medium text-slate-600">
                        {d}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Progress Steps */}
              <div className={`${UI.card} p-6 mb-6`}>
                <h3 className={`${UI.text.label} mb-4`}>Generation Pipeline</h3>
                <div className="space-y-4">
                  {/* Expert Research */}
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      selectedPack.progress.expert_mode_complete
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {selectedPack.progress.expert_mode_complete ? '✓' : '1'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900">Expert Research</h4>
                      <p className="text-sm text-slate-500">Deep research and domain expertise</p>
                    </div>
                    {!selectedPack.progress.expert_mode_complete && selectedPack.status === 'draft' && (
                      <button
                        onClick={() => runPhase(selectedPack.id, 'expert-research')}
                        disabled={!!activeGeneration}
                        className={UI.button.secondary}
                      >
                        Run
                      </button>
                    )}
                  </div>

                  {/* Ideation */}
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      selectedPack.progress.ideation_complete
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {selectedPack.progress.ideation_complete ? '✓' : '2'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900">Ideation</h4>
                      <p className="text-sm text-slate-500">Self-interview and requirements synthesis</p>
                    </div>
                    {selectedPack.progress.expert_mode_complete && !selectedPack.progress.ideation_complete && (
                      <button
                        onClick={() => runPhase(selectedPack.id, 'ideation')}
                        disabled={!!activeGeneration}
                        className={UI.button.secondary}
                      >
                        Run
                      </button>
                    )}
                  </div>

                  {/* Module Generation */}
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg ${
                      selectedPack.progress.modules_generated > 0
                        ? 'bg-emerald-100 text-emerald-600'
                        : 'bg-slate-100 text-slate-400'
                    }`}>
                      {selectedPack.progress.modules_generated > 0 ? '✓' : '3'}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-slate-900">Module Generation</h4>
                      <p className="text-sm text-slate-500">
                        {selectedPack.progress.modules_generated > 0
                          ? `${selectedPack.progress.modules_generated} modules generated`
                          : `${selectedPack.progress.modules_planned} modules planned`}
                      </p>
                    </div>
                    {selectedPack.progress.ideation_complete && selectedPack.progress.modules_generated === 0 && (
                      <button
                        onClick={() => runPhase(selectedPack.id, 'generate-modules')}
                        disabled={!!activeGeneration}
                        className={UI.button.action}
                      >
                        Generate
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Expert Context Summary */}
              {selectedPack.expert_context?.summary && (
                <div className={`${UI.card} p-6 mb-6`}>
                  <h3 className={`${UI.text.label} mb-3`}>Expert Context</h3>
                  <p className="text-slate-700 text-sm">{selectedPack.expert_context.summary}</p>
                  {selectedPack.expert_context.key_insights && (
                    <div className="mt-4">
                      <h4 className="font-bold text-slate-900 text-sm mb-2">Key Insights</h4>
                      <ul className="space-y-1">
                        {selectedPack.expert_context.key_insights.slice(0, 5).map((insight, i) => (
                          <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                            <span className="text-emerald-500">•</span>
                            {insight}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Generated Modules */}
              {selectedPack.modules && selectedPack.modules.length > 0 && (
                <div className={`${UI.card} p-6 mb-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className={UI.text.label}>Generated Modules</h3>
                    <button
                      onClick={() => loadPackManifests(selectedPack)}
                      className={UI.button.action}
                    >
                      Load All Modules
                    </button>
                  </div>
                  <div className="space-y-3">
                    {selectedPack.modules.map((module, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl"
                      >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                          module.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {module.status === 'completed' ? '✓' : '✗'}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-bold text-slate-900">{module.title}</h4>
                          <p className="text-xs text-slate-500">
                            {module.module_type} • {module.fields_count || 0} fields
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Progress Display for Running Operations */}
              {progressEvents.length > 0 && (
                <div className="bg-slate-900 rounded-2xl p-6 text-white">
                  <h3 className="font-bold mb-4">Progress</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto font-mono text-sm">
                    {progressEvents.map((event, i) => (
                      <div key={i} className={`flex items-start gap-2 ${
                        event.status === 'failed' ? 'text-red-400' :
                        event.status === 'complete' || event.status === 'success' ? 'text-emerald-400' :
                        'text-slate-300'
                      }`}>
                        <span>{getPhaseIcon(event.phase)}</span>
                        <span>{event.message}</span>
                      </div>
                    ))}
                    {activeGeneration && (
                      <div className="flex items-center gap-2 text-blue-400">
                        <span className="animate-spin">⟳</span>
                        <span>Processing...</span>
                      </div>
                    )}
                    <div ref={progressEndRef} />
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          // Empty State
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <div className="text-6xl mb-4">📦</div>
              <h3 className="text-xl font-bold text-slate-600">Select a Module Pack</h3>
              <p className="mt-2">Or create a new one to get started</p>
            </div>
          </div>
        )}
      </div>
    </div>
    </>
  );
}
