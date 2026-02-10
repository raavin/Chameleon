/**
 * User Model - Chameleon Protocol
 * 
 * Stores user accounts with argon2id-hashed passwords.
 */

import mongoose from 'mongoose';
import argon2 from 'argon2';

const userSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true,
    index: true
  },
  password_hash: {
    type: String,
    required: true,
    select: false  // Don't include in queries by default
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  role: {
    type: String,
    enum: ['ADMIN', 'SUPERVISOR', 'WORKER'],
    default: 'WORKER'
  },
  domain_permissions: [{
    type: String  // Domain IDs this user can access
  }],
  is_active: {
    type: Boolean,
    default: true
  },
  last_login: {
    type: Date
  },
  preferences: {
    manifest_order: [String],
    archived_manifest_ids: [String],
    archived_artifact_ids: [String]
  }
}, {
  timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' }
});

/**
 * Hash password before saving
 */
userSchema.pre('save', async function(next) {
  // Only hash if password is modified
  if (!this.isModified('password_hash')) {
    return next();
  }
  
  try {
    this.password_hash = await argon2.hash(this.password_hash, {
      type: argon2.argon2id
    });
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Verify password
 */
userSchema.methods.verifyPassword = async function(password) {
  return argon2.verify(this.password_hash, password);
};

/**
 * Get public user object (without password)
 */
userSchema.methods.toPublicJSON = function() {
  return {
    id: this.id,
    email: this.email,
    name: this.name,
    role: this.role,
    domain_permissions: this.domain_permissions,
    is_active: this.is_active,
    last_login: this.last_login,
    created_at: this.created_at,
    preferences: this.preferences || {
      manifest_order: [],
      archived_manifest_ids: [],
      archived_artifact_ids: []
    }
  };
};

/**
 * Static: Find by email with password
 */
userSchema.statics.findByEmailWithPassword = function(email) {
  return this.findOne({ email: email.toLowerCase() }).select('+password_hash');
};

/**
 * Static: Create user with hashed password
 */
userSchema.statics.createUser = async function(userData) {
  const { v4: uuidv4 } = await import('uuid');
  
  const user = new this({
    id: userData.id || uuidv4(),
    email: userData.email,
    password_hash: userData.password,  // Will be hashed by pre-save hook
    name: userData.name,
    role: userData.role || 'WORKER',
    domain_permissions: userData.domain_permissions || [],
    is_active: true,
    preferences: userData.preferences || {
      manifest_order: [],
      archived_manifest_ids: [],
      archived_artifact_ids: []
    }
  });
  
  return user.save();
};

const User = mongoose.model('User', userSchema);

export default User;
