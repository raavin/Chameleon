import express from 'express';
import Submission from '../models/Submission.js';
import Client from '../models/Client.js';
import Manifest from '../models/Manifest.js';
import { logAudit } from '../middleware/auditMiddleware.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply optional auth to all routes - will use user if present
router.use(optionalAuth);

/**
 * GET /api/submissions
 * List submissions with optional filters
 * Query params: subject_id, manifest_id, status
 */
router.get('/', async (req, res) => {
  try {
    const filter = {};
    
    if (req.query.subject_id) filter.subject_id = req.query.subject_id;
    if (req.query.manifest_id) filter.manifest_id = req.query.manifest_id;
    if (req.query.status) filter.status = req.query.status;

    const submissions = await Submission.find(filter)
      .sort({ timestamp: -1 })
      .limit(parseInt(req.query.limit) || 100);

    res.json(submissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/submissions/:id
 * Get a single submission
 */
router.get('/:id', async (req, res) => {
  try {
    const submission = await Submission.findOne({ id: req.params.id });
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }
    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/submissions
 * Create a new submission and auto-create/update client
 * This mirrors the current DB.saveSubmission + DB.updateClientFromSubmission flow
 */
router.post('/', async (req, res) => {
  try {
    const submissionData = req.body;

    if (!submissionData.id) {
      return res.status(400).json({ error: 'Submission id is required' });
    }

    // Convert timestamp string to Date if needed
    if (typeof submissionData.timestamp === 'string') {
      submissionData.timestamp = new Date(submissionData.timestamp);
    }

    // Convert data object to Map-compatible format
    const submission = await Submission.findOneAndUpdate(
      { id: submissionData.id },
      submissionData,
      { upsert: true, new: true, runValidators: true }
    );

    // Check if this submission is from a client profile module
    let manifestModuleType = null;
    if (submissionData.manifest_id) {
      const manifest = await Manifest.findOne({ id: submissionData.manifest_id });
      manifestModuleType = manifest?.module_type;
    }
    const fromProfile =
      submissionData.domain_id === 'client_profile' ||
      submissionData.data?.module_type === 'CLIENT_CORE' ||
      manifestModuleType === 'client-entity';
    const clientName =
      submissionData.data?.full_name ||
      submissionData.data?.name ||
      [submissionData.data?.given_name, submissionData.data?.family_name].filter(Boolean).join(' ') ||
      'Resolved Identity';

    if (fromProfile) {
      await Client.findOneAndUpdate(
        { id: submissionData.subject_id },
        {
          id: submissionData.subject_id,
          name: clientName
        },
        { upsert: true, new: true }
      );
    } else {
      await Client.updateOne(
        { id: submissionData.subject_id },
        { $setOnInsert: { id: submissionData.subject_id, name: clientName } },
        { upsert: true }
      );
    }

    // Log audit trail for submission creation
    await logAudit({
      userId: req.user?.id || req.headers['x-user-id'] || 'anonymous',
      entityType: 'submission',
      entityId: submission.id,
      action: 'CREATE',
      metadata: {
        subject_id: submissionData.subject_id,
        manifest_id: submissionData.manifest_id,
        domain_id: submissionData.domain_id,
        status: submission.status,
        user_role: req.user?.role
      }
    });

    res.status(201).json(submission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/submissions/:id
 * Update submission status
 */
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!['FINALIZED', 'PENDING', 'FLAGGED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const submission = await Submission.findOneAndUpdate(
      { id: req.params.id },
      { status },
      { new: true }
    );

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    res.json(submission);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
