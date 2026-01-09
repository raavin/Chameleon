
import { Manifest, Submission, ClientRecord, ResearchNode } from '../types';

const DOCUMENTS_SUBMISSIONS = 'chameleon_doc_submissions';
const DOCUMENTS_MANIFESTS = 'chameleon_doc_manifests';
const DOCUMENTS_CLIENTS = 'chameleon_doc_clients';
const DOCUMENTS_RESEARCH = 'chameleon_doc_research'; // The "Folder"

/**
 * DB Service: Simulates a document-based store (like MongoDB).
 * Manages separate "collections" for Protocols, Submissions, Client Profiles, and Research Artifacts.
 */
export const DB = {
  /**
   * Loads all manifests from static JSON folders and dynamic storage.
   */
  async getAllManifests(): Promise<Manifest[]> {
    const dynamic = JSON.parse(localStorage.getItem(DOCUMENTS_MANIFESTS) || '[]');
    
    const staticPaths = [
      './protocols/melbourne_fvr.json',
      './protocols/nairobi_relief.json',
      './protocols/hcmc_health.json'
    ];

    const staticManifests: Manifest[] = [];
    
    for (const path of staticPaths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          const m = await response.json();
          staticManifests.push(m);
        }
      } catch (e) {
        console.warn(`Static protocol at ${path} not available.`);
      }
    }

    const combined = [...staticManifests, ...dynamic];
    return combined.filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);
  },

  saveManifest(manifest: Manifest) {
    const existing = JSON.parse(localStorage.getItem(DOCUMENTS_MANIFESTS) || '[]');
    const filtered = existing.filter((m: any) => m.id !== manifest.id);
    localStorage.setItem(DOCUMENTS_MANIFESTS, JSON.stringify([manifest, ...filtered]));
  },

  /**
   * Persistence for individual client documents.
   */
  async getClientDocument(clientId: string): Promise<ClientRecord | null> {
    const clients = JSON.parse(localStorage.getItem(DOCUMENTS_CLIENTS) || '{}');
    if (clients[clientId]) return clients[clientId];
    
    // Fallback: try to fetch from virtual "clients/" folder if it were on a real server
    try {
      const resp = await fetch(`./clients/${clientId}.json`);
      if (resp.ok) return await resp.json();
    } catch (e) {}
    
    return null;
  },

  saveClientDocument(client: ClientRecord) {
    const clients = JSON.parse(localStorage.getItem(DOCUMENTS_CLIENTS) || '{}');
    clients[client.id] = client;
    localStorage.setItem(DOCUMENTS_CLIENTS, JSON.stringify(clients));
  },

  getSubmissions(): Submission[] {
    const data = localStorage.getItem(DOCUMENTS_SUBMISSIONS);
    return data ? JSON.parse(data) : [];
  },

  saveSubmission(submission: Submission) {
    const existing = this.getSubmissions();
    const updated = [submission, ...existing];
    localStorage.setItem(DOCUMENTS_SUBMISSIONS, JSON.stringify(updated));
    
    // Update or Create the Client Document automatically
    this.updateClientFromSubmission(submission);
  },

  updateClientFromSubmission(sub: Submission) {
    const clients = JSON.parse(localStorage.getItem(DOCUMENTS_CLIENTS) || '{}');
    let client = clients[sub.subject_id];
    
    if (!client) {
      client = {
        id: sub.subject_id,
        name: sub.data.full_name || sub.data.name || "Resolved Identity",
        metadata: {},
        submissions: []
      };
    }
    
    // Sync name if updated in latest submission
    if (sub.data.full_name || sub.data.name) {
      client.name = sub.data.full_name || sub.data.name;
    }
    
    // Safety check: ensure submissions array exists before filtering
    const previousSubmissions = Array.isArray(client.submissions) ? client.submissions : [];
    client.submissions = [sub, ...previousSubmissions.filter((s: any) => s.id !== sub.id)];
    
    clients[sub.subject_id] = client;
    localStorage.setItem(DOCUMENTS_CLIENTS, JSON.stringify(clients));
  },

  getClients(): ClientRecord[] {
    const clients = JSON.parse(localStorage.getItem(DOCUMENTS_CLIENTS) || '{}');
    return (Object.values(clients) as ClientRecord[]).sort((a, b) => a.name.localeCompare(b.name));
  },

  /**
   * RESEARCH REPOSITORY METHODS
   * Handles the "local folder" storage of scanned documents.
   */
  saveResearchArtifact(artifact: ResearchNode) {
    const docs = JSON.parse(localStorage.getItem(DOCUMENTS_RESEARCH) || '[]');
    // Avoid duplicates by ID or Title
    const filtered = docs.filter((d: ResearchNode) => d.id !== artifact.id && d.title !== artifact.title);
    localStorage.setItem(DOCUMENTS_RESEARCH, JSON.stringify([artifact, ...filtered]));
  },

  getResearchArtifacts(): ResearchNode[] {
    return JSON.parse(localStorage.getItem(DOCUMENTS_RESEARCH) || '[]');
  }
};
