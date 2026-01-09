
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
  source: 'WHO' | 'UN' | 'HRC' | 'LocalStatute' | 'NGO_Standard';
  title: string;
  url: string;
  content_summary: string;
  benchmark_metrics: Record<string, any>;
  tags: string[];
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
