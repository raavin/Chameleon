/**
 * Gemini Routes - Chameleon Protocol
 * 
 * Proxy for Google Gemini API to hide API key from client.
 * Handles manifest generation with streaming support.
 */

import { Router } from 'express';
import { randomUUID } from 'crypto';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { logAudit } from '../middleware/auditMiddleware.js';
import { runLangGraphManifest } from '../services/langGraphAgent.js';
import AgentImprovement from '../models/AgentImprovement.js';
import { modelSelector, TASK_TYPES } from '../utils/modelSelector.js';
import { ResearchAgent } from '../services/researchAgent.js';

const router = Router();

// Apply optional auth
router.use(optionalAuth);

// Initialize Gemini client
const getGenAI = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  return new GoogleGenerativeAI(apiKey);
};

/**
 * POST /api/gemini/generate
 * Generate content using Gemini API
 * 
 * Body: { prompt: string, model?: string }
 * Returns: { text: string }
 */
router.post('/generate', async (req, res) => {
  try {
    const { prompt, model = 'gemini-3-flash-preview' } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const genAI = getGenAI();
    const genModel = genAI.getGenerativeModel({ model });
    
    const result = await genModel.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    // Log audit
    await logAudit({
      userId: req.user?.userId || 'anonymous',
      entityType: 'gemini',
      entityId: 'generate',
      action: 'AI_GENERATE',
      metadata: { 
        model,
        promptLength: prompt.length,
        responseLength: text.length
      }
    });

    res.json({ text });
  } catch (error) {
    console.error('Gemini generate error:', error);
    res.status(500).json({ error: error.message || 'Generation failed' });
  }
});

/**
 * POST /api/gemini/stream
 * Stream content generation using Gemini API
 * 
 * Body: { prompt: string, model?: string }
 * Returns: Server-Sent Events stream
 */
router.post('/stream', async (req, res) => {
  try {
    const { prompt, model = 'gemini-3-flash-preview' } = req.body;
    
    if (!prompt) {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const genAI = getGenAI();
    const genModel = genAI.getGenerativeModel({ model });
    
    const result = await genModel.generateContentStream(prompt);
    
    let fullText = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
    }

    // Send completion signal
    res.write(`data: ${JSON.stringify({ done: true, fullText })}\n\n`);
    res.end();

    // Log audit
    await logAudit({
      userId: req.user?.userId || 'anonymous',
      entityType: 'gemini',
      entityId: 'stream',
      action: 'AI_STREAM',
      metadata: { 
        model,
        promptLength: prompt.length,
        responseLength: fullText.length
      }
    });
  } catch (error) {
    console.error('Gemini stream error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/gemini/manifest
 * Generate a manifest using the full hydration pipeline
 * This is the main endpoint for manifest generation
 * 
 * Body: { 
 *   domains: string[], 
 *   region: string, 
 *   currency: string, 
 *   locale: string,
 *   researchContext?: string,
 *   existingManifest?: object 
 * }
 */
router.post('/manifest', async (req, res) => {
  try {
    const { 
      domains, 
      region, 
      currency = 'USD', 
      locale = 'en-US',
      researchContext = '',
      researchSources = [],
      existingManifest = null,
      projectName = '',
      fundingBody = '',
      additionalContext = ''
    } = req.body;
    
    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      return res.status(400).json({ error: 'Domains array is required' });
    }
    
    if (!region) {
      return res.status(400).json({ error: 'Region is required' });
    }

    // Set up SSE for streaming
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const writeEvent = (payload) => res.write(`data: ${JSON.stringify(payload)}\n\n`);

    const genAI = getGenAI();
    
    // Use gemini-3-flash-preview for manifest generation
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3-flash-preview',
      generationConfig: {
        maxOutputTokens: 65000,
        temperature: 0.7
      }
    });

    // Detect if this is a Client Details module request
    const isClientModule = projectName.toLowerCase().includes('client');

    // Build the prompt
    const mode = existingManifest ? 'MERGE' : 'CREATE';
    const prompt = isClientModule 
      ? buildClientModulePrompt({ domains, region, currency, locale, additionalContext })
      : buildManifestPrompt({
          domains,
          region,
          currency,
          locale,
          researchContext,
          existingManifest,
          mode,
          projectName,
          fundingBody,
          additionalContext
        });

    writeEvent({
      status: 'starting',
      mode: isClientModule ? 'CLIENT_MODULE' : mode,
      detail: `Request received. Domains: ${domains.join(', ')}. Region: ${region}.`
    });
    if (Array.isArray(researchSources) && researchSources.length > 0) {
      writeEvent({
        status: 'research:sources',
        detail: `Loaded ${researchSources.length} research file(s) from client bundle.`,
        references: researchSources
      });
    } else {
      writeEvent({
        status: 'research:sources',
        detail: 'No research files provided by client bundle. Using defaults.'
      });
    }

    writeEvent({
      status: 'generating',
      mode,
      detail: `Submitting manifest prompt (${prompt.length} chars). Waiting for model response...`,
      prompt
    });
    const result = await model.generateContentStream(prompt);
    
    let fullText = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
    }
    writeEvent({
      status: 'generating',
      mode,
      detail: `Model response streaming complete (${fullText.length} chars).`
    });

    // Try to extract and validate JSON
    try {
      const jsonStr = extractJSON(fullText);
      const manifest = JSON.parse(jsonStr);
      res.write(`data: ${JSON.stringify({ done: true, manifest })}\n\n`);
    } catch (parseError) {
      res.write(`data: ${JSON.stringify({ done: true, rawText: fullText, parseError: parseError.message })}\n\n`);
    }
    
    res.end();

    // Log audit
    await logAudit({
      userId: req.user?.userId || 'anonymous',
      entityType: 'manifest',
      entityId: 'generate',
      action: 'MANIFEST_GENERATE',
      metadata: { 
        domains,
        region,
        mode,
        responseLength: fullText.length
      }
    });
  } catch (error) {
    console.error('Manifest generation error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * POST /api/gemini/manifest-agent
 * Agentic manifest generation using multi-step decomposition.
 * NOW WITH DEEP RESEARCH AGENT
 */
router.post('/manifest-agent', async (req, res) => {
  const runId = randomUUID();
  const telemetry = new Telemetry({ res, runId });
  
  try {
    const {
      domains,
      region,
      currency = 'USD',
      locale = 'en-US',
      researchContext = '',
      researchSources = [],
      projectName = '',
      fundingBody = '',
      additionalContext = '',
      enableDeepResearch = true
    } = req.body;

    if (!domains || !Array.isArray(domains) || domains.length === 0) {
      telemetry.error('API', 'Domains array is required');
      return res.status(400).json({ error: 'Domains array is required' });
    }

    if (!region) {
      telemetry.error('API', 'Region is required');
      return res.status(400).json({ error: 'Region is required' });
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // We no longer need a separate writeEvent helper, we use telemetry directly
    const genAI = getGenAI();

    telemetry.log('API', `Agent request received. Run ID: ${runId}. Domains: ${domains.join(', ')}. Region: ${region}.`, { run_id: runId });

    let deepResearchKnowledge = '';
    let deepResearchSources = [];

    if (enableDeepResearch) {
      telemetry.info('Research', 'Initializing Deep Research Agent with Gemini 3 Pro + Google Search grounding');

      const researchAgent = new ResearchAgent(process.env.GEMINI_API_KEY);

      for (const domain of domains) {
        const researchResult = await researchAgent.conductDeepResearch(
          domain,
          region,
          telemetry
        );

        deepResearchKnowledge += `\n\n## DEEP RESEARCH: ${domain}\n\n${researchResult.knowledge}\n`;
        deepResearchSources.push(...researchResult.sources);
      }

      telemetry.info('Research', `Deep research complete. ${deepResearchSources.length} sources processed.`, {
        references: deepResearchSources
      });
    }

    const combinedResearchContext = [
      researchContext,
      deepResearchKnowledge
    ].filter(Boolean).join('\n\n---\n\n');

    const allResearchSources = [
      ...researchSources,
      ...deepResearchSources
    ];

    if (allResearchSources.length > 0) {
      telemetry.info('Research', `Total research sources: ${allResearchSources.length} (${researchSources.length} client + ${deepResearchSources.length} deep research)`, {
        references: allResearchSources
      });
    }

    const isClientModule = projectName.toLowerCase().includes('client');
    if (isClientModule) {
      const task = {
        type: TASK_TYPES.CODE_GENERATION,
        complexity: 'medium',
        generationConfig: {
          maxOutputTokens: 65000,
          temperature: 0.6
        }
      };

      const prompt = buildClientModulePrompt({
        domains,
        region,
        currency,
        locale,
        additionalContext: `${additionalContext}\n\n${deepResearchKnowledge}`
      });

      telemetry.info('Agent', `Client module detected. Submitting client prompt (${prompt.length} chars).`, { prompt });

      const text = await modelSelector.executeWithFallback(
        genAI,
        task,
        async (model) => {
          const result = await model.generateContent(prompt);
          return result.response.text();
        },
        telemetry
      );

      telemetry.info('Agent', `Client module response received (${text.length} chars).`);
      
      // Manually send chunk for now as we didn't refactor modelSelector to stream via telemetry yet for single calls
      res.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
      
      try {
        const jsonStr = extractJSON(text);
        const manifest = JSON.parse(jsonStr);
        res.write(`data: ${JSON.stringify({ done: true, manifest })}\n\n`);
      } catch (parseError) {
        telemetry.error('Agent', 'JSON Parsing failed', parseError);
        res.write(`data: ${JSON.stringify({ done: true, rawText: text, parseError: parseError.message })}\n\n`);
      }
      res.end();
      return;
    }

    const PROGRAM_NAME = projectName || domains.join(' & ') + " Initiative";
    const SERVICE_TYPES = domains.join(', ');

    const agentResearchPrompt = `
# CHAMELEON PROTOCOL: AGENT 1 - CONTEXT SYNTHESIS

You are the lead synthesis agent. Produce a structured overview of the program with best-practice defaults.

Input:
- Program Name: ${PROGRAM_NAME}
- Region: ${region}
- Service Types: ${SERVICE_TYPES}
- Funding/Org: ${fundingBody || 'General'}
- Context: ${additionalContext || 'None'}

${combinedResearchContext ? `Research Context:\n${combinedResearchContext}\n` : ''}

Return JSON with:
{
  "summary": "string",
  "program_goals": ["string"],
  "compliance_themes": ["string"],
  "required_data_domains": ["string"],
  "risk_controls": ["string"],
  "default_assumptions": ["string"]
}`;

    const agentDomainResearchPrompt = (contextText) => `
# CHAMELEON PROTOCOL: AGENT 2 - DOMAIN RESEARCH

You are the domain research agent. Identify domain-specific best practice, standards, and measurement needs.
Focus on exhaustive data capture beyond minimum statutory requirements.

Inputs:
- Program Name: ${PROGRAM_NAME}
- Region: ${region}
- Service Types: ${SERVICE_TYPES}
- Context Summary: ${contextText}
- Research Context: ${combinedResearchContext || 'None'}

Return JSON with:
{
  "domain_findings": [
    {
      "domain": "string",
      "standards": ["string"],
      "recommended_metrics": ["string"],
      "critical_data_elements": ["string"]
    }
  ]
}`;

    const agentProgramSpecificsPrompt = (contextText, domainResearchText) => `
# CHAMELEON PROTOCOL: AGENT 3 - PROGRAM SPECIFICS

You are the program-specifics agent. Translate the program context into concrete data capture needs,
workflow stages, and monitoring checkpoints.

Inputs:
- Program Name: ${PROGRAM_NAME}
- Region: ${region}
- Service Types: ${SERVICE_TYPES}
- Context Summary: ${contextText}
- Domain Research: ${domainResearchText}
- Additional Context: ${additionalContext || 'None'}

Return JSON with:
{
  "workflow_stages": ["string"],
  "outcome_measures": ["string"],
  "operational_constraints": ["string"],
  "data_capture_priorities": ["string"]
}`;

    const agentCreativePrompt = (contextText, domainResearchText, programSpecificsText) => `
# CHAMELEON PROTOCOL: AGENT 4 - CREATIVE DEVELOPMENT

You are the creative development agent. Propose innovative, high-value data capture ideas,
advanced analytics hooks, and longitudinal signals that go beyond statutory minimums.
Do not invent legal text.

Inputs:
- Context Summary: ${contextText}
- Domain Research: ${domainResearchText}
- Program Specifics: ${programSpecificsText}

Return JSON with:
{
  "innovative_signals": ["string"],
  "predictive_fields": ["string"],
  "longitudinal_tracking": ["string"],
  "equity_inclusion_fields": ["string"]
}`;

    const agentLegalPrompt = (contextText, domainResearchText, programSpecificsText) => `
# CHAMELEON PROTOCOL: AGENT 5 - LEGAL & COMPLIANCE CHECK

You are the legal research agent. Identify compliance obligations and statutory requirements.
Do not fabricate legal text. If unsure, state the assumption explicitly.

Inputs:
- Context Summary: ${contextText}
- Domain Research: ${domainResearchText}
- Program Specifics: ${programSpecificsText}
- Region: ${region}

Return JSON with:
{
  "legal_requirements": ["string"],
  "data_retention_rules": ["string"],
  "consent_requirements": ["string"],
  "reporting_obligations": ["string"]
}`;

    const agentBestPracticePrompt = (contextText, domainResearchText, programSpecificsText, creativeText, legalText) => `
# CHAMELEON PROTOCOL: AGENT 6 - BEST PRACTICE & QUALITY

You are the quality agent. Ensure the protocol meets high-quality data collection best practice and
adds rich observational/longitudinal tracking beyond statutory minimums.

Inputs:
- Context Summary: ${contextText}
- Domain Research: ${domainResearchText}
- Program Specifics: ${programSpecificsText}
- Creative Development: ${creativeText}
- Legal Research: ${legalText}

Return JSON with:
{
  "quality_checks": ["string"],
  "data_completeness_rules": ["string"],
  "recommended_field_expansions": ["string"]
}`;

    const agentBlueprintPrompt = (contextText, domainResearchText, programSpecificsText, creativeText, legalText, bestPracticeText) => `
# CHAMELEON PROTOCOL: AGENT 7 - DOMAIN BLUEPRINT

You are designing a module blueprint with sections and field groups. Ensure every section will have fields.

Inputs:
- Program Name: ${PROGRAM_NAME}
- Region: ${region}
- Service Types: ${SERVICE_TYPES}
- Context Summary: ${contextText}
- Domain Research: ${domainResearchText}
- Program Specifics: ${programSpecificsText}
- Creative Development: ${creativeText}
- Legal Research: ${legalText}
- Best Practice Checks: ${bestPracticeText}

Return JSON with:
{
  "domains": [
    {
      "domain_title": "string",
      "domain_id": "string",
      "sections": [
        {
          "section_title": "string",
          "section_id": "string",
          "field_group_summary": "string"
        }
      ]
    }
  ]
}`;

    const agentFieldPrompt = (contextText, domainResearchText, programSpecificsText, creativeText, legalText, bestPracticeText, blueprintText) => `
# CHAMELEON PROTOCOL: AGENT 8 - FIELD SPECIFICATION

You are specifying fields and rules. Provide an exhaustive set of fields per domain and per section.
No domain or section may have zero fields. Minimum 12 fields per domain. Every field_id must map to a defined field.

Inputs:
- Program Name: ${PROGRAM_NAME}
- Region: ${region}
- Service Types: ${SERVICE_TYPES}
- Blueprint: ${blueprintText}
- Context Summary: ${contextText}
- Domain Research: ${domainResearchText}
- Program Specifics: ${programSpecificsText}
- Creative Development: ${creativeText}
- Legal Research: ${legalText}
- Best Practice Checks: ${bestPracticeText}

Return JSON with:
{
  "domains": [
    {
      "domain_id": "string",
      "fields": [
        { "id": "string", "label": "string", "type": "string", "options": ["string"], "default_value": "string", "is_identity_field": boolean }
      ],
      "sections": [
        { "id": "string", "title": "string", "description": "string", "field_ids": ["string"] }
      ],
      "governance_rules": [{ "description": "string" }]
    }
  ]
}`;

    const agentFinalReviewPrompt = (contextText, domainResearchText, programSpecificsText, creativeText, legalText, bestPracticeText, blueprintText, fieldText) => `
# CHAMELEON PROTOCOL: AGENT 9 - FINAL REVIEW

You are the finalization agent. Check that the blueprint and fields are complete and consistent,
and enumerate any MUST-HAVE checks to enforce (no empty sections, exhaustive fields, alignment with legal obligations).

Inputs:
- Context Summary: ${contextText}
- Domain Research: ${domainResearchText}
- Program Specifics: ${programSpecificsText}
- Creative Development: ${creativeText}
- Legal Research: ${legalText}
- Best Practice Checks: ${bestPracticeText}
- Blueprint: ${blueprintText}
- Field Spec: ${fieldText}

Return JSON with:
{
  "final_checks": ["string"],
  "risk_gaps": ["string"],
  "minimum_field_requirements": ["string"]
}`;

    const model = genAI.getGenerativeModel({ 
      model: 'gemini-3-flash-preview',
      generationConfig: {
        maxOutputTokens: 65000,
        temperature: 0.7
      }
    });

    const agentState = await runLangGraphManifest({
      model,
      prompts: {
        context: buildManifestPrompt({
          domains,
          region,
          currency,
          locale,
          researchContext: combinedResearchContext || '',
          existingManifest: null,
          mode: 'CREATE',
          projectName,
          fundingBody,
          additionalContext
        }),
        domainResearch: agentDomainResearchPrompt,
        programSpecifics: agentProgramSpecificsPrompt,
        creativeDevelopment: agentCreativePrompt,
        legalResearch: agentLegalPrompt,
        bestPractice: agentBestPracticePrompt,
        blueprint: agentBlueprintPrompt,
        fields: agentFieldPrompt,
        finalReview: agentFinalReviewPrompt
      },
      telemetry,
      onStatus: (statusPayload) => {
        // Redundant with telemetry, but keeping for compatibility if langGraphAgent emits raw strings
        if (typeof statusPayload === 'string') {
          telemetry.info('LangGraph', statusPayload);
          return;
        }
        // If it's an object, it's likely an old format payload, we can just log it
        telemetry.info('LangGraph', statusPayload.detail || 'Status Update', statusPayload);
      },
      onChunk: (chunk) => res.write(`data: ${JSON.stringify({ chunk })}\n\n`),
      timeoutMs: 120000
    });

    const agentManifestPrompt = (contextText, blueprintText, fieldText) => {
      const agentContext = [
        '## AGENT CONTEXT SUMMARY',
        contextText,
        '## AGENT DOMAIN RESEARCH',
        agentState.domainResearch || '',
        '## AGENT PROGRAM SPECIFICS',
        agentState.programSpecifics || '',
        '## AGENT CREATIVE DEVELOPMENT',
        agentState.creativeDevelopment || '',
        '## AGENT LEGAL RESEARCH',
        agentState.legalResearch || '',
        '## AGENT BEST PRACTICE CHECKS',
        agentState.bestPractice || '',
        '## AGENT DOMAIN BLUEPRINT',
        blueprintText,
        '## AGENT FIELD SPEC',
        fieldText,
        '## AGENT FINAL REVIEW',
        agentState.finalReview || ''
      ].join('\n');

      return buildManifestPrompt({
        domains,
        region,
        currency,
        locale,
        researchContext: `${researchContext || ''}\n\n${agentContext}`,
        existingManifest: null,
        mode: 'CREATE',
        projectName,
        fundingBody,
        additionalContext
      });
    };

    const finalPrompt = agentManifestPrompt(
      agentState.contextSummary,
      agentState.blueprint,
      agentState.fieldSpec
    );
    
    telemetry.info('Agent', 'Assembling final manifest with buildManifestPrompt. Waiting for model response...', { prompt: finalPrompt });
    
    const manifestResult = await model.generateContent(finalPrompt);
    const manifestText = manifestResult.response.text();
    
    telemetry.info('Agent', `Manifest assembly response received (${manifestText.length} chars).`);
    res.write(`data: ${JSON.stringify({ chunk: manifestText })}\n\n`);

    const isValidManifest = (manifest) => {
      if (!manifest || typeof manifest.id !== 'string' || !manifest.config || typeof manifest.version !== 'string') {
        return false;
      }
      if (!Array.isArray(manifest.domains) || manifest.domains.length === 0) {
        return false;
      }
      return manifest.domains.every((domain) => {
        if (!domain || !Array.isArray(domain.fields) || domain.fields.length === 0) {
          return false;
        }
        if (!Array.isArray(domain.sections) || domain.sections.length === 0) {
          return false;
        }
        const fieldIdSet = new Set(domain.fields.map((field) => field.id));
        return domain.sections.every((section) => {
          if (!Array.isArray(section.field_ids) || section.field_ids.length === 0) {
            return false;
          }
          return section.field_ids.every((fieldId) => fieldIdSet.has(fieldId));
        });
      });
    };

    try {
      const jsonStr = extractJSON(manifestText);
      let manifest = JSON.parse(jsonStr);

      if (!isValidManifest(manifest)) {
        const repairPrompt = `
# CHAMELEON PROTOCOL: MANIFEST REPAIR

The previous output was not a valid manifest. Convert it to the exact manifest schema below.
Return ONLY valid JSON. No markdown. Ensure every domain has at least 12 fields and every section has at least 1 field_id.
Every field_id must match an existing field in that domain.

Schema:
{
  "id": "string",
  "version": "1.0",
  "compiled_at": "${new Date().toISOString()}",
  "config": { "currency": "${currency}", "locale": "${locale}", "theme": "modern", "region": "${region}" },
  "domains": [{
    "id": "string",
    "title": "string",
    "sections": [{ "id": "string", "title": "string", "description": "string", "field_ids": ["string"] }],
    "fields": [{ "id": "string", "label": "string", "type": "string", "options": ["string"], "default_value": "string", "is_identity_field": boolean, "ui_config": { "grid_span": 1|2, "help_text": "string" } }],
    "research_artifacts": [{ "id": "string", "source": "string", "title": "string", "url": "string", "content_summary": "string", "cached_content": "string", "tags": ["string"] }],
    "governance_rules": [{ "description": "string" }],
    "subject_identifier_field": "string"
  }],
  "library": { "CITATION_ID": { "act_name": "string", "section_title": "string", "content": "string", "analysis": "string" } }
}

Previous output:
${manifestText}
`;
        telemetry.warn('Agent', 'Validation failed. Running repair pass with strict schema rules.', { prompt: repairPrompt });
        
        const repairResult = await model.generateContent(repairPrompt);
        const repairText = repairResult.response.text();
        const repairJsonStr = extractJSON(repairText);
        manifest = JSON.parse(repairJsonStr);
      }

      if (!isValidManifest(manifest)) {
        throw new Error('Manifest missing required schema fields');
      }

      const improvementPrompt = `
# CHAMELEON PROTOCOL: IMPROVEMENT AGENT

You are the improvement agent. Provide actionable refinements to increase data quality, completeness,
and compliance coverage. Focus on missing fields, weak sections, and research gaps. No code changes.

Return ONLY JSON:
{
  "summary": "string",
  "critical_gaps": ["string"],
  "field_expansions": ["string"],
  "section_risks": ["string"],
  "research_to_add": ["string"],
  "quality_checks": ["string"]
}

Manifest JSON:
${JSON.stringify(manifest, null, 2)}
`;

      let improvementParsed = null;
      try {
        telemetry.info('Agent', 'Running improvement agent to generate quality recommendations.');

        const improvementResult = await model.generateContent(improvementPrompt);
        const improvementText = improvementResult.response.text();
        res.write(`data: ${JSON.stringify({ chunk: improvementText })}\n\n`);

        try {
          const improvementJson = extractJSON(improvementText);
          improvementParsed = JSON.parse(improvementJson);
        } catch (parseError) {
          improvementParsed = null;
        }

        await AgentImprovement.create({
          run_id: runId,
          manifest_id: manifest.id,
          stage: 'improvement',
          prompt: improvementPrompt,
          response_text: improvementText,
          parsed: improvementParsed,
          notes: improvementParsed ? 'parsed' : 'raw'
        });
      } catch (improvementError) {
        telemetry.error('Agent', `Improvement agent failed: ${improvementError.message}`);
      }

      res.write(`data: ${JSON.stringify({ done: true, manifest, improvements: improvementParsed })}\n\n`);
    } catch (parseError) {
      telemetry.error('Agent', 'Final manifest parsing failed', parseError);
      res.write(`data: ${JSON.stringify({ done: true, rawText: manifestText, parseError: parseError.message })}\n\n`);
    }

    res.end();

    await logAudit({
      userId: req.user?.id || 'anonymous',
      entityType: 'manifest',
      entityId: 'generate-agent',
      action: 'MANIFEST_GENERATE_AGENT',
      metadata: { 
        domains,
        region,
        responseLength: manifestText.length,
        runId
      }
    });
  } catch (error) {
    console.error('Manifest agent error:', error);
    telemetry.error('API', 'Unhandled error', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

/**
 * Build the manifest generation prompt
 */
function buildManifestPrompt({ domains, region, currency, locale, researchContext, existingManifest, mode, projectName, fundingBody, additionalContext }) {
  const PROGRAM_NAME = projectName || domains.join(' & ') + " Initiative";
  const SERVICE_TYPES = domains.join(', ');
  const timestamp = new Date().toISOString();

  const basePrompt = `
# CHAMELEON PROTOCOL: EVIDENCE-DRIVEN DATA COLLECTION DESIGNER (GENERIC)

## ROLE
You design **best-practice data collection fields** for ANY program/domain.
Your output must be operationally useful and grounded in evidence.

## INPUTS
- Program Name: ${PROGRAM_NAME}
- Region/Jurisdiction: ${region}
- Domain(s): ${SERVICE_TYPES}
- Funding/Org Context: ${fundingBody || 'General'}
- Additional Context: ${additionalContext || 'None'}

## EVIDENCE PACK (if provided)
${researchContext ? `### Research Context (authoritative excerpts / notes)\n${researchContext}\n` : `### Research Context\nNone provided.\n`}

## NON-NEGOTIABLE RULES
1) **No pretending to browse.** If evidence is missing, you must say so via governance_rules and create fields as best-practice inferred (see rule 4).
2) **No fabricated legislation text.** Do not invent quotes or “full text”.
3) Every field MUST have a purpose:
   - Put a short justification in ui_config.help_text:
     - why collected
     - used for (operations | compliance | safety/risk | payments | reporting | analytics | audit)
     - sensitivity note if personal/financial/safety-critical
4) Evidence tagging:
   - If the field is grounded in evidence from the evidence pack, set section_citation to a CITATION_ID in library.
   - If you must infer (because evidence pack is incomplete), set section_citation to "BEST_PRACTICE_INFERRED".
   - Keep inferred fields <= 25% of total.
5) Do NOT bloat with duplicates. Prefer normalized fields that can be reused across sections.

## DESIGN METHOD (DO THIS IN YOUR HEAD BEFORE OUTPUT)
A) Produce an OPERATING MODEL in your mind for the program:
   - who does what, with what assets, moving what, where, under what constraints, for what outcomes
B) Identify core ENTITIES:
   - parties/roles, assets, locations, items/materials, transactions/events, documents, finance
C) Identify LIFECYCLE STAGES for the main transaction:
   - request/intake → plan → approve → execute → reconcile → close → report/audit
D) Generate sections + fields based on A–C + evidence pack.

## COVERAGE TARGETS (QUALITY OVER FILLER)
For EACH domain:
- Create 8–14 sections.
- Average 8–15 fields per section.
- If the domain is operationally complex (logistics, healthcare, finance, construction, utilities, education, etc.), target 100+ fields.


{
  "id": "uuid",
  "version": "1.0",
  "compiled_at": "${timestamp}",
  "config": { "currency": "${currency}", "locale": "${locale}", "theme": "modern", "region": "${region}" },
  "domains": [{
    "id": "string", 
    "title": "string", 
    "research_artifacts": [
      {
        "id": "string", 
        "source": "WHO|UN|HRC|Local|Gov", 
        "title": "string", 
        "url": "string", 
        "content_summary": "string",
        "cached_content": "PASTE THE FULL EXTRACTED TEXT OF THE LEGISLATION/STANDARD HERE. DO NOT TRUNCATE IF POSSIBLE.",
        "tags": ["string"]
      }
    ],
    "sections": [{ "id": "string", "title": "string", "description": "string", "field_ids": ["string"] }], 
    "fields": [{ "id": "string", "label": "string", "type": "string", "options": ["string"], "is_identity_field": boolean, "section_citation": "CITATION_ID", "ui_config": { "grid_span": 1|2, "help_text": "string" } }], 
    "governance_rules": [{ "description": "string" }], 
    "subject_identifier_field": "string"
  }],
  "library": { "CITATION_ID": { "act_name": "string", "section_title": "string", "content": "string", "analysis": "string" } }
}

Return ONLY valid JSON, no markdown or explanation.`;

  return basePrompt;
}

/**
 * Build a Client Details module prompt
 * This generates a client intake form with core demographic/identity fields
 */
function buildClientModulePrompt({ domains, region, currency, locale, additionalContext }) {
  const timestamp = new Date().toISOString();

  const prompt = `
# CHAMELEON PROTOCOL: CLIENT DETAILS MODULE GENERATOR

## YOUR ROLE
You are generating a CLIENT DETAILS intake module - the core client profile that all other service modules will reference.

## INPUT PROVIDED
- **Location:** ${region}
- **Focus Areas:** ${domains.join(', ')}
- **Context:** ${additionalContext || 'None'}

## MODULE PURPOSE
1. Establish client identity and context for all other modules in the system
2. Store demographic information that other service modules will reference
3. Enable session-based client context across the application

## IMPORTANT: FULL TEXT EXTRACTION
For privacy legislation you reference, extract the FULL TEXT into "cached_content" for RAG purposes.

## OUTPUT JSON SCHEMA

{
  "id": "client_details_uuid",
  "version": "1.0",
  "compiled_at": "${timestamp}",
  "config": { "currency": "${currency}", "locale": "${locale}", "theme": "modern", "region": "${region}", "module_type": "CLIENT_CORE" },
  "domains": [{
    "id": "client_profile", 
    "title": "Client Details", 
    "research_artifacts": [
      {
        "id": "string", 
        "source": "Gov|Local", 
        "title": "Privacy legislation title", 
        "url": "string", 
        "content_summary": "string",
        "cached_content": "FULL TEXT of privacy legislation relevant to ${region}",
        "tags": ["privacy", "data-protection"]
      }
    ],
    "sections": [{ "id": "string", "title": "string", "description": "string", "field_ids": ["string"] }], 
    "fields": [{ "id": "string", "label": "string", "type": "string", "options": ["string"], "is_identity_field": boolean, "section_citation": "CITATION_ID", "ui_config": { "grid_span": 1|2, "help_text": "string" } }], 
    "governance_rules": [{ "description": "string" }], 
    "subject_identifier_field": "client_key"
  }],
  "library": { "CITATION_ID": { "act_name": "string", "section_title": "string", "content": "string", "analysis": "string" } }
}

## REQUIREMENTS
1. Include a "client_key" field as the subject_identifier_field
2. Include: given_name, family_name, date_of_birth, gender, address, phone_number, email, indigenous_status, cultural_background, preferred_language
3. Include emergency contact fields
4. All identity fields must have is_identity_field: true
5. Field types: string, number, date, select, boolean, text
6. Add section_citation on all fields linking to library entries
7. Include privacy legislation for ${region} in library and research_artifacts
8. Include governance_rules for client data handling

Return ONLY valid JSON, no markdown or explanation.`;

  return prompt;
}

/**
 * Extract JSON from text that may contain markdown
 */
function extractJSON(text) {
  // Try to find markdown code block
  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    return jsonBlockMatch[1];
  }

  // Fallback to finding first { and last }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    return text.substring(firstBrace, lastBrace + 1);
  }

  throw new Error('No JSON found in response');
}

export default router;
