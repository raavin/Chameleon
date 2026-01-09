# Chameleon Quick Start Guide

Get up and running with Chameleon in under 30 minutes.

---

## Prerequisites

**For Tier 1 (Compiler):**
- Python 3.10 or higher
- pip or poetry
- API keys: Claude/Gemini (at least one)

**For Tier 2 (Runtime):**
- Node.js 18+ (or just a web browser for static version)
- Modern web browser

**For Testing:**
- Git
- Text editor / IDE

---

## Option A: Start with Runtime Only (Fastest)

If you just want to see how the form runtime works with an existing schema:

### Step 1: Create Basic Runtime

```bash
# Create directory structure
mkdir -p tier2-runtime/src
cd tier2-runtime
```

### Step 2: Create minimal HTML file

Create `tier2-runtime/index.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chameleon Form Runtime</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
            background: #f5f5f5;
        }
        .form-container {
            background: white;
            padding: 30px;
            border-radius: 8px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .field-group {
            margin-bottom: 20px;
        }
        label {
            display: block;
            font-weight: 600;
            margin-bottom: 5px;
            color: #333;
        }
        input, select, textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 4px;
            font-size: 14px;
        }
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: #2E7D32;
        }
        .required::after {
            content: " *";
            color: #D32F2F;
        }
        .help-text {
            font-size: 12px;
            color: #666;
            margin-top: 4px;
        }
        .error {
            color: #D32F2F;
            font-size: 12px;
            margin-top: 4px;
        }
        button {
            background: #2E7D32;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
        }
        button:hover {
            background: #1B5E20;
        }
        .page {
            display: none;
        }
        .page.active {
            display: block;
        }
        .progress {
            height: 4px;
            background: #e0e0e0;
            border-radius: 2px;
            margin-bottom: 30px;
        }
        .progress-bar {
            height: 100%;
            background: #2E7D32;
            border-radius: 2px;
            transition: width 0.3s;
        }
    </style>
</head>
<body>
    <div class="form-container">
        <h1 id="form-title">Loading...</h1>
        <div class="progress">
            <div class="progress-bar" id="progress-bar" style="width: 0%"></div>
        </div>
        <div id="form-content"></div>
        <div style="margin-top: 30px; display: flex; gap: 10px;">
            <button id="prev-btn" style="display: none;">Previous</button>
            <button id="next-btn">Next</button>
            <button id="submit-btn" style="display: none;">Submit</button>
        </div>
    </div>

    <script src="src/runtime.js"></script>
</body>
</html>
```

### Step 3: Create minimal runtime engine

Create `tier2-runtime/src/runtime.js`:

```javascript
// Simple Chameleon Runtime Engine - MVP
class ChameleonRuntime {
    constructor() {
        this.schema = null;
        this.currentPage = 0;
        this.formData = {};
    }

    async loadSchema(path) {
        const response = await fetch(path);
        this.schema = await response.json();
        this.render();
    }

    render() {
        const { form } = this.schema;
        document.getElementById('form-title').textContent = form.title;

        this.renderPage(this.currentPage);
        this.updateProgress();
        this.updateButtons();
    }

    renderPage(pageIndex) {
        const page = this.schema.form.pages[pageIndex];
        const container = document.getElementById('form-content');
        container.innerHTML = '';

        // Hide all pages
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));

        // Create page
        const pageDiv = document.createElement('div');
        pageDiv.className = 'page active';
        pageDiv.innerHTML = `<h2>${page.title}</h2>`;

        // Render sections
        page.sections.forEach(section => {
            const sectionDiv = document.createElement('div');
            sectionDiv.innerHTML = `<h3>${section.title}</h3>`;

            section.fields.forEach(field => {
                const fieldDiv = this.renderField(field);
                sectionDiv.appendChild(fieldDiv);
            });

            pageDiv.appendChild(sectionDiv);
        });

        container.appendChild(pageDiv);
    }

    renderField(field) {
        const div = document.createElement('div');
        div.className = 'field-group';

        let fieldHTML = '';
        const labelClass = field.required ? 'required' : '';

        switch(field.type) {
            case 'text':
            case 'email':
            case 'tel':
                fieldHTML = `
                    <label class="${labelClass}">${field.label}</label>
                    <input
                        type="${field.type}"
                        id="${field.id}"
                        name="${field.id}"
                        ${field.required ? 'required' : ''}
                        ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}
                        value="${this.formData[field.id] || ''}"
                    >
                    ${field.helpText ? `<div class="help-text">${field.helpText}</div>` : ''}
                `;
                break;

            case 'date':
                fieldHTML = `
                    <label class="${labelClass}">${field.label}</label>
                    <input
                        type="date"
                        id="${field.id}"
                        name="${field.id}"
                        ${field.required ? 'required' : ''}
                        value="${this.formData[field.id] || ''}"
                    >
                    ${field.helpText ? `<div class="help-text">${field.helpText}</div>` : ''}
                `;
                break;

            case 'select':
                const options = field.options.map(opt =>
                    `<option value="${opt.value}" ${this.formData[field.id] === opt.value ? 'selected' : ''}>${opt.label}</option>`
                ).join('');
                fieldHTML = `
                    <label class="${labelClass}">${field.label}</label>
                    <select id="${field.id}" name="${field.id}" ${field.required ? 'required' : ''}>
                        <option value="">-- Select --</option>
                        ${options}
                    </select>
                    ${field.helpText ? `<div class="help-text">${field.helpText}</div>` : ''}
                `;
                break;

            case 'radio':
                const radioOptions = field.options.map(opt => `
                    <label style="display: block; margin: 8px 0;">
                        <input
                            type="radio"
                            name="${field.id}"
                            value="${opt.value}"
                            ${this.formData[field.id] === opt.value ? 'checked' : ''}
                        > ${opt.label}
                    </label>
                `).join('');
                fieldHTML = `
                    <label class="${labelClass}">${field.label}</label>
                    ${radioOptions}
                    ${field.helpText ? `<div class="help-text">${field.helpText}</div>` : ''}
                `;
                break;

            case 'checkbox':
                fieldHTML = `
                    <label>
                        <input
                            type="checkbox"
                            id="${field.id}"
                            name="${field.id}"
                            ${this.formData[field.id] ? 'checked' : ''}
                        > ${field.label}
                    </label>
                `;
                break;

            case 'textarea':
                fieldHTML = `
                    <label class="${labelClass}">${field.label}</label>
                    <textarea
                        id="${field.id}"
                        name="${field.id}"
                        rows="${field.rows || 3}"
                        ${field.required ? 'required' : ''}
                        ${field.placeholder ? `placeholder="${field.placeholder}"` : ''}
                    >${this.formData[field.id] || ''}</textarea>
                    ${field.helpText ? `<div class="help-text">${field.helpText}</div>` : ''}
                `;
                break;

            case 'html':
                fieldHTML = field.content;
                break;

            default:
                fieldHTML = `<p>Unsupported field type: ${field.type}</p>`;
        }

        div.innerHTML = fieldHTML;
        return div;
    }

    saveCurrentPage() {
        const page = this.schema.form.pages[this.currentPage];
        page.sections.forEach(section => {
            section.fields.forEach(field => {
                const element = document.getElementById(field.id);
                if (element) {
                    if (element.type === 'checkbox') {
                        this.formData[field.id] = element.checked;
                    } else if (element.type === 'radio') {
                        const selected = document.querySelector(`input[name="${field.id}"]:checked`);
                        if (selected) this.formData[field.id] = selected.value;
                    } else {
                        this.formData[field.id] = element.value;
                    }
                }
            });
        });
    }

    nextPage() {
        this.saveCurrentPage();
        if (this.currentPage < this.schema.form.pages.length - 1) {
            this.currentPage++;
            this.renderPage(this.currentPage);
            this.updateProgress();
            this.updateButtons();
        }
    }

    prevPage() {
        this.saveCurrentPage();
        if (this.currentPage > 0) {
            this.currentPage--;
            this.renderPage(this.currentPage);
            this.updateProgress();
            this.updateButtons();
        }
    }

    updateProgress() {
        const progress = ((this.currentPage + 1) / this.schema.form.pages.length) * 100;
        document.getElementById('progress-bar').style.width = `${progress}%`;
    }

    updateButtons() {
        const prevBtn = document.getElementById('prev-btn');
        const nextBtn = document.getElementById('next-btn');
        const submitBtn = document.getElementById('submit-btn');

        prevBtn.style.display = this.currentPage > 0 ? 'block' : 'none';

        if (this.currentPage === this.schema.form.pages.length - 1) {
            nextBtn.style.display = 'none';
            submitBtn.style.display = 'block';
        } else {
            nextBtn.style.display = 'block';
            submitBtn.style.display = 'none';
        }
    }

    submit() {
        this.saveCurrentPage();
        console.log('Form submitted:', this.formData);
        alert('Form submitted! Check console for data.');

        // In production, this would save to local storage or sync to server
        localStorage.setItem('chameleon_submission', JSON.stringify({
            schema: this.schema.form.id,
            timestamp: new Date().toISOString(),
            data: this.formData
        }));
    }
}

// Initialize
const runtime = new ChameleonRuntime();

// Load schema (update path as needed)
runtime.loadSchema('../examples/kenya-health-intake-schema.json');

// Button handlers
document.getElementById('next-btn').addEventListener('click', () => runtime.nextPage());
document.getElementById('prev-btn').addEventListener('click', () => runtime.prevPage());
document.getElementById('submit-btn').addEventListener('click', () => runtime.submit());
```

### Step 4: Test it

```bash
# Simple HTTP server (Python)
python -m http.server 8000

# Or with Node.js
npx serve .

# Or with PHP
php -S localhost:8000
```

Open browser to `http://localhost:8000/tier2-runtime/`

You should see the Kenya health intake form!

---

## Option B: Full Stack Development

### Step 1: Set up project structure

```bash
# Create directories
mkdir -p tier1-compiler/src/agents
mkdir -p tier1-compiler/src/schema
mkdir -p tier1-compiler/tests
mkdir -p tier2-runtime/src
mkdir -p examples
mkdir -p docs

# Initialize git
git init
```

### Step 2: Set up Tier 1 (Python)

```bash
cd tier1-compiler

# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Create requirements.txt
cat > requirements.txt << EOF
fastapi==0.109.0
uvicorn==0.27.0
pydantic==2.5.0
langchain==0.1.0
anthropic==0.18.0
google-generativeai==0.3.0
python-dotenv==1.0.0
httpx==0.26.0
EOF

# Install dependencies
pip install -r requirements.txt

# Create .env file
cat > .env << EOF
ANTHROPIC_API_KEY=your-key-here
GOOGLE_AI_API_KEY=your-key-here
DEBUG=true
EOF
```

### Step 3: Create minimal agent (Tier 1)

Create `tier1-compiler/src/agents/legal_agent.py`:

```python
"""
Legal Research Agent - Finds applicable laws and regulations
"""
from anthropic import Anthropic
import os

class LegalAgent:
    def __init__(self):
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

    def research(self, domain: str, country: str) -> dict:
        """Research legal requirements for a domain in a country"""

        prompt = f"""You are a legal research specialist. Find all applicable laws and
regulations for {domain} in {country}.

Focus on:
1. Data protection and privacy laws
2. Sector-specific regulations
3. Consent and disclosure requirements
4. Data retention and storage rules

Output in JSON format with:
- Law name and reference
- Year enacted
- Specific requirements
- Official source URL

Be thorough but concise."""

        message = self.client.messages.create(
            model="claude-sonnet-4-5-20250929",
            max_tokens=4000,
            messages=[
                {"role": "user", "content": prompt}
            ]
        )

        # In production, parse the JSON response
        return {
            "raw_response": message.content[0].text,
            "domain": domain,
            "country": country
        }

# Test
if __name__ == "__main__":
    agent = LegalAgent()
    result = agent.research("healthcare", "Kenya")
    print(result)
```

### Step 4: Create schema generator (Tier 1)

Create `tier1-compiler/src/schema/generator.py`:

```python
"""
Schema Generator - Creates JSON schemas from research
"""
import json
from datetime import datetime

class SchemaGenerator:
    def generate(self, research_data: dict, domain: str, country: str) -> dict:
        """Generate a JSON schema from research data"""

        schema = {
            "meta": {
                "schemaVersion": "1.0.0",
                "generatedDate": datetime.utcnow().isoformat() + "Z",
                "targetRegion": country,
                "targetCountry": self._get_country_code(country),
                "domain": domain,
                "language": "en"
            },
            "compliance": {
                "laws": [],
                "standards": []
            },
            "form": {
                "id": f"{domain}-intake-v1",
                "title": f"{domain.title()} Intake Form",
                "pages": []
            }
        }

        # In production, parse research_data and build form fields
        # For now, return basic structure

        return schema

    def _get_country_code(self, country: str) -> str:
        """Get ISO country code"""
        codes = {
            "Kenya": "KE",
            "Nigeria": "NG",
            "India": "IN"
        }
        return codes.get(country, "XX")

# Test
if __name__ == "__main__":
    generator = SchemaGenerator()
    schema = generator.generate({}, "healthcare", "Kenya")
    print(json.dumps(schema, indent=2))
```

### Step 5: Run first test

```bash
cd tier1-compiler
python src/agents/legal_agent.py
```

---

## Next Steps After Quick Start

### Immediate (Day 1-2)
1. ✅ Get runtime working with example schema
2. ✅ Test on an old device or low-memory VM
3. ✅ Customize example schema for your use case

### Short Term (Week 1)
1. ✅ Implement full legal research agent
2. ✅ Add schema validation
3. ✅ Build simple API endpoint (FastAPI)
4. ✅ Connect runtime to API

### Medium Term (Weeks 2-4)
1. ✅ Add more agent types (cultural, best practice)
2. ✅ Improve form runtime (validation, offline mode)
3. ✅ Test with real users
4. ✅ Iterate based on feedback

---

## Troubleshooting

### Runtime not loading schema
- Check browser console for errors
- Verify schema path is correct
- Make sure you're serving files over HTTP (not file://)

### API key errors
- Verify .env file exists and has correct keys
- Check keys are valid
- Ensure venv is activated

### Form not rendering
- Check browser console for JavaScript errors
- Verify schema JSON is valid (use JSONLint)
- Ensure all required fields are present in schema

---

## Resources

- **Claude API Docs:** https://docs.anthropic.com/
- **Gemini API Docs:** https://ai.google.dev/docs
- **FastAPI Tutorial:** https://fastapi.tiangolo.com/tutorial/
- **PWA Guide:** https://web.dev/progressive-web-apps/

---

**Last Updated:** January 9, 2026
