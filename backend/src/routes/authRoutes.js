/**
 * Auth Routes - Chameleon Protocol
 * 
 * Handles user registration, login, and profile management.
 */

import { Router } from 'express';
import passport from 'passport';
import User from '../models/User.js';
import { requireAuth, requireRole } from '../middleware/authMiddleware.js';
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
    
    // Log audit
    await logAudit({
      user_id: user.id,
      action: 'USER_REGISTERED',
      entity_type: 'User',
      entity_id: user.id,
      metadata: { email, role: assignedRole }
    });
    
    req.login(user, (err) => {
      if (err) {
        console.error('Registration login error:', err);
        return res.status(500).json({ error: 'Failed to start session' });
      }
      return res.status(201).json({
        user: user.toPublicJSON()
      });
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
router.post('/login', (req, res, next) => {
  passport.authenticate('local', async (err, user, info) => {
    try {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ error: info?.message || 'Invalid credentials' });
      }

      req.login(user, async (loginErr) => {
        if (loginErr) return next(loginErr);

        await logAudit({
          user_id: user.id,
          action: 'USER_LOGIN',
          entity_type: 'User',
          entity_id: user.id,
          metadata: { email: user.email }
        });

        return res.json({ user: user.toPublicJSON ? user.toPublicJSON() : user });
      });
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ error: 'Login failed' });
    }
  })(req, res, next);
});

/**
 * GET /api/auth/me
 * Get current user profile
 */
router.get('/me', requireAuth, async (req, res) => {
  try {
    const user = await User.findOne({ id: req.user.id });
    
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
      user_id: req.user.id,
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
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }
    
    const user = await User.findOne({ id });
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    await User.deleteOne({ id });
    
    // Log audit
    await logAudit({
      user_id: req.user.id,
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
    const user = await User.findOne({ id: req.user.id }).select('+password_hash');
    
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

/**
 * POST /api/auth/logout
 * Destroy current session
 */
router.post('/logout', requireAuth, (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    req.session.destroy((destroyErr) => {
      if (destroyErr) {
        return res.status(500).json({ error: 'Failed to destroy session' });
      }
      res.clearCookie('chameleon.sid');
      return res.json({ success: true });
    });
  });
});

/**
 * PATCH /api/auth/preferences
 * Update current user's preferences
 */
router.patch('/preferences', requireAuth, async (req, res) => {
  try {
    const { manifest_order, archived_manifest_ids, archived_artifact_ids } = req.body;
    const updates = {};

    if (manifest_order !== undefined) {
      if (!Array.isArray(manifest_order)) {
        return res.status(400).json({ error: 'manifest_order must be an array' });
      }
      updates['preferences.manifest_order'] = manifest_order;
    }

    if (archived_manifest_ids !== undefined) {
      if (!Array.isArray(archived_manifest_ids)) {
        return res.status(400).json({ error: 'archived_manifest_ids must be an array' });
      }
      updates['preferences.archived_manifest_ids'] = archived_manifest_ids;
    }

    if (archived_artifact_ids !== undefined) {
      if (!Array.isArray(archived_artifact_ids)) {
        return res.status(400).json({ error: 'archived_artifact_ids must be an array' });
      }
      updates['preferences.archived_artifact_ids'] = archived_artifact_ids;
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No preferences provided' });
    }

    const user = await User.findOneAndUpdate(
      { id: req.user.id },
      { $set: updates },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.toPublicJSON());
  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

export default router;
