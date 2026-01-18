
import React, { useState, useEffect } from 'react';
import { compileManifest, BuildContext } from './services/geminiService';
import { DB } from './services/dbService';
import { authApi, manifestApi } from './services/api';
import { Manifest, Submission, ClientRecord } from './types';
import Layout from './components/Layout';
import Engine from './components/Engine';
import CRMView from './components/CRMView';
import ClientDashboard from './components/ClientDashboard';
import LandingScreen from './components/LandingScreen';
import ResearcherOverlay from './components/ResearcherOverlay';
import ManifestInspector from './components/ManifestInspector';
import Marketplace from './components/Marketplace';
import { LoginScreen } from './components/LoginScreen';
import DeploymentModal from './components/DeploymentModal';
import { useAuth } from './contexts/AuthContext';

export default function App() {
  const { user, isAuthenticated, checkAuth } = useAuth();
  const [manifests, setManifests] = useState<Manifest[]>([]);
  const [activeManifestId, setActiveManifestId] = useState<string | null>(null);
  const [activeDomainId, setActiveDomainId] = useState<string>('');
  const [archivedManifestIds, setArchivedManifestIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('chameleon_archived_manifests');
    return stored ? JSON.parse(stored) : [];
  });
  const [archivedArtifactIds, setArchivedArtifactIds] = useState<string[]>(() => {
    const stored = localStorage.getItem('chameleon_archived_artifacts');
    return stored ? JSON.parse(stored) : [];
  });
  
  const [loading, setLoading] = useState(false);
  const [streamOutput, setStreamOutput] = useState<string>('');
  const [viewMode, setViewMode] = useState<'home' | 'intake' | 'review' | 'manifest' | 'directory' | 'client_360' | 'marketplace'>('home');
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [clients, setClients] = useState<ClientRecord[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedSubmissionId, setSelectedSubmissionId] = useState<string | null>(null);
  const [isDeploymentOpen, setIsDeploymentOpen] = useState(false);
  const manifestOrderKey = user?.preferences?.manifest_order?.join('|') || '';

  const applyManifestOrder = (items: Manifest[], orderIds?: string[]) => {
    if (!orderIds || orderIds.length === 0) return items;
    const map = new Map(items.map((m) => [m.id, m]));
    const ordered = orderIds.map((id) => map.get(id)).filter(Boolean) as Manifest[];
    const remaining = items.filter((m) => !orderIds.includes(m.id));
    return [...ordered, ...remaining];
  };

  const refreshData = async () => {
    const ms = await DB.getAllManifests();
    const subs = await DB.getSubmissions();
    const cls = await DB.getClients();
    const ordered = applyManifestOrder(ms, user?.preferences?.manifest_order);
    setManifests(ordered);
    setSubmissions(subs);
    setClients(cls);
  };

  useEffect(() => {
    refreshData();
  }, [user?.id, manifestOrderKey]);

  useEffect(() => {
    if (user?.preferences?.archived_manifest_ids) {
      setArchivedManifestIds(user.preferences.archived_manifest_ids);
    }
    if (user?.preferences?.archived_artifact_ids) {
      setArchivedArtifactIds(user.preferences.archived_artifact_ids);
    }
  }, [user?.preferences?.archived_manifest_ids, user?.preferences?.archived_artifact_ids]);

  const persistPreferences = async (updates: {
    manifest_order?: string[];
    archived_manifest_ids?: string[];
    archived_artifact_ids?: string[];
  }) => {
    if (!isAuthenticated) {
      if (updates.archived_manifest_ids) {
        localStorage.setItem('chameleon_archived_manifests', JSON.stringify(updates.archived_manifest_ids));
      }
      if (updates.archived_artifact_ids) {
        localStorage.setItem('chameleon_archived_artifacts', JSON.stringify(updates.archived_artifact_ids));
      }
      return;
    }

    try {
      await authApi.updatePreferences(updates);
      await checkAuth();
    } catch (err) {
      console.error('Failed to update preferences', err);
    }
  };

  const toggleArchiveManifest = (manifestId: string) => {
    setArchivedManifestIds(prev => {
      const updated = prev.includes(manifestId) 
        ? prev.filter(id => id !== manifestId)
        : [...prev, manifestId];
      persistPreferences({ archived_manifest_ids: updated });
      return updated;
    });
  };

  const toggleArchiveArtifact = (manifestId: string) => {
    setArchivedArtifactIds(prev => {
      const updated = prev.includes(manifestId) 
        ? prev.filter(id => id !== manifestId)
        : [...prev, manifestId];
      persistPreferences({ archived_artifact_ids: updated });
      return updated;
    });
  };

  const deleteManifest = async (manifestId: string) => {
    if (!confirm('Are you sure you want to permanently delete this module?')) return;
    
    try {
      // Delete from server
      await manifestApi.delete(manifestId);
      
      // Remove from archived lists
      const nextArchivedManifests = archivedManifestIds.filter(id => id !== manifestId);
      const nextArchivedArtifacts = archivedArtifactIds.filter(id => id !== manifestId);
      setArchivedManifestIds(nextArchivedManifests);
      setArchivedArtifactIds(nextArchivedArtifacts);
      persistPreferences({
        archived_manifest_ids: nextArchivedManifests,
        archived_artifact_ids: nextArchivedArtifacts
      });
      
      // Refresh data
      await refreshData();
    } catch (err) {
      console.error('Failed to delete manifest:', err);
      alert('Failed to delete module');
    }
  };

  const handleReorderManifests = async (ids: string[]) => {
    // Optimistic update
    const reordered = ids.map(id => manifests.find(m => m.id === id)!).filter(Boolean);
    setManifests(reordered);

    await persistPreferences({ manifest_order: ids });
  };

  const handleActivateManifest = (manifestId: string) => {
    setArchivedManifestIds((prev) => {
      const updated = prev.filter((id) => id !== manifestId);
      persistPreferences({ archived_manifest_ids: updated });
      return updated;
    });
  };

  const handleBuild = async (ctx: BuildContext) => {
    if (!isAuthenticated || !user) {
      alert('You must be logged in to create a manifest.');
      return;
    }
    setLoading(true);
    setStreamOutput('');
    try {
      console.log('[BUILD] Starting compileManifest with context:', ctx);
      const generated = await compileManifest(ctx, (chunk) => setStreamOutput(prev => prev + chunk));

      generated.author = {
        id: user.id,
        name: user.name,
        email: user.email
      };
      generated.created_by = user.id;
      
      console.log('[BUILD] compileManifest returned:', generated);
      console.log('[BUILD] Generated manifest ID:', generated?.id);
      console.log('[BUILD] Generated domains:', generated?.domains?.length);

      if (!generated?.domains || generated.domains.length === 0) {
        throw new Error('Manifest generation returned no domains. Try again with more context.');
      }
      
      // SAVE THE MANIFEST (Merge/Overwrite handled by DB logic usually, but here we just put)
      console.log('[BUILD] Calling DB.saveManifest...');
      await DB.saveManifest(generated);
      console.log('[BUILD] DB.saveManifest completed');
      
      // SAVE THE RESEARCH DOCUMENTS LOCALLY
      // Iterate through research nodes and save them to the 'research_artifacts' store
      if (generated.domains && generated.domains[0] && generated.domains[0].research_artifacts) {
        console.log('[BUILD] Saving research artifacts:', generated.domains[0].research_artifacts.length);
        for (const artifact of generated.domains[0].research_artifacts) {
          await DB.saveResearchArtifact(artifact);
        }
      }

      console.log('[BUILD] Calling refreshData...');
      await refreshData();
      console.log('[BUILD] refreshData completed, manifests count:', manifests.length);
      
      setActiveManifestId(generated.id);
      setActiveDomainId(generated.domains[0].id);
      setSelectedClientId(null);
      setViewMode('intake');
    } catch (err: any) {
      console.error('[BUILD] ERROR:', err);
      alert(`Deep Research Node Failure: ${err.message || "Unknown error"}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmission = async (data: any) => {
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
    
    await DB.saveSubmission(submission);
    await refreshData();
    setSelectedClientId(subId);
    setViewMode('client_360');
  };

  if (loading) return <ResearcherOverlay stream={streamOutput} />;

  if (viewMode === 'home') return <LandingScreen onBuild={handleBuild} onEnterDirectory={() => setViewMode('directory')} />;

  const activeManifest = manifests.find(m => m.id === activeManifestId);
  const activeDomain = activeManifest?.domains.find(d => d.id === activeDomainId);

  if (!isAuthenticated) {
    return <LoginScreen onSuccess={() => refreshData()} />;
  }

  const activeClient = selectedClientId ? clients.find(client => client.id === selectedClientId) : null;

  return (
    <>
    <Layout 
      viewMode={viewMode}
      setViewMode={setViewMode}
      manifests={manifests}
      activeManifestId={activeManifestId}
      setActiveManifestId={(id) => {
        const m = manifests.find(x => x.id === id);
        setActiveManifestId(id);
        setActiveDomainId(m?.domains[0]?.id || '');
        setViewMode('intake');
      }}
      activeDomainId={activeDomainId}
      setActiveDomainId={setActiveDomainId}
      archivedManifestIds={archivedManifestIds}
      onToggleArchive={toggleArchiveManifest}
      archivedArtifactIds={archivedArtifactIds}
      onToggleArchiveArtifact={toggleArchiveArtifact}
      onDeleteManifest={deleteManifest}
      onReorderManifests={handleReorderManifests}
      selectedClientId={selectedClientId}
      activeClient={activeClient}
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
          clients={clients}
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
          onReorder={handleReorderManifests}
        />
      )}

      {viewMode === 'manifest' && activeManifest && (
        <ManifestInspector
          manifest={activeManifest}
          onUpdateVisibility={
            user && (user.role === 'ADMIN' || user.id === activeManifest.author?.id)
              ? async (visibility) => {
                  try {
                    await manifestApi.updateVisibility(activeManifest.id, visibility);
                    await refreshData();
                  } catch (err) {
                    console.error('Failed to update visibility', err);
                  }
                }
              : undefined
          }
        />
      )}

      {viewMode === 'marketplace' && (
        <Marketplace
          archivedManifestIds={archivedManifestIds}
          onActivateManifest={handleActivateManifest}
          onCreateModule={() => setIsDeploymentOpen(true)}
        />
      )}

      {(viewMode === 'intake' || viewMode === 'review') && activeManifest && activeDomain && (
        <Engine 
          domain={activeDomain}
          currency={activeManifest.config.currency}
          library={activeManifest.library}
          readOnly={viewMode === 'review'}
          onSuccess={handleSubmission}
          prefillData={viewMode === 'review' ? submissions.find(s => s.id === selectedSubmissionId)?.data : (selectedClientId ? { [activeDomain.subject_identifier_field]: selectedClientId } : {})}
          canFinalize={Boolean(selectedClientId) || viewMode === 'review' || activeDomain.id === 'client_profile'}
        />
      )}
      {isDeploymentOpen && (
        <DeploymentModal
          onBuild={handleBuild}
          onClose={() => setIsDeploymentOpen(false)}
        />
      )}
    </Layout>
    </>
  );
}
