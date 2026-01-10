# Sentinel Rules
## Phase 10: Anomaly Detection

**Date:** 2026-01-10  
**Status:** Implementation

---

## Detection Rules

### 1. Bulk Data Access
| Rule | Threshold | Severity | Auto-Action |
|------|-----------|----------|-------------|
| RED tier access | >10 in 1 hour | HIGH | Alert + Review |
| Any data access | >100 in 1 hour | MEDIUM | Alert |
| Export requests | >5 in 1 hour | HIGH | Freeze + Alert |

### 2. Unusual Access Patterns
| Rule | Condition | Severity | Auto-Action |
|------|-----------|----------|-------------|
| After hours | Access 10pm-6am | LOW | Log only |
| Weekend access | Sat/Sun access | LOW | Log only |
| Holiday access | Public holiday | MEDIUM | Alert |

### 3. Suspicious Behavior
| Rule | Condition | Severity | Auto-Action |
|------|-----------|----------|-------------|
| Failed logins | >5 in 10 min | HIGH | Temp lock |
| Permission denied | >10 in 1 hour | MEDIUM | Alert |
| Access denied clients | >5 different clients | HIGH | Alert + Review |

### 4. Consent Violations
| Rule | Condition | Severity | Auto-Action |
|------|-----------|----------|-------------|
| Bypass attempt | Access without consent | CRITICAL | Freeze + Alert |
| Expired consent use | After expiry | MEDIUM | Alert |

---

## Alert Severity Levels

| Level | Description | Response Time |
|-------|-------------|---------------|
| LOW | Informational | Daily review |
| MEDIUM | Potential issue | 4 hour review |
| HIGH | Security concern | 1 hour review |
| CRITICAL | Active threat | Immediate |

---

## Automated Responses

1. **Log Only**: Record in audit trail
2. **Alert**: Notify admin dashboard
3. **Review**: Flag for supervisor review
4. **Temp Lock**: Lock account for 15 min
5. **Freeze**: Disable account until admin review

---

**End of Sentinel Rules**
