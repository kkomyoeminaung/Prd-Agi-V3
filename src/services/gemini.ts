import { GoogleGenAI } from "@google/genai";

// Helper to get AI instance
const getAI = () => {
  // Check both standard Vite env and process.env (injected via define)
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
  
  if (!apiKey || apiKey === "undefined") {
    throw new Error("GEMINI_API_KEY is not configured. Please set it in your environment variables.");
  }
  return new GoogleGenAI({ apiKey });
};

export async function explainResults(queryResult: any, context: string = "") {
  try {
    const ai = getAI();
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

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
      }
    });

    return response.text || "No explanation could be generated at this time.";
  } catch (error: any) {
    console.error("Gemini Explain Error:", error);
    return `Analysis Error: ${error.message || "Unknown error occurred."}`;
  }
}

export async function chatWithAI(message: string, history: any[] = [], attachments: { mimeType: string, data: string }[] = []) {
  try {
    const ai = getAI();
    const systemInstruction = `
      You are PRD-AGI v3 — a truth-first AI with causal reasoning. 
      You analyze problems through the lens of relational physics: R(A,B)=[C,W,L,T,U,D].
      Be accurate, compassionate, and always note appropriate caveats.
      If the user asks about medical, legal, or financial issues, provide analysis based on causal logic but always advise professional consultation.
      
      You have access to Google Search grounding to provide up-to-date information when needed.
    `;

    // Format history for the SDK
    const formattedHistory = history.map(h => ({
      role: h.role === 'user' ? 'user' : 'model',
      parts: [{ text: h.content }]
    }));

    // Prepare parts for the current message
    const currentParts: any[] = [{ text: message }];
    
    // Add attachments if any
    attachments.forEach(att => {
      currentParts.push({
        inlineData: {
          mimeType: att.mimeType,
          data: att.data
        }
      });
    });

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        ...formattedHistory,
        { role: "user", parts: currentParts }
      ],
      config: {
        systemInstruction,
        temperature: 0.7,
        topP: 0.95,
        tools: [
          { googleSearch: {} }
        ]
      }
    });

    return response.text || "I'm sorry, I couldn't process that request.";
  } catch (error: any) {
    console.error("Gemini Chat Error:", error);
    if (error.message?.includes("API key")) {
      return "Error: Gemini API Key is missing or invalid. Please check your environment settings.";
    }
    return `Chat Error: ${error.message || "I'm having trouble connecting to the neural core."}`;
  }
}
