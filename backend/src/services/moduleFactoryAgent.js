/**
 * Module Factory Agent - Chameleon Protocol
 *
 * Takes the Expert Context and Ideation Document to:
 * 1. Intelligently split work into separate manifest modules
 * 2. Generate each module with proper formatting
 * 3. Ensure modules work together with common references
 * 4. Save modules to the database (marketplace)
 *
 * Key difference from the old approach:
 * - Each module is generated independently with focused context
 * - Modules have explicit dependencies and relationships
 * - Context is compressed and targeted per module
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { randomUUID } from 'crypto';
import Manifest from '../models/Manifest.js';

/**
 * Module Factory Agent class
 */
export class ModuleFactoryAgent {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);

    // Use a capable model for manifest generation
    this.manifestModel = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 65000,
        temperature: 0.4
      }
    });

    // Lighter model for planning and validation
    this.planningModel = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 16000,
        temperature: 0.3
      }
    });
  }

  /**
   * Generate all modules for a module pack
   *
   * @param {object} modulePackConfig - Configuration including expert context and ideation
   * @param {function} onProgress - Progress callback for streaming updates
   * @returns {Promise<object[]>} - Array of generated manifest results
   */
  async generateModules(modulePackConfig, onProgress = null) {
    const {
      modulePackId,
      expertContext,
      ideationDocument,
      config,
      refinedOntology = null
    } = modulePackConfig;

    this.emitProgress(onProgress, {
      phase: 'planning',
      status: 'starting',
      message: 'Planning module generation strategy...'
    });

    const results = [];

    try {
      // Phase 1: Plan module generation order
      const generationPlan = await this.planModuleGeneration(
        ideationDocument.proposed_modules,
        expertContext,
        config
      );

      this.emitProgress(onProgress, {
        phase: 'planning',
        status: 'complete',
        message: `Planned generation of ${generationPlan.length} modules`
      });

      // Phase 2: Generate each module
      for (let i = 0; i < generationPlan.length; i++) {
        const modulePlan = generationPlan[i];

        this.emitProgress(onProgress, {
          phase: 'generating',
          status: 'in_progress',
          message: `Generating module ${i + 1}/${generationPlan.length}: ${modulePlan.title}`,
          currentModule: modulePlan.module_type,
          progress: Math.round((i / generationPlan.length) * 100)
        });

        try {
          const startTime = Date.now();

          // Build focused context for this specific module
          const moduleContext = this.buildModuleContext(
            modulePlan,
            expertContext,
            ideationDocument,
            results, // Pass previously generated modules for reference
            refinedOntology
          );

          // Generate the manifest
          const manifest = await this.generateSingleManifest(
            modulePlan,
            moduleContext,
            config,
            modulePackId
          );

          // Save to database
          await this.saveManifest(manifest);

          const generationTime = Date.now() - startTime;

          results.push({
            manifest_id: manifest.id,
            module_type: modulePlan.module_type,
            title: modulePlan.title,
            description: modulePlan.description,
            order: i,
            status: 'completed',
            dependencies: modulePlan.dependencies || [],
            domains_count: manifest.domains?.length || 0,
            fields_count: this.countFields(manifest),
            generation_time_ms: generationTime,
            generated_at: new Date()
          });

          this.emitProgress(onProgress, {
            phase: 'generating',
            status: 'module_complete',
            message: `Completed: ${modulePlan.title}`,
            manifestId: manifest.id,
            fieldsGenerated: this.countFields(manifest)
          });

        } catch (moduleError) {
          console.error(`Failed to generate module ${modulePlan.title}:`, moduleError);

          results.push({
            manifest_id: null,
            module_type: modulePlan.module_type,
            title: modulePlan.title,
            description: modulePlan.description,
            order: i,
            status: 'failed',
            error_message: moduleError.message,
            generated_at: new Date()
          });

          this.emitProgress(onProgress, {
            phase: 'generating',
            status: 'module_failed',
            message: `Failed: ${modulePlan.title} - ${moduleError.message}`,
            error: moduleError.message
          });
        }
      }

      // Phase 3: Validate module relationships
      this.emitProgress(onProgress, {
        phase: 'validation',
        status: 'starting',
        message: 'Validating module relationships and dependencies...'
      });

      const validationResult = await this.validateModuleRelationships(results);

      this.emitProgress(onProgress, {
        phase: 'complete',
        status: 'success',
        message: `Generated ${results.filter(r => r.status === 'completed').length}/${results.length} modules successfully`,
        summary: {
          total: results.length,
          completed: results.filter(r => r.status === 'completed').length,
          failed: results.filter(r => r.status === 'failed').length,
          totalFields: results.reduce((sum, r) => sum + (r.fields_count || 0), 0),
          validation: validationResult
        }
      });

      return results;

    } catch (error) {
      this.emitProgress(onProgress, {
        phase: 'error',
        status: 'failed',
        message: `Module generation failed: ${error.message}`
      });
      throw error;
    }
  }

  /**
   * Plan the order and approach for generating modules
   * @param {Array} proposedModules - Modules from ideation
   * @param {Object} _expertContext - Expert context (reserved for future use)
   * @param {Object} _config - Config (reserved for future use)
   */
  async planModuleGeneration(proposedModules, _expertContext, _config) {
    // Sort by priority and dependencies
    const sorted = [...proposedModules].sort((a, b) => {
      // Priority first
      if ((a.priority || 99) !== (b.priority || 99)) {
        return (a.priority || 99) - (b.priority || 99);
      }
      // Then by dependency count (fewer dependencies first)
      return (a.dependencies?.length || 0) - (b.dependencies?.length || 0);
    });

    // Ensure each module has required fields
    return sorted.map((module, index) => ({
      ...module,
      order: index,
      module_type: module.module_type || 'custom',
      title: module.title || `Module ${index + 1}`,
      description: module.description || '',
      dependencies: module.dependencies || [],
      key_features: module.key_features || [],
      estimated_complexity: module.estimated_complexity || 'medium'
    }));
  }

  /**
   * Build focused context for a specific module
   * This is key to avoiding context explosion
   */
  buildModuleContext(modulePlan, expertContext, ideationDocument, previousModules, refinedOntology = null) {
    // Extract only relevant parts of expert context
    const relevantCategories = expertContext.research_categories?.filter(cat => {
      // Filter based on module type
      const relevantForModule = {
        'client-entity': ['stakeholder', 'technical', 'legislative'],
        'data-collection': ['technical', 'best_practices', 'legislative'],
        'user-management': ['stakeholder', 'legislative'],
        'reporting': ['best_practices', 'technical', 'legislative'],
        'workflow': ['best_practices', 'technical'],
        'communications': ['stakeholder', 'technical'],
        'notes': ['best_practices', 'technical'],
        'calendar': ['technical'],
        'tasks': ['technical', 'best_practices']
      };

      const relevantTypes = relevantForModule[modulePlan.module_type] || ['technical'];
      return relevantTypes.includes(cat.category);
    }) || [];

    // Extract relevant requirements
    const relevantRequirements = {
      functional: ideationDocument.requirements?.functional?.filter(req =>
        modulePlan.requirements_addressed?.some(ra => req.includes(ra)) ||
        this.isRequirementRelevant(req, modulePlan)
      ) || [],
      constraints: ideationDocument.requirements?.constraints || []
    };

    // Extract relevant data entities
    const relevantEntities = ideationDocument.data_model_outline?.entities?.filter(entity =>
      modulePlan.domains?.some(d => entity.name.toLowerCase().includes(d.toLowerCase())) ||
      modulePlan.key_features?.some(f => entity.description?.toLowerCase().includes(f.toLowerCase()))
    ) || [];

    // Reference to previous modules (for relationships)
    const moduleReferences = previousModules
      .filter(m => m.status === 'completed')
      .map(m => ({
        id: m.manifest_id,
        type: m.module_type,
        title: m.title,
        domains: m.domains_count
      }));

    return {
      // Compressed expert context
      expertSummary: expertContext.summary?.substring(0, 2000) || '',
      relevantInsights: expertContext.key_insights?.slice(0, 5) || [],
      complianceRequirements: expertContext.compliance_requirements || [],
      relevantResearch: relevantCategories.map(c => ({
        category: c.category,
        content: c.content?.substring(0, 3000) || '',
        sources: c.sources || []
      })),
      deepResearchSources: expertContext.deep_research_sources || [],

      // Filtered ideation context
      requirements: relevantRequirements,
      dataEntities: relevantEntities,
      workflows: ideationDocument.workflow_outline?.filter(w =>
        modulePlan.key_features?.some(f => w.name.toLowerCase().includes(f.toLowerCase()))
      ) || [],

      // Module relationship context
      relatedModules: moduleReferences,

      // Module-specific focus
      moduleFocus: {
        type: modulePlan.module_type,
        title: modulePlan.title,
        description: modulePlan.description,
        keyFeatures: modulePlan.key_features,
        domains: modulePlan.domains || []
      },

      // Ontology context (if available)
      ontologyContext: refinedOntology ? {
        matchingCapability: refinedOntology.capabilities?.find(c =>
          c.mapped_module_type === modulePlan.module_type
        ) || null,
        relatedEntities: refinedOntology.data_entities?.filter(e =>
          modulePlan.key_features?.some(f => e.toLowerCase().includes(f.toLowerCase().split(' ')[0]))
        ) || [],
        complianceDomains: refinedOntology.compliance_domains || []
      } : null
    };
  }

  /**
   * Check if a requirement is relevant to a module
   */
  isRequirementRelevant(requirement, modulePlan) {
    const reqLower = requirement.toLowerCase();
    const features = modulePlan.key_features || [];
    const title = (modulePlan.title || '').toLowerCase();

    return features.some(f => reqLower.includes(f.toLowerCase())) ||
      reqLower.includes(title) ||
      reqLower.includes(modulePlan.module_type);
  }

  /**
   * Generate a single manifest for a module
   */
  async generateSingleManifest(modulePlan, moduleContext, config, modulePackId) {
    const manifestId = `${modulePlan.module_type}-${randomUUID().substring(0, 8)}`;

    const prompt = this.buildManifestPrompt(modulePlan, moduleContext, config, manifestId);

    const result = await this.manifestModel.generateContent(prompt);
    const responseText = result.response.text();

    // Extract JSON from response
    let manifest = this.extractManifest(responseText);

    if (!manifest) {
      throw new Error('Failed to generate valid manifest JSON');
    }

    // Normalize manifest to fix common AI output issues (options as objects, grid_span > 2, etc.)
    manifest = this.normalizeManifest(manifest);

    // Ensure required fields
    manifest.id = manifestId;
    manifest.version = '1.0.0';
    manifest.compiled_at = new Date();
    manifest.module_pack_id = modulePackId;
    manifest.module_type = modulePlan.module_type;
    manifest.module_metadata = {
      title: modulePlan.title,
      description: modulePlan.description,
      dependencies: modulePlan.dependencies,
      priority: modulePlan.priority || 0,
      tags: modulePlan.key_features?.slice(0, 5) || []
    };
    manifest.config = {
      ...manifest.config,
      region: config.region,
      currency: config.currency || 'USD',
      locale: config.locale || 'en-US'
    };

    // Validate manifest structure
    this.validateManifestStructure(manifest);

    return manifest;
  }

  /**
   * Build the manifest generation prompt
   * Focused and efficient to avoid context explosion
   */
  buildManifestPrompt(modulePlan, moduleContext, config, manifestId) {
    return `
You are generating a manifest module for the Chameleon Protocol.

**MODULE TO GENERATE:**
- Type: ${modulePlan.module_type}
- Title: ${modulePlan.title}
- Description: ${modulePlan.description}

**KEY FEATURES TO IMPLEMENT:**
${modulePlan.key_features?.map((f, i) => `${i + 1}. ${f}`).join('\n') || 'Standard features for this module type'}

**CONFIGURATION:**
- Region: ${config.region}
- Currency: ${config.currency || 'USD'}
- Locale: ${config.locale || 'en-US'}

**EXPERT CONTEXT (Compressed):**
${moduleContext.expertSummary}

**KEY INSIGHTS:**
${moduleContext.relevantInsights?.join('\n') || 'None'}

**COMPLIANCE REQUIREMENTS:**
${moduleContext.complianceRequirements?.join('\n') || 'Standard compliance'}

**RELEVANT REQUIREMENTS:**
${moduleContext.requirements?.functional?.slice(0, 10).join('\n') || 'Standard requirements'}

**DATA ENTITIES FOR THIS MODULE:**
${JSON.stringify(moduleContext.dataEntities?.slice(0, 5), null, 2) || '[]'}

**RELATED MODULES (for relationships):**
${JSON.stringify(moduleContext.relatedModules, null, 2) || '[]'}
${moduleContext.ontologyContext ? `
**ONTOLOGY CONTEXT (validated domain knowledge):**
${moduleContext.ontologyContext.matchingCapability ? `- Matching Capability: ${moduleContext.ontologyContext.matchingCapability.name}
  Sub-capabilities: ${moduleContext.ontologyContext.matchingCapability.sub_capabilities?.join(', ') || 'None'}
  Research Evidence: ${moduleContext.ontologyContext.matchingCapability.research_evidence || 'N/A'}` : '- No direct capability match'}
${moduleContext.ontologyContext.relatedEntities.length > 0 ? `- Related Data Entities: ${moduleContext.ontologyContext.relatedEntities.join(', ')}` : ''}
${moduleContext.ontologyContext.complianceDomains.length > 0 ? `- Compliance Domains: ${moduleContext.ontologyContext.complianceDomains.join(', ')}` : ''}
` : ''}

**RESEARCH SOURCES (use to populate research_artifacts and library):**
${JSON.stringify([
  ...(moduleContext.relevantResearch?.flatMap(r => r.sources || []) || []),
  ...(moduleContext.deepResearchSources?.slice(0, 10) || [])
].slice(0, 20), null, 2) || '[]'}

**LOCALE:** ${config.locale || 'en-US'}
${config.locale && config.locale !== 'en-US' ? `IMPORTANT: Generate all user-facing text (labels, placeholders, help_text, option values) in the ${config.locale} locale language. Keep field IDs in English snake_case.` : ''}

**STRICT FORMAT REQUIREMENTS:**

1. **Field options MUST be simple strings**, NOT objects:
   - CORRECT: "options": ["Male", "Female", "Other"]
   - WRONG: "options": [{"label": "Male", "value": "male"}]

2. **grid_span MUST be 1 or 2 only** (for 2-column layout):
   - Use 1 for single-column fields
   - Use 2 for full-width fields (like textarea, map, photo)

3. **Field types allowed**: text, number, date, select, multiselect, textarea, bool, file, photo, map, tel, email

4. **Field structure**:
   - Required: id (snake_case), label, type
   - Optional: placeholder, options (array of strings), is_identity_field, ui_config
   - ui_config contains: grid_span (1 or 2), help_text (string)

5. **Sections reference fields by id** in field_ids array

**EXAMPLE FIELD (FOLLOW THIS EXACTLY):**
{
  "id": "gender",
  "label": "Gender",
  "type": "select",
  "options": ["Male", "Female", "Non-binary", "Prefer not to say"],
  "ui_config": {
    "grid_span": 1
  }
}

{
  "id": "full_name",
  "label": "Full Name",
  "type": "text",
  "placeholder": "Enter full legal name",
  "is_identity_field": true,
  "ui_config": {
    "grid_span": 2,
    "help_text": "As it appears on official documents"
  }
}

{
  "id": "notes",
  "label": "Additional Notes",
  "type": "textarea",
  "placeholder": "Enter any additional information",
  "ui_config": {
    "grid_span": 2
  }
}

**OUTPUT:**
Return ONLY valid JSON. Do not wrap in markdown code blocks.

{
  "id": "${manifestId}",
  "version": "1.0.0",
  "compiled_at": "${new Date().toISOString()}",
  "config": {
    "region": "${config.region}",
    "currency": "${config.currency || 'USD'}",
    "locale": "${config.locale || 'en-US'}",
    "theme": "modern"
  },
  "module_type": "${modulePlan.module_type || 'custom'}",
  "module_metadata": {
    "title": "${modulePlan.title}",
    "description": "${modulePlan.description || ''}",
    "dependencies": [],
    "priority": ${modulePlan.priority || 0},
    "tags": []
  },
  "domains": [
    {
      "id": "domain_id",
      "title": "Domain Title",
      "subject_identifier_field": "primary_id_field",
      "sections": [
        {
          "id": "section_id",
          "title": "Section Title",
          "description": "Section description",
          "field_ids": ["field1", "field2"]
        }
      ],
      "fields": [
        // 10-20 fields following the exact format above
      ],
      "research_artifacts": [
        {
          "id": "unique_artifact_id",
          "title": "Source or regulation title",
          "url": "https://example.com/source",
          "type": "legislation|standard|guideline|research",
          "summary": "Brief description of how this source informed this domain"
        }
      ],
      "governance_rules": []
    }
  ],
  "library": {
    "legislation_key": {
      "act_name": "Full Act/Regulation Title",
      "section_title": "Relevant Section Title",
      "content": "Key content or requirements from this legislation",
      "analysis": "How this legislation applies to the module"
    }
  }
}

**IMPORTANT for research_artifacts and library:**
- Populate research_artifacts on EACH domain with the sources from the RESEARCH SOURCES section above that are relevant to that domain
- Populate the library object with legislation and regulatory citations relevant to compliance fields
- For fields that relate to compliance/legislative requirements, set "section_citation" pointing to the matching library key
- Example: a field tracking consent should have "section_citation": "privacy_act" and library should contain "privacy_act": { "title": "Privacy Act ...", ... }

Generate 10-20 well-designed fields per domain. Use simple string arrays for options. Grid span must be 1 or 2 only.
`;
  }

  /**
   * Extract manifest JSON from response
   */
  extractManifest(responseText) {
    try {
      // Try to find JSON in markdown code blocks
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        return JSON.parse(codeBlockMatch[1].trim());
      }

      // Try to find raw JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse manifest JSON:', e);
    }

    return null;
  }

  /**
   * Normalize manifest to match expected schema
   * Fixes common AI output issues
   */
  normalizeManifest(manifest) {
    if (!manifest.domains) return manifest;

    for (const domain of manifest.domains) {
      if (!domain.fields) continue;

      for (const field of domain.fields) {
        // Fix options: convert objects to simple strings
        if (field.options && Array.isArray(field.options)) {
          field.options = field.options.map(opt => {
            if (typeof opt === 'object' && opt !== null) {
              // Extract label or value from object
              return opt.label || opt.value || String(opt);
            }
            return String(opt);
          });
        }

        // Fix grid_span: ensure it's 1 or 2
        if (field.ui_config && field.ui_config.grid_span) {
          const span = field.ui_config.grid_span;
          if (span > 2) {
            field.ui_config.grid_span = 2;
          } else if (span < 1) {
            field.ui_config.grid_span = 1;
          }
        }

        // Ensure options is an array (even if empty) for select/multiselect
        if ((field.type === 'select' || field.type === 'multiselect') && !field.options) {
          field.options = [];
        }

        // Ensure ui_config exists
        if (!field.ui_config) {
          field.ui_config = { grid_span: 1 };
        }
      }

      // Ensure research_artifacts and governance_rules exist
      if (!domain.research_artifacts) domain.research_artifacts = [];
      if (!domain.governance_rules) domain.governance_rules = [];

      // Fix research_artifacts: ensure each has an id
      for (let i = 0; i < domain.research_artifacts.length; i++) {
        const artifact = domain.research_artifacts[i];
        if (!artifact.id) {
          artifact.id = `artifact_${domain.id}_${i + 1}`;
        }
      }
    }

    // Ensure library exists
    if (!manifest.library) manifest.library = {};

    // Fix library entries: ensure act_name exists (AI sometimes generates "title" instead)
    if (typeof manifest.library === 'object') {
      for (const key of Object.keys(manifest.library)) {
        const entry = manifest.library[key];
        if (!entry.act_name && entry.title) {
          entry.act_name = entry.title;
          delete entry.title;
        }
        if (!entry.act_name) {
          entry.act_name = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
        if (!entry.section_title) {
          entry.section_title = entry.citation || entry.sections?.[0] || 'General';
        }
        if (!entry.content) {
          entry.content = entry.summary || '';
        }
        if (!entry.analysis) {
          entry.analysis = entry.summary || '';
        }
      }
    }

    return manifest;
  }

  /**
   * Validate manifest structure
   */
  validateManifestStructure(manifest) {
    if (!manifest.id) throw new Error('Manifest missing id');
    if (!manifest.version) throw new Error('Manifest missing version');
    if (!manifest.domains || !Array.isArray(manifest.domains)) {
      throw new Error('Manifest missing domains array');
    }
    if (manifest.domains.length === 0) {
      throw new Error('Manifest has no domains');
    }

    // Validate each domain
    for (const domain of manifest.domains) {
      if (!domain.id) throw new Error('Domain missing id');
      if (!domain.title) throw new Error('Domain missing title');
      if (!domain.fields || !Array.isArray(domain.fields)) {
        throw new Error(`Domain ${domain.id} missing fields array`);
      }

      // Validate fields
      for (const field of domain.fields) {
        if (!field.id) throw new Error('Field missing id');
        if (!field.label) throw new Error(`Field ${field.id} missing label`);
        if (!field.type) throw new Error(`Field ${field.id} missing type`);
      }
    }

    return true;
  }

  /**
   * Save manifest to database
   */
  async saveManifest(manifest) {
    const manifestDoc = new Manifest(manifest);
    await manifestDoc.save();
    return manifest;
  }

  /**
   * Count total fields in a manifest
   */
  countFields(manifest) {
    return manifest.domains?.reduce((sum, domain) =>
      sum + (domain.fields?.length || 0), 0) || 0;
  }

  /**
   * Validate relationships between generated modules
   */
  async validateModuleRelationships(results) {
    const completedModules = results.filter(r => r.status === 'completed');
    const issues = [];

    // Check that dependencies are satisfied
    for (const module of completedModules) {
      for (const dep of (module.dependencies || [])) {
        const depModule = completedModules.find(m =>
          m.module_type === dep || m.title.toLowerCase().includes(dep.toLowerCase())
        );
        if (!depModule) {
          issues.push({
            module: module.title,
            issue: `Missing dependency: ${dep}`
          });
        }
      }
    }

    return {
      valid: issues.length === 0,
      issues
    };
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
 * Create configured module factory agent
 */
export function createModuleFactoryAgent() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  return new ModuleFactoryAgent(apiKey);
}

export default ModuleFactoryAgent;
