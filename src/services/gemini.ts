// Cerebras API Configuration
const CEREBRAS_ENDPOINT = "https://api.cerebras.ai/v1/chat/completions";

const getApiKey = () => {
  const apiKey = import.meta.env.VITE_CEREBRAS_API_KEY;
  if (!apiKey || apiKey === "undefined") {
    throw new Error("VITE_CEREBRAS_API_KEY is not configured.");
  }
  return apiKey;
};

async function callCerebras(messages: any[]) {
  const apiKey = getApiKey();
  
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
      
      Explain what the causality (C) and uncertainty (U) metrics imply for these specific findings.
    `;

    const messages = [
      { role: "system", content: systemInstruction },
      { role: "user", content: prompt }
    ];

    return await callCerebras(messages);
  } catch (error: any) {
    console.error("Cerebras Explain Error:", error);
    return formatAIError(error);
  }
}

export async function chatWithAI(message: string, history: any[] = [], attachments: any[] = []) {
  try {
    const systemInstruction = `
      You are PRD-AGI v3 — a truth-first AI with causal reasoning. 
      You analyze problems through the lens of relational physics: R(A,B)=[C,W,L,T,U,D].
      Be accurate, compassionate, and always note appropriate caveats.
      If the user asks about medical, legal, or financial issues, provide analysis based on causal logic but always advise professional consultation.
    `;

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

    return await callCerebras(messages);
  } catch (error: any) {
    console.error("Cerebras Chat Error:", error);
    return formatAIError(error);
  }
}
