/**
 * Security Routes - Chameleon Protocol
 * 
 * API for security alerts and Sentinel agent.
 */

import { Router } from 'express';
import SecurityAlert from '../models/SecurityAlert.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { runSentinelChecks, freezeUser } from '../services/sentinelAgent.js';
import { logAudit } from '../middleware/auditMiddleware.js';

const router = Router();

// All security routes require authentication
router.use(requireAuth);

/**
 * GET /api/security/alerts
 * Get security alerts (admin/supervisor only)
 */
router.get('/alerts', requireRole('ADMIN', 'SUPERVISOR'), async (req, res) => {
  try {
    const { severity, resolved } = req.query;
    
    const query = {};
    if (severity) query.severity = severity;
    if (resolved !== undefined) query.is_resolved = resolved === 'true';
    
    const alerts = await SecurityAlert.find(query)
      .sort({ created_at: -1 })
      .limit(100);
    
    res.json(alerts);
  } catch (err) {
    console.error('Get alerts error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/security/alerts/unresolved
 * Get unresolved alerts count
 */
router.get('/alerts/unresolved', requireRole('ADMIN', 'SUPERVISOR'), async (req, res) => {
  try {
    const counts = await SecurityAlert.aggregate([
      { $match: { is_resolved: false } },
      { $group: { _id: '$severity', count: { $sum: 1 } } }
    ]);
    
    const result = {
      total: 0,
      CRITICAL: 0,
      HIGH: 0,
      MEDIUM: 0,
      LOW: 0
    };
    
    for (const c of counts) {
      result[c._id] = c.count;
      result.total += c.count;
    }
    
    res.json(result);
  } catch (err) {
    console.error('Get unresolved count error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/security/alerts/:id
 * Get specific alert
 */
router.get('/alerts/:id', requireRole('ADMIN', 'SUPERVISOR'), async (req, res) => {
  try {
    const alert = await SecurityAlert.findOne({ id: req.params.id });
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    res.json(alert);
  } catch (err) {
    console.error('Get alert error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/security/alerts/:id/resolve
 * Resolve an alert
 */
router.post('/alerts/:id/resolve', requireRole('ADMIN', 'SUPERVISOR'), async (req, res) => {
  try {
    const { id } = req.params;
    const { notes, is_false_positive } = req.body;
    
    const alert = await SecurityAlert.findOne({ id });
    
    if (!alert) {
      return res.status(404).json({ error: 'Alert not found' });
    }
    
    if (alert.is_resolved) {
      return res.status(400).json({ error: 'Alert already resolved' });
    }
    
    await alert.resolve(req.user.userId, notes, is_false_positive);
    
    await logAudit({
      userId: req.user.userId,
      entityType: 'security_alert',
      entityId: alert.id,
      action: 'ALERT_RESOLVED',
      metadata: { notes, is_false_positive }
    });
    
    res.json({ success: true, alert });
  } catch (err) {
    console.error('Resolve alert error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/security/sentinel/run
 * Manually trigger Sentinel scan (admin only)
 */
router.post('/sentinel/run', requireRole('ADMIN'), async (req, res) => {
  try {
    const results = await runSentinelChecks();
    
    await logAudit({
      userId: req.user.userId,
      entityType: 'sentinel',
      entityId: 'manual_run',
      action: 'SENTINEL_MANUAL_RUN',
      metadata: results
    });
    
    res.json(results);
  } catch (err) {
    console.error('Sentinel run error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/security/freeze/:userId
 * Freeze a user account (admin only)
 */
router.post('/freeze/:userId', requireRole('ADMIN'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { reason } = req.body;
    
    if (!reason) {
      return res.status(400).json({ error: 'Reason is required' });
    }
    
    // Can't freeze yourself
    if (userId === req.user.userId) {
      return res.status(400).json({ error: 'Cannot freeze your own account' });
    }
    
    const success = await freezeUser(userId, reason);
    
    if (success) {
      await logAudit({
        userId: req.user.userId,
        entityType: 'user',
        entityId: userId,
        action: 'USER_FROZEN',
        metadata: { reason }
      });
      
      res.json({ success: true, message: 'User frozen' });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (err) {
    console.error('Freeze user error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/security/stats
 * Get security statistics
 */
router.get('/stats', requireRole('ADMIN', 'SUPERVISOR'), async (req, res) => {
  try {
    const now = new Date();
    const dayAgo = new Date(now - 86400000);
    const weekAgo = new Date(now - 7 * 86400000);
    
    const [alertsToday, alertsWeek, byType] = await Promise.all([
      SecurityAlert.countDocuments({ created_at: { $gte: dayAgo } }),
      SecurityAlert.countDocuments({ created_at: { $gte: weekAgo } }),
      SecurityAlert.aggregate([
        { $match: { created_at: { $gte: weekAgo } } },
        { $group: { _id: '$alert_type', count: { $sum: 1 } } }
      ])
    ]);
    
    res.json({
      alerts_today: alertsToday,
      alerts_this_week: alertsWeek,
      by_type: byType.reduce((acc, t) => ({ ...acc, [t._id]: t.count }), {})
    });
  } catch (err) {
    console.error('Get stats error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
