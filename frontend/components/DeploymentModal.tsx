import React, { useState } from 'react';
import { UI } from './DesignSystem';
import { BuildContext } from '../services/geminiService';

interface DeploymentModalProps {
  onBuild: (ctx: BuildContext) => void;
  onClose: () => void;
}

const DeploymentModal: React.FC<DeploymentModalProps> = ({ onBuild, onClose }) => {
  const [domainInput, setDomainInput] = useState('');
  const [customForm, setCustomForm] = useState<BuildContext>({
    region: '',
    domains: [],
    projectName: '',
    fundingBody: '',
    additionalContext: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.region || !domainInput) return;

    const parsedDomains = domainInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
    onBuild({
      ...customForm,
      domains: parsedDomains
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <div>
            <h3 className="text-3xl font-black italic tracking-tighter">Deep Research Agent</h3>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configure Research Parameters</p>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-200 rounded-full transition-colors">
            <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-12 space-y-8">
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Jurisdiction / Region</label>
              <input required placeholder="e.g. Sydney, Australia" className={UI.input} value={customForm.region} onChange={e => setCustomForm(prev => ({ ...prev, region: e.target.value }))} />
            </div>
            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Project Name</label>
              <input placeholder="e.g. Emergency Health Node" className={UI.input} value={customForm.projectName} onChange={e => setCustomForm(prev => ({ ...prev, projectName: e.target.value }))} />
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Funding Body / Organization</label>
            <input placeholder="e.g. WHO, USAID, Local Ministry" className={UI.input} value={customForm.fundingBody} onChange={e => setCustomForm(prev => ({ ...prev, fundingBody: e.target.value }))} />
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Focus Domains (comma separated)</label>
            <input 
              required 
              placeholder="e.g. Mental Health, Legal Aid, Shelter" 
              className={UI.input} 
              value={domainInput} 
              onChange={e => setDomainInput(e.target.value)} 
            />
            <p className="text-[9px] text-slate-400 font-bold px-1">Separate specific focus areas with commas. These will drive the document search.</p>
          </div>

          <div className="space-y-3">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Additional Requirements & Local Context</label>
            <textarea 
              placeholder="Detail specific regional laws, local customs, or specialized reporting needs. The more detail here, the better the form..." 
              className={`${UI.input} min-h-[140px] resize-none`} 
              value={customForm.additionalContext} 
              onChange={e => setCustomForm(prev => ({ ...prev, additionalContext: e.target.value }))} 
            />
          </div>
        </form>

        <div className="p-10 bg-slate-50 border-t border-slate-100">
           <button onClick={handleSubmit} className={`${UI.button.action} w-full py-6 text-xl`}>
             Generate Module Manifest
           </button>
        </div>
      </div>
    </div>
  );
};

export default DeploymentModal;
