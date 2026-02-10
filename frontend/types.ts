
export type FieldType = 
  | 'text' 
  | 'string'
  | 'number' 
  | 'photo' 
  | 'bool'
  | 'boolean'
  | 'select' 
  | 'date' 
  | 'textarea' 
  | 'relationship' 
  | 'map' 
  | 'file' 
  | 'multiselect'
  | 'tel'
  | 'email'
  | 'checkbox';

export interface ResearchNode {
  id: string;
  source: 'WHO' | 'UN' | 'HRC' | 'LocalStatute' | 'NGO_Standard';
  title: string;
  url: string;
  content_summary: string;
  cached_content?: string; // New: Stores the full text/analysis locally
  benchmark_metrics: Record<string, any>;
  tags: string[];
}

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
  research_node_id?: string;
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
  order?: number;
  author?: {
    id: string;
    name: string;
    email: string;
  };
  created_by?: string;
  visibility?: 'PUBLIC' | 'PRIVATE';
  module_pack_id?: string;
  module_type?: 'standalone' | 'user-management' | 'client-entity' | 'data-collection' | 'data-views' | 'communications' | 'notes' | 'calendar' | 'tasks' | 'workflow' | 'reporting' | 'custom';
  module_metadata?: {
    title?: string;
    description?: string;
    dependencies?: string[];
    priority?: number;
    tags?: string[];
  };
  config: {
    currency: string;
    locale: string;
    theme: 'modern';
    region: string;
  };
  domains: Domain[];
  library: LegislationLibrary;
}

export interface OntologyCapability {
  id: string;
  name: string;
  sub_capabilities: string[];
  confirmed_by_research?: boolean;
  mapped_module_type?: string;
  research_evidence?: string;
}

export interface DomainClassification {
  primary_domain: string;
  sub_domain: string;
  secondary_domains: string[];
  ontology: {
    capabilities: OntologyCapability[];
    data_entities: string[];
    compliance_domains: string[];
    workflow_patterns: string[];
  };
  regional_factors: {
    regulatory_bodies: string[];
    key_legislation: string[];
    cultural_considerations: string[];
  };
  research_tracks_needed: string[];
  confidence: number;
  user_confirmed: boolean;
  user_adjustments?: any;
}

export interface RefinedOntology {
  capabilities: OntologyCapability[];
  data_entities: string[];
  compliance_domains: string[];
  workflow_patterns: string[];
  research_gaps: string[];
  refined_at?: string;
}

export interface InterviewMessage {
  id: string;
  role: 'agent' | 'user' | 'system';
  content: string;
  category?: string;
  question_id?: string;
  metadata?: any;
  timestamp: string;
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

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SUPERVISOR' | 'WORKER';
  domain_permissions: string[];
  is_active: boolean;
  last_login?: string;
  created_at: string;
  preferences?: {
    manifest_order?: string[];
    archived_manifest_ids?: string[];
    archived_artifact_ids?: string[];
  };
}
