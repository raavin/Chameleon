import { Manifest } from "../types";

// Load all research files at build time for context
const researchFiles = import.meta.glob('../research/*.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

export interface BuildContext {
  region: string;
  domains: string[];
  projectName?: string;
  fundingBody?: string;
  additionalContext?: string;
}

export interface ResearchSource {
  file: string;
  preview: string;
  chars: number;
}

export interface ResearchBundle {
  context: string;
  sources: ResearchSource[];
}

function previewText(content: string, maxLines = 3): string {
  const lines = content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .slice(0, maxLines);
  return lines.join(' | ');
}

/**
 * Get research context from local files
 */
export function getResearchBundle(domains: string[], onLog?: (msg: string) => void): ResearchBundle {
  let context = "";
  const sources: ResearchSource[] = [];
  const allFiles = Object.keys(researchFiles);

  if (onLog) {
    onLog(`\n[SCAN] Research sources available: ${allFiles.length} files`);
  }
  
  // 1. Always include Master Executive Summary
  const masterKey = Object.keys(researchFiles).find(k => k.toLowerCase().includes('masterexecutivesummary'));
  if (masterKey) {
    const masterName = masterKey.split('/').pop() || masterKey;
    const masterContent = researchFiles[masterKey];
    if (onLog) onLog(`\n[SCAN] Found Master Manifest: ${masterName}`);
    if (onLog) onLog(`\n[SCAN] Master Preview: ${previewText(masterContent)}`);
    context += `\n\n## CORE PHILOSOPHICAL ALIGNMENT (THE MASTER MANIFEST)\n${masterContent}\n`;
    sources.push({ file: masterName, preview: previewText(masterContent), chars: masterContent.length });
  }

  // 2. Include Domain-Specific Research
  const loadedKeys = new Set([masterKey]);
  const matchedDomains = new Set<string>();

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
          const content = researchFiles[path];
          if (onLog) onLog(`\n[SCAN] Integrating Domain Research: ${filename}`);
          if (onLog) onLog(`\n[SCAN] ${filename} Preview: ${previewText(content)}`);
          context += `\n\n## DOMAIN RESEARCH: ${filename}\n${content}\n`;
          loadedKeys.add(path);
          matchedDomains.add(d);
          sources.push({ file: filename, preview: previewText(content), chars: content.length });
       }
    });
    if (!matchedDomains.has(d) && onLog) {
      onLog(`\n[SCAN] No direct research file match for domain: ${d}`);
    }
  });

  if (sources.length === 0 && onLog) {
    onLog(`\n[SCAN] No research files matched. Proceeding with default best-practice inference.`);
  }

  return { context, sources };
}

export function getResearchContext(domains: string[], onLog?: (msg: string) => void): string {
  return getResearchBundle(domains, onLog).context;
}

/**
 * Extract manifest JSON from text response
 */
export function extractManifestFromText(text: string): Manifest | null {
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
