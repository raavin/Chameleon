import mongoose from 'mongoose';

/**
 * Field Schema - Individual form field definition
 * GOLD FEATURE: section_citation links to library entries
 */
const FieldSchema = new mongoose.Schema({
  id: { type: String, required: true },
  label: { type: String, required: true },
  type: { 
    type: String, 
    required: true,
    // Flexible enum to handle various AI outputs
    enum: ['text', 'string', 'number', 'photo', 'bool', 'boolean', 'select', 'date', 'textarea', 'relationship', 'map', 'file', 'multiselect', 'tel', 'email', 'checkbox']
  },
  placeholder: String,
  options: [String],
  default_value: mongoose.Schema.Types.Mixed,
  section_citation: String,        // GOLD: Links to library entry
  research_node_id: String,
  is_identity_field: Boolean,      // GOLD: Core identifier marking
  ui_config: {
    grid_span: { type: Number, enum: [1, 2] },
    help_text: String,             // GOLD: Contextual guidance
    extrapolated_from: String
  }
}, { _id: false });

/**
 * Form Section Schema
 */
const FormSectionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  description: String,
  field_ids: [String]
}, { _id: false });

/**
 * Research Artifact Schema (embedded in Domain)
 * GOLD FEATURE: cached_content stores full legislation text
 */
const ResearchArtifactEmbeddedSchema = new mongoose.Schema({
  id: { type: String, required: true },
  source: { 
    type: String,
    // Flexible to handle various AI outputs like "Local/Gov", "Gov", etc.
  },
  title: { type: String, required: true },
  url: String,
  content_summary: String,
  cached_content: String,          // GOLD: Full text of legislation for RAG
  benchmark_metrics: mongoose.Schema.Types.Mixed,
  tags: [String]
}, { _id: false });

/**
 * Governance Rule Schema
 */
const GovernanceRuleSchema = new mongoose.Schema({
  action: String,
  description: String
}, { _id: false });

/**
 * Domain Schema - A complete service domain within a manifest
 */
const DomainSchema = new mongoose.Schema({
  id: { type: String, required: true },
  title: { type: String, required: true },
  sections: [FormSectionSchema],
  fields: [FieldSchema],
  research_artifacts: [ResearchArtifactEmbeddedSchema],
  governance_rules: [GovernanceRuleSchema],
  subject_identifier_field: String
}, { _id: false });

/**
 * Library Entry Schema
 * GOLD FEATURE: Legislative citation with full text and analysis
 */
const LibraryEntrySchema = new mongoose.Schema({
  act_name: { type: String, required: true },
  section_title: String,
  content: String,                 // GOLD: Full statutory text
  analysis: String                 // GOLD: AI-generated explanation
}, { _id: false });

/**
 * Manifest Schema - The complete protocol definition
 * This is the core "factory" output that drives the dynamic UI
 */
const ManifestSchema = new mongoose.Schema({
  id: { type: String, required: true, unique: true },
  version: { type: String, required: true },
  compiled_at: { type: Date, required: true },
  config: {
    currency: String,
    locale: String,
    theme: { type: String, default: 'modern' },
    region: { type: String, required: true }
  },
  domains: [DomainSchema],
  library: {                       // GOLD: Citation database
    type: Map,
    of: LibraryEntrySchema
  }
}, { 
  timestamps: true,
  toJSON: { 
    transform: (doc, ret) => {
      // Convert Map to plain object for JSON serialization
      if (ret.library instanceof Map) {
        ret.library = Object.fromEntries(ret.library);
      }
      return ret;
    }
  }
});

// Index for faster lookups (id already has unique index)
ManifestSchema.index({ 'config.region': 1 });

const Manifest = mongoose.model('Manifest', ManifestSchema);

export default Manifest;
