/**
 * Application Factory Routes - Chameleon Protocol
 * 
 * Full autonomous application generation:
 * 1. Deep Research Agent
 * 2. Application Architect Agent
 * 3. Code Generation Agent
 * 4. Package & Download
 */

import { Router } from 'express';
import { randomUUID } from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { ResearchAgent } from '../services/researchAgent.js';
import { ArchitectAgent } from '../services/architectAgent.js';
import { CodeGenerationAgent } from '../services/codeGenerationAgent.js';
import archiver from 'archiver';

const router = Router();
router.use(optionalAuth);

const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  return new GoogleGenerativeAI(apiKey);
};

/**
 * POST /api/factory/generate-application
 * 
 * Full autonomous application generation
 */
router.post('/generate-application', async (req, res) => {
  try {
    const {
      domain,
      region,
      projectName,
      description,
      enableDeepResearch = true
    } = req.body;

    if (!domain || !region) {
      return res.status(400).json({ error: 'Domain and region are required' });
    }

    const runId = randomUUID();

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const writeEvent = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

    writeEvent({
      status: 'factory:starting',
      detail: `Application Factory starting. Run ID: ${runId}`,
      run_id: runId,
      domain,
      region
    });

    const genAI = getGenAI();
    let researchKnowledge = '';
    let researchSources = [];

    if (enableDeepResearch) {
      writeEvent({
        status: 'factory:phase-1',
        detail: 'Phase 1: Deep Research Agent - Autonomous research with Gemini 3 Pro + Google Search'
      });

      const researchAgent = new ResearchAgent(process.env.GEMINI_API_KEY);
      const researchResult = await researchAgent.conductDeepResearch(
        domain,
        region,
        (event) => writeEvent(event)
      );

      researchKnowledge = researchResult.knowledge;
      researchSources = researchResult.sources;

      writeEvent({
        status: 'factory:phase-1-complete',
        detail: `Research complete. ${researchSources.length} sources, ${researchKnowledge.length} chars`,
        confidence: researchResult.confidence
      });
    }

    writeEvent({
      status: 'factory:phase-2',
      detail: 'Phase 2: Application Architect Agent - Designing modular architecture'
    });

    const architectAgent = new ArchitectAgent(genAI);
    const architecture = await architectAgent.designApplication(
      domain,
      region,
      researchKnowledge,
      (event) => writeEvent(event)
    );

    writeEvent({
      status: 'factory:phase-2-complete',
      detail: `Architecture complete. ${architecture.modules.length} modules, ${architecture.databaseSchema?.tables?.length || 0} tables`,
      modules: architecture.modules.map(m => m.type)
    });

    writeEvent({
      status: 'factory:phase-3',
      detail: 'Phase 3: Code Generation Agent - Generating React, Node.js, SQL code'
    });

    const codeGenAgent = new CodeGenerationAgent(genAI);
    const codeResult = await codeGenAgent.generateApplication(
      architecture,
      (event) => writeEvent(event)
    );

    writeEvent({
      status: 'factory:phase-3-complete',
      detail: `Code generation complete. ${codeResult.files.length} files generated`,
      filesByType: codeResult.summary.byType
    });

    writeEvent({
      status: 'factory:complete',
      detail: 'Application generation complete!',
      summary: {
        runId,
        domain,
        region,
        modules: architecture.modules.length,
        tables: architecture.databaseSchema?.tables?.length || 0,
        apiEndpoints: architecture.apiContracts?.length || 0,
        filesGenerated: codeResult.files.length,
        researchSources: researchSources.length
      }
    });

    res.write(`data: ${JSON.stringify({ 
      done: true, 
      architecture,
      code: codeResult,
      research: {
        sources: researchSources,
        knowledge: researchKnowledge.substring(0, 5000)
      }
    })}\n\n`);

    res.end();

  } catch (error) {
    console.error('Application factory error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/factory/download-application
 * 
 * Package and download generated application as .zip
 */
router.post('/download-application', async (req, res) => {
  try {
    const { files, projectName = 'chameleon-app' } = req.body;

    if (!files || !Array.isArray(files)) {
      return res.status(400).json({ error: 'Files array is required' });
    }

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${projectName}.zip"`);

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    archive.on('error', (err) => {
      throw err;
    });

    archive.pipe(res);

    for (const file of files) {
      archive.append(file.content, { name: file.path });
    }

    const readme = `# ${projectName}

Generated by Chameleon Protocol - Autonomous Application Factory

## Setup

1. Install dependencies:
   \`\`\`bash
   npm install
   \`\`\`

2. Configure environment:
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

3. Run database migrations:
   \`\`\`bash
   npm run migrate
   \`\`\`

4. Start the application:
   \`\`\`bash
   npm run dev
   \`\`\`

## Generated Files

This application was autonomously generated with:
- Deep research and domain analysis
- Multi-module architecture design
- Full-stack code generation
- Database schema and migrations
- API endpoints and tests

## Modules

See individual module documentation in the \`docs/\` directory.

## Support

For issues or questions, visit: https://github.com/raavin/Chameleon
`;

    archive.append(readme, { name: 'README.md' });

    await archive.finalize();

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
