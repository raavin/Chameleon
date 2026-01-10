/**
 * Auth Routes - Chameleon Protocol
 * 
 * Handles user registration, login, and profile management.
 */

import { Router } from 'express';
import User from '../models/User.js';
import { generateToken, requireAuth, requireRole } from '../middleware/authMiddleware.js';
import { logAudit } from '../middleware/auditMiddleware.js';

const router = Router();

/**
 * POST /api/auth/register
 * Create a new user account
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role } = req.body;
    
    // Validation
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Missing required fields: email, password, name' 
      });
    }
    
    if (password.length < 8) {
      return res.status(400).json({ 
        error: 'Password must be at least 8 characters' 
      });
    }
    
    // Check if email already exists
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      return res.status(409).json({ error: 'Email already registered' });
    }
    
    // Create user (first user becomes ADMIN)
    const userCount = await User.countDocuments();
    const assignedRole = userCount === 0 ? 'ADMIN' : (role || 'WORKER');
    
    const user = await User.createUser({
      email,
      password,
      name,
      role: assignedRole
    });
    
    // Generate token
    const token = generateToken(user);
    
    // Log audit
    await logAudit({
      user_id: user.id,
      action: 'USER_REGISTERED',
      entity_type: 'User',
      entity_id: user.id,
      metadata: { email, role: assignedRole }
    });
    
    res.status(201).json({
      token,
      user: user.toPublicJSON()
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed' });
  }
});

/**
 * POST /api/auth/login
 * Authenticate user and return JWT
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    // Find user with password
    const user = await User.findByEmailWithPassword(email);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is disabled' });
    }
    
    // Verify password
    const isValid = await user.verifyPassword(password);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Update last login
    user.last_login = new Date();
    await user.save();
    
    // Generate token
    const token = generateToken(user);
    
    // Log audit
    await logAudit({
      user_id: user.id,
      action: 'USER_LOGIN',
      entity_type: 'User',
      entity_id: user.id,
      metadata: { email }
    });
    
    res.json({
      token,
      user: user.toPublicJSON()
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.userId });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    res.json(user.toPublicJSON());
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * GET /api/auth/users
 * List all users (ADMIN only)
 */
router.get('/users', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const users = await User.find().sort({ created_at: -1 });
    res.json(users.map(u => u.toPublicJSON()));
  } catch (error) {
    console.error('User list error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

/**
 * PATCH /api/auth/users/:id
 * Update user (ADMIN only)
 */
router.patch('/users/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role, is_active, domain_permissions } = req.body;
    
    const user = await User.findOne({ id });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Update allowed fields
    if (name !== undefined) user.name = name;
    if (role !== undefined) user.role = role;
    if (is_active !== undefined) user.is_active = is_active;
    if (domain_permissions !== undefined) user.domain_permissions = domain_permissions;
    
    await user.save();
    
    // Log audit
    await logAudit({
      user_id: req.user.userId,
      action: 'USER_UPDATED',
      entity_type: 'User',
      entity_id: id,
      metadata: { changes: req.body }
    });
    
    res.json(user.toPublicJSON());
  } catch (error) {
    console.error('User update error:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

/**
 * DELETE /api/auth/users/:id
 * Delete user (ADMIN only)
 */
router.delete('/users/:id', requireAuth, requireRole('ADMIN'), async (req, res) => {
  try {
    const { id } = req.params;
    
    // Prevent self-deletion
    if (id === req.user.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const user = await User.findOne({ id });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await User.deleteOne({ id });
    
    // Log audit
    await logAudit({
      user_id: req.user.userId,
      action: 'USER_DELETED',
      entity_type: 'User',
      entity_id: id,
      metadata: { email: user.email }
    });
    
    res.json({ success: true, deleted: id });
  } catch (error) {
    console.error('User deletion error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

/**
 * POST /api/auth/change-password
 * Change user's own password
 */
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { current_password, new_password } = req.body;
    
    if (!current_password || !new_password) {
      return res.status(400).json({ 
        error: 'Current and new password required' 
      });
    }
    
    if (new_password.length < 8) {
      return res.status(400).json({ 
        error: 'New password must be at least 8 characters' 
      });
    }
    
    // Get user with password
    const user = await User.findOne({ id: req.user.userId }).select('+password_hash');
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Verify current password
    const isValid = await user.verifyPassword(current_password);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }
    
    // Update password (will be hashed by pre-save hook)
    user.password_hash = new_password;
    await user.save();
    
    // Log audit
    await logAudit({
      user_id: user.id,
      action: 'PASSWORD_CHANGED',
      entity_type: 'User',
      entity_id: user.id
    });
    
    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Password change error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

export default router;
