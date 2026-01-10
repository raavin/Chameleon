/**
 * Privacy Middleware - Chameleon Protocol
 * 
 * Enforces privacy tiers and consent-based access control.
 * Implements the Traffic Light privacy system.
 */

import PrivacyRule from '../models/PrivacyRule.js';
import Consent from '../models/Consent.js';
import { logAudit } from './auditMiddleware.js';

/**
 * Check privacy access for a request
 * Attaches privacy context to req.privacy
 */
export async function checkPrivacy(req, res, next) {
  req.privacy = {
    tier: 'GREEN',
    hasConsent: false,
    redactedFields: []
  };
  
  next();
}

/**
 * Filter submission data based on privacy tiers and consent
 */
export async function filterByPrivacy(submission, userId, userRole, manifest) {
  if (!submission || !submission.data) {
    return submission;
  }
  
  const identityKey = submission.subject_id;
  const domainId = submission.domain_id;
  const manifestId = submission.manifest_id;
  
  // Find the domain in manifest to get field definitions
  const domain = manifest?.domains?.find(d => d.id === domainId);
  const fields = domain?.fields || [];
  
  const filteredData = {};
  const redactedFields = [];
  
  for (const [fieldId, value] of Object.entries(submission.data)) {
    // Get field definition
    const field = fields.find(f => f.id === fieldId);
    
    // Determine privacy tier for this field
    let tier = field?.privacy_tier;
    
    if (!tier) {
      // Check for explicit rule
      tier = await PrivacyRule.getTierForField(manifestId, domainId, fieldId);
    }
    
    if (!tier) {
      // Use default based on field characteristics
      tier = PrivacyRule.getDefaultTier(fieldId, field?.label, field?.type);
    }
    
    // Check access
    if (tier === 'GREEN') {
      // Always accessible
      filteredData[fieldId] = value;
    } else {
      // Check consent
      const access = await Consent.checkAccess({
        userId,
        userRole,
        identityKey,
        submissionId: submission.id,
        domainId,
        fieldId,
        requiredTier: tier
      });
      
      if (access.allowed) {
        filteredData[fieldId] = value;
        
        // Record access if consent was used
        if (access.consent) {
          await access.consent.recordAccess();
        }
      } else {
        // Redact the field
        filteredData[fieldId] = '[REDACTED]';
        redactedFields.push({
          fieldId,
          tier,
          reason: access.reason
        });
      }
    }
  }
  
  return {
    ...submission,
    data: filteredData,
    _privacy: {
      redactedFields,
      appliedAt: new Date().toISOString()
    }
  };
}

/**
 * Middleware to filter response data based on privacy
 */
export function applyPrivacyFilter(getManifest) {
  return async (req, res, next) => {
    // Store original json method
    const originalJson = res.json.bind(res);
    
    // Override json to filter data
    res.json = async function(data) {
      // Skip if no user context or no data
      if (!req.user || !data) {
        return originalJson(data);
      }
      
      try {
        // Handle single submission
        if (data.manifest_id && data.subject_id && data.data) {
          const manifest = await getManifest(data.manifest_id);
          const filtered = await filterByPrivacy(
            data,
            req.user.userId,
            req.user.role,
            manifest
          );
          
          // Log if any fields were redacted
          if (filtered._privacy?.redactedFields?.length > 0) {
            await logAudit({
              userId: req.user.userId,
              entityType: 'submission',
              entityId: data.id,
              action: 'ACCESS_FILTERED',
              metadata: {
                redactedCount: filtered._privacy.redactedFields.length,
                reason: 'Privacy tier restriction'
              }
            });
          }
          
          return originalJson(filtered);
        }
        
        // Handle array of submissions
        if (Array.isArray(data) && data[0]?.manifest_id) {
          const filtered = await Promise.all(
            data.map(async (sub) => {
              const manifest = await getManifest(sub.manifest_id);
              return filterByPrivacy(sub, req.user.userId, req.user.role, manifest);
            })
          );
          return originalJson(filtered);
        }
        
        // Pass through unchanged
        return originalJson(data);
      } catch (err) {
        console.error('Privacy filter error:', err);
        return originalJson(data);
      }
    };
    
    next();
  };
}

/**
 * Check if user can access RED tier data
 */
export function requireRedAccess(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // Only ADMIN and SUPERVISOR can access RED tier
  if (!['ADMIN', 'SUPERVISOR'].includes(req.user.role)) {
    return res.status(403).json({ 
      error: 'Insufficient privileges for sensitive data',
      required: 'SUPERVISOR or higher'
    });
  }
  
  next();
}

export default {
  checkPrivacy,
  filterByPrivacy,
  applyPrivacyFilter,
  requireRedAccess
};
