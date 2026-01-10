import mongoose from 'mongoose';
import crypto from 'crypto';

/**
 * Audit Trail Schema - WORM (Write-Once-Read-Many) Audit Log
 * 
 * Each entry is cryptographically linked to the previous entry,
 * creating an immutable chain that cannot be tampered with.
 * 
 * Features:
 * - Hash chain linking (previous_hash → current_hash)
 * - Non-deletable entries (no delete operations exposed)
 * - Comprehensive event logging
 */
const AuditTrailSchema = new mongoose.Schema({
  // Unique hash of this event (serves as ID)
  event_hash: { 
    type: String, 
    required: true, 
    unique: true,
    index: true
  },
  
  // Link to previous event (creates the chain)
  previous_hash: { 
    type: String, 
    default: 'GENESIS' 
  },
  
  // Who performed the action
  user_id: { 
    type: String, 
    default: 'system' 
  },
  
  // What entity was affected
  entity_type: { 
    type: String, 
    required: true,
    enum: ['manifest', 'client', 'submission', 'artifact', 'system']
  },
  entity_id: { 
    type: String 
  },
  
  // What action was performed
  action: { 
    type: String, 
    required: true,
    enum: ['CREATE', 'READ', 'UPDATE', 'DELETE', 'ACCESS', 'EXPORT', 'SYNC']
  },
  
  // When it happened
  timestamp: { 
    type: Date, 
    required: true, 
    default: Date.now,
    index: true
  },
  
  // Additional context - use Mixed type for flexibility
  metadata: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, { 
  timestamps: false,  // We manage our own timestamp
  versionKey: false   // No __v field needed
});

// Indexes for common queries
AuditTrailSchema.index({ entity_type: 1, entity_id: 1 });
AuditTrailSchema.index({ user_id: 1, timestamp: -1 });

/**
 * Generate a SHA-256 hash for the event
 * Uses ISO string for timestamp to ensure consistency
 */
AuditTrailSchema.statics.generateHash = function(data) {
  // Normalize timestamp to ISO string for consistent hashing
  const normalizedTimestamp = data.timestamp instanceof Date 
    ? data.timestamp.toISOString() 
    : data.timestamp;
  
  const payload = JSON.stringify({
    previous_hash: data.previous_hash,
    user_id: data.user_id,
    entity_type: data.entity_type,
    entity_id: data.entity_id,
    action: data.action,
    timestamp: normalizedTimestamp,
    metadata: data.metadata || {}
  });
  
  return crypto.createHash('sha256').update(payload).digest('hex');
};

/**
 * Get the most recent audit entry (for chain linking)
 */
AuditTrailSchema.statics.getLastEntry = async function() {
  return this.findOne().sort({ timestamp: -1, _id: -1 }).lean();
};

/**
 * Create a new audit entry with proper chain linking
 */
AuditTrailSchema.statics.log = async function(data) {
  const lastEntry = await this.getLastEntry();
  const previous_hash = lastEntry?.event_hash || 'GENESIS';
  
  const entryData = {
    ...data,
    previous_hash,
    timestamp: data.timestamp || new Date()
  };
  
  const event_hash = this.generateHash(entryData);
  
  const entry = new this({
    ...entryData,
    event_hash
  });
  
  return entry.save();
};

/**
 * Verify the integrity of the audit chain
 * Returns { valid: boolean, brokenAt?: string, checkedCount: number }
 */
AuditTrailSchema.statics.verifyChain = async function(entityType, entityId) {
  const query = {};
  if (entityType) query.entity_type = entityType;
  if (entityId) query.entity_id = entityId;
  
  const entries = await this.find(query).sort({ timestamp: 1, _id: 1 }).lean();
  
  if (entries.length === 0) {
    return { valid: true, checkedCount: 0 };
  }
  
  let expectedPreviousHash = 'GENESIS';
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    // Check chain link
    if (i > 0 && entry.previous_hash !== expectedPreviousHash) {
      return { 
        valid: false, 
        brokenAt: entry.event_hash,
        checkedCount: i,
        error: 'Chain link broken - previous_hash mismatch'
      };
    }
    
    // Verify hash integrity
    const recalculatedHash = this.generateHash({
      previous_hash: entry.previous_hash,
      user_id: entry.user_id,
      entity_type: entry.entity_type,
      entity_id: entry.entity_id,
      action: entry.action,
      timestamp: entry.timestamp,
      metadata: entry.metadata
    });
    
    if (recalculatedHash !== entry.event_hash) {
      return { 
        valid: false, 
        brokenAt: entry.event_hash,
        checkedCount: i,
        error: 'Hash integrity failed - data may have been tampered'
      };
    }
    
    expectedPreviousHash = entry.event_hash;
  }
  
  return { valid: true, checkedCount: entries.length };
};

const AuditTrail = mongoose.model('AuditTrail', AuditTrailSchema);

export default AuditTrail;
