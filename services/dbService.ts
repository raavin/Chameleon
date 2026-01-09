
import { Manifest, Submission, ClientRecord, ResearchNode } from '../types';

const DB_NAME = 'ChameleonDB';
const DB_VERSION = 1;

/**
 * Raw IndexedDB Wrapper to avoid external dependencies.
 * Stores manifests, client records, submissions, and research artifacts (large text/blobs).
 */
const IDB = {
  db: null as IDBDatabase | null,

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        // Manifests Store
        if (!db.objectStoreNames.contains('manifests')) {
          db.createObjectStore('manifests', { keyPath: 'id' });
        }
        // Clients Store
        if (!db.objectStoreNames.contains('clients')) {
          db.createObjectStore('clients', { keyPath: 'id' });
        }
        // Submissions Store
        if (!db.objectStoreNames.contains('submissions')) {
          db.createObjectStore('submissions', { keyPath: 'id' });
        }
        // Research Artifacts (The "Files")
        if (!db.objectStoreNames.contains('research_artifacts')) {
          db.createObjectStore('research_artifacts', { keyPath: 'id' });
        }
      };

      request.onsuccess = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        resolve(this.db);
      };

      request.onerror = (event) => {
        reject((event.target as IDBOpenDBRequest).error);
      };
    });
  },

  async put(storeName: string, value: any): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.put(value);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  },

  async getAll(storeName: string): Promise<any[]> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  },

  async get(storeName: string, key: string): Promise<any | undefined> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
};

/**
 * Public DB API
 */
export const DB = {
  async getAllManifests(): Promise<Manifest[]> {
    const dynamic = await IDB.getAll('manifests');
    
    // Static fallback for initial demo state if DB is empty
    if (dynamic.length === 0) {
      const staticPaths = [
        '/protocols/melbourne_fvr.json',
        '/protocols/nairobi_relief.json',
        '/protocols/hcmc_health.json'
      ];
      
      const staticManifests: Manifest[] = [];
      for (const path of staticPaths) {
        try {
          const response = await fetch(path);
          if (response.ok) {
            const m = await response.json();
            staticManifests.push(m);
            // Auto-seed IDB
            await IDB.put('manifests', m);
          }
        } catch (e) {
          console.warn(`Static protocol at ${path} not available/skipped.`);
        }
      }
      return staticManifests;
    }

    return dynamic;
  },

  async saveManifest(manifest: Manifest) {
    await IDB.put('manifests', manifest);
  },

  async getClientDocument(clientId: string): Promise<ClientRecord | null> {
    const client = await IDB.get('clients', clientId);
    return client || null;
  },

  async saveClientDocument(client: ClientRecord) {
    await IDB.put('clients', client);
  },

  async getSubmissions(): Promise<Submission[]> {
    return await IDB.getAll('submissions');
  },

  async saveSubmission(submission: Submission) {
    await IDB.put('submissions', submission);
    await this.updateClientFromSubmission(submission);
  },

  async updateClientFromSubmission(sub: Submission) {
    let client = await this.getClientDocument(sub.subject_id);
    
    if (!client) {
      client = {
        id: sub.subject_id,
        name: sub.data.full_name || sub.data.name || "Resolved Identity",
        metadata: {},
        submissions: []
      };
    }
    
    if (sub.data.full_name || sub.data.name) {
      client.name = sub.data.full_name || sub.data.name;
    }
    
    const previousSubmissions = Array.isArray(client.submissions) ? client.submissions : [];
    // Deduplicate
    client.submissions = [sub, ...previousSubmissions.filter((s: any) => s.id !== sub.id)];
    
    await IDB.put('clients', client);
  },

  async getClients(): Promise<ClientRecord[]> {
    const clients = await IDB.getAll('clients');
    return clients.sort((a: ClientRecord, b: ClientRecord) => a.name.localeCompare(b.name));
  },

  async saveResearchArtifact(artifact: ResearchNode) {
    // This now saves to IndexedDB which can hold large text/blobs
    await IDB.put('research_artifacts', artifact);
  },

  async getResearchArtifacts(): Promise<ResearchNode[]> {
    return await IDB.getAll('research_artifacts');
  }
};
