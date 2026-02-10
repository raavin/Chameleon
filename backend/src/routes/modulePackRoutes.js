/**
 * Module Pack Routes - Chameleon Protocol
 *
 * API endpoints for the new modular generation system:
 * - Create module packs with expert research
 * - Run ideation/self-interview
 * - Generate multiple manifest modules
 * - List and retrieve module packs and their manifests
 */

import { Router } from 'express';
import { randomUUID } from 'crypto';
import { optionalAuth } from '../middleware/authMiddleware.js';
import ModulePack from '../models/ModulePack.js';
import Manifest from '../models/Manifest.js';
import User from '../models/User.js';
import { ExpertModeAgent, createExpertModeAgent } from '../services/expertModeAgent.js';
import { IdeationAgent, createIdeationAgent } from '../services/ideationAgent.js';
import { ModuleFactoryAgent, createModuleFactoryAgent } from '../services/moduleFactoryAgent.js';
import { DomainClassificationAgent, createDomainClassificationAgent } from '../services/domainClassificationAgent.js';

const router = Router();
router.use(optionalAuth);

/**
 * POST /api/module-packs
 *
 * Create a new module pack and optionally start the full generation pipeline
 *
 * Body: {
 *   name: string,
 *   topic: string,
 *   domains: string[],
 *   region: string,
 *   currency?: string,
 *   locale?: string,
 *   additionalContext?: string,
 *   autoStart?: boolean,
 *   researchDepth?: 'quick' | 'standard' | 'comprehensive'
 * }
 */
router.post('/', async (req, res) => {
  try {
    const {
      name,
      topic,
      domains = [],
      region,
      currency = 'USD',
      locale = 'en-US',
      additionalContext = '',
      fundingBody = '',
      projectName = '',
      autoStart = false,
      researchDepth = 'comprehensive',
      interviewMode = 'self_interview',
      selectedDomain = '',
      selectedSubDomain = ''
    } = req.body;

    if (!name || !topic || !region) {
      return res.status(400).json({
        error: 'Missing required fields: name, topic, region'
      });
    }

    const modulePackId = `mp-${randomUUID().substring(0, 12)}`;

    const modulePack = new ModulePack({
      id: modulePackId,
      name,
      description: `Module pack for ${topic} in ${region}`,
      config: {
        region,
        currency,
        locale,
        service_types: domains,
        target_users: []
      },
      original_request: {
        prompt: topic,
        domains,
        additional_context: additionalContext,
        funding_body: fundingBody,
        project_name: projectName
      },
      interview_mode: interviewMode,
      status: 'draft',
      current_phase: 'init',
      created_by: req.user?.userId || 'anonymous',
      visibility: 'PRIVATE'
    });

    await modulePack.save();

    // If autoStart, begin the generation pipeline
    if (autoStart) {
      // Start the pipeline in background and stream results
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const writeEvent = (payload) => {
        res.write(`data: ${JSON.stringify(payload)}\n\n`);
      };

      const keepAlive = setInterval(() => res.write(': keepalive\n\n'), 30000);

      writeEvent({
        status: 'created',
        modulePackId,
        message: 'Module pack created, starting generation pipeline...'
      });

      // Run the full pipeline
      runFullPipeline(modulePack, {
        topic,
        domains,
        region,
        additionalContext,
        researchDepth,
        locale,
        selectedDomain,
        selectedSubDomain,
        interviewMode
      }, writeEvent).then(() => {
        writeEvent({ done: true, modulePackId });
        clearInterval(keepAlive);
        res.end();
      }).catch(err => {
        writeEvent({ error: err.message });
        clearInterval(keepAlive);
        res.end();
      });

    } else {
      res.status(201).json({
        success: true,
        modulePack: modulePack.toJSON()
      });
    }

  } catch (error) {
    console.error('Create module pack error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/module-packs/from-existing
 *
 * Create a module pack from existing manifests
 * This bundles existing manifests together under a common pack reference
 */
router.post('/from-existing', async (req, res) => {
  try {
    const { name, manifestIds, description = '' } = req.body;

    if (!name || !manifestIds || !Array.isArray(manifestIds) || manifestIds.length === 0) {
      return res.status(400).json({
        error: 'Missing required fields: name and manifestIds array'
      });
    }

    // Verify all manifests exist
    const manifests = await Manifest.find({ id: { $in: manifestIds } });
    if (manifests.length !== manifestIds.length) {
      const found = manifests.map(m => m.id);
      const missing = manifestIds.filter(id => !found.includes(id));
      return res.status(400).json({
        error: `Some manifests not found: ${missing.join(', ')}`
      });
    }

    const modulePackId = `mp-${randomUUID().substring(0, 12)}`;

    // Get region from first manifest
    const region = manifests[0]?.config?.region || 'Unknown';

    // Build modules array from existing manifests
    const modules = manifests.map((m, i) => ({
      manifest_id: m.id,
      module_type: m.module_type || 'custom',
      title: m.module_metadata?.title || m.domains?.[0]?.title || m.id,
      description: m.module_metadata?.description || '',
      order: i,
      status: 'completed',
      dependencies: m.module_metadata?.dependencies || [],
      domains_count: m.domains?.length || 0,
      fields_count: m.domains?.reduce((sum, d) => sum + (d.fields?.length || 0), 0) || 0,
      generated_at: m.compiled_at || new Date()
    }));

    // Create the module pack
    const modulePack = new ModulePack({
      id: modulePackId,
      name,
      description: description || `Pack of ${manifests.length} existing modules`,
      config: {
        region,
        currency: manifests[0]?.config?.currency || 'USD',
        locale: manifests[0]?.config?.locale || 'en-US',
        service_types: []
      },
      original_request: {
        prompt: `Created from ${manifests.length} existing manifests`,
        domains: [],
        additional_context: ''
      },
      modules,
      status: 'completed',
      current_phase: 'complete',
      progress: {
        expert_mode_complete: false,
        ideation_complete: false,
        modules_planned: modules.length,
        modules_generated: modules.length,
        modules_failed: 0
      },
      created_by: req.user?.userId || 'anonymous',
      visibility: 'PRIVATE'
    });

    await modulePack.save();

    // Update manifests with the pack reference
    await Manifest.updateMany(
      { id: { $in: manifestIds } },
      { $set: { module_pack_id: modulePackId } }
    );

    res.status(201).json({
      success: true,
      modulePack: modulePack.toJSON()
    });

  } catch (error) {
    console.error('Create pack from existing error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/module-packs/:id/expert-research
 *
 * Run expert mode research for a module pack
 */
router.post('/:id/expert-research', async (req, res) => {
  try {
    const { id } = req.params;
    const { depth = 'comprehensive', focusAreas = [] } = req.body;

    const modulePack = await ModulePack.findOne({ id });
    if (!modulePack) {
      return res.status(404).json({ error: 'Module pack not found' });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const keepAlive = setInterval(() => res.write(': keepalive\n\n'), 30000);

    const writeEvent = (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    // Update status
    modulePack.status = 'researching';
    modulePack.current_phase = 'expert_research';
    await modulePack.save();

    writeEvent({
      status: 'starting',
      phase: 'expert_research',
      message: 'Starting expert mode research...'
    });

    const expertAgent = createExpertModeAgent();

    const expertContext = await expertAgent.conductExpertResearch({
      topic: modulePack.original_request.prompt,
      domains: modulePack.original_request.domains,
      region: modulePack.config.region,
      depth,
      focusAreas,
      additionalContext: modulePack.original_request.additional_context
    }, (progress) => {
      writeEvent({ ...progress, phase: 'expert_research' });
    });

    // Save expert context to module pack
    modulePack.expert_context = expertContext;
    modulePack.progress.expert_mode_complete = true;
    modulePack.status = 'draft';
    modulePack.current_phase = 'init';
    await modulePack.save();

    writeEvent({
      status: 'complete',
      phase: 'expert_research',
      message: 'Expert research complete',
      summary: {
        categories: expertContext.research_categories?.length || 0,
        insights: expertContext.key_insights?.length || 0,
        complianceItems: expertContext.compliance_requirements?.length || 0,
        recommendedModules: expertContext.recommended_modules?.length || 0
      }
    });

    writeEvent({ done: true, modulePackId: id });
    clearInterval(keepAlive);
    res.end();

  } catch (error) {
    console.error('Expert research error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    clearInterval(keepAlive);
    res.end();
  }
});

/**
 * POST /api/module-packs/:id/classify-domain
 *
 * Run domain classification for a module pack
 */
router.post('/:id/classify-domain', async (req, res) => {
  let keepAlive;
  try {
    const { id } = req.params;

    const modulePack = await ModulePack.findOne({ id });
    if (!modulePack) {
      return res.status(404).json({ error: 'Module pack not found' });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    keepAlive = setInterval(() => res.write(': keepalive\n\n'), 30000);

    const writeEvent = (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    modulePack.status = 'classifying';
    modulePack.current_phase = 'domain_classification';
    await modulePack.save();

    writeEvent({ status: 'starting', phase: 'domain_classification', message: 'Starting domain classification...' });

    const classificationAgent = createDomainClassificationAgent();

    const classification = await classificationAgent.classifyDomain({
      topic: modulePack.original_request.prompt,
      domains: modulePack.original_request.domains,
      region: modulePack.config.region,
      projectName: modulePack.original_request.project_name,
      fundingBody: modulePack.original_request.funding_body,
      additionalContext: modulePack.original_request.additional_context
    }, (progress) => {
      writeEvent({ ...progress, phase: 'domain_classification' });
    });

    modulePack.domain_classification = classification;
    modulePack.progress.domain_classification_complete = true;
    modulePack.status = 'draft';
    modulePack.current_phase = 'init';
    await modulePack.save();

    writeEvent({
      status: 'complete',
      phase: 'domain_classification',
      message: 'Domain classification complete',
      classification
    });

    writeEvent({ done: true, modulePackId: id });
    clearInterval(keepAlive);
    res.end();

  } catch (error) {
    console.error('Domain classification error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    if (keepAlive) clearInterval(keepAlive);
    res.end();
  }
});

/**
 * POST /api/module-packs/:id/confirm-classification
 *
 * Confirm or adjust domain classification
 */
router.post('/:id/confirm-classification', async (req, res) => {
  try {
    const { id } = req.params;
    const { adjustments } = req.body;

    const modulePack = await ModulePack.findOne({ id });
    if (!modulePack) {
      return res.status(404).json({ error: 'Module pack not found' });
    }

    if (!modulePack.domain_classification) {
      return res.status(400).json({ error: 'No classification to confirm' });
    }

    // Apply adjustments if provided
    if (adjustments) {
      if (adjustments.primary_domain) {
        modulePack.domain_classification.primary_domain = adjustments.primary_domain;
      }
      if (adjustments.sub_domain) {
        modulePack.domain_classification.sub_domain = adjustments.sub_domain;
      }
      if (adjustments.secondary_domains) {
        modulePack.domain_classification.secondary_domains = adjustments.secondary_domains;
      }
      if (adjustments.capabilities) {
        // User toggled capabilities
        modulePack.domain_classification.ontology.capabilities = adjustments.capabilities;
      }
      if (adjustments.research_tracks_needed) {
        modulePack.domain_classification.research_tracks_needed = adjustments.research_tracks_needed;
      }
      modulePack.domain_classification.user_adjustments = adjustments;
    }

    modulePack.domain_classification.user_confirmed = true;
    modulePack.markModified('domain_classification');
    await modulePack.save();

    res.json({
      success: true,
      classification: modulePack.domain_classification
    });

  } catch (error) {
    console.error('Confirm classification error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/module-packs/:id/refine-ontology
 *
 * Refine ontology after expert research completes
 */
router.post('/:id/refine-ontology', async (req, res) => {
  let keepAlive;
  try {
    const { id } = req.params;

    const modulePack = await ModulePack.findOne({ id });
    if (!modulePack) {
      return res.status(404).json({ error: 'Module pack not found' });
    }

    if (!modulePack.domain_classification) {
      return res.status(400).json({ error: 'Domain classification required before ontology refinement' });
    }

    if (!modulePack.expert_context?.summary) {
      return res.status(400).json({ error: 'Expert research must be completed before ontology refinement' });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    keepAlive = setInterval(() => res.write(': keepalive\n\n'), 30000);

    const writeEvent = (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    modulePack.current_phase = 'ontology_refinement';
    await modulePack.save();

    writeEvent({ status: 'starting', phase: 'ontology_refinement', message: 'Starting ontology refinement...' });

    const classificationAgent = createDomainClassificationAgent();

    const refinedOntology = await classificationAgent.refineOntologyFromResearch(
      modulePack.domain_classification,
      modulePack.expert_context,
      (progress) => {
        writeEvent({ ...progress, phase: 'ontology_refinement' });
      }
    );

    modulePack.refined_ontology = refinedOntology;
    modulePack.progress.ontology_refinement_complete = true;
    await modulePack.save();

    writeEvent({
      status: 'complete',
      phase: 'ontology_refinement',
      message: 'Ontology refinement complete',
      refinedOntology
    });

    writeEvent({ done: true, modulePackId: id });
    clearInterval(keepAlive);
    res.end();

  } catch (error) {
    console.error('Ontology refinement error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    if (keepAlive) clearInterval(keepAlive);
    res.end();
  }
});

/**
 * POST /api/module-packs/:id/interview-chat
 *
 * Conversational interview - accepts user message, returns next agent question
 * Stores conversation in interview_conversation
 * On completion, generates ideation document
 */
router.post('/:id/interview-chat', async (req, res) => {
  let keepAlive;
  try {
    const { id } = req.params;
    const { message } = req.body;

    const modulePack = await ModulePack.findOne({ id });
    if (!modulePack) {
      return res.status(404).json({ error: 'Module pack not found' });
    }

    if (!modulePack.expert_context?.summary) {
      return res.status(400).json({ error: 'Expert research must be completed before interview' });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    keepAlive = setInterval(() => res.write(': keepalive\n\n'), 30000);

    const writeEvent = (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    // Initialize conversation if needed
    if (!modulePack.interview_conversation) {
      modulePack.interview_conversation = [];
    }

    const conversation = modulePack.interview_conversation;

    // Add user message if provided
    if (message) {
      const lastAgentMsg = [...conversation].reverse().find(m => m.role === 'agent');
      conversation.push({
        id: `user_${Date.now()}`,
        role: 'user',
        content: message,
        question_id: lastAgentMsg?.id || null,
        timestamp: new Date()
      });
    }

    // Update status
    modulePack.status = 'ideating';
    modulePack.current_phase = 'ideation';

    const ideationAgent = createIdeationAgent();

    // Get next question
    const result = await ideationAgent.conductInteractiveInterview(
      conversation,
      modulePack.expert_context,
      modulePack.domain_classification || null,
      modulePack.refined_ontology || null,
      {
        topic: modulePack.original_request.prompt,
        domains: modulePack.original_request.domains,
        region: modulePack.config.region
      }
    );

    if (result.type === 'complete') {
      // Interview complete - synthesize
      writeEvent({ status: 'interview_complete', message: 'Interview complete. Synthesizing requirements...' });

      const ideationDocument = await ideationAgent.synthesizeFromConversation(
        conversation,
        modulePack.expert_context,
        modulePack.domain_classification || null,
        modulePack.refined_ontology || null,
        {
          topic: modulePack.original_request.prompt,
          domains: modulePack.original_request.domains,
          region: modulePack.config.region
        },
        (progress) => writeEvent(progress)
      );

      modulePack.ideation_document = ideationDocument;
      modulePack.progress.ideation_complete = true;
      modulePack.progress.modules_planned = ideationDocument.proposed_modules?.length || 0;
      modulePack.interview_conversation = conversation;
      await modulePack.save();

      writeEvent({
        status: 'complete',
        type: 'synthesis_complete',
        message: 'Ideation synthesis complete',
        interview_progress: 100
      });
    } else {
      // Add agent question to conversation
      const agentMsg = {
        id: result.question_id,
        role: 'agent',
        content: result.question,
        category: result.category,
        question_id: result.question_id,
        timestamp: new Date()
      };
      conversation.push(agentMsg);

      modulePack.interview_conversation = conversation;
      await modulePack.save();

      writeEvent({
        status: 'question',
        type: 'question',
        question: result.question,
        category: result.category,
        question_id: result.question_id,
        interview_progress: result.interview_progress,
        follow_up: result.follow_up
      });
    }

    writeEvent({ done: true, modulePackId: id });
    clearInterval(keepAlive);
    res.end();

  } catch (error) {
    console.error('Interview chat error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    if (keepAlive) clearInterval(keepAlive);
    res.end();
  }
});

/**
 * POST /api/module-packs/:id/interview-skip
 *
 * Skip remaining interview questions - AI self-answers and generates ideation document
 */
router.post('/:id/interview-skip', async (req, res) => {
  let keepAlive;
  try {
    const { id } = req.params;

    const modulePack = await ModulePack.findOne({ id });
    if (!modulePack) {
      return res.status(404).json({ error: 'Module pack not found' });
    }

    if (!modulePack.expert_context?.summary) {
      return res.status(400).json({ error: 'Expert research must be completed first' });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    keepAlive = setInterval(() => res.write(': keepalive\n\n'), 30000);

    const writeEvent = (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    writeEvent({ status: 'starting', message: 'Skipping remaining questions, AI will self-answer...' });

    const ideationAgent = createIdeationAgent();
    const conversation = modulePack.interview_conversation || [];

    // Synthesize from what we have plus AI self-answering remaining
    const ideationDocument = await ideationAgent.synthesizeFromConversation(
      conversation,
      modulePack.expert_context,
      modulePack.domain_classification || null,
      modulePack.refined_ontology || null,
      {
        topic: modulePack.original_request.prompt,
        domains: modulePack.original_request.domains,
        region: modulePack.config.region
      },
      (progress) => writeEvent(progress)
    );

    modulePack.ideation_document = ideationDocument;
    modulePack.progress.ideation_complete = true;
    modulePack.progress.modules_planned = ideationDocument.proposed_modules?.length || 0;
    modulePack.status = 'draft';
    modulePack.current_phase = 'module_planning';
    await modulePack.save();

    writeEvent({
      status: 'complete',
      message: 'Interview skip and synthesis complete',
      summary: {
        questionsAnswered: ideationDocument.questions_answered?.length || 0,
        modulesProposed: ideationDocument.proposed_modules?.length || 0
      }
    });

    writeEvent({ done: true, modulePackId: id });
    clearInterval(keepAlive);
    res.end();

  } catch (error) {
    console.error('Interview skip error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    if (keepAlive) clearInterval(keepAlive);
    res.end();
  }
});

/**
 * POST /api/module-packs/:id/ideation
 *
 * Run ideation/self-interview for a module pack
 */
router.post('/:id/ideation', async (req, res) => {
  try {
    const { id } = req.params;
    const { mode = 'self_interview' } = req.body;

    const modulePack = await ModulePack.findOne({ id });
    if (!modulePack) {
      return res.status(404).json({ error: 'Module pack not found' });
    }

    if (!modulePack.expert_context?.summary) {
      return res.status(400).json({
        error: 'Expert research must be completed before ideation'
      });
    }

    // If mode is interactive, redirect to interview-chat
    if (mode === 'interactive') {
      return res.status(400).json({
        error: 'Use /interview-chat endpoint for interactive mode'
      });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const keepAlive = setInterval(() => res.write(': keepalive\n\n'), 30000);

    const writeEvent = (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    // Update status
    modulePack.status = 'ideating';
    modulePack.current_phase = 'ideation';
    await modulePack.save();

    writeEvent({
      status: 'starting',
      phase: 'ideation',
      message: 'Starting ideation process...'
    });

    const ideationAgent = createIdeationAgent();

    const ideationDocument = await ideationAgent.conductSelfInterview(
      modulePack.expert_context,
      {
        topic: modulePack.original_request.prompt,
        domains: modulePack.original_request.domains,
        region: modulePack.config.region,
        additionalContext: modulePack.original_request.additional_context,
        classification: modulePack.domain_classification || null,
        refinedOntology: modulePack.refined_ontology || null
      },
      (progress) => {
        writeEvent({ ...progress, phase: 'ideation' });
      }
    );

    // Save ideation document to module pack
    modulePack.ideation_document = ideationDocument;
    modulePack.progress.ideation_complete = true;
    modulePack.progress.modules_planned = ideationDocument.proposed_modules?.length || 0;
    modulePack.status = 'draft';
    modulePack.current_phase = 'module_planning';
    await modulePack.save();

    writeEvent({
      status: 'complete',
      phase: 'ideation',
      message: 'Ideation complete',
      summary: {
        questionsAnswered: ideationDocument.questions_answered?.length || 0,
        functionalRequirements: ideationDocument.requirements?.functional?.length || 0,
        modulesProposed: ideationDocument.proposed_modules?.length || 0,
        dataEntities: ideationDocument.data_model_outline?.entities?.length || 0,
        workflows: ideationDocument.workflow_outline?.length || 0
      }
    });

    writeEvent({ done: true, modulePackId: id });
    clearInterval(keepAlive);
    res.end();

  } catch (error) {
    console.error('Ideation error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    clearInterval(keepAlive);
    res.end();
  }
});

/**
 * GET /api/module-packs/:id/interview-questions
 *
 * Get interview questions for human interview mode
 */
router.get('/:id/interview-questions', async (req, res) => {
  try {
    const { id } = req.params;

    const modulePack = await ModulePack.findOne({ id });
    if (!modulePack) {
      return res.status(404).json({ error: 'Module pack not found' });
    }

    if (!modulePack.expert_context?.summary) {
      return res.status(400).json({
        error: 'Expert research must be completed first'
      });
    }

    const ideationAgent = createIdeationAgent();
    const questions = await ideationAgent.generateHumanInterviewQuestions(
      modulePack.expert_context,
      {
        topic: modulePack.original_request.prompt,
        domains: modulePack.original_request.domains,
        region: modulePack.config.region
      }
    );

    res.json({ questions });

  } catch (error) {
    console.error('Get interview questions error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/module-packs/:id/interview-responses
 *
 * Submit human interview responses
 */
router.post('/:id/interview-responses', async (req, res) => {
  try {
    const { id } = req.params;
    const { responses } = req.body;

    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'Responses array required' });
    }

    const modulePack = await ModulePack.findOne({ id });
    if (!modulePack) {
      return res.status(404).json({ error: 'Module pack not found' });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const keepAlive = setInterval(() => res.write(': keepalive\n\n'), 30000);

    const writeEvent = (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    const ideationAgent = createIdeationAgent();
    const ideationDocument = await ideationAgent.processHumanResponses(
      responses,
      modulePack.expert_context,
      {
        topic: modulePack.original_request.prompt,
        domains: modulePack.original_request.domains,
        region: modulePack.config.region
      },
      (progress) => writeEvent(progress)
    );

    modulePack.ideation_document = ideationDocument;
    modulePack.progress.ideation_complete = true;
    modulePack.progress.modules_planned = ideationDocument.proposed_modules?.length || 0;
    await modulePack.save();

    writeEvent({
      status: 'complete',
      ideationDocument: {
        summary: ideationDocument.summary,
        modulesProposed: ideationDocument.proposed_modules?.length || 0
      }
    });

    writeEvent({ done: true });
    clearInterval(keepAlive);
    res.end();

  } catch (error) {
    console.error('Interview responses error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    clearInterval(keepAlive);
    res.end();
  }
});

/**
 * POST /api/module-packs/:id/generate-modules
 *
 * Generate all manifest modules for the pack
 */
router.post('/:id/generate-modules', async (req, res) => {
  try {
    const { id } = req.params;

    const modulePack = await ModulePack.findOne({ id });
    if (!modulePack) {
      return res.status(404).json({ error: 'Module pack not found' });
    }

    if (!modulePack.ideation_document?.proposed_modules) {
      return res.status(400).json({
        error: 'Ideation must be completed before generating modules'
      });
    }

    // Set up SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const keepAlive = setInterval(() => res.write(': keepalive\n\n'), 30000);

    const writeEvent = (payload) => {
      res.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    // Update status
    modulePack.status = 'generating';
    modulePack.current_phase = 'module_generation';
    await modulePack.save();

    writeEvent({
      status: 'starting',
      phase: 'module_generation',
      message: `Starting generation of ${modulePack.ideation_document.proposed_modules.length} modules...`
    });

    const moduleFactory = createModuleFactoryAgent();

    let moduleOrder = null;
    const results = await moduleFactory.generateModules({
      modulePackId: modulePack.id,
      expertContext: modulePack.expert_context,
      ideationDocument: modulePack.ideation_document,
      config: modulePack.config,
      originalRequest: modulePack.original_request
    }, (progress) => {
      // Capture moduleOrder from the final summary event
      if (progress.summary?.moduleOrder) {
        moduleOrder = progress.summary.moduleOrder;
      }
      writeEvent({ ...progress, phase: 'module_generation' });
    });

    // Update module pack with results
    modulePack.modules = results;
    modulePack.progress.modules_generated = results.filter(r => r.status === 'completed').length;
    modulePack.progress.modules_failed = results.filter(r => r.status === 'failed').length;

    if (modulePack.progress.modules_failed === 0) {
      modulePack.status = 'completed';
    } else if (modulePack.progress.modules_generated > 0) {
      modulePack.status = 'partial';
    } else {
      modulePack.status = 'failed';
    }

    modulePack.current_phase = 'complete';
    await modulePack.save();

    // Use the AI-determined module order from the factory, or fallback to generation order
    const orderedIds = moduleOrder || results
      .filter(r => r.status === 'completed' && r.manifest_id)
      .map(r => r.manifest_id);

    if (req.user && orderedIds.length > 0) {
      try {
        const user = await User.findOne({ email: req.user.email });
        if (user) {
          // Get existing order, filter out the new IDs, then prepend new IDs
          const existingOrder = user.preferences?.manifest_order || [];
          const filteredExisting = existingOrder.filter(id => !orderedIds.includes(id));
          user.preferences = user.preferences || {};
          user.preferences.manifest_order = [...orderedIds, ...filteredExisting];
          await user.save();
        }
      } catch (orderErr) {
        console.error('Failed to update user manifest order:', orderErr);
        // Non-critical, continue
      }
    }

    writeEvent({
      status: 'complete',
      phase: 'module_generation',
      message: 'Module generation complete',
      summary: {
        total: results.length,
        completed: modulePack.progress.modules_generated,
        failed: modulePack.progress.modules_failed,
        manifestIds: results.filter(r => r.manifest_id).map(r => r.manifest_id),
        moduleOrder: orderedIds
      }
    });

    writeEvent({ done: true, modulePackId: id });
    clearInterval(keepAlive);
    res.end();

  } catch (error) {
    console.error('Generate modules error:', error);
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    clearInterval(keepAlive);
    res.end();
  }
});

/**
 * GET /api/module-packs
 *
 * List module packs with optional filters
 */
router.get('/', async (req, res) => {
  try {
    const { status, visibility, region, limit = 50, offset = 0 } = req.query;

    const query = {};

    if (status) query.status = status;
    if (visibility) query.visibility = visibility;
    if (region) query['config.region'] = region;

    // Include user's private packs and all public packs
    if (req.user?.userId) {
      query.$or = [
        { created_by: req.user.userId },
        { visibility: 'PUBLIC' }
      ];
    } else {
      query.visibility = 'PUBLIC';
    }

    const [modulePacks, total] = await Promise.all([
      ModulePack.find(query)
        .sort({ createdAt: -1 })
        .skip(parseInt(offset))
        .limit(parseInt(limit))
        .lean(),
      ModulePack.countDocuments(query)
    ]);

    res.json({
      modulePacks,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: parseInt(offset) + modulePacks.length < total
      }
    });

  } catch (error) {
    console.error('List module packs error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/module-packs/:id
 *
 * Get a single module pack with full details
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const modulePack = await ModulePack.findOne({ id }).lean();
    if (!modulePack) {
      return res.status(404).json({ error: 'Module pack not found' });
    }

    res.json({ modulePack });

  } catch (error) {
    console.error('Get module pack error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/module-packs/:id/manifests
 *
 * Get all manifests belonging to a module pack
 */
router.get('/:id/manifests', async (req, res) => {
  try {
    const { id } = req.params;

    const modulePack = await ModulePack.findOne({ id });
    if (!modulePack) {
      return res.status(404).json({ error: 'Module pack not found' });
    }

    const manifestIds = modulePack.modules
      ?.filter(m => m.manifest_id)
      .map(m => m.manifest_id) || [];

    const manifests = await Manifest.find({
      id: { $in: manifestIds }
    }).lean();

    // Sort by order from module pack
    const sortedManifests = manifestIds
      .map(id => manifests.find(m => m.id === id))
      .filter(Boolean);

    res.json({
      modulePackId: id,
      modulePackName: modulePack.name,
      manifests: sortedManifests,
      summary: {
        total: sortedManifests.length,
        totalDomains: sortedManifests.reduce((sum, m) => sum + (m.domains?.length || 0), 0),
        totalFields: sortedManifests.reduce((sum, m) =>
          sum + m.domains?.reduce((dSum, d) => dSum + (d.fields?.length || 0), 0) || 0, 0)
      }
    });

  } catch (error) {
    console.error('Get pack manifests error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * DELETE /api/module-packs/:id
 *
 * Delete a module pack and optionally its manifests
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { deleteManifests = false } = req.query;

    const modulePack = await ModulePack.findOne({ id });
    if (!modulePack) {
      return res.status(404).json({ error: 'Module pack not found' });
    }

    // Check ownership
    if (modulePack.created_by !== req.user?.userId && req.user?.userId !== 'admin') {
      return res.status(403).json({ error: 'Not authorized to delete this module pack' });
    }

    // Optionally delete associated manifests
    if (deleteManifests === 'true') {
      const manifestIds = modulePack.modules
        ?.filter(m => m.manifest_id)
        .map(m => m.manifest_id) || [];

      await Manifest.deleteMany({ id: { $in: manifestIds } });
    }

    await ModulePack.deleteOne({ id });

    res.json({
      success: true,
      message: 'Module pack deleted',
      manifestsDeleted: deleteManifests === 'true'
    });

  } catch (error) {
    console.error('Delete module pack error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * PATCH /api/module-packs/:id
 *
 * Update module pack settings
 */
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const modulePack = await ModulePack.findOne({ id });
    if (!modulePack) {
      return res.status(404).json({ error: 'Module pack not found' });
    }

    // Only allow certain fields to be updated
    const allowedUpdates = ['name', 'description', 'visibility', 'tags'];
    const filteredUpdates = {};

    for (const key of allowedUpdates) {
      if (updates[key] !== undefined) {
        filteredUpdates[key] = updates[key];
      }
    }

    Object.assign(modulePack, filteredUpdates);
    await modulePack.save();

    res.json({ modulePack: modulePack.toJSON() });

  } catch (error) {
    console.error('Update module pack error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * Run the full pipeline: expert research -> ideation -> module generation
 */
async function runFullPipeline(modulePack, request, writeEvent) {
  const { topic, domains, region, additionalContext, researchDepth, locale, selectedDomain, selectedSubDomain, interviewMode } = request;

  // Helper to write event AND save to pack's progress log using atomic update
  const logAndWrite = async (event) => {
    const logEntry = {
      phase: event.phase,
      status: event.status,
      message: event.message,
      timestamp: new Date(),
      metadata: { ...event }
    };

    // Write to stream immediately
    writeEvent(event);

    // Use atomic $push to avoid concurrent save issues
    try {
      await ModulePack.updateOne(
        { id: modulePack.id },
        { $push: { progress_log: logEntry } }
      );
    } catch (err) {
      console.error('Failed to log progress event:', err.message);
    }
  };

  try {
    // Phase 0: Domain Classification
    await logAndWrite({
      status: 'phase_starting',
      phase: 'domain_classification',
      message: 'Starting domain classification...'
    });

    modulePack.status = 'classifying';
    modulePack.current_phase = 'domain_classification';
    await modulePack.save();

    const classificationAgent = createDomainClassificationAgent();
    const classification = await classificationAgent.classifyDomain({
      topic,
      domains,
      region,
      projectName: modulePack.original_request.project_name,
      fundingBody: modulePack.original_request.funding_body,
      additionalContext
    }, async (progress) => {
      await logAndWrite({ ...progress, phase: 'domain_classification' });
    });

    // If user pre-selected a domain, override
    if (selectedDomain) {
      classification.primary_domain = selectedDomain;
      if (selectedSubDomain) {
        classification.sub_domain = selectedSubDomain;
      }
    }

    // Auto-confirm in full pipeline mode
    classification.user_confirmed = true;

    modulePack.domain_classification = classification;
    modulePack.progress.domain_classification_complete = true;
    await modulePack.save();

    await logAndWrite({
      status: 'phase_complete',
      phase: 'domain_classification',
      message: `Domain classified: ${classification.primary_domain} > ${classification.sub_domain}`
    });

    // Emit full classification result with ontology details
    await logAndWrite({
      status: 'classification_result',
      phase: 'domain_classification',
      message: `${classification.primary_domain} > ${classification.sub_domain}`,
      details: {
        primary_domain: classification.primary_domain,
        sub_domain: classification.sub_domain,
        confidence: classification.confidence,
        secondary_domains: classification.secondary_domains,
        capabilities: classification.ontology?.capabilities || [],
        data_entities: classification.ontology?.data_entities || [],
        compliance_domains: classification.ontology?.compliance_domains || [],
        workflow_patterns: classification.ontology?.workflow_patterns || [],
        regional_factors: classification.regional_factors,
        research_tracks: classification.research_tracks_needed
      }
    });

    // Phase 1: Expert Research
    await logAndWrite({
      status: 'phase_starting',
      phase: 'expert_research',
      message: 'Starting expert mode research...'
    });

    modulePack.status = 'researching';
    modulePack.current_phase = 'expert_research';
    await modulePack.save();

    const expertAgent = createExpertModeAgent();
    const expertContext = await expertAgent.conductExpertResearch({
      topic,
      domains,
      region,
      depth: researchDepth,
      additionalContext,
      classification
    }, async (progress) => {
      await logAndWrite({ ...progress, phase: 'expert_research' });
    });

    modulePack.expert_context = expertContext;
    modulePack.progress.expert_mode_complete = true;
    await modulePack.save();

    await logAndWrite({
      status: 'phase_complete',
      phase: 'expert_research',
      message: `Expert research complete. ${expertContext.research_categories?.length || 0} categories, ${expertContext.recommended_modules?.length || 0} modules recommended.`
    });

    // Phase 2.5: Ontology Refinement
    await logAndWrite({
      status: 'phase_starting',
      phase: 'ontology_refinement',
      message: 'Refining ontology from research findings...'
    });

    modulePack.current_phase = 'ontology_refinement';
    await modulePack.save();

    const refinedOntology = await classificationAgent.refineOntologyFromResearch(
      classification,
      expertContext,
      async (progress) => {
        await logAndWrite({ ...progress, phase: 'ontology_refinement' });
      }
    );

    modulePack.refined_ontology = refinedOntology;
    modulePack.progress.ontology_refinement_complete = true;
    await modulePack.save();

    await logAndWrite({
      status: 'phase_complete',
      phase: 'ontology_refinement',
      message: `Ontology refined. ${refinedOntology.capabilities?.filter(c => c.confirmed_by_research).length || 0} capabilities confirmed.`
    });

    // Phase 3: Ideation - respects interview mode
    if (interviewMode === 'interactive' || interviewMode === 'hybrid') {
      // Pause pipeline for interactive interview
      modulePack.status = 'ideating';
      modulePack.current_phase = 'ideation';
      await modulePack.save();

      await logAndWrite({
        status: 'interview_required',
        phase: 'ideation',
        message: interviewMode === 'interactive'
          ? 'Interactive interview ready. Please answer the questions to define your requirements.'
          : 'Hybrid interview ready. Answer questions or let the AI self-answer.',
        interviewMode
      });

      // Pipeline stops here - frontend will show InterviewChat
      // After interview completes, frontend calls /generate-modules to finish
      return;
    }

    // Self-interview mode - run automatically
    await logAndWrite({
      status: 'phase_starting',
      phase: 'ideation',
      message: 'Starting self-interview ideation...'
    });

    modulePack.status = 'ideating';
    modulePack.current_phase = 'ideation';
    await modulePack.save();

    const ideationAgent = createIdeationAgent();
    const ideationDocument = await ideationAgent.conductSelfInterview(
      expertContext,
      { topic, domains, region, additionalContext, locale, classification, refinedOntology },
      async (progress) => {
        await logAndWrite({ ...progress, phase: 'ideation' });
      }
    );

    modulePack.ideation_document = ideationDocument;
    modulePack.progress.ideation_complete = true;
    modulePack.progress.modules_planned = ideationDocument.proposed_modules?.length || 0;
    await modulePack.save();

    await logAndWrite({
      status: 'phase_complete',
      phase: 'ideation',
      message: `Ideation complete. ${ideationDocument.proposed_modules?.length || 0} modules planned.`
    });

    // Phase 4: Module Generation
    await logAndWrite({
      status: 'phase_starting',
      phase: 'module_generation',
      message: `Starting generation of ${ideationDocument.proposed_modules?.length || 0} modules...`
    });

    modulePack.status = 'generating';
    modulePack.current_phase = 'module_generation';
    await modulePack.save();

    const moduleFactory = createModuleFactoryAgent();
    let moduleOrder = null;
    const results = await moduleFactory.generateModules({
      modulePackId: modulePack.id,
      expertContext,
      ideationDocument,
      config: modulePack.config,
      originalRequest: modulePack.original_request,
      refinedOntology
    }, async (progress) => {
      if (progress.summary?.moduleOrder) {
        moduleOrder = progress.summary.moduleOrder;
      }
      await logAndWrite({ ...progress, phase: 'module_generation' });
    });

    // Update final status
    modulePack.modules = results;
    modulePack.progress.modules_generated = results.filter(r => r.status === 'completed').length;
    modulePack.progress.modules_failed = results.filter(r => r.status === 'failed').length;

    if (modulePack.progress.modules_failed === 0) {
      modulePack.status = 'completed';
    } else if (modulePack.progress.modules_generated > 0) {
      modulePack.status = 'partial';
    } else {
      modulePack.status = 'failed';
    }

    modulePack.current_phase = 'complete';

    // Update user's manifest_order preference with the AI-determined order
    const orderedIds = moduleOrder || results
      .filter(r => r.status === 'completed' && r.manifest_id)
      .map(r => r.manifest_id);

    if (req.user && orderedIds.length > 0) {
      try {
        const user = await User.findOne({ email: req.user.email });
        if (user) {
          const existingOrder = user.preferences?.manifest_order || [];
          const filteredExisting = existingOrder.filter(id => !orderedIds.includes(id));
          user.preferences = user.preferences || {};
          user.preferences.manifest_order = [...orderedIds, ...filteredExisting];
          await user.save();
        }
      } catch (orderErr) {
        console.error('Failed to update user manifest order:', orderErr);
      }
    }

    await logAndWrite({
      status: 'pipeline_complete',
      phase: 'complete',
      message: 'Full pipeline complete',
      summary: {
        expertCategories: expertContext.research_categories?.length || 0,
        questionsAnswered: ideationDocument.questions_answered?.length || 0,
        modulesGenerated: modulePack.progress.modules_generated,
        modulesFailed: modulePack.progress.modules_failed,
        manifestIds: results.filter(r => r.manifest_id).map(r => r.manifest_id),
        moduleOrder: orderedIds
      }
    });

    // Final save to ensure all logs are persisted
    await modulePack.save();

  } catch (error) {
    // Log the error using atomic update
    try {
      await ModulePack.updateOne(
        { id: modulePack.id },
        {
          $push: {
            progress_log: {
              phase: modulePack.current_phase || 'unknown',
              status: 'error',
              message: `Pipeline failed: ${error.message}`,
              timestamp: new Date()
            },
            errors: {
              phase: modulePack.current_phase,
              message: error.message,
              timestamp: new Date()
            }
          },
          $set: { status: 'failed' }
        }
      );
    } catch (logErr) {
      console.error('Failed to log error:', logErr.message);
    }
    throw error;
  }
}

export default router;
