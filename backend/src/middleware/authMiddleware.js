/**
 * Auth Middleware - Chameleon Protocol
 *
 * Session-based authentication via Passport.
 */

import User from '../models/User.js';

export function requireAuth(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({ error: 'Authentication required' });
}

export function optionalAuth(req, res, next) {
  return next();
}

export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Insufficient permissions',
        required: allowedRoles,
        current: req.user.role
      });
    }

    next();
  };
}

export async function requireDomainAccess(req, res, next) {
  const domainId = req.params.domainId || req.body?.domain_id;

  if (!domainId) {
    return next();
  }

  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.user.role === 'ADMIN') {
    return next();
  }

  try {
    const user = await User.findOne({ id: req.user.id });

    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }

    if (!user.domain_permissions || user.domain_permissions.length === 0) {
      return next();
    }

    if (!user.domain_permissions.includes(domainId)) {
      return res.status(403).json({
        error: 'No access to this domain',
        domain: domainId
      });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: 'Domain access check failed' });
  }
}

export default {
  requireAuth,
  optionalAuth,
  requireRole,
  requireDomainAccess
};
