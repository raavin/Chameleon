import { Annotation, END, START, StateGraph } from '@langchain/langgraph';

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error('Agent timeout')), timeoutMs))
  ]);
}

export async function runLangGraphManifest({
  model,
  prompts,
  onStatus,
  onChunk,
  timeoutMs = 120000
}) {
  const AgentState = Annotation.Root({
    contextSummary: Annotation.String,
    domainResearch: Annotation.String,
    programSpecifics: Annotation.String,
    creativeDevelopment: Annotation.String,
    legalResearch: Annotation.String,
    bestPractice: Annotation.String,
    blueprint: Annotation.String,
    fieldSpec: Annotation.String,
    finalReview: Annotation.String
  });

  const graph = new StateGraph(AgentState)
    .addNode('context_step', async () => {
      const prompt = prompts.context;
      onStatus?.({
        status: 'agent:context-synthesis',
        detail: `Preparing context synthesis prompt (${prompt.length} chars). Waiting for model response...`,
        prompt
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      onStatus?.({ status: 'agent:context-synthesis', detail: `Context synthesis complete (${text.length} chars).` });
      onChunk?.(text);
      return { contextSummary: text };
    })
    .addNode('domain_research_step', async (state) => {
      const prompt = prompts.domainResearch(state.contextSummary);
      onStatus?.({
        status: 'agent:domain-research',
        detail: `Preparing domain research prompt (${prompt.length} chars). Waiting for model response...`,
        prompt
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      onStatus?.({ status: 'agent:domain-research', detail: `Domain research complete (${text.length} chars).` });
      onChunk?.(text);
      return { domainResearch: text };
    })
    .addNode('program_specifics_step', async (state) => {
      const prompt = prompts.programSpecifics(state.contextSummary, state.domainResearch);
      onStatus?.({
        status: 'agent:program-specifics',
        detail: `Preparing program specifics prompt (${prompt.length} chars). Waiting for model response...`,
        prompt
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      onStatus?.({ status: 'agent:program-specifics', detail: `Program specifics complete (${text.length} chars).` });
      onChunk?.(text);
      return { programSpecifics: text };
    })
    .addNode('creative_step', async (state) => {
      const prompt = prompts.creativeDevelopment(state.contextSummary, state.domainResearch, state.programSpecifics);
      onStatus?.({
        status: 'agent:creative-development',
        detail: `Preparing creative development prompt (${prompt.length} chars). Waiting for model response...`,
        prompt
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      onStatus?.({ status: 'agent:creative-development', detail: `Creative development complete (${text.length} chars).` });
      onChunk?.(text);
      return { creativeDevelopment: text };
    })
    .addNode('legal_step', async (state) => {
      const prompt = prompts.legalResearch(state.contextSummary, state.domainResearch, state.programSpecifics);
      onStatus?.({
        status: 'agent:legal-research',
        detail: `Preparing legal research prompt (${prompt.length} chars). Waiting for model response...`,
        prompt
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      onStatus?.({ status: 'agent:legal-research', detail: `Legal research complete (${text.length} chars).` });
      onChunk?.(text);
      return { legalResearch: text };
    })
    .addNode('best_practice_step', async (state) => {
      const prompt = prompts.bestPractice(
        state.contextSummary,
        state.domainResearch,
        state.programSpecifics,
        state.creativeDevelopment,
        state.legalResearch
      );
      onStatus?.({
        status: 'agent:best-practice',
        detail: `Preparing best-practice prompt (${prompt.length} chars). Waiting for model response...`,
        prompt
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      onStatus?.({ status: 'agent:best-practice', detail: `Best-practice checks complete (${text.length} chars).` });
      onChunk?.(text);
      return { bestPractice: text };
    })
    .addNode('blueprint_step', async (state) => {
      const prompt = prompts.blueprint(
        state.contextSummary,
        state.domainResearch,
        state.programSpecifics,
        state.creativeDevelopment,
        state.legalResearch,
        state.bestPractice
      );
      onStatus?.({
        status: 'agent:domain-blueprint',
        detail: `Preparing domain blueprint prompt (${prompt.length} chars). Waiting for model response...`,
        prompt
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      onStatus?.({ status: 'agent:domain-blueprint', detail: `Domain blueprint complete (${text.length} chars).` });
      onChunk?.(text);
      return { blueprint: text };
    })
    .addNode('fields_step', async (state) => {
      const prompt = prompts.fields(
        state.contextSummary,
        state.domainResearch,
        state.programSpecifics,
        state.creativeDevelopment,
        state.legalResearch,
        state.bestPractice,
        state.blueprint
      );
      onStatus?.({
        status: 'agent:field-spec',
        detail: `Preparing field specification prompt (${prompt.length} chars). Waiting for model response...`,
        prompt
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      onStatus?.({ status: 'agent:field-spec', detail: `Field specification complete (${text.length} chars).` });
      onChunk?.(text);
      return { fieldSpec: text };
    })
    .addNode('final_step', async (state) => {
      const prompt = prompts.finalReview(
        state.contextSummary,
        state.domainResearch,
        state.programSpecifics,
        state.creativeDevelopment,
        state.legalResearch,
        state.bestPractice,
        state.blueprint,
        state.fieldSpec
      );
      onStatus?.({
        status: 'agent:final-review',
        detail: `Preparing final review prompt (${prompt.length} chars). Waiting for model response...`,
        prompt
      });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      onStatus?.({ status: 'agent:final-review', detail: `Final review complete (${text.length} chars).` });
      onChunk?.(text);
      return { finalReview: text };
    })
    .addEdge(START, 'context_step')
    .addEdge('context_step', 'domain_research_step')
    .addEdge('domain_research_step', 'program_specifics_step')
    .addEdge('program_specifics_step', 'creative_step')
    .addEdge('creative_step', 'legal_step')
    .addEdge('legal_step', 'best_practice_step')
    .addEdge('best_practice_step', 'blueprint_step')
    .addEdge('blueprint_step', 'fields_step')
    .addEdge('fields_step', 'final_step')
    .addEdge('final_step', END);

  const app = graph.compile();
  const result = await withTimeout(app.invoke({}, { recursionLimit: 10 }), timeoutMs);
  return result;
}
