import express from 'express';
import Client from '../models/Client.js';
import Submission from '../models/Submission.js';
import { logAudit } from '../middleware/auditMiddleware.js';
import { optionalAuth } from '../middleware/authMiddleware.js';

const router = express.Router();

// Apply optional auth to all routes
router.use(optionalAuth);

/**
 * GET /api/clients
 * List all clients with submission counts
 */
router.get('/', async (req, res) => {
  try {
    const clients = await Client.find().sort({ name: 1 });
    
    // Get submission counts for each client
    const clientsWithCounts = await Promise.all(
      clients.map(async (client) => {
        const submissionCount = await Submission.countDocuments({ subject_id: client.id });
        const latestSubmission = await Submission.findOne({ subject_id: client.id })
          .sort({ timestamp: -1 })
          .select('timestamp');
        
        return {
          ...client.toJSON(),
          submissionCount,
          latestSubmission: latestSubmission?.timestamp || null
        };
      })
    );
    
    res.json(clientsWithCounts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/clients/:id
 * Get a single client with all their submissions
 */
router.get('/:id', async (req, res) => {
  try {
    const client = await Client.findOne({ id: req.params.id });
    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    // Get all submissions for this client
    const submissions = await Submission.find({ subject_id: req.params.id })
      .sort({ timestamp: -1 });

    // Return client with embedded submissions (matching current IndexedDB structure)
    const clientWithSubmissions = {
      ...client.toJSON(),
      submissions: submissions.map(s => s.toJSON())
    };

    // Log audit trail for client record access
    await logAudit({
      userId: req.headers['x-user-id'] || 'anonymous',
      entityType: 'client',
      entityId: client.id,
      action: 'ACCESS',
      metadata: {
        submissions_count: submissions.length
      }
    });

    res.json(clientWithSubmissions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/clients
 * Create or update a client
 */
router.post('/', async (req, res) => {
  try {
    const clientData = req.body;
    
    if (!clientData.id) {
      return res.status(400).json({ error: 'Client id is required' });
    }

    const client = await Client.findOneAndUpdate(
      { id: clientData.id },
      { 
        id: clientData.id,
        name: clientData.name,
        metadata: clientData.metadata || {}
      },
      { upsert: true, new: true, runValidators: true }
    );

    res.status(201).json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/clients/:id
 * Update client metadata
 */
router.patch('/:id', async (req, res) => {
  try {
    const updates = req.body;
    delete updates.id; // Prevent id changes

    const client = await Client.findOneAndUpdate(
      { id: req.params.id },
      { $set: updates },
      { new: true, runValidators: true }
    );

    if (!client) {
      return res.status(404).json({ error: 'Client not found' });
    }

    res.json(client);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/clients/:id
 * Delete a client (submissions remain for audit)
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await Client.findOneAndDelete({ id: req.params.id });
    if (!result) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json({ message: 'Client deleted', id: req.params.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
