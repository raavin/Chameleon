import React from 'react';
import PublicLayout from './PublicLayout';
import HomePage from './HomePage';
import ApplicationFactoryPage from '../../src/pages/ApplicationFactoryPage';

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
