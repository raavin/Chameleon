# Chameleon Project Structure

## Recommended Directory Organization

```
chameleon/
├── README.md
├── ASSESSMENT.md                    # This assessment document
├── PROJECT_STRUCTURE.md             # This file
├── LICENSE
├── .gitignore
│
├── docs/                            # Documentation
│   ├── architecture.md
│   ├── api-reference.md
│   ├── deployment-guide.md
│   └── cultural-guidelines.md
│
├── tier1-compiler/                  # Research & Compilation System
│   ├── README.md
│   ├── requirements.txt             # Python dependencies
│   ├── pyproject.toml               # Python project config
│   ├── docker-compose.yml
│   ├── Dockerfile
│   │
│   ├── src/
│   │   ├── __init__.py
│   │   ├── main.py                  # FastAPI application entry
│   │   ├── config.py                # Configuration management
│   │   │
│   │   ├── agents/                  # Multi-agent system
│   │   │   ├── __init__.py
│   │   │   ├── base_agent.py        # Base agent class
│   │   │   ├── legal_agent.py       # Legal research
│   │   │   ├── best_practice_agent.py
│   │   │   ├── cultural_agent.py
│   │   │   ├── domain_expert_agent.py
│   │   │   ├── synthesis_agent.py   # Combines agent outputs
│   │   │   └── orchestrator.py      # Agent coordination
│   │   │
│   │   ├── research/                # Research tools
│   │   │   ├── __init__.py
│   │   │   ├── web_scraper.py
│   │   │   ├── api_clients.py       # Legal DB APIs, etc.
│   │   │   ├── search_engine.py     # Web search integration
│   │   │   └── cache.py             # Research caching
│   │   │
│   │   ├── schema/                  # JSON schema generation
│   │   │   ├── __init__.py
│   │   │   ├── generator.py         # Main schema builder
│   │   │   ├── validator.py         # Schema validation
│   │   │   ├── templates/           # Schema templates
│   │   │   │   ├── healthcare.json
│   │   │   │   ├── education.json
│   │   │   │   └── legal.json
│   │   │   └── field_types.py       # Field type definitions
│   │   │
│   │   ├── llm/                     # LLM integration
│   │   │   ├── __init__.py
│   │   │   ├── claude_client.py
│   │   │   ├── gemini_client.py
│   │   │   ├── prompt_templates.py
│   │   │   └── cost_tracker.py
│   │   │
│   │   ├── api/                     # REST API endpoints
│   │   │   ├── __init__.py
│   │   │   ├── routes/
│   │   │   │   ├── research.py      # Trigger research jobs
│   │   │   │   ├── schemas.py       # Schema CRUD
│   │   │   │   └── health.py        # Health checks
│   │   │   └── models.py            # Pydantic models
│   │   │
│   │   ├── database/                # Data persistence
│   │   │   ├── __init__.py
│   │   │   ├── models.py            # SQLAlchemy models
│   │   │   ├── migrations/
│   │   │   └── repositories.py
│   │   │
│   │   └── utils/
│   │       ├── __init__.py
│   │       ├── logger.py
│   │       ├── exceptions.py
│   │       └── validators.py
│   │
│   ├── tests/
│   │   ├── __init__.py
│   │   ├── conftest.py
│   │   ├── unit/
│   │   │   ├── test_agents.py
│   │   │   ├── test_schema_generator.py
│   │   │   └── test_research.py
│   │   └── integration/
│   │       ├── test_api.py
│   │       └── test_end_to_end.py
│   │
│   └── scripts/
│       ├── setup.sh
│       ├── run_dev.sh
│       └── deploy.sh
│
├── tier2-runtime/                   # Form Runtime Engine
│   ├── README.md
│   ├── package.json
│   ├── vite.config.js               # Build configuration
│   ├── .eslintrc.js
│   │
│   ├── public/
│   │   ├── index.html
│   │   ├── manifest.json            # PWA manifest
│   │   ├── service-worker.js        # Offline support
│   │   └── assets/
│   │       ├── icons/
│   │       └── images/
│   │
│   ├── src/
│   │   ├── main.js                  # Application entry
│   │   ├── app.js                   # Main app component
│   │   │
│   │   ├── core/                    # Core engine
│   │   │   ├── schema-parser.js     # Parse JSON schema
│   │   │   ├── form-builder.js      # Build DOM from schema
│   │   │   ├── validator.js         # Runtime validation
│   │   │   ├── state-manager.js     # Form state
│   │   │   └── storage.js           # Local data storage
│   │   │
│   │   ├── components/              # UI components
│   │   │   ├── form-page.js
│   │   │   ├── form-section.js
│   │   │   ├── fields/
│   │   │   │   ├── text-field.js
│   │   │   │   ├── date-field.js
│   │   │   │   ├── select-field.js
│   │   │   │   ├── checkbox-field.js
│   │   │   │   ├── radio-field.js
│   │   │   │   └── textarea-field.js
│   │   │   ├── progress-indicator.js
│   │   │   └── validation-message.js
│   │   │
│   │   ├── services/                # Services
│   │   │   ├── schema-loader.js     # Load schema (local/remote)
│   │   │   ├── data-sync.js         # Sync to server
│   │   │   ├── encryption.js        # Client-side encryption
│   │   │   └── offline-queue.js     # Queue for offline submissions
│   │   │
│   │   ├── utils/
│   │   │   ├── date-formatter.js
│   │   │   ├── validators.js
│   │   │   └── helpers.js
│   │   │
│   │   └── styles/
│   │       ├── main.css
│   │       ├── forms.css
│   │       └── themes/
│   │           ├── default.css
│   │           └── high-contrast.css
│   │
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── schema-parser.test.js
│   │   │   ├── validator.test.js
│   │   │   └── components.test.js
│   │   └── e2e/
│   │       ├── form-submission.test.js
│   │       └── offline-mode.test.js
│   │
│   └── builds/
│       ├── web/                     # PWA build
│       ├── electron/                # Desktop build
│       └── static/                  # Minimal static build
│
├── examples/                        # Example schemas
│   ├── kenya-health-intake-schema.json
│   ├── nigeria-education-schema.json
│   ├── india-legal-compliance-schema.json
│   └── README.md
│
├── shared/                          # Shared utilities
│   ├── schema-spec.md               # JSON schema specification
│   ├── validation-rules.json        # Common validation rules
│   └── field-type-definitions.json
│
└── scripts/
    ├── setup-dev-env.sh
    ├── run-full-stack.sh
    └── deploy-production.sh
```

## Directory Descriptions

### `/tier1-compiler` - Research & Compilation Platform

**Purpose:** Heavy-weight backend system that researches laws, best practices, and cultural norms to generate JSON schemas.

**Technology:** Python, FastAPI, LangChain, PostgreSQL
**Deployment:** Cloud-based (AWS, GCP, or Azure)
**Resource Requirements:** High (CPU for LLM calls, memory for caching)

**Key Components:**
- **Agents:** Independent research specialists (legal, cultural, domain experts)
- **Research:** Web scraping, API integration, search engines
- **Schema Generator:** Combines research into structured JSON
- **API:** REST endpoints for triggering research and retrieving schemas
- **Database:** Stores research results, schemas, and cache

### `/tier2-runtime` - Form Runtime Engine

**Purpose:** Lightweight frontend that renders forms from JSON schemas, collects data, and works offline.

**Technology:** Vanilla JavaScript (or Alpine.js), Vite, PWA
**Deployment:** Edge devices, low-cost hardware, offline environments
**Resource Requirements:** Very low (<512MB RAM, minimal CPU)

**Key Components:**
- **Schema Parser:** Reads and validates JSON schemas
- **Form Builder:** Dynamically generates forms from schema
- **Validator:** Client-side validation based on schema rules
- **Storage:** Local persistence (IndexedDB, SQLite)
- **Offline Support:** Service workers, sync queues

### `/examples` - Example Schemas

Real-world examples of generated schemas for different domains and regions.

### `/shared` - Shared Specifications

Documentation and definitions shared between both tiers:
- JSON schema format specification
- Field type definitions
- Validation rule catalog

---

## Development Workflow

### Phase 1: MVP Development

1. **Set up Tier 1 (Compiler)**
   ```bash
   cd tier1-compiler
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   python src/main.py
   ```

2. **Set up Tier 2 (Runtime)**
   ```bash
   cd tier2-runtime
   npm install
   npm run dev
   ```

3. **Test with Example Schema**
   - Load `examples/kenya-health-intake-schema.json` into runtime
   - Verify form renders correctly
   - Test on low-resource VM

### Phase 2: Integration

1. **Connect Tiers**
   - Tier 1 API generates schemas
   - Tier 2 fetches schemas from API
   - Test full workflow

2. **Add Agents**
   - Implement legal research agent
   - Add best practice agent
   - Integrate cultural context agent

### Phase 3: Production Hardening

1. **Optimize Tier 2**
   - Bundle size analysis (<50KB target)
   - Performance profiling
   - Offline mode testing

2. **Deploy Tier 1**
   - Containerize with Docker
   - Set up CI/CD
   - Production database

---

## Configuration Files

### `tier1-compiler/requirements.txt`

```
fastapi==0.109.0
uvicorn==0.27.0
pydantic==2.5.0
sqlalchemy==2.0.25
alembic==1.13.1
langchain==0.1.0
anthropic==0.18.0
google-generativeai==0.3.0
beautifulsoup4==4.12.0
scrapy==2.11.0
playwright==1.40.0
redis==5.0.1
celery==5.3.0
python-dotenv==1.0.0
httpx==0.26.0
psycopg2-binary==2.9.9
```

### `tier2-runtime/package.json`

```json
{
  "name": "chameleon-runtime",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest",
    "build:electron": "electron-builder"
  },
  "dependencies": {
    "alpinejs": "^3.13.0",
    "ajv": "^8.12.0",
    "dexie": "^3.2.4",
    "localforage": "^1.10.0"
  },
  "devDependencies": {
    "vite": "^5.0.0",
    "vite-plugin-pwa": "^0.17.0",
    "vitest": "^1.0.0",
    "electron": "^28.0.0",
    "electron-builder": "^24.9.0"
  }
}
```

---

## Environment Variables

### Tier 1 (Compiler)

```env
# .env file
DATABASE_URL=postgresql://user:pass@localhost:5432/chameleon
REDIS_URL=redis://localhost:6379/0

# AI API Keys
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_AI_API_KEY=...

# Web Search
BRAVE_SEARCH_API_KEY=...
SERPER_API_KEY=...

# Application
DEBUG=false
LOG_LEVEL=INFO
CACHE_TTL=3600
```

### Tier 2 (Runtime)

```env
# .env.production
VITE_API_BASE_URL=https://api.chameleon.example.com
VITE_ENABLE_ENCRYPTION=true
VITE_OFFLINE_MODE=true
```

---

## Git Workflow

```bash
# Main branches
main              # Production-ready code
develop           # Integration branch
feature/*         # Feature branches
bugfix/*          # Bug fix branches
release/*         # Release preparation
```

---

## Next Steps

1. ✅ Review this structure
2. ✅ Create initial directories
3. ✅ Set up Tier 1 Python environment
4. ✅ Set up Tier 2 JavaScript environment
5. ✅ Implement minimal schema parser (Tier 2)
6. ✅ Implement minimal schema generator (Tier 1)
7. ✅ Test with example schema
8. ✅ Iterate and expand

---

**Last Updated:** January 9, 2026
