/**
 * Application Architect Agent - Chameleon Protocol
 * 
 * Designs complete modular application architectures:
 * - Selects appropriate modules based on domain requirements
 * - Designs inter-module communication and data flow
 * - Generates module-specific manifests
 * - Creates database schema with relationships
 * - Defines API contracts
 */

import { modelSelector, TASK_TYPES } from '../utils/modelSelector.js';
import { getAllModuleSchemas, MODULE_TYPES } from '../schemas/moduleSchemas.js';

class ArchitectAgent {
  constructor(genAI) {
    this.genAI = genAI;
    this.selectedModules = [];
    this.moduleManifests = [];
    this.dataFlows = [];
    this.databaseSchema = null;
    this.apiContracts = [];
  }

  async designApplication(domain, region, researchKnowledge, onProgress) {
    onProgress?.({ 
      status: 'architect:starting', 
      detail: `Designing application architecture for "${domain}"` 
    });

    await this.selectModules(domain, researchKnowledge, onProgress);
    await this.designDataFlow(onProgress);
    await this.generateModuleManifests(domain, region, researchKnowledge, onProgress);
    await this.designDatabaseSchema(onProgress);
    await this.defineAPIContracts(onProgress);

    onProgress?.({ 
      status: 'architect:complete', 
      detail: `Architecture complete. ${this.selectedModules.length} modules, ${this.databaseSchema?.tables?.length || 0} tables, ${this.apiContracts.length} API endpoints` 
    });

    return {
      modules: this.selectedModules,
      manifests: this.moduleManifests,
      dataFlows: this.dataFlows,
      databaseSchema: this.databaseSchema,
      apiContracts: this.apiContracts
    };
  }

  async selectModules(domain, researchKnowledge, onProgress) {
    onProgress?.({ 
      status: 'architect:selecting-modules', 
      detail: 'Analyzing domain requirements to select appropriate modules' 
    });

    const availableModules = getAllModuleSchemas();
    const moduleDescriptions = availableModules.map(m => 
      `- ${m.metadata.title}: ${m.metadata.description}`
    ).join('\n');

    const task = {
      type: TASK_TYPES.ARCHITECTURE,
      complexity: 'high',
      generationConfig: {
        temperature: 0.4,
        maxOutputTokens: 4000
      }
    };

    const prompt = `You are an application architect. Based on the domain requirements, select the most appropriate modules for this application.

Domain: ${domain}

Research Knowledge:
${researchKnowledge.substring(0, 50000)}

Available Modules:
${moduleDescriptions}

Core modules (always include):
- User Management
- Client & Entity Management
- Data Collection

Additional modules (select based on needs):
- Data Views & Dashboards
- Communications
- Notes & Documentation
- Calendar & Scheduling

Analyze the domain requirements and select modules that would be most valuable. Consider:
1. What data needs to be collected?
2. What workflows are involved?
3. What communication is needed?
4. What reporting is required?
5. What scheduling/calendar needs exist?

Return JSON:
{
  "selectedModules": [
    {
      "type": "module-type",
      "priority": "high|medium|low",
      "rationale": "why this module is needed"
    }
  ],
  "customizations": [
    {
      "module": "module-type",
      "customization": "description of domain-specific customization"
    }
  ]
}`;

    const result = await modelSelector.executeWithFallback(
      this.genAI,
      task,
      async (model) => {
        const response = await model.generateContent(prompt);
        return response.response.text();
      }
    );

    const parsed = this.parseJSON(result);
    this.selectedModules = parsed.selectedModules || [];
    this.customizations = parsed.customizations || [];

    onProgress?.({ 
      status: 'architect:modules-selected', 
      detail: `Selected ${this.selectedModules.length} modules: ${this.selectedModules.map(m => m.type).join(', ')}` 
    });
  }

  async designDataFlow(onProgress) {
    onProgress?.({ 
      status: 'architect:data-flow', 
      detail: 'Designing inter-module data flow and relationships' 
    });

    const task = {
      type: TASK_TYPES.ARCHITECTURE,
      complexity: 'high',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4000
      }
    };

    const modulesDesc = this.selectedModules.map(m => 
      `- ${m.type}: ${m.rationale}`
    ).join('\n');

    const prompt = `You are designing data flow between application modules.

Selected Modules:
${modulesDesc}

Design the data flow and relationships:
1. How do modules communicate?
2. What data is shared between modules?
3. What are the primary relationships?
4. What events trigger cross-module actions?

Return JSON:
{
  "dataFlows": [
    {
      "from": "source-module",
      "to": "target-module",
      "dataType": "what data flows",
      "trigger": "what triggers the flow",
      "bidirectional": boolean
    }
  ],
  "sharedEntities": [
    {
      "entity": "entity-name",
      "usedBy": ["module1", "module2"],
      "primaryOwner": "module-type"
    }
  ]
}`;

    const result = await modelSelector.executeWithFallback(
      this.genAI,
      task,
      async (model) => {
        const response = await model.generateContent(prompt);
        return response.response.text();
      }
    );

    const parsed = this.parseJSON(result);
    this.dataFlows = parsed.dataFlows || [];
    this.sharedEntities = parsed.sharedEntities || [];

    onProgress?.({ 
      status: 'architect:data-flow-complete', 
      detail: `Designed ${this.dataFlows.length} data flows between modules` 
    });
  }

  async generateModuleManifests(domain, region, researchKnowledge, onProgress) {
    onProgress?.({ 
      status: 'architect:manifests', 
      detail: 'Generating module-specific manifests' 
    });

    for (const selectedModule of this.selectedModules) {
      const customization = this.customizations.find(c => c.module === selectedModule.type);
      
      onProgress?.({ 
        status: 'architect:manifest-generating', 
        detail: `Generating manifest for ${selectedModule.type}` 
      });

      const manifest = await this.generateModuleManifest(
        selectedModule.type,
        domain,
        region,
        researchKnowledge,
        customization?.customization
      );

      this.moduleManifests.push(manifest);

      onProgress?.({ 
        status: 'architect:manifest-generated', 
        detail: `Generated manifest for ${selectedModule.type}` 
      });
    }
  }

  async generateModuleManifest(moduleType, domain, region, researchKnowledge, customization) {
    const task = {
      type: TASK_TYPES.ARCHITECTURE,
      complexity: 'high',
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 8000
      }
    };

    const prompt = `You are generating a module manifest for a ${moduleType} module.

Domain: ${domain}
Region: ${region}
Customization: ${customization || 'None'}

Research Knowledge:
${researchKnowledge.substring(0, 30000)}

Generate a detailed manifest for this module that includes:
1. Module configuration
2. Domain-specific fields and entities
3. Workflows specific to this domain
4. Validation rules
5. Integration points with other modules

Return JSON:
{
  "moduleType": "${moduleType}",
  "moduleName": "string",
  "version": "1.0.0",
  "configuration": {
    "enabled": true,
    "settings": {}
  },
  "entities": [
    {
      "name": "string",
      "fields": [
        {
          "id": "string",
          "label": "string",
          "type": "string",
          "required": boolean,
          "validation": {}
        }
      ]
    }
  ],
  "workflows": [
    {
      "name": "string",
      "steps": ["string"],
      "triggers": ["string"]
    }
  ],
  "integrations": [
    {
      "targetModule": "string",
      "dataExchange": "string"
    }
  ]
}`;

    const result = await modelSelector.executeWithFallback(
      this.genAI,
      task,
      async (model) => {
        const response = await model.generateContent(prompt);
        return response.response.text();
      }
    );

    return this.parseJSON(result);
  }

  async designDatabaseSchema(onProgress) {
    onProgress?.({ 
      status: 'architect:database', 
      detail: 'Designing unified database schema with relationships' 
    });

    const task = {
      type: TASK_TYPES.ARCHITECTURE,
      complexity: 'high',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8000
      }
    };

    const modulesDesc = this.selectedModules.map(m => m.type).join(', ');
    const manifestsDesc = JSON.stringify(this.moduleManifests, null, 2).substring(0, 30000);

    const prompt = `You are designing a unified database schema for a multi-module application.

Selected Modules: ${modulesDesc}

Module Manifests:
${manifestsDesc}

Design a normalized database schema that:
1. Supports all selected modules
2. Avoids duplication
3. Uses proper foreign keys and relationships
4. Includes indexes for performance
5. Follows PostgreSQL best practices

Return JSON:
{
  "tables": [
    {
      "name": "table_name",
      "description": "string",
      "columns": [
        {
          "name": "column_name",
          "type": "postgresql_type",
          "primaryKey": boolean,
          "notNull": boolean,
          "unique": boolean,
          "default": "string",
          "foreignKey": "table.column"
        }
      ],
      "indexes": [
        {
          "columns": ["col1", "col2"],
          "unique": boolean
        }
      ]
    }
  ],
  "relationships": [
    {
      "from": "table.column",
      "to": "table.column",
      "type": "one-to-many|many-to-many|one-to-one"
    }
  ]
}`;

    const result = await modelSelector.executeWithFallback(
      this.genAI,
      task,
      async (model) => {
        const response = await model.generateContent(prompt);
        return response.response.text();
      }
    );

    this.databaseSchema = this.parseJSON(result);

    onProgress?.({ 
      status: 'architect:database-complete', 
      detail: `Database schema designed: ${this.databaseSchema.tables?.length || 0} tables` 
    });
  }

  async defineAPIContracts(onProgress) {
    onProgress?.({ 
      status: 'architect:api', 
      detail: 'Defining API contracts and endpoints' 
    });

    const task = {
      type: TASK_TYPES.ARCHITECTURE,
      complexity: 'medium',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 6000
      }
    };

    const modulesDesc = this.selectedModules.map(m => m.type).join(', ');

    const prompt = `You are defining REST API contracts for a multi-module application.

Selected Modules: ${modulesDesc}

Define comprehensive API endpoints for each module:
1. CRUD operations for each entity
2. Module-specific operations
3. Cross-module operations
4. Authentication requirements
5. Request/response schemas

Return JSON:
{
  "endpoints": [
    {
      "module": "module-type",
      "method": "GET|POST|PUT|DELETE|PATCH",
      "path": "/api/path",
      "description": "string",
      "auth": boolean,
      "permissions": ["permission"],
      "requestSchema": {},
      "responseSchema": {},
      "errorCodes": [400, 401, 404, 500]
    }
  ]
}`;

    const result = await modelSelector.executeWithFallback(
      this.genAI,
      task,
      async (model) => {
        const response = await model.generateContent(prompt);
        return response.response.text();
      }
    );

    const parsed = this.parseJSON(result);
    this.apiContracts = parsed.endpoints || [];

    onProgress?.({ 
      status: 'architect:api-complete', 
      detail: `API contracts defined: ${this.apiContracts.length} endpoints` 
    });
  }

  parseJSON(text) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      return JSON.parse(text);
    } catch (error) {
      console.error('JSON parse error:', error);
      return {};
    }
  }
}

export { ArchitectAgent };
