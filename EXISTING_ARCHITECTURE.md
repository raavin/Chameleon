# Existing Architecture Documentation
## Phase 0.1: Codebase Map

**Date:** 2026-01-10  
**Status:** Discovery Complete - Working MVP

---

## Directory Structure

```
/home/jason/projects/Chameleon/
├── .env                              # Environment variables (Gemini API key)
├── .git/                             # Git repository
├── .gitignore
├── package.json                      # Root package.json (Vite React app)
├── package-lock.json
├── tsconfig.json                     # TypeScript configuration
├── vite.config.ts                    # Vite build configuration
├── index.html                        # HTML entry point
├── index.tsx                         # React entry point
├── App.tsx                           # Main application component
├── types.ts                          # TypeScript type definitions
├── metadata.json                     # Unknown - needs inspection
├── test_tools.ts                     # Test utilities
│
├── components/                       # React UI components
│   ├── CRMView.tsx                   # Client directory/list view
│   ├── ClientDashboard.tsx           # 360-degree client view
│   ├── DesignSystem.tsx              # UI component library
│   ├── Engine.tsx                    # Dynamic form renderer (CORE)
│   ├── LandingScreen.tsx             # Home/navigation screen
│   ├── Layout.tsx                    # App layout wrapper
│   ├── LegislationViewer.tsx         # Legislative reference viewer
│   ├── ManifestInspector.tsx         # Dev tool for manifest inspection
│   └── ResearcherOverlay.tsx         # Manifest generation UI
│
├── services/                         # Core business logic
│   ├── dbService.ts                  # IndexedDB wrapper (STORAGE LAYER)
│   └── geminiService.ts              # AI manifest generation (HYDRATION ENGINE)
│
├── clients/                          # Sample client data
│   └── jdoe_example.json             # Example client record
│
├── protocols/                        # Pre-generated manifest examples
│   ├── hcmc_health.json              # Ho Chi Minh City health protocol
│   ├── melbourne_fvr.json            # Melbourne family violence risk
│   └── nairobi_relief.json           # Nairobi emergency relief
│
├── research/                         # Legislative/research source files
│   ├── MasterExecutiveSummary.txt    # Core philosophical alignment doc
│   ├── PrimaryHealth.txt             # Domain I research
│   ├── MentalHealth.txt              # Domain II research
│   ├── Families.txt                  # Family violence research
│   ├── housing.txt                   # Housing domain research
│   ├── EmergencyRelief.txt           # Relief domain research
│   ├── [20+ other domain files]      # Aging, Agriculture, Culture, etc.
│   ├── source of truth.pdf           # Unknown - needs inspection
│   └── who_health_standards.json     # WHO standards reference
│
├── docs/                             # Unknown contents
├── dist/                             # Build output (generated)
└── node_modules/                     # Dependencies (generated)
```

---

## Key Files & Their Purposes

### Core Application Files

| File | Purpose | Status |
|------|---------|--------|
| `App.tsx` | Main orchestrator - manages state, routing between views | ✅ Working |
| `index.tsx` | React DOM entry point | ✅ Working |
| `types.ts` | TypeScript type definitions for entire app | ✅ Working |
| `vite.config.ts` | Build config with env variable injection | ✅ Working |

### Services (Business Logic)

| File | Purpose | Technology | Status |
|------|---------|------------|--------|
| `services/dbService.ts` | Browser-based storage using IndexedDB | IndexedDB API | ✅ Working |
| `services/geminiService.ts` | AI-powered manifest generation from research docs | Google Gemini API | ✅ Working |

### Components (UI Layer)

| Component | Purpose | Key Features | Status |
|-----------|---------|--------------|--------|
| `Engine.tsx` | **Dynamic Form Renderer** - The core UI engine | Renders forms from JSON manifests, handles validation, multi-step navigation | ✅ Working |
| `ResearcherOverlay.tsx` | Manifest generation interface | Integrates with Gemini service | ✅ Working |
| `CRMView.tsx` | Client directory/list | Shows all clients | ✅ Working |
| `ClientDashboard.tsx` | 360° client view | Shows all submissions for a client | ✅ Working |
| `LandingScreen.tsx` | Home screen | Navigation hub | ✅ Working |
| `Layout.tsx` | App wrapper | Consistent layout | ✅ Working |
| `LegislationViewer.tsx` | Reference viewer | Shows legislative citations | ✅ Working |
| `ManifestInspector.tsx` | Dev tool | Inspect generated manifests | ✅ Working |
| `DesignSystem.tsx` | UI library | Reusable UI components | ✅ Working |

---

## Dependencies (package.json)

### Production Dependencies
- **react** (v19.2.3) - UI framework
- **react-dom** (v19.2.3) - React DOM renderer
- **@google/genai** (v1.35.0) - Google Gemini AI SDK
- **serve** (v14.2.5) - Static file server for production

### Dev Dependencies
- **vite** (v6.4.1) - Build tool
- **@vitejs/plugin-react** (v5.0.0) - React plugin for Vite
- **typescript** (v5.8.2) - TypeScript compiler
- **@types/node** (v22.14.0) - Node.js type definitions

### Scripts
```json
{
  "dev": "vite --debug",           // Development server
  "build": "vite build",            // Production build
  "preview": "vite preview",        // Preview production build
  "start": "serve -s dist -l 10000" // Serve production build
}
```

---

## Monorepo Status

**CURRENT STATE:** ❌ **NOT a monorepo**

This is a single-package Vite React application. There is:
- ✅ One root `package.json`
- ❌ No workspace configuration
- ❌ No `/apps` directory
- ❌ No `/packages` directory
- ❌ No server package

**IMPLICATION:** We will need to create a monorepo structure in Phase 1.

---

## Data Storage Architecture (Browser-Based)

### Storage Technology: IndexedDB

**Location:** `services/dbService.ts`

### Databases & Object Stores

| Store Name | Key Path | Purpose | Data Structure |
|------------|----------|---------|----------------|
| `manifests` | `id` | Stores generated JSON manifests | `Manifest` type |
| `clients` | `id` | Stores client/identity records | `ClientRecord` type |
| `submissions` | `id` | Stores form submission data | `Submission` type |
| `research_artifacts` | `id` | Stores research documents (large text/blobs) | `ResearchNode` type |

### Key Data Types (from types.ts)

```typescript
// Core domain structure
interface Domain {
  id: string;
  title: string;
  sections: FormSection[];
  fields: Field[];
  research_artifacts: ResearchNode[];
  governance_rules: any[];
  subject_identifier_field: string;
}

// Form field definition
interface Field {
  id: string;
  label: string;
  type: FieldType; // 'text' | 'number' | 'photo' | 'bool' | 'select' | etc.
  placeholder?: string;
  options?: string[];
  default_value?: any;
  section_citation?: string;
  research_node_id?: string;
  is_identity_field?: boolean;
}

// Complete manifest structure
interface Manifest {
  id: string;
  version: string;
  compiled_at: string;
  config: { currency, locale, theme, region };
  domains: Domain[];
  library: LegislationLibrary; // Legislative references
}

// Form submission
interface Submission {
  id: string;
  manifest_id: string;
  domain_id: string;
  subject_id: string; // Links to client
  data: Record<string, any>; // Form data
  timestamp: string;
  status: 'FINALIZED' | 'PENDING' | 'FLAGGED';
}

// Client/Identity record
interface ClientRecord {
  id: string;
  name: string;
  metadata: Record<string, any>;
  submissions: Submission[]; // All submissions for this client
}
```

---

## AI Manifest Generation System

### Technology: Google Gemini AI
**File:** `services/geminiService.ts`

### How It Works

1. **Research Context Loading** (`getResearchContext`)
   - Dynamically imports all `.txt` files from `/research` directory
   - Always includes `MasterExecutiveSummary.txt` (philosophical alignment)
   - Matches domain-specific research files by keyword
   - Concatenates into a single context string

2. **Manifest Compilation** (`compileManifest`)
   - Takes a `BuildContext` (domains, region, currency, etc.)
   - Loads relevant research context
   - Sends to Gemini AI with structured prompt
   - Streams response back to UI
   - Extracts JSON from AI response
   - Saves to IndexedDB

3. **AI Model:** Uses Google Gemini API (key in `.env`)

### Build Context Structure
```typescript
interface BuildContext {
  domains: string[];     // e.g., ["Primary Health", "Family Violence"]
  region: string;        // e.g., "Victoria, Australia"
  currency: string;      // e.g., "AUD"
  locale: string;        // e.g., "en-AU"
  theme: string;         // e.g., "modern"
}
```

---

## Form Rendering System

### Technology: React with Dynamic JSON Interpretation
**File:** `components/Engine.tsx`

### How It Works

1. **Input:** Receives a `Domain` object from a manifest
2. **Multi-Step Navigation:** Renders one section at a time
3. **Field Type Support:**
   - text, number, textarea
   - select, multiselect
   - bool (checkbox)
   - date
   - photo (image upload)
   - file
   - relationship (links to other entities)
   - map (location picker)

4. **Features:**
   - Progress bar
   - Legislative citations (clickable)
   - Read-only mode (for historical review)
   - Pre-fill data support
   - Submit/Success callback

5. **Validation:** Currently basic (required fields only)

---

## Application State Management

### Technology: React useState (no Redux/Context yet)

**Location:** `App.tsx`

### Global State
```typescript
const [manifests, setManifests] = useState<Manifest[]>([]);
const [activeManifestId, setActiveManifestId] = useState<string | null>(null);
const [viewMode, setViewMode] = useState<'home' | 'intake' | 'review' | 'manifest' | 'directory' | 'client_360'>('home');
const [submissions, setSubmissions] = useState<Submission[]>([]);
const [clients, setClients] = useState<ClientRecord[]>([]);
const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
```

**Refresh Strategy:** Loads all data from IndexedDB on mount and after operations

---

## Environment Configuration

**File:** `.env`

### Variables
- `GEMINI_API_KEY` - Google Gemini API key (injected as `process.env.API_KEY` via Vite)

**Vite Config Note:** Environment variable is made available to client-side code via `define` in `vite.config.ts`

---

## Missing or Unknown

### Files Not Yet Inspected
- [ ] `metadata.json` - Purpose unknown
- [ ] `test_tools.ts` - Test utilities (not examined in detail)
- [ ] `/docs` directory - Contents unknown
- [ ] `research/source of truth.pdf` - Not examined

### Features Not Implemented Yet (from Master Blueprint)
- ❌ Server-side persistence (currently browser-only)
- ❌ Identity Node architecture (clients exist but not fully sovereign)
- ❌ Satellite Module system (submissions exist but not decoupled)
- ❌ WORM audit trail
- ❌ Privacy Traffic Light system
- ❌ Two-key authorization
- ❌ Consent management
- ❌ Cross-domain Boolean APIs
- ❌ Sentinel anomaly detection
- ❌ Version migration system
- ❌ Authentication/authorization
- ❌ Offline sync (currently offline-only, no sync)

---

## Strengths of Current Implementation

✅ **Working MVP** - App runs and functions correctly  
✅ **AI-Powered Manifest Generation** - Gemini integration works  
✅ **Dynamic Form Rendering** - Engine.tsx successfully renders JSON-driven forms  
✅ **Browser Storage** - IndexedDB persistence works  
✅ **Research Integration** - Loads and uses legislative source files  
✅ **Client-Centric Design** - ClientRecord structure exists  
✅ **Multi-Step Forms** - Section-based navigation implemented  
✅ **Legislative Citations** - Traceable to source documents  
✅ **TypeScript** - Strong typing throughout  

---

## Next Steps (Phase 0.2)

1. Understand current data flow in detail
2. Map how manifests are generated and consumed
3. Identify integration points for server migration
4. Document existing features vs. missing features

---

## Critical Implementation Notes (MERN Migration)

### Mongoose Schema Flexibility

The AI (Gemini) generates JSON with varying field types and values. The Mongoose schemas must be flexible enough to accept these variations:

**Field Types (FieldSchema.type enum):**
```javascript
enum: ['text', 'string', 'number', 'photo', 'bool', 'boolean', 'select', 'date', 'textarea', 'relationship', 'map', 'file', 'multiselect', 'tel', 'email', 'checkbox']
```
- `text` and `string` are equivalent (AI uses both)
- `bool` and `boolean` are equivalent (AI uses both)
- `checkbox` is treated as boolean
- `tel` and `email` render as text inputs with appropriate HTML5 types

**Research Artifact Source:**
- Do NOT use enum restriction - AI generates varied sources like `"Local/Gov"`, `"Gov"`, `"Local"`, `"WHO"`, etc.
- Keep as plain `String` type

### Manifest JSON Structure

The working manifest structure (order matters for AI consistency):

```json
{
  "id": "uuid",
  "version": "1.0",
  "compiled_at": "ISO timestamp",
  "config": { "currency", "locale", "theme": "modern", "region" },
  "domains": [{
    "id": "string",
    "title": "string",
    "research_artifacts": [...],  // BEFORE sections
    "sections": [...],
    "fields": [...],
    "governance_rules": [{ "description": "string" }],
    "subject_identifier_field": "string"
  }],
  "library": { "CITATION_ID": { "act_name", "section_title", "content", "analysis" } }
}
```

### Gemini API Configuration

**Model:** `gemini-3-flash-preview` (as of Jan 2026)
- Fallback: `gemini-2.0-flash`
- The model name changes frequently - check Google AI Studio for current models

**Streaming:** Uses Server-Sent Events (SSE)
- Content-Type: `text/event-stream` (NOT `text-event-stream`)
- Backend streams chunks, frontend accumulates
- Final message includes `{ done: true, manifest: {...} }`

### Merge Mode (Currently Disabled)

Merge mode was disabled due to issues with duplicate fields. To re-enable:
1. Uncomment code in `frontend/services/geminiService.ts`
2. The backend detects `existingManifest` in payload and sets mode to MERGE
3. AI prompt includes merge instructions

### Legislation References (§ Button)

Fields can link to legislation via `section_citation`:
1. Field has `section_citation: "CITATION_KEY"`
2. Manifest has `library: { "CITATION_KEY": { act_name, section_title, content, analysis } }`
3. Engine.tsx shows § button when `field.section_citation` exists
4. LegislationViewer.tsx displays the full citation in a slide-out drawer

### Research Artifacts Structure

Each artifact must be a proper object (not a string):
```json
{
  "id": "ra-1",
  "source": "Gov",
  "title": "Document Title",
  "url": "https://...",
  "content_summary": "Brief summary",
  "cached_content": "FULL TEXT for RAG",
  "tags": ["tag1", "tag2"]
}
```

### IndexedDB Key Path

All stores use `keyPath: 'id'` - every object must have an `id` field or save will fail.
The `saveManifest` and `saveResearchArtifact` functions now auto-generate IDs if missing.

### MongoDB Connection (WSL + Windows)

If using Windows MongoDB Compass with WSL MongoDB:
- MongoDB binds to `127.0.0.1` by default (WSL only)
- Either change `/etc/mongod.conf` to `bindIp: 0.0.0.0` and connect via WSL IP
- Or use port forwarding with `socat`

### Environment Variables

**Backend (.env):**
```
MONGODB_URI=mongodb://localhost:27017/chameleon
GEMINI_API_KEY=your_key_here
JWT_SECRET=your_secret
PORT=3001
```

**Frontend (.env):**
```
VITE_API_URL=http://localhost:3001/api
```

### NPM Scripts

```bash
npm run dev           # Runs both frontend and backend
npm run dev:frontend  # Frontend only (port 5173)
npm run dev:backend   # Backend only (port 3001)
npm run build         # Production build of frontend
```

### Common Errors

1. **EADDRINUSE :3001** - Kill existing process: `lsof -ti :3001 | xargs kill -9`
2. **Mongoose duplicate index warning** - Harmless, can be ignored
3. **API key leaked** - Generate new key in Google AI Studio
4. **Cannot create property 'id' on string** - Research artifacts are strings, not objects (prompt issue)

---

**End of Phase 0.1 Documentation**
