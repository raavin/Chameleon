import React, { useMemo, useState } from 'react';
import { researchDocs, getDocumentsByCategory } from './researchCatalog';

interface ResearchIndexPageProps {
  onNavigate: (path: string) => void;
}

const ResearchIndexPage: React.FC<ResearchIndexPageProps> = ({ onNavigate }) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  const documentsByCategory = useMemo(() => getDocumentsByCategory(), []);
  const categories = ['All', ...Object.keys(documentsByCategory).sort()];

  const filtered = useMemo(() => {
    const term = query.trim().toLowerCase();
    let docs = researchDocs;

    if (selectedCategory !== 'All') {
      docs = docs.filter(doc => doc.category === selectedCategory);
    }

    if (term) {
      docs = docs.filter(doc =>
        doc.title.toLowerCase().includes(term) ||
        doc.summary.toLowerCase().includes(term)
      );
    }

    return docs;
  }, [query, selectedCategory]);

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-12 py-16 md:py-20 space-y-10">
      <header className="space-y-6">
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400">Examples</p>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900">Domain Templates</h1>
          <p className="text-base text-slate-600 mt-3 max-w-2xl">
            Pre-built templates for common use cases. Each template includes field definitions, validation rules, and compliance requirements.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Search</label>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search templates..."
              className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="md:w-64">
            <label className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map(doc => (
          <button
            key={doc.id}
            onClick={() => onNavigate(`/research/${doc.slug}`)}
            className="text-left rounded-2xl border border-slate-200 bg-white p-6 shadow-sm hover:shadow-lg transition-all hover:border-emerald-300 group"
          >
            <div className="flex items-start justify-between mb-3">
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-2 py-1 rounded">
                {doc.category}
              </span>
              <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 bg-slate-100 px-2 py-1 rounded">
                {doc.extension}
              </span>
            </div>

            <h3 className="text-lg font-black text-slate-900 mb-2">{doc.title}</h3>

            <p className="text-sm text-slate-600 leading-relaxed mb-4">
              {doc.summary}
            </p>

            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-emerald-600 group-hover:gap-3 transition-all">
              View template
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"/>
              </svg>
            </div>
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🔍</div>
          <p className="text-slate-500 text-lg font-semibold">No templates found</p>
          <p className="text-slate-400 text-sm mt-2">Try adjusting your search or category filter</p>
        </div>
      )}
    </div>
  );
};

export default ResearchIndexPage;
