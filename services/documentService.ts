
import { ResearchNode, DocumentMetadata, DocumentScanResult } from '../types';

const DOCUMENTS_METADATA = 'chameleon_doc_metadata';
const DOCUMENTS_SCANS = 'chameleon_doc_scans';
const DOCUMENTS_CONTENT_CACHE = 'chameleon_doc_content';

// Default scan interval: 30 days
const DEFAULT_SCAN_INTERVAL_DAYS = 30;

/**
 * Document Service: Handles downloading, storing, and versioning of legislation documents.
 * Supports regular agent scans for interpretation and compliance extraction.
 */
export const DocumentService = {
  /**
   * Fetches document metadata for a given artifact
   */
  getDocumentMetadata(artifactId: string): DocumentMetadata | null {
    const metadata = JSON.parse(localStorage.getItem(DOCUMENTS_METADATA) || '{}');
    return metadata[artifactId] || null;
  },

  /**
   * Gets all tracked document metadata
   */
  getAllDocumentMetadata(): DocumentMetadata[] {
    const metadata = JSON.parse(localStorage.getItem(DOCUMENTS_METADATA) || '{}');
    return Object.values(metadata);
  },

  /**
   * Saves or updates document metadata
   */
  saveDocumentMetadata(metadata: DocumentMetadata): void {
    const existing = JSON.parse(localStorage.getItem(DOCUMENTS_METADATA) || '{}');
    existing[metadata.artifact_id] = metadata;
    localStorage.setItem(DOCUMENTS_METADATA, JSON.stringify(existing));
  },

  /**
   * Creates initial metadata when a document is first encountered
   */
  createMetadataFromArtifact(artifact: ResearchNode, options?: {
    version?: string;
    versionDate?: string;
    actNumber?: string;
    gazetteNumber?: string;
  }): DocumentMetadata {
    const now = new Date().toISOString();
    const nextCheck = new Date();
    nextCheck.setDate(nextCheck.getDate() + DEFAULT_SCAN_INTERVAL_DAYS);

    const metadata: DocumentMetadata = {
      id: `meta_${artifact.id}`,
      artifact_id: artifact.id,
      source_url: artifact.url,
      document_title: artifact.title,
      version: options?.version || '1.0',
      version_date: options?.versionDate || now,
      act_number: options?.actNumber,
      gazette_number: options?.gazetteNumber,
      fetched_at: now,
      last_checked_at: now,
      next_check_due: nextCheck.toISOString(),
      status: 'current'
    };

    this.saveDocumentMetadata(metadata);
    return metadata;
  },

  /**
   * Checks if a document needs to be re-scanned
   */
  needsRefresh(artifactId: string): boolean {
    const metadata = this.getDocumentMetadata(artifactId);
    if (!metadata) return true;

    const now = new Date();
    const nextCheck = new Date(metadata.next_check_due);
    return now >= nextCheck;
  },

  /**
   * Gets all documents due for refresh
   */
  getDocumentsDueForRefresh(): DocumentMetadata[] {
    const all = this.getAllDocumentMetadata();
    const now = new Date();
    return all.filter(doc => new Date(doc.next_check_due) <= now);
  },

  /**
   * Updates the last checked timestamp and schedules next check
   */
  markAsChecked(artifactId: string, foundChanges: boolean = false): void {
    const metadata = this.getDocumentMetadata(artifactId);
    if (!metadata) return;

    const now = new Date();
    const nextCheck = new Date();
    nextCheck.setDate(nextCheck.getDate() + DEFAULT_SCAN_INTERVAL_DAYS);

    metadata.last_checked_at = now.toISOString();
    metadata.next_check_due = nextCheck.toISOString();

    if (foundChanges) {
      metadata.status = 'pending_review';
    }

    this.saveDocumentMetadata(metadata);
  },

  /**
   * Marks a document as superseded by a newer version
   */
  markSuperseded(artifactId: string, supersededById: string): void {
    const metadata = this.getDocumentMetadata(artifactId);
    if (!metadata) return;

    metadata.status = 'superseded';
    metadata.superseded_by = supersededById;
    this.saveDocumentMetadata(metadata);
  },

  /**
   * Caches document content locally (text/summary)
   */
  cacheDocumentContent(artifactId: string, content: string): void {
    const cache = JSON.parse(localStorage.getItem(DOCUMENTS_CONTENT_CACHE) || '{}');
    cache[artifactId] = {
      content,
      cached_at: new Date().toISOString()
    };
    localStorage.setItem(DOCUMENTS_CONTENT_CACHE, JSON.stringify(cache));
  },

  /**
   * Retrieves cached document content
   */
  getCachedContent(artifactId: string): { content: string; cached_at: string } | null {
    const cache = JSON.parse(localStorage.getItem(DOCUMENTS_CONTENT_CACHE) || '{}');
    return cache[artifactId] || null;
  },

  // ===== SCAN RESULTS =====

  /**
   * Saves an agent scan result
   */
  saveScanResult(result: DocumentScanResult): void {
    const scans = JSON.parse(localStorage.getItem(DOCUMENTS_SCANS) || '{}');

    // Store by document_id, keeping history
    if (!scans[result.document_id]) {
      scans[result.document_id] = [];
    }
    scans[result.document_id].unshift(result);

    // Keep only last 5 scans per document
    scans[result.document_id] = scans[result.document_id].slice(0, 5);

    localStorage.setItem(DOCUMENTS_SCANS, JSON.stringify(scans));
  },

  /**
   * Gets the latest scan result for a document
   */
  getLatestScan(documentId: string): DocumentScanResult | null {
    const scans = JSON.parse(localStorage.getItem(DOCUMENTS_SCANS) || '{}');
    const docScans = scans[documentId];
    return docScans && docScans.length > 0 ? docScans[0] : null;
  },

  /**
   * Gets all scan results for a document
   */
  getScanHistory(documentId: string): DocumentScanResult[] {
    const scans = JSON.parse(localStorage.getItem(DOCUMENTS_SCANS) || '{}');
    return scans[documentId] || [];
  },

  /**
   * Gets all documents that require human review
   */
  getDocumentsRequiringReview(): DocumentMetadata[] {
    return this.getAllDocumentMetadata().filter(doc => doc.status === 'pending_review');
  },

  // ===== BATCH OPERATIONS =====

  /**
   * Initializes metadata for all artifacts in a manifest
   */
  initializeFromManifest(artifacts: ResearchNode[]): void {
    for (const artifact of artifacts) {
      if (!this.getDocumentMetadata(artifact.id)) {
        // Extract version info from artifact if available
        const actMatch = artifact.title.match(/No\.?\s*(\d+)\s*of\s*(\d{4})/i);
        this.createMetadataFromArtifact(artifact, {
          actNumber: actMatch ? `No.${actMatch[1]}of${actMatch[2]}` : undefined,
          versionDate: actMatch ? `${actMatch[2]}-01-01` : undefined
        });
      }
    }
  },

  /**
   * Gets summary statistics for document tracking
   */
  getTrackingStats(): {
    total: number;
    current: number;
    pending_review: number;
    superseded: number;
    due_for_refresh: number;
  } {
    const all = this.getAllDocumentMetadata();
    const dueForRefresh = this.getDocumentsDueForRefresh();

    return {
      total: all.length,
      current: all.filter(d => d.status === 'current').length,
      pending_review: all.filter(d => d.status === 'pending_review').length,
      superseded: all.filter(d => d.status === 'superseded').length,
      due_for_refresh: dueForRefresh.length
    };
  },

  /**
   * Clears all document tracking data (for testing/reset)
   */
  clearAll(): void {
    localStorage.removeItem(DOCUMENTS_METADATA);
    localStorage.removeItem(DOCUMENTS_SCANS);
    localStorage.removeItem(DOCUMENTS_CONTENT_CACHE);
  }
};
