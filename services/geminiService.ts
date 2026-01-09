import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Manifest } from "../types";
import { DB } from "./dbService";

// Use process.env.API_KEY as per guidelines
const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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

  let prompt = '';

  if (existingManifest) {
    // MERGE MODE PROMPT
    prompt = `
# CHAMELEON PROTOCOL: MANIFEST UPDATE AGENT

## YOUR ROLE
You are updating an EXISTING legislative manifest. Do not destroy existing data. You are merging NEW research into the existing JSON structure.

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

## LOGGING & SAVING
- [SEARCH] <Query>
- [DOWNLOAD] Saving <filename> ... (When you find a document, add it to 'research_artifacts' with full text content in 'cached_content')
- [MERGE] Integrating <new_field> into <section>

## OUTPUT
Return the FULLY MERGED JSON Manifest.
`;
  } else {
    // CREATE MODE PROMPT (Standard)
    prompt = `
# CHAMELEON PROTOCOL: DEEP LEGISLATIVE RESEARCH AGENT

## YOUR ROLE
You are a Legislative Research Agent. Conduct exhaustive deep research on a specific health/community program and compile ALL requirements.

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
         textChunk = `\n[SEARCH] Performing research via Google (${calls.length} queries)...
`;
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