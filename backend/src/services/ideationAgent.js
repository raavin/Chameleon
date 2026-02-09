/**
 * Ideation Agent - Chameleon Protocol
 *
 * Handles the ideation/consultation phase through:
 * - Self-interview: AI interviews itself using expert context
 * - Human interview: AI generates questions for human to answer
 * - Hybrid: Combination of both approaches
 *
 * Produces an Ideation Document that defines requirements
 * for the module generation phase.
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Interview question categories
 */
export const INTERVIEW_CATEGORIES = {
  REQUIREMENTS: 'requirements',
  CONSTRAINTS: 'constraints',
  PREFERENCES: 'preferences',
  PRIORITIES: 'priorities',
  EDGE_CASES: 'edge_cases',
  INTEGRATION: 'integration',
  USERS: 'users',
  WORKFLOWS: 'workflows'
};

/**
 * Ideation Agent class
 */
export class IdeationAgent {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.ideationModel = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 32000,
        temperature: 0.4
      }
    });
    this.interviewModel = this.genAI.getGenerativeModel({
      model: 'gemini-2.0-flash',
      generationConfig: {
        maxOutputTokens: 8000,
        temperature: 0.6
      }
    });
  }

  /**
   * Conduct full self-interview ideation
   * AI becomes expert and interviews itself to develop comprehensive requirements
   *
   * @param {object} expertContext - The expert context document from Expert Mode
   * @param {object} request - Original request details
   * @param {function} onProgress - Progress callback
   * @returns {Promise<object>} - Ideation document
   */
  async conductSelfInterview(expertContext, request, onProgress = null) {
    const { topic, domains, region, additionalContext, locale } = request;

    this.emitProgress(onProgress, {
      phase: 'self_interview',
      status: 'starting',
      message: 'Beginning self-interview ideation process...'
    });

    const ideationDocument = {
      summary: '',
      interview_mode: 'self_interview',
      questions_answered: [],
      requirements: {
        functional: [],
        non_functional: [],
        constraints: [],
        assumptions: []
      },
      proposed_modules: [],
      data_model_outline: { entities: [] },
      workflow_outline: [],
      risk_assessment: [],
      generated_at: new Date()
    };

    try {
      // Phase 1: Generate interview questions
      this.emitProgress(onProgress, {
        phase: 'generating_questions',
        status: 'in_progress',
        message: 'Generating comprehensive interview questions...'
      });

      const questions = await this.generateInterviewQuestions(expertContext, topic, domains, region, locale);

      // Emit individual question preview events
      const categories = [...new Set(questions.map(q => q.category))];
      for (const cat of categories) {
        const catQuestions = questions.filter(q => q.category === cat);
        for (const q of catQuestions.slice(0, 3)) {
          this.emitProgress(onProgress, {
            phase: 'generating_questions',
            status: 'question_preview',
            message: q.question,
            details: { category: cat, question_id: q.question_id }
          });
        }
      }

      this.emitProgress(onProgress, {
        phase: 'generating_questions',
        status: 'complete',
        message: `Generated ${questions.length} interview questions across ${categories.length} categories`,
        details: {
          total_questions: questions.length,
          categories,
          sample_questions: questions.slice(0, 5).map(q => q.question)
        }
      });

      // Phase 2: Self-answer all questions (with progress per batch)
      this.emitProgress(onProgress, {
        phase: 'self_answering',
        status: 'in_progress',
        message: 'AI expert answering interview questions...'
      });

      const answeredQuestions = await this.selfAnswerQuestionsWithProgress(questions, expertContext, topic, region, onProgress);
      ideationDocument.questions_answered = answeredQuestions;

      // Show sample Q&A pairs
      const sampleQA = answeredQuestions.slice(0, 3).map(q => ({
        question: q.question?.substring(0, 100),
        answer: q.response?.substring(0, 150) + '...'
      }));
      this.emitProgress(onProgress, {
        phase: 'self_answering',
        status: 'complete',
        message: `Answered ${answeredQuestions.length} questions with expert insights`,
        details: {
          total_answered: answeredQuestions.length,
          insights_extracted: answeredQuestions.reduce((sum, q) => sum + (q.insights_extracted?.length || 0), 0),
          sample_qa: sampleQA
        }
      });

      // Phase 3: Synthesize requirements from answers
      this.emitProgress(onProgress, {
        phase: 'synthesizing_requirements',
        status: 'in_progress',
        message: 'Synthesizing requirements from interview responses...'
      });

      const requirements = await this.synthesizeRequirements(answeredQuestions, expertContext);
      ideationDocument.requirements = requirements;

      this.emitProgress(onProgress, {
        phase: 'synthesizing_requirements',
        status: 'complete',
        message: `Identified ${requirements.functional.length} functional and ${requirements.non_functional.length} non-functional requirements`,
        details: {
          functional: requirements.functional?.slice(0, 5),
          non_functional: requirements.non_functional?.slice(0, 3),
          constraints: requirements.constraints?.slice(0, 3),
          total: (requirements.functional?.length || 0) + (requirements.non_functional?.length || 0) + (requirements.constraints?.length || 0)
        }
      });

      // Phase 4: Design module architecture
      this.emitProgress(onProgress, {
        phase: 'designing_modules',
        status: 'in_progress',
        message: 'Designing module architecture...'
      });

      const moduleDesign = await this.designModules(requirements, expertContext, domains);
      ideationDocument.proposed_modules = moduleDesign.modules;
      ideationDocument.data_model_outline = moduleDesign.dataModel;
      ideationDocument.workflow_outline = moduleDesign.workflows;

      this.emitProgress(onProgress, {
        phase: 'designing_modules',
        status: 'complete',
        message: `Designed ${moduleDesign.modules.length} modules with ${moduleDesign.dataModel.entities.length} data entities`,
        details: {
          modules: moduleDesign.modules?.map(m => ({
            title: m.title,
            type: m.module_type,
            features: m.key_features?.length || 0
          })),
          entities: moduleDesign.dataModel?.entities?.map(e => e.name),
          workflows: moduleDesign.workflows?.map(w => w.name)
        }
      });

      // Phase 5: Risk assessment
      this.emitProgress(onProgress, {
        phase: 'risk_assessment',
        status: 'in_progress',
        message: 'Assessing implementation risks...'
      });

      const risks = await this.assessRisks(moduleDesign, requirements, expertContext);
      ideationDocument.risk_assessment = risks;

      this.emitProgress(onProgress, {
        phase: 'risk_assessment',
        status: 'complete',
        message: `Identified ${risks.length} risks with mitigation strategies`
      });

      // Phase 6: Generate summary
      ideationDocument.summary = await this.generateSummary(ideationDocument, topic, region);

      this.emitProgress(onProgress, {
        phase: 'complete',
        status: 'success',
        message: 'Self-interview ideation complete'
      });

      return ideationDocument;

    } catch (error) {
      this.emitProgress(onProgress, {
        phase: 'error',
        status: 'failed',
        message: `Ideation failed: ${error.message}`
      });
      throw error;
    }
  }

  /**
   * Generate questions for human interview
   * Returns questions that can be presented to a human for answers
   */
  async generateHumanInterviewQuestions(expertContext, request) {
    const { topic, domains, region } = request;

    const prompt = `
You are preparing interview questions for a human stakeholder to help define requirements for a ${topic} software application in ${region}.

**Expert Context Summary:**
${expertContext.summary}

**Domain Expertise:**
${expertContext.domain_expertise?.substring(0, 5000) || ''}

**Key Insights:**
${expertContext.key_insights?.join('\n') || ''}

**Recommended Modules:**
${JSON.stringify(expertContext.recommended_modules?.slice(0, 5), null, 2) || '[]'}

**Task:**
Generate interview questions that will help clarify requirements. Questions should be:
- Clear and answerable by a non-technical stakeholder
- Focused on business needs, not technical implementation
- Grouped by category
- Prioritized (most important first)

Return ONLY a JSON array:
[
  {
    "question_id": "req_001",
    "category": "requirements",
    "question": "What are the primary services your organization provides to clients?",
    "context": "This helps us understand the core functionality needed",
    "priority": 1,
    "options": null
  },
  {
    "question_id": "users_001",
    "category": "users",
    "question": "Who are the main users of this system?",
    "context": "Understanding user roles helps design appropriate access levels",
    "priority": 1,
    "options": ["Staff only", "Staff and clients", "Staff, clients, and external partners", "Other"]
  },
  {
    "question_id": "pref_001",
    "category": "preferences",
    "question": "How important is mobile access for your staff?",
    "context": "...",
    "priority": 2,
    "options": ["Essential - primary use case", "Important - regular use", "Nice to have", "Not needed"]
  }
]

Categories: requirements, constraints, preferences, priorities, edge_cases, integration, users, workflows
Generate 15-25 essential questions.
`;

    const result = await this.interviewModel.generateContent(prompt);
    const responseText = result.response.text();

    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse interview questions:', e);
    }

    return this.getDefaultQuestions(topic);
  }

  /**
   * Process human interview responses
   * Takes answered questions and generates ideation document
   */
  async processHumanResponses(answeredQuestions, expertContext, request, onProgress = null) {
    this.emitProgress(onProgress, {
      phase: 'processing_responses',
      status: 'starting',
      message: 'Processing human interview responses...'
    });

    // Mark questions as human-answered
    const processedQuestions = answeredQuestions.map(q => ({
      ...q,
      answered_by: 'human',
      answered_at: new Date()
    }));

    // Extract insights from responses
    const insights = await this.extractInsightsFromResponses(processedQuestions, expertContext);

    // Build ideation document similar to self-interview but using human responses
    const ideationDocument = {
      summary: '',
      interview_mode: 'human_interview',
      questions_answered: processedQuestions,
      requirements: await this.synthesizeRequirements(processedQuestions, expertContext),
      proposed_modules: [],
      data_model_outline: { entities: [] },
      workflow_outline: [],
      risk_assessment: [],
      generated_at: new Date()
    };

    const moduleDesign = await this.designModules(
      ideationDocument.requirements,
      expertContext,
      request.domains || []
    );

    ideationDocument.proposed_modules = moduleDesign.modules;
    ideationDocument.data_model_outline = moduleDesign.dataModel;
    ideationDocument.workflow_outline = moduleDesign.workflows;
    ideationDocument.risk_assessment = await this.assessRisks(
      moduleDesign,
      ideationDocument.requirements,
      expertContext
    );
    ideationDocument.summary = await this.generateSummary(ideationDocument, request.topic, request.region);

    this.emitProgress(onProgress, {
      phase: 'complete',
      status: 'success',
      message: 'Human interview processing complete'
    });

    return ideationDocument;
  }

  /**
   * Generate comprehensive interview questions for self-interview
   */
  async generateInterviewQuestions(expertContext, topic, domains, region, locale) {
    const prompt = `
You are conducting a thorough self-interview to define requirements for a ${topic} management application in ${region}.
${locale && locale !== 'en-US' ? `\n**Locale:** ${locale}\nIf the locale is not English, consider local language for field labels and cultural adaptations relevant to this locale.\n` : ''}

**Expert Context:**
${JSON.stringify({
  summary: expertContext.summary,
  key_insights: expertContext.key_insights,
  compliance_requirements: expertContext.compliance_requirements,
  recommended_modules: expertContext.recommended_modules
}, null, 2).substring(0, 20000)}

**Domains:** ${domains?.join(', ') || 'General'}

**Task:**
Generate comprehensive interview questions that will help define all aspects of the application. Cover:
1. Core functional requirements
2. User roles and permissions
3. Data management needs
4. Workflow requirements
5. Compliance and regulatory needs
6. Integration requirements
7. Reporting and analytics needs
8. Edge cases and exceptions
9. Constraints and limitations
10. Priority and phasing

Return ONLY a JSON array of questions:
[
  {
    "question_id": "req_001",
    "category": "requirements",
    "question": "What are the core entities that need to be tracked in this system?",
    "sub_questions": ["What attributes define each entity?", "How do entities relate to each other?"]
  }
]

Categories: requirements, constraints, preferences, priorities, edge_cases, integration, users, workflows
Generate 30-50 thorough questions.
`;

    const result = await this.interviewModel.generateContent(prompt);
    const responseText = result.response.text();

    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse questions:', e);
    }

    return this.getDefaultQuestions(topic);
  }

  /**
   * Self-answer questions with progress updates
   */
  async selfAnswerQuestionsWithProgress(questions, expertContext, topic, region, onProgress) {
    const batchSize = 10;
    const answeredQuestions = [];
    const totalBatches = Math.ceil(questions.length / batchSize);

    for (let i = 0; i < questions.length; i += batchSize) {
      const batchNum = Math.floor(i / batchSize) + 1;
      const batch = questions.slice(i, i + batchSize);

      // Show which questions are being answered
      this.emitProgress(onProgress, {
        phase: 'self_answering',
        status: 'in_progress',
        message: `Answering batch ${batchNum}/${totalBatches}: "${batch[0]?.question?.substring(0, 60)}..."`,
        details: {
          batch: batchNum,
          total_batches: totalBatches,
          questions_in_batch: batch.map(q => q.question?.substring(0, 80))
        }
      });

      const answers = await this.selfAnswerBatch(batch, expertContext, topic, region);
      answeredQuestions.push(...answers);

      // Emit individual Q&A detail events for each answer in this batch
      for (const a of answers) {
        this.emitProgress(onProgress, {
          phase: 'self_answering',
          status: 'qa_detail',
          message: a.question?.substring(0, 120),
          details: {
            question: a.question,
            answer: a.response?.substring(0, 300),
            category: a.category,
            insights: a.insights_extracted?.slice(0, 3) || []
          }
        });
      }

      // Batch summary
      if (answers.length > 0) {
        this.emitProgress(onProgress, {
          phase: 'self_answering',
          status: 'in_progress',
          message: `Batch ${batchNum}/${totalBatches} complete (${answeredQuestions.length} answered so far)`,
          details: {
            batch_complete: batchNum,
            answers_so_far: answeredQuestions.length,
            sample_insight: answers[0]?.insights_extracted?.[0]
          }
        });
      }
    }

    return answeredQuestions;
  }

  /**
   * Answer a single batch of questions
   */
  async selfAnswerBatch(batch, expertContext, topic, region) {
    const prompt = `
You are an expert in ${topic} in ${region}, answering interview questions to define software requirements.

**Your Expert Knowledge:**
${expertContext.domain_expertise?.substring(0, 15000) || expertContext.summary}

**Key Insights:**
${expertContext.key_insights?.join('\n') || ''}

**Compliance Requirements:**
${expertContext.compliance_requirements?.join('\n') || ''}

**Questions to Answer:**
${JSON.stringify(batch, null, 2)}

**Task:**
Answer each question thoroughly based on your expert knowledge. Provide specific, actionable answers.

Return ONLY a JSON array with your answers:
[
  {
    "question_id": "req_001",
    "category": "requirements",
    "question": "Original question...",
    "response": "Your detailed, expert answer...",
    "insights_extracted": ["Key insight 1", "Key insight 2"],
    "follow_up_questions": ["Any follow-up questions that arose"]
  }
]
`;

    const result = await this.ideationModel.generateContent(prompt);
    const responseText = result.response.text();

    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const answers = JSON.parse(jsonMatch[0]);
        answers.forEach(a => {
          a.answered_by = 'ai_self';
          a.answered_at = new Date();
        });
        return answers;
      }
    } catch (e) {
      console.error('Failed to parse answers batch:', e);
    }
    return [];
  }

  /**
   * Self-answer questions using expert context (legacy - kept for compatibility)
   */
  async selfAnswerQuestions(questions, expertContext, topic, region) {
    const batchSize = 10;
    const answeredQuestions = [];

    for (let i = 0; i < questions.length; i += batchSize) {
      const batch = questions.slice(i, i + batchSize);

      const prompt = `
You are an expert in ${topic} in ${region}, answering interview questions to define software requirements.

**Your Expert Knowledge:**
${expertContext.domain_expertise?.substring(0, 15000) || expertContext.summary}

**Key Insights:**
${expertContext.key_insights?.join('\n') || ''}

**Compliance Requirements:**
${expertContext.compliance_requirements?.join('\n') || ''}

**Questions to Answer:**
${JSON.stringify(batch, null, 2)}

**Task:**
Answer each question thoroughly based on your expert knowledge. Provide specific, actionable answers.

Return ONLY a JSON array with your answers:
[
  {
    "question_id": "req_001",
    "category": "requirements",
    "question": "Original question...",
    "response": "Your detailed, expert answer...",
    "insights_extracted": ["Key insight 1", "Key insight 2"],
    "follow_up_questions": ["Any follow-up questions that arose"]
  }
]
`;

      const result = await this.ideationModel.generateContent(prompt);
      const responseText = result.response.text();

      try {
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          const answers = JSON.parse(jsonMatch[0]);
          answers.forEach(a => {
            a.answered_by = 'ai_self';
            a.answered_at = new Date();
          });
          answeredQuestions.push(...answers);
        }
      } catch (e) {
        console.error('Failed to parse answers batch:', e);
      }
    }

    return answeredQuestions;
  }

  /**
   * Synthesize requirements from answered questions
   */
  async synthesizeRequirements(answeredQuestions, expertContext) {
    const prompt = `
Synthesize software requirements from these interview responses.

**Interview Responses:**
${JSON.stringify(answeredQuestions, null, 2).substring(0, 40000)}

**Compliance Requirements from Expert Context:**
${expertContext.compliance_requirements?.join('\n') || 'None specified'}

**Task:**
Extract and organize all requirements into structured categories.

Return ONLY JSON:
{
  "functional": [
    "FR-001: System must track client profiles including name, contact details, and service history",
    "FR-002: System must support multiple user roles (admin, staff, viewer)",
    "..."
  ],
  "non_functional": [
    "NFR-001: System must be accessible on mobile devices",
    "NFR-002: System must support offline data entry with sync",
    "..."
  ],
  "constraints": [
    "CON-001: Must comply with Privacy Act requirements for data handling",
    "..."
  ],
  "assumptions": [
    "ASM-001: Users have basic computer literacy",
    "..."
  ]
}

Be comprehensive. Extract ALL requirements mentioned or implied.
`;

    const result = await this.ideationModel.generateContent(prompt);
    const responseText = result.response.text();

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse requirements:', e);
    }

    return {
      functional: ['FR-001: Basic client management'],
      non_functional: ['NFR-001: Web-based access'],
      constraints: [],
      assumptions: []
    };
  }

  /**
   * Design module architecture based on requirements
   */
  async designModules(requirements, expertContext, requestedDomains) {
    const prompt = `
Design a modular application architecture based on these requirements.

**Requirements:**
${JSON.stringify(requirements, null, 2).substring(0, 20000)}

**Recommended Modules from Expert Analysis:**
${JSON.stringify(expertContext.recommended_modules, null, 2)}

**Requested Domains:** ${requestedDomains?.join(', ') || 'To be determined'}

**Task:**
Design the complete module architecture including:
1. Module definitions with clear boundaries
2. Data model entities
3. Key workflows

Return ONLY JSON:
{
  "modules": [
    {
      "module_type": "client-entity",
      "title": "Client Management",
      "description": "Central client profile and relationship management",
      "priority": 1,
      "estimated_complexity": "medium",
      "dependencies": [],
      "key_features": [
        "Client profile CRUD",
        "Relationship mapping",
        "Document attachments",
        "Contact history"
      ],
      "domains": ["clients"],
      "requirements_addressed": ["FR-001", "FR-003"]
    }
  ],
  "dataModel": {
    "entities": [
      {
        "name": "Client",
        "description": "Service recipient profile",
        "key_fields": ["id", "name", "email", "phone", "status"],
        "relationships": ["has many Services", "has many Documents"]
      }
    ]
  },
  "workflows": [
    {
      "name": "Client Intake",
      "description": "New client registration process",
      "steps": ["Collect basic info", "Verify identity", "Consent collection", "Initial assessment"],
      "triggers": ["New referral", "Self-registration"]
    }
  ]
}

Module types: user-management, client-entity, data-collection, data-views, communications, notes, calendar, tasks, workflow, reporting, custom
`;

    const result = await this.ideationModel.generateContent(prompt);
    const responseText = result.response.text();

    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse module design:', e);
    }

    return {
      modules: expertContext.recommended_modules || [],
      dataModel: { entities: [] },
      workflows: []
    };
  }

  /**
   * Assess implementation risks
   */
  async assessRisks(moduleDesign, requirements, expertContext) {
    const prompt = `
Assess implementation risks for this application design.

**Modules:** ${moduleDesign.modules?.length || 0} planned
**Requirements:** ${requirements.functional?.length || 0} functional, ${requirements.constraints?.length || 0} constraints
**Compliance Requirements:** ${expertContext.compliance_requirements?.length || 0}

**Task:**
Identify implementation risks and mitigation strategies.

Return ONLY a JSON array:
[
  {
    "risk": "Data migration complexity",
    "impact": "high",
    "mitigation": "Develop comprehensive data mapping and validation tools"
  }
]

Impact levels: low, medium, high
Include 5-10 significant risks.
`;

    const result = await this.interviewModel.generateContent(prompt);
    const responseText = result.response.text();

    try {
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.error('Failed to parse risks:', e);
    }

    return [
      { risk: 'Scope creep', impact: 'medium', mitigation: 'Clear requirements documentation and change control' }
    ];
  }

  /**
   * Generate ideation summary
   */
  async generateSummary(ideationDocument, topic, region) {
    const prompt = `
Generate an executive summary for this ideation document.

**Topic:** ${topic}
**Region:** ${region}
**Modules Proposed:** ${ideationDocument.proposed_modules?.length || 0}
**Functional Requirements:** ${ideationDocument.requirements?.functional?.length || 0}
**Data Entities:** ${ideationDocument.data_model_outline?.entities?.length || 0}

**Task:**
Write a 2-3 paragraph executive summary describing:
1. What the application will do
2. Key modules and their purpose
3. Major compliance considerations
4. Implementation approach

Return ONLY the summary text (no JSON).
`;

    const result = await this.interviewModel.generateContent(prompt);
    return result.response.text().trim();
  }

  /**
   * Extract insights from human responses
   */
  async extractInsightsFromResponses(responses, expertContext) {
    // Process human responses to extract additional insights
    const insights = [];
    for (const response of responses) {
      if (response.response) {
        insights.push(...(response.insights_extracted || []));
      }
    }
    return insights;
  }

  /**
   * Get default questions if generation fails
   */
  getDefaultQuestions(topic) {
    return [
      { question_id: 'req_001', category: 'requirements', question: `What are the core services provided in ${topic}?` },
      { question_id: 'req_002', category: 'requirements', question: 'What data needs to be tracked for each client/case?' },
      { question_id: 'users_001', category: 'users', question: 'Who are the primary users of this system?' },
      { question_id: 'users_002', category: 'users', question: 'What permission levels are needed?' },
      { question_id: 'workflow_001', category: 'workflows', question: 'What is the typical client journey/workflow?' },
      { question_id: 'integration_001', category: 'integration', question: 'What external systems need to integrate?' },
      { question_id: 'constraint_001', category: 'constraints', question: 'What compliance requirements must be met?' },
      { question_id: 'priority_001', category: 'priorities', question: 'What functionality is most critical for day one?' }
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
 * Create configured ideation agent
 */
export function createIdeationAgent() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY not configured');
  }
  return new IdeationAgent(apiKey);
}

export default IdeationAgent;
