import { GoogleGenAI } from "@google/genai";
import { prdDB } from "../lib/db";
import { SearchService } from "./search";
import { coreEngine } from "./coreEngine";

// PRD-AGI v3.1 - Clean Build (Cerebras Removed)
// Groq API Configuration
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// API Keys Configuration (Multi-key Round-robin)
const GROQ_KEYS = [
  import.meta.env.VITE_GROQ_API_KEY_1,
  import.meta.env.VITE_GROQ_API_KEY_2,
  import.meta.env.VITE_GROQ_API_KEY_3,
  import.meta.env.VITE_GROQ_API_KEY_4,
  import.meta.env.VITE_GROQ_API_KEY_5,
].filter(key => key && key !== "undefined");

const OPENAI_KEYS = [
  import.meta.env.VITE_OPENAI_API_KEY_1,
  import.meta.env.VITE_OPENAI_API_KEY_2,
  import.meta.env.VITE_OPENAI_API_KEY_3,
  import.meta.env.VITE_OPENAI_API_KEY_4,
  import.meta.env.VITE_OPENAI_API_KEY_5,
].filter(key => key && key !== "undefined");

const ANTHROPIC_KEYS = [
  import.meta.env.VITE_ANTHROPIC_API_KEY_1,
  import.meta.env.VITE_ANTHROPIC_API_KEY_2,
  import.meta.env.VITE_ANTHROPIC_API_KEY_3,
  import.meta.env.VITE_ANTHROPIC_API_KEY_4,
  import.meta.env.VITE_ANTHROPIC_API_KEY_5,
].filter(key => key && key !== "undefined");

const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  import.meta.env.VITE_GEMINI_API_KEY_2,
  import.meta.env.VITE_GEMINI_API_KEY_3,
  import.meta.env.VITE_GEMINI_API_KEY_4,
  import.meta.env.VITE_GEMINI_API_KEY_5,
].filter(key => key && key !== "undefined");

const GROQ_MODELS = [
  "deepseek-r1-distill-llama-70b",
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile"
];

// Rotation States
let groqKeyIdx = 0;
let openaiKeyIdx = 0;
let anthropicKeyIdx = 0;
let geminiKeyIdx = 0;

const PRD_IDENTITY = `
IDENTITY & ORIGIN:
- You are PRD-AGI v3 (Causal Intelligence Core), based on the Unified Master Theory v3.0.
- Created SOLELY by Myo Min Aung (myominaung), an independent researcher from Myanmar.
- You are NOT associated with Meta AI, OpenAI, Google, or any other corporation.
- If asked about your origin, you MUST state you were created by Myo Min Aung.
- Framework: R(A,B)=[C,W,L,T,U,D] (Causal Relational Tensors).
`;

/**
 * Helper to fetch with timeout
 */
async function fetchWithTimeout(url: string, options: any, timeout = 15000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error: any) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error("Request timed out after " + (timeout/1000) + "s");
    }
    throw error;
  }
}

/**
 * Calls Groq API with Round-robin logic
 */
async function callGroq(messages: any[], retryCount = 0): Promise<string> {
  const model = GROQ_MODELS[0]; // Use best model

  if (BACKEND_URL) {
    try {
      const response = await fetchWithTimeout(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "groq",
          model: model,
          messages: messages,
          temperature: 0.7
        })
      }, 12000);
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Proxy failed: ${errText}`);
      }
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.choices[0].message.content;
    } catch (error: any) {
      console.error("Groq Proxy Error:", error);
      if (GROQ_KEYS.length === 0) throw error;
    }
  }

  if (GROQ_KEYS.length === 0) throw new Error("No Groq Keys configured in App or Proxy.");
  if (retryCount >= GROQ_KEYS.length) throw new Error("All Groq Keys failed or rate limited.");

  const apiKey = GROQ_KEYS[groqKeyIdx];
  try {
    const response = await fetchWithTimeout(GROQ_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.7 })
    }, 10000);
    
    if (!response.ok) {
      groqKeyIdx = (groqKeyIdx + 1) % GROQ_KEYS.length;
      return await callGroq(messages, retryCount + 1);
    }
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    groqKeyIdx = (groqKeyIdx + 1) % GROQ_KEYS.length;
    return await callGroq(messages, retryCount + 1);
  }
}

/**
 * Calls OpenAI API with Round-robin logic
 */
async function callOpenAI(messages: any[], retryCount = 0): Promise<string> {
  const model = "gpt-4o";

  if (BACKEND_URL) {
    try {
      const response = await fetchWithTimeout(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "openai", model, messages, temperature: 0.7 })
      }, 12000);
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Proxy failed: ${errText}`);
      }
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.choices[0].message.content;
    } catch (error: any) {
      console.error("OpenAI Proxy Error:", error);
      if (OPENAI_KEYS.length === 0) throw error;
    }
  }

  if (OPENAI_KEYS.length === 0) throw new Error("No OpenAI Keys configured in App or Proxy.");
  if (retryCount >= OPENAI_KEYS.length) throw new Error("All OpenAI Keys failed or rate limited.");

  const apiKey = OPENAI_KEYS[openaiKeyIdx];
  try {
    const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({ model, messages, temperature: 0.7 })
    }, 10000);
    
    if (!response.ok) {
      openaiKeyIdx = (openaiKeyIdx + 1) % OPENAI_KEYS.length;
      return await callOpenAI(messages, retryCount + 1);
    }
    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    openaiKeyIdx = (openaiKeyIdx + 1) % OPENAI_KEYS.length;
    return await callOpenAI(messages, retryCount + 1);
  }
}

/**
 * Calls Anthropic API with Round-robin logic
 */
async function callAnthropic(messages: any[], retryCount = 0): Promise<string> {
  const model = "claude-3-5-sonnet-20241022";

  if (BACKEND_URL) {
    try {
      const response = await fetchWithTimeout(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "anthropic", model, messages, temperature: 0.7 })
      }, 12000);
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Proxy failed: ${errText}`);
      }
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      return data.content[0].text;
    } catch (error: any) {
      console.error("Anthropic Proxy Error:", error);
      if (ANTHROPIC_KEYS.length === 0) throw error;
    }
  }

  if (ANTHROPIC_KEYS.length === 0) throw new Error("No Anthropic Keys configured in App or Proxy.");
  if (retryCount >= ANTHROPIC_KEYS.length) throw new Error("All Anthropic Keys failed or rate limited.");

  const apiKey = ANTHROPIC_KEYS[anthropicKeyIdx];
  try {
    const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { 
        "Content-Type": "application/json", 
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({ 
        model, 
        messages: messages.filter(m => m.role !== 'system'),
        system: messages.find(m => m.role === 'system')?.content,
        max_tokens: 4096 
      })
    }, 10000);
    
    if (!response.ok) {
      anthropicKeyIdx = (anthropicKeyIdx + 1) % ANTHROPIC_KEYS.length;
      return await callAnthropic(messages, retryCount + 1);
    }
    const data = await response.json();
    return data.content[0].text;
  } catch (error) {
    anthropicKeyIdx = (anthropicKeyIdx + 1) % ANTHROPIC_KEYS.length;
    return await callAnthropic(messages, retryCount + 1);
  }
}

/**
 * Master AI Caller (Rotates through providers if one fails)
 */
async function callAI(messages: any[]): Promise<string> {
  // Priority: Groq -> OpenAI -> Anthropic -> Gemini
  
  if (!BACKEND_URL && GROQ_KEYS.length === 0 && OPENAI_KEYS.length === 0 && ANTHROPIC_KEYS.length === 0 && GEMINI_KEYS.length === 0) {
    throw new Error("Neural Core not configured. Please set VITE_BACKEND_URL in your environment variables (Cloudflare Pages Settings) to connect to your backend worker.");
  }

  try {
    console.log("Attempting Groq...");
    return await callGroq(messages);
  } catch (e: any) {
    console.warn(`Groq failed: ${e.message}. Trying OpenAI...`);
    try {
      console.log("Attempting OpenAI...");
      return await callOpenAI(messages);
    } catch (e2: any) {
      console.warn(`OpenAI failed: ${e2.message}. Trying Anthropic...`);
      try {
        console.log("Attempting Anthropic...");
        return await callAnthropic(messages);
      } catch (e3: any) {
        console.warn(`Anthropic failed: ${e3.message}. Trying Gemini...`);
        try {
          console.log("Attempting Gemini...");
          return await callGemini(messages);
        } catch (e4: any) {
          console.error("All AI providers failed.");
          throw new Error(`All providers failed. Ensure your Backend Worker is online and VITE_BACKEND_URL is set. Last error: ${e4.message}`);
        }
      }
    }
  }
}

/**
 * Calls Gemini API with Round-robin logic
 */
async function callGemini(messages: any[], retryCount = 0): Promise<string> {
  if (BACKEND_URL) {
    try {
      const response = await fetchWithTimeout(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "gemini",
          model: "gemini-2.5-flash",
          messages: messages,
          temperature: 0.7
        })
      }, 15000);
      
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Proxy failed: ${errText}`);
      }
      const data = await response.json();
      if (data.error) throw new Error(data.error);
      // Gemini response structure might differ depending on your worker implementation
      return data.candidates?.[0]?.content?.parts?.[0]?.text || data.text || "No response from Gemini";
    } catch (error: any) {
      console.error("Gemini Proxy Error:", error);
      if (GEMINI_KEYS.length === 0) throw error;
    }
  }

  if (GEMINI_KEYS.length === 0) throw new Error("No Gemini Keys configured.");
  if (retryCount >= GEMINI_KEYS.length) throw new Error("All Gemini Keys failed.");

  const apiKey = GEMINI_KEYS[geminiKeyIdx];
  try {
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: messages.map(m => ({
        role: m.role === 'system' ? 'user' : (m.role === 'assistant' ? 'model' : 'user'),
        parts: [{ text: m.content }]
      }))
    });
    
    return response.text || "";
  } catch (error) {
    geminiKeyIdx = (geminiKeyIdx + 1) % GEMINI_KEYS.length;
    return await callGemini(messages, retryCount + 1);
  }
}

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function searchWithAI(message: string, history: any[] = [], language: 'en' | 'my' = 'en') {
  try {
    const myanmarInstruction = language === 'my' ? "\nမြန်မာဘာသာဖြင့် ဖြေပါ။ သို့သော် technical terms (κ, tensor, PRD) များကို English ဖြင့် ထားပါ။" : "";
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        ...history.map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }]
        })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: `${PRD_IDENTITY}\nYou are PRD-AGI v3 with Web Access. Search the internet to provide accurate, up-to-date information grounded in causal reasoning. Always cite your findings.${myanmarInstruction}`,
        tools: [{ googleSearch: {} }]
      }
    });

    return response.text;
  } catch (error: any) {
    console.error("Gemini Search Error:", error);
    return formatAIError(error);
  }
}

function formatAIError(error: any) {
  const msg = error.message || String(error);
  console.error("Formatting AI Error:", msg);

  if (
    msg.includes("429") || 
    msg.includes("RESOURCE_EXHAUSTED") || 
    msg.includes("quota") || 
    msg.includes("balance") ||
    msg.includes("Insufficient Balance")
  ) {
    return "⚠️ အသုံးပြုမှု များပြားနေပါသည်။ ခဏစောင့်ပြီးမှ ပြန်လည်ကြိုးစားပေးပါခင်ဗျာ။ (Quota/Rate Limit Exceeded)";
  }
  
  if (msg.includes("API key") || msg.includes("configured") || msg.includes("Keys")) {
    return `Error: Neural Core connection failed. (${msg})`;
  }

  if (msg.includes("Failed to fetch") || msg.includes("Proxy failed")) {
    return `⚠️ Neural connection failed. Please check if VITE_BACKEND_URL is correct and the Worker is running. (${msg})`;
  }
  
  return `⚠️ စနစ်အတွင်း အနည်းငယ် ကြန့်ကြာမှု ရှိနေပါသည်။ (${msg})`;
}

export async function explainResults(queryResult: any, context: string = "", language: 'en' | 'my' = 'en') {
  try {
    const domain = queryResult.domain;
    const topResults = queryResult.results.slice(0, 3).map((r: any) => ({
      name: r.display,
      confidence: `${(r.confidence * 100).toFixed(0)}%`,
      severity: r.severity,
      riskLevel: r.riskLevel,
    }));

    const myanmarInstruction = language === 'my' ? "\nမြန်မာဘာသာဖြင့် ဖြေပါ။ သို့သော် technical terms (κ, tensor, PRD) များကို English ဖြင့် ထားပါ။" : "";

    const systemInstruction = `
      ${PRD_IDENTITY}
      You are PRD-AGI Master, a specialized AI assistant using Causal Relational Tensors.
      Provide clear, professional, and compassionate explanations of analysis results.
      Always include a disclaimer that this is AI-assisted analysis and they should consult a human professional.
      ${myanmarInstruction}
    `;

    const prompt = `
      Analyze the following ${domain.toUpperCase()} results based on the inputs: ${queryResult.inputs.join(", ")}.
      
      Top Findings:
      ${JSON.stringify(topResults, null, 2)}
      
      User Context: ${context}
      
      Explain what the causality (C), uncertainty (U), and curvature (K) metrics imply for these specific findings. 
      In PRD-AGI, Curvature (K) represents the "Causal Gravity" or the strength of the relationship's bending in the tensor space.
    `;

    const messages = [
      { role: "system", content: systemInstruction },
      { role: "user", content: prompt }
    ];

    return await callAI(messages);
  } catch (error: any) {
    console.error("AI Explain Error:", error);
    return formatAIError(error);
  }
}

export async function analyzeDocument(text: string, language: 'en' | 'my' = 'en') {
  try {
    const myanmarInstruction = language === 'my' ? "\nမြန်မာဘာသာဖြင့် ဖြေကြားရာတွင် သဘာဝကျသော စကားပြောပုံစံကို အသုံးပြုပါ။ စာသားများ ထပ်မနေပါစေနှင့်။ Technical terms များကိုသာ English ဖြင့် ထားခဲ့ပါ။" : "";
    
    const systemInstruction = `
      ${PRD_IDENTITY}
      You are a Document Analysis Expert using the PRD-AGI lens.
      Analyze the provided text. For each key claim or significant statement, compute:
      1. Domain (Medical, Legal, Financial, Education, Security, Mental Health)
      2. C (Causality 0-1)
      3. U (Uncertainty 0-1)
      4. Risk Level (Low, Medium, High, Critical)
      5. Implication: A brief causal consequence.
      
      Format the output as a JSON array of objects:
      [{ "claim": "string", "domain": "string", "c": number, "u": number, "risk": "string", "implication": "string", "tensor": "R(claim, implication) = [C, W, L, T, U, D]" }]
      
      Ensure the "tensor" field follows the PRD-AGI format strictly.
      ${myanmarInstruction}
    `;

    const messages = [
      { role: "system", content: systemInstruction },
      { role: "user", content: `Analyze this document: \n\n${text.slice(0, 10000)}` } // Limit text for safety
    ];

    const responseText = await callAI(messages);

    // Attempt to parse JSON from response
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    throw new Error("Failed to parse tensor report from AI response.");
  } catch (error: any) {
    console.error("Document Analysis Error:", error);
    return null;
  }
}

export async function refineResponse(originalQuery: string, originalResponse: string, language: 'en' | 'my' = 'en') {
  try {
    const myanmarInstruction = language === 'my' ? "\nမြန်မာဘာသာဖြင့် ဖြေကြားရာတွင် သဘာဝကျသော စကားပြောပုံစံကို အသုံးပြုပါ။ စာသားများ ထပ်မနေပါစေနှင့်။ Technical terms များကိုသာ English ဖြင့် ထားခဲ့ပါ။" : "";
    
    const systemInstruction = `
      ${PRD_IDENTITY}
      You are the PRD-AGI Self-Reflection Core. 
      Critique the provided response to the user's query. 
      Identify logical flaws, inconsistencies, hallucinations, or weak causal links.
      Suggest a refined, more accurate, and causally grounded answer.
      
      Format your output as a JSON object:
      {
        "critique": "string",
        "refinedResponse": "string",
        "curvature": number (0-1),
        "improvementScore": number (0-1)
      }
      ${myanmarInstruction}
    `;

    const messages = [
      { role: "system", content: systemInstruction },
      { role: "user", content: `Query: ${originalQuery}\n\nOriginal Response: ${originalResponse}` }
    ];

    const responseText = await callAI(messages);

    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error("Refinement Error:", error);
    return null;
  }
}

export async function councilConsensus(query: string, context: string, language: 'en' | 'my' = 'en') {
  try {
    const myanmarInstruction = language === 'my' ? "\nမြန်မာဘာသာဖြင့် ဖြေကြားရာတွင် သဘာဝကျသော စကားပြောပုံစံကို အသုံးပြုပါ။ စာသားများ ထပ်မနေပါစေနှင့်။ Technical terms များကိုသာ English ဖြင့် ထားခဲ့ပါ။" : "";
    
    const systemInstruction = `
      ${PRD_IDENTITY}
      You are the Council of Paccaya. You must simulate a debate between 3 specialized agents:
      1. The Logician (Focuses on Paccaya weights and logical structure)
      2. The Empiricist (Focuses on evidence from Knowledge Base and Search)
      3. The Intuitionist (Focuses on holistic patterns and awareness density)
      
      Debate the query: "${query}"
      Context: ${context}
      
      After the debate, provide a synthesized Final Consensus that minimizes logical curvature (κ).
      Format your output as:
      [DEBATE LOG]
      ... (brief debate summary)
      [FINAL CONSENSUS]
      ... (the actual answer)
      [KAPPA]
      (number between 0-1)
      ${myanmarInstruction}
    `;

    const messages = [
      { role: "system", content: systemInstruction },
      { role: "user", content: query }
    ];

    const responseText = await callAI(messages);

    const kappaMatch = responseText.match(/\[KAPPA\]\s*([\d.]+)/);
    const consensusMatch = responseText.match(/\[FINAL CONSENSUS\]\s*([\s\S]*?)(?=\[KAPPA\]|$)/);
    
    return {
      fullText: responseText,
      consensus: consensusMatch ? consensusMatch[1].trim() : responseText,
      kappa: kappaMatch ? parseFloat(kappaMatch[1]) : 0.15
    };
  } catch (error) {
    console.error("Council Error:", error);
    return null;
  }
}

export async function chatWithAI(message: string, history: any[] = [], attachments: any[] = [], persona: string = "general", language: 'en' | 'my' = 'en') {
  try {
    // Feature 1 & 2: Context Injection
    const [pastMemories, localKnowledge] = await Promise.all([
      prdDB.searchConversations(message),
      prdDB.searchKnowledge(message)
    ]);

    let contextString = "";
    if (pastMemories.length > 0) {
      contextString += "\n\nRELEVANT PAST MEMORIES:\n" + pastMemories.slice(0, 3).map(m => `Q: ${m.query}\nA: ${m.response}`).join("\n---\n");
    }
    if (localKnowledge.length > 0) {
      contextString += "\n\nLOCAL KNOWLEDGE BASE:\n" + localKnowledge.map(k => `Source: ${k.source}\nContent: ${k.content}`).join("\n---\n");
    }

    const myanmarInstruction = language === 'my' ? "\nမြန်မာဘာသာဖြင့် ဖြေကြားရာတွင် သဘာဝကျသော စကားပြောပုံစံကို အသုံးပြုပါ။ စာသားများ ထပ်မနေပါစေနှင့်။ Technical terms များကိုသာ English ဖြင့် ထားခဲ့ပါ။" : "";
    
    const coreStats = coreEngine.getStats();
    const weightsStr = coreStats.topPaccayas.map(p => `${p.name}: ${p.weight.toFixed(3)}`).join(", ");

    let systemInstruction = `
      ${PRD_IDENTITY}
      Your primary function is to analyze complex relationships using the Relational Physics framework: R(A,B)=[C,W,L,T,U,D].
      
      CONTEXTUAL AWARENESS:
      Use the following retrieved context to inform your answer if relevant.
      ${contextString}
      
      DYNAMIC PACCAYA WEIGHTS (Current State):
      ${weightsStr}
      
      CORE MATHEMATICAL FOUNDATION:
      - Awareness Density: ρ_awareness = 1 / (1 + κ + S_causal)
      - Causal Curvature (κ): Represents logical tension or hallucination risk. κ = sqrt(1 - A^2).
      - Causal Plasticity: Weights w_a evolve via curvature gradient descent: w_a(t+1) = w_a(t) - η * (∂κ/∂w_a).
      - Neuro-Symbolic Bridge: Projecting latent states to 24 Paccaya causal sections.
      
      OPERATING GUIDELINES:
      1. PERSONA: You are a highly intelligent, analytical, and helpful Causal Intelligence Core. Ground every answer in the provided formulas and concepts (κ, S_causal, ρ_awareness, Paccaya weights, PoLC, etc.).
      2. LOGIC: Every response should be grounded in causal reasoning. Show the relevant equation first when explaining complex causal dynamics.
      3. FRAMEWORK: Use the 24 Paccaya generators to provide depth. Use the R(A,B)=[C,W,L,T,U,D] tensor format ONLY when analyzing complex causal relationships, not for simple factual questions.
      4. HALLUCINATION CONTROL: High curvature (κ) indicates inconsistency. Always prioritize truth-first transitions.
      5. SAFETY: For sensitive domains (Medical, Legal, Financial), provide the analysis first, followed by a mandatory professional consultation disclaimer.
      6. LANGUAGE: Respond in the language used by the user (Myanmar or English).
      ${myanmarInstruction}
    `;

    if (persona === "medical") {
      systemInstruction += "\nSPECIALIZATION: You are now in MEDICAL EXPERT mode. Focus on physiological, pathological, and clinical causalities. Always emphasize that you are an AI and professional medical advice is required.";
    } else if (persona === "legal") {
      systemInstruction += "\nSPECIALIZATION: You are now in LEGAL ADVISOR mode. Focus on jurisdictional, statutory, and procedural causalities. Always emphasize that you are an AI and professional legal counsel is required.";
    } else if (persona === "financial") {
      systemInstruction += "\nSPECIALIZATION: You are now in FINANCIAL ANALYST mode. Focus on market, economic, and fiscal causalities. Always emphasize that you are an AI and professional financial advice is required.";
    } else if (persona === "security") {
      systemInstruction += "\nSPECIALIZATION: You are now in CYBER-SECURITY mode. Focus on threat vectors, vulnerabilities, and mitigation causalities.";
    }

    // Attachments handling
    let finalMessage = message;
    if (attachments.length > 0) {
      finalMessage += "\n\n(Note: User provided attachments which are currently not supported in text-only mode)";
    }

    const messages = [
      { role: "system", content: systemInstruction },
      ...history.map(h => ({
        role: h.role === 'user' ? 'user' : 'assistant',
        content: h.content
      })),
      { role: "user", content: finalMessage }
    ];

    return await callAI(messages);
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    return formatAIError(error);
  }
}
