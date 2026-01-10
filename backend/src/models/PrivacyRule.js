/**
 * PrivacyRule Model - Chameleon Protocol
 * 
 * Defines privacy tiers for fields, domains, and satellites.
 * Implements the Traffic Light privacy system.
 */

import mongoose from 'mongoose';

const privacyRuleSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // What this rule applies to
  scope: {
    manifest_id: String,        // Optional: specific manifest
    domain_id: String,          // Optional: specific domain
    field_id: String,           // Optional: specific field
    field_pattern: String       // Optional: regex pattern for field IDs
  },
  // Privacy tier
  tier: {
    type: String,
    enum: ['GREEN', 'AMBER', 'RED'],
    required: true
  },
  // Human-readable description
  description: {
    type: String,
    required: true
  },
  // Additional conditions for access
  access_conditions: {
    requires_role: [String],    // Roles that can access
    requires_purpose: Boolean,  // Must provide purpose
    requires_two_key: Boolean,  // Requires dual authorization
    max_access_count: Number    // Limit accesses per time period
  },
  // Metadata
  created_by: String,
  is_active: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// Index for efficient rule lookup
privacyRuleSchema.index({ 'scope.manifest_id': 1, 'scope.domain_id': 1, 'scope.field_id': 1 });

/**
 * Get privacy tier for a specific field
 */
privacyRuleSchema.statics.getTierForField = async function(manifestId, domainId, fieldId) {
  // Check for specific field rule first
  let rule = await this.findOne({
    'scope.manifest_id': manifestId,
    'scope.domain_id': domainId,
    'scope.field_id': fieldId,
    is_active: true
  });
  
  if (rule) return rule.tier;
  
  // Check for domain-level rule
  rule = await this.findOne({
    'scope.manifest_id': manifestId,
    'scope.domain_id': domainId,
    'scope.field_id': { $exists: false },
    is_active: true
  });
  
  if (rule) return rule.tier;
  
  // Check for pattern-based rules
  const patternRules = await this.find({
    'scope.field_pattern': { $exists: true },
    is_active: true
  });
  
  for (const pr of patternRules) {
    const regex = new RegExp(pr.scope.field_pattern, 'i');
    if (regex.test(fieldId)) {
      return pr.tier;
    }
  }
  
  // Default to GREEN if no rule found
  return 'GREEN';
};

/**
 * Get default tier based on field characteristics
 */
privacyRuleSchema.statics.getDefaultTier = function(fieldId, fieldLabel, fieldType) {
  const id = fieldId.toLowerCase();
  const label = (fieldLabel || '').toLowerCase();
  
  // RED tier patterns (highly sensitive)
  const redPatterns = [
    'clinical', 'mental', 'psychiatric', 'diagnosis', 'medication',
    'substance', 'abuse', 'violence', 'risk', 'suicide', 'self_harm',
    'sexual', 'trauma', 'criminal', 'legal_order', 'protection_order'
  ];
  
  if (redPatterns.some(p => id.includes(p) || label.includes(p))) {
    return 'RED';
  }
  
  // AMBER tier patterns (PII)
  const amberPatterns = [
    'name', 'dob', 'date_of_birth', 'address', 'phone', 'email',
    'contact', 'medicare', 'centrelink', 'tax', 'bank', 'income',
    'employer', 'family', 'next_of_kin', 'emergency_contact'
  ];
  
  if (amberPatterns.some(p => id.includes(p) || label.includes(p))) {
    return 'AMBER';
  }
  
  // Default to GREEN
  return 'GREEN';
};

const PrivacyRule = mongoose.model('PrivacyRule', privacyRuleSchema);

export default PrivacyRule;
