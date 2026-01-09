
import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({ apiKey });

async function testToolStream() {
  try {
    console.log("Testing tool stream...");
    const response = await ai.models.generateContentStream({
      model: 'gemini-2.0-flash',
      contents: 'What is the current stock price of Google?',
      config: {
        tools: [{ googleSearch: {} }],
      }
    });

    for await (const chunk of response) {
      // console.log("Raw Chunk Keys:", Object.keys(chunk));
      
      const c = chunk as any;
      if (c.functionCalls && c.functionCalls().length > 0) {
        console.log("Found Function Call:", c.functionCalls());
      }
      
      if (c.text && typeof c.text === 'function') {
         try { console.log("Text:", c.text()); } catch(e) { /* ignore */ }
      }
    }
  } catch (e) {
    console.error("Test failed:", e);
  }
}

testToolStream();
