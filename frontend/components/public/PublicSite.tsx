import React from 'react';
import PublicLayout from './PublicLayout';
import HomePage from './HomePage';
import PhilosophyPage from './PhilosophyPage';
import ResearchIndexPage from './ResearchIndexPage';
import ResearchDocPage from './ResearchDocPage';
import ApplicationFactoryPage from '../../src/pages/ApplicationFactoryPage';
import { getResearchDocBySlug } from './researchCatalog';

interface PublicSiteProps {
  path: string;
  onNavigate: (path: string) => void;
  onEnterCommand: () => void;
}

const PublicSite: React.FC<PublicSiteProps> = ({ path, onNavigate, onEnterCommand }) => {
  const renderPage = () => {
    if (path === '/' || path === '') {
      return <HomePage onNavigate={onNavigate} />;
    }

    if (path.startsWith('/about') || path.startsWith('/philosophy')) {
      return <PhilosophyPage onNavigate={onNavigate} />;
    }

    if (path === '/research') {
      return <ResearchIndexPage onNavigate={onNavigate} />;
    }

    if (path.startsWith('/research/')) {
      const slug = path.replace('/research/', '');
      const doc = getResearchDocBySlug(slug);
      if (!doc) {
        return (
          <div className="max-w-5xl mx-auto px-6 md:px-12 py-20">
            <p className="text-sm text-slate-500">Document not found.</p>
          </div>
        );
      }
      return <ResearchDocPage doc={doc} onNavigate={onNavigate} />;
    }

    if (path.startsWith('/factory')) {
      return <ApplicationFactoryPage />;
    }

    onNavigate('/');
    return null;
  };

  return (
    <PublicLayout currentPath={path} onNavigate={onNavigate}>
      {renderPage()}
    </PublicLayout>
  );
};

export default PublicSite;
