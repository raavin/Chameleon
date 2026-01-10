# Integration Plan
## Phase 0.4: Migration Strategy for MERN

**Date:** 2026-01-10  
**Status:** Planning Complete

---

## Internet Dependencies

### Currently Required
| Feature | Endpoint | Purpose | Can Work Offline? |
|---------|----------|---------|-------------------|
| Manifest Generation | Google Gemini API | AI-powered schema creation | ❌ No |
| Google Search Tool | Google Search API | Real-time legislation lookup | ❌ No |

### Static/Local
| Feature | Source | Notes |
|---------|--------|-------|
| Research context files | `/research/*.txt` | Bundled at build time |
| Static protocols | `/protocols/*.json` | Fallback manifests |
| All UI rendering | Local React | No network required |
| Form submission | IndexedDB | Browser-local |
| Client management | IndexedDB | Browser-local |

---

## Current Authentication

**Status:** ❌ NONE

- No user login
- No session management
- No access control
- No role-based permissions

**Action for MERN:** Auth is LOW priority per user request. Will implement basic JWT in Phase 7 if needed, but can be skipped initially.

---

## Migration Strategy

### Approach: **Gradual (Option A)**

Keep browser storage working while adding server sync. This ensures:
1. Existing functionality preserved
2. Offline capability maintained
3. Incremental testing possible
4. No "big bang" migration risk

### Step-by-Step Plan

#### Step 1: Add Server (Phase 1)
```
Current:  [Client] ──────► [IndexedDB]
After:    [Client] ──────► [IndexedDB]
                    └────► [Server] ──► [MongoDB]
```

#### Step 2: Server as Primary (Phase 5)
```
Current:  [Client] ──────► [Server] ──► [MongoDB]
                    └────► [IndexedDB] (cache/offline)
```

#### Step 3: Sync Layer (Phase 5.6)
```
Full:     [Client] ◄────► [Sync Service] ◄────► [Server]
                    │                            │
                    ▼                            ▼
               [IndexedDB]                  [MongoDB]
```

---

## What Stays Client-Side

| Component | Reason |
|-----------|--------|
| `Engine.tsx` | Pure UI rendering |
| `LegislationViewer.tsx` | Pure UI display |
| `CRMView.tsx` | Presentation only |
| `ClientDashboard.tsx` | Presentation only |
| `LandingScreen.tsx` | Input collection |
| `ResearcherOverlay.tsx` | Progress display |
| `ManifestInspector.tsx` | JSON viewing |
| `DesignSystem.tsx` | CSS utilities |
| `Layout.tsx` | App wrapper |

---

## What Moves to Server

| Current | Server Equivalent | Priority |
|---------|-------------------|----------|
| `DB.getAllManifests()` | `GET /api/manifests` | 🔴 High |
| `DB.saveManifest()` | `POST /api/manifests` | 🔴 High |
| `DB.getClients()` | `GET /api/clients` | 🔴 High |
| `DB.saveClientDocument()` | `POST /api/clients` | 🔴 High |
| `DB.getSubmissions()` | `GET /api/submissions` | 🔴 High |
| `DB.saveSubmission()` | `POST /api/submissions` | 🔴 High |
| `DB.saveResearchArtifact()` | `POST /api/artifacts` | 🟡 Medium |
| `DB.getResearchArtifacts()` | `GET /api/artifacts` | 🟡 Medium |

---

## What Needs Both (Offline Sync)

| Operation | Offline Behavior | Online Behavior |
|-----------|------------------|-----------------|
| Save submission | Store in IndexedDB queue | Send to server immediately |
| Load manifests | Use cached version | Fetch fresh from server |
| Load clients | Use cached version | Fetch fresh from server |
| Search/filter | Work on cached data | Work on cached data |

---

## API Endpoints to Create

### Phase 1-2: Core CRUD

```
GET    /health                     - Health check
GET    /api/manifests              - List all manifests
GET    /api/manifests/:id          - Get single manifest
POST   /api/manifests              - Create/update manifest
GET    /api/clients                - List all clients
GET    /api/clients/:id            - Get client with submissions
POST   /api/clients                - Create client
PATCH  /api/clients/:id            - Update client
GET    /api/submissions            - List submissions (with filters)
GET    /api/submissions/:id        - Get single submission
POST   /api/submissions            - Create submission
GET    /api/artifacts              - List research artifacts
POST   /api/artifacts              - Create artifact
```

### Phase 6: Audit

```
GET    /api/audit/:entityType/:id  - Get audit trail
POST   /api/audit/verify           - Verify chain integrity
```

### Phase 11: Cross-Domain (Later)

```
GET    /api/domain/:id/query       - Boolean queries
POST   /api/domain/:id/trigger     - Cross-domain triggers
```

---

## Database Schema (MongoDB)

### manifests
```javascript
{
  _id: ObjectId,
  id: String,              // Original UUID
  version: String,
  compiled_at: Date,
  config: {
    currency: String,
    locale: String,
    theme: String,
    region: String
  },
  domains: [{
    id: String,
    title: String,
    sections: Array,
    fields: Array,
    research_artifacts: Array,
    governance_rules: Array,
    subject_identifier_field: String
  }],
  library: Object,
  createdAt: Date,
  updatedAt: Date
}
```

### clients
```javascript
{
  _id: ObjectId,
  id: String,              // Subject ID
  name: String,
  metadata: Object,
  createdAt: Date,
  updatedAt: Date
}
```

### submissions
```javascript
{
  _id: ObjectId,
  id: String,              // UUID
  manifest_id: String,     // FK
  domain_id: String,
  subject_id: String,      // FK to clients.id
  data: Object,            // Form data
  timestamp: Date,
  status: String,          // FINALIZED, PENDING, FLAGGED
  createdAt: Date,
  updatedAt: Date
}
```

### research_artifacts
```javascript
{
  _id: ObjectId,
  id: String,
  source: String,
  title: String,
  url: String,
  content_summary: String,
  cached_content: String,  // Large text
  tags: [String],
  createdAt: Date
}
```

---

## Data Migration Process

### Phase 1: New Data to Server
- All NEW submissions go to server + local cache
- All NEW manifests go to server + local cache
- Existing browser data remains untouched

### Phase 17: Full Migration
1. Export all IndexedDB data via browser console
2. Run migration script to import to MongoDB
3. Verify data integrity
4. Clear browser storage after confirmation

---

## Client-Side Changes Needed

### 1. Add API Service
Create `services/api.ts`:
```typescript
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export const api = {
  async getManifests() {
    const res = await fetch(`${API_BASE}/api/manifests`);
    return res.json();
  },
  async saveManifest(manifest) {
    return fetch(`${API_BASE}/api/manifests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(manifest)
    });
  },
  // ... more methods
};
```

### 2. Update dbService.ts
Add server calls with local fallback:
```typescript
async getAllManifests(): Promise<Manifest[]> {
  try {
    // Try server first
    const serverData = await api.getManifests();
    // Cache locally
    for (const m of serverData) {
      await IDB.put('manifests', m);
    }
    return serverData;
  } catch (err) {
    // Fallback to local cache
    console.warn('Server unavailable, using local cache');
    return await IDB.getAll('manifests');
  }
}
```

### 3. Add Sync Queue
Create `services/sync.ts`:
```typescript
const PENDING_KEY = 'chameleon_pending_sync';

export const syncQueue = {
  add(item) {
    const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    pending.push(item);
    localStorage.setItem(PENDING_KEY, JSON.stringify(pending));
  },
  async flush() {
    const pending = JSON.parse(localStorage.getItem(PENDING_KEY) || '[]');
    for (const item of pending) {
      try {
        await api[item.method](item.data);
        // Remove from queue on success
      } catch {
        // Keep in queue for retry
      }
    }
  }
};
```

---

## Environment Variables

### Client (.env)
```
VITE_API_URL=http://localhost:3001
GEMINI_API_KEY=your_key_here
```

### Server (.env)
```
PORT=3001
NODE_ENV=development
MONGODB_URI=mongodb://localhost:27017/chameleon
# Auth keys (when needed)
# JWT_SECRET=your_secret
```

---

## Testing Strategy

### During Migration
1. Run client on `:3000`, server on `:3001`
2. Test each endpoint with existing UI
3. Verify data flows to MongoDB
4. Verify offline fallback works
5. Test sync queue on reconnection

### Validation Checkpoints
- [ ] Health endpoint responds
- [ ] Manifests CRUD works
- [ ] Clients CRUD works
- [ ] Submissions CRUD works
- [ ] Offline mode still works
- [ ] UI unchanged functionally

---

**End of Phase 0.4 Documentation**
