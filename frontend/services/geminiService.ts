/**
 * Gemini Service - Chameleon Protocol
 * 
 * Manifest generation via Express backend API.
 * All AI calls are proxied through the server to protect the API key.
 */

import { Manifest } from "../types";
import { BuildContext, extractManifestFromText, getResearchBundle } from "./geminiShared";
import { compileManifestAgent } from "./geminiAgentService";

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const USE_LANGGRAPH_AGENT = true;

export type { BuildContext };

/**
 * Compile a manifest using the Express backend Gemini API
 */
async function compileManifestStandard(
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
  const researchBundle = getResearchBundle(domains, onProgress);
  const researchContext = researchBundle.context;
  if (onProgress) {
    onProgress(`\n[SCAN] Research bundle: ${researchBundle.sources.length} file(s) loaded`);
  }

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
    researchSources: researchBundle.sources,
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
              if (data.detail && onProgress) {
                onProgress(`[DETAIL] ${data.detail}\n`);
              }
              if (data.prompt && onProgress) {
                onProgress(`[PROMPT]\n${data.prompt}\n`);
              }
              if (data.references && onProgress) {
                const list = data.references
                  .map((ref: { file: string; preview?: string; chars?: number }) => {
                    const preview = ref.preview ? ` :: ${ref.preview}` : '';
                    const chars = typeof ref.chars === 'number' ? ` (${ref.chars} chars)` : '';
                    return `- ${ref.file}${chars}${preview}`;
                  })
                  .join('\n');
                onProgress(`[REFERENCES]\n${list}\n`);
              }
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

export async function compileManifest(
  ctx: BuildContext,
  onProgress?: (chunk: string) => void
): Promise<Manifest> {
  if (USE_LANGGRAPH_AGENT) {
    return compileManifestAgent(ctx, onProgress);
  }
  return compileManifestStandard(ctx, onProgress);
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
