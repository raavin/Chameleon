
import React, { useState, useEffect } from 'react';
import { compileManifest, BuildContext } from './services/geminiService';
import { DB } from './services/dbService';
import { Manifest, Submission, ClientRecord } from './types';
import Layout from './components/Layout';
import Engine from './components/Engine';
import CRMView from './components/CRMView';
import ClientDashboard from './components/ClientDashboard';
import LandingScreen from './components/LandingScreen';
import ResearcherOverlay from './components/ResearcherOverlay';
import ManifestInspector from './components/ManifestInspector';

export default function App() {
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [activeManifestId, setActiveManifestId] = useState<string | null>(null);
  const [activeDomainId, setActiveDomainId] = useState<string>('');
  
  const [loading, setLoading] = useState(false);
  const [streamOutput, setStreamOutput] = useState<string>('');
  const [viewMode, setViewMode] = useState<'home' | 'intake' | 'review' | 'manifest' | 'directory' | 'client_360'>('home');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = async () => {
    const ms = await DB.getAllManifests();
    setManifests(ms);
    setSubmissions(DB.getSubmissions());
    setClients(DB.getClients());
  };

  const handleBuild = async (ctx: BuildContext) => {
    setLoading(true);
    setStreamOutput('');
    try {
      const generated = await compileManifest(ctx, (chunk) => setStreamOutput(prev => prev + chunk));
      
      // SAVE THE MANIFEST
      DB.saveManifest(generated);
      
      // SAVE THE RESEARCH DOCUMENTS LOCALLY
      if (generated.domains && generated.domains[0] && generated.domains[0].research_artifacts) {
        generated.domains[0].research_artifacts.forEach(artifact => {
          DB.saveResearchArtifact(artifact);
        });
      }

      await refreshData();
      
      setActiveManifestId(generated.id);
      setActiveDomainId(generated.domains[0]?.id || '');
      setSelectedClientId(null);
      setViewMode('intake');
    } catch (err) {
      console.error(err);
      alert("Deep Research Node Failure. JSON structure corrupted or research timed out.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmission = (data: any) => {
    const manifest = manifests.find(m => m.id === activeManifestId);
    const domain = manifest?.domains.find(d => d.id === activeDomainId);
    if (!domain || !manifest) return;

    const subId = selectedClientId || `subject_${Date.now().toString(36)}`;

    const submission: Submission = {
      id: crypto.randomUUID(),
      manifest_id: manifest.id,
      domain_id: domain.id,
      subject_id: subId,
      data,
      timestamp: new Date().toISOString(),
      status: 'FINALIZED'
    };
    
    DB.saveSubmission(submission);
    refreshData();
    setSelectedClientId(subId);
    setViewMode('client_360');
  };

  if (loading) return <ResearcherOverlay stream={streamOutput} />;

  if (viewMode === 'home') return <LandingScreen onBuild={handleBuild} onEnterDirectory={() => setViewMode('directory')} />;

  const activeManifest = manifests.find(m => m.id === activeManifestId);
  const activeDomain = activeManifest?.domains.find(d => d.id === activeDomainId);

  return (
    <Layout 
      viewMode={viewMode}
      setViewMode={setViewMode}
      manifests={manifests}
      activeManifestId={activeManifestId}
      setActiveManifestId={(id) => {
        const m = manifests.find(x => x.id === id);
        setActiveManifestId(id);
        setActiveDomainId(m?.domains[0]?.id || '');
        setSelectedClientId(null);
        setViewMode('intake');
      }}
      activeDomainId={activeDomainId}
      setActiveDomainId={setActiveDomainId}
      selectedClientId={selectedClientId}
      onReset={() => setViewMode('home')}
    >
      {viewMode === 'directory' && (
        <CRMView 
          manifests={manifests}
          submissions={submissions} 
          onSelectClient={(id) => {
            setSelectedClientId(id);
            setViewMode('client_360');
          }} 
        />
      )}

      {viewMode === 'client_360' && selectedClientId && (
        <ClientDashboard 
          clientId={selectedClientId}
          submissions={submissions}
          manifests={manifests}
          onIntake={(mid, did) => {
            setActiveManifestId(mid);
            setActiveDomainId(did);
            setViewMode('intake');
          }}
          onViewEpisode={(sub) => {
            setActiveManifestId(sub.manifest_id);
            setActiveDomainId(sub.domain_id);
            setSelectedSubmissionId(sub.id);
            setViewMode('review');
          }}
        />
      )}

      {viewMode === 'manifest' && activeManifest && (
        <ManifestInspector manifest={activeManifest} />
      )}

      {(viewMode === 'intake' || viewMode === 'review') && activeManifest && activeDomain && (
        <Engine 
          domain={activeDomain}
          currency={activeManifest.config.currency}
          library={activeManifest.library}
          readOnly={viewMode === 'review'}
          onSuccess={handleSubmission}
          prefillData={viewMode === 'review' ? submissions.find(s => s.id === selectedSubmissionId)?.data : (selectedClientId ? { [activeDomain.subject_identifier_field]: selectedClientId } : {})}
        />
      )}
    </Layout>
  );
}
