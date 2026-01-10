/**
 * User Model - Chameleon Protocol
 * 
 * Stores user accounts with bcrypt-hashed passwords.
 * Supports offline-first auth via JWT tokens.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 12;

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
    this.password_hash = await bcrypt.hash(this.password_hash, SALT_ROUNDS);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * Verify password
 */
userSchema.methods.verifyPassword = async function(password) {
  return bcrypt.compare(password, this.password_hash);
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
    created_at: this.created_at
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
    is_active: true
  });
  
  return user.save();
};

const User = mongoose.model('User', userSchema);

export default User;
