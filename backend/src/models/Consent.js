/**
 * Consent Model - Chameleon Protocol
 * 
 * Manages data access consent granted by data subjects.
 * Implements granular, time-limited, revocable consent.
 */

import mongoose from 'mongoose';

const consentSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Who is granting consent (the data subject)
  identity_key: {
    type: String,
    required: true,
    index: true
  },
  // Who receives access
  granted_to: {
    user_id: String,         // Specific user
    role: String,            // OR role-based
    organization: String     // OR organization-wide
  },
  // What they can access
  scope: {
    submission_id: String,   // Specific submission
    domain_id: String,       // Entire domain
    field_ids: [String],     // Specific fields only
    all_data: Boolean        // Full access (rare)
  },
  // Maximum privacy tier accessible
  tier_access: {
    type: String,
    enum: ['GREEN', 'AMBER', 'RED'],
    default: 'AMBER'
  },
  // Purpose and context
  purpose: {
    type: String,
    required: true
  },
  purpose_code: {
    type: String,
    enum: [
      'CASE_MANAGEMENT',
      'CLINICAL_CARE',
      'EMERGENCY',
      'RESEARCH',
      'AUDIT',
      'LEGAL',
      'OTHER'
    ]
  },
  // Validity period
  granted_at: {
    type: Date,
    default: Date.now,
    required: true
  },
  expires_at: {
    type: Date   // Optional expiry
  },
  // Revocation
  is_revoked: {
    type: Boolean,
    default: false
  },
  revoked_at: Date,
  revoked_by: String,
  revocation_reason: String,
  // Audit
  created_by: String,
  access_count: {
    type: Number,
    default: 0
  },
  last_accessed: Date
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Indexes for efficient lookup
consentSchema.index({ identity_key: 1, is_revoked: 1 });
consentSchema.index({ 'granted_to.user_id': 1, is_revoked: 1 });
consentSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // TTL index

/**
 * Check if consent is valid (not expired, not revoked)
 */
consentSchema.methods.isValid = function() {
  if (this.is_revoked) return false;
  if (this.expires_at && new Date() > this.expires_at) return false;
  return true;
};

/**
 * Record an access using this consent
 */
consentSchema.methods.recordAccess = async function() {
  this.access_count += 1;
  this.last_accessed = new Date();
  return this.save();
};

/**
 * Revoke this consent
 */
consentSchema.methods.revoke = async function(userId, reason) {
  this.is_revoked = true;
  this.revoked_at = new Date();
  this.revoked_by = userId;
  this.revocation_reason = reason;
  return this.save();
};

/**
 * Check if a user has consent for a specific resource
 */
consentSchema.statics.checkAccess = async function({
  userId,
  userRole,
  identityKey,
  submissionId,
  domainId,
  fieldId,
  requiredTier
}) {
  const tierRank = { GREEN: 1, AMBER: 2, RED: 3 };
  const requiredRank = tierRank[requiredTier] || 1;
  
  // GREEN is always accessible to authenticated users
  if (requiredTier === 'GREEN') {
    return { allowed: true, reason: 'Public data' };
  }
  
  // Find applicable consents
  const consents = await this.find({
    identity_key: identityKey,
    is_revoked: false,
    $or: [
      { 'granted_to.user_id': userId },
      { 'granted_to.role': userRole },
      { 'scope.all_data': true }
    ]
  });
  
  for (const consent of consents) {
    // Check expiry
    if (!consent.isValid()) continue;
    
    // Check tier access
    const consentRank = tierRank[consent.tier_access] || 1;
    if (consentRank < requiredRank) continue;
    
    // Check scope
    if (consent.scope.all_data) {
      return { allowed: true, consent, reason: 'Full access consent' };
    }
    
    if (submissionId && consent.scope.submission_id === submissionId) {
      return { allowed: true, consent, reason: 'Submission consent' };
    }
    
    if (domainId && consent.scope.domain_id === domainId) {
      return { allowed: true, consent, reason: 'Domain consent' };
    }
    
    if (fieldId && consent.scope.field_ids?.includes(fieldId)) {
      return { allowed: true, consent, reason: 'Field consent' };
    }
  }
  
  return { 
    allowed: false, 
    reason: `No valid consent for ${requiredTier} tier data`
  };
};

/**
 * Get all consents for a client
 */
consentSchema.statics.getForClient = async function(identityKey, includeRevoked = false) {
  const query = { identity_key: identityKey };
  if (!includeRevoked) {
    query.is_revoked = false;
  }
  return this.find(query).sort({ granted_at: -1 });
};

const Consent = mongoose.model('Consent', consentSchema);

export default Consent;
