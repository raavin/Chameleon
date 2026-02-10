import AuditTrail from '../models/AuditTrail.js';

/**
 * Audit Middleware - Automatically logs data access and modifications
 * 
 * Usage: Apply to routes that need auditing
 * 
 * Example:
 *   router.get('/:id', auditMiddleware('manifest', 'READ'), async (req, res) => {...})
 *   router.post('/', auditMiddleware('submission', 'CREATE'), async (req, res) => {...})
 */
export function auditMiddleware(entityType, action) {
  return async (req, res, next) => {
    // Capture original json method
    const originalJson = res.json.bind(res);
    
    // Override json to log after response
    res.json = async function(data) {
      // Log the audit entry after sending response
      setImmediate(async () => {
        try {
          await AuditTrail.log({
            user_id: req.user?.id || req.headers['x-user-id'] || 'anonymous',
            entity_type: entityType,
            entity_id: req.params.id || data?.id || null,
            action: action,
            metadata: {
              ip_address: req.ip || req.connection?.remoteAddress,
              user_agent: req.headers['user-agent'],
              endpoint: req.originalUrl,
              method: req.method,
              status_code: res.statusCode
            }
          });
        } catch (err) {
          console.error('Audit logging failed:', err.message);
        }
      });
      
      return originalJson(data);
    };
    
    next();
  };
}

/**
 * Audit logger for manual logging (e.g., in service functions)
 */
export async function logAudit(params) {
  const {
    userId = 'system',
    entityType,
    entityId,
    action,
    metadata = {}
  } = params;
  
  try {
    return await AuditTrail.log({
      user_id: userId,
      entity_type: entityType,
      entity_id: entityId,
      action: action,
      metadata
    });
  } catch (err) {
    console.error('Audit logging failed:', err.message);
    return null;
  }
}

export default auditMiddleware;
