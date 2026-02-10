import fs from 'fs';
import path from 'path';

class Telemetry {
  constructor({ res, runId, logDir = 'logs' }) {
    this.res = res;
    this.runId = runId || new Date().toISOString().replace(/[:.]/g, '-');
    this.logDir = path.resolve(process.cwd(), logDir);
    this.logFile = path.join(this.logDir, `run-${this.runId}.jsonl`);
    
    // Ensure log directory exists
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }
    
    // Create log file
    fs.writeFileSync(this.logFile, '');
    console.log(`[Telemetry] Initialized. Log file: ${this.logFile}`);
  }

  _emit(type, level, source, payload) {
    const event = {
      type,
      timestamp: new Date().toISOString(),
      runId: this.runId,
      source,
      level,
      payload
    };

    // 1. Write to SSE if available
    if (this.res) {
      try {
        // We wrap it in a standard "data" field for SSE compliance, 
        // but the client will parse the inner JSON.
        // If the client expects the old format { status, detail }, we might need to adapt or update the client.
        // For now, we'll send the enhanced event structure.
        this.res.write(`data: ${JSON.stringify(event)}

`);
      } catch (e) {
        console.error('Error writing to SSE:', e);
      }
    }

    // 2. Write to File
    try {
      fs.appendFileSync(this.logFile, JSON.stringify(event) + '\n');
    } catch (e) {
      console.error('Error writing to log file:', e);
    }
  }

  log(source, message, data = {}) {
    this._emit('log', 'info', source, { message, ...data });
  }

  info(source, message, data = {}) {
    this._emit('log', 'info', source, { message, ...data });
  }

  warn(source, message, data = {}) {
    this._emit('log', 'warn', source, { message, ...data });
  }

  error(source, message, error = null) {
    this._emit('error', 'error', source, { 
      message, 
      stack: error?.stack, 
      code: error?.code 
    });
  }

  decision(source, intent, rationale, data = {}) {
    this._emit('decision', 'info', source, { intent, rationale, ...data });
  }

  resource(source, url, type, metadata = {}) {
    this._emit('resource', 'info', source, { url, type, ...metadata });
  }

  metric(source, operation, durationMs, metadata = {}) {
    this._emit('metric', 'info', source, { operation, durationMs, ...metadata });
  }
}

export default Telemetry;
