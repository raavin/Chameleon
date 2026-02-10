/**
 * ClassificationConfirmation - Review and confirm domain classification
 * Shows classified domain, ontology capabilities, regional factors, research tracks
 */

import { useState } from 'react';
import type { DomainClassification } from '../types';

interface ClassificationConfirmationProps {
  classification: DomainClassification;
  onConfirm: (adjustments?: any) => void;
  onReclassify: () => void;
}

export default function ClassificationConfirmation({
  classification,
  onConfirm,
  onReclassify
}: ClassificationConfirmationProps) {
  const [primaryDomain, setPrimaryDomain] = useState(classification.primary_domain);
  const [subDomain, setSubDomain] = useState(classification.sub_domain);
  const [capabilities, setCapabilities] = useState(
    classification.ontology?.capabilities?.map(c => ({ ...c, enabled: true })) || []
  );
  const [researchTracks, setResearchTracks] = useState(
    classification.research_tracks_needed?.map(t => ({ text: t, enabled: true })) || []
  );
  const [newTrack, setNewTrack] = useState('');

  const toggleCapability = (index: number) => {
    setCapabilities(prev => prev.map((c, i) => i === index ? { ...c, enabled: !c.enabled } : c));
  };

  const handleConfirm = () => {
    const adjustments: any = {};
    if (primaryDomain !== classification.primary_domain) adjustments.primary_domain = primaryDomain;
    if (subDomain !== classification.sub_domain) adjustments.sub_domain = subDomain;

    const filteredCaps = capabilities.filter(c => c.enabled).map(({ enabled, ...rest }) => rest);
    if (filteredCaps.length !== classification.ontology?.capabilities?.length) {
      adjustments.capabilities = filteredCaps;
    }

    const filteredTracks = researchTracks.filter(t => t.enabled).map(t => t.text);
    if (filteredTracks.length !== classification.research_tracks_needed?.length) {
      adjustments.research_tracks_needed = filteredTracks;
    }

    onConfirm(Object.keys(adjustments).length > 0 ? adjustments : undefined);
  };

  const addTrack = () => {
    if (newTrack.trim()) {
      setResearchTracks(prev => [...prev, { text: newTrack.trim(), enabled: true }]);
      setNewTrack('');
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-3xl mx-auto">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-black text-white mb-2">Domain Classification</h2>
        <p className="text-slate-400 text-sm">Review and confirm the AI's domain classification before research begins</p>
      </div>

      {/* Domain Header */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Classified Domain</h3>
          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
            classification.confidence >= 0.8 ? 'bg-emerald-500/20 text-emerald-400' :
            classification.confidence >= 0.6 ? 'bg-amber-500/20 text-amber-400' :
            'bg-red-500/20 text-red-400'
          }`}>
            {Math.round(classification.confidence * 100)}% confidence
          </span>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Primary Domain</label>
            <input
              type="text"
              value={primaryDomain}
              onChange={e => setPrimaryDomain(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <div>
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Sub-Domain</label>
            <input
              type="text"
              value={subDomain}
              onChange={e => setSubDomain(e.target.value)}
              className="w-full mt-1 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {classification.secondary_domains?.length > 0 && (
          <div className="mt-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Secondary Domains</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {classification.secondary_domains.map((d, i) => (
                <span key={i} className="px-2 py-1 bg-white/10 rounded-lg text-xs text-slate-300">{d}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Ontology Capabilities */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">
          Ontology Capabilities ({capabilities.filter(c => c.enabled).length}/{capabilities.length} active)
        </h3>
        <div className="space-y-3">
          {capabilities.map((cap, i) => (
            <label
              key={i}
              className={`flex items-start gap-3 p-3 rounded-xl cursor-pointer transition-all ${
                cap.enabled ? 'bg-emerald-500/10 border border-emerald-500/30' : 'bg-white/5 border border-white/10 opacity-50'
              }`}
            >
              <input
                type="checkbox"
                checked={cap.enabled}
                onChange={() => toggleCapability(i)}
                className="mt-1 w-4 h-4 rounded text-emerald-600"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-white">{cap.name}</span>
                  {cap.mapped_module_type && (
                    <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded-full text-[9px] font-bold uppercase">
                      {cap.mapped_module_type}
                    </span>
                  )}
                </div>
                {cap.sub_capabilities?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {cap.sub_capabilities.map((sc, j) => (
                      <span key={j} className="text-[10px] text-slate-400 bg-white/5 px-2 py-0.5 rounded">{sc}</span>
                    ))}
                  </div>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Regional Factors */}
      {classification.regional_factors && (
        <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
          <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Regional Factors</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {classification.regional_factors.regulatory_bodies?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 mb-2">Regulatory Bodies</h4>
                <ul className="space-y-1">
                  {classification.regional_factors.regulatory_bodies.map((rb, i) => (
                    <li key={i} className="text-xs text-slate-300">{rb}</li>
                  ))}
                </ul>
              </div>
            )}
            {classification.regional_factors.key_legislation?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 mb-2">Key Legislation</h4>
                <ul className="space-y-1">
                  {classification.regional_factors.key_legislation.map((leg, i) => (
                    <li key={i} className="text-xs text-slate-300">{leg}</li>
                  ))}
                </ul>
              </div>
            )}
            {classification.regional_factors.cultural_considerations?.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 mb-2">Cultural Considerations</h4>
                <ul className="space-y-1">
                  {classification.regional_factors.cultural_considerations.map((cc, i) => (
                    <li key={i} className="text-xs text-slate-300">{cc}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Research Tracks */}
      <div className="bg-white/5 rounded-2xl p-6 border border-white/10">
        <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Research Tracks</h3>
        <div className="space-y-2">
          {researchTracks.map((track, i) => (
            <label key={i} className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/5 cursor-pointer">
              <input
                type="checkbox"
                checked={track.enabled}
                onChange={() => setResearchTracks(prev =>
                  prev.map((t, j) => j === i ? { ...t, enabled: !t.enabled } : t)
                )}
                className="w-4 h-4 rounded text-emerald-600"
              />
              <span className={`text-xs ${track.enabled ? 'text-slate-200' : 'text-slate-500 line-through'}`}>
                {track.text}
              </span>
            </label>
          ))}
        </div>
        <div className="flex gap-2 mt-3">
          <input
            type="text"
            value={newTrack}
            onChange={e => setNewTrack(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && addTrack()}
            placeholder="Add a research track..."
            className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-xl text-white text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={addTrack}
            disabled={!newTrack.trim()}
            className="px-4 py-2 bg-white/10 text-white rounded-xl text-xs font-bold hover:bg-white/20 disabled:opacity-30"
          >
            Add
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={onReclassify}
          className="flex-1 py-3 bg-white/10 text-white font-bold rounded-xl hover:bg-white/20 transition-all text-sm"
        >
          Re-classify
        </button>
        <button
          onClick={handleConfirm}
          className="flex-1 py-3 bg-emerald-600 text-white font-black rounded-xl shadow-lg shadow-emerald-500/30 hover:bg-emerald-700 transition-all text-sm uppercase tracking-widest"
        >
          Confirm & Continue
        </button>
      </div>
    </div>
  );
}
