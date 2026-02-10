import React from 'react';
import DocumentViewer from './DocumentViewer';
import { ResearchDoc } from './researchCatalog';

interface ResearchDocPageProps {
  doc: ResearchDoc;
  onNavigate: (path: string) => void;
}

const ResearchDocPage: React.FC<ResearchDocPageProps> = ({ doc, onNavigate }) => {
  const renderContent = () => {
    if (doc.extension === 'pdf' && doc.url) {
      return (
        <div className="space-y-6">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">📄</div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">PDF Document</h3>
                <p className="text-xs text-slate-600 mb-3">
                  This is a reference document that provides detailed guidelines and standards for this domain.
                </p>
                <a
                  href={doc.url}
                  className="inline-flex items-center gap-2 text-xs font-bold text-emerald-600 hover:text-emerald-700"
                  target="_blank"
                  rel="noreferrer"
                >
                  Open in new tab
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-slate-200 bg-white shadow-lg overflow-hidden">
            <object data={doc.url} type="application/pdf" className="w-full h-[75vh]">
              <div className="p-12 text-center">
                <div className="text-6xl mb-4">📄</div>
                <p className="text-slate-600 mb-4">
                  PDF preview unavailable in your browser.
                </p>
                <a
                  href={doc.url}
                  className="inline-block px-6 py-3 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors"
                  target="_blank"
                  rel="noreferrer"
                >
                  Download PDF
                </a>
              </div>
            </object>
          </div>
        </div>
      );
    }

    if (doc.extension === 'json' && doc.content) {
      let formatted = doc.content;
      try {
        formatted = JSON.stringify(JSON.parse(doc.content), null, 2);
      } catch (error) {
        formatted = doc.content;
      }
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">📊</div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">JSON Data</h3>
                <p className="text-xs text-slate-600">
                  Structured data format containing standards, guidelines, or configuration for this domain.
                </p>
              </div>
            </div>
          </div>
          <pre className="bg-slate-900 text-emerald-100 rounded-2xl p-6 overflow-x-auto text-xs leading-relaxed font-mono">
            {formatted}
          </pre>
        </div>
      );
    }

    if (doc.content) {
      return (
        <div className="space-y-4">
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="text-3xl">📝</div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 mb-1">Template Documentation</h3>
                <p className="text-xs text-slate-600">
                  {doc.summary}
                </p>
              </div>
            </div>
          </div>
          <DocumentViewer content={doc.content} />
        </div>
      );
    }

    return (
      <div className="text-center py-12">
        <div className="text-6xl mb-4">📭</div>
        <p className="text-slate-500">Document content is not available.</p>
      </div>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-12 py-16 md:py-20 space-y-8">
      <button
        onClick={() => onNavigate('/research')}
        className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"/>
        </svg>
        Back to Templates
      </button>

      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg">
            {doc.category}
          </span>
          <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-3 py-1.5 rounded-lg">
            {doc.extension}
          </span>
        </div>
        <h1 className="text-4xl md:text-5xl font-black text-slate-900">{doc.title}</h1>
        <p className="text-lg text-slate-600 max-w-3xl">
          {doc.summary}
        </p>
      </header>

      <section className="bg-white rounded-3xl border border-slate-200 p-8 md:p-10 shadow-sm">
        {renderContent()}
      </section>
    </div>
  );
};

export default ResearchDocPage;
