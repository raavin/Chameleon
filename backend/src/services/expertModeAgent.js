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
 * Research sections ordered by importance (legislative/technical first).
 * Each section becomes its own focused Deep Research API call.
 */
const RESEARCH_SECTIONS = [
  { id: 'legislative', title: 'Legislative & Regulatory Framework',
    focus: 'Current laws, regulations, licensing, accreditation, compliance mandates, privacy/data protection, upcoming changes' },
  { id: 'technical', title: 'Technical & Operational Requirements',
    focus: 'Data collection needs, workflow patterns, integration requirements, reporting/analytics, user roles and access' },
  { id: 'best_practices', title: 'Best Practices & Standards',
    focus: 'Industry standards, frameworks, quality assurance, professional guidelines, outcome measurement, documentation requirements' },
  { id: 'stakeholder', title: 'Stakeholder Analysis',
    focus: 'Primary users and needs, secondary stakeholders, client/service recipient needs, regulatory oversight bodies' },
  { id: 'historical', title: 'Historical Context',
    focus: 'Origin and evolution, key milestones, how practices changed over time, historical challenges' },
  { id: 'case_studies', title: 'Real-World Case Studies',
    focus: 'Success stories from the region and similar regions, innovative approaches, lessons from failures, benchmark organizations' },
  { id: 'local_landscape', title: 'Local Landscape Analysis',
    focus: 'Key organizations and stakeholders, government agencies, funding bodies and requirements, professional associations' },
  { id: 'risks', title: 'Risks & Challenges',
    focus: 'Common implementation challenges, compliance risks, technology risks, change management challenges' },
  { id: 'cultural', title: 'Cultural Context',
    focus: 'Cultural norms affecting service delivery, language considerations, sensitivities, community/family dynamics, trust factors, accessibility for marginalized groups' },
];

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
      additionalContext = '',
      classification = null
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
        // Use batched Deep Research API — one focused call per research section
        this.emitProgress(onProgress, {
          phase: 'deep_research',
          status: 'starting',
          message: `Initiating batched Deep Research: ${RESEARCH_SECTIONS.length} focused sections...`
        });

        const batchResult = await this.conductBatchedDeepResearch(
          { topic, domains, region, classification },
          onProgress
        );

        rawResearchOutput = batchResult.combinedOutput;
        expertContext.deep_research_sections = [...batchResult.completedSections, ...batchResult.failedSections];
        expertContext.deep_research_sources = batchResult.sources;

        this.emitProgress(onProgress, {
          phase: 'deep_research',
          status: 'complete',
          message: `Deep research complete. ${batchResult.completedSections.length}/${RESEARCH_SECTIONS.length} sections succeeded.`
        });
      } else {
        // Use regular Gemini for quick/standard (faster, still good quality)
        this.emitProgress(onProgress, {
          phase: 'research',
          status: 'starting',
          message: `Conducting ${depth} research using Gemini...`
        });

        rawResearchOutput = await this.conductFastResearch(topic, domains, region, depth, focusAreas, additionalContext, onProgress, classification);

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
        domains,
        classification
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
  buildDeepResearchQuery(topic, domains, region, focusAreas, additionalContext, classification = null) {
    let query = `As a domain expert, conduct comprehensive research to become an authority on:\n\n`;
    query += `**Topic:** ${topic}\n`;
    query += `**Geographic Region:** ${region}\n`;

    if (domains.length > 0) {
      query += `**Service Domains:** ${domains.join(', ')}\n`;
    }

    // Add classification context if available
    if (classification) {
      query += `\n**CLASSIFIED DOMAIN:** ${classification.primary_domain} > ${classification.sub_domain}\n`;
      if (classification.secondary_domains?.length > 0) {
        query += `**Secondary Domains:** ${classification.secondary_domains.join(', ')}\n`;
      }
      if (classification.ontology?.capabilities?.length > 0) {
        query += `\n**ONTOLOGY CAPABILITIES TO INVESTIGATE:**\n`;
        classification.ontology.capabilities.forEach((cap, i) => {
          query += `${i + 1}. ${cap.name}: ${cap.sub_capabilities?.join(', ') || ''}\n`;
        });
      }
      if (classification.research_tracks_needed?.length > 0) {
        query += `\n**SPECIFIC RESEARCH TRACKS:**\n`;
        classification.research_tracks_needed.forEach((track, i) => {
          query += `${i + 1}. ${track}\n`;
        });
      }
      if (classification.regional_factors) {
        if (classification.regional_factors.key_legislation?.length > 0) {
          query += `\n**KEY LEGISLATION TO RESEARCH:** ${classification.regional_factors.key_legislation.join(', ')}\n`;
        }
        if (classification.regional_factors.regulatory_bodies?.length > 0) {
          query += `**REGULATORY BODIES:** ${classification.regional_factors.regulatory_bodies.join(', ')}\n`;
        }
      }
      query += '\n';
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
   * Build a focused research query for a single section
   */
  buildFocusedResearchQuery(section, topic, domains, region, classification) {
    let query = `Conduct focused research on the ${section.title} for "${topic}" in ${region}.\n\n`;

    if (domains.length > 0) {
      query += `**Service Domains:** ${domains.join(', ')}\n`;
    }

    // Add classification context if available
    if (classification) {
      query += `**Classified Domain:** ${classification.primary_domain} > ${classification.sub_domain}\n`;
      if (classification.ontology?.capabilities?.length > 0) {
        query += `**Ontology Capabilities:**\n`;
        classification.ontology.capabilities.forEach((cap, i) => {
          query += `${i + 1}. ${cap.name}: ${cap.sub_capabilities?.join(', ') || ''}\n`;
        });
      }
      if (classification.regional_factors?.key_legislation?.length > 0) {
        query += `**Key Legislation:** ${classification.regional_factors.key_legislation.join(', ')}\n`;
      }
      if (classification.regional_factors?.regulatory_bodies?.length > 0) {
        query += `**Regulatory Bodies:** ${classification.regional_factors.regulatory_bodies.join(', ')}\n`;
      }
    }

    query += `\n**Research focus areas:** ${section.focus}\n\n`;

    // Legislative section gets extra structured-reference requirements
    if (section.id === 'legislative') {
      query += `**CRITICAL — Structured References Required:**\n`;
      query += `For every law, regulation, or mandate you mention, provide:\n`;
      query += `- Exact act/regulation name\n`;
      query += `- Section or clause numbers\n`;
      query += `- Effective date or year enacted\n`;
      query += `- Governing body responsible for enforcement\n`;
      query += `- Penalties or consequences for non-compliance\n\n`;
    }

    query += `**IMPORTANT:** For every claim, requirement, or recommendation, provide the specific source reference `;
    query += `(act name, section number, standard ID, organization name, URL) so it can be traced for governance purposes.\n\n`;
    query += `Note any region-specific considerations for ${region}.\n`;

    return query;
  }

  /**
   * Conduct batched deep research — one focused API call per section
   */
  async conductBatchedDeepResearch(request, onProgress) {
    const { topic, domains, region, classification } = request;
    const completed = [];
    const failed = [];
    let combinedOutput = '';
    let allSources = [];

    for (let i = 0; i < RESEARCH_SECTIONS.length; i++) {
      const section = RESEARCH_SECTIONS[i];

      this.emitProgress(onProgress, {
        phase: 'deep_research',
        status: 'section_starting',
        message: `Researching ${i + 1}/${RESEARCH_SECTIONS.length}: ${section.title}...`,
        details: { section_id: section.id, section_index: i, total_sections: RESEARCH_SECTIONS.length }
      });

      try {
        const query = this.buildFocusedResearchQuery(section, topic, domains, region, classification);
        const result = await this.deepResearch.conductResearch(query, region, { depth: 'comprehensive' }, (progress) => {
          this.emitProgress(onProgress, {
            phase: 'deep_research',
            status: 'section_polling',
            message: `${section.title}: ${progress.message || progress.status}`,
            details: { section_id: section.id, section_title: section.title, section_focus: section.focus, ...progress }
          });
        });

        const output = result.rawOutput;

        if (result.timedOut && output.length > 0) {
          // Partial success — keep what we got
          combinedOutput += `\n\n## ${section.title} (Partial)\n\n${output}`;
          allSources.push(...(result.structured?.sources || []));
          completed.push({
            section_id: section.id, title: section.title, status: 'completed',
            interaction_id: result.interactionId,
            content_length: output.length, completed_at: new Date()
          });

          this.emitProgress(onProgress, {
            phase: 'deep_research',
            status: 'section_partial',
            message: `${section.title} timed out but salvaged ${output.length} chars of partial content. ${completed.length}/${RESEARCH_SECTIONS.length} done.`,
          });
        } else if (result.timedOut && output.length === 0) {
          // True timeout with no content — API is likely rate-limited or stuck.
          // Don't continue to remaining sections; they'll hit the same wall.
          failed.push({
            section_id: section.id, title: section.title, status: 'failed',
            error: 'Timed out with no content', completed_at: new Date()
          });

          this.emitProgress(onProgress, {
            phase: 'deep_research',
            status: 'section_failed',
            message: `${section.title} timed out with no content.`,
            details: { section_id: section.id }
          });

          const remaining = RESEARCH_SECTIONS.length - i - 1;
          if (remaining > 0) {
            this.emitProgress(onProgress, {
              phase: 'deep_research',
              status: 'batch_stopped',
              message: `Stopping research batch — API appears rate-limited or unresponsive. Skipping ${remaining} remaining section(s). Continuing pipeline with ${completed.length} completed section(s).`
            });
          }
          break;
        } else {
          // Normal success
          combinedOutput += `\n\n## ${section.title}\n\n${output}`;
          allSources.push(...(result.structured?.sources || []));
          completed.push({
            section_id: section.id, title: section.title, status: 'completed',
            interaction_id: result.interactionId,
            content_length: output.length, completed_at: new Date()
          });

          this.emitProgress(onProgress, {
            phase: 'deep_research',
            status: 'section_complete',
            message: `${section.title} complete (${output.length} chars). ${completed.length}/${RESEARCH_SECTIONS.length} done.`,
          });
        }
      } catch (err) {
        failed.push({
          section_id: section.id, title: section.title, status: 'failed',
          error: err.message, completed_at: new Date()
        });

        this.emitProgress(onProgress, {
          phase: 'deep_research',
          status: 'section_failed',
          message: `${section.title} failed: ${err.message}. Skipping to next section.`,
        });
      }
    }

    return { combinedOutput, completedSections: completed, failedSections: failed, sources: allSources };
  }

  /**
   * Conduct fast research using regular Gemini (for quick/standard modes)
   * Much faster than Deep Research but still produces quality output
   */
  async conductFastResearch(topic, domains, region, depth, focusAreas, additionalContext, onProgress, classification = null) {
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

    let classificationContext = '';
    if (classification) {
      classificationContext = `\n**Classified Domain:** ${classification.primary_domain} > ${classification.sub_domain}`;
      if (classification.ontology?.capabilities?.length > 0) {
        classificationContext += `\n**Ontology Capabilities to Investigate:**\n${classification.ontology.capabilities.map(c => `- ${c.name}: ${c.sub_capabilities?.join(', ') || ''}`).join('\n')}`;
      }
      if (classification.research_tracks_needed?.length > 0) {
        classificationContext += `\n**Specific Research Tracks:**\n${classification.research_tracks_needed.map((t, i) => `${i + 1}. ${t}`).join('\n')}`;
      }
    }

    const prompt = `
You are an expert researcher conducting a ${config.description} on "${topic}" in ${region}.

**Research Scope:** ${depth} (${config.wordCount}, ${config.sections})
${domains.length > 0 ? `**Focus Domains:** ${domains.join(', ')}` : ''}
${focusAreas.length > 0 ? `**Priority Areas:** ${focusAreas.join(', ')}` : ''}
${additionalContext ? `**Additional Context:** ${additionalContext}` : ''}${classificationContext}

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
  async generateModuleRecommendations(synthesis, categorizedResearch, requestedDomains, classification = null) {
    let ontologySection = '';
    if (classification?.ontology?.capabilities?.length > 0) {
      ontologySection = `\n**ONTOLOGY CAPABILITIES (use as seed for recommendations):**\n`;
      ontologySection += classification.ontology.capabilities.map(cap =>
        `- ${cap.name} (mapped to: ${cap.mapped_module_type || 'custom'}): ${cap.sub_capabilities?.join(', ') || ''}`
      ).join('\n');
      ontologySection += '\n';
    }

    const recommendationPrompt = `
Based on the expert analysis, recommend the software modules needed for a complete solution.

**Domain Expertise:**
${synthesis.domainExpertise.substring(0, 10000)}

**Key Insights:**
${synthesis.keyInsights.join('\n')}

**Compliance Requirements:**
${synthesis.complianceRequirements.join('\n')}
${ontologySection}
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
