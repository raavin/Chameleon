# The Chameleon Protocol: Incremental Implementation Checklist
## From Working MVP to Production Full-Stack Application

---

## 🚨 CRITICAL: INSPECT-FIRST METHODOLOGY

**BEFORE EVERY TASK: INSPECT THE EXISTING IMPLEMENTATION**

This is NOT a greenfield project. You have a working MVP with:
- ✅ Vite React frontend (working)
- ✅ Browser-based storage (working)
- ✅ Internet search integration (working)
- ✅ JSON manifest generation (working)
- ✅ Dynamic form rendering (working)
- ✅ Data persistence with references (working)

**YOUR JOB**: Incrementally upgrade this to a full-stack, offline-capable system WITHOUT breaking what works.

### The Golden Rules

1. **INSPECT FIRST**: Before touching any file, examine what already exists
2. **PRESERVE GOOD CODE**: If something works well, keep it
3. **INCREMENTAL CHANGES**: Make small, testable changes
4. **ALWAYS TEST**: Verify the app still works after each change
5. **OFFLINE-FIRST**: All features must work without internet
6. **MONOREPO AWARE**: Understand the existing directory structure

---

## PHASE 0: DISCOVERY & AUDIT

### 0.1 Map the Existing Codebase
- [x] **INSPECT**: Run `tree -L 3` or `ls -R` to see full directory structure
- [x] **INSPECT**: Identify monorepo structure (NOT a monorepo - single Vite app)
- [x] **DOCUMENT**: Create `EXISTING_ARCHITECTURE.md` noting:
  - Current directory structure
  - Key files and their purposes
  - Dependencies in `package.json`
  - Build scripts in `package.json`
- [x] **INSPECT**: Check if there's a root `package.json` for monorepo management
- [x] **INSPECT**: Identify workspace configuration (NONE - will create in Phase 1)

### 0.2 Understand the Current Data Flow
- [x] **INSPECT**: Find where user input is captured (LandingScreen.tsx → App.tsx → Engine.tsx)
- [x] **INSPECT**: Find the internet search integration code
  - Triggered by: handleBuild() in App.tsx
  - API: Google Gemini with googleSearch tool
  - Results: Stored in manifest.domains[].research_artifacts
- [x] **INSPECT**: Find where JSON manifests are generated
  - Client-side in geminiService.ts
  - Format: Manifest type (see types.ts)
  - Stored in: IndexedDB 'manifests' store
- [x] **INSPECT**: Find the dynamic form renderer
  - Component: Engine.tsx
  - Consumes: Domain from manifest
  - State: React useState (formData)
- [x] **INSPECT**: Find the current data persistence layer
  - Technology: IndexedDB
  - Location: services/dbService.ts
  - Schema: manifests, clients, submissions, research_artifacts
- [x] **DOCUMENT**: Create `DATA_FLOW.md` mapping the complete flow (docs/DATA_FLOW.md)

### 0.3 Audit Current Features & Capabilities
- [x] **TEST**: Run the existing app and create a test form (Build passes ✅)
- [x] **DOCUMENT**: List all working features in `FEATURE_AUDIT.md` (docs/FEATURE_AUDIT.md):
  - ✅ Features that work perfectly: 8 major systems identified
  - ⚠️ Features that work but need improvement: 5 items
  - ❌ Features that are broken or incomplete: 3 items
  - 🔮 Features that are missing but needed: 10 items from blueprint
- [x] **INSPECT**: Check browser DevTools → Application → IndexedDB/LocalStorage
  - Data structures: 4 object stores documented
  - Organization: Key-value with id as keyPath
  - Indexes: None (using getAll)
- [x] **INSPECT**: Review console for any errors or warnings (Only chunk size warning)

### 0.4 Identify Integration Points
- [x] **INSPECT**: Find all places where internet is required
  - Gemini API (manifest generation)
  - Google Search tool (legislation lookup)
  - No CDN resources (bundled)
- [x] **INSPECT**: Identify current authentication (if any)
  - Status: NONE
  - No user management
  - No session handling
  - No access control
- [x] **PLAN**: Document in `INTEGRATION_PLAN.md` (docs/INTEGRATION_PLAN.md):
  - What stays client-side: All UI components
  - What moves to server: dbService operations → Express + MongoDB
  - What needs offline: Submissions, manifests, clients (with sync)
  - Migration strategy: Gradual (Option A)

---

## PHASE 1: MONOREPO SETUP & SERVER FOUNDATION

### 1.1 Establish Monorepo Structure
- [x] **INSPECT**: Check if monorepo structure exists (it didn't)
- [x] **CREATED**: Workspace structure with /frontend and /backend
- [x] **UPDATED**: Root package.json with workspaces configuration
- [x] **MOVED**: All existing React app files to /frontend

### 1.2 Initialize Backend Package
- [x] **CREATE**: `/backend` directory
- [x] **CREATE**: `/backend/package.json` with dependencies
- [x] **CREATE**: `/backend/src` directory
- [x] **CREATE**: `/backend/.env.example` with MongoDB config
- [x] **CREATE**: `/backend/.gitignore`
- [x] **TEST**: Verify monorepo can reference backend from root

### 1.3 Install Server Dependencies
- [x] **INSTALLED**: Express, CORS, dotenv
- [x] **INSTALLED**: mongoose (MongoDB - converted from SQLite)
- [x] **INSTALLED**: uuid
- [x] **INSTALLED**: nodemon (dev dependency)
- [x] **ADDED**: Scripts to `/backend/package.json`

### 1.4 Create Minimal Server
- [x] **CREATE**: `/backend/src/index.js` with Express + MongoDB
- [x] **TEST**: Server starts successfully ✅
- [x] **TEST**: Health endpoint responds ✅
- [x] **TEST**: MongoDB connects ✅

---

## PHASE 2: OFFLINE DATABASE SETUP

**Note:** Converted from SQLite to MongoDB as per user preference.

### 2.1 Inspect Current Browser Storage
- [x] **DOCUMENTED**: IndexedDB structure in Phase 0 (DATA_FLOW.md)
- [x] **DOCUMENTED**: 4 object stores: manifests, clients, submissions, research_artifacts
- [x] **DOCUMENTED**: Data structures and relationships

### 2.2 Design MongoDB Schema Based on Existing Data
- [x] **REVIEWED**: Existing data structures from types.ts
- [x] **DESIGNED**: Mongoose schemas matching IndexedDB structure
- [x] **PRESERVED**: All GOLD features:
  - section_citation (field → library link)
  - cached_content (full legislation text)
  - library (citation database with analysis)
  - is_identity_field (core identifier marking)
  - ui_config.help_text (contextual guidance)

### 2.3 Create MongoDB Models
- [x] **CREATE**: `/backend/src/models/Manifest.js` - Full manifest with domains, fields, library
- [x] **CREATE**: `/backend/src/models/Client.js` - Identity records with virtual submissions
- [x] **CREATE**: `/backend/src/models/Submission.js` - Form submissions linked to clients
- [x] **CREATE**: `/backend/src/models/ResearchArtifact.js` - Standalone research documents
- [x] **CREATE**: `/backend/src/models/index.js` - Central export

### 2.4 Test Database Connection
- [x] **UPDATED**: index.js to import models
- [x] **CREATED**: /api/test-models endpoint
- [x] **VERIFIED**: All models connect and query successfully ✅

---

## PHASE 3: PRESERVE & MIGRATE EXISTING MANIFEST SYSTEM

### 3.1 Audit Existing Manifest Generation
- [x] **DOCUMENTED**: geminiService.ts in Phase 0 (DATA_FLOW.md)
- [x] **DECISION**: Keep manifest generation client-side (AI runs in browser)
- [x] **DECISION**: Server saves generated manifests via POST /api/manifests

### 3.2 Manifest API Routes
- [x] **CREATE**: `/backend/src/routes/manifestRoutes.js`
- [x] **IMPLEMENT**: `GET /api/manifests` - List all manifests
- [x] **IMPLEMENT**: `GET /api/manifests/:id` - Get specific manifest
- [x] **IMPLEMENT**: `GET /api/manifests/region/:region` - Get by region
- [x] **IMPLEMENT**: `POST /api/manifests` - Create/update manifest (upsert)
- [x] **IMPLEMENT**: `DELETE /api/manifests/:id` - Delete manifest
- [x] **TEST**: All routes verified ✅

### 3.3 Client API Routes
- [x] **CREATE**: `/backend/src/routes/clientRoutes.js`
- [x] **IMPLEMENT**: `GET /api/clients` - List with submission counts
- [x] **IMPLEMENT**: `GET /api/clients/:id` - Get with submissions embedded
- [x] **IMPLEMENT**: `POST /api/clients` - Create/update
- [x] **IMPLEMENT**: `PATCH /api/clients/:id` - Update metadata
- [x] **IMPLEMENT**: `DELETE /api/clients/:id` - Delete
- [x] **TEST**: All routes verified ✅

### 3.4 Submission API Routes
- [x] **CREATE**: `/backend/src/routes/submissionRoutes.js`
- [x] **IMPLEMENT**: `GET /api/submissions` - List with filters
- [x] **IMPLEMENT**: `GET /api/submissions/:id` - Get single
- [x] **IMPLEMENT**: `POST /api/submissions` - Create (auto-creates client)
- [x] **IMPLEMENT**: `PATCH /api/submissions/:id` - Update status
- [x] **TEST**: All routes verified ✅

### 3.5 Research Artifact API Routes
- [x] **CREATE**: `/backend/src/routes/artifactRoutes.js`
- [x] **IMPLEMENT**: `GET /api/artifacts` - List (excludes cached_content)
- [x] **IMPLEMENT**: `GET /api/artifacts/:id` - Get with full content
- [x] **IMPLEMENT**: `GET /api/artifacts/search/:query` - Full-text search
- [x] **IMPLEMENT**: `POST /api/artifacts` - Create/update
- [x] **IMPLEMENT**: `DELETE /api/artifacts/:id` - Delete

### 3.6 Server Integration
- [x] **UPDATE**: index.js to mount all routes
- [x] **TEST**: CRUD operations work end-to-end ✅
- [x] **CLEANUP**: Removed test data

---

## PHASE 4: PRESERVE & ENHANCE EXISTING FORM SYSTEM

### 4.1 Create API Service
- [x] **CREATE**: `/frontend/services/api.ts` with typed fetch wrappers
- [x] **IMPLEMENT**: manifestApi (getAll, getById, getByRegion, save, delete)
- [x] **IMPLEMENT**: clientApi (getAll, getById, save, update, delete)
- [x] **IMPLEMENT**: submissionApi (getAll, getById, save, updateStatus)
- [x] **IMPLEMENT**: artifactApi (getAll, getById, search, save, delete)
- [x] **IMPLEMENT**: healthCheck for server status

### 4.2 Update dbService.ts for Server-First with Local Fallback
- [x] **UPDATE**: getAllManifests() - Server first, cache locally, fallback to local
- [x] **UPDATE**: saveManifest() - Save to both server and local
- [x] **UPDATE**: getClients() - Server first with local cache
- [x] **UPDATE**: saveSubmission() - Queue for sync if offline
- [x] **ADD**: pending_sync store in IndexedDB
- [x] **ADD**: syncPendingToServer() for background sync
- [x] **ADD**: getPendingSyncCount() for UI indicator
- [x] **ADD**: isOnline() status check
- [x] **TEST**: Build passes ✅

### 4.3 Form Renderer Audit (from original checklist)
- [x] **PRESERVED**: Engine.tsx remains unchanged (working form renderer)
- [x] **PRESERVED**: All field types supported (text, textarea, select, etc.)
- [x] **PRESERVED**: Legislative citations (section_citation → LegislationViewer)
- [x] **PRESERVED**: Read-only mode for historical review
- [x] **PRESERVED**: Multi-step section navigation

### 4.4 UI Notes for Future Enhancement
- [ ] **TODO**: Ensure case notes use textarea (not text input)
- [ ] **TODO**: Review field type assignments in manifests
- [ ] **TODO**: Verify ResearcherOverlay shows activity correctly

---

## PHASE 5: DATA PERSISTENCE MIGRATION

### 5.1 Audit Existing Data Storage
- [x] **DOCUMENTED**: In Phase 0 (DATA_FLOW.md, EXISTING_ARCHITECTURE.md)
- [x] **IDENTIFIED**: 4 IndexedDB stores (manifests, clients, submissions, research_artifacts)

### 5.2 Design Migration Strategy
- [x] **CHOSE**: Gradual migration (Option A)
- [x] **STRATEGY**: Server-first with local fallback
- [x] **OFFLINE**: Queue pending items for sync when online

### 5.3 Implement Identity Node System (Client Records)
- [x] **IMPLEMENTED**: Client model in MongoDB (Phase 2)
- [x] **IMPLEMENTED**: Client API routes (Phase 3)
- [x] **INTEGRATED**: dbService calls server with fallback (Phase 4)

### 5.4 Implement Satellite Module System (Submissions)
- [x] **IMPLEMENTED**: Submission model in MongoDB (Phase 2)
- [x] **IMPLEMENTED**: Submission API routes (Phase 3)
- [x] **IMPLEMENTED**: Auto-create client on submission (Phase 3)
- [x] **INTEGRATED**: dbService calls server with fallback (Phase 4)

### 5.5 Update Client to Save to Server
- [x] **UPDATED**: dbService.saveSubmission() - saves locally + server
- [x] **UPDATED**: dbService.saveManifest() - saves locally + server
- [x] **PRESERVED**: Local storage still works if server is down
- [x] **TESTED**: Build passes ✅

### 5.6 Create Data Sync System
- [x] **CREATED**: pending_sync IndexedDB store
- [x] **IMPLEMENTED**: syncPendingToServer() method
- [x] **IMPLEMENTED**: getPendingSyncCount() method
- [x] **ADDED**: Sync status indicator in Layout.tsx sidebar
- [x] **ADDED**: Auto-sync every 30 seconds when online
- [x] **VISUAL**: Shows "Server: Connected" or "Server: Offline"
- [x] **VISUAL**: Shows "X items pending sync" when offline
- [x] **TESTED**: Build passes ✅

---

## PHASE 6: AUDIT TRAIL SYSTEM

### 6.1 Create Audit Trail Model (MongoDB)
- [x] **CREATE**: `/backend/src/models/AuditTrail.js`
- [x] **IMPLEMENT**: WORM (Write-Once-Read-Many) schema
- [x] **IMPLEMENT**: SHA-256 hash chain (previous_hash → event_hash)
- [x] **IMPLEMENT**: Static methods: log(), verifyChain(), getLastEntry()
- [x] **IMPLEMENT**: Indexes for efficient querying
- [x] **TESTED**: Hash integrity verified ✅

### 6.2 Audit Middleware
- [x] **CREATE**: `/backend/src/middleware/auditMiddleware.js`
- [x] **IMPLEMENT**: auditMiddleware() for route-level auto-logging
- [x] **IMPLEMENT**: logAudit() for programmatic logging
- [x] **APPLIED**: Added to submissionRoutes (CREATE action)
- [x] **APPLIED**: Added to clientRoutes (ACCESS action)
- [x] **TESTED**: Audit entries created correctly ✅

### 6.3 Audit Trail Query API
- [x] **CREATE**: `/backend/src/routes/auditRoutes.js`
- [x] **IMPLEMENT**: `GET /api/audit/entity/:type/:id` - Entity history
- [x] **IMPLEMENT**: `GET /api/audit/user/:userId` - User activity
- [x] **IMPLEMENT**: `GET /api/audit/recent` - Recent entries
- [x] **IMPLEMENT**: `GET /api/audit/verify` - Chain integrity check
- [x] **IMPLEMENT**: `GET /api/audit/stats` - Audit statistics
- [x] **TESTED**: All endpoints working ✅

### 6.4 Integration
- [x] **UPDATED**: index.js to mount audit routes
- [x] **UPDATED**: models/index.js to export AuditTrail
- [x] **TESTED**: Chain verification passes ✅

---

## PHASE 7: OFFLINE-FIRST AUTHENTICATION

### 7.1 Design Local Authentication System
- [x] **UNDERSTAND**: Auth must work without internet
- [x] **DESIGN**: Local-only auth approach in `AUTH_DESIGN.md`:
  - Option A: Single local admin account
  - Option B: Multiple local users stored in SQLite
  - Option C: Local users + optional remote sync ✅ CHOSEN
- [x] **CHOOSE**: Select approach based on requirements

### 7.2 Implement User Model
- [x] **CREATE**: `/backend/src/models/User.js` (MongoDB schema)
- [x] **IMPLEMENT**: User CRUD operations with bcrypt for passwords
- [x] **IMPLEMENT**: Password hashing with 12 salt rounds
- [x] **IMPLEMENT**: verifyPassword, toPublicJSON methods

### 7.3 JWT-Based Local Auth
- [x] **CREATE**: `/backend/src/middleware/authMiddleware.js`
- [x] **IMPLEMENT**: JWT generation and verification:
  - generateToken(user) - Creates 24h JWT
  - verifyToken(token) - Validates JWT
  - requireAuth - Middleware for protected routes
  - optionalAuth - Middleware for hybrid routes
- [x] **CREATE**: Auth routes (`/backend/src/routes/authRoutes.js`):
  - `POST /api/auth/register` - Create new user (first user is ADMIN)
  - `POST /api/auth/login` - Login and get JWT
  - `GET /api/auth/me` - Get current user info
  - `GET /api/auth/users` - List users (ADMIN only)
  - `PATCH /api/auth/users/:id` - Update user (ADMIN only)
  - `DELETE /api/auth/users/:id` - Delete user (ADMIN only)
  - `POST /api/auth/change-password` - Change own password
- [x] **TEST**: Register user, login, access protected route ✅

### 7.4 Client-Side Auth
- [x] **CREATE**: `/frontend/contexts/AuthContext.tsx`
- [x] **IMPLEMENT**: Auth state management with offline support
  - Token stored in localStorage
  - User cached for offline access
  - Token expiry checked locally
- [x] **CREATE**: Login page component (`/frontend/components/LoginScreen.tsx`)
- [x] **UPDATE**: API client to include token in requests (`/frontend/services/api.ts`)
- [x] **UPDATE**: Layout.tsx to show user info and logout button
- [x] **TEST**: Login and access protected resources ✅

### 7.5 Role-Based Access Control
- [x] **DEFINED**: Roles: ADMIN, SUPERVISOR, WORKER
- [x] **IMPLEMENT**: `requireRole(...roles)` middleware
- [x] **IMPLEMENT**: `requireDomainAccess(domainId)` middleware
- [x] **APPLY**: Protect admin routes (users management)
- [x] **APPLY**: Optional auth to submissions/clients routes
- [x] **TEST**: Access routes with different user roles ✅

---

## PHASE 8: PRIVACY & CONSENT SYSTEM

### 8.1 Design Privacy Tier System
- [x] **INSPECT**: Review existing data to identify sensitivity levels
- [x] **DESIGN**: Map fields/satellites to Privacy Tiers in `PRIVACY_DESIGN.md`:
  - 🟢 GREEN: Public within org (names, appointments)
  - 🟡 AMBER: Requires consent (address, contact)
  - 🔴 RED: Highly sensitive (clinical notes, risk assessments)
- [x] **CREATE**: PrivacyRule model (`/backend/src/models/PrivacyRule.js`)
  - Field-level privacy tier assignment
  - Pattern-based default tier detection
  - Domain and manifest scoping

### 8.2 Implement Privacy Middleware
- [x] **CREATE**: `/backend/src/middleware/privacyMiddleware.js`
- [x] **IMPLEMENT**: `checkPrivacy(req, res, next)` function
- [x] **IMPLEMENT**: `filterByPrivacy(submission, userId, userRole, manifest)` function
- [x] **IMPLEMENT**: `applyPrivacyFilter(getManifest)` middleware
- [x] **IMPLEMENT**: `requireRedAccess` middleware for sensitive data

### 8.3 Consent Management
- [x] **CREATE**: Consent model (`/backend/src/models/Consent.js`)
  - Granular scope (submission, domain, field-level)
  - Time-limited consent with expiry
  - Revocation tracking
  - Access counting and logging
- [x] **CREATE**: `/backend/src/routes/consentRoutes.js`
- [x] **IMPLEMENT**: `POST /api/consent` - Grant consent
- [x] **IMPLEMENT**: `DELETE /api/consent/:id` - Revoke consent
- [x] **IMPLEMENT**: `GET /api/consent/by-client/:clientId` - List consents
- [x] **IMPLEMENT**: `POST /api/consent/check` - Check access permission
- [x] **IMPLEMENT**: `GET /api/consent/my-access` - Get user's granted access

### 8.4 Client-Side Privacy Indicators
- [ ] **TODO**: Add visual privacy tier indicators to Engine.tsx
- [ ] **TODO**: Create consent request UI flow
- [ ] **TODO**: Show redacted field indicators

---

## PHASE 9: TWO-KEY AUTHORIZATION (HIGH-STAKES ACTIONS)

### 9.1 Identify High-Stakes Actions
- [ ] **REVIEW**: What actions require two-key authorization?
  - Fund release
  - Child removal decisions
  - RED tier data access
  - Data deletion
  - Other?
- [ ] **DOCUMENT**: List in `HIGH_STAKES_ACTIONS.md`

### 9.2 Implement Cryptographic Keys
- [ ] **INSTALL**: `npm install node-forge` (for RSA keys)
- [ ] **CREATE**: `/apps/server/src/utils/cryptoKeys.js`
- [ ] **IMPLEMENT**: Key generation and signing:
  ```javascript
  const forge = require('node-forge');
  
  function generateKeyPair() {
    const keypair = forge.pki.rsa.generateKeyPair(2048);
    return {
---

## PHASE 9: TWO-KEY AUTHORIZATION (HIGH-STAKES ACTIONS)

### 9.1 Identify High-Stakes Actions
- [x] **REVIEW**: What actions require two-key authorization
- [x] **DOCUMENT**: List in `HIGH_STAKES_ACTIONS.md`:
  - RED tier data access
  - Child removal decisions
  - Fund release (>$1000)
  - Data deletion
  - Account deactivation
  - Consent override (emergency)
  - Bulk data export

### 9.2 Implement Cryptographic Signatures
- [x] **IMPLEMENT**: HMAC-SHA256 signature generation in TwoKeyAction model
- [x] **CREATE**: `/backend/src/models/TwoKeyAction.js`
  - Action types enum
  - Requester and witness signatures
  - Status workflow (PENDING → APPROVED → EXECUTED)
  - Expiry handling

### 9.3 Two-Key Action Workflow
- [x] **CREATE**: `/backend/src/routes/twoKeyRoutes.js`
- [x] **IMPLEMENT**: Two-key API:
  - `POST /api/two-key/initiate` - Start high-stakes action
  - `GET /api/two-key/pending` - List pending actions for witness
  - `GET /api/two-key/my-actions` - Get user's initiated actions
  - `POST /api/two-key/approve/:id` - Approve with witness signature
  - `POST /api/two-key/reject/:id` - Reject action with reason
  - `POST /api/two-key/cancel/:id` - Cancel own action
  - `POST /api/two-key/execute/:id` - Execute approved action (admin)

### 9.4 Client-Side Two-Key UI
- [ ] **TODO**: Create component for initiating two-key actions
- [ ] **TODO**: Create component for approving pending actions

---

## PHASE 10: SENTINEL AGENT (ANOMALY DETECTION)

### 10.1 Design Anomaly Detection Rules
- [x] **DOCUMENT**: Detection rules in `SENTINEL_RULES.md`:
  - Bulk access (>100 any in 1 hour, >10 RED in 1 hour)
  - After hours (10pm-6am access)
  - Failed logins (>5 in 10 min)
  - Permission denied (>10 in 1 hour)
  - Consent violations

### 10.2 Implement Sentinel Service
- [x] **CREATE**: `/backend/src/services/sentinelAgent.js`
- [x] **IMPLEMENT**: Detection functions:
  - `detectBulkAccess()` - Monitor excessive data access
  - `detectFailedLogins()` - Detect brute force attempts
  - `detectPermissionDenied()` - Monitor authorization failures
  - `detectAfterHoursAccess()` - Flag unusual timing
- [x] **IMPLEMENT**: `runSentinelChecks()` - Run all detection functions

### 10.3 Automated Response System
- [x] **CREATE**: `/backend/src/models/SecurityAlert.js`
  - Alert types and severity levels
  - Auto-action tracking
  - Resolution workflow
- [x] **IMPLEMENT**: `lockUser()` - Temporary account lock
- [x] **IMPLEMENT**: `freezeUser()` - Permanent freeze until admin review

### 10.4 Security Routes
- [x] **CREATE**: `/backend/src/routes/securityRoutes.js`
- [x] **IMPLEMENT**: Security API:
  - `GET /api/security/alerts` - List security alerts
  - `GET /api/security/alerts/unresolved` - Get unresolved counts
  - `POST /api/security/alerts/:id/resolve` - Resolve an alert
  - `POST /api/security/sentinel/run` - Manually trigger scan
  - `POST /api/security/freeze/:userId` - Freeze user account
  - `GET /api/security/stats` - Security statistics

### 10.5 Scheduled Sentinel Runs
- [ ] **TODO**: Install node-cron and add scheduled runs

---

## PHASE 11: CROSS-DOMAIN INTEROPERABILITY

### 11.1 Define Domain Structure
- [ ] **INSPECT**: Review existing domain/module organization
- [ ] **DOCUMENT**: Create domain registry in `DOMAIN_REGISTRY.md`:
  - Domain I: Clinical Health Services
  - Domain II: Mental Health
  - Domain IV: Housing & Stability
  - Domain IX: Roster & Scheduling
  - [List all domains you'll implement]
- [ ] **ASSIGN**: Each domain gets a unique identifier (Roman numerals)

### 11.2 Implement API Gateway
- [ ] **CREATE**: `/apps/server/src/gateway/domainGateway.js`
- [ ] **IMPLEMENT**: Domain router:
  ```javascript
  const domainRoutes = {
    'I': require('./routes/clinicalRoutes'),
    'II': require('./routes/mentalHealthRoutes'),
    'IV': require('./routes/housingRoutes'),
    'IX': require('./routes/rosterRoutes')
  };
  
  app.use('/api/domain/:domainId', (req, res, next) => {
    const router = domainRoutes[req.params.domainId];
    if (!router) return res.status(404).json({ error: 'Domain not found' });
    router(req, res, next);
  });
  ```
- [ ] **TEST**: Access domain-specific routes via gateway

### 11.3 Boolean API for Cross-Domain Queries
- [ ] **CREATE**: `/apps/server/src/gateway/booleanAPI.js`
- [ ] **IMPLEMENT**: Privacy-preserving query endpoints:
  ```javascript
  // Returns boolean, not actual data
  router.get('/verify-immunization/:identityKey', async (req, res) => {
    const hasImmunization = await checkImmunizationStatus(req.params.identityKey);
    res.json({ result: hasImmunization }); // Just true/false
  });
  ```
- [ ] **IMPLEMENT**: Query authorization (only certain domains can query others)
- [ ] **TEST**: Domain VIII queries Domain I for immunization status

### 11.4 Cross-Domain Triggers
- [ ] **CREATE**: Triggers table:
  ```sql
  CREATE TABLE IF NOT EXISTS cross_domain_triggers (
    trigger_id TEXT PRIMARY KEY,
    source_domain TEXT NOT NULL,
    source_condition TEXT NOT NULL, -- JSON
    target_domain TEXT NOT NULL,
    target_action TEXT NOT NULL,
    action_payload TEXT, -- JSON
    active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );
  ```
- [ ] **CREATE**: `/apps/server/src/services/triggerService.js`
- [ ] **IMPLEMENT**: Trigger evaluation on satellite updates
- [ ] **EXAMPLE**: Housing instability → Mental health support task
- [ ] **TEST**: Update housing satellite and verify MH task created

---

## PHASE 12: VERSION MANAGEMENT & EVOLUTION

### 12.1 Implement Manifest Versioning
- [ ] **INSPECT**: Check if manifests are already versioned
- [ ] **ENSURE**: Every manifest has semantic version (v1.0.0)
- [ ] **IMPLEMENT**: Version comparison utility:
  ```javascript
  function compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    // Return -1, 0, or 1
  }
  ```
- [ ] **TEST**: Create multiple versions and compare

### 12.2 Delta Detection Engine
- [ ] **CREATE**: `/apps/server/src/services/deltaEngine.js`
- [ ] **IMPLEMENT**: `compareManifests(oldManifest, newManifest)` function:
  - Identify added fields
  - Identify removed fields
  - Identify modified validations
  - Return delta object
- [ ] **IMPLEMENT**: `generateDeltaManifest(v1, v2)` function
- [ ] **TEST**: Create v1.0.0, modify to v1.1.0, generate delta

### 12.3 Historical Data Preservation
- [ ] **ENSURE**: Satellites store `manifest_version` on creation
- [ ] **IMPLEMENT**: `renderWithHistoricalManifest(satelliteId)` function:
  - Load satellite
  - Load manifest version used at creation
  - Render with historical schema
- [ ] **TEST**: View old satellite with deprecated manifest

### 12.4 Live Delta Migration for Drafts
- [ ] **IMPLEMENT**: `injectDeltaFields(satelliteId)` function:
  - Check if satellite is DRAFT status
  - Check if manifest version is outdated
  - Get delta fields
  - Add new fields (empty) to satellite data
  - Mark new fields with metadata
- [ ] **CREATE**: UI component to highlight new fields
- [ ] **TEST**: Open draft after manifest update, verify new fields appear

---

## PHASE 13: TESTING & QUALITY ASSURANCE

### 13.1 Set Up Testing Framework
- [ ] **INSTALL**: Server tests: `npm install --save-dev jest supertest`
- [ ] **INSTALL**: Client tests: Check if Vite already has Vitest configured
- [ ] **CREATE**: `/apps/server/tests` directory
- [ ] **CREATE**: `/apps/client/src/__tests__` directory
- [ ] **ADD**: Test scripts to package.json

### 13.2 Unit Tests - Server
- [ ] **TEST**: Identity Node CRUD operations
- [ ] **TEST**: Satellite Module CRUD operations
- [ ] **TEST**: Manifest hydration functions
- [ ] **TEST**: Audit trail creation and chain integrity
- [ ] **TEST**: Privacy tier enforcement
- [ ] **TEST**: Two-key signature verification
- [ ] **TARGET**: 70%+ code coverage on server

### 13.3 Unit Tests - Client
- [ ] **INSPECT**: Existing client tests (if any)
- [ ] **TEST**: Form renderer with different field types
- [ ] **TEST**: Conditional logic evaluation
- [ ] **TEST**: Client-side validation
- [ ] **TEST**: API client functions
- [ ] **TARGET**: 60%+ code coverage on client

### 13.4 Integration Tests
- [ ] **TEST**: Complete form submission flow (client → server → database)
- [ ] **TEST**: Manifest generation → save → load → render
- [ ] **TEST**: Auth flow: register → login → access protected route
- [ ] **TEST**: Consent flow: grant → access data → revoke → block
- [ ] **TEST**: Two-key flow: initiate → approve → execute
- [ ] **TARGET**: All critical user journeys covered

### 13.5 Offline Testing
- [ ] **TEST**: Submit form with server stopped (saves locally)
- [ ] **TEST**: Restart server and verify auto-sync
- [ ] **TEST**: Load manifest while offline (uses cache)
- [ ] **TEST**: Auth persists across offline periods
- [ ] **TARGET**: All core features work offline

### 13.6 Security Testing
- [ ] **TEST**: SQL injection attempts (should be prevented by parameterized queries)
- [ ] **TEST**: XSS attempts (should be prevented by React)
- [ ] **TEST**: Audit trail immutability (try to modify/delete entries)
- [ ] **TEST**: Privacy tier enforcement (try to bypass)
- [ ] **TEST**: JWT expiration and validation
- [ ] **TARGET**: Zero critical vulnerabilities

---

## PHASE 14: PERFORMANCE OPTIMIZATION

### 14.1 Database Optimization
- [ ] **ANALYZE**: Run `EXPLAIN QUERY PLAN` on common queries
- [ ] **ADD**: Missing indexes based on query patterns
- [ ] **IMPLEMENT**: Database connection pooling (if not already)
- [ ] **TEST**: Query performance with 1000+ records
- [ ] **TARGET**: <50ms for most queries

### 14.2 API Response Optimization
- [ ] **IMPLEMENT**: Response compression (gzip)
- [ ] **IMPLEMENT**: Pagination for list endpoints
- [ ] **IMPLEMENT**: Field selection (only return requested fields)
- [ ] **TEST**: Load time for large datasets
- [ ] **TARGET**: <200ms response time for 95% of requests

### 14.3 Client Performance
- [ ] **INSPECT**: Current bundle size
- [ ] **IMPLEMENT**: Code splitting for large components
- [ ] **IMPLEMENT**: Lazy loading for routes
- [ ] **OPTIMIZE**: Images and assets
- [ ] **TEST**: Lighthouse audit
- [ ] **TARGET**: 90+ Lighthouse performance score

### 14.4 Caching Strategy
- [ ] **IMPLEMENT**: Manifest caching (manifests rarely change)
- [ ] **IMPLEMENT**: Identity Node caching with TTL
- [ ] **IMPLEMENT**: Browser cache for static assets
- [ ] **TEST**: Verify cache hits reduce database queries
- [ ] **TARGET**: 70%+ cache hit rate

---

## PHASE 15: DEPLOYMENT PREPARATION

### 15.1 Environment Configuration
- [ ] **CREATE**: `/apps/server/.env.production.example`
- [ ] **DOCUMENT**: All required environment variables in `DEPLOYMENT.md`
- [ ] **CREATE**: Production-ready `.env` template
- [ ] **TEST**: App runs with production environment variables

### 15.2 Build Scripts
- [ ] **CREATE**: Root-level build script:
  ```json
  "scripts": {
    "build": "npm run build:client && npm run build:server",
    "build:client": "cd apps/client && npm run build",
    "build:server": "cd apps/server && npm run build",
    "start": "node apps/server/src/index.js"
  }
  ```
- [ ] **TEST**: Run production build
- [ ] **TEST**: Start production server

### 15.3 Database Migration Scripts
- [ ] **CREATE**: `/apps/server/migrations` directory
- [ ] **CREATE**: Migration runner script
- [ ] **IMPLEMENT**: Migration versioning system
- [ ] **TEST**: Run migrations on fresh database

### 15.4 Backup System
- [ ] **CREATE**: Database backup script:
  ```bash
  #!/bin/bash
  DATE=$(date +%Y%m%d_%H%M%S)
  sqlite3 ./data/chameleon.db ".backup ./backups/chameleon_$DATE.db"
  ```
- [ ] **SCHEDULE**: Automated daily backups (cron or systemd timer)
- [ ] **TEST**: Restore from backup successfully

### 15.5 Monitoring & Logging
- [ ] **IMPLEMENT**: Structured logging (Winston or Pino)
- [ ] **CREATE**: Log rotation strategy
- [ ] **IMPLEMENT**: Error tracking (local or service like Sentry)
- [ ] **CREATE**: Health check endpoint: `GET /health`
- [ ] **TEST**: Logs are captured and rotated properly

---

## PHASE 16: DOCUMENTATION

### 16.1 Technical Documentation
- [ ] **UPDATE**: `README.md` with complete setup instructions
- [ ] **CREATE**: `ARCHITECTURE.md` explaining the system design
- [ ] **CREATE**: `API_DOCUMENTATION.md` listing all endpoints
- [ ] **CREATE**: `DATABASE_SCHEMA.md` documenting all tables
- [ ] **CREATE**: `DEVELOPMENT_GUIDE.md` for new developers

### 16.2 User Documentation
- [ ] **CREATE**: User manual for form submission
- [ ] **CREATE**: Admin guide for manifest management
- [ ] **CREATE**: Guide for consent management
- [ ] **CREATE**: FAQ document
- [ ] **CREATE**: Troubleshooting guide

### 16.3 Deployment Documentation
- [ ] **CREATE**: `DEPLOYMENT.md` with step-by-step instructions
- [ ] **DOCUMENT**: Server requirements (Node version, SQLite, etc.)
- [ ] **DOCUMENT**: Environment setup
- [ ] **DOCUMENT**: Backup and restore procedures
- [ ] **CREATE**: Quick start guide for production deployment

---

## PHASE 17: PRODUCTION LAUNCH

### 17.1 Pre-Launch Checklist
- [ ] ✅ All tests passing (unit, integration, E2E)
- [ ] ✅ Security audit complete (zero critical vulnerabilities)
- [ ] ✅ Performance targets met (<200ms API, 90+ Lighthouse)
- [ ] ✅ Offline mode working (forms, auth, sync)
- [ ] ✅ Audit trail integrity verified
- [ ] ✅ Privacy tiers enforced
- [ ] ✅ Two-key authorization tested
- [ ] ✅ Sentinel agent running
- [ ] ✅ Backup system operational
- [ ] ✅ Documentation complete
- [ ] ✅ Migration from browser storage tested
- [ ] ✅ Existing MVP functionality preserved

### 17.2 Beta Testing
- [ ] **RECRUIT**: 5-10 beta testers
- [ ] **TRAIN**: Provide user documentation
- [ ] **MONITOR**: Error rates and performance
- [ ] **COLLECT**: Feedback via form or interviews
- [ ] **ITERATE**: Fix bugs and improve UX
- [ ] **TARGET**: 85%+ user satisfaction

### 17.3 Data Migration from Browser Storage
- [ ] **CREATE**: Migration utility script
- [ ] **IMPLEMENT**: Export from IndexedDB/LocalStorage
- [ ] **IMPLEMENT**: Import to SQLite
- [ ] **VERIFY**: Data integrity after migration
- [ ] **TEST**: Old forms still render correctly
- [ ] **BACKUP**: Browser storage before clearing

### 17.4 Production Deployment
- [ ] **BACKUP**: Current browser storage data
- [ ] **DEPLOY**: Server to production environment
- [ ] **CONFIGURE**: Production environment variables
- [ ] **RUN**: Database migrations
- [ ] **START**: Server with process manager (PM2 or systemd)
- [ ] **VERIFY**: Health check endpoint responds
- [ ] **MIGRATE**: Data from browser storage to server
- [ ] **TEST**: End-to-end user flows in production

### 17.5 Post-Launch Monitoring
- [ ] **MONITOR**: Error rates (target: <0.1%)
- [ ] **MONITOR**: API response times (target: <200ms)
- [ ] **MONITOR**: Database size and growth
- [ ] **MONITOR**: Audit trail integrity (daily verification)
- [ ] **MONITOR**: Sentinel alerts
- [ ] **REVIEW**: User feedback
- [ ] **TARGET**: 99.5% uptime in first month

---

## COMPLETION CRITERIA

### ✅ The Chameleon Protocol is PRODUCTION-READY when:

1. **✅ Existing MVP Preserved**: All current functionality still works perfectly
2. **✅ Offline-First**: App works without internet connection
3. **✅ Full-Stack**: Client communicates with server via REST API
4. **✅ Data Persistence**: SQLite database stores all data with referential integrity
5. **✅ Identity System**: Identity Nodes anchor all data with zero duplication
6. **✅ Audit System**: Immutable audit trail logs every data access
7. **✅ Manifest System**: JSON manifests define dynamic forms
8. **✅ Privacy System**: Traffic Light tiers enforce data access control
9. **✅ Auth System**: Local JWT-based authentication works offline
10. **✅ Consent System**: Users can grant/revoke data access
11. **✅ Two-Key System**: High-stakes actions require dual authorization
12. **✅ Sentinel System**: Anomaly detection monitors suspicious activity
13. **✅ Cross-Domain**: Domains communicate via Boolean APIs
14. **✅ Versioning**: Historical data preserved across manifest updates
15. **✅ Testing**: 70%+ coverage, zero critical vulnerabilities
16. **✅ Performance**: <200ms API, 90+ Lighthouse, <2s page load
17. **✅ Documentation**: Complete technical and user docs
18. **✅ Deployment**: Production-ready with backups and monitoring
19. **✅ Migration**: Browser storage data successfully migrated to server
20. **✅ Beta Tested**: Users trained and satisfied

---

## 🚨 FINAL REMINDERS FOR AI AGENT

### Before Every Single Task:

1. **INSPECT**: Look at the existing code first
2. **UNDERSTAND**: Figure out how it currently works
3. **PLAN**: Decide if you're keeping, enhancing, or replacing
4. **DOCUMENT**: Write down what you found
5. **PRESERVE**: Don't break what works
6. **TEST**: Verify functionality after changes
7. **COMMIT**: Save your work with clear commit messages

### Communication Protocol:

- If existing code is unclear: **ASK** before modifying
- If you're unsure about approach: **ASK** before proceeding
- If you find a better way: **SUGGEST** and explain why
- If something is broken: **REPORT** and propose fix
- If a task is too vague: **REQUEST** clarification

### Priorities:

1. **PRESERVE FUNCTIONALITY** (don't break what works)
2. **OFFLINE-FIRST** (everything must work without internet)
3. **INCREMENTAL** (small changes, frequent tests)
4. **SECURITY** (never skip security measures)
5. **AUDIT TRAIL** (log everything)
6. **USER EXPERIENCE** (keep it simple and delightful)

---

**START HERE**: 
1. Read through Phase 0 completely
2. Execute Phase 0.1: Map the Existing Codebase
3. Report your findings before proceeding to Phase 1

**Good luck building The Chameleon Protocol! 🦎**
