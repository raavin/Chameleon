
export type FieldType = 
  | 'text' 
  | 'number' 
  | 'photo' 
  | 'bool' 
  | 'select' 
  | 'date' 
  | 'textarea' 
  | 'relationship' 
  | 'map' 
  | 'file' 
  | 'multiselect';

export interface ResearchNode {
  id: string;
  source: 'WHO' | 'UN' | 'HRC' | 'LocalStatute' | 'NGO_Standard' | 'Gov' | 'Local';
  title: string;
  url: string;
  content_summary: string;
  benchmark_metrics?: Record<string, any>;
  tags: string[];
}

/**
 * Enhanced document metadata for version tracking and freshness checks
 */
export interface DocumentMetadata {
  id: string;
  artifact_id: string;              // Links to ResearchNode.id
  source_url: string;
  document_title: string;

  // Version tracking
  version: string;
  version_date: string;             // Date the document version was published
  gazette_number?: string;          // For legislative documents
  act_number?: string;              // e.g., "No.16of2023"

  // Freshness tracking
  fetched_at: string;               // When we downloaded it
  last_checked_at: string;          // When we last verified it's current
  next_check_due: string;           // Scheduled refresh date
  checksum?: string;                // Hash to detect changes

  // Status
  status: 'current' | 'superseded' | 'pending_review' | 'archived';
  superseded_by?: string;           // ID of newer document if superseded

  // Storage
  local_path?: string;              // Path to cached copy
  file_size_bytes?: number;
  mime_type?: string;
}

/**
 * Agent scan result for document interpretation
 */
export interface DocumentScanResult {
  id: string;
  document_id: string;
  scanned_at: string;
  agent_model: string;

  // Extracted compliance requirements
  extracted_fields: ExtractedField[];
  governance_rules: string[];
  citations: CitationReference[];

  // Interpretation
  interpretation_summary: string;
  compliance_gaps?: string[];
  recommendations?: string[];

  // Quality metrics
  confidence_score: number;         // 0-1 confidence in extraction
  requires_human_review: boolean;
}

export interface ExtractedField {
  field_id: string;
  label: string;
  type: FieldType;
  is_mandatory: boolean;
  source_section: string;           // Section in source document
  source_page?: number;
  rationale: string;                // Why this field is required
}

export interface CitationReference {
  citation_id: string;
  act_name: string;
  section: string;
  relevance: 'primary' | 'secondary' | 'contextual';
}

// Added LegislationLibrary type to fix import errors in Engine.tsx and LegislationViewer.tsx
export type LegislationLibrary = Record<string, {
  act_name: string;
  section_title: string;
  content: string;
  analysis?: string;
}>;

export interface Field {
  id: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  options?: string[];
  default_value?: any;
  section_citation?: string;
  research_node_id?: string; // Link to research/benchmarks
  is_identity_field?: boolean;
  ui_config?: {
    grid_span?: 1 | 2;
    help_text?: string;
    extrapolated_from?: string;
  };
}

export interface FormSection {
  id: string;
  title: string;
  description?: string;
  field_ids: string[];
}

export interface Domain {
  id: string;
  title: string;
  sections: FormSection[];
  fields: Field[];
  research_artifacts: ResearchNode[];
  governance_rules: any[];
  subject_identifier_field: string;
}

export interface Manifest {
  id: string;
  version: string;
  compiled_at: string;
  config: {
    currency: string;
    locale: string;
    theme: 'modern';
    region: string;
  };
  domains: Domain[];
  library: LegislationLibrary;
}

export interface Submission {
  id: string;
  manifest_id: string;
  domain_id: string;
  subject_id: string;
  data: Record<string, any>;
  timestamp: string;
  status: 'FINALIZED' | 'PENDING' | 'FLAGGED';
}

export interface ClientRecord {
  id: string;
  name: string;
  metadata: Record<string, any>;
  submissions: Submission[];
}
