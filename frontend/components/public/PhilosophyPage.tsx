import React from 'react';

interface PhilosophyPageProps {
  onNavigate: (path: string) => void;
}

const PhilosophyPage: React.FC<PhilosophyPageProps> = ({ onNavigate }) => {
  return (
    <div className="max-w-4xl mx-auto px-6 md:px-12 py-20">
      <div className="space-y-12">
        <div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs font-bold mb-6">
            <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
            Gemini 3 Global Hackathon Project
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-6">
            About Chameleon
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            An open-source platform that uses Gemini 3 AI to transform compliance documents into working software,
            built for organizations that need custom applications but lack resources.
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-8">
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-xl flex-shrink-0">
              🏆
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 mb-2">Built for Gemini 3 Hackathon</h2>
              <p className="text-slate-700 leading-relaxed">
                Created for the <a href="https://gemini3.devpost.com" target="_blank" rel="noreferrer" className="text-blue-600 font-semibold underline">Gemini 3 Global Hackathon</a> hosted
                by Google DeepMind and Devpost. This project showcases the power of Gemini 3's multimodal reasoning,
                long-context understanding, and autonomous agent capabilities.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3 mt-6">
            <a
              href="https://devpost.com/software/chameleon-protocol"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border-2 border-blue-300 text-blue-700 text-sm font-bold hover:bg-blue-50 transition-all"
            >
              View on Devpost →
            </a>
            <a
              href="https://github.com/raavin/Chameleon"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white border-2 border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all"
            >
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
              </svg>
              GitHub
            </a>
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8">
          <h2 className="text-2xl font-bold text-slate-900 mb-4">The Problem</h2>
          <p className="text-slate-700 leading-relaxed mb-4">
            NGOs, government agencies, and social programs often need custom data collection software to comply
            with regulations and track program outcomes. Traditional solutions are expensive, slow to develop,
            and require technical expertise most organizations don't have.
          </p>
          <p className="text-slate-700 leading-relaxed">
            Meanwhile, the requirements already exist—in PDFs of legislation, program guidelines, and compliance
            documents. The challenge is translating those documents into working software.
          </p>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Our Solution</h2>
          <p className="text-slate-700 leading-relaxed mb-4">
            Chameleon uses Gemini 3 to read compliance documents and automatically generate complete data collection
            applications. Upload a PDF of housing regulations, health protocols, or program requirements, and
            Chameleon creates:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-slate-700">
            <li>Structured data models with proper field types and validation rules</li>
            <li>User-friendly forms with conditional logic and workflows</li>
            <li>Offline-first architecture for field workers in low-connectivity areas</li>
            <li>Data export capabilities (Excel, PDF, API integration)</li>
            <li>A complete web application ready to deploy</li>
          </ul>
        </div>

        <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-4">Gemini 3 Integration</h2>
          <p className="text-slate-200 leading-relaxed mb-6">
            Chameleon leverages Gemini 3's advanced capabilities to transform static documents into intelligent applications:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <h3 className="font-bold text-emerald-300 mb-2">1M Token Context Window</h3>
              <p className="text-sm text-slate-300">
                Processes entire legislative documents, codebases, and policy manuals in a single context without chunking or RAG.
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <h3 className="font-bold text-emerald-300 mb-2">Multimodal Understanding</h3>
              <p className="text-sm text-slate-300">
                Analyzes PDFs with complex layouts, tables, and diagrams to extract structured requirements.
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <h3 className="font-bold text-emerald-300 mb-2">Deep Reasoning</h3>
              <p className="text-sm text-slate-300">
                Understands compliance rules, infers validation logic, and generates appropriate database schemas.
              </p>
            </div>
            <div className="bg-white/10 rounded-xl p-4 border border-white/20">
              <h3 className="font-bold text-emerald-300 mb-2">Structured Output</h3>
              <p className="text-sm text-slate-300">
                Generates valid JSON manifests with forms, workflows, and business logic ready for deployment.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Core Principles</h2>
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Accessibility First</h3>
              <p className="text-slate-700 leading-relaxed">
                No coding required. No expensive consultants. No vendor lock-in. If you can upload a PDF or
                describe your program, you can use Chameleon.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Built for the Field</h3>
              <p className="text-slate-700 leading-relaxed">
                Offline-first architecture means data collection works without internet. Sync automatically
                when connected. Designed for real-world conditions, not ideal lab environments.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Open Source Forever</h3>
              <p className="text-slate-700 leading-relaxed">
                Free to use, free to modify, free to deploy. Share templates through the marketplace or keep
                them private. No hidden costs, no usage limits, no credit card required.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Community-Driven</h3>
              <p className="text-slate-700 leading-relaxed">
                Built with input from NGOs, social workers, and field staff. Templates are shared across
                organizations. Improvements benefit everyone.
              </p>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Technical Approach</h2>
          <p className="text-slate-700 leading-relaxed mb-4">
            Chameleon combines Gemini 3 with proven web technologies:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-slate-700">
            <li><strong>AI Document Analysis:</strong> Gemini 3 extracts requirements, identifies data fields, and understands compliance rules from PDFs and text</li>
            <li><strong>Manifest Generation:</strong> AI creates structured JSON manifests defining forms, validation, workflows, and database schemas</li>
            <li><strong>Progressive Web App:</strong> Works on any device, installs like a native app, updates automatically</li>
            <li><strong>Offline-First Storage:</strong> Local-first architecture with automatic sync when connected</li>
            <li><strong>Template Marketplace:</strong> Share and reuse manifests across organizations and domains</li>
          </ul>
        </div>

        <div>
          <h2 className="text-2xl font-bold text-slate-900 mb-4">Who It's For</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">NGOs & Nonprofits</h3>
              <p className="text-sm text-slate-600">
                Track program outcomes, manage case files, ensure compliance with donor requirements—without
                hiring developers or buying expensive software.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Government Agencies</h3>
              <p className="text-sm text-slate-600">
                Implement new programs quickly, ensure regulatory compliance, collect standardized data across
                departments and regions.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Social Programs</h3>
              <p className="text-sm text-slate-600">
                Housing assistance, health clinics, legal aid, education programs—any service that needs
                structured data collection and compliance tracking.
              </p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">Field Workers</h3>
              <p className="text-sm text-slate-600">
                Collect data offline in remote areas, sync when connected, access forms on any device without
                training or technical support.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 text-white rounded-2xl p-8">
          <h2 className="text-2xl font-bold mb-4">Open Source</h2>
          <p className="text-slate-300 leading-relaxed mb-6">
            Chameleon is completely open source and free to use. View the code, contribute improvements,
            or deploy your own instance. Built for the Gemini 3 Global Hackathon and released to the community.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="https://github.com/raavin/Chameleon"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-white text-slate-900 text-sm font-bold hover:bg-slate-100 transition-all"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
              </svg>
              View on GitHub
            </a>
            <button
              onClick={() => onNavigate('/app')}
              className="px-6 py-3 rounded-xl border-2 border-white text-white text-sm font-bold hover:bg-white hover:text-slate-900 transition-all"
            >
              Try It Now →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhilosophyPage;
