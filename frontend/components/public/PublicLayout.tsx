import React from 'react';

interface PublicLayoutProps {
  children: React.ReactNode;
  currentPath: string;
  onNavigate: (path: string) => void;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children, currentPath, onNavigate }) => {
  const navItems = [
    { path: '/', label: 'Home' },
    { path: '/factory', label: 'App Factory' }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-sm border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => onNavigate('/')}
              className="flex items-center gap-3 group"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg group-hover:shadow-xl transition-all">
                C
              </div>
              <span className="text-xl font-black text-slate-900">Chameleon</span>
            </button>

            <nav className="hidden md:flex items-center gap-1">
              {navItems.map(item => (
                <button
                  key={item.path}
                  onClick={() => onNavigate(item.path)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                    currentPath === item.path
                      ? 'bg-emerald-100 text-emerald-700'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <a
                href="https://github.com/raavin/Chameleon"
                target="_blank"
                rel="noreferrer"
                className="hidden md:flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-300 text-slate-700 text-sm font-bold hover:bg-slate-50 transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                </svg>
                GitHub
              </a>
              <button
                onClick={() => onNavigate('/app')}
                className="px-6 py-2 rounded-lg bg-emerald-600 text-white text-sm font-bold hover:bg-emerald-700 transition-all shadow-md hover:shadow-lg"
              >
                Launch App
              </button>
            </div>
          </div>

          <nav className="md:hidden flex items-center gap-1 mt-4 border-t border-slate-200 pt-4">
            {navItems.map(item => (
              <button
                key={item.path}
                onClick={() => onNavigate(item.path)}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                  currentPath === item.path
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {item.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        {children}
      </main>

      <footer className="bg-slate-900 text-white">
        <div className="max-w-7xl mx-auto px-6 md:px-12 py-12">
          <div className="grid md:grid-cols-3 gap-8">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center text-white font-black text-lg">
                  C
                </div>
                <span className="text-xl font-black">Chameleon</span>
              </div>
              <p className="text-slate-400 text-sm leading-relaxed">
                AI-powered platform for generating data collection applications from compliance documents.
                Built for NGOs and social programs.
              </p>
            </div>

            <div>
              <h3 className="font-bold mb-4">Resources</h3>
              <ul className="space-y-2 text-sm text-slate-400">
                <li>
                  <a href="https://github.com/raavin/Chameleon" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">
                    Documentation
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-bold mb-4">Open Source</h3>
              <p className="text-slate-400 text-sm mb-4">
                Chameleon is free and open source. Contribute on GitHub or deploy your own instance.
              </p>
              <a
                href="https://github.com/raavin/Chameleon"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-700 text-sm font-bold hover:bg-slate-800 transition-all"
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/>
                </svg>
                View on GitHub
              </a>
            </div>
          </div>

          <div className="border-t border-slate-800 mt-8 pt-8 text-center text-sm text-slate-400">
            <p>Built for the AI Tinkerers Hackathon • Open Source • Free Forever</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;
