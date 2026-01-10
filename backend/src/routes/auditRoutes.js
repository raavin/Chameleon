import express from 'express';
import AuditTrail from '../models/AuditTrail.js';

const router = express.Router();

/**
 * GET /api/audit/entity/:entityType/:entityId
 * Get audit history for a specific entity
 */
router.get('/entity/:entityType/:entityId', async (req, res) => {
  try {
    const { entityType, entityId } = req.params;
    const { limit = 100, skip = 0 } = req.query;
    
    const entries = await AuditTrail.find({
      entity_type: entityType,
      entity_id: entityId
    })
    .sort({ timestamp: -1 })
    .skip(parseInt(skip))
    .limit(parseInt(limit))
    .lean();
    
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/audit/user/:userId
 * Get audit history for a specific user
 */
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 100, skip = 0 } = req.query;
    
    const entries = await AuditTrail.find({ user_id: userId })
      .sort({ timestamp: -1 })
      .skip(parseInt(skip))
      .limit(parseInt(limit))
      .lean();
    
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/audit/recent
 * Get recent audit entries (system-wide)
 */
router.get('/recent', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const entries = await AuditTrail.find()
      .sort({ timestamp: -1 })
      .limit(parseInt(limit))
      .lean();
    
    res.json(entries);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/audit/verify
 * Verify the integrity of the audit chain
 * Query params: entityType, entityId (optional filters)
 */
router.get('/verify', async (req, res) => {
  try {
    const { entityType, entityId } = req.query;
    
    const result = await AuditTrail.verifyChain(entityType, entityId);
    
    res.json({
      ...result,
      verified_at: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/audit/stats
 * Get audit statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const [totalCount, actionCounts, entityCounts] = await Promise.all([
      AuditTrail.countDocuments(),
      AuditTrail.aggregate([
        { $group: { _id: '$action', count: { $sum: 1 } } }
      ]),
      AuditTrail.aggregate([
        { $group: { _id: '$entity_type', count: { $sum: 1 } } }
      ])
    ]);
    
    res.json({
      total_entries: totalCount,
      by_action: Object.fromEntries(actionCounts.map(a => [a._id, a.count])),
      by_entity: Object.fromEntries(entityCounts.map(e => [e._id, e.count]))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
