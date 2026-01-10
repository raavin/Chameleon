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
    const { prompt, model = 'gemini-2.0-flash' } = req.body;
    
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
    const { prompt, model = 'gemini-2.0-flash' } = req.body;
    
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
      existingManifest = null
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
    
    // Use gemini-2.0-flash for manifest generation
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 65000,
        temperature: 0.7
      }
    });

    // Build the prompt
    const mode = existingManifest ? 'MERGE' : 'CREATE';
    const prompt = buildManifestPrompt({
      domains,
      region,
      currency,
      locale,
      researchContext,
      existingManifest,
      mode
    });

    res.write(`data: ${JSON.stringify({ status: 'starting', mode })}\n\n`);

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
function buildManifestPrompt({ domains, region, currency, locale, researchContext, existingManifest, mode }) {
  const basePrompt = `You are an expert in legislative compliance and form design. Generate a comprehensive JSON manifest for a data collection system.

REGION: ${region}
DOMAINS: ${domains.join(', ')}
CURRENCY: ${currency}
LOCALE: ${locale}
MODE: ${mode}

${researchContext ? `\n## RESEARCH CONTEXT\n${researchContext}\n` : ''}

${existingManifest ? `\n## EXISTING MANIFEST TO MERGE WITH\n${JSON.stringify(existingManifest, null, 2)}\n` : ''}

Generate a complete manifest with this structure:
{
  "id": "uuid",
  "version": "1.0.0",
  "compiled_at": "ISO timestamp",
  "config": {
    "currency": "${currency}",
    "locale": "${locale}",
    "theme": "modern",
    "region": "${region}"
  },
  "domains": [
    {
      "id": "domain_id",
      "title": "Domain Title",
      "sections": [
        { "id": "section_id", "title": "Section Title", "description": "...", "field_ids": ["field1", "field2"] }
      ],
      "fields": [
        {
          "id": "field_id",
          "label": "Field Label",
          "type": "text|number|date|bool|select|multiselect|textarea|photo|file|relationship|map",
          "placeholder": "...",
          "options": ["for select types"],
          "section_citation": "reference to library entry if applicable",
          "is_identity_field": false,
          "ui_config": {
            "grid_span": 1,
            "help_text": "Guidance for the user"
          }
        }
      ],
      "research_artifacts": [],
      "governance_rules": [],
      "subject_identifier_field": "the field id that identifies the subject"
    }
  ],
  "library": {
    "CITATION_KEY": {
      "act_name": "Legislation Name",
      "section_title": "Section Title",
      "content": "Full text of the relevant section",
      "analysis": "Why this matters for compliance"
    }
  }
}

REQUIREMENTS:
1. Generate ALL fields exhaustively - do not summarize or abbreviate
2. Include every boolean, date, option that would appear on a paper form
3. Link fields to legislative citations where applicable
4. Use appropriate field types
5. Group fields into logical sections
6. Mark identity fields (name, DOB, ID numbers) with is_identity_field: true

Return ONLY valid JSON, no markdown or explanation.`;

  return basePrompt;
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
