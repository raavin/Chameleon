import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Manifest } from "../types";
import { DB } from "./dbService";

// Load all research files
const researchFiles = import.meta.glob('../research/*.txt', { query: '?raw', import: 'default', eager: true }) as Record<string, string>;

// Use process.env.API_KEY as per guidelines
const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

function getResearchContext(domains: string[], onLog?: (msg: string) => void): string {
  let context = "";
  
  // 1. Always include Master Executive Summary
  const masterKey = Object.keys(researchFiles).find(k => k.toLowerCase().includes('masterexecutivesummary'));
  if (masterKey) {
    if (onLog) onLog(`\n[SCAN] Found Master Manifest: ${masterKey.split('/').pop()}`);
    context += `\n\n## CORE PHILOSOPHICAL ALIGNMENT (THE MASTER MANIFEST)\n${researchFiles[masterKey]}\n`;
  }

  // 2. Include Domain-Specific Research
  const loadedKeys = new Set([masterKey]); // Track what we've added to avoid dupes

  domains.forEach(d => {
    const domainLower = d.toLowerCase();
    
    Object.keys(researchFiles).forEach(path => {
       if (loadedKeys.has(path)) return;
       
       const filename = path.split('/').pop()?.toLowerCase() || "";
       const nameNoExt = filename.replace('.txt', '');
       
       // Robust matching: Check full strings OR partial word matches (e.g. "Family" matches "Families")
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

function extractJSON(text: string): string {
  // 1. Try to find markdown code block (loose matching for json tag and whitespace)
  const jsonBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (jsonBlockMatch && jsonBlockMatch[1]) {
    return jsonBlockMatch[1];
  }

  // 2. Fallback to finding the first { and last }
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  
  if (firstBrace === -1 || lastBrace === -1) {
    console.error("Payload received (No JSON found):", text);
    throw new Error("No valid JSON found in the research payload.");
  }
  
  return text.substring(firstBrace, lastBrace + 1);
}

export interface BuildContext {
  region: string;
  domains: string[];
  projectName?: string;
  fundingBody?: string;
  additionalContext?: string;
}

export async function compileManifest(
  ctx: BuildContext,
  onProgress?: (chunk: string) => void
): Promise<Manifest> {
  const ai = getAIClient();
  const { region, domains, projectName, fundingBody, additionalContext } = ctx;

  // 1. Check for existing manifest to merge
  const allManifests = await DB.getAllManifests();
  const existingManifest = allManifests.find(m => m.config.region.toLowerCase() === region.toLowerCase());

  const PROGRAM_NAME = projectName || domains.join(' & ') + " Initiative";
  const SERVICE_TYPES = domains.join(', ');

  // GET RESEARCH CONTEXT
  const researchContext = getResearchContext(domains, onProgress);

  let prompt = '';

  if (existingManifest) {
    // MERGE MODE PROMPT
    prompt = `
# CHAMELEON PROTOCOL: MANIFEST UPDATE AGENT

## YOUR ROLE
You are updating an EXISTING legislative manifest. Do not destroy existing data. You are merging NEW research into the existing JSON structure.

## PHILOSOPHICAL & PROGRAMMATIC ALIGNMENT
${researchContext}

## CURRENT MANIFEST (VERSION ${existingManifest.version})
${JSON.stringify(existingManifest).slice(0, 5000)} ... (truncated for context)

## NEW REQUIREMENTS
- **New Service Types:** ${SERVICE_TYPES}
- **Context:** ${additionalContext || 'Expansion of services'}

## INSTRUCTION
1. Research the NEW domains/services.
2. Add new 'sections' to the 'domains' array if necessary, or add 'fields' to existing sections.
3. Update the 'version' (increment it).
4. Update 'compiled_at'.
5. **IMPORTANT:** Save any key research text into the 'research_artifacts' -> 'cached_content' field so we can store it locally.

## FIELD ENGINEERING: EXHAUSTIVE REQUIREMENT
You must be EXHAUSTIVE in determining the data fields.
- If a standard form has 40 questions, your manifest must have 40 fields.
- Do not summarize or "simplify" complex forms.
- Capture every boolean, date, string, and categorical option required by the legislation/standard.
- **Goal:** The generated UI must be capable of replacing the official paper form entirely.
- **Pagination:** If the form is long, break it into multiple sections. Do NOT arbitrarily limit the length. Generate as many fields as necessary.

## LOGGING & SAVING
- [SEARCH] <Query>
- [DOWNLOAD] Saving <filename> ... (When you find a document, add it to 'research_artifacts' with full text content in 'cached_content')
- [ANALYSIS] <Thought Process> (Explain what you are looking for, what you found, and how you are mapping it. Be verbose.)
- [MERGE] Integrating <new_field> into <section>

## INSTRUCTIONS
1. Start by searching for the official standards/acts.
2. Log your analysis using [ANALYSIS] tags. e.g. "[ANALYSIS] Found 'Family Violence Protection Act 2008'. Extracting definition of 'Risk Assessment'."
3. Log every decision about field inclusion. e.g. "[ANALYSIS] Adding 'Safety Plan' section due to Section 45 requirements."
4. Perform the file downloads/savings.
5. Generate the JSON.

## OUTPUT
Return the FULLY MERGED JSON Manifest.
`;
  } else {
    // CREATE MODE PROMPT (Standard)
    prompt = `
# CHAMELEON PROTOCOL: DEEP LEGISLATIVE RESEARCH AGENT

## YOUR ROLE
You are a Legislative Research Agent. Conduct exhaustive deep research on a specific health/community program and compile ALL requirements.

## PHILOSOPHICAL & PROGRAMMATIC ALIGNMENT
${researchContext}

## INPUT PROVIDED
- **Program Name:** ${PROGRAM_NAME}
- **Location:** ${region}
- **Service Type(s):** ${SERVICE_TYPES}
- **Funding/Org:** ${fundingBody || 'General'}
- **Context:** ${additionalContext || 'None'}

## RESEARCH METHODOLOGY
1. **Identification:** Official service models.
2. **Framework Discovery:** Acts, Regulations, Standards.
3. **Compliance Extraction:** Data fields, Reporting triggers.

## FIELD ENGINEERING: EXHAUSTIVE REQUIREMENT
You must be EXHAUSTIVE in determining the data fields.
- If a standard form has 40 questions, your manifest must have 40 fields.
- Do not summarize or "simplify" complex forms.
- Capture every boolean, date, string, and categorical option required by the legislation/standard.
- **Goal:** The generated UI must be capable of replacing the official paper form entirely.
- **Pagination:** If the form is long, break it into multiple sections. Do NOT arbitrarily limit the length. Generate as many fields as necessary (aim for 10+ pages of form content if applicable).

## LOGGING & VISIBILITY
You must "Think Out Loud" so the user sees your process. Use the following log tags:

- [SEARCH] <Query>
- [DOWNLOAD] Saving <filename> ...
- [ANALYSIS] <Thought Process>

**Required Analysis Logs:**
- Log the specific Acts/Standards you have identified.
- Log the structure of the forms you are finding (e.g. "[ANALYSIS] Found WHO Intake Form V2. It has 4 sections: Patient ID, Triage, Clinical History, Outcome.")
- Log your decision process for specific complex fields (e.g. "[ANALYSIS] Section 12 requires a calculated 'Risk Score'. Adding a computed field.")

## IMPORTANT: FILE PERSISTENCE & FULL TEXT EXTRACTION

For every relevant document (Act, Regulation, Standard) you find, you MUST:

1.  **Extract the FULL TEXT** (or as much as possible, e.g., 50+ key sections) into the 
"cached_content"
 field. Do NOT just summarize.

2.  We want to use this text for RAG (Retrieval Augmented Generation) later, so the more raw text you preserve, the better.

3.  Log the action as: 
"[DOWNLOAD] Saving <filename> ..."


## OUTPUT JSON SCHEMA

{

  "id": "uuid",

  "version": "1.0",

  "compiled_at": "${new Date().toISOString()}",

  "config": { "currency": "string", "locale": "string", "theme": "modern", "region": "${region}" },

  "domains": [{

    "id": "string", "title": "string", 

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
`;
  }

  try {
    // FORCE MODEL: gemini-3-pro-preview with fallback
    const response = await generateWithRetry(ai, {
      model: 'gemini-3-pro-preview', 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
        maxOutputTokens: 65000, // Attempt to force higher output limit for exhaustive manifests
      }
    }, 3, 5000, (activeModel) => {
        if (onProgress) onProgress(`\n[SYSTEM] Active Neural Node: ${activeModel}\n`);
    });

    let fullText = '';
    for await (const chunk of response) {
      const c = chunk as any;
      let textChunk = '';
      
      // DEBUG: Log keys to see structure
      // console.log('Chunk Keys:', Object.keys(c));

      // 1. Check Standard Function Calls (SDK Helper)
      let calls: any[] = [];
      if (typeof c.functionCalls === 'function') calls = c.functionCalls();
      else if (c.functionCalls && Array.isArray(c.functionCalls)) calls = c.functionCalls; 
      
      // 2. Check Raw Candidate Structure (Deep Dive for invisible tool calls)
      if (calls.length === 0 && c.candidates && c.candidates[0]?.content?.parts) {
         const parts = c.candidates[0].content.parts;
         parts.forEach((p: any) => {
            if (p.functionCall) calls.push(p.functionCall);
         });
      }

      if (calls.length > 0) {
         const queries = calls.map((call: any) => {
            const args = call.args || {};
            return args.query || "Unknown Query";
         }).join('", "');
         textChunk = `\n[SEARCH] Performing research via Google: "${queries}"...\n`;
      }
      
      // 3. Text Extraction
      if (typeof c.text === 'function') {
        try { textChunk += c.text(); } catch(e) {}
      } else if (c.text) {
        textChunk += c.text;
      }
      
      if (textChunk) {
        fullText += textChunk;
        if (onProgress) onProgress(textChunk);
      }
    }

    // Attempt to extract
    let cleanedJson: string;
    try {
      cleanedJson = extractJSON(fullText);
    } catch (err) {
      console.error("Failed to extract JSON. Full text was:", fullText);
      throw err;
    }

    const manifest = JSON.parse(cleanedJson) as Manifest;
    return manifest;
  } catch (e) {
    console.error("Critical Compilation Error:", e);
    throw e;
  }
}

async function generateWithRetry(ai: any, params: any, retries = 3, initialDelay = 5000, onModelActive?: (model: string) => void) {
  // Allow user to request specific models, but fallback to known working ones if they fail
  const modelsToTry = [params.model, 'gemini-2.0-flash']; 
  // Deduplicate if params.model was already flash
  const uniqueModels = [...new Set(modelsToTry)];
  
  for (let m = 0; m < uniqueModels.length; m++) {
    const currentModel = uniqueModels[m];
    params.model = currentModel;
    
    for (let i = 0; i < retries; i++) {
      try {
        console.log(`Attempting generation with model: ${currentModel} (Attempt ${i + 1})`);
        const stream = await ai.models.generateContentStream(params);
        if (onModelActive) onModelActive(currentModel);
        return stream;
      } catch (error: any) {
        const isRateLimit = 
          error?.status === 429 || 
          error?.message?.includes('429') || 
          error?.message?.includes('RESOURCE_EXHAUSTED') ||
          error?.message?.includes('Quota exceeded');

        const isNotFound = error?.status === 404 || error?.message?.includes('not found') || error?.message?.includes('doesn\'t exist') || error?.status === 400; // 400 often means invalid model

        if (isNotFound) {
             console.warn(`Model ${currentModel} failed (Not Found/Invalid). Switching to next model.`);
             break; // Break inner retry loop to try next model
        }

        if (isRateLimit && i < retries - 1) {
          let waitTime = initialDelay * Math.pow(2, i);
          const match = error?.message?.match(/retry in (\d+(\.\d+)?)s/);
          if (match && match[1]) {
             waitTime = Math.ceil(parseFloat(match[1]) * 1000) + 1000;
          }
          
          console.warn(`Rate limit hit. Retrying in ${waitTime}ms...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }
        
        // If it's the last retry for this model
        if (i === retries - 1) {
            // If it's the last model, throw
            if (m === uniqueModels.length - 1) throw error;
            // Otherwise just break to try next model
        }
      }
    }
  }
  throw new Error("All models and retries failed.");
}