/**
 * Deep Research Service - Chameleon Protocol
 *
 * Integrates with Google's Gemini Deep Research API (Interactions API)
 * for comprehensive, autonomous research gathering.
 *
 * Uses the deep-research-pro-preview-12-2025 agent which:
 * - Plans research approach
 * - Searches the web iteratively
 * - Reads and synthesizes information
 * - Produces comprehensive research reports
 */

const DEEP_RESEARCH_AGENT = 'deep-research-pro-preview-12-2025';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

/**
 * Deep Research Service class
 */
export class DeepResearchService {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.pollingInterval = 10000; // 10 seconds
    this.maxPollingAttempts = 60; // 10 minutes max
  }

  /**
   * Create a deep research interaction
   * @param {string} query - The research query
   * @param {object} options - Additional options
   * @returns {Promise<object>} - The interaction object with ID
   */
  async createResearchInteraction(query, options = {}) {
    // Note: The deep-research agent doesn't support custom agent_config or system_instruction.
    // All research guidance must be embedded in the query itself.
    const { tools = [] } = options;

    const requestBody = {
      input: query,
      agent: DEEP_RESEARCH_AGENT,
      background: true
    };

    if (tools.length > 0) {
      requestBody.tools = tools;
    }

    const response = await fetch(`${GEMINI_API_BASE}/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Deep Research API error: ${error.error?.message || response.statusText}`);
    }

    return await response.json();
  }

  /**
   * Poll for interaction completion
   * @param {string} interactionId - The interaction ID to poll
   * @param {function} onProgress - Callback for progress updates
   * @returns {Promise<object>} - The completed interaction result
   */
  async pollInteraction(interactionId, onProgress = null) {
    let attempts = 0;

    while (attempts < this.maxPollingAttempts) {
      const response = await fetch(`${GEMINI_API_BASE}/interactions/${interactionId}`, {
        method: 'GET',
        headers: {
          'x-goog-api-key': this.apiKey
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Polling error: ${error.error?.message || response.statusText}`);
      }

      const result = await response.json();

      if (onProgress) {
        onProgress({
          status: result.status,
          attempt: attempts + 1,
          maxAttempts: this.maxPollingAttempts
        });
      }

      if (result.status === 'completed') {
        return result;
      }

      if (result.status === 'failed') {
        throw new Error(`Research failed: ${result.error || 'Unknown error'}`);
      }

      attempts++;
      await this.sleep(this.pollingInterval);
    }

    throw new Error('Research timed out after maximum polling attempts');
  }

  /**
   * Extract the final research output from an interaction result
   * @param {object} result - The completed interaction result
   * @returns {string} - The research output text
   */
  extractOutput(result) {
    if (!result.outputs || result.outputs.length === 0) {
      return '';
    }
    // Get the last output which contains the final result
    return result.outputs[result.outputs.length - 1].text || '';
  }

  /**
   * Conduct comprehensive research on a topic
   * @param {string} topic - The topic to research
   * @param {string} region - The geographic region for context
   * @param {object} options - Research options
   * @param {function} onProgress - Progress callback
   * @returns {Promise<object>} - Research results
   */
  async conductResearch(topic, region, options = {}, onProgress = null) {
    const {
      depth = 'comprehensive',
      focusAreas = [],
      excludeTopics = []
    } = options;

    // Build research query with context (depth instructions are embedded in the query)
    const query = this.buildResearchQuery(topic, region, depth, focusAreas, excludeTopics);

    if (onProgress) {
      onProgress({ phase: 'initiating', message: 'Starting deep research...' });
    }

    // Create the research interaction (no system instructions - they're in the query)
    const interaction = await this.createResearchInteraction(query);

    if (onProgress) {
      onProgress({
        phase: 'researching',
        message: 'Deep research in progress...',
        interactionId: interaction.id
      });
    }

    // Poll for completion
    const result = await this.pollInteraction(interaction.id, (pollStatus) => {
      if (onProgress) {
        onProgress({
          phase: 'researching',
          message: `Research in progress... (attempt ${pollStatus.attempt}/${pollStatus.maxAttempts})`,
          status: pollStatus.status
        });
      }
    });

    if (onProgress) {
      onProgress({ phase: 'processing', message: 'Processing research results...' });
    }

    // Extract and structure the output
    const rawOutput = this.extractOutput(result);
    const structuredOutput = this.structureResearchOutput(rawOutput, topic);

    return {
      interactionId: interaction.id,
      rawOutput,
      structured: structuredOutput,
      metadata: {
        topic,
        region,
        depth,
        completedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Build a comprehensive research query
   */
  buildResearchQuery(topic, region, depth, focusAreas, excludeTopics) {
    // Start with depth-specific framing
    const depthInstructions = {
      quick: `Provide a focused summary with key facts and primary sources.`,
      standard: `Provide balanced coverage with multiple perspectives and practical insights.`,
      comprehensive: `Conduct exhaustive research covering all aspects. Include historical context, current state, future trends, multiple stakeholder perspectives, and detailed analysis. Leave no stone unturned.`
    };

    let query = `You are an expert research analyst. ${depthInstructions[depth] || depthInstructions.standard}\n\n`;
    query += `Conduct ${depth} research on: "${topic}" in the context of ${region}.\n\n`;

    query += `Research objectives:\n`;
    query += `1. Historical context and evolution of this topic\n`;
    query += `2. Current legislative and regulatory framework in ${region}\n`;
    query += `3. Industry best practices and standards\n`;
    query += `4. Real-world case studies and success stories\n`;
    query += `5. Local landscape - key players, organizations, and stakeholders\n`;
    query += `6. Emerging trends and future outlook\n`;
    query += `7. Common challenges and solutions\n`;
    query += `8. Technical requirements and specifications\n`;

    if (focusAreas.length > 0) {
      query += `\nPriority focus areas:\n`;
      focusAreas.forEach((area, i) => {
        query += `${i + 1}. ${area}\n`;
      });
    }

    if (excludeTopics.length > 0) {
      query += `\nTopics to exclude or minimize:\n`;
      excludeTopics.forEach((t, i) => {
        query += `${i + 1}. ${t}\n`;
      });
    }

    query += `\nProvide a comprehensive, well-structured report with:\n`;
    query += `- Clear section headings for each research area\n`;
    query += `- Specific citations and sources where possible\n`;
    query += `- Actionable insights and recommendations\n`;
    query += `- Data points, statistics, and metrics where available\n`;
    query += `- Compliance requirements and regulatory considerations\n`;

    return query;
  }

  /**
   * Get system prompt for research depth
   */
  getResearchSystemPrompt(depth) {
    const basePrompt = `You are an expert research analyst. Your task is to conduct thorough, accurate research and provide comprehensive reports. Always cite your sources and distinguish between facts, opinions, and recommendations.`;

    const depthInstructions = {
      quick: `Focus on key facts and primary sources. Provide a concise summary.`,
      standard: `Provide balanced coverage of the topic with multiple perspectives and sources. Include practical insights.`,
      comprehensive: `Conduct exhaustive research covering all aspects of the topic. Include historical context, current state, future trends, multiple stakeholder perspectives, and detailed analysis. Leave no stone unturned.`
    };

    return `${basePrompt}\n\n${depthInstructions[depth] || depthInstructions.standard}`;
  }

  /**
   * Structure raw research output into categorized sections
   */
  structureResearchOutput(rawOutput, topic) {
    // Parse the output into logical sections
    const sections = {
      summary: '',
      historical: '',
      legislative: '',
      best_practices: '',
      case_studies: '',
      local_landscape: '',
      technical: '',
      trends: '',
      challenges: '',
      recommendations: '',
      sources: []
    };

    // Simple section extraction based on common headings
    const sectionPatterns = [
      { key: 'historical', patterns: [/##?\s*historical/i, /##?\s*history/i, /##?\s*background/i, /##?\s*evolution/i] },
      { key: 'legislative', patterns: [/##?\s*legislat/i, /##?\s*regulat/i, /##?\s*legal/i, /##?\s*compliance/i, /##?\s*law/i] },
      { key: 'best_practices', patterns: [/##?\s*best\s*practice/i, /##?\s*standards/i, /##?\s*guidelines/i] },
      { key: 'case_studies', patterns: [/##?\s*case\s*stud/i, /##?\s*examples/i, /##?\s*success\s*stor/i, /##?\s*real[\s-]world/i] },
      { key: 'local_landscape', patterns: [/##?\s*local/i, /##?\s*landscape/i, /##?\s*stakeholder/i, /##?\s*organization/i, /##?\s*key\s*player/i] },
      { key: 'technical', patterns: [/##?\s*technical/i, /##?\s*specification/i, /##?\s*requirement/i, /##?\s*implementation/i] },
      { key: 'trends', patterns: [/##?\s*trend/i, /##?\s*future/i, /##?\s*emerging/i, /##?\s*outlook/i] },
      { key: 'challenges', patterns: [/##?\s*challenge/i, /##?\s*obstacle/i, /##?\s*issue/i, /##?\s*problem/i] },
      { key: 'recommendations', patterns: [/##?\s*recommend/i, /##?\s*conclusion/i, /##?\s*action/i, /##?\s*next\s*step/i] }
    ];

    // Extract summary (first paragraph or executive summary)
    const summaryMatch = rawOutput.match(/(?:executive\s*summary|summary|overview)[:\s]*\n?([\s\S]*?)(?=\n##|\n\*\*|$)/i);
    if (summaryMatch) {
      sections.summary = summaryMatch[1].trim().substring(0, 2000);
    } else {
      // Use first few paragraphs as summary
      const paragraphs = rawOutput.split(/\n\n/).slice(0, 3);
      sections.summary = paragraphs.join('\n\n').substring(0, 2000);
    }

    // Extract sources/references
    const sourcesMatch = rawOutput.match(/(?:sources|references|citations|bibliography)[:\s]*\n?([\s\S]*?)$/i);
    if (sourcesMatch) {
      const sourceLines = sourcesMatch[1].split('\n').filter(line => line.trim());
      sections.sources = sourceLines.slice(0, 50).map(line => ({
        text: line.replace(/^[-*•]\s*/, '').trim(),
        extracted: true
      }));
    }

    // Extract URL sources from the content
    const urlMatches = rawOutput.match(/https?:\/\/[^\s\)]+/g) || [];
    const uniqueUrls = [...new Set(urlMatches)];
    uniqueUrls.forEach(url => {
      if (!sections.sources.find(s => s.url === url)) {
        sections.sources.push({ url, extracted: true });
      }
    });

    // Store full content for each section
    sections.full_content = rawOutput;

    return sections;
  }

  /**
   * Continue a research conversation
   * @param {string} previousInteractionId - Previous interaction to continue from
   * @param {string} followUpQuery - Follow-up question or request
   * @returns {Promise<object>} - Continuation result
   */
  async continueResearch(previousInteractionId, followUpQuery) {
    const response = await fetch(`${GEMINI_API_BASE}/interactions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': this.apiKey
      },
      body: JSON.stringify({
        input: followUpQuery,
        agent: DEEP_RESEARCH_AGENT,
        background: true,
        previous_interaction_id: previousInteractionId
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Continue research error: ${error.error?.message || response.statusText}`);
    }

    const interaction = await response.json();
    const result = await this.pollInteraction(interaction.id);

    return {
      interactionId: interaction.id,
      previousInteractionId,
      output: this.extractOutput(result)
    };
  }

  /**
   * Helper: Sleep for specified milliseconds
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Research categories for expert mode
 */
export const RESEARCH_CATEGORIES = {
  HISTORICAL: 'historical',
  LEGISLATIVE: 'legislative',
  BEST_PRACTICES: 'best_practices',
  CASE_STUDIES: 'case_studies',
  LOCAL_LANDSCAPE: 'local_landscape',
  TECHNICAL: 'technical',
  STAKEHOLDER: 'stakeholder',
  RISKS: 'risks',
  OPPORTUNITIES: 'opportunities',
  CULTURAL: 'cultural'
};

/**
 * Create a configured deep research service instance
 */
export function createDeepResearchService() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  return new DeepResearchService(apiKey);
}

export default DeepResearchService;
