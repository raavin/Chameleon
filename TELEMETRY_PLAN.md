# Enhanced Telemetry & Observability Plan

## Overview
This document outlines the strategy to provide deep, real-time feedback during the Chameleon Protocol's autonomous agent execution. The goal is to expose the "brain" of the system to the user, ensuring trust and transparency by logging search scopes, data inspections, decision rationales, performance metrics, and detailed error contexts.

## 1. Standardized Telemetry Schema
We will transition from ad-hoc `onProgress({ status, detail })` callbacks to a structured Telemetry Event Schema passed via Server-Sent Events (SSE).

### Event Structure
```json
{
  "type": "log" | "metric" | "decision" | "resource" | "error",
  "timestamp": "ISO-8601",
  "source": "ResearchAgent" | "LangGraph" | "ModelSelector",
  "level": "info" | "warn" | "error" | "debug",
  "payload": {
    // Context-specific data
  }
}
```

## 2. Implementation Strategy per Requirement

### A. Search Scope (What are we looking for?)
**Target:** `ResearchAgent.js` -> `conductDeepResearch` & `generateSearchQueries`
- **Action:** Emit a `decision` event before searching.
- **Payload:**
  - `intent`: "Gather regulatory requirements for [Domain]"
  - `queries`: Array of generated search strings.
  - `constraints`: Region, date range (if applicable).
- **Example:**
  ```json
  {
    "type": "decision",
    "source": "ResearchAgent",
    "payload": {
      "stage": "query_generation",
      "rationale": "Region is Victoria, Australia; prioritizing .gov.au and .edu.au domains.",
      "queries": ["aging regulations victoria government", "aged care act 1997 summary"]
    }
  }
  ```

### B. Data Inspected (What did we find?)
**Target:** `ResearchAgent.js` -> `processDocument`
- **Action:** Emit a `resource` event when a document is successfully downloaded/parsed.
- **Payload:**
  - `url`: Source URL.
  - `contentType`: PDF/HTML.
  - `size`: Character count.
  - `relevanceScore`: (If available) or a brief snippet/summary.
- **Example:**
  ```json
  {
    "type": "resource",
    "source": "ResearchAgent",
    "payload": {
      "url": "https://legislation.vic.gov.au/...",
      "title": "Health Records Act 2001",
      "bytes_processed": 45000,
      "snippet": "The objective of this Act is to promote..."
    }
  }
  ```

### C. Decision Rationale (Why are we doing this?)
**Target:** `langGraphAgent.js` -> Node execution
- **Action:** Update each node (`context_step`, `domain_research_step`, etc.) to emit a `decision` event *before* calling the model.
- **Payload:**
  - `step`: Current workflow step.
  - `input_summary`: What data is feeding this decision (e.g., "Research found 12 sources").
  - `goal`: What the prompt is trying to achieve (e.g., "Synthesize conflicting definitions of 'homelessness'").
- **Example:**
  ```json
  {
    "type": "decision",
    "source": "LangGraph",
    "payload": {
      "step": "program_specifics",
      "observation": "Research context contains conflicting compliance rules.",
      "action": "Requesting model to prioritize stricter Federal laws over State guidelines."
    }
  }
  ```

### D. Performance Metrics (How fast is it?)
**Target:** `geminiRoutes.js`, `modelSelector.js`
- **Action:** Wrap significant async calls (Model generation, HTTP requests) with start/end timers.
- **Payload:**
  - `operation`: "generateContent", "downloadPDF".
  - `duration_ms`: Time taken.
  - `tokens`: (If available) Token usage.
- **Example:**
  ```json
  {
    "type": "metric",
    "source": "ModelSelector",
    "payload": {
      "operation": "gemini-3-pro-preview:generate",
      "duration_ms": 2450,
      "tokens_estimated": 1500
    }
  }
  ```

### E. Error Context (What went wrong?)
**Target:** Global `try/catch` blocks
- **Action:** Emit `error` events with stack traces (sanitized) and recovery attempts.
- **Payload:**
  - `code`: Error code.
  - `message`: Human readable message.
  - `context`: Variable state at time of failure.
  - `recovery`: "Retrying with Flash model" or "Skipping document".

## 3. Architecture Changes

1.  **`Telemetry` Utility Class:**
    Create `backend/src/utils/telemetry.js`. This class will instantiate with a `writeEvent` callback (from SSE) and provide methods: `.log()`, `.metric()`, `.decision()`.

2.  **Refactor Agents:**
    Inject `telemetry` instance into `ResearchAgent` constructor and `runLangGraphManifest` options instead of raw `onProgress` callbacks.

3.  **Frontend Adaptation:**
    Update the frontend SSE listener to parse these structured messages and display them in a "Terminal" or "Inspector" view, distinct from the simple progress bar.

## 4. Next Steps
1.  Create `backend/src/utils/telemetry.js`.
2.  Refactor `geminiRoutes.js` to instantiate Telemetry and pass it down.
3.  Update `ResearchAgent.js` to use Telemetry methods.
4.  Update `langGraphAgent.js` to use Telemetry methods.
