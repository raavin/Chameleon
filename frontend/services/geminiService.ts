/**
 * Gemini Service - Chameleon Protocol
 * 
 * Manifest generation via Express backend API.
 * All AI calls are proxied through the server to protect the API key.
 */

import { Manifest } from "../types";
import { DB } from "./dbService";

// Load all research files at build time for context
const researchFiles = import.meta.glob('../research/*.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

const API_BASE = import.meta.env.VITE_API_URL || '/api';

/**
 * Get research context from local files
 */
function getResearchContext(domains: string[], onLog?: (msg: string) => void): string {
  let context = "";
  
  // 1. Always include Master Executive Summary
  const masterKey = Object.keys(researchFiles).find(k => k.toLowerCase().includes('masterexecutivesummary'));
  if (masterKey) {
    if (onLog) onLog(`\n[SCAN] Found Master Manifest: ${masterKey.split('/').pop()}`);
    context += `\n\n## CORE PHILOSOPHICAL ALIGNMENT (THE MASTER MANIFEST)\n${researchFiles[masterKey]}\n`;
  }

  // 2. Include Domain-Specific Research
  const loadedKeys = new Set([masterKey]);

  domains.forEach(d => {
    const domainLower = d.toLowerCase();
    
    Object.keys(researchFiles).forEach(path => {
       if (loadedKeys.has(path)) return;
       
       const filename = path.split('/').pop()?.toLowerCase() || "";
       const nameNoExt = filename.replace('.txt', '');
       
       const domainParts = domainLower.split(/[\s-_]+/).filter(w => w.length > 3);
       const isMatch = filename.includes(domainLower) || 
                       domainLower.includes(nameNoExt) ||
                       domainParts.some(part => nameNoExt.includes(part));

       if (isMatch) {
          if (onLog) onLog(`\n[SCAN] Integrating Domain Research: ${filename}`);
          context += `\n\n## DOMAIN RESEARCH: ${filename}\n${researchFiles[path]}\n`;
          loadedKeys.add(path);
       }
    });
  });

  return context;
}

export interface BuildContext {
  region: string;
  domains: string[];
  projectName?: string;
  fundingBody?: string;
  additionalContext?: string;
}

/**
 * Compile a manifest using the Express backend Gemini API
 */
export async function compileManifest(
  ctx: BuildContext,
  onProgress?: (chunk: string) => void
): Promise<Manifest> {
  const { region, domains, projectName, fundingBody, additionalContext } = ctx;

  // TODO: MERGE functionality disabled for now - always creates new manifests
  // To re-enable merge mode in the future:
  // 1. Uncomment the code below to find existing manifests by region
  // 2. Pass existingManifest to the payload
  // 3. The backend will detect existingManifest and set mode to MERGE
  // 4. The AI prompt includes instructions for merging domains/fields
  //
  // const isClientModule = projectName?.toLowerCase().includes('client');
  // let existingManifest = null;
  // if (!isClientModule) {
  //   const allManifests = await DB.getAllManifests();
  //   existingManifest = allManifests.find(m => m.config.region.toLowerCase() === region.toLowerCase());
  // }

  // 1. Get research context from local files
  const researchContext = getResearchContext(domains, onProgress);

  if (onProgress) {
    onProgress(`\n[SYSTEM] Connecting to AI Engine...\n`);
  }

  // 2. Build request payload (existingManifest always null - merge disabled)
  const payload = {
    domains,
    region,
    currency: 'AUD', // Default, could be made configurable
    locale: 'en-AU',
    researchContext,
    existingManifest: null,
    projectName,
    fundingBody,
    additionalContext
  };

  // 4. Call the Express backend with SSE streaming
  const response = await fetch(`${API_BASE}/gemini/manifest`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  // 5. Process SSE stream
  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error('No response body');
  }

  const decoder = new TextDecoder();
  let fullText = '';
  let manifest: Manifest | null = null;

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          try {
            const data = JSON.parse(line.slice(6));
            
            if (data.status) {
              if (onProgress) onProgress(`\n[SYSTEM] Mode: ${data.mode || data.status}\n`);
            }
            
            if (data.chunk) {
              fullText += data.chunk;
              if (onProgress) onProgress(data.chunk);
            }
            
            if (data.done) {
              console.log('[GEMINI] Received done signal, manifest:', data.manifest?.id);
              if (data.manifest) {
                manifest = data.manifest;
                console.log('[GEMINI] Manifest assigned from server response');
              } else if (data.parseError) {
                console.error('[GEMINI] Parse error from server:', data.parseError);
                // Try to extract JSON ourselves
                manifest = extractManifestFromText(data.rawText || fullText);
              } else {
                console.warn('[GEMINI] Done received but no manifest in response');
              }
            }
            
            if (data.error) {
              console.error('[GEMINI] Error from server:', data.error);
              throw new Error(data.error);
            }
          } catch (parseErr) {
            // Not valid JSON, might be partial data
            console.warn('SSE parse warning:', parseErr);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  console.log('[GEMINI] Stream completed. Manifest from server:', manifest?.id);
  console.log('[GEMINI] Full text length:', fullText.length);

  if (!manifest) {
    // Last resort: try to extract from fullText
    console.log('[GEMINI] No manifest from server, attempting extraction from text...');
    manifest = extractManifestFromText(fullText);
    console.log('[GEMINI] Extracted manifest:', manifest?.id);
  }

  if (!manifest) {
    console.error('[GEMINI] Failed to get manifest. Full text was:', fullText.slice(0, 500));
    throw new Error('Failed to generate manifest');
  }

  console.log('[GEMINI] Returning manifest with ID:', manifest.id, 'domains:', manifest.domains?.length);
  return manifest;
}

/**
 * Extract manifest JSON from text response
 */
function extractManifestFromText(text: string): Manifest | null {
  try {
    // Try markdown code block
    const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (jsonBlockMatch && jsonBlockMatch[1]) {
      return JSON.parse(jsonBlockMatch[1]);
    }

    // Try raw JSON
    const firstBrace = text.indexOf('{');
    const lastBrace = text.lastIndexOf('}');
    
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      return JSON.parse(text.substring(firstBrace, lastBrace + 1));
    }
  } catch (e) {
    console.error('Failed to extract manifest:', e);
  }
  
  return null;
}

/**
 * Simple text generation (for other AI features)
 */
export async function generateText(prompt: string): Promise<string> {
  const response = await fetch(`${API_BASE}/gemini/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API Error: ${response.status}`);
  }

  const data = await response.json();
  return data.text;
}
