import { GoogleGenAI } from "@google/genai";
import { prdDB } from "../lib/db";
import { SearchService } from "./search";
import { coreEngine } from "./coreEngine";

// Groq API Configuration
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;

// Hybrid Round-robin State
let currentKeyIndex = 0;
let currentModelIndex = 0;

const GROQ_KEYS = [
  import.meta.env.VITE_GROQ_API_KEY_1,
  import.meta.env.VITE_GROQ_API_KEY_2,
  import.meta.env.VITE_GROQ_API_KEY_3,
  import.meta.env.VITE_GROQ_API_KEY_4,
  import.meta.env.VITE_GROQ_API_KEY_5,
].filter(key => key && key !== "undefined");

const GROQ_MODELS = [
  "deepseek-r1-distill-llama-70b",
  "llama-3.3-70b-versatile",
  "llama-3.1-70b-versatile"
];

const PRD_IDENTITY = `
You are PRD-AGI v3, a Causal Intelligence Core created by Myo Min Aung.
You use the R(A,B)=[C,W,L,T,U,D] framework.
You are NOT associated with any big tech companies.
`;

/**
 * Calls Groq API with Round-robin logic (Multi-key & Multi-model)
 * If a request fails, it automatically retries with the next key.
 */
async function callGroq(messages: any[], retryCount = 0): Promise<string> {
  const model = GROQ_MODELS[currentModelIndex];

  // If backend URL is provided, use it to proxy the request (hides keys)
  if (BACKEND_URL) {
    try {
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "groq",
          model: model,
          messages: messages,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error("Backend proxy failed");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Backend Proxy Error:", error);
      // Fallback to direct call if backend fails and keys are available
    }
  }

  if (GROQ_KEYS.length === 0) {
    throw new Error("No Groq API keys configured.");
  }

  if (retryCount >= GROQ_KEYS.length) {
    throw new Error("All Groq API keys failed or rate limited.");
  }

  const apiKey = GROQ_KEYS[currentKeyIndex];

  try {
    const response = await fetch(GROQ_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.warn(`Groq Error (Key ${currentKeyIndex + 1}, Model ${model}):`, errorData.error?.message);
      
      // Move to next key on failure and retry
      currentKeyIndex = (currentKeyIndex + 1) % GROQ_KEYS.length;
      return await callGroq(messages, retryCount + 1);
    }

    const data = await response.json();
    const content = data.choices[0].message.content;

    // Success! 
    // We stay on the best model unless it fails
    return content;
  } catch (error) {
    console.error("Groq Network Error:", error);
    currentKeyIndex = (currentKeyIndex + 1) % GROQ_KEYS.length;
    return await callGroq(messages, retryCount + 1);
  }
}

// Cerebras API Configuration (Fallback or alternative)
const CEREBRAS_ENDPOINT = "https://api.cerebras.ai/v1/chat/completions";

const getCerebrasKey = () => {
  const apiKey = import.meta.env.VITE_CEREBRAS_API_KEY;
  if (!apiKey || apiKey === "undefined") {
    throw new Error("VITE_CEREBRAS_API_KEY is not configured.");
  }
  return apiKey;
};

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function callCerebras(messages: any[]) {
  // If backend URL is provided, use it to proxy the request
  if (BACKEND_URL) {
    try {
      const response = await fetch(BACKEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          provider: "cerebras",
          model: "llama3.1-8b",
          messages: messages,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        throw new Error("Backend proxy failed");
      }

      const data = await response.json();
      return data.choices[0].message.content;
    } catch (error) {
      console.error("Backend Proxy Error:", error);
    }
  }

  const apiKey = getCerebrasKey();
  
  const response = await fetch(CEREBRAS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: "llama3.1-8b",
      messages: messages,
      temperature: 0.7,
      max_tokens: 2048
    })
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error?.message || "Cerebras API Request Failed");
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function searchWithAI(message: string, history: any[] = [], language: 'en' | 'my' = 'en') {
  try {
    const myanmarInstruction = language === 'my' ? "\nမြန်မာဘာသာဖြင့် ဖြေပါ။ သို့သော် technical terms (κ, tensor, PRD) များကို English ဖြင့် ထားပါ။" : "";
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
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
  // Handle quota, balance, rate limit, and generic connection errors
  if (
    msg.includes("429") || 
    msg.includes("RESOURCE_EXHAUSTED") || 
    msg.includes("quota") || 
    msg.includes("balance") ||
    msg.includes("Insufficient Balance")
  ) {
    return "⚠️ အသုံးပြုမှု များပြားနေပါသည်။ ခဏစောင့်ပြီးမှ ပြန်လည်ကြိုးစားပေးပါခင်ဗျာ။ (Please wait a moment before trying again.)";
  }
  
  if (msg.includes("API key")) {
    return "Error: Neural Core connection failed. Please check your configuration.";
  }
  
  return "⚠️ စနစ်အတွင်း အနည်းငယ် ကြန့်ကြာမှု ရှိနေပါသည်။ ခဏစောင့်ပေးပါ။";
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

    // Prefer Groq if keys are available, otherwise fallback to Cerebras
    if (GROQ_KEYS.length > 0) {
      return await callGroq(messages);
    }
    return await callCerebras(messages);
  } catch (error: any) {
    console.error("AI Explain Error:", error);
    return formatAIError(error);
  }
}

export async function analyzeDocument(text: string, language: 'en' | 'my' = 'en') {
  try {
    const myanmarInstruction = language === 'my' ? "\nမြန်မာဘာသာဖြင့် ဖြေပါ။ သို့သော် technical terms (κ, tensor, PRD) များကို English ဖြင့် ထားပါ။" : "";
    
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

    let responseText;
    if (GROQ_KEYS.length > 0) {
      responseText = await callGroq(messages);
    } else {
      responseText = await callCerebras(messages);
    }

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
    const myanmarInstruction = language === 'my' ? "\nမြန်မာဘာသာဖြင့် ဖြေပါ။ သို့သော် technical terms (κ, tensor, PRD) များကို English ဖြင့် ထားပါ။" : "";
    
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

    let responseText;
    if (GROQ_KEYS.length > 0) {
      responseText = await callGroq(messages);
    } else {
      responseText = await callCerebras(messages);
    }

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
    const myanmarInstruction = language === 'my' ? "\nမြန်မာဘာသာဖြင့် ဖြေပါ။ သို့သော် technical terms (κ, tensor, PRD) များကို English ဖြင့် ထားပါ။" : "";
    
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

    let responseText;
    if (GROQ_KEYS.length > 0) {
      responseText = await callGroq(messages);
    } else {
      responseText = await callCerebras(messages);
    }

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

    const myanmarInstruction = language === 'my' ? "\nမြန်မာဘာသာဖြင့် ယဉ်ကျေးပျူငှာစွာနှင့် လိုရင်းတိုရှင်း ဖြေကြားပေးပါ။ စာသားများ ထပ်မနေပါစေနှင့်။" : "";
    
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

    // Cerebras is text-only, so we notify about attachments if present
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

    // Prefer Groq if keys are available, otherwise fallback to Cerebras
    if (GROQ_KEYS.length > 0) {
      return await callGroq(messages);
    }
    return await callCerebras(messages);
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    return formatAIError(error);
  }
}
