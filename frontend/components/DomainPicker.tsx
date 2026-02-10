/**
 * DomainPicker - Grid of selectable domain cards
 * Allows user to pick a primary domain and specify sub-domain
 */

const TOP_LEVEL_DOMAINS = [
  { id: 'Healthcare', icon: '+', color: 'bg-red-50 border-red-200 text-red-700' },
  { id: 'Education', icon: 'E', color: 'bg-blue-50 border-blue-200 text-blue-700' },
  { id: 'Finance', icon: '$', color: 'bg-green-50 border-green-200 text-green-700' },
  { id: 'Social Services', icon: 'S', color: 'bg-purple-50 border-purple-200 text-purple-700' },
  { id: 'Legal', icon: 'L', color: 'bg-amber-50 border-amber-200 text-amber-700' },
  { id: 'Government', icon: 'G', color: 'bg-slate-50 border-slate-300 text-slate-700' },
  { id: 'Retail', icon: 'R', color: 'bg-pink-50 border-pink-200 text-pink-700' },
  { id: 'Manufacturing', icon: 'M', color: 'bg-orange-50 border-orange-200 text-orange-700' },
  { id: 'Logistics', icon: 'T', color: 'bg-cyan-50 border-cyan-200 text-cyan-700' },
  { id: 'Non-profit', icon: 'N', color: 'bg-emerald-50 border-emerald-200 text-emerald-700' },
  { id: 'Real Estate', icon: 'H', color: 'bg-indigo-50 border-indigo-200 text-indigo-700' },
  { id: 'Other', icon: '?', color: 'bg-gray-50 border-gray-200 text-gray-700' },
];

interface DomainPickerProps {
  selectedDomain: string;
  selectedSubDomain: string;
  onDomainChange: (domain: string) => void;
  onSubDomainChange: (subDomain: string) => void;
}

export default function DomainPicker({
  selectedDomain,
  selectedSubDomain,
  onDomainChange,
  onSubDomainChange
}: DomainPickerProps) {
  return (
    <div>
      <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
        Primary Domain (Optional)
      </label>
      <p className="text-xs text-slate-500 mt-1 mb-3">
        Select a domain to focus the AI classification, or skip and let the AI determine it
      </p>

      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {TOP_LEVEL_DOMAINS.map(domain => (
          <button
            key={domain.id}
            type="button"
            onClick={() => {
              if (selectedDomain === domain.id) {
                onDomainChange('');
                onSubDomainChange('');
              } else {
                onDomainChange(domain.id);
              }
            }}
            className={`p-3 rounded-xl border-2 text-center transition-all text-sm font-bold ${
              selectedDomain === domain.id
                ? 'ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50 text-emerald-700 shadow-lg'
                : `${domain.color} hover:shadow-md`
            }`}
          >
            <div className="text-lg mb-1">{domain.icon}</div>
            <div className="text-[11px] leading-tight">{domain.id}</div>
          </button>
        ))}
      </div>

      {selectedDomain && (
        <div className="mt-3">
          <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
            Sub-Domain
          </label>
          <input
            type="text"
            value={selectedSubDomain}
            onChange={e => onSubDomainChange(e.target.value)}
            placeholder={`e.g., ${selectedDomain === 'Healthcare' ? 'Mental Health Services' : selectedDomain === 'Education' ? 'K-12 Special Education' : 'Specify sub-domain...'}`}
            className="w-full mt-1 px-4 py-2.5 bg-white border-2 border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>
      )}
    </div>
  );
}
