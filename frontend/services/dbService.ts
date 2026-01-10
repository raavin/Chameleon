
import { Manifest, Submission, ClientRecord, ResearchNode } from '../types';
import { manifestApi, clientApi, submissionApi, artifactApi, healthCheck } from './api';

const DB_NAME = 'ChameleonDB';
const DB_VERSION = 2;

// Track server availability
let serverAvailable = true;
let lastHealthCheck = 0;
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds

/**
 * Check if server is available (cached for performance)
 */
async function isServerAvailable(): Promise<boolean> {
  const now = Date.now();
  if (now - lastHealthCheck < HEALTH_CHECK_INTERVAL) {
    return serverAvailable;
  }
  
  try {
    const health = await healthCheck();
    serverAvailable = health.status === 'ok';
    lastHealthCheck = now;
  } catch {
    serverAvailable = false;
    lastHealthCheck = now;
  }
  
  return serverAvailable;
}

/**
 * Raw IndexedDB Wrapper - Now serves as offline cache/fallback
 */
const IDB = {
  db: null as IDBDatabase | null,

  async open(): Promise<IDBDatabase> {
    if (this.db) return this.db;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('manifests')) {
          db.createObjectStore('manifests', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('clients')) {
          db.createObjectStore('clients', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('submissions')) {
          db.createObjectStore('submissions', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('research_artifacts')) {
          db.createObjectStore('research_artifacts', { keyPath: 'id' });
        }
        // Pending sync queue for offline submissions
        if (!db.objectStoreNames.contains('pending_sync')) {
          db.createObjectStore('pending_sync', { keyPath: 'id' });
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
  },

  async delete(storeName: string, key: string): Promise<void> {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }
};

/**
 * Public DB API - Server-first with local fallback
 */
export const DB = {
  /**
   * Get all manifests - tries server first, falls back to local
   */
  async getAllManifests(): Promise<Manifest[]> {
    try {
      if (await isServerAvailable()) {
        const serverManifests = await manifestApi.getAll();
        // Cache locally for offline use
        for (const m of serverManifests) {
          await IDB.put('manifests', m);
        }
        return serverManifests;
      }
    } catch (err) {
      console.warn('Server unavailable for manifests, using local cache:', err);
    }

    // Fallback to local
    const local = await IDB.getAll('manifests');
    
    // Static fallback for initial demo state if both are empty
    if (local.length === 0) {
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
            await IDB.put('manifests', m);
          }
        } catch (e) {
          console.warn(`Static protocol at ${path} not available/skipped.`);
        }
      }
      return staticManifests;
    }

    return local;
  },

  /**
   * Save manifest - saves to both server and local
   */
  async saveManifest(manifest: Manifest) {
    console.log('[DB] saveManifest called with:', manifest?.id, manifest);
    
    // Skip if manifest is not a proper object
    if (!manifest || typeof manifest !== 'object') {
      console.error('[DB] Skipping invalid manifest - not an object:', manifest);
      return;
    }
    
    // Ensure manifest has an id
    if (!manifest.id) {
      (manifest as any).id = `manifest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
      console.log('[DB] Generated manifest ID:', manifest.id);
    }
    
    // Always save locally first (for offline support)
    try {
      console.log('[DB] Saving to IndexedDB...');
      await IDB.put('manifests', manifest);
      console.log('[DB] IndexedDB save successful');
    } catch (idbErr) {
      console.error('[DB] IndexedDB save FAILED:', idbErr);
      throw idbErr;
    }
    
    try {
      const serverUp = await isServerAvailable();
      console.log('[DB] Server available:', serverUp);
      if (serverUp) {
        console.log('[DB] Saving to server...');
        const result = await manifestApi.save(manifest);
        console.log('[DB] Server save successful:', result);
      } else {
        console.warn('[DB] Server unavailable, manifest saved locally only');
      }
    } catch (err) {
      console.error('[DB] Failed to save manifest to server:', err);
    }
  },

  /**
   * Get client document
   */
  async getClientDocument(clientId: string): Promise<ClientRecord | null> {
    try {
      if (await isServerAvailable()) {
        const client = await clientApi.getById(clientId);
        await IDB.put('clients', client);
        return client;
      }
    } catch (err) {
      // Client might not exist on server, check locally
    }
    
    const client = await IDB.get('clients', clientId);
    return client || null;
  },

  /**
   * Save client document
   */
  async saveClientDocument(client: ClientRecord) {
    await IDB.put('clients', client);
    
    try {
      if (await isServerAvailable()) {
        await clientApi.save({ id: client.id, name: client.name, metadata: client.metadata });
      }
    } catch (err) {
      console.warn('Failed to save client to server:', err);
    }
  },

  /**
   * Get all submissions
   */
  async getSubmissions(): Promise<Submission[]> {
    try {
      if (await isServerAvailable()) {
        const serverSubs = await submissionApi.getAll();
        // Cache locally
        for (const s of serverSubs) {
          await IDB.put('submissions', s);
        }
        return serverSubs;
      }
    } catch (err) {
      console.warn('Server unavailable for submissions, using local cache:', err);
    }
    
    return await IDB.getAll('submissions');
  },

  /**
   * Save submission - saves to server and local, auto-updates client
   */
  async saveSubmission(submission: Submission) {
    // Always save locally first
    await IDB.put('submissions', submission);
    await this.updateClientFromSubmission(submission);
    
    try {
      if (await isServerAvailable()) {
        await submissionApi.save(submission);
      } else {
        // Queue for later sync
        await IDB.put('pending_sync', { 
          id: `sub_${submission.id}`, 
          type: 'submission', 
          data: submission,
          createdAt: new Date().toISOString()
        });
        console.warn('Server unavailable, submission queued for sync');
      }
    } catch (err) {
      console.warn('Failed to save submission to server:', err);
      await IDB.put('pending_sync', { 
        id: `sub_${submission.id}`, 
        type: 'submission', 
        data: submission,
        createdAt: new Date().toISOString()
      });
    }
  },

  /**
   * Update client record from submission data
   */
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
    client.submissions = [sub, ...previousSubmissions.filter((s: any) => s.id !== sub.id)];
    
    await IDB.put('clients', client);
  },

  /**
   * Get all clients
   */
  async getClients(): Promise<ClientRecord[]> {
    try {
      if (await isServerAvailable()) {
        const serverClients = await clientApi.getAll();
        // Cache locally
        for (const c of serverClients) {
          await IDB.put('clients', c);
        }
        return serverClients.sort((a: ClientRecord, b: ClientRecord) => 
          a.name.localeCompare(b.name)
        );
      }
    } catch (err) {
      console.warn('Server unavailable for clients, using local cache:', err);
    }
    
    const clients = await IDB.getAll('clients');
    return clients.sort((a: ClientRecord, b: ClientRecord) => a.name.localeCompare(b.name));
  },

  /**
  /**
   * Save research artifact
   */
  async saveResearchArtifact(artifact: ResearchNode) {
    // Skip if artifact is not a proper object with an id
    if (!artifact || typeof artifact !== 'object') {
      console.warn('Skipping invalid artifact:', artifact);
      return;
    }
    
    // Ensure artifact has an id
    if (!artifact.id) {
      artifact.id = `artifact_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    }
    
    await IDB.put('research_artifacts', artifact);
    
    try {
      if (await isServerAvailable()) {
        await artifactApi.save(artifact);
      }
    } catch (err) {
      console.warn('Failed to save artifact to server:', err);
    }
  },

  /**
   * Get all research artifacts
   */
  async getResearchArtifacts(): Promise<ResearchNode[]> {
    try {
      if (await isServerAvailable()) {
        const serverArtifacts = await artifactApi.getAll();
        for (const a of serverArtifacts) {
          await IDB.put('research_artifacts', a);
        }
        return serverArtifacts;
      }
    } catch (err) {
      console.warn('Server unavailable for artifacts, using local cache:', err);
    }
    
    return await IDB.getAll('research_artifacts');
  },

  /**
   * Sync pending items to server (call when online)
   */
  async syncPendingToServer(): Promise<{ synced: number; failed: number }> {
    if (!(await isServerAvailable())) {
      return { synced: 0, failed: 0 };
    }

    const pending = await IDB.getAll('pending_sync');
    let synced = 0;
    let failed = 0;

    for (const item of pending) {
      try {
        if (item.type === 'submission') {
          await submissionApi.save(item.data);
        } else if (item.type === 'manifest') {
          await manifestApi.save(item.data);
        }
        await IDB.delete('pending_sync', item.id);
        synced++;
      } catch (err) {
        console.warn(`Failed to sync ${item.id}:`, err);
        failed++;
      }
    }

    return { synced, failed };
  },

  /**
   * Get count of pending sync items
   */
  async getPendingSyncCount(): Promise<number> {
    const pending = await IDB.getAll('pending_sync');
    return pending.length;
  },

  /**
   * Check server status
   */
  async isOnline(): Promise<boolean> {
    return await isServerAvailable();
  }
};
