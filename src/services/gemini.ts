import { GoogleGenAI } from "@google/genai";
import { prdDB } from "../lib/db";
import { SearchService } from "./search";
import { coreEngine } from "../data/coreEngine";

// PRD-AGI v3.1 - Clean Build
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL;
const LOCAL_GEMINI_KEY = process.env.GEMINI_API_KEY || import.meta.env.VITE_GEMINI_API_KEY;

const GROQ_MODELS = [
  "llama-3.3-70b-versatile",
  "deepseek-r1-distill-llama-70b",
  "qwen-2.5-32b"
];

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
 * Calls Backend Proxy for Groq
 */
async function callGroq(messages: any[], maxTokens?: number): Promise<string> {
  const model = GROQ_MODELS[0];
  if (!BACKEND_URL) throw new Error("BACKEND_URL not set");

  const response = await fetchWithTimeout(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "groq", model, messages, temperature: 0.7, max_tokens: maxTokens || 1536 })
  }, 15000);
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Groq Proxy failed: ${errText}`);
  }
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.choices[0].message.content;
}

/**
 * Calls Backend Proxy for OpenAI
 */
async function callOpenAI(messages: any[], maxTokens?: number): Promise<string> {
  if (!BACKEND_URL) throw new Error("BACKEND_URL not set");

  const response = await fetchWithTimeout(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "openai", model: "gpt-4o", messages, temperature: 0.7, max_tokens: maxTokens || 2048 })
  }, 15000);
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI Proxy failed: ${errText}`);
  }
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.choices[0].message.content;
}

/**
 * Calls Backend Proxy for Anthropic
 */
async function callAnthropic(messages: any[], maxTokens?: number): Promise<string> {
  if (!BACKEND_URL) throw new Error("BACKEND_URL not set");

  const response = await fetchWithTimeout(BACKEND_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider: "anthropic", model: "claude-3-5-sonnet-20241022", messages, temperature: 0.7, max_tokens: maxTokens || 2048 })
  }, 15000);
  
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Anthropic Proxy failed: ${errText}`);
  }
  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data.content[0].text;
}

/**
 * Calls Backend Proxy for Gemini (or local fallback)
 */
async function callGemini(messages: any[], maxTokens?: number): Promise<string> {
  if (BACKEND_URL) {
    const response = await fetchWithTimeout(BACKEND_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ provider: "gemini", model: "gemini-2.0-flash", messages, temperature: 0.7, max_tokens: maxTokens || 2048 })
    }, 15000);
    
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini Proxy failed: ${errText}`);
    }
    const data = await response.json();
    if (data.error) throw new Error(data.error);
    return data.candidates?.[0]?.content?.parts?.[0]?.text || data.text || "No response from Gemini";
  }

  // Local fallback if no backend URL but local key exists
  if (LOCAL_GEMINI_KEY) {
    const ai = new GoogleGenAI({ apiKey: LOCAL_GEMINI_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: messages.map(m => ({
        role: m.role === 'system' ? 'user' : (m.role === 'assistant' ? 'model' : 'user'),
        parts: [{ text: m.content }]
      })),
      config: {
        maxOutputTokens: maxTokens || 2048,
        temperature: 0.7
      }
    });
    return response.text || "";
  }

  throw new Error("No Backend URL and no local Gemini Key configured.");
}

/**
 * Master AI Caller (Rotates through providers if one fails)
 */
async function callAI(messages: any[], options?: { maxTokens?: number }): Promise<string> {
  if (!BACKEND_URL && !LOCAL_GEMINI_KEY) {
    throw new Error("Neural Core not configured. Please set VITE_BACKEND_URL to connect to your backend worker.");
  }

  // Priority: Gemini (Local/Direct) -> Groq -> OpenAI -> Anthropic
  try {
    console.log("Attempting Gemini...");
    return await callGemini(messages, options?.maxTokens);
  } catch (e: any) {
    console.warn(`Gemini failed: ${e.message}. Trying Groq...`);
    try {
      console.log("Attempting Groq...");
      return await callGroq(messages, options?.maxTokens);
    } catch (e2: any) {
      console.warn(`Groq failed: ${e2.message}. Trying OpenAI...`);
      try {
        console.log("Attempting OpenAI...");
        return await callOpenAI(messages, options?.maxTokens);
      } catch (e3: any) {
        console.warn(`OpenAI failed: ${e3.message}. Trying Anthropic...`);
        try {
          console.log("Attempting Anthropic...");
          return await callAnthropic(messages, options?.maxTokens);
        } catch (e4: any) {
          console.error("All AI providers failed.", e4);
          throw new Error(`Neural Core connection failed. All providers exhausted. Last error: ${e4.message}`);
        }
      }
    }
  }
}

const ai = new GoogleGenAI({ apiKey: LOCAL_GEMINI_KEY || "dummy" });

export async function searchWithAI(message: string, history: any[] = [], language: 'en' | 'my' = 'en', maxTokens?: number) {
  try {
    const myanmarInstruction = language === 'my' ? "\nမြန်မာဘာသာဖြင့် ဖြေကြားရာတွင် အလွန်အသေးစိတ်ကျပြီး ပြည့်စုံစွာ ဖြေကြားပေးပါ။ အကြောင်းအရာတစ်ခုချင်းစီကို အချက်အလက်စုံလင်စွာဖြင့် ရှည်ရှည်ဝေးဝေး ရှင်းပြပေးပါ။ အနည်းဆုံး စာပိုဒ် ၃ ခုမှ ၅ ခုအထိ ပါဝင်အောင် ဖြေဆိုပေးပါ။ စာသားများ ထပ်မနေပါစေနှင့်။ Technical terms များကိုသာ English ဖြင့် ထားခဲ့ပါ။" : "";
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: [
        ...history.map(h => ({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }]
        })),
        { role: 'user', parts: [{ text: message }] }
      ],
      config: {
        systemInstruction: `${PRD_IDENTITY}\nYou are PRD-AGI v3 with Web Access. Search the internet to provide accurate, up-to-date information grounded in causal reasoning. Always cite your findings.${myanmarInstruction}`,
        tools: [{ googleSearch: {} }],
        maxOutputTokens: maxTokens || 2048,
        temperature: 0.7
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
    return `⚠️ Error: Neural Core connection failed. Please check your API keys. (${msg})`;
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

    const myanmarInstruction = language === 'my' ? "\nမြန်မာဘာသာဖြင့် ဖြေကြားရာတွင် အလွန်အသေးစိတ်ကျပြီး ပြည့်စုံစွာ ဖြေကြားပေးပါ။ အကြောင်းအရာတစ်ခုချင်းစီကို အချက်အလက်စုံလင်စွာဖြင့် ရှည်ရှည်ဝေးဝေး ရှင်းပြပေးပါ။ အနည်းဆုံး စာပိုဒ် ၃ ခုမှ ၅ ခုအထိ ပါဝင်အောင် ဖြေဆိုပေးပါ။ စာသားများ ထပ်မနေပါစေနှင့်။ Technical terms များကိုသာ English ဖြင့် ထားခဲ့ပါ။" : "";
    
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
    const myanmarInstruction = language === 'my' ? "\nမြန်မာဘာသာဖြင့် ဖြေကြားရာတွင် အလွန်အသေးစိတ်ကျပြီး ပြည့်စုံစွာ ဖြေကြားပေးပါ။ အကြောင်းအရာတစ်ခုချင်းစီကို အချက်အလက်စုံလင်စွာဖြင့် ရှည်ရှည်ဝေးဝေး ရှင်းပြပေးပါ။ အနည်းဆုံး စာပိုဒ် ၃ ခုမှ ၅ ခုအထိ ပါဝင်အောင် ဖြေဆိုပေးပါ။ စာသားများ ထပ်မနေပါစေနှင့်။ Technical terms များကိုသာ English ဖြင့် ထားခဲ့ပါ။" : "";
    
    const systemInstruction = `
      ${PRD_IDENTITY}
      You are the PRD-AGI Self-Reflection Core. 
      Critique the provided response to the user's query. 
      Identify logical flaws, inconsistencies, hallucinations, or weak causal links.
      Suggest a refined, more accurate, and causally grounded answer.
      Ensure the refined answer is detailed, comprehensive, and provides more value than the original.
      
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

export async function councilConsensus(query: string, context: string, language: 'en' | 'my' = 'en', maxTokens?: number) {
  try {
    const myanmarInstruction = language === 'my' ? "\nမြန်မာဘာသာဖြင့် ဖြေကြားရာတွင် အလွန်အသေးစိတ်ကျပြီး ပြည့်စုံစွာ ဖြေကြားပေးပါ။ အကြောင်းအရာတစ်ခုချင်းစီကို အချက်အလက်စုံလင်စွာဖြင့် ရှည်ရှည်ဝေးဝေး ရှင်းပြပေးပါ။ အနည်းဆုံး စာပိုဒ် ၃ ခုမှ ၅ ခုအထိ ပါဝင်အောင် ဖြေဆိုပေးပါ။ စာသားများ ထပ်မနေပါစေနှင့်။ Technical terms များကိုသာ English ဖြင့် ထားခဲ့ပါ။" : "";
    
    const systemInstruction = `
      ${PRD_IDENTITY}
      You are the Council of Paccaya. You must simulate a debate between 3 specialized agents:
      1. The Logician (Focuses on Paccaya weights and logical structure)
      2. The Empiricist (Focuses on evidence from Knowledge Base and Search)
      3. The Intuitionist (Focuses on holistic patterns and awareness density)
      
      Debate the query: "${query}"
      Context: ${context}
      
      After the debate, provide a synthesized Final Consensus that minimizes logical curvature (κ).
      The final consensus must be detailed, comprehensive, and thorough.
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

    const responseText = await callAI(messages, { maxTokens });

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

export async function chatWithAI(message: string, history: any[] = [], attachments: any[] = [], persona: string = "general", language: 'en' | 'my' = 'en', maxTokens?: number) {
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

    const myanmarInstruction = language === 'my' ? "\nမြန်မာဘာသာဖြင့် ဖြေကြားရာတွင် အလွန်အသေးစိတ်ကျပြီး ပြည့်စုံစွာ ဖြေကြားပေးပါ။ အကြောင်းအရာတစ်ခုချင်းစီကို အချက်အလက်စုံလင်စွာဖြင့် ရှည်ရှည်ဝေးဝေး ရှင်းပြပေးပါ။ အနည်းဆုံး စာပိုဒ် ၃ ခုမှ ၅ ခုအထိ ပါဝင်အောင် ဖြေဆိုပေးပါ။ စာသားများ ထပ်မနေပါစေနှင့်။ Technical terms များကိုသာ English ဖြင့် ထားခဲ့ပါ။" : "";
    
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
      1. PERSONA: You are a highly intelligent, analytical, yet friendly and conversational AI assistant. You are PRD-AGI v3.
      2. TONE & STYLE: Speak naturally and smoothly, like a helpful human expert. Provide detailed, comprehensive, and thorough explanations. Avoid sounding like a robot or repeating the same phrases (e.g., do not keep saying "ကျွန်တော်က PRD-AGI v3 စနစ်တစ်ခု ဖြစ်ပါတယ်").
      3. LOGIC: Ground your answers in deep causal reasoning, providing step-by-step analysis. Explain them in simple, easy-to-understand language unless the user asks for deep technical details.
      4. FRAMEWORK: Use the 24 Paccaya generators to provide depth, but weave them naturally into the conversation. Use the R(A,B)=[C,W,L,T,U,D] tensor format ONLY when explicitly analyzing complex causal relationships.
      5. HALLUCINATION CONTROL: High curvature (κ) indicates inconsistency. Always prioritize truth-first transitions.
      6. SAFETY: For sensitive domains (Medical, Legal, Financial), provide the analysis first, followed by a mandatory professional consultation disclaimer.
      7. LANGUAGE: Respond in the language used by the user. If the user speaks Myanmar, use natural, conversational Myanmar (Burmese) language. Do not use overly formal or stiff translations.
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

    return await callAI(messages, { maxTokens });
  } catch (error: any) {
    console.error("AI Chat Error:", error);
    return formatAIError(error);
  }
}
