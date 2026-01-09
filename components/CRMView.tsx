
import React, { useState, useMemo } from 'react';
import { Manifest, Submission } from '../types';
import { DB } from '../services/dbService';

interface CRMViewProps {
  manifests: Manifest[];
  submissions: Submission[];
  onSelectClient: (id: string) => void;
}

const CRMView: React.FC<CRMViewProps> = ({ manifests, submissions, onSelectClient }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  const clients = useMemo(() => {
    // Fixed: DB.getClients expects 0 arguments
    let list = DB.getClients();
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      list = list.filter(c => 
        c.name.toLowerCase().includes(term) || 
        c.id.toLowerCase().includes(term)
      );
    }
    return list;
  }, [submissions, searchTerm]);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex-1">
          <h3 className="text-3xl font-black text-slate-800 tracking-tight italic leading-none">Regional Case Directory</h3>
          <p className="text-sm text-slate-500 font-medium mt-2">Verified statutory record identities aggregated by regional node.</p>
        </div>
        <div className="relative">
          <input 
            type="text" 
            placeholder="Search by name or hash..."
            className="pl-6 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm w-72 focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="px-8 py-4 text-[10px] uppercase font-black text-slate-400 tracking-widest">Case Identity</th>
              <th className="px-8 py-4 text-[10px] uppercase font-black text-slate-400 tracking-widest text-center">Protocol History</th>
              <th className="px-8 py-4 text-[10px] uppercase font-black text-slate-400 tracking-widest text-right">Latest Entry</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {clients.map(client => (
              <tr 
                key={client.id}
                onClick={() => onSelectClient(client.id)}
                className="group cursor-pointer hover:bg-emerald-50/40 transition-all"
              >
                <td className="px-8 py-6">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center font-black text-white group-hover:bg-emerald-600 transition-all">
                      {client.name.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 leading-none">{client.name}</p>
                      <p className="text-[10px] font-mono text-slate-400 mt-1.5 uppercase tracking-tighter truncate w-40">{client.id}</p>
                    </div>
                  </div>
                </td>
                <td className="px-8 py-6 text-center">
                  <span className="px-4 py-1 bg-white border border-slate-100 rounded-full text-[10px] font-black text-slate-500 shadow-sm">
                    {client.submissions.length} Episodes
                  </span>
                </td>
                <td className="px-8 py-6 text-right">
                  <p className="font-bold text-slate-600">
                    {new Date(client.submissions[client.submissions.length - 1].timestamp).toLocaleDateString()}
                  </p>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={3} className="px-8 py-32 text-center text-slate-300 font-black uppercase tracking-[0.2em] text-xs">
                  Directory Depleted
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CRMView;
