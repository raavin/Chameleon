# Data Flow Documentation
## Phase 0.2: Current Application Data Flow

**Date:** 2026-01-10  
**Status:** Complete

---

## Overview Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              USER INTERFACE                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│   ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────────────┐   │
│   │ LandingScreen   │────▶│ ResearcherOverlay│────▶│ Engine (Form Renderer)  │   │
│   │ (Build Trigger) │     │ (Progress View)  │     │ (Dynamic Form Display)  │   │
│   └─────────────────┘     └─────────────────┘     └─────────────────────────┘   │
│           │                       ▲                         │                    │
│           │                       │                         │                    │
│           ▼                       │                         ▼                    │
│   ┌─────────────────┐             │               ┌─────────────────────────┐   │
│   │ BuildContext    │             │               │ Submission              │   │
│   │ {region,domains}│             │               │ {manifest_id, data}     │   │
│   └─────────────────┘             │               └─────────────────────────┘   │
│                                   │                                              │
└───────────────────────────────────┼──────────────────────────────────────────────┘
                                    │
┌───────────────────────────────────┼──────────────────────────────────────────────┐
│                          SERVICES LAYER                                          │
├───────────────────────────────────┼──────────────────────────────────────────────┤
│                                   │                                              │
│   ┌───────────────────────────────┴────────────────────────────────────────┐    │
│   │                        geminiService.ts                                 │    │
│   │  ┌────────────────────────────────────────────────────────────────┐    │    │
│   │  │ 1. Load Research Context (from /research/*.txt)                │    │    │
│   │  │ 2. Build Prompt (CREATE or MERGE mode)                         │    │    │
│   │  │ 3. Call Gemini AI with Google Search tool                      │    │    │
│   │  │ 4. Stream Response → Extract JSON                              │    │    │
│   │  │ 5. Return Manifest                                             │    │    │
│   │  └────────────────────────────────────────────────────────────────┘    │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                    │                                             │
│                                    ▼                                             │
│   ┌────────────────────────────────────────────────────────────────────────┐    │
│   │                          dbService.ts                                   │    │
│   │  ┌────────────────────────────────────────────────────────────────┐    │    │
│   │  │ IndexedDB Wrapper (ChameleonDB)                                │    │    │
│   │  │  - manifests        (id → Manifest)                            │    │    │
│   │  │  - clients          (id → ClientRecord)                        │    │    │
│   │  │  - submissions      (id → Submission)                          │    │    │
│   │  │  - research_artifacts (id → ResearchNode)                      │    │    │
│   │  └────────────────────────────────────────────────────────────────┘    │    │
│   └────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└──────────────────────────────────────────────────────────────────────────────────┘
```

---

## Flow 1: Manifest Generation (The "Factory")

### Trigger
User clicks "Build Protocol" on `LandingScreen.tsx`

### Input (BuildContext)
```typescript
{
  region: "Victoria, Australia",
  domains: ["Primary Health", "Family Violence"],
  projectName?: "Example Initiative",
  fundingBody?: "Department of Health",
  additionalContext?: "Focus on MARAM compliance"
}
```

### Process

1. **Research Context Assembly** (`geminiService.ts:getResearchContext`)
   - Loads all `.txt` files from `/research` via Vite's `import.meta.glob`
   - Always includes `MasterExecutiveSummary.txt`
   - Matches domain-specific files by keyword
   - Concatenates into context string

2. **Prompt Construction**
   - If existing manifest for region: MERGE mode prompt
   - If new region: CREATE mode prompt
   - Includes research context, exhaustive field requirements, logging instructions

3. **AI Generation** (`compileManifest`)
   - Uses `gemini-3-pro-preview` (fallback to `gemini-2.0-flash`)
   - Enables `googleSearch` tool for real-time legislation lookup
   - Streams response back to UI for progress display
   - Max tokens: 65,000

4. **Response Processing**
   - Extracts JSON from markdown code blocks or raw braces
   - Parses into `Manifest` type

5. **Persistence**
   - Saves manifest to IndexedDB (`DB.saveManifest`)
   - Saves research artifacts to IndexedDB (`DB.saveResearchArtifact`)

### Output (Manifest)
```typescript
{
  id: "uuid",
  version: "1.0.0",
  compiled_at: "2026-01-10T00:00:00Z",
  config: { currency, locale, theme, region },
  domains: [{
    id: string,
    title: string,
    sections: [{ id, title, description, field_ids }],
    fields: [{ 
      id, label, type, options,
      section_citation,      // ← GOLD: Links to library entry
      is_identity_field,
      ui_config: { grid_span, help_text, extrapolated_from }
    }],
    research_artifacts: [{
      id, source, title, url,
      content_summary,
      cached_content,        // ← GOLD: Full text of legislation
      tags
    }],
    governance_rules: [],
    subject_identifier_field
  }],
  library: {                 // ← GOLD: Legislative reference library
    "CITATION_ID": {
      act_name: "Privacy Act 1988 (Cth)",
      section_title: "Schedule 1",
      content: "Full statutory text...",
      analysis: "Why this matters..."
    }
  }
}
```

---

## Flow 2: Form Rendering (The Engine)

### Trigger
User selects manifest and domain, enters "intake" view mode

### Input
- `domain: Domain` (from active manifest)
- `currency: string` (from manifest config)
- `library: LegislationLibrary` (from manifest)
- `prefillData?: Record<string, any>` (optional pre-filled values)
- `readOnly?: boolean` (for review mode)

### Process (`Engine.tsx`)

1. **Section Navigation**
   - Displays one section at a time
   - Progress bar shows completion percentage
   - Back/Forward navigation

2. **Field Rendering** (The Renderer)
   - Iterates through `section.field_ids`
   - Finds field definition from `domain.fields`
   - Renders appropriate component based on `field.type`:
     - `text`, `textarea` → text inputs
     - `select`, `multiselect` → dropdowns/buttons
     - `date`, `number` → typed inputs
     - `bool` → Yes/No buttons
     - `photo`, `file` → upload triggers
     - `relationship`, `map` → special components

3. **Citation Links** (GOLD FEATURE)
   - Each field can have `section_citation` property
   - Clicking "Statute ?" opens `LegislationViewer`
   - Shows: Act name, section title, full text, analysis

4. **State Management**
   - `formData: Record<string, any>` holds all values
   - Changes trigger `setFormData`

### Output
`onSuccess(formData)` callback with all field values

---

## Flow 3: Form Submission & Client Creation

### Trigger
User clicks "Finalize & Encrypt" on last section

### Process (`App.tsx:handleSubmission`)

1. **Create Submission Object**
   ```typescript
   {
     id: crypto.randomUUID(),
     manifest_id: activeManifestId,
     domain_id: activeDomainId,
     subject_id: selectedClientId || `subject_${timestamp}`,
     data: formData,
     timestamp: new Date().toISOString(),
     status: 'FINALIZED'
   }
   ```

2. **Save Submission**
   - `DB.saveSubmission(submission)` → IndexedDB

3. **Update Client Record** (`DB.updateClientFromSubmission`)
   - If client exists: Update name, add submission to array
   - If new client: Create record with this submission
   - Client structure:
     ```typescript
     {
       id: subject_id,
       name: data.full_name || data.name || "Resolved Identity",
       metadata: {},
       submissions: [submission, ...previous]
     }
     ```

4. **Navigate to Client 360**
   - Sets `viewMode: 'client_360'`
   - Shows full client history

---

## Flow 4: Client Lookup & History Review

### Directory View (`CRMView.tsx`)
- Loads all clients from IndexedDB
- Displays list with name and submission count
- Click navigates to Client 360

### Client 360 View (`ClientDashboard.tsx`)
- Shows all submissions for a client
- Each submission linked to its manifest version
- Can view historical submissions in read-only Engine

### Historical Form Review
- `viewMode: 'review'`
- `readOnly: true` passed to Engine
- Pre-fills data from submission
- All fields disabled, citations still viewable

---

## Gold Features to Preserve

### 1. Legislative Citations (`section_citation`)
**Location:** Field definition → `LegislationViewer`

Each form field can reference a legislative source:
```typescript
{
  id: "medicare_number",
  label: "Medicare Number",
  type: "text",
  section_citation: "privacy_1988"  // ← References library entry
}
```

The citation opens a slide-out panel showing:
- Act name & section
- Full statutory text (quoted)
- Deep-dive analysis
- Compliance verification badge

### 2. Research Artifacts (`cached_content`)
**Location:** Domain definition → IndexedDB

Full legislative text is cached locally:
```typescript
{
  id: "who_intake_standard",
  source: "WHO",
  title: "Primary Care Intake Standards",
  url: "https://...",
  content_summary: "Brief summary",
  cached_content: "FULL TEXT OF THE STANDARD..."  // ← GOLD
}
```

### 3. Exhaustive Field Generation
**Location:** Gemini prompt engineering

The AI is instructed to:
- Generate ALL fields from source documents
- Not summarize or compress
- Include every boolean, date, option
- Goal: Replace paper form entirely

### 4. Field UI Configuration
```typescript
{
  ui_config: {
    grid_span: 1 | 2,           // Column width
    help_text: "Contextual...", // Inline guidance
    extrapolated_from: "..."    // AI reasoning
  }
}
```

### 5. Identity Fields
```typescript
{
  is_identity_field: true  // Marks as core identifier
}
```
Displayed with "CORE ID" badge in UI.

---

## Current Storage Schema (IndexedDB)

### `manifests` Store
| Key | Type | Description |
|-----|------|-------------|
| `id` | string | Primary key (UUID) |
| Full object | Manifest | Complete manifest with domains, fields, library |

### `clients` Store
| Key | Type | Description |
|-----|------|-------------|
| `id` | string | Subject ID (UUID or generated) |
| `name` | string | Resolved from form data |
| `metadata` | object | Future expansion |
| `submissions` | Submission[] | All submissions for this client |

### `submissions` Store
| Key | Type | Description |
|-----|------|-------------|
| `id` | string | UUID |
| `manifest_id` | string | FK → manifests.id |
| `domain_id` | string | Domain within manifest |
| `subject_id` | string | FK → clients.id |
| `data` | object | Raw form data |
| `timestamp` | string | ISO date |
| `status` | enum | FINALIZED, PENDING, FLAGGED |

### `research_artifacts` Store
| Key | Type | Description |
|-----|------|-------------|
| `id` | string | UUID |
| `source` | enum | WHO, UN, HRC, Local, Gov |
| `title` | string | Document title |
| `url` | string | Source URL |
| `content_summary` | string | Brief summary |
| `cached_content` | string | Full text (large) |
| `tags` | string[] | Categorization |

---

## Migration Considerations for MERN

### What Stays Client-Side
- Form rendering (Engine.tsx)
- UI components (DesignSystem, Layout, etc.)
- Manifest consumption
- Offline form data cache

### What Moves to Server
- `dbService.ts` → MongoDB models + Express routes
- Manifest storage → MongoDB collection
- Client records → MongoDB collection
- Submissions → MongoDB collection
- Research artifacts → MongoDB collection (or GridFS for large text)

### What Needs Both (Sync)
- Form submissions (save locally, sync to server)
- Manifests (fetch from server, cache locally)
- Client lookups (server primary, local cache)

### API Endpoints Needed
- `GET /api/manifests` - List all manifests
- `GET /api/manifests/:id` - Get single manifest
- `POST /api/manifests` - Save new manifest
- `GET /api/clients` - List clients
- `GET /api/clients/:id` - Get client with submissions
- `POST /api/submissions` - Save submission
- `GET /api/submissions/by-client/:id` - Get all for client

---

**End of Phase 0.2 Documentation**
