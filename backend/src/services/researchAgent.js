/**
 * Deep Research Agent - Chameleon Protocol
 * 
 * Autonomous research agent that:
 * 1. Searches the web for regulations, legislation, academic papers
 * 2. Downloads and processes entire documents (PDFs, HTML)
 * 3. Synthesizes knowledge from multiple sources
 * 4. Builds comprehensive domain expertise
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { modelSelector, TASK_TYPES } from '../utils/modelSelector.js';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

class ResearchAgent {
  constructor(apiKey) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.knowledgeBase = [];
    this.sources = [];
    this.confidenceScore = 0;
  }

  async conductDeepResearch(domain, region, telemetry) {
    telemetry?.log('ResearchAgent', `Starting deep research on "${domain}"`, { region });

    const searchQueries = this.generateSearchQueries(domain, region);
    
    telemetry?.decision('ResearchAgent', 'Generate Search Queries', `Generated ${searchQueries.length} queries to cover regulations, standards, and best practices.`, { queries: searchQueries });

    for (const query of searchQueries) {
      await this.searchAndProcess(query, telemetry);
    }

    const synthesizedKnowledge = await this.synthesizeKnowledge(domain, telemetry);
    
    this.confidenceScore = this.calculateConfidence();
    
    telemetry?.log('ResearchAgent', 'Research complete', {
      confidence: this.confidenceScore,
      knowledgeLength: synthesizedKnowledge.length,
      sourceCount: this.sources.length
    });

    return {
      knowledge: synthesizedKnowledge,
      sources: this.sources,
      confidence: this.confidenceScore
    };
  }

  generateSearchQueries(domain, region) {
    return [
      `${domain} regulations ${region} government official`,
      `${domain} legislation ${region} requirements`,
      `${domain} compliance guidelines ${region}`,
      `${domain} best practices academic research`,
      `${domain} data collection standards ${region}`
    ];
  }

  async searchAndProcess(query, telemetry) {
    telemetry?.log('ResearchAgent', `Searching for: "${query}"`);

    try {
      const searchResults = await this.performWebSearch(query);
      
      telemetry?.log('ResearchAgent', `Found ${searchResults.length} results`, { query });

      for (const result of searchResults.slice(0, 3)) {
        await this.processDocument(result, telemetry);
      }
    } catch (error) {
      telemetry?.error('ResearchAgent', `Search failed for "${query}"`, error);
    }
  }

  async performWebSearch(query) {
    const task = {
      type: TASK_TYPES.RESEARCH,
      estimatedTokens: 50000,
      complexity: 'high',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 8000
      }
    };

    const searchPrompt = `You are a research assistant. Search for information about: "${query}"

Please provide:
1. Key findings and facts
2. Authoritative sources (government sites, .edu, peer-reviewed journals)
3. Relevant regulations or legislation
4. Best practices and standards

Focus on official, authoritative sources. Provide specific details and citations.`;

    const result = await modelSelector.executeWithFallback(
      this.genAI,
      task,
      async (model, modelName) => {
        const modelConfig = {
          model: modelName,
          generationConfig: task.generationConfig
        };

        if (modelName.includes('pro')) {
          modelConfig.tools = [{
            googleSearch: {}
          }];
        }

        const searchModel = this.genAI.getGenerativeModel(modelConfig);
        const response = await searchModel.generateContent(searchPrompt);
        return response.response.text();
      }
    );

    const findings = this.parseSearchResults(result);
    return findings;
  }

  parseSearchResults(text) {
    const results = [];
    const lines = text.split('\n');
    let currentResult = null;

    for (const line of lines) {
      if (line.match(/^https?:\/\//)) {
        if (currentResult) {
          results.push(currentResult);
        }
        currentResult = {
          url: line.trim(),
          title: '',
          content: '',
          type: this.detectDocumentType(line)
        };
      } else if (currentResult && line.trim()) {
        currentResult.content += line + '\n';
      }
    }

    if (currentResult) {
      results.push(currentResult);
    }

    if (results.length === 0) {
      results.push({
        url: 'gemini-search',
        title: 'Gemini Search Results',
        content: text,
        type: 'text'
      });
    }

    return results;
  }

  detectDocumentType(url) {
    if (url.endsWith('.pdf')) return 'pdf';
    if (url.includes('.gov')) return 'government';
    if (url.includes('.edu')) return 'academic';
    return 'web';
  }

  async processDocument(result, telemetry) {
    const { url, content, type } = result;

    telemetry?.log('ResearchAgent', `Processing document`, { type, url: url.substring(0, 60) + '...' });

    try {
      let documentText = content;

      if (type === 'pdf' && url.startsWith('http')) {
        documentText = await this.downloadAndParsePDF(url, telemetry);
      } else if (type === 'web' && url.startsWith('http')) {
        documentText = await this.scrapeWebPage(url, telemetry);
      }

      if (documentText && documentText.length > 500) {
        const extractedKnowledge = await this.extractKnowledge(documentText, telemetry);
        
        this.knowledgeBase.push({
          source: url,
          type,
          knowledge: extractedKnowledge,
          timestamp: new Date()
        });

        this.sources.push({
          url,
          type,
          chars: extractedKnowledge.length,
          preview: extractedKnowledge.substring(0, 200)
        });

        telemetry?.resource('ResearchAgent', url, type, { 
          chars_extracted: extractedKnowledge.length,
          original_length: documentText.length 
        });
      }
    } catch (error) {
      telemetry?.error('ResearchAgent', `Document processing error for ${url}`, error);
    }
  }

  async downloadAndParsePDF(url, telemetry) {
    try {
      telemetry?.log('ResearchAgent', `Downloading PDF`, { url });
      
      const start = Date.now();
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 30000,
        maxContentLength: 50 * 1024 * 1024
      });

      const data = await pdfParse(response.data);
      const duration = Date.now() - start;
      
      telemetry?.metric('ResearchAgent', 'download_pdf', duration, { pages: data.numpages, size: data.text.length });

      return data.text;
    } catch (error) {
      console.error('PDF download error:', error);
      return '';
    }
  }

  async scrapeWebPage(url, telemetry) {
    try {
      const start = Date.now();
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; ChameleonBot/1.0)'
        }
      });

      const $ = cheerio.load(response.data);
      
      $('script, style, nav, footer, header').remove();
      
      const text = $('body').text()
        .replace(/\s+/g, ' ')
        .trim();
        
      const duration = Date.now() - start;
      telemetry?.metric('ResearchAgent', 'scrape_web', duration, { url });

      return text;
    } catch (error) {
      console.error('Web scraping error:', error);
      return '';
    }
  }

  async extractKnowledge(documentText, telemetry) {
    const task = {
      type: TASK_TYPES.RESEARCH,
      estimatedTokens: Math.min(documentText.length, 1000000),
      complexity: 'high',
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 8000
      }
    };

    const extractPrompt = `You are a domain expert. Extract key knowledge from this document:

${documentText.substring(0, 500000)}

Extract:
1. Key requirements and regulations
2. Data fields and entities
3. Workflows and processes
4. Compliance rules
5. Best practices

Provide a comprehensive summary with specific details.`;

    const result = await modelSelector.executeWithFallback(
      this.genAI,
      task,
      async (model) => {
        const response = await model.generateContent(extractPrompt);
        return response.response.text();
      },
      telemetry
    );

    return result;
  }

  async synthesizeKnowledge(domain, telemetry) {
    telemetry?.decision('ResearchAgent', 'Synthesize Knowledge', `Synthesizing ${this.knowledgeBase.length} sources into a coherent domain model.`);

    if (this.knowledgeBase.length === 0) {
      return `Domain: ${domain}\n\nNo external sources found. Using general knowledge.`;
    }

    const allKnowledge = this.knowledgeBase
      .map(kb => `Source: ${kb.source}\nType: ${kb.type}\n\n${kb.knowledge}`)
      .join('\n\n---\n\n');

    const task = {
      type: TASK_TYPES.RESEARCH,
      estimatedTokens: Math.min(allKnowledge.length, 1000000),
      complexity: 'high',
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 16000
      }
    };

    const synthesisPrompt = `You are a domain expert synthesizing research on "${domain}".

You have gathered information from ${this.knowledgeBase.length} sources:

${allKnowledge.substring(0, 800000)}

Synthesize this into a comprehensive domain knowledge base:

1. **Regulatory Framework**: Key regulations, legislation, compliance requirements
2. **Data Requirements**: Required fields, entities, relationships
3. **Workflows**: Standard processes and workflows
4. **Best Practices**: Industry standards and best practices
5. **Conflicts**: Identify any conflicts between sources and resolve them

Provide a detailed, structured synthesis.`;

    const result = await modelSelector.executeWithFallback(
      this.genAI,
      task,
      async (model) => {
        const response = await model.generateContent(synthesisPrompt);
        return response.response.text();
      },
      telemetry
    );

    return result;
  }

  calculateConfidence() {
    const sourceCount = this.sources.length;
    const knowledgeSize = this.knowledgeBase.reduce((sum, kb) => sum + kb.knowledge.length, 0);
    
    const sourceScore = Math.min(sourceCount * 15, 60);
    const sizeScore = Math.min(knowledgeSize / 10000, 30);
    const diversityScore = new Set(this.sources.map(s => s.type)).size * 5;
    
    return Math.min(Math.round(sourceScore + sizeScore + diversityScore), 100);
  }
}

export { ResearchAgent };
