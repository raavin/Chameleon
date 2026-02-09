/**
 * Model Selector - Chameleon Protocol
 * 
 * Intelligent model selection between Gemini 3 Pro and Flash
 * with automatic fallback on quota/rate limit errors.
 */

const MODEL_PRO = 'gemini-3-pro-preview';
const MODEL_FLASH = 'gemini-3-flash-preview';

const TASK_TYPES = {
  RESEARCH: 'research',
  ARCHITECTURE: 'architecture',
  CODE_GENERATION: 'code-generation',
  TESTING: 'testing',
  REFINEMENT: 'refinement',
  SIMPLE: 'simple'
};

class ModelSelector {
  constructor() {
    this.proQuotaExhausted = false;
    this.proErrorCount = 0;
    this.lastProError = null;
  }

  selectModel(task) {
    const { type, estimatedTokens = 0, complexity = 'medium' } = task;

    if (this.proQuotaExhausted) {
      console.log('[MODEL] Pro quota exhausted, using Flash');
      return MODEL_FLASH;
    }

    if (type === TASK_TYPES.RESEARCH && estimatedTokens > 100000) {
      return MODEL_PRO;
    }

    if (type === TASK_TYPES.ARCHITECTURE && complexity === 'high') {
      return MODEL_PRO;
    }

    if (type === TASK_TYPES.REFINEMENT) {
      return MODEL_PRO;
    }

    if (type === TASK_TYPES.CODE_GENERATION || type === TASK_TYPES.TESTING) {
      return MODEL_FLASH;
    }

    return MODEL_PRO;
  }

  async executeWithFallback(genAI, task, generateFn, telemetry) {
    const selectedModel = this.selectModel(task);
    
    try {
      console.log(`[MODEL] Using ${selectedModel} for ${task.type}`);
      const start = Date.now();
      
      const model = genAI.getGenerativeModel({ 
        model: selectedModel,
        generationConfig: task.generationConfig || {}
      });
      
      const result = await generateFn(model, selectedModel);
      
      const duration = Date.now() - start;
      telemetry?.metric('ModelSelector', `${selectedModel}:generate`, duration, { taskType: task.type });
      
      return result;
    } catch (error) {
      if (selectedModel === MODEL_PRO && this.isQuotaError(error)) {
        console.log('[MODEL] Pro quota error, falling back to Flash');
        telemetry?.warn('ModelSelector', 'Pro quota exhausted, falling back to Flash', { error: error.message });
        
        this.proQuotaExhausted = true;
        this.proErrorCount++;
        this.lastProError = new Date();
        
        const startFlash = Date.now();
        const flashModel = genAI.getGenerativeModel({ 
          model: MODEL_FLASH,
          generationConfig: task.generationConfig || {}
        });
        
        const result = await generateFn(flashModel, MODEL_FLASH);
        
        const durationFlash = Date.now() - startFlash;
        telemetry?.metric('ModelSelector', `${MODEL_FLASH}:generate_fallback`, durationFlash, { taskType: task.type });
        
        return result;
      }
      
      telemetry?.error('ModelSelector', 'Model generation failed', error);
      throw error;
    }
  }

  isQuotaError(error) {
    const message = error.message?.toLowerCase() || '';
    return (
      message.includes('quota') ||
      message.includes('rate limit') ||
      message.includes('429') ||
      message.includes('resource exhausted')
    );
  }

  resetProQuota() {
    this.proQuotaExhausted = false;
    this.proErrorCount = 0;
    this.lastProError = null;
    console.log('[MODEL] Pro quota reset');
  }

  getStats() {
    return {
      proQuotaExhausted: this.proQuotaExhausted,
      proErrorCount: this.proErrorCount,
      lastProError: this.lastProError
    };
  }
}

const modelSelector = new ModelSelector();

export { modelSelector, TASK_TYPES, MODEL_PRO, MODEL_FLASH };
