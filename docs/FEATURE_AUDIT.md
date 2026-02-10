# Feature Audit
## Phase 0.3: Current Capabilities Assessment

**Date:** 2026-01-10  
**Build Status:** ✅ PASSING (Vite build completes in 2.66s)

---

## ✅ Features That Work Perfectly (KEEP AS-IS)

### 1. Manifest Generation System
**Files:** `services/geminiService.ts`, `components/ResearcherOverlay.tsx`

| Feature | Status | Notes |
|---------|--------|-------|
| Research context loading | ✅ Working | Loads all `.txt` from `/research` |
| Domain-specific file matching | ✅ Working | Fuzzy keyword matching |
| Gemini AI integration | ✅ Working | Uses gemini-3-pro-preview with fallback |
| Google Search tool | ✅ Working | Real-time legislation lookup |
| Streaming response | ✅ Working | Live progress display |
| Merge mode (update existing) | ✅ Working | Appends to regional manifests |
| Create mode (new manifest) | ✅ Working | Full exhaustive generation |
| Model retry with backoff | ✅ Working | Rate limit handling |

### 2. Dynamic Form Renderer (Engine)
**File:** `components/Engine.tsx`

| Feature | Status | Notes |
|---------|--------|-------|
| Multi-step section navigation | ✅ Working | With progress bar |
| Field type: text | ✅ Working | Standard input |
| Field type: textarea | ✅ Working | Multi-line input |
| Field type: select | ✅ Working | Dropdown |
| Field type: multiselect | ✅ Working | Button grid selection |
| Field type: date | ✅ Working | Native date picker |
| Field type: number | ✅ Working | With currency prefix |
| Field type: bool | ✅ Working | Yes/No buttons |
| Field type: photo/file | ✅ Working | Upload trigger |
| Field type: relationship | ✅ Working | Entity linking textarea |
| Field type: map | ✅ Working | Location context |
| Grid span configuration | ✅ Working | 1 or 2 columns |
| Help text display | ✅ Working | Below-field guidance |
| Identity field badge | ✅ Working | "CORE ID" indicator |
| Read-only mode | ✅ Working | For historical review |
| Pre-fill data support | ✅ Working | For returning clients |

### 3. Legislative Citation System (🏆 GOLD)
**Files:** `Engine.tsx`, `LegislationViewer.tsx`

| Feature | Status | Notes |
|---------|--------|-------|
| Section citation links | ✅ Working | "Statute ?" button per field |
| Slide-out legislation viewer | ✅ Working | Beautiful modal panel |
| Act name display | ✅ Working | Full legislative title |
| Section title display | ✅ Working | Specific section reference |
| Full statutory text | ✅ Working | Quoted verbatim |
| Deep-dive analysis | ✅ Working | AI-generated explanation |
| Compliance verification badge | ✅ Working | Governance context |

### 4. Client Management
**Files:** `CRMView.tsx`, `ClientDashboard.tsx`, `dbService.ts`

| Feature | Status | Notes |
|---------|--------|-------|
| Client directory listing | ✅ Working | Alphabetically sorted |
| Search by name/ID | ✅ Working | Real-time filtering |
| Client 360 dashboard | ✅ Working | Full history view |
| Episode count display | ✅ Working | Submission tally |
| Submission timeline | ✅ Working | Chronological history |
| View historical records | ✅ Working | Read-only form review |
| New intake per client | ✅ Working | Links manifest to identity |
| Auto-client creation | ✅ Working | From first submission |

### 5. Data Persistence (IndexedDB)
**File:** `services/dbService.ts`

| Feature | Status | Notes |
|---------|--------|-------|
| Manifest storage | ✅ Working | Full JSON blobs |
| Client record storage | ✅ Working | With embedded submissions |
| Submission storage | ✅ Working | Linked to clients |
| Research artifact storage | ✅ Working | Large text blobs |
| Static fallback loading | ✅ Working | Loads `/protocols/*.json` if empty |
| Auto-seeding on first load | ✅ Working | Populates demo data |

### 6. Manifest Inspector
**File:** `components/ManifestInspector.tsx`

| Feature | Status | Notes |
|---------|--------|-------|
| Raw JSON display | ✅ Working | Syntax-highlighted |
| Export to file | ✅ Working | Downloads as `.json` |
| Research node listing | ✅ Working | Shows artifacts |
| Cached content download | ✅ Working | Export full text |
| Governance rules display | ✅ Working | Compliance indicators |

### 7. Research Progress Overlay
**File:** `components/ResearcherOverlay.tsx`

| Feature | Status | Notes |
|---------|--------|-------|
| Live streaming display | ✅ Working | Auto-scrolling log |
| Log type parsing | ✅ Working | SEARCH, DOWNLOAD, SCAN, ANALYSIS |
| Color-coded steps | ✅ Working | Visual differentiation |
| Downloaded files list | ✅ Working | Local folder simulation |
| Model indicator | ✅ Working | Shows active neural node |

### 8. Landing Screen
**File:** `components/LandingScreen.tsx`

| Feature | Status | Notes |
|---------|--------|-------|
| Template quick-start | ✅ Working | 3 regional presets |
| Advanced deployment modal | ✅ Working | Custom configuration |
| Custom region input | ✅ Working | Free text |
| Multi-domain input | ✅ Working | Comma-separated |
| Funding body input | ✅ Working | Optional context |
| Additional context input | ✅ Working | Free-form requirements |
| Client directory link | ✅ Working | Navigation |

---

## ⚠️ Features That Work But Need Enhancement

### 1. Offline Support
**Current:** Works offline (browser-only) but no sync
**Enhancement Needed:** 
- Add sync to server when online
- Queue submissions when offline
- Visual indicator for sync status

### 2. Error Handling
**Current:** Basic `alert()` and `console.error()`
**Enhancement Needed:**
- Toast notifications
- Retry mechanisms
- User-friendly error messages

### 3. Form Validation
**Current:** Minimal (only `required` on some inputs)
**Enhancement Needed:**
- Field-level validation rules
- Real-time feedback
- Submit blocking on invalid

### 4. File Uploads
**Current:** Captures filename only, doesn't persist file
**Enhancement Needed:**
- Actual file storage
- Base64 encoding for small files
- GridFS/blob storage for large files

### 5. Bundle Size
**Current:** 675 KB (warning at 500 KB limit)
**Enhancement Needed:**
- Code splitting
- Lazy loading routes
- Tree shaking optimization

---

## ❌ Features That Are Broken or Incomplete

### 1. Relationship Field
**Issue:** Just a textarea, no actual entity linking
**Expected:** Should link to other client records

### 2. Map Field
**Issue:** Just a textarea, no actual map
**Expected:** Should integrate a map picker

### 3. Photo Capture
**Issue:** File input only, no camera access
**Expected:** Should support mobile camera on PWA

---

## 🔮 Features Missing But Needed (from Master Blueprint)

| Feature | Priority | Phase |
|---------|----------|-------|
| Server-side persistence (MongoDB) | 🔴 Critical | Phase 1-2 |
| REST API endpoints | 🔴 Critical | Phase 1 |
| Client-server sync | 🔴 Critical | Phase 5 |
| WORM audit trail | 🟡 High | Phase 6 |
| Privacy traffic lights | 🟡 High | Phase 8 |
| Two-key authorization | 🟢 Medium | Phase 9 |
| Sentinel anomaly detection | 🟢 Medium | Phase 10 |
| Cross-domain Boolean APIs | 🟢 Medium | Phase 11 |
| Manifest versioning/delta | 🟢 Medium | Phase 12 |
| User authentication | ⚪ Low (per user) | Phase 7 |

---

## Data Structures Observed (IndexedDB)

### `manifests` Store
```json
{
  "id": "proto_melb_fvr_001",
  "version": "v5.2-static",
  "compiled_at": "2025-03-24T10:00:00Z",
  "config": {
    "currency": "AUD",
    "locale": "en-AU",
    "theme": "modern",
    "region": "Melbourne, Australia"
  },
  "domains": [...],
  "library": {...}
}
```

### `clients` Store
```json
{
  "id": "subject_abc123",
  "name": "John Doe",
  "metadata": {},
  "submissions": [...]
}
```

### `submissions` Store
```json
{
  "id": "uuid",
  "manifest_id": "proto_melb_fvr_001",
  "domain_id": "fvr_domain",
  "subject_id": "subject_abc123",
  "data": { "full_name": "John Doe", ... },
  "timestamp": "2026-01-10T00:00:00Z",
  "status": "FINALIZED"
}
```

### `research_artifacts` Store
```json
{
  "id": "who_intake_v2",
  "source": "WHO",
  "title": "Primary Care Intake Standards",
  "url": "https://...",
  "content_summary": "Brief...",
  "cached_content": "FULL TEXT...",
  "tags": ["intake", "health"]
}
```

---

## Console Warnings/Errors

| Type | Message | Severity | Action |
|------|---------|----------|--------|
| Warning | Chunk size > 500 KB | Low | Code split later |
| None | No runtime errors observed | ✅ | N/A |

---

## Gold Features Summary (MUST PRESERVE)

1. **`section_citation`** - Every field can link to legislative source
2. **`LegislationViewer`** - Beautiful slide-out panel with full statutory text
3. **`cached_content`** - Full legislation text stored locally for RAG
4. **`research_artifacts`** - AI-extracted documents with URLs
5. **`library`** - Citation database with analysis
6. **`is_identity_field`** - Core identifier marking
7. **`ui_config.help_text`** - Contextual guidance per field
8. **`governance_rules`** - Compliance requirements

---

## Recommendations for MERN Migration

### Keep Client-Side
- `Engine.tsx` (form renderer) - Works perfectly
- `LegislationViewer.tsx` - UI-only component
- `DesignSystem.tsx` - Pure styling
- `CRMView.tsx` - Presentation layer
- `ClientDashboard.tsx` - Presentation layer
- `LandingScreen.tsx` - Presentation layer
- `ResearcherOverlay.tsx` - Progress display

### Move to Server
- `dbService.ts` → Express routes + MongoDB models
- Manifest CRUD operations
- Client CRUD operations
- Submission CRUD operations
- Research artifact storage

### Keep Both (with sync)
- Manifest loading (server primary, local cache)
- Submission saving (local queue, server sync)
- Client records (server primary, local cache)

---

**End of Phase 0.3 Documentation**
