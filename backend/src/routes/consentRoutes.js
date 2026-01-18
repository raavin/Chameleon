/**
 * Consent Routes - Chameleon Protocol
 * 
 * API for managing data access consent.
 */

import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import Consent from '../models/Consent.js';
import { requireAuth, optionalAuth } from '../middleware/authMiddleware.js';
import { logAudit } from '../middleware/auditMiddleware.js';

const router = Router();

/**
 * GET /api/consent/by-client/:clientId
 * Get all consents for a specific client
 */
router.get('/by-client/:clientId', requireAuth, async (req, res) => {
  try {
    const { clientId } = req.params;
    const includeRevoked = req.query.include_revoked === 'true';
    
    const consents = await Consent.getForClient(clientId, includeRevoked);
    
    res.json(consents);
  } catch (err) {
    console.error('Get consents error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/consent/:id
 * Get a specific consent
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const consent = await Consent.findOne({ id: req.params.id });
    
    if (!consent) {
      return res.status(404).json({ error: 'Consent not found' });
    }
    
    res.json(consent);
  } catch (err) {
    console.error('Get consent error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/consent
 * Grant new consent
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const {
      identity_key,
      granted_to,
      scope,
      tier_access,
      purpose,
      purpose_code,
      expires_at
    } = req.body;
    
    // Validation
    if (!identity_key) {
      return res.status(400).json({ error: 'identity_key is required' });
    }
    if (!granted_to || (!granted_to.user_id && !granted_to.role)) {
      return res.status(400).json({ error: 'granted_to.user_id or granted_to.role is required' });
    }
    if (!purpose) {
      return res.status(400).json({ error: 'purpose is required' });
    }
    
    const consent = new Consent({
      id: uuidv4(),
      identity_key,
      granted_to,
      scope: scope || {},
      tier_access: tier_access || 'AMBER',
      purpose,
      purpose_code: purpose_code || 'OTHER',
      expires_at: expires_at ? new Date(expires_at) : null,
      created_by: req.user.id
    });
    
    await consent.save();
    
    // Audit log
    await logAudit({
      userId: req.user.id,
      entityType: 'consent',
      entityId: consent.id,
      action: 'CONSENT_GRANTED',
      metadata: {
        identity_key,
        granted_to,
        tier_access: consent.tier_access,
        purpose
      }
    });
    
    res.status(201).json(consent);
  } catch (err) {
    console.error('Grant consent error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/consent/:id
 * Revoke consent
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    
    const consent = await Consent.findOne({ id });
    
    if (!consent) {
      return res.status(404).json({ error: 'Consent not found' });
    }
    
    if (consent.is_revoked) {
      return res.status(400).json({ error: 'Consent already revoked' });
    }
    
    await consent.revoke(req.user.id, reason || 'User requested revocation');
    
    // Audit log
    await logAudit({
      userId: req.user.id,
      entityType: 'consent',
      entityId: consent.id,
      action: 'CONSENT_REVOKED',
      metadata: {
        identity_key: consent.identity_key,
        reason: reason || 'User requested revocation'
      }
    });
    
    res.json({ success: true, consent });
  } catch (err) {
    console.error('Revoke consent error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/consent/check
 * Check if access is permitted for a resource
 */
router.post('/check', requireAuth, async (req, res) => {
  try {
    const {
      identity_key,
      submission_id,
      domain_id,
      field_id,
      required_tier
    } = req.body;
    
    if (!identity_key) {
      return res.status(400).json({ error: 'identity_key is required' });
    }
    
    const access = await Consent.checkAccess({
      userId: req.user.id,
      userRole: req.user.role,
      identityKey: identity_key,
      submissionId: submission_id,
      domainId: domain_id,
      fieldId: field_id,
      requiredTier: required_tier || 'AMBER'
    });
    
    res.json(access);
  } catch (err) {
    console.error('Check access error:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/consent/my-access
 * Get consents granted to the current user
 */
router.get('/my-access', requireAuth, async (req, res) => {
  try {
    const consents = await Consent.find({
      $or: [
        { 'granted_to.user_id': req.user.id },
        { 'granted_to.role': req.user.role }
      ],
      is_revoked: false
    }).sort({ granted_at: -1 });
    
    res.json(consents);
  } catch (err) {
    console.error('Get my access error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
