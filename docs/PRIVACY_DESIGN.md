# Privacy & Consent Design
## Phase 8: Traffic Light Privacy System

**Date:** 2026-01-10  
**Status:** Implementation

---

## Privacy Tier System (Traffic Light)

Based on the Master Blueprint's "Panopticon of Integrity", we implement a three-tier privacy system:

| Tier | Color | Sensitivity | Access Logic |
|------|-------|-------------|--------------|
| 🟢 GREEN | Green | Administrative | Visible to all authenticated users within org |
| 🟡 AMBER | Amber | Consent-Based | Requires explicit consent from data subject |
| 🔴 RED | Red | Sovereign/Sanctuary | Requires consent + elevated authorization |

---

## Field-Level Privacy

Each field in a manifest can have a privacy tier:

```javascript
{
  id: "clinical_notes",
  label: "Clinical Notes",
  type: "textarea",
  privacy_tier: "RED",  // NEW: Privacy classification
  // ...
}
```

### Default Tiers by Field Type

| Field Pattern | Default Tier | Rationale |
|---------------|--------------|-----------|
| Name, DOB, Contact | AMBER | PII requires consent |
| Address, Phone, Email | AMBER | Contact information |
| Clinical notes, Risk assessment | RED | Highly sensitive |
| Appointment dates, Status | GREEN | Administrative |
| Mental health, Substance use | RED | Protected health info |
| Financial information | AMBER | Sensitive but shareable |

---

## Consent Model

```javascript
{
  id: "uuid",
  identity_key: "client_id",        // The person granting consent
  granted_to_user_id: "user_id",    // Who can access
  granted_to_role: "SUPERVISOR",    // OR role-based access
  scope: {
    satellite_id: "submission_id",  // Specific submission
    domain_id: "domain_id",         // OR entire domain
    field_ids: ["field1", "field2"] // OR specific fields
  },
  tier_access: "AMBER",             // Max tier accessible
  granted_at: "ISO date",
  expires_at: "ISO date",           // Optional expiry
  purpose: "Case review",           // Why access was granted
  is_revoked: false,
  revoked_at: null
}
```

---

## Access Control Flow

```
1. User requests data (submission/client)
2. System checks user's role and auth
3. For each field in response:
   a. Get field's privacy_tier
   b. If GREEN → include
   c. If AMBER → check for valid consent
   d. If RED → check consent + role (SUPERVISOR/ADMIN)
4. Redact fields without proper authorization
5. Log access to audit trail
```

---

## API Endpoints

### Privacy Rules
- `GET /api/privacy/rules` - List all privacy rules
- `POST /api/privacy/rules` - Create privacy rule
- `PUT /api/privacy/rules/:id` - Update rule

### Consent Management
- `GET /api/consent/by-client/:clientId` - List consents for client
- `POST /api/consent` - Grant consent
- `DELETE /api/consent/:id` - Revoke consent
- `GET /api/consent/check` - Check if access is permitted

---

## UI Indicators

### Field Display
- 🟢 Green dot: Public field
- 🟡 Amber dot: Consent-required field
- 🔴 Red dot: Restricted field (with lock icon if no access)

### Access Status
- ✓ Full access (with consent info)
- 🔒 Redacted (no consent)
- ⏰ Pending consent request

---

## Implementation Order

1. Create PrivacyRule model
2. Create Consent model
3. Create privacy middleware
4. Update submission routes with privacy filtering
5. Add consent API routes
6. Update Engine.tsx with privacy indicators
7. Create consent request UI

---

**End of Privacy Design**
