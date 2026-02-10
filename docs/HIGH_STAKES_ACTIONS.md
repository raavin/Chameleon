# High-Stakes Actions
## Phase 9: Two-Key Authorization

**Date:** 2026-01-10  
**Status:** Implementation

---

## Actions Requiring Two-Key Authorization

Based on the Master Blueprint's "Panopticon of Integrity":

| Action | Risk Level | Required Approvers |
|--------|------------|-------------------|
| RED tier data access | HIGH | Worker + Supervisor |
| Child removal decision | CRITICAL | Worker + Manager + Legal |
| Fund release (>$1000) | HIGH | Worker + Finance |
| Data deletion | CRITICAL | Admin + Supervisor |
| Account deactivation | HIGH | Admin + Admin |
| Consent override (emergency) | HIGH | Worker + Supervisor |
| Export bulk data | HIGH | Admin + Supervisor |

---

## Two-Key Workflow

```
1. REQUESTER initiates action with digital signature
2. System creates pending action with:
   - Action type
   - Target resource
   - Requester's signature
   - Expiry time (default 24h)
3. WITNESS receives notification
4. WITNESS reviews and approves with their signature
5. System verifies both signatures
6. Action is executed
7. Full audit trail recorded
```

---

## Signature Scheme

Using HMAC-SHA256 for simplicity (can upgrade to RSA for production):

```javascript
signature = HMAC-SHA256(
  actionId + userId + timestamp + actionType + targetResource,
  user_secret_key
)
```

Each user has a `secret_key` derived from their password hash.

---

## Action States

| State | Description |
|-------|-------------|
| PENDING | Awaiting witness approval |
| APPROVED | Both signatures verified, ready to execute |
| EXECUTED | Action completed successfully |
| REJECTED | Witness rejected the action |
| EXPIRED | Approval window passed |
| CANCELLED | Requester cancelled |

---

## API Endpoints

- `POST /api/two-key/initiate` - Start high-stakes action
- `GET /api/two-key/pending` - List pending actions for approval
- `POST /api/two-key/approve/:id` - Approve with witness signature
- `POST /api/two-key/reject/:id` - Reject action
- `POST /api/two-key/cancel/:id` - Cancel own action
- `GET /api/two-key/:id` - Get action details

---

**End of High-Stakes Actions Documentation**
