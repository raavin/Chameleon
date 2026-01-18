/**
 * Gemini Agent Service - Chameleon Protocol
 *
 * Agentic manifest generation via backend pipeline.
 */

import { Manifest } from "../types";
import { BuildContext, extractManifestFromText, getResearchBundle } from "./geminiShared";

const API_BASE = import.meta.env.VITE_API_URL || '/api';

export async function compileManifestAgent(
  ctx: BuildContext,
  onProgress?: (chunk: string) => void
): Promise<Manifest> {
  const { region, domains, projectName, fundingBody, additionalContext } = ctx;

  const researchBundle = getResearchBundle(domains, onProgress);
  const researchContext = researchBundle.context;
  if (onProgress) {
    onProgress(`\n[SCAN] Research bundle: ${researchBundle.sources.length} file(s) loaded`);
  }

  if (onProgress) {
    onProgress(`\n[SYSTEM] Connecting to Agent Orchestrator...\n`);
  }

  const payload = {
    domains,
    region,
    currency: 'AUD',
    locale: 'en-AU',
    researchContext,
    researchSources: researchBundle.sources,
    projectName,
    fundingBody,
    additionalContext
  };

  const response = await fetch(`${API_BASE}/gemini/manifest-agent`, {
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
              if (onProgress) onProgress(`\n[SYSTEM] ${data.status}\n`);
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
              if (data.manifest) {
                manifest = data.manifest;
              } else if (data.parseError) {
                manifest = extractManifestFromText(data.rawText || fullText);
              }
            }

            if (data.error) {
              throw new Error(data.error);
            }
          } catch (parseErr) {
            console.warn('SSE parse warning:', parseErr);
          }
        }
      }
    }
  } finally {
    reader.releaseLock();
  }

  if (!manifest) {
    manifest = extractManifestFromText(fullText);
  }

  if (!manifest) {
    throw new Error('Failed to generate manifest');
  }

  return manifest;
}
