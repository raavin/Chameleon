import React, { useEffect, useMemo, useState } from 'react';
import { Manifest } from '../types';
import { manifestApi } from '../services/api';

interface MarketplaceProps {
  archivedManifestIds: string[];
  onActivateManifest: (id: string) => void;
  onCreateModule: () => void;
}

const Marketplace: React.FC<MarketplaceProps> = ({ archivedManifestIds, onActivateManifest, onCreateModule }) => {
  const [query, setQuery] = useState('');
  const [region, setRegion] = useState('');
  const [domain, setDomain] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<Manifest[]>([]);
  const archivedSet = useMemo(() => new Set(archivedManifestIds), [archivedManifestIds]);
  const [page, setPage] = useState(1);
  const pageSize = 4;
  const totalPages = Math.max(Math.ceil(results.length / pageSize), 1);

  const loadMarketplace = async () => {
    setLoading(true);
    try {
      const data = await manifestApi.marketplace({
        q: query.trim() || undefined,
        region: region.trim() || undefined,
        domain: domain.trim() || undefined
      });
      setResults(data);
      setPage(1);
    } catch (err) {
      console.error('Failed to load marketplace', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarketplace();
  }, []);

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-24">
      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          <div className="flex-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Keyword</label>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by keyword or feature"
              className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Region</label>
            <input
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="Location or region"
              className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="flex-1">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Domain</label>
            <input
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="Domain title"
              className="mt-2 w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="flex gap-3">
            <button
              onClick={loadMarketplace}
              className="px-6 py-3 bg-slate-900 text-white font-black rounded-xl text-xs uppercase tracking-widest shadow-lg hover:bg-emerald-600 transition-colors"
            >
              Search
            </button>
            <button
              onClick={onCreateModule}
              className="px-6 py-3 border border-slate-200 text-slate-700 font-black rounded-xl text-xs uppercase tracking-widest hover:bg-slate-50 transition-colors"
            >
              Create Module
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-slate-400 font-bold text-xs uppercase tracking-widest">Loading marketplace…</div>
      ) : results.length === 0 ? (
        <div className="text-center text-slate-300 font-black uppercase text-xs">No public modules found</div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {results.slice((page - 1) * pageSize, page * pageSize).map((manifest) => {
              const domainTitles = manifest.domains?.map((d) => d.title).filter(Boolean) || [];
              const domainIds = manifest.domains?.map((d) => d.id).filter(Boolean) || [];
              const fieldLabels = manifest.domains?.flatMap((d) => d.fields?.map((f) => f.label).filter(Boolean) || []) || [];
              const uniqueFields = Array.from(new Set(fieldLabels));
              const previewFields = uniqueFields.slice(0, 5);
              const remainingFields = Math.max(uniqueFields.length - previewFields.length, 0);
              const isArchived = archivedSet.has(manifest.id);
              const authorName = manifest.author?.name || 'Unknown';
              return (
                <div key={manifest.id} className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm hover:border-emerald-300 transition-all">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h4 className="text-xl font-black text-slate-900">{domainTitles[0] || 'Protocol'}</h4>
                      <p className="text-xs text-slate-400 mt-1 font-bold uppercase tracking-widest">{manifest.config?.region || 'Unknown region'}</p>
                    </div>
                    <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">
                      {manifest.visibility === 'PRIVATE' ? 'Private' : 'Public'}
                    </span>
                  </div>
                  <div className="mt-4 text-xs text-slate-600 space-y-2">
                    <p><span className="font-black uppercase tracking-widest text-[9px] text-slate-400">Domains:</span> {domainIds.length ? domainIds.join(', ') : (domainTitles.join(', ') || 'Unknown')}</p>
                    <p><span className="font-black uppercase tracking-widest text-[9px] text-slate-400">Fields:</span> {previewFields.join(', ') || 'None'}{remainingFields > 0 ? ` +${remainingFields}` : ''}</p>
                    <p><span className="font-black uppercase tracking-widest text-[9px] text-slate-400">Author:</span> {authorName}</p>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <p className="text-[10px] text-slate-400 uppercase tracking-widest">v{manifest.version}</p>
                    <button
                      onClick={() => onActivateManifest(manifest.id)}
                      disabled={!isArchived}
                      className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-colors ${isArchived ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'bg-slate-100 text-slate-400 cursor-default'}`}
                    >
                      {isArchived ? 'Add to Active' : 'Active'}
                    </button>
                  </div>
              </div>
            );
          })}
          </div>
          <div className="flex items-center justify-center gap-2 pt-4">
            <button
              onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
              disabled={page <= 1}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${page <= 1 ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              Prev
            </button>
            {Array.from({ length: Math.ceil(results.length / pageSize) }, (_, index) => {
              const pageNumber = index + 1;
              return (
                <button
                  key={pageNumber}
                  onClick={() => setPage(pageNumber)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${pageNumber === page ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  {pageNumber}
                </button>
              );
            })}
            <button
              onClick={() => setPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={page >= totalPages}
              className={`px-3 py-1.5 rounded-lg text-xs font-black transition-colors ${page >= totalPages ? 'bg-slate-100 text-slate-300 cursor-not-allowed' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Marketplace;
