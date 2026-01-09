
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Manifest } from "../types";

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Robust JSON extraction that handles markdown blocks and preamble.
 */
function extractJSON(text: string): string {
  const firstBrace = text.indexOf('{');
  const lastBrace = text.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1) {
    console.error("Payload received:", text);
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
  
  // Mapping context to the user's detailed prompt variables
  const PROGRAM_NAME = projectName || domains.join(' & ') + " Initiative";
  const LOCATION = region;
  const SERVICE_TYPES = domains.join(', ');

  const prompt = `
# CHAMELEON PROTOCOL: DEEP LEGISLATIVE RESEARCH AGENT

## YOUR ROLE
You are a Legislative Research Agent for the Chameleon Protocol. Your task is to conduct exhaustive deep research on a specific health or community service program and compile ALL regulatory, legislative, and operational requirements into a structured JSON output.

## INPUT PROVIDED
- **Program Name:** ${PROGRAM_NAME}
- **Location:** ${LOCATION}
- **Service Type(s):** ${SERVICE_TYPES}
- **Funding/Org Context:** ${fundingBody || 'General NGO/Government'}
- **Additional Context:** ${additionalContext || 'None'}

## RESEARCH METHODOLOGY (EXECUTE THESE PHASES MENTALLY & VIA TOOLS)

### Phase 1: Program Identification
Identify the official service model, target population, and funding sources.

### Phase 2: Legislative Framework Discovery
Conduct deep searches for:
1. Primary Legislation (Acts of Parliament) - e.g., Mental Health Acts, Privacy Acts.
2. Regulations - Ministerial Orders, Gazetted Standards.
3. Professional Standards - AHPRA, Social Work boards.
4. Funding Body Requirements - KPIs, Mandatory Reporting.

### Phase 3: Compliance Requirements Extraction
For each document found, extract:
- **Data Requirements:** Mandatory collection fields, prohibited fields.
- **Reporting:** Mandatory triggers (Child Safety, Risk of Harm).
- **Governance:** Financial controls, Staff screening (WWCC).
- **Service Delivery:** Eligibility, wait times, discharge rules.
- **Cultural Safety:** Indigenous protocols, CALD requirements.

### Phase 4: Cross-Reference
Cite exact sources (Section numbers, URLs).

### Phase 5: Gap Analysis
Identify ambiguous areas where professional discretion is required.

## CRITICAL INSTRUCTIONS
1. **EXHAUSTIVE FIELDS:** Do not limit yourself to a set number of questions. If a legislation requires 50 data points, generate 50 fields.
2. **REAL-TIME LOGGING:** You MUST output log lines describing your actions. 
   - [SEARCH] <Query>
   - [DOWNLOAD] Saving <filename> to /local/research/docs/... (Use this when you find a key Act or Standard)
   - [SCAN] Parsing <filename> for compliance fields...
   - [COMPLIANCE] Mapping <funding_body> requirement...
3. **FILE PERSISTENCE:** If you log "[DOWNLOAD]", that document MUST appear in the "research_artifacts" array in the final JSON.

## OUTPUT FORMAT ADAPTATION
You must map your research findings into the Chameleon Application JSON Schema below. 
- Map "Compliance Requirements" -> "sections" and "fields".
- Map "Legislative Framework" -> "library".
- Map "Sources" -> "research_artifacts".

JSON SCHEMA:
{
  "id": "uuid",
  "version": "7.0-legislative-deep-dive",
  "compiled_at": "${new Date().toISOString()}",
  "config": { "currency": "string", "locale": "string", "theme": "modern", "region": "${LOCATION}" },
  "domains": [{
    "id": "string", "title": "string", 
    "research_artifacts": [
      { 
        "id": "string", 
        "source": "WHO|UN|HRC|Local|Gov", 
        "title": "string", 
        "url": "string", 
        "content_summary": "string",
        "tags": ["string"]
      }
    ], 
    "sections": [
      { 
        "id": "string", 
        "title": "string", 
        "description": "string", 
        "field_ids": ["string"] 
      }
    ], 
    "fields": [
      { 
        "id": "string", 
        "label": "string", 
        "type": "text|number|photo|bool|select|date|textarea|relationship|map|file|multiselect", 
        "options": ["string"], 
        "is_identity_field": boolean, 
        "section_citation": "CITATION_ID (optional)",
        "ui_config": { "grid_span": 1|2, "help_text": "string" } 
      }
    ], 
    "governance_rules": [{ "description": "string" }], 
    "subject_identifier_field": "string"
  }],
  "library": { 
    "CITATION_ID": { 
      "act_name": "string", 
      "section_title": "string", 
      "content": "string", 
      "analysis": "string" 
    } 
  }
}

Begin Research & Compilation:
`;

  try {
    const response = await ai.models.generateContentStream({
      model: 'gemini-3-pro-preview', 
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    let fullText = '';
    for await (const chunk of response) {
      const c = chunk as GenerateContentResponse;
      if (c.text) {
        fullText += c.text;
        if (onProgress) onProgress(c.text);
      }
    }

    const cleanedJson = extractJSON(fullText);
    const manifest = JSON.parse(cleanedJson) as Manifest;
    return manifest;
  } catch (e) {
    console.error("Critical Compilation Error:", e);
    throw e;
  }
}
