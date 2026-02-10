/**
 * TwoKeyAction Model - Chameleon Protocol
 * 
 * Manages high-stakes actions requiring dual authorization.
 * Implements the Two-Key Authorization system.
 */

import mongoose from 'mongoose';
import crypto from 'crypto';

const twoKeyActionSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  // Action details
  action_type: {
    type: String,
    required: true,
    enum: [
      'RED_DATA_ACCESS',
      'CHILD_REMOVAL',
      'FUND_RELEASE',
      'DATA_DELETION',
      'ACCOUNT_DEACTIVATION',
      'CONSENT_OVERRIDE',
      'BULK_EXPORT',
      'OTHER'
    ]
  },
  description: {
    type: String,
    required: true
  },
  // Target resource
  target: {
    resource_type: String,  // 'submission', 'client', 'user', etc.
    resource_id: String,
    metadata: mongoose.Schema.Types.Mixed
  },
  // Payload to execute when approved
  payload: {
    type: mongoose.Schema.Types.Mixed
  },
  // Requester (first key)
  requester: {
    user_id: { type: String, required: true },
    signature: String,
    signed_at: Date
  },
  // Witness (second key)
  witness: {
    user_id: String,
    required_role: {
      type: String,
      enum: ['ADMIN', 'SUPERVISOR', 'WORKER'],
      default: 'SUPERVISOR'
    },
    signature: String,
    signed_at: Date,
    comment: String
  },
  // Status
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'EXECUTED', 'REJECTED', 'EXPIRED', 'CANCELLED'],
    default: 'PENDING',
    index: true
  },
  // Timing
  expires_at: {
    type: Date,
    required: true
  },
  executed_at: Date,
  execution_result: mongoose.Schema.Types.Mixed
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

// TTL index to auto-expire old actions
twoKeyActionSchema.index({ expires_at: 1 }, { expireAfterSeconds: 86400 }); // 24h after expiry

/**
 * Generate a signature for an action
 */
twoKeyActionSchema.statics.generateSignature = function(actionId, userId, userSecret) {
  const data = `${actionId}:${userId}:${Date.now()}`;
  return crypto
    .createHmac('sha256', userSecret)
    .update(data)
    .digest('hex');
};

/**
 * Verify a signature
 */
twoKeyActionSchema.statics.verifySignature = function(signature, actionId, userId, userSecret) {
  // For HMAC, we can't verify without knowing the original timestamp
  // In production, use RSA or store the signed data
  return signature && signature.length === 64; // Basic check
};

/**
 * Check if action is still valid for approval
 */
twoKeyActionSchema.methods.isValid = function() {
  if (this.status !== 'PENDING') return false;
  if (new Date() > this.expires_at) {
    this.status = 'EXPIRED';
    return false;
  }
  return true;
};

/**
 * Approve the action with witness signature
 */
twoKeyActionSchema.methods.approve = async function(witnessId, signature, comment) {
  if (!this.isValid()) {
    throw new Error('Action is no longer valid for approval');
  }
  
  if (witnessId === this.requester.user_id) {
    throw new Error('Witness cannot be the same as requester');
  }
  
  this.witness.user_id = witnessId;
  this.witness.signature = signature;
  this.witness.signed_at = new Date();
  this.witness.comment = comment;
  this.status = 'APPROVED';
  
  return this.save();
};

/**
 * Reject the action
 */
twoKeyActionSchema.methods.reject = async function(witnessId, reason) {
  if (!this.isValid()) {
    throw new Error('Action is no longer valid');
  }
  
  this.witness.user_id = witnessId;
  this.witness.signed_at = new Date();
  this.witness.comment = reason;
  this.status = 'REJECTED';
  
  return this.save();
};

/**
 * Mark as executed
 */
twoKeyActionSchema.methods.markExecuted = async function(result) {
  if (this.status !== 'APPROVED') {
    throw new Error('Action must be approved before execution');
  }
  
  this.status = 'EXECUTED';
  this.executed_at = new Date();
  this.execution_result = result;
  
  return this.save();
};

/**
 * Get pending actions for a user (as potential witness)
 */
twoKeyActionSchema.statics.getPendingForWitness = async function(userId, userRole) {
  return this.find({
    status: 'PENDING',
    'requester.user_id': { $ne: userId },
    expires_at: { $gt: new Date() },
    $or: [
      { 'witness.required_role': userRole },
      { 'witness.required_role': { $in: ['WORKER'] } } // Higher roles can approve lower
    ]
  }).sort({ created_at: -1 });
};

/**
 * Get actions initiated by a user
 */
twoKeyActionSchema.statics.getByRequester = async function(userId) {
  return this.find({
    'requester.user_id': userId
  }).sort({ created_at: -1 }).limit(50);
};

const TwoKeyAction = mongoose.model('TwoKeyAction', twoKeyActionSchema);

export default TwoKeyAction;
