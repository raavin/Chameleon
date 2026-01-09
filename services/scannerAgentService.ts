
import { GoogleGenAI } from "@google/genai";
import { ResearchNode, DocumentScanResult, ExtractedField, CitationReference, FieldType } from '../types';
import { DocumentService } from './documentService';

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Scanner Agent Service: Runs periodic scans of legislation documents
 * to extract compliance requirements and develop interpretations.
 */
export const ScannerAgent = {
  /**
   * Scans a single document and extracts compliance requirements
   */
  async scanDocument(
    artifact: ResearchNode,
    onProgress?: (message: string) => void
  ): Promise<DocumentScanResult> {
    const ai = getAIClient();
    const scanId = `scan_${artifact.id}_${Date.now()}`;

    onProgress?.(`[SCAN] Initiating scan of: ${artifact.title}`);

    const prompt = `
# DOCUMENT COMPLIANCE SCANNER

You are a regulatory compliance scanner analyzing legislation and standards documents.

## DOCUMENT TO ANALYZE
- **Title:** ${artifact.title}
- **Source:** ${artifact.source}
- **URL:** ${artifact.url}
- **Summary:** ${artifact.content_summary}
- **Tags:** ${artifact.tags.join(', ')}

## YOUR TASK
Analyze this document and extract ALL compliance requirements that would affect a healthcare/service management application.

## EXTRACTION REQUIREMENTS

### 1. Data Fields Required
For each mandatory data collection requirement, provide:
- field_id: A programmatic ID (snake_case)
- label: Human-readable field name
- type: One of [text, number, photo, bool, select, date, textarea, relationship, map, file, multiselect]
- is_mandatory: Whether the field is legally required
- source_section: The section/clause that mandates this field
- rationale: Why this field is required (legal basis)

### 2. Governance Rules
List all operational/governance requirements as plain text rules.

### 3. Citation References
For each section referenced, provide:
- citation_id: A reference ID (e.g., "ACT_2023_S26")
- act_name: Full name of the act/regulation
- section: Section number/title
- relevance: "primary" (directly applicable), "secondary" (indirectly), or "contextual" (background)

### 4. Interpretation
Provide:
- A 2-3 sentence summary of the key compliance implications
- Any gaps or ambiguities that require human clarification
- Recommendations for implementation

## OUTPUT FORMAT (JSON)
{
  "extracted_fields": [
    {
      "field_id": "string",
      "label": "string",
      "type": "text|number|bool|select|date|etc",
      "is_mandatory": boolean,
      "source_section": "string",
      "rationale": "string"
    }
  ],
  "governance_rules": ["string"],
  "citations": [
    {
      "citation_id": "string",
      "act_name": "string",
      "section": "string",
      "relevance": "primary|secondary|contextual"
    }
  ],
  "interpretation_summary": "string",
  "compliance_gaps": ["string"],
  "recommendations": ["string"],
  "confidence_score": number (0-1),
  "requires_human_review": boolean
}

Begin analysis:
`;

    try {
      onProgress?.(`[FETCH] Retrieving document content...`);

      const response = await ai.models.generateContentStream({
        model: 'gemini-2.0-flash',
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
        }
      });

      let fullText = '';
      for await (const chunk of response) {
        if (chunk.text) {
          fullText += chunk.text;
          onProgress?.(`[PARSE] Processing response...`);
        }
      }

      onProgress?.(`[EXTRACT] Parsing compliance data...`);

      // Extract JSON from response
      const jsonMatch = fullText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No valid JSON found in scan response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      const result: DocumentScanResult = {
        id: scanId,
        document_id: artifact.id,
        scanned_at: new Date().toISOString(),
        agent_model: 'gemini-2.0-flash',
        extracted_fields: (parsed.extracted_fields || []).map((f: any) => ({
          field_id: f.field_id,
          label: f.label,
          type: f.type as FieldType,
          is_mandatory: f.is_mandatory,
          source_section: f.source_section,
          source_page: f.source_page,
          rationale: f.rationale
        })),
        governance_rules: parsed.governance_rules || [],
        citations: (parsed.citations || []).map((c: any) => ({
          citation_id: c.citation_id,
          act_name: c.act_name,
          section: c.section,
          relevance: c.relevance
        })),
        interpretation_summary: parsed.interpretation_summary || '',
        compliance_gaps: parsed.compliance_gaps,
        recommendations: parsed.recommendations,
        confidence_score: parsed.confidence_score || 0.7,
        requires_human_review: parsed.requires_human_review ?? true
      };

      // Save the scan result
      DocumentService.saveScanResult(result);

      // Mark document as checked
      DocumentService.markAsChecked(artifact.id, false);

      onProgress?.(`[COMPLETE] Scan finished. Extracted ${result.extracted_fields.length} fields, ${result.governance_rules.length} rules.`);

      return result;

    } catch (error) {
      onProgress?.(`[ERROR] Scan failed: ${error}`);
      throw error;
    }
  },

  /**
   * Scans all documents in a manifest that are due for refresh
   */
  async runScheduledScans(
    artifacts: ResearchNode[],
    onProgress?: (message: string) => void
  ): Promise<{ scanned: number; skipped: number; errors: string[] }> {
    const results = { scanned: 0, skipped: 0, errors: [] as string[] };

    for (const artifact of artifacts) {
      if (DocumentService.needsRefresh(artifact.id)) {
        try {
          onProgress?.(`\n[QUEUE] Scanning: ${artifact.title}`);
          await this.scanDocument(artifact, onProgress);
          results.scanned++;
        } catch (e) {
          results.errors.push(`${artifact.id}: ${e}`);
        }
      } else {
        results.skipped++;
        onProgress?.(`[SKIP] Already current: ${artifact.title}`);
      }
    }

    return results;
  },

  /**
   * Compares two scan results to detect changes
   */
  detectChanges(
    previousScan: DocumentScanResult,
    currentScan: DocumentScanResult
  ): {
    newFields: ExtractedField[];
    removedFields: string[];
    changedRules: { added: string[]; removed: string[] };
  } {
    const prevFieldIds = new Set(previousScan.extracted_fields.map(f => f.field_id));
    const currFieldIds = new Set(currentScan.extracted_fields.map(f => f.field_id));

    const newFields = currentScan.extracted_fields.filter(f => !prevFieldIds.has(f.field_id));
    const removedFields = previousScan.extracted_fields
      .filter(f => !currFieldIds.has(f.field_id))
      .map(f => f.field_id);

    const prevRules = new Set(previousScan.governance_rules);
    const currRules = new Set(currentScan.governance_rules);

    const addedRules = currentScan.governance_rules.filter(r => !prevRules.has(r));
    const removedRules = previousScan.governance_rules.filter(r => !currRules.has(r));

    return {
      newFields,
      removedFields,
      changedRules: { added: addedRules, removed: removedRules }
    };
  },

  /**
   * Generates a human-readable change report
   */
  generateChangeReport(
    documentTitle: string,
    changes: ReturnType<typeof this.detectChanges>
  ): string {
    const lines = [`## Change Report: ${documentTitle}`, ''];

    if (changes.newFields.length > 0) {
      lines.push('### New Required Fields');
      changes.newFields.forEach(f => {
        lines.push(`- **${f.label}** (${f.field_id}): ${f.rationale}`);
      });
      lines.push('');
    }

    if (changes.removedFields.length > 0) {
      lines.push('### Removed Fields');
      changes.removedFields.forEach(id => lines.push(`- ${id}`));
      lines.push('');
    }

    if (changes.changedRules.added.length > 0) {
      lines.push('### New Governance Rules');
      changes.changedRules.added.forEach(r => lines.push(`- ${r}`));
      lines.push('');
    }

    if (changes.changedRules.removed.length > 0) {
      lines.push('### Removed Rules');
      changes.changedRules.removed.forEach(r => lines.push(`- ${r}`));
      lines.push('');
    }

    if (changes.newFields.length === 0 &&
        changes.removedFields.length === 0 &&
        changes.changedRules.added.length === 0 &&
        changes.changedRules.removed.length === 0) {
      lines.push('*No changes detected.*');
    }

    return lines.join('\n');
  },

  /**
   * Gets a summary of all pending reviews across documents
   */
  getPendingReviewsSummary(): {
    documentId: string;
    title: string;
    lastScan: string;
    gapCount: number;
    confidence: number;
  }[] {
    const pendingDocs = DocumentService.getDocumentsRequiringReview();

    return pendingDocs.map(doc => {
      const latestScan = DocumentService.getLatestScan(doc.artifact_id);
      return {
        documentId: doc.artifact_id,
        title: doc.document_title,
        lastScan: latestScan?.scanned_at || 'Never',
        gapCount: latestScan?.compliance_gaps?.length || 0,
        confidence: latestScan?.confidence_score || 0
      };
    });
  }
};
