import mongoose from 'mongoose';

/**
 * Research Artifact Schema - Standalone research documents
 * Maps to the "research_artifacts" IndexedDB store
 * 
 * GOLD FEATURE: cached_content stores full legislation/standard text
 * This enables RAG (Retrieval Augmented Generation) capabilities
 * 
 * Note: Artifacts are also embedded in manifests, but this collection
 * stores them independently for:
 * 1. Deduplication across manifests
 * 2. Full-text search capabilities
 * 3. Large document storage without bloating manifests
 */
const ResearchArtifactSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  source: { 
    type: String,
    required: true
  },
  title: { type: String, required: true },
  url: String,
  content_summary: String,
  cached_content: String,          // GOLD: Full text - can be very large
  benchmark_metrics: {
    type: Map,
    of: mongoose.Schema.Types.Mixed
  },
  tags: [String]
}, { 
  timestamps: true,
  toJSON: {
    transform: (doc, ret) => {
      if (ret.benchmark_metrics instanceof Map) {
        ret.benchmark_metrics = Object.fromEntries(ret.benchmark_metrics);
      }
      return ret;
    }
  }
});

// Indexes (id already has unique index)
ResearchArtifactSchema.index({ source: 1 });
ResearchArtifactSchema.index({ tags: 1 });
ResearchArtifactSchema.index({ title: 'text', content_summary: 'text' });

const ResearchArtifact = mongoose.model('ResearchArtifact', ResearchArtifactSchema);

export default ResearchArtifact;
