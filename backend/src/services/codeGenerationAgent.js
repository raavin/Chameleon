/**
 * Code Generation Agent - Chameleon Protocol
 * 
 * Generates actual working code from architecture design:
 * 1. React/TypeScript components
 * 2. Node.js/Express API endpoints
 * 3. SQL database migrations
 * 4. Tests
 * 5. Configuration files
 */

import { modelSelector, TASK_TYPES } from '../utils/modelSelector.js';

class CodeGenerationAgent {
  constructor(genAI) {
    this.genAI = genAI;
    this.generatedFiles = [];
  }

  async generateApplication(architecture, onProgress) {
    onProgress?.({ 
      status: 'codegen:starting', 
      detail: 'Code Generation Agent initializing...' 
    });

    const files = [];

    files.push(...await this.generateDatabaseMigrations(architecture, onProgress));
    
    files.push(...await this.generateBackendAPI(architecture, onProgress));
    
    files.push(...await this.generateFrontendComponents(architecture, onProgress));
    
    files.push(...await this.generateConfiguration(architecture, onProgress));
    
    files.push(...await this.generateTests(architecture, onProgress));

    this.generatedFiles = files;

    onProgress?.({ 
      status: 'codegen:complete', 
      detail: `Code generation complete. ${files.length} files generated.` 
    });

    return {
      files,
      summary: {
        totalFiles: files.length,
        byType: this.countFilesByType(files)
      }
    };
  }

  async generateDatabaseMigrations(architecture, onProgress) {
    onProgress?.({ 
      status: 'codegen:database', 
      detail: 'Generating database migrations...' 
    });

    const task = {
      type: TASK_TYPES.CODE_GENERATION,
      complexity: 'medium',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 16000
      }
    };

    const prompt = `Generate SQL database migration files for this schema:

${JSON.stringify(architecture.database, null, 2)}

Generate:
1. CREATE TABLE statements for all tables
2. CREATE INDEX statements for all indexes
3. Foreign key constraints
4. Initial seed data (if applicable)

Return JSON with:
{
  "files": [
    {
      "path": "string (e.g., 'database/migrations/001_create_users.sql')",
      "content": "string (SQL code)"
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
    const files = parsed.files || [];

    onProgress?.({ 
      status: 'codegen:database-complete', 
      detail: `Generated ${files.length} migration files` 
    });

    return files;
  }

  async generateBackendAPI(architecture, onProgress) {
    onProgress?.({ 
      status: 'codegen:backend', 
      detail: 'Generating backend API code...' 
    });

    const files = [];

    for (const module of architecture.modules) {
      const moduleFiles = await this.generateModuleAPI(module, architecture, onProgress);
      files.push(...moduleFiles);
    }

    onProgress?.({ 
      status: 'codegen:backend-complete', 
      detail: `Generated ${files.length} backend files` 
    });

    return files;
  }

  async generateModuleAPI(module, architecture, onProgress) {
    const task = {
      type: TASK_TYPES.CODE_GENERATION,
      complexity: 'medium',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 16000
      }
    };

    const moduleEndpoints = architecture.api.endpoints?.filter(
      e => e.module === module.module_type
    ) || [];

    const prompt = `Generate Node.js/Express API code for the ${module.module_type} module.

Module Configuration:
${JSON.stringify(architecture.configurations[module.module_type], null, 2)}

API Endpoints:
${JSON.stringify(moduleEndpoints, null, 2)}

Generate:
1. Express router file
2. Controller functions
3. Service layer (business logic)
4. Data access layer (database queries)
5. Validation middleware

Use modern ES6+ syntax, async/await, and proper error handling.

Return JSON with:
{
  "files": [
    {
      "path": "string (e.g., 'backend/src/routes/userRoutes.js')",
      "content": "string (JavaScript code)"
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
    return parsed.files || [];
  }

  async generateFrontendComponents(architecture, onProgress) {
    onProgress?.({ 
      status: 'codegen:frontend', 
      detail: 'Generating React components...' 
    });

    const files = [];

    for (const module of architecture.modules) {
      const moduleFiles = await this.generateModuleComponents(module, architecture, onProgress);
      files.push(...moduleFiles);
    }

    onProgress?.({ 
      status: 'codegen:frontend-complete', 
      detail: `Generated ${files.length} frontend files` 
    });

    return files;
  }

  async generateModuleComponents(module, architecture, onProgress) {
    const task = {
      type: TASK_TYPES.CODE_GENERATION,
      complexity: 'medium',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 16000
      }
    };

    const prompt = `Generate React/TypeScript components for the ${module.module_type} module.

Module Configuration:
${JSON.stringify(architecture.configurations[module.module_type], null, 2)}

Generate:
1. Main module component
2. List view component
3. Detail view component
4. Create/Edit form component
5. TypeScript interfaces
6. API service hooks

Use React hooks, TypeScript, and Tailwind CSS for styling.

Return JSON with:
{
  "files": [
    {
      "path": "string (e.g., 'frontend/src/components/users/UserList.tsx')",
      "content": "string (TypeScript/React code)"
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
    return parsed.files || [];
  }

  async generateConfiguration(architecture, onProgress) {
    onProgress?.({ 
      status: 'codegen:config', 
      detail: 'Generating configuration files...' 
    });

    const task = {
      type: TASK_TYPES.CODE_GENERATION,
      complexity: 'low',
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 4000
      }
    };

    const prompt = `Generate configuration files for this application.

Architecture:
${JSON.stringify(architecture.architecture, null, 2)}

Modules:
${architecture.modules.map(m => m.module_type).join(', ')}

Generate:
1. .env.example (environment variables)
2. package.json (dependencies)
3. README.md (setup instructions)
4. docker-compose.yml (if applicable)

Return JSON with:
{
  "files": [
    {
      "path": "string",
      "content": "string"
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
    const files = parsed.files || [];

    onProgress?.({ 
      status: 'codegen:config-complete', 
      detail: `Generated ${files.length} configuration files` 
    });

    return files;
  }

  async generateTests(architecture, onProgress) {
    onProgress?.({ 
      status: 'codegen:tests', 
      detail: 'Generating test files...' 
    });

    const task = {
      type: TASK_TYPES.CODE_GENERATION,
      complexity: 'medium',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 12000
      }
    };

    const prompt = `Generate test files for this application.

Modules:
${architecture.modules.map(m => m.module_type).join(', ')}

API Endpoints:
${JSON.stringify(architecture.api.endpoints?.slice(0, 10), null, 2)}

Generate:
1. Unit tests for services
2. Integration tests for API endpoints
3. Test utilities and fixtures

Use Jest/Vitest for testing.

Return JSON with:
{
  "files": [
    {
      "path": "string (e.g., 'backend/tests/users.test.js')",
      "content": "string (test code)"
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
    const files = parsed.files || [];

    onProgress?.({ 
      status: 'codegen:tests-complete', 
      detail: `Generated ${files.length} test files` 
    });

    return files;
  }

  countFilesByType(files) {
    const counts = {};
    for (const file of files) {
      const ext = file.path.split('.').pop();
      counts[ext] = (counts[ext] || 0) + 1;
    }
    return counts;
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
      return { files: [] };
    }
  }
}

export { CodeGenerationAgent };
