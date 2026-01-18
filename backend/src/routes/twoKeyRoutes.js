/**
 * Two-Key Routes - Chameleon Protocol
 * 
 * API for dual authorization of high-stakes actions.
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import TwoKeyAction from '../models/TwoKeyAction.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { logAudit } from '../middleware/auditMiddleware.js';

const router = Router();

// All two-key routes require authentication
router.use(requireAuth);

/**
 * POST /api/two-key/initiate
 * Initiate a high-stakes action
 */
router.post('/initiate', async (req, res) => {
  try {
    const {
      action_type,
      description,
      target,
      payload,
      required_witness_role,
      expires_in_hours
    } = req.body;
    
    // Validation
    if (!action_type || !description) {
      return res.status(400).json({ 
        error: 'action_type and description are required' 
      });
    }
    
    // Calculate expiry (default 24 hours)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + (expires_in_hours || 24));
    
    // Generate requester signature
    const actionId = uuidv4();
    const signature = TwoKeyAction.generateSignature(
      actionId, 
      req.user.id, 
      process.env.SESSION_SECRET || 'chameleon-dev-session-secret'
    );
    
    const action = new TwoKeyAction({
      id: actionId,
      action_type,
      description,
      target: target || {},
      payload: payload || {},
      requester: {
        user_id: req.user.id,
        signature,
        signed_at: new Date()
      },
      witness: {
        required_role: required_witness_role || 'SUPERVISOR'
      },
      expires_at: expiresAt
    });
    
    await action.save();
    
    // Audit log
    await logAudit({
      userId: req.user.id,
      entityType: 'two_key_action',
      entityId: action.id,
      action: 'TWO_KEY_INITIATED',
      metadata: {
        action_type,
        target,
        expires_at: expiresAt
      }
    });
    
    res.status(201).json(action);
  } catch (err) {
    console.error('Initiate two-key error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/two-key/pending
 * Get pending actions awaiting approval
 */
router.get('/pending', async (req, res) => {
  try {
    const actions = await TwoKeyAction.getPendingForWitness(
      req.user.id,
      req.user.role
    );
    
    res.json(actions);
  } catch (err) {
    console.error('Get pending error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/two-key/my-actions
 * Get actions initiated by current user
 */
router.get('/my-actions', async (req, res) => {
  try {
    const actions = await TwoKeyAction.getByRequester(req.user.id);
    res.json(actions);
  } catch (err) {
    console.error('Get my actions error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/two-key/:id
 * Get specific action details
 */
router.get('/:id', async (req, res) => {
  try {
    const action = await TwoKeyAction.findOne({ id: req.params.id });
    
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }
    
    res.json(action);
  } catch (err) {
    console.error('Get action error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/two-key/approve/:id
 * Approve an action with witness signature
 */
router.post('/approve/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;
    
    const action = await TwoKeyAction.findOne({ id });
    
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }
    
    // Check if user can witness
    if (action.requester.user_id === req.user.id) {
      return res.status(403).json({ 
        error: 'Cannot approve your own action' 
      });
    }
    
    // Check role requirement
    const roleHierarchy = { ADMIN: 3, SUPERVISOR: 2, WORKER: 1 };
    const userRank = roleHierarchy[req.user.role] || 0;
    const requiredRank = roleHierarchy[action.witness.required_role] || 2;
    
    if (userRank < requiredRank) {
      return res.status(403).json({ 
        error: `Requires ${action.witness.required_role} or higher role` 
      });
    }
    
    // Generate witness signature
    const signature = TwoKeyAction.generateSignature(
      id,
      req.user.id,
      process.env.JWT_SECRET
    );
    
    await action.approve(req.user.id, signature, comment);
    
    // Audit log
    await logAudit({
      userId: req.user.id,
      entityType: 'two_key_action',
      entityId: action.id,
      action: 'TWO_KEY_APPROVED',
      metadata: {
        action_type: action.action_type,
        requester: action.requester.user_id,
        comment
      }
    });
    
    res.json({ success: true, action });
  } catch (err) {
    console.error('Approve action error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/two-key/reject/:id
 * Reject an action
 */
router.post('/reject/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const action = await TwoKeyAction.findOne({ id });
    
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }
    
    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }
    
    await action.reject(req.user.id, reason);
    
    // Audit log
    await logAudit({
      userId: req.user.id,
      entityType: 'two_key_action',
      entityId: action.id,
      action: 'TWO_KEY_REJECTED',
      metadata: {
        action_type: action.action_type,
        requester: action.requester.user_id,
        reason
      }
    });
    
    res.json({ success: true, action });
  } catch (err) {
    console.error('Reject action error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/two-key/cancel/:id
 * Cancel own pending action
 */
router.post('/cancel/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const action = await TwoKeyAction.findOne({ id });
    
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }
    
    if (action.requester.user_id !== req.user.id) {
      return res.status(403).json({ error: 'Can only cancel your own actions' });
    }
    
    if (action.status !== 'PENDING') {
      return res.status(400).json({ error: 'Can only cancel pending actions' });
    }
    
    action.status = 'CANCELLED';
    await action.save();
    
    // Audit log
    await logAudit({
      userId: req.user.id,
      entityType: 'two_key_action',
      entityId: action.id,
      action: 'TWO_KEY_CANCELLED',
      metadata: { action_type: action.action_type }
    });
    
    res.json({ success: true, action });
  } catch (err) {
    console.error('Cancel action error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/two-key/execute/:id
 * Execute an approved action (system use)
 */
router.post('/execute/:id', requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    
    const action = await TwoKeyAction.findOne({ id });
    
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }
    
    if (action.status !== 'APPROVED') {
      return res.status(400).json({ 
        error: 'Action must be approved before execution' 
      });
    }
    
    // Execute based on action type
    let result;
    try {
      result = await executeAction(action);
    } catch (execErr) {
      result = { success: false, error: execErr.message };
    }
    
    await action.markExecuted(result);
    
    // Audit log
    await logAudit({
      userId: req.user.id,
      entityType: 'two_key_action',
      entityId: action.id,
      action: 'TWO_KEY_EXECUTED',
      metadata: {
        action_type: action.action_type,
        result
      }
    });
    
    res.json({ success: true, action, result });
  } catch (err) {
    console.error('Execute action error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * Execute the actual action based on type
 */
async function executeAction(action) {
  switch (action.action_type) {
    case 'DATA_DELETION':
      // Would implement actual deletion logic here
      return { success: true, message: 'Data marked for deletion' };
    
    case 'ACCOUNT_DEACTIVATION':
      // Would implement account deactivation here
      return { success: true, message: 'Account deactivated' };
    
    case 'FUND_RELEASE':
      // Would implement fund release here
      return { success: true, message: 'Fund release initiated' };
    
    default:
      return { success: true, message: 'Action executed' };
  }
}

export default router;
