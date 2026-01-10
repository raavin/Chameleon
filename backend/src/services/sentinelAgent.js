/**
 * Sentinel Agent - Chameleon Protocol
 * 
 * Autonomous security monitoring and anomaly detection.
 * Scans audit trail for suspicious patterns and creates alerts.
 */

import { v4 as uuidv4 } from 'uuid';
import AuditTrail from '../models/AuditTrail.js';
import SecurityAlert from '../models/SecurityAlert.js';
import User from '../models/User.js';

// Detection thresholds
const THRESHOLDS = {
  BULK_RED_ACCESS: { count: 10, windowMs: 3600000 },      // 10 RED in 1 hour
  BULK_ANY_ACCESS: { count: 100, windowMs: 3600000 },    // 100 any in 1 hour
  BULK_EXPORT: { count: 5, windowMs: 3600000 },          // 5 exports in 1 hour
  FAILED_LOGINS: { count: 5, windowMs: 600000 },         // 5 in 10 min
  PERMISSION_DENIED: { count: 10, windowMs: 3600000 },   // 10 in 1 hour
};

/**
 * Run all Sentinel checks
 */
export async function runSentinelChecks() {
  console.log('[SENTINEL] Starting security scan...');
  
  const checks = [
    detectBulkAccess,
    detectFailedLogins,
    detectPermissionDenied,
    detectAfterHoursAccess
  ];
  
  const results = {
    timestamp: new Date().toISOString(),
    checksRun: checks.length,
    alertsCreated: 0,
    errors: []
  };
  
  for (const check of checks) {
    try {
      const alertsCreated = await check();
      results.alertsCreated += alertsCreated;
    } catch (err) {
      console.error(`[SENTINEL] Check failed:`, err);
      results.errors.push(err.message);
    }
  }
  
  console.log(`[SENTINEL] Scan complete. ${results.alertsCreated} alerts created.`);
  return results;
}

/**
 * Detect bulk data access
 */
async function detectBulkAccess() {
  const windowStart = new Date(Date.now() - THRESHOLDS.BULK_RED_ACCESS.windowMs);
  let alertsCreated = 0;
  
  // Get access counts by user
  const accessCounts = await AuditTrail.aggregate([
    {
      $match: {
        timestamp: { $gte: windowStart },
        action: { $regex: /ACCESS|READ|VIEW/i }
      }
    },
    {
      $group: {
        _id: '$user_id',
        count: { $sum: 1 },
        events: { $push: { action: '$action', entity_type: '$entity_type', timestamp: '$timestamp' } }
      }
    },
    {
      $match: {
        count: { $gte: THRESHOLDS.BULK_ANY_ACCESS.count }
      }
    }
  ]);
  
  for (const record of accessCounts) {
    // Check if alert already exists for this user recently
    const existingAlert = await SecurityAlert.findOne({
      user_id: record._id,
      alert_type: 'BULK_ACCESS',
      is_resolved: false,
      created_at: { $gte: windowStart }
    });
    
    if (existingAlert) continue;
    
    // Create alert
    const alert = new SecurityAlert({
      id: uuidv4(),
      alert_type: 'BULK_ACCESS',
      severity: record.count > 200 ? 'HIGH' : 'MEDIUM',
      user_id: record._id,
      title: `Bulk data access detected: ${record.count} accesses in 1 hour`,
      description: `User accessed ${record.count} records in the past hour, exceeding threshold of ${THRESHOLDS.BULK_ANY_ACCESS.count}`,
      evidence: {
        action_count: record.count,
        time_window: '1 hour',
        sample_events: record.events.slice(0, 5)
      },
      auto_action: 'ALERTED'
    });
    
    await alert.save();
    alertsCreated++;
    
    console.log(`[SENTINEL] Alert created: Bulk access by ${record._id}`);
  }
  
  return alertsCreated;
}

/**
 * Detect failed login attempts
 */
async function detectFailedLogins() {
  const windowStart = new Date(Date.now() - THRESHOLDS.FAILED_LOGINS.windowMs);
  let alertsCreated = 0;
  
  const failedLogins = await AuditTrail.aggregate([
    {
      $match: {
        timestamp: { $gte: windowStart },
        action: 'LOGIN_FAILED'
      }
    },
    {
      $group: {
        _id: '$user_id',
        count: { $sum: 1 }
      }
    },
    {
      $match: {
        count: { $gte: THRESHOLDS.FAILED_LOGINS.count }
      }
    }
  ]);
  
  for (const record of failedLogins) {
    const existingAlert = await SecurityAlert.findOne({
      user_id: record._id,
      alert_type: 'FAILED_LOGINS',
      is_resolved: false,
      created_at: { $gte: windowStart }
    });
    
    if (existingAlert) continue;
    
    const alert = new SecurityAlert({
      id: uuidv4(),
      alert_type: 'FAILED_LOGINS',
      severity: 'HIGH',
      user_id: record._id,
      title: `Multiple failed login attempts: ${record.count} in 10 minutes`,
      description: `Possible brute force attack detected`,
      evidence: {
        action_count: record.count,
        time_window: '10 minutes'
      },
      auto_action: 'TEMP_LOCKED'
    });
    
    await alert.save();
    alertsCreated++;
    
    // Optionally lock the user
    await lockUser(record._id, 15 * 60 * 1000); // 15 min
  }
  
  return alertsCreated;
}

/**
 * Detect permission denied patterns
 */
async function detectPermissionDenied() {
  const windowStart = new Date(Date.now() - THRESHOLDS.PERMISSION_DENIED.windowMs);
  let alertsCreated = 0;
  
  const deniedCounts = await AuditTrail.aggregate([
    {
      $match: {
        timestamp: { $gte: windowStart },
        action: { $regex: /DENIED|FORBIDDEN|UNAUTHORIZED/i }
      }
    },
    {
      $group: {
        _id: '$user_id',
        count: { $sum: 1 }
      }
    },
    {
      $match: {
        count: { $gte: THRESHOLDS.PERMISSION_DENIED.count }
      }
    }
  ]);
  
  for (const record of deniedCounts) {
    const existingAlert = await SecurityAlert.findOne({
      user_id: record._id,
      alert_type: 'PERMISSION_DENIED',
      is_resolved: false,
      created_at: { $gte: windowStart }
    });
    
    if (existingAlert) continue;
    
    const alert = new SecurityAlert({
      id: uuidv4(),
      alert_type: 'PERMISSION_DENIED',
      severity: 'MEDIUM',
      user_id: record._id,
      title: `Multiple permission denied: ${record.count} in 1 hour`,
      description: `User may be attempting unauthorized access`,
      evidence: {
        action_count: record.count,
        time_window: '1 hour'
      },
      auto_action: 'ALERTED'
    });
    
    await alert.save();
    alertsCreated++;
  }
  
  return alertsCreated;
}

/**
 * Detect after-hours access
 */
async function detectAfterHoursAccess() {
  // Check if current time is after hours (10pm - 6am)
  const hour = new Date().getHours();
  if (hour >= 6 && hour < 22) return 0;
  
  const windowStart = new Date(Date.now() - 3600000); // Last hour
  let alertsCreated = 0;
  
  const afterHoursAccess = await AuditTrail.aggregate([
    {
      $match: {
        timestamp: { $gte: windowStart },
        action: { $regex: /ACCESS|VIEW|READ/i }
      }
    },
    {
      $group: {
        _id: '$user_id',
        count: { $sum: 1 }
      }
    },
    {
      $match: {
        count: { $gte: 5 } // More than 5 accesses after hours
      }
    }
  ]);
  
  for (const record of afterHoursAccess) {
    const existingAlert = await SecurityAlert.findOne({
      user_id: record._id,
      alert_type: 'AFTER_HOURS',
      is_resolved: false,
      created_at: { $gte: windowStart }
    });
    
    if (existingAlert) continue;
    
    const alert = new SecurityAlert({
      id: uuidv4(),
      alert_type: 'AFTER_HOURS',
      severity: 'LOW',
      user_id: record._id,
      title: `After-hours activity detected`,
      description: `User accessed ${record.count} records outside business hours`,
      evidence: {
        action_count: record.count,
        time_window: '1 hour',
        local_hour: hour
      },
      auto_action: 'LOGGED'
    });
    
    await alert.save();
    alertsCreated++;
  }
  
  return alertsCreated;
}

/**
 * Lock a user account temporarily
 */
async function lockUser(userId, durationMs) {
  try {
    const user = await User.findOne({ id: userId });
    if (user) {
      user.is_active = false;
      user.locked_until = new Date(Date.now() + durationMs);
      await user.save();
      console.log(`[SENTINEL] User ${userId} locked for ${durationMs / 1000}s`);
    }
  } catch (err) {
    console.error(`[SENTINEL] Failed to lock user ${userId}:`, err);
  }
}

/**
 * Freeze a user account (requires manual unlock)
 */
export async function freezeUser(userId, reason) {
  try {
    const user = await User.findOne({ id: userId });
    if (user) {
      user.is_active = false;
      user.freeze_reason = reason;
      user.frozen_at = new Date();
      await user.save();
      console.log(`[SENTINEL] User ${userId} frozen: ${reason}`);
      return true;
    }
    return false;
  } catch (err) {
    console.error(`[SENTINEL] Failed to freeze user ${userId}:`, err);
    return false;
  }
}

export default {
  runSentinelChecks,
  freezeUser
};
