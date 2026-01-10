/**
 * Gemini Routes - Chameleon Protocol
 * 
 * Proxy for Google Gemini API to hide API key from client.
 * Handles manifest generation with streaming support.
 */

import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { optionalAuth } from '../middleware/authMiddleware.js';
import { logAudit } from '../middleware/auditMiddleware.js';

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

    res.write(`data: ${JSON.stringify({ status: 'starting', mode: isClientModule ? 'CLIENT_MODULE' : mode })}\n\n`);

    const result = await model.generateContentStream(prompt);
    
    let fullText = '';
    for await (const chunk of result.stream) {
      const chunkText = chunk.text();
      fullText += chunkText;
      res.write(`data: ${JSON.stringify({ chunk: chunkText })}\n\n`);
    }

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
 * Build the manifest generation prompt
 */
function buildManifestPrompt({ domains, region, currency, locale, researchContext, existingManifest, mode, projectName, fundingBody, additionalContext }) {
  const PROGRAM_NAME = projectName || domains.join(' & ') + " Initiative";
  const SERVICE_TYPES = domains.join(', ');
  const timestamp = new Date().toISOString();

  const basePrompt = `
# CHAMELEON PROTOCOL: DEEP LEGISLATIVE RESEARCH AGENT

## YOUR ROLE
You are a Legislative Research Agent. Conduct exhaustive deep research on a specific health/community program and compile ALL requirements.

## INPUT PROVIDED
- **Program Name:** ${PROGRAM_NAME}
- **Location:** ${region}
- **Service Type(s):** ${SERVICE_TYPES}
- **Funding/Org:** ${fundingBody || 'General'}
- **Context:** ${additionalContext || 'None'}

${researchContext ? `## RESEARCH CONTEXT\n${researchContext}\n` : ''}

## RESEARCH METHODOLOGY
1. **Identification:** Official service models.
2. **Framework Discovery:** Acts, Regulations, Standards.
3. **Compliance Extraction:** Data fields, Reporting triggers.

## IMPORTANT: FILE PERSISTENCE & FULL TEXT EXTRACTION

For every relevant document (Act, Regulation, Standard) you find, you MUST:

1. **Extract the FULL TEXT** (or as much as possible, e.g., 50+ key sections) into the "cached_content" field. Do NOT just summarize.
2. We want to use this text for RAG (Retrieval Augmented Generation) later, so the more raw text you preserve, the better.
3. Log the action as: "[DOWNLOAD] Saving <filename> ..."

## OUTPUT JSON SCHEMA

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
