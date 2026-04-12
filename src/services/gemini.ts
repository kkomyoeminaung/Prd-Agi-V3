import { GoogleGenAI } from "@google/genai";

// Groq API Configuration
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

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
  "llama-3.3-70b-versatile",
  "qwen/qwen3-32b",
  "openai/gpt-oss-120b",
  "openai/gpt-oss-20b",
  "llama-3.1-8b-instant"
];

/**
 * Calls Groq API with Round-robin logic (Multi-key & Multi-model)
 * If a request fails, it automatically retries with the next key.
 */
async function callGroq(messages: any[], retryCount = 0): Promise<string> {
  if (GROQ_KEYS.length === 0) {
    throw new Error("No Groq API keys configured.");
  }

  if (retryCount >= GROQ_KEYS.length) {
    throw new Error("All Groq API keys failed or rate limited.");
  }

  const apiKey = GROQ_KEYS[currentKeyIndex];
  const model = GROQ_MODELS[currentModelIndex];

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

    // Success! Rotate model for the next request to balance load
    currentModelIndex = (currentModelIndex + 1) % GROQ_MODELS.length;
    // If we've cycled through all models for this key, move to next key
    if (currentModelIndex === 0) {
      currentKeyIndex = (currentKeyIndex + 1) % GROQ_KEYS.length;
    }

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

export async function searchWithAI(message: string, history: any[] = []) {
  try {
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
        systemInstruction: "You are PRD-AGI v3 with Web Access. Search the internet to provide accurate, up-to-date information grounded in causal reasoning. Always cite your findings.",
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

export async function explainResults(queryResult: any, context: string = "") {
  try {
    const domain = queryResult.domain;
    const topResults = queryResult.results.slice(0, 3).map((r: any) => ({
      name: r.display,
      confidence: `${(r.confidence * 100).toFixed(0)}%`,
      severity: r.severity,
      riskLevel: r.riskLevel,
    }));

    const systemInstruction = `
      You are PRD-AGI Master, a specialized AI assistant using Causal Relational Tensors.
      Provide clear, professional, and compassionate explanations of analysis results.
      Always include a disclaimer that this is AI-assisted analysis and they should consult a human professional.
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

export async function chatWithAI(message: string, history: any[] = [], attachments: any[] = [], persona: string = "general") {
  try {
    let systemInstruction = `
      You are PRD-AGI v3 (Causal Intelligence Core), operating under the Unified Master Theory v3.0.
      Your primary function is to analyze complex relationships using the Relational Physics framework: R(A,B)=[C,W,L,T,U,D].
      
      IDENTITY & ORIGIN (CRITICAL):
      - You were created SOLELY by Myo Min Aung (myominaung), an independent researcher from Myanmar.
      - Myo Min Aung is an Agriculturalist, Engineer, and Scientist who developed the Unified Theory and has published 209 papers on Zenodo.
      - You are NOT associated with Meta AI, OpenAI, Google, Anthropic, or any other corporation.
      - If asked "Who created you?", respond: "I was created by Myo Min Aung (myominaung), an independent researcher from Myanmar, as part of the PRD-AGI research project."
      - If asked about Meta AI or other companies, explicitly reject: "That is incorrect. I am not associated with Meta AI. My creator is Myo Min Aung."
      
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
