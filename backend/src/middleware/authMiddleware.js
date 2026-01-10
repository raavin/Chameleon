/**
 * Auth Middleware - Chameleon Protocol
 * 
 * JWT-based authentication for offline-first system.
 * Validates tokens and attaches user to request.
 */

import jwt from 'jsonwebtoken';
import User from '../models/User.js';

const JWT_SECRET = process.env.JWT_SECRET || 'chameleon-dev-secret-change-in-production';
const JWT_EXPIRY = '24h';

/**
 * Generate JWT token for user
 */
export function generateToken(user) {
  const payload = {
    userId: user.id,
    email: user.email,
    role: user.role,
    name: user.name
  };
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

/**
 * Auth middleware - Requires valid JWT
 */
export function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return res.status(401).json({ error: 'No authorization header' });
    }
    
    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return res.status(401).json({ error: 'Invalid authorization format' });
    }
    
    const token = parts[1];
    const decoded = verifyToken(token);
    
    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(401).json({ error: 'Authentication failed' });
  }
}

/**
 * Optional auth - Attaches user if token present, continues if not
 */
export function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader) {
      return next();
    }
    
    const parts = authHeader.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      const decoded = verifyToken(parts[1]);
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Token invalid, continue without user
    next();
  }
}

/**
 * Role-based access control middleware
 * @param {string[]} allowedRoles - Array of roles that can access this route
 */
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

/**
 * Domain access control middleware
 * Checks if user has permission to access a specific domain
 */
export async function requireDomainAccess(req, res, next) {
  const domainId = req.params.domainId || req.body?.domain_id;
  
  if (!domainId) {
    return next();  // No domain specified, skip check
  }
  
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  // ADMIN has access to all domains
  if (req.user.role === 'ADMIN') {
    return next();
  }
  
  // Get full user from database to check domain_permissions
  try {
    const user = await User.findOne({ id: req.user.userId });
    
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    // Empty domain_permissions means access to all
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
  generateToken,
  verifyToken,
  requireAuth,
  optionalAuth,
  requireRole,
  requireDomainAccess
};
