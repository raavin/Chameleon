/**
 * Domain Classification Agent - Chameleon Protocol
 *
 * Classifies the user's request into a primary domain, generates a
 * domain-specific ontology, and identifies research tracks.
 * Also refines the ontology after research completes.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { MODULE_TYPES } from '../schemas/moduleSchemas.js';

export const TOP_LEVEL_DOMAINS = [
  'Healthcare',
  'Education',
  'Finance',
  'Social Services',
  'Legal',
  'Government',
  'Retail',
  'Manufacturing',
  'Logistics',
  'Non-profit',
  'Real Estate',
  'Other'
];

/**
 * Domain Classification Agent class
 */
export class DomainClassificationAgent {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.model = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 16000,
        temperature: 0.3
      }
    });
  }

  /**
   * Classify the domain and generate initial ontology
   * @param {object} request - Classification request
   * @param {function} onProgress - Progress callback
   * @returns {Promise<object>} - Domain classification document
   */
  async classifyDomain(request, onProgress = null) {
    const {
      topic,
      domains = [],
      region,
      projectName = '',
      fundingBody = '',
      additionalContext = '',
      uploadedDocsContent = ''
    } = request;

    this.emitProgress(onProgress, {
      phase: 'domain_classification',
      status: 'starting',
      message: 'Analyzing request to classify domain...'
    });

    try {
      // Step 1: Classify into primary domain, sub-domain, secondary domains
      this.emitProgress(onProgress, {
        phase: 'domain_classification',
        status: 'in_progress',
        message: 'Step 1/3: Classifying primary domain...'
      });

      const classificationPrompt = `
You are a domain classification expert. Analyze the following request and classify it into a structured domain taxonomy.

**Available Top-Level Domains:** ${TOP_LEVEL_DOMAINS.join(', ')}

**Request Details:**
- Topic: ${topic}
- Focus Domains: ${domains.join(', ') || 'Not specified'}
- Region: ${region}
- Project Name: ${projectName || 'Not specified'}
- Funding Body: ${fundingBody || 'Not specified'}
- Additional Context: ${additionalContext || 'None'}
${uploadedDocsContent ? `- Uploaded Documents Content (excerpt): ${uploadedDocsContent.substring(0, 5000)}` : ''}

**Task:**
1. Identify the primary domain from the top-level domains list (or suggest a custom one if none fit)
2. Identify a specific sub-domain within the primary domain
3. Identify any secondary domains that overlap

Return ONLY valid JSON:
{
  "primary_domain": "Healthcare",
  "sub_domain": "Mental Health Services",
  "secondary_domains": ["Social Services", "Legal"],
  "confidence": 0.92
}
`;

      const classResult = await this.model.generateContent(classificationPrompt);
      const classText = classResult.response.text();
      let classification;

      try {
        const jsonMatch = classText.match(/\{[\s\S]*\}/);
        classification = jsonMatch ? JSON.parse(jsonMatch[0]) : {
          primary_domain: domains[0] || 'Other',
          sub_domain: topic,
          secondary_domains: [],
          confidence: 0.5
        };
      } catch (e) {
        classification = {
          primary_domain: domains[0] || 'Other',
          sub_domain: topic,
          secondary_domains: [],
          confidence: 0.5
        };
      }

      this.emitProgress(onProgress, {
        phase: 'domain_classification',
        status: 'in_progress',
        message: `Classified as ${classification.primary_domain} > ${classification.sub_domain} (${Math.round(classification.confidence * 100)}% confidence)`
      });

      // Step 2: Generate domain-specific ontology
      this.emitProgress(onProgress, {
        phase: 'domain_classification',
        status: 'in_progress',
        message: 'Step 2/3: Generating domain-specific ontology...'
      });

      const moduleTypeValues = Object.values(MODULE_TYPES);
      const ontologyPrompt = `
You are a domain ontology expert. Generate a comprehensive ontology for building a software application in the following domain.

**Domain:** ${classification.primary_domain} > ${classification.sub_domain}
**Secondary Domains:** ${classification.secondary_domains.join(', ') || 'None'}
**Topic:** ${topic}
**Region:** ${region}
**Focus Areas:** ${domains.join(', ') || 'General'}

**Available Module Types for Mapping:** ${moduleTypeValues.join(', ')}

**Task:**
Generate a domain-specific ontology that identifies:
1. Core capabilities the software must have (with sub-capabilities)
2. Key data entities that need to be managed
3. Compliance domains that apply
4. Common workflow patterns in this domain

**Example (Healthcare > Mental Health Services):**
{
  "capabilities": [
    {
      "id": "client_management",
      "name": "Client/Patient Management",
      "sub_capabilities": ["Intake & Registration", "Demographics", "Consent Management", "Risk Assessment"],
      "mapped_module_type": "client-entity"
    },
    {
      "id": "clinical_documentation",
      "name": "Clinical Documentation",
      "sub_capabilities": ["Progress Notes", "Treatment Plans", "Assessments", "Discharge Summaries"],
      "mapped_module_type": "notes"
    },
    {
      "id": "appointment_scheduling",
      "name": "Appointment Scheduling",
      "sub_capabilities": ["Calendar Management", "Reminders", "Waitlist Management"],
      "mapped_module_type": "calendar"
    }
  ],
  "data_entities": ["Client", "Clinician", "Appointment", "Treatment Plan", "Assessment", "Referral"],
  "compliance_domains": ["HIPAA", "State Mental Health Act", "Mandatory Reporting", "Privacy Act"],
  "workflow_patterns": ["Intake → Assessment → Treatment Planning → Service Delivery → Review → Discharge", "Referral Processing", "Crisis Response Protocol"]
}

Generate a thorough ontology for: ${classification.primary_domain} > ${classification.sub_domain}

Return ONLY valid JSON with the structure shown above.
`;

      const ontologyResult = await this.model.generateContent(ontologyPrompt);
      const ontologyText = ontologyResult.response.text();
      let ontology;

      try {
        const jsonMatch = ontologyText.match(/\{[\s\S]*\}/);
        ontology = jsonMatch ? JSON.parse(jsonMatch[0]) : {
          capabilities: [],
          data_entities: [],
          compliance_domains: [],
          workflow_patterns: []
        };
      } catch (e) {
        ontology = {
          capabilities: [],
          data_entities: [],
          compliance_domains: [],
          workflow_patterns: []
        };
      }

      this.emitProgress(onProgress, {
        phase: 'domain_classification',
        status: 'in_progress',
        message: `Generated ontology: ${ontology.capabilities?.length || 0} capabilities, ${ontology.data_entities?.length || 0} entities, ${ontology.compliance_domains?.length || 0} compliance domains`
      });

      // Step 3: Identify regional factors and research tracks
      this.emitProgress(onProgress, {
        phase: 'domain_classification',
        status: 'in_progress',
        message: 'Step 3/3: Identifying regional factors and research tracks...'
      });

      const regionalPrompt = `
Identify regional factors and specific research tracks needed for a ${classification.primary_domain} (${classification.sub_domain}) software application in ${region}.

${fundingBody ? `Funding Body: ${fundingBody}` : ''}

Return ONLY valid JSON:
{
  "regional_factors": {
    "regulatory_bodies": ["List of relevant regulatory bodies in ${region}"],
    "key_legislation": ["Specific laws, acts, and regulations that apply"],
    "cultural_considerations": ["Cultural factors that affect service delivery and software design"]
  },
  "research_tracks_needed": [
    "Specific research track 1 (e.g., 'HIPAA compliance requirements for telehealth')",
    "Specific research track 2",
    "Up to 8 focused research tracks"
  ]
}
`;

      const regionalResult = await this.model.generateContent(regionalPrompt);
      const regionalText = regionalResult.response.text();
      let regional;

      try {
        const jsonMatch = regionalText.match(/\{[\s\S]*\}/);
        regional = jsonMatch ? JSON.parse(jsonMatch[0]) : {
          regional_factors: { regulatory_bodies: [], key_legislation: [], cultural_considerations: [] },
          research_tracks_needed: []
        };
      } catch (e) {
        regional = {
          regional_factors: { regulatory_bodies: [], key_legislation: [], cultural_considerations: [] },
          research_tracks_needed: []
        };
      }

      const fullClassification = {
        primary_domain: classification.primary_domain,
        sub_domain: classification.sub_domain,
        secondary_domains: classification.secondary_domains,
        ontology,
        regional_factors: regional.regional_factors,
        research_tracks_needed: regional.research_tracks_needed,
        confidence: classification.confidence,
        user_confirmed: false,
        user_adjustments: null
      };

      this.emitProgress(onProgress, {
        phase: 'domain_classification',
        status: 'complete',
        message: `Domain classification complete: ${classification.primary_domain} > ${classification.sub_domain}`,
        details: {
          primary_domain: classification.primary_domain,
          sub_domain: classification.sub_domain,
          capabilities_count: ontology.capabilities?.length || 0,
          research_tracks: regional.research_tracks_needed?.length || 0,
          confidence: classification.confidence
        }
      });

      return fullClassification;

    } catch (error) {
      this.emitProgress(onProgress, {
        phase: 'domain_classification',
        status: 'failed',
        message: `Domain classification failed: ${error.message}`
      });
      throw error;
    }
  }

  /**
   * Refine ontology based on research findings
   * @param {object} classification - Initial domain classification
   * @param {object} expertContext - Expert research context
   * @param {function} onProgress - Progress callback
   * @returns {Promise<object>} - Refined ontology
   */
  async refineOntologyFromResearch(classification, expertContext, onProgress = null) {
    this.emitProgress(onProgress, {
      phase: 'ontology_refinement',
      status: 'starting',
      message: 'Refining ontology based on research findings...'
    });

    try {
      const moduleTypeValues = Object.values(MODULE_TYPES);
      const prompt = `
You are validating and refining a domain ontology against research findings.

**Initial Ontology (pre-research):**
${JSON.stringify(classification.ontology, null, 2)}

**Domain:** ${classification.primary_domain} > ${classification.sub_domain}

**Research Findings Summary:**
${expertContext.summary?.substring(0, 5000) || ''}

**Key Insights from Research:**
${expertContext.key_insights?.join('\n') || 'None'}

**Compliance Requirements Found:**
${expertContext.compliance_requirements?.join('\n') || 'None'}

**Recommended Modules from Research:**
${JSON.stringify(expertContext.recommended_modules?.slice(0, 10), null, 2) || '[]'}

**Available Module Types:** ${moduleTypeValues.join(', ')}

**Task:**
1. Validate each capability from the initial ontology - mark as confirmed_by_research: true/false
2. Add research_evidence for confirmed capabilities (brief quote or reference)
3. Add any NEW capabilities discovered during research that were missing from initial ontology
4. Map each capability to the most appropriate module type
5. Update data_entities and compliance_domains based on research
6. Identify research_gaps - areas that need more investigation

Return ONLY valid JSON:
{
  "capabilities": [
    {
      "id": "capability_id",
      "name": "Capability Name",
      "sub_capabilities": ["sub1", "sub2"],
      "confirmed_by_research": true,
      "mapped_module_type": "client-entity",
      "research_evidence": "Research confirmed this through..."
    }
  ],
  "data_entities": ["Entity1", "Entity2"],
  "compliance_domains": ["Domain1", "Domain2"],
  "workflow_patterns": ["Pattern1", "Pattern2"],
  "research_gaps": ["Gap 1 - area needing more investigation", "Gap 2"]
}
`;

      const result = await this.model.generateContent(prompt);
      const responseText = result.response.text();
      let refinedOntology;

      try {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        refinedOntology = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
      } catch (e) {
        console.error('Failed to parse refined ontology:', e);
        refinedOntology = null;
      }

      if (!refinedOntology) {
        // Fall back to initial ontology with research flags
        refinedOntology = {
          ...classification.ontology,
          research_gaps: ['Ontology refinement parsing failed - manual review needed']
        };
      }

      refinedOntology.refined_at = new Date();

      const confirmed = refinedOntology.capabilities?.filter(c => c.confirmed_by_research).length || 0;
      const total = refinedOntology.capabilities?.length || 0;

      this.emitProgress(onProgress, {
        phase: 'ontology_refinement',
        status: 'complete',
        message: `Ontology refined: ${confirmed}/${total} capabilities confirmed by research, ${refinedOntology.research_gaps?.length || 0} gaps identified`,
        details: {
          confirmed_capabilities: confirmed,
          total_capabilities: total,
          research_gaps: refinedOntology.research_gaps?.length || 0,
          data_entities: refinedOntology.data_entities?.length || 0
        }
      });

      return refinedOntology;

    } catch (error) {
      this.emitProgress(onProgress, {
        phase: 'ontology_refinement',
        status: 'failed',
        message: `Ontology refinement failed: ${error.message}`
      });
      throw error;
    }
  }

  /**
   * Emit progress event
   */
  emitProgress(callback, event) {
    if (callback && typeof callback === 'function') {
      callback({
        ...event,
        timestamp: new Date().toISOString()
      });
    }
  }
}

/**
 * Create configured domain classification agent
 */
export function createDomainClassificationAgent() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  return new DomainClassificationAgent(apiKey);
}

export default DomainClassificationAgent;
