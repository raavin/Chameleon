
import React, { useState } from 'react';
import { UI } from './DesignSystem';
import { BuildContext } from '../services/geminiService';

interface LandingScreenProps {
  onBuild: (ctx: BuildContext) => void;
  onEnterDirectory: () => void;
}

const TEMPLATES = [
  { region: 'Melbourne, Australia', domains: ['Family Violence Recovery', 'Crisis Housing'], emoji: '🇦🇺' },
  { region: 'Ho Chi Minh City, VN', domains: ['Public Health Outreach', 'Dengue Prevention'], emoji: '🇻🇳' },
  { region: 'Nairobi, Kenya', domains: ['Food Relief Logistics', 'Cash Transfers'], emoji: '🇰🇪' }
];

const LandingScreen: React.FC<LandingScreenProps> = ({ onBuild, onEnterDirectory }) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const [domainInput, setDomainInput] = useState(''); // Local state for raw text input
  const [customForm, setCustomForm] = useState<BuildContext>({
    region: '',
    domains: [],
    projectName: '',
    fundingBody: '',
    additionalContext: ''
  });

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.region || !domainInput) return;
    
    // Parse domains on submit
    const parsedDomains = domainInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
    
    onBuild({
      ...customForm,
      domains: parsedDomains
    });
    setIsAdvancedOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-24 min-h-screen flex flex-col">
        <header className="flex justify-between items-center mb-16 md:mb-24">
          <h1 className="text-3xl md:text-4xl font-black italic tracking-tighter">CHAMELEON<span className="text-emerald-600">.</span></h1>
          <nav className="flex gap-4 md:gap-8 text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-widest">
            <button onClick={onEnterDirectory} className="hover:text-slate-900 transition-colors">Client Directory</button>
            <button className="hover:text-slate-900 transition-colors">Documentation</button>
          </nav>
        </header>
        
        <main className="flex-1 grid lg:grid-cols-2 gap-16 md:gap-24 items-start">
          <div className="space-y-12">
            <div className="space-y-6">
              <span className="inline-block px-4 py-2 bg-emerald-50 text-emerald-700 text-[10px] font-black uppercase tracking-[0.2em] rounded-full border border-emerald-100">
                Statutory Intelligence Unit
              </span>
              <h2 className="text-6xl md:text-8xl font-black tracking-tight leading-[0.85] text-slate-900">
                Clinical Logic <br/>
                <span className="text-slate-400 underline decoration-emerald-200 decoration-[12px] underline-offset-8">Defined.</span>
              </h2>
              <p className="text-xl md:text-2xl text-slate-500 max-w-lg font-medium leading-relaxed">
                Translate complex regional legislation and WHO benchmarks into high-integrity, secure manifests for critical community services.
              </p>
            </div>

            <div className="flex flex-wrap gap-4 pt-4">
              <button 
                onClick={() => {
                  setDomainInput('');
                  setCustomForm({ region: '', domains: [], projectName: '', fundingBody: '', additionalContext: '' });
                  setIsAdvancedOpen(true);
                }} 
                className={UI.button.primary}
              >
                Advanced Deployment
              </button>
              <button onClick={onEnterDirectory} className={UI.button.secondary}>
                Browse Directory
              </button>
            </div>

            <div className="pt-12 border-t border-slate-200/60 hidden lg:block">
              <div className="flex gap-12">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Benchmarked</p>
                  <p className="font-bold text-slate-700 text-lg">WHO / UN / HRC</p>
                </div>
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Storage</p>
                  <p className="font-bold text-slate-700 text-lg">Local JSON Docs</p>
                </div>
              </div>
            </div>
          </div>

          <div className="w-full space-y-6">
            <p className={UI.text.label}>Regional Blueprints</p>
            <div className="grid grid-cols-1 gap-4">
              {TEMPLATES.map(ctx => (
                <button 
                  key={ctx.region}
                  onClick={() => onBuild({ region: ctx.region, domains: ctx.domains, projectName: `${ctx.domains[0]} Program` })}
                  className="group relative p-8 bg-white border border-slate-200 rounded-[2.5rem] text-left hover:border-emerald-500 hover:shadow-2xl transition-all duration-500"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-3xl mb-3">{ctx.emoji}</div>
                      <h3 className="text-2xl font-bold text-slate-900">{ctx.region}</h3>
                      <p className="text-sm text-slate-500 mt-1 font-medium">{ctx.domains.join(' • ')}</p>
                    </div>
                    <div className="w-14 h-14 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 group-hover:bg-emerald-600 group-hover:text-white group-hover:border-emerald-600 transition-all shadow-sm">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"></path></svg>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </main>

        <footer className="pt-12 border-t border-slate-100 flex flex-col md:flex-row gap-6 justify-between text-[10px] font-black text-slate-400 uppercase tracking-widest mt-auto">
          <div>Chameleon Protocol // Autonomous Compliance Sync: ACTIVE</div>
          <div className="flex gap-8">
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Identity Encrypted</span>
            <span className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> Stateless Persistence</span>
          </div>
        </footer>
      </div>

      {/* Advanced Deployment Modal */}
      {isAdvancedOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-3xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="text-3xl font-black italic tracking-tighter">Deep Deployment</h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Configure Statutory Research Parameters</p>
              </div>
              <button onClick={() => setIsAdvancedOpen(false)} className="p-3 hover:bg-slate-200 rounded-full transition-colors">
                <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            
            <form onSubmit={handleCustomSubmit} className="flex-1 overflow-y-auto p-12 space-y-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Jurisdiction / Region</label>
                  <input required placeholder="e.g. Sydney, Australia" className={UI.input} value={customForm.region} onChange={e => setCustomForm({...customForm, region: e.target.value})} />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Project Name</label>
                  <input placeholder="e.g. Emergency Health Node" className={UI.input} value={customForm.projectName} onChange={e => setCustomForm({...customForm, projectName: e.target.value})} />
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Funding Body / Organization</label>
                <input placeholder="e.g. WHO, USAID, Local Ministry" className={UI.input} value={customForm.fundingBody} onChange={e => setCustomForm({...customForm, fundingBody: e.target.value})} />
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
                  onChange={e => setCustomForm({...customForm, additionalContext: e.target.value})} 
                />
              </div>
            </form>

            <div className="p-10 bg-slate-50 border-t border-slate-100">
               <button onClick={handleCustomSubmit} className={`${UI.button.action} w-full py-6 text-xl`}>
                 Initiate Statutory Compilation
               </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LandingScreen;
