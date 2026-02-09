import React, { useState } from 'react';
import { UI } from './DesignSystem';
import { BuildContext } from '../services/geminiService';

interface DeploymentModalProps {
  onBuild: (ctx: BuildContext) => void;
  onClose: () => void;
}

const DeploymentModal: React.FC<DeploymentModalProps> = ({ onBuild, onClose }) => {
  const [domainInput, setDomainInput] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [customForm, setCustomForm] = useState<BuildContext>({
    region: '',
    domains: [],
    projectName: '',
    fundingBody: '',
    additionalContext: ''
  });

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customForm.region || !domainInput) return;

    let contextText = customForm.additionalContext || '';

    if (uploadedFiles.length > 0) {
      contextText += '\n\n=== UPLOADED DOCUMENTS ===\n';
      for (const file of uploadedFiles) {
        try {
          const text = await file.text();
          contextText += `\n--- ${file.name} ---\n${text}\n`;
        } catch (err) {
          console.error(`Failed to read ${file.name}:`, err);
        }
      }
    }

    const parsedDomains = domainInput.split(',').map(s => s.trim()).filter(s => s.length > 0);
    onBuild({
      ...customForm,
      domains: parsedDomains,
      additionalContext: contextText
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
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Upload Compliance Documents (Optional)</label>
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-emerald-400 transition-colors">
              <input
                type="file"
                multiple
                accept=".pdf,.txt,.doc,.docx"
                onChange={handleFileUpload}
                className="hidden"
                id="deployment-file-upload"
              />
              <label htmlFor="deployment-file-upload" className="cursor-pointer">
                <div className="text-4xl mb-3">📄</div>
                <p className="text-sm font-semibold text-slate-700 mb-1">
                  Click to upload compliance documents
                </p>
                <p className="text-xs text-slate-500">
                  PDF, TXT, DOC, DOCX (legislation, WHO standards, local regulations)
                </p>
              </label>
            </div>
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                {uploadedFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                    <svg className="w-5 h-5 text-emerald-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/>
                    </svg>
                    <span className="text-sm font-semibold text-slate-900 flex-1">{file.name}</span>
                    <span className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</span>
                    <button
                      type="button"
                      onClick={() => setUploadedFiles(files => files.filter((_, i) => i !== idx))}
                      className="text-slate-400 hover:text-slate-600"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
            <p className="text-[9px] text-slate-400 font-bold px-1">Upload your compliance documents and the AI will extract requirements to generate forms.</p>
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
           <button type="submit" onClick={handleSubmit} className={`${UI.button.action} w-full py-6 text-xl`}>
             Generate Module Manifest
           </button>
        </div>
      </div>
    </div>
  );
};

export default DeploymentModal;
