
import React, { useState, useEffect, useRef } from 'react';
import { Domain, Field, LegislationLibrary, FieldType } from '../types';
import LegislationViewer from './LegislationViewer';
import { UI } from './DesignSystem';

interface EngineProps {
  domain: Domain;
  currency: string;
  library: LegislationLibrary;
  onSuccess?: (data: any) => void;
  prefillData?: Record<string, any>;
  readOnly?: boolean;
}

const Engine: React.FC<EngineProps> = ({ domain, currency, library, onSuccess, prefillData, readOnly }) => {
  // Ensure we always have an object, and defaults are handled
  const [formData, setFormData] = useState<Record<string, any>>(prefillData || {});
  const [sectionIndex, setSectionIndex] = useState(0);
  const [activeCitation, setActiveCitation] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state if prefill data changes (e.g. mounting a new intake vs historical review)
  useEffect(() => {
    setFormData(prefillData || {});
    setSectionIndex(0);
  }, [prefillData, domain]);

  const currentSection = domain.sections[sectionIndex];
  const progress = ((sectionIndex + 1) / domain.sections.length) * 100;

  const handleFieldChange = (id: string, val: any) => {
    if (readOnly) return;
    setFormData(prev => ({ ...prev, [id]: val }));
  };

  const renderField = (field: Field) => {
    const isFieldReadOnly = readOnly || false;
    const value = formData[field.id] !== undefined ? formData[field.id] : (field.default_value || '');
    const inputClasses = `${UI.input} ${isFieldReadOnly ? 'bg-slate-100 border-slate-200 text-slate-500 cursor-default' : ''}`;

    switch (field.type) {
      case 'textarea':
        return (
          <textarea 
            readOnly={isFieldReadOnly} 
            className={`${inputClasses} min-h-[100px]`} 
            value={value} 
            onChange={e => handleFieldChange(field.id, e.target.value)} 
          />
        );
      case 'select':
        return (
          <select 
            disabled={isFieldReadOnly} 
            className={inputClasses} 
            value={value} 
            onChange={e => handleFieldChange(field.id, e.target.value)}
          >
            <option value="">Select option...</option>
            {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        );
      case 'multiselect':
        return (
          <div className="grid grid-cols-2 gap-1.5">
            {field.options?.map(opt => {
              const selected = (Array.isArray(value) ? value : []).includes(opt);
              return (
                <button
                  key={opt}
                  type="button"
                  disabled={isFieldReadOnly}
                  onClick={() => {
                    const current = Array.isArray(value) ? value : [];
                    const next = selected ? current.filter((x: string) => x !== opt) : [...current, opt];
                    handleFieldChange(field.id, next);
                  }}
                  className={`px-3 py-2 rounded-lg border text-[10px] font-bold transition-all ${selected ? 'bg-emerald-100 border-emerald-500 text-emerald-800' : 'bg-slate-50 border-slate-200 text-slate-500 hover:text-slate-900'}`}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        );
      case 'date':
        return <input readOnly={isFieldReadOnly} type="date" className={inputClasses} value={value} onChange={e => handleFieldChange(field.id, e.target.value)} />;
      case 'number':
        return (
          <div className="relative">
            <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 font-mono text-xs font-black">{currency}</span>
            <input 
              readOnly={isFieldReadOnly} 
              type="number" 
              className={`${inputClasses} pl-16`} 
              value={value} 
              onChange={e => handleFieldChange(field.id, e.target.value)} 
            />
          </div>
        );
      case 'photo':
      case 'file':
        return (
          <div>
            <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFieldChange(field.id, `Artifact: ${f.name}`);
            }} />
            <button 
              type="button"
              disabled={isFieldReadOnly}
              onClick={() => fileInputRef.current?.click()}
              className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-dashed transition-all font-bold text-xs ${isFieldReadOnly ? 'border-slate-200 bg-slate-50 text-slate-300' : 'border-slate-300 bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
              <span>{field.type === 'photo' ? '📷' : '📎'}</span>
              {value ? 'Stored' : `Upload`}
            </button>
          </div>
        );
      case 'relationship':
      case 'map':
        return (
          <div className={`bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2 ${isFieldReadOnly ? 'opacity-80' : ''}`}>
             <div className="flex justify-between items-center border-b border-slate-200 pb-2">
               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Relational Context</span>
               {!isFieldReadOnly && <button className="text-[9px] font-bold text-emerald-600 uppercase">+ Link</button>}
             </div>
             <textarea 
               readOnly={isFieldReadOnly}
               placeholder="Detail relationships..."
               className="w-full bg-white border border-slate-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-emerald-500 outline-none min-h-[80px] font-medium"
               value={value}
               onChange={e => handleFieldChange(field.id, e.target.value)}
             />
          </div>
        );
      case 'bool':
      case 'checkbox':
      case 'boolean':
        return (
          <div className="flex gap-2">
            {[true, false].map(v => (
              <button
                key={String(v)}
                type="button"
                disabled={isFieldReadOnly}
                onClick={() => handleFieldChange(field.id, v)}
                className={`flex-1 py-2.5 rounded-xl border font-bold text-xs transition-all ${value === v ? 'bg-emerald-600 text-white border-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-500'}`}
              >
                {v ? 'Yes' : 'No'}
              </button>
            ))}
          </div>
        );
      case 'tel':
      case 'email':
        return (
          <input 
            readOnly={isFieldReadOnly} 
            type={field.type === 'email' ? 'email' : 'tel'} 
            className={inputClasses} 
            placeholder={field.placeholder} 
            value={value} 
            onChange={e => handleFieldChange(field.id, e.target.value)} 
          />
        );
      case 'string':
      case 'text':
      default:
        return (
          <input 
            readOnly={isFieldReadOnly} 
            type="text" 
            className={inputClasses} 
            placeholder={field.placeholder} 
            value={value} 
            onChange={e => handleFieldChange(field.id, e.target.value)} 
          />
        );
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-6 duration-700">
      <div className="flex justify-between items-center px-2">
        <div>
          <p className={UI.text.label}>{readOnly ? 'Compliance Verification Mode' : `Protocol Node ${sectionIndex + 1} of ${domain.sections.length}`}</p>
          <h3 className="text-2xl font-black text-slate-900 mt-1 tracking-tight">{domain.title}</h3>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-lg font-black text-emerald-600">{Math.round(progress)}%</div>
          <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-emerald-500 transition-all duration-500" style={{width: `${progress}%`}}></div>
          </div>
        </div>
      </div>

      <div className={UI.card}>
        {/* Section Tabs */}
        <div className="border-b border-slate-200 bg-slate-50/50">
          <div className="flex overflow-x-auto scrollbar-hide">
            {domain.sections.map((section, idx) => (
              <button
                key={section.id}
                onClick={() => {
                  setSectionIndex(idx);
                  window.scrollTo({top: 0, behavior: 'smooth'});
                }}
                className={`flex-shrink-0 px-6 py-3 text-[10px] font-black uppercase tracking-widest border-b-2 transition-all ${
                  idx === sectionIndex 
                    ? 'border-emerald-500 text-emerald-700 bg-white' 
                    : 'border-transparent text-slate-400 hover:text-slate-600 hover:bg-slate-100'
                }`}
              >
                {section.title}
              </button>
            ))}
          </div>
        </div>

        {/* Section Description */}
        {currentSection.description && (
          <div className="px-8 py-4 bg-slate-50 border-b border-slate-100">
            <p className="text-sm text-slate-500 font-medium">{currentSection.description}</p>
          </div>
        )}

        {/* Fields Grid */}
        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          {currentSection.field_ids.map(fid => {
            const field = domain.fields.find(f => f.id === fid);
            if (!field) return null;
            return (
              <div key={field.id} className={`space-y-2 ${field.ui_config?.grid_span === 2 ? 'md:col-span-2' : ''}`}>
                <div className="flex justify-between items-center">
                  <label className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-2">
                    {field.label}
                    {field.is_identity_field && <span className="text-[8px] bg-slate-900 text-white px-1.5 py-0.5 rounded-full font-black">ID</span>}
                  </label>
                  {field.section_citation && (
                    <button 
                      onClick={() => setActiveCitation(field.section_citation!)}
                      className="text-[9px] font-black text-emerald-600 uppercase tracking-widest hover:underline"
                    >
                      §
                    </button>
                  )}
                </div>
                {renderField(field)}
                {field.ui_config?.help_text && <p className="text-[9px] text-slate-400 font-medium">{field.ui_config.help_text}</p>}
              </div>
            );
          })}
        </div>

        {/* Footer Actions */}
        <div className="px-8 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center">
          <button 
            disabled={sectionIndex === 0}
            onClick={() => {
              setSectionIndex(prev => prev - 1);
              window.scrollTo({top: 0, behavior: 'smooth'});
            }}
            className="px-6 py-2.5 font-black rounded-lg text-xs uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all disabled:opacity-30"
          >
            ← Back
          </button>
          
          <div className="flex gap-3">
             {readOnly && sectionIndex === domain.sections.length - 1 && (
               <div className="px-6 py-2.5 bg-slate-900 text-emerald-400 font-black rounded-xl text-xs uppercase tracking-widest">
                 SEALED RECORD
               </div>
             )}
             
             {sectionIndex < domain.sections.length - 1 ? (
               <button 
                 onClick={() => { setSectionIndex(prev => prev + 1); window.scrollTo({top: 0, behavior: 'smooth'}); }}
                 className={UI.button.primary}
               >
                 Next →
               </button>
             ) : (
               !readOnly && (
                <button 
                  onClick={() => { setIsSubmitting(true); setTimeout(() => onSuccess?.(formData), 1200); }}
                  className={UI.button.action}
                >
                  {isSubmitting ? 'Syncing...' : 'Finalize'}
                </button>
               )
             )}
          </div>
        </div>
      </div>

      <LegislationViewer citationId={activeCitation} library={library} onClose={() => setActiveCitation(null)} />
    </div>
  );
};

export default Engine;
