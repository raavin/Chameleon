/**
 * Expert Mode Agent - Chameleon Protocol
 *
 * Orchestrates comprehensive expertise gathering to create
 * an Expert Context Document that can be saved and reused.
 *
 * Gathers:
 * - Historical information
 * - Legislative/regulatory info
 * - Best practices
 * - Real stories/case studies
 * - Local landscape analysis
 * - Technical requirements
 * - Stakeholder analysis
 * - Risk assessment
 */

import { DeepResearchService, RESEARCH_CATEGORIES } from './deepResearchService.js';
import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Expert Mode Agent class
 */
export class ExpertModeAgent {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.deepResearch = new DeepResearchService(apiKey);
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.synthesisModel = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 32000,
        temperature: 0.3
      }
    });
  }

  /**
   * Conduct full expert mode research
   * @param {object} request - The research request
   * @param {function} onProgress - Progress callback for streaming updates
   * @returns {Promise<object>} - Expert context document
   */
  async conductExpertResearch(request, onProgress = null) {
    const {
      topic,
      domains = [],
      region,
      depth = 'comprehensive',
      focusAreas = [],
      additionalContext = ''
    } = request;

    const expertContext = {
      summary: '',
      domain_expertise: '',
      research_categories: [],
      key_insights: [],
      compliance_requirements: [],
      recommended_modules: [],
      total_sources: 0,
      research_depth: depth,
      deep_research_interaction_id: null,
      generated_at: new Date()
    };

    try {
      // Phase 1: Research - use Deep Research for comprehensive, regular Gemini for quick/standard
      let rawResearchOutput = '';

      if (depth === 'comprehensive') {
        // Use Deep Research API for comprehensive analysis (slower but thorough)
        this.emitProgress(onProgress, {
          phase: 'deep_research',
          status: 'starting',
          message: 'Initiating Google Deep Research Agent for comprehensive analysis (this may take 5-15 minutes)...'
        });

        const deepResearchQuery = this.buildDeepResearchQuery(topic, domains, region, focusAreas, additionalContext);

        const deepResearchResult = await this.deepResearch.conductResearch(
          deepResearchQuery,
          region,
          { depth, focusAreas },
          (progress) => this.emitProgress(onProgress, { phase: 'deep_research', ...progress })
        );

        expertContext.deep_research_interaction_id = deepResearchResult.interactionId;
        expertContext.deep_research_sources = deepResearchResult.structured?.sources || [];
        rawResearchOutput = deepResearchResult.rawOutput;

        this.emitProgress(onProgress, {
          phase: 'deep_research',
          status: 'complete',
          message: 'Deep research complete. Processing results...'
        });
      } else {
        // Use regular Gemini for quick/standard (faster, still good quality)
        this.emitProgress(onProgress, {
          phase: 'research',
          status: 'starting',
          message: `Conducting ${depth} research using Gemini...`
        });

        rawResearchOutput = await this.conductFastResearch(topic, domains, region, depth, focusAreas, additionalContext, onProgress);

        this.emitProgress(onProgress, {
          phase: 'research',
          status: 'complete',
          message: 'Research complete. Processing results...'
        });
      }

      // Phase 2: Parse and categorize research results
      this.emitProgress(onProgress, {
        phase: 'categorization',
        status: 'starting',
        message: 'Categorizing research into expertise areas...'
      });

      const categorizedResearch = await this.categorizeResearch(
        rawResearchOutput,
        {}, // structured output only available from deep research
        topic,
        region
      );

      expertContext.research_categories = categorizedResearch.categories;
      expertContext.total_sources = categorizedResearch.sourceCount;

      // Emit per-category detail events
      for (const cat of categorizedResearch.categories) {
        this.emitProgress(onProgress, {
          phase: 'categorization',
          status: 'category_detail',
          message: `${cat.title}: ${cat.content?.substring(0, 150)}...`,
          details: {
            category: cat.category,
            title: cat.title,
            confidence: cat.confidence_score,
            sources_count: cat.sources?.length || 0,
            content_preview: cat.content?.substring(0, 300)
          }
        });
      }

      this.emitProgress(onProgress, {
        phase: 'categorization',
        status: 'complete',
        message: `Categorized research into ${categorizedResearch.categories.length} expertise areas`
      });

      // Phase 3: Synthesize expert summary
      this.emitProgress(onProgress, {
        phase: 'synthesis',
        status: 'starting',
        message: 'Synthesizing expert knowledge summary...'
      });

      const synthesis = await this.synthesizeExpertise(
        categorizedResearch,
        topic,
        domains,
        region
      );

      expertContext.summary = synthesis.summary;
      expertContext.domain_expertise = synthesis.domainExpertise;
      expertContext.key_insights = synthesis.keyInsights;
      expertContext.compliance_requirements = synthesis.complianceRequirements;

      // Emit individual key insight events
      for (const insight of (synthesis.keyInsights || []).slice(0, 8)) {
        this.emitProgress(onProgress, {
          phase: 'synthesis',
          status: 'key_insight',
          message: insight
        });
      }

      this.emitProgress(onProgress, {
        phase: 'synthesis',
        status: 'complete',
        message: `Expert knowledge synthesis complete - ${synthesis.keyInsights?.length || 0} insights, ${synthesis.complianceRequirements?.length || 0} compliance requirements`
      });

      // Phase 4: Generate module recommendations
      this.emitProgress(onProgress, {
        phase: 'recommendations',
        status: 'starting',
        message: 'Analyzing requirements and recommending modules...'
      });

      const moduleRecommendations = await this.generateModuleRecommendations(
        synthesis,
        categorizedResearch,
        domains
      );

      expertContext.recommended_modules = moduleRecommendations;

      this.emitProgress(onProgress, {
        phase: 'recommendations',
        status: 'complete',
        message: `Recommended ${moduleRecommendations.length} modules for implementation`
      });

      this.emitProgress(onProgress, {
        phase: 'complete',
        status: 'success',
        message: 'Expert mode research complete'
      });

      return expertContext;

    } catch (error) {
      this.emitProgress(onProgress, {
        phase: 'error',
        status: 'failed',
        message: `Expert research failed: ${error.message}`
      });
      throw error;
    }
  }

  /**
   * Build comprehensive deep research query
   */
  buildDeepResearchQuery(topic, domains, region, focusAreas, additionalContext) {
    let query = `As a domain expert, conduct comprehensive research to become an authority on:\n\n`;
    query += `**Topic:** ${topic}\n`;
    query += `**Geographic Region:** ${region}\n`;

    if (domains.length > 0) {
      query += `**Service Domains:** ${domains.join(', ')}\n`;
    }

    query += `\n**Research Mandate:**\n`;
    query += `I need to understand this topic deeply enough to design and build a complete software application for managing ${topic} services. Research the following areas thoroughly:\n\n`;

    query += `1. **HISTORICAL CONTEXT**\n`;
    query += `   - Origin and evolution of ${topic}\n`;
    query += `   - Key milestones and turning points\n`;
    query += `   - How practices have changed over time\n`;
    query += `   - Historical challenges and how they were addressed\n\n`;

    query += `2. **LEGISLATIVE & REGULATORY FRAMEWORK**\n`;
    query += `   - Current laws and regulations in ${region}\n`;
    query += `   - Licensing and accreditation requirements\n`;
    query += `   - Compliance mandates and reporting requirements\n`;
    query += `   - Privacy and data protection requirements\n`;
    query += `   - Upcoming regulatory changes\n\n`;

    query += `3. **BEST PRACTICES & STANDARDS**\n`;
    query += `   - Industry standards and frameworks\n`;
    query += `   - Quality assurance requirements\n`;
    query += `   - Professional guidelines and ethics\n`;
    query += `   - Outcome measurement standards\n`;
    query += `   - Documentation requirements\n\n`;

    query += `4. **REAL-WORLD CASE STUDIES**\n`;
    query += `   - Success stories from ${region} and similar regions\n`;
    query += `   - Innovative approaches being used\n`;
    query += `   - Lessons learned from failures\n`;
    query += `   - Benchmark organizations\n\n`;

    query += `5. **LOCAL LANDSCAPE**\n`;
    query += `   - Key organizations and stakeholders in ${region}\n`;
    query += `   - Government agencies involved\n`;
    query += `   - Funding bodies and their requirements\n`;
    query += `   - Professional associations\n`;
    query += `   - Technology vendors and solutions\n\n`;

    query += `6. **TECHNICAL & OPERATIONAL REQUIREMENTS**\n`;
    query += `   - Data collection and management needs\n`;
    query += `   - Workflow patterns and processes\n`;
    query += `   - Integration requirements\n`;
    query += `   - Reporting and analytics needs\n`;
    query += `   - User roles and access patterns\n\n`;

    query += `7. **STAKEHOLDER ANALYSIS**\n`;
    query += `   - Primary users and their needs\n`;
    query += `   - Secondary stakeholders\n`;
    query += `   - Client/service recipient needs\n`;
    query += `   - Regulatory oversight bodies\n\n`;

    query += `8. **RISKS & CHALLENGES**\n`;
    query += `   - Common implementation challenges\n`;
    query += `   - Compliance risks\n`;
    query += `   - Technology risks\n`;
    query += `   - Change management challenges\n\n`;

    query += `9. **CULTURAL CONTEXT**\n`;
    query += `   - Cultural norms and expectations in ${region} that affect service delivery\n`;
    query += `   - Language considerations (official languages, common languages, translation needs)\n`;
    query += `   - Cultural sensitivities and taboos to be aware of\n`;
    query += `   - Community and family dynamics that impact service design\n`;
    query += `   - Religious or spiritual considerations\n`;
    query += `   - Trust factors - how do people in this region prefer to engage with services\n`;
    query += `   - Communication preferences (formal vs informal, direct vs indirect)\n`;
    query += `   - Accessibility considerations for marginalized or underserved groups\n\n`;

    if (focusAreas.length > 0) {
      query += `**Priority Focus Areas:**\n`;
      focusAreas.forEach((area, i) => {
        query += `${i + 1}. ${area}\n`;
      });
      query += '\n';
    }

    if (additionalContext) {
      query += `**Additional Context:**\n${additionalContext}\n\n`;
    }

    query += `**Output Requirements:**\n`;
    query += `- Provide specific, actionable information\n`;
    query += `- Include citations and sources where possible\n`;
    query += `- Highlight compliance requirements clearly\n`;
    query += `- Note any region-specific considerations for ${region}\n`;
    query += `- Identify data fields and forms that would be needed\n`;
    query += `- Suggest module types for a software implementation\n`;

    return query;
  }

  /**
   * Conduct fast research using regular Gemini (for quick/standard modes)
   * Much faster than Deep Research but still produces quality output
   */
  async conductFastResearch(topic, domains, region, depth, focusAreas, additionalContext, onProgress) {
    const depthConfig = {
      quick: {
        description: 'brief overview',
        wordCount: '1500-2500 words',
        sections: 'key points only'
      },
      standard: {
        description: 'balanced analysis',
        wordCount: '3000-5000 words',
        sections: 'moderate detail'
      }
    };

    const config = depthConfig[depth] || depthConfig.standard;

    this.emitProgress(onProgress, {
      phase: 'research',
      status: 'in_progress',
      message: `Researching: ${topic} in ${region}...`
    });

    const prompt = `
You are an expert researcher conducting a ${config.description} on "${topic}" in ${region}.

**Research Scope:** ${depth} (${config.wordCount}, ${config.sections})
${domains.length > 0 ? `**Focus Domains:** ${domains.join(', ')}` : ''}
${focusAreas.length > 0 ? `**Priority Areas:** ${focusAreas.join(', ')}` : ''}
${additionalContext ? `**Additional Context:** ${additionalContext}` : ''}

**Research Requirements:**
Provide a comprehensive analysis covering:

1. **HISTORICAL CONTEXT** - Origin, evolution, key milestones
2. **LEGISLATIVE & REGULATORY FRAMEWORK** - Laws, regulations, compliance requirements in ${region}
3. **BEST PRACTICES & STANDARDS** - Industry standards, quality frameworks, professional guidelines
4. **CASE STUDIES** - Real-world examples, success stories, lessons learned
5. **LOCAL LANDSCAPE** - Key organizations, stakeholders, service providers in ${region}
6. **TECHNICAL REQUIREMENTS** - Data needs, workflows, systems, integrations
7. **STAKEHOLDER ANALYSIS** - Users, clients, regulators, their needs
8. **RISKS & CHALLENGES** - Implementation challenges, compliance risks, common pitfalls
9. **CULTURAL CONTEXT** - Cultural norms, language needs, sensitivities, community dynamics in ${region}

**Output Format:**
- Use clear section headings
- Provide specific, actionable information
- Include compliance requirements with specifics
- Note data fields and forms needed for software implementation
- Suggest module types for a software application
- Be factual and cite known standards/regulations where applicable

Provide your research report:
`;

    const result = await this.synthesisModel.generateContent(prompt);
    const researchOutput = result.response.text();

    this.emitProgress(onProgress, {
      phase: 'research',
      status: 'in_progress',
      message: `Research gathered: ${researchOutput.length} characters. Enhancing with specifics...`
    });

    // For standard mode, do a follow-up for more detail on compliance and technical
    if (depth === 'standard') {
      const enhancementPrompt = `
Based on this research about "${topic}" in ${region}:

${researchOutput.substring(0, 20000)}

Provide additional detail on:
1. **Specific compliance requirements** - List exact regulations, acts, standards that apply
2. **Data fields needed** - What specific fields should a software system track?
3. **Workflow steps** - What are the typical process steps?
4. **User roles** - Who uses such systems and what permissions do they need?

Be specific and practical for software development.
`;

      const enhancementResult = await this.synthesisModel.generateContent(enhancementPrompt);
      const enhancement = enhancementResult.response.text();

      return researchOutput + '\n\n---\n\n## ADDITIONAL DETAIL\n\n' + enhancement;
    }

    return researchOutput;
  }

  /**
   * Categorize research output into structured expertise areas
   */
  async categorizeResearch(rawOutput, structuredOutput, topic, region) {
    const categorizationPrompt = `
You are categorizing research output into structured expertise areas for a software development project.

**Research Topic:** ${topic}
**Region:** ${region}

**Raw Research:**
${rawOutput.substring(0, 80000)}

**Task:**
Parse this research and categorize it into the following JSON structure. Extract the most relevant and actionable information for each category.

Return ONLY valid JSON matching this structure:
{
  "categories": [
    {
      "category": "historical",
      "title": "Historical Context",
      "content": "Comprehensive summary of historical information...",
      "sources": [{"title": "Source name", "url": "if available"}],
      "confidence_score": 0.8
    },
    {
      "category": "legislative",
      "title": "Legislative & Regulatory Framework",
      "content": "All compliance requirements, laws, regulations...",
      "sources": [],
      "confidence_score": 0.9
    },
    {
      "category": "best_practices",
      "title": "Best Practices & Standards",
      "content": "Industry standards, guidelines, quality requirements...",
      "sources": [],
      "confidence_score": 0.85
    },
    {
      "category": "case_studies",
      "title": "Real-World Case Studies",
      "content": "Success stories, examples, lessons learned...",
      "sources": [],
      "confidence_score": 0.7
    },
    {
      "category": "local_landscape",
      "title": "Local Landscape Analysis",
      "content": "Key players, organizations, stakeholders in the region...",
      "sources": [],
      "confidence_score": 0.75
    },
    {
      "category": "technical",
      "title": "Technical Requirements",
      "content": "Data needs, workflows, integrations, reporting...",
      "sources": [],
      "confidence_score": 0.8
    },
    {
      "category": "stakeholder",
      "title": "Stakeholder Analysis",
      "content": "Users, clients, regulators, their needs...",
      "sources": [],
      "confidence_score": 0.8
    },
    {
      "category": "risks",
      "title": "Risks & Challenges",
      "content": "Implementation risks, compliance risks, challenges...",
      "sources": [],
      "confidence_score": 0.75
    },
    {
      "category": "cultural",
      "title": "Cultural Context",
      "content": "Cultural norms, language considerations, community dynamics, sensitivities...",
      "sources": [],
      "confidence_score": 0.7
    }
  ],
  "sourceCount": 15
}

Confidence scores should reflect how well the research covered that area (0.0-1.0).
Content should be comprehensive but focused on actionable information.
`;

    const result = await this.synthesisModel.generateContent(categorizationPrompt);
    const responseText = result.response.text();

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse categorization:', e);
    }

    // Fallback: Return basic structure with raw content
    return {
      categories: [
        {
          category: 'technical',
          title: 'Research Summary',
          content: rawOutput.substring(0, 30000),
          sources: structuredOutput.sources || [],
          confidence_score: 0.6
        }
      ],
      sourceCount: structuredOutput.sources?.length || 0
    };
  }

  /**
   * Synthesize expertise into actionable summary
   */
  async synthesizeExpertise(categorizedResearch, topic, domains, region) {
    const synthesisPrompt = `
You are an expert consultant synthesizing research into actionable expertise for building a ${topic} management application in ${region}.

**Categorized Research:**
${JSON.stringify(categorizedResearch, null, 2).substring(0, 60000)}

**Domains to cover:** ${domains.join(', ') || 'General'}

**Task:**
Create a synthesized expertise document that will guide the development of a comprehensive software solution.

Return ONLY valid JSON:
{
  "summary": "2-3 paragraph executive summary of the domain expertise...",
  "domainExpertise": "Comprehensive narrative (500-1000 words) explaining the domain, its complexities, and what a software solution must address...",
  "keyInsights": [
    "Critical insight 1 that must inform the software design",
    "Critical insight 2...",
    "Up to 10 key insights"
  ],
  "complianceRequirements": [
    "Specific compliance requirement 1 (e.g., 'Must track consent per Privacy Act 1988')",
    "Specific compliance requirement 2...",
    "All mandatory compliance requirements"
  ]
}

Focus on information that directly impacts software design decisions.
`;

    const result = await this.synthesisModel.generateContent(synthesisPrompt);
    const responseText = result.response.text();

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse synthesis:', e);
    }

    return {
      summary: `Expert analysis of ${topic} in ${region}`,
      domainExpertise: categorizedResearch.categories[0]?.content || '',
      keyInsights: ['Research completed - manual review recommended'],
      complianceRequirements: []
    };
  }

  /**
   * Generate module recommendations based on expertise
   */
  async generateModuleRecommendations(synthesis, categorizedResearch, requestedDomains) {
    const recommendationPrompt = `
Based on the expert analysis, recommend the software modules needed for a complete solution.

**Domain Expertise:**
${synthesis.domainExpertise.substring(0, 10000)}

**Key Insights:**
${synthesis.keyInsights.join('\n')}

**Compliance Requirements:**
${synthesis.complianceRequirements.join('\n')}

**Requested Domains:** ${requestedDomains.join(', ') || 'To be determined'}

**Task:**
Recommend modules for the application. Consider both the requested domains and any additional modules needed for compliance and completeness.

Return ONLY a JSON array:
[
  {
    "module_type": "client-entity",
    "title": "Client Management",
    "description": "Central client/participant profiles with relationship tracking",
    "priority": 1,
    "rationale": "Core module needed to track service recipients",
    "key_features": ["Profile management", "Relationship mapping", "Document storage"],
    "compliance_link": "Required for Privacy Act compliance"
  },
  {
    "module_type": "data-collection",
    "title": "Assessment Forms",
    "description": "Intake and assessment data collection forms",
    "priority": 2,
    "rationale": "...",
    "key_features": [],
    "compliance_link": ""
  }
]

Module types: user-management, client-entity, data-collection, data-views, communications, notes, calendar, tasks, workflow, reporting, custom

Order by priority (1 = highest).
`;

    const result = await this.synthesisModel.generateContent(recommendationPrompt);
    const responseText = result.response.text();

    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse recommendations:', e);
    }

    // Fallback: Return basic modules
    return [
      {
        module_type: 'client-entity',
        title: 'Client Management',
        description: 'Core client/entity management',
        priority: 1,
        rationale: 'Essential for any service management application',
        key_features: ['Profile management', 'Contact details', 'Document storage'],
        compliance_link: ''
      },
      {
        module_type: 'data-collection',
        title: 'Data Collection Forms',
        description: 'Service delivery data collection',
        priority: 2,
        rationale: 'Required for tracking service delivery',
        key_features: ['Dynamic forms', 'Validation', 'Offline support'],
        compliance_link: ''
      }
    ];
  }

  /**
   * Emit progress event
   */
  emitProgress(callback, event) {
    if (callback && typeof callback === 'function') {
      callback({
        ...event,
        timestamp: new Date().toISOString()
      });
    }
  }
}

/**
 * Create configured expert mode agent
 */
export function createExpertModeAgent() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  return new ExpertModeAgent(apiKey);
}

export default ExpertModeAgent;
