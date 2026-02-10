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
  telemetry,
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
      telemetry?.decision('LangGraph', 'Synthesize Context', 'Aggregating input domains, region, and research into a coherent program summary.', { step: 'context_step' });
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      onChunk?.(text);
      return { contextSummary: text };
    })
    .addNode('domain_research_step', async (state) => {
      const prompt = prompts.domainResearch(state.contextSummary);
      telemetry?.decision('LangGraph', 'Analyze Domain Requirements', 'Identifying specific standards and metrics for the identified program goals.', { step: 'domain_research_step' });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      onChunk?.(text);
      return { domainResearch: text };
    })
    .addNode('program_specifics_step', async (state) => {
      const prompt = prompts.programSpecifics(state.contextSummary, state.domainResearch);
      telemetry?.decision('LangGraph', 'Define Program Specifics', 'Mapping domain requirements to concrete workflow stages and data capture priorities.', { step: 'program_specifics_step' });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      onChunk?.(text);
      return { programSpecifics: text };
    })
    .addNode('creative_step', async (state) => {
      const prompt = prompts.creativeDevelopment(state.contextSummary, state.domainResearch, state.programSpecifics);
      telemetry?.decision('LangGraph', 'Develop Creative Signals', 'Brainstorming high-value, non-obvious data points for longitudinal tracking.', { step: 'creative_step' });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      onChunk?.(text);
      return { creativeDevelopment: text };
    })
    .addNode('legal_step', async (state) => {
      const prompt = prompts.legalResearch(state.contextSummary, state.domainResearch, state.programSpecifics);
      telemetry?.decision('LangGraph', 'Verify Compliance', 'Checking planned data capture against regional regulations and consent requirements.', { step: 'legal_step' });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
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
      telemetry?.decision('LangGraph', 'Quality Assurance', 'Validating the protocol against data quality standards and completeness rules.', { step: 'best_practice_step' });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
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
      telemetry?.decision('LangGraph', 'Design Blueprint', 'Structuring the validated requirements into a logical hierarchy of domains and sections.', { step: 'blueprint_step' });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
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
      telemetry?.decision('LangGraph', 'Specify Fields', 'Defining exhaustive field properties (types, options, help text) for every section.', { step: 'fields_step' });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
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
      telemetry?.decision('LangGraph', 'Final Review', 'Performing a final consistency check and identifying any remaining risk gaps.', { step: 'final_step' });

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
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
