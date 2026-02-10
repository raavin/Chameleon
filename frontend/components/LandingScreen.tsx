
import React, { useState } from 'react';
import { UI } from './DesignSystem';
import { BuildContext } from '../services/geminiService';

const researchFiles = import.meta.glob('../research/*.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

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
  const [showBuilder, setShowBuilder] = useState(false);
  const [region, setRegion] = useState('');
  const [domains, setDomains] = useState('');
  const [projectName, setProjectName] = useState('');
  const [additionalContext, setAdditionalContext] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setUploadedFiles(Array.from(e.target.files));
    }
  };

  const handleCustomBuild = async () => {
    if (!region.trim() || !domains.trim()) {
      alert('Please provide at least a region and domain(s)');
      return;
    }

    let contextText = additionalContext;

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

    const domainList = domains.split(',').map(d => d.trim()).filter(Boolean);

    onBuild({
      region: region.trim(),
      domains: domainList,
      projectName: projectName.trim() || undefined,
      additionalContext: contextText || undefined
    });
  };

  if (showBuilder) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-900">
        <div className="max-w-4xl mx-auto px-6 md:px-12 py-12 md:py-20">
          <button
            onClick={() => setShowBuilder(false)}
            className="mb-8 text-sm font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
            </svg>
            Back to Templates
          </button>

          <div className="bg-white rounded-3xl border border-slate-200 p-8 md:p-12 shadow-sm space-y-8">
            <div>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900 mb-2">
                Create Custom Module
              </h2>
              <p className="text-slate-600">
                Describe your program or upload compliance documents to generate a custom data collection system
              </p>
            </div>

            <div className="space-y-6">
              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Region / Location *
                </label>
                <input
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="e.g., Nairobi, Kenya"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Domains (comma-separated) *
                </label>
                <input
                  type="text"
                  value={domains}
                  onChange={(e) => setDomains(e.target.value)}
                  placeholder="e.g., Maternal Health, Prenatal Care, Birth Outcomes"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
                <p className="text-xs text-slate-500 mt-2">
                  Separate multiple domains with commas
                </p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Project Name (optional)
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="e.g., Maternal Health Tracking Program"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Upload Documents (optional)
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center hover:border-emerald-400 transition-colors">
                  <input
                    type="file"
                    multiple
                    accept=".pdf,.txt,.doc,.docx"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <div className="text-4xl mb-3">📄</div>
                    <p className="text-sm font-semibold text-slate-700 mb-1">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-slate-500">
                      PDF, TXT, DOC, DOCX (legislation, standards, guidelines)
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
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-900 mb-2">
                  Additional Context (optional)
                </label>
                <textarea
                  value={additionalContext}
                  onChange={(e) => setAdditionalContext(e.target.value)}
                  placeholder="Describe your program, specific requirements, or paste relevant text from regulations..."
                  rows={6}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
                />
                <p className="text-xs text-slate-500 mt-2">
                  The more detail you provide, the better the AI can tailor the forms to your needs
                </p>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                onClick={handleCustomBuild}
                className="flex-1 px-6 py-4 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg"
              >
                Generate Module →
              </button>
              <button
                onClick={() => setShowBuilder(false)}
                className="px-6 py-4 rounded-xl border-2 border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto px-6 md:px-12 py-12 md:py-20">
        <header className="mb-16 text-center">
          <h1 className="text-4xl md:text-6xl font-black text-slate-900 mb-4">
            Generate Your Data Collection System
          </h1>
          <p className="text-lg md:text-xl text-slate-600 max-w-3xl mx-auto">
            Start with a template or create a custom module by uploading your compliance documents
          </p>
        </header>

        <div className="grid lg:grid-cols-2 gap-8 mb-12">
          <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">Quick Start Templates</h3>
            <p className="text-slate-600 mb-6">
              Pre-configured modules for common use cases. Click to generate instantly.
            </p>
            <div className="space-y-4">
              {TEMPLATES.map(ctx => (
                <button
                  key={ctx.region}
                  onClick={() => onBuild({ region: ctx.region, domains: ctx.domains, projectName: `${ctx.domains[0]} Program` })}
                  className="w-full group p-6 bg-slate-50 border border-slate-200 rounded-2xl text-left hover:border-emerald-500 hover:bg-white hover:shadow-lg transition-all"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <div className="text-2xl mb-2">{ctx.emoji}</div>
                      <h4 className="text-lg font-bold text-slate-900">{ctx.region}</h4>
                      <p className="text-sm text-slate-500 mt-1">{ctx.domains.join(' • ')}</p>
                    </div>
                    <svg className="w-6 h-6 text-slate-300 group-hover:text-emerald-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/>
                    </svg>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="bg-gradient-to-br from-emerald-50 to-white rounded-3xl border border-emerald-200 p-8 shadow-sm">
            <div className="text-4xl mb-4">🎯</div>
            <h3 className="text-2xl font-bold text-slate-900 mb-3">Custom Module Builder</h3>
            <p className="text-slate-600 mb-6">
              Upload your compliance documents (WHO standards, local regulations, donor requirements) and let AI generate the exact forms you need.
            </p>
            <ul className="space-y-3 mb-8">
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                <span className="text-sm text-slate-700">Upload PDFs, Word docs, or paste text</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                <span className="text-sm text-slate-700">AI reads and extracts requirements</span>
              </li>
              <li className="flex items-start gap-3">
                <svg className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                </svg>
                <span className="text-sm text-slate-700">Get compliance-ready forms in minutes</span>
              </li>
            </ul>
            <button
              onClick={() => setShowBuilder(true)}
              className="w-full px-6 py-4 rounded-xl bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg"
            >
              Build Custom Module →
            </button>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={onEnterDirectory}
            className="text-sm font-semibold text-slate-600 hover:text-slate-900 underline"
          >
            Or browse existing client directory →
          </button>
        </div>
      </div>
    </div>
  );
};

export default LandingScreen;
