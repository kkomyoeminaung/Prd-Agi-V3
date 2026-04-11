/**
 * PRD-AGI Master — Universal Causal Tensor Engine
 * R(x, y) = [C, W, L, T, U, D]
 */

export type LogicType = "Law" | "Fuzzy";

export interface RelationalTensorData {
  C: number;
  W: number;
  L: LogicType;
  T: number;
  U: number;
  D: number;
  identity?: string;
  domain?: string;
  category?: string;
  severity?: string;
  extra?: Record<string, any>;
}

export class RelationalTensor {
  C: number;
  W: number;
  L: LogicType;
  T: number;
  U: number;
  D: number;
  identity?: string;
  domain: string;
  category: string;
  severity: string;
  extra: Record<string, any>;

  constructor(data: RelationalTensorData) {
    this.C = Math.max(0, Math.min(1, data.C));
    this.W = Math.max(1e-6, data.W);
    this.L = data.L === "Law" ? "Law" : "Fuzzy";
    this.T = Math.max(0, Math.min(1, data.T));
    this.U = Math.max(0, Math.min(1, data.U));
    this.D = [-1, 0, 1].includes(data.D) ? data.D : 1;
    this.identity = data.identity;
    this.domain = data.domain || "general";
    this.category = data.category || "general";
    this.severity = data.severity || "medium";
    this.extra = data.extra || {};
  }

  score(): number {
    const base = 0.4 * this.C + 0.3 * Math.min(this.W, 1.0) + 0.2 * (1 - this.U) + 0.1 * this.T;
    return Math.min(1.0, base);
  }

  confidence(): number {
    return Math.max(0, Math.min(1, this.C * (1.0 - this.U)));
  }

  riskLevel(): string {
    const c = this.confidence();
    if (c > 0.82) return "CRITICAL";
    if (c > 0.65) return "HIGH";
    if (c > 0.50) return "MEDIUM";
    return "LOW";
  }

  toDict() {
    return {
      C: Number(this.C.toFixed(4)),
      W: Number(this.W.toFixed(4)),
      L: this.L,
      T: Number(this.T.toFixed(4)),
      U: Number(this.U.toFixed(4)),
      D: this.D,
      identity: this.identity,
      domain: this.domain,
      category: this.category,
      severity: this.severity,
      score: Number(this.score().toFixed(3)),
      confidence: Number(this.confidence().toFixed(3)),
      riskLevel: this.riskLevel(),
    };
  }
}

export const DISCLAIMERS: Record<string, string> = {
  medical: "AI-assisted analysis only. Consult a qualified medical professional.",
  legal: "AI-assisted analysis only. Consult a qualified lawyer.",
  financial: "AI financial analysis only. Not financial advice.",
  education: "AI learning guidance only. Supplement with qualified teacher.",
  security: "AI-assisted threat analysis for educational/research purposes only.",
  mental: "AI companion only. Not a substitute for professional mental health care.",
  general: "PRD-AGI analysis — AI-assisted only.",
};

export const CRISIS_KEYWORDS = [
  "suicide", "suicidal", "kill myself", "want to die", "self harm",
  "self-harm", "hurt myself", "can't go on", "end my life",
];

export const CRISIS_DISCLAIMER =
  "If you are in crisis, please contact a crisis line immediately: " +
  "Crisis Text Line (US): Text HOME to 741741 | " +
  "Samaritans (UK): 116 123 | Lifeline (AU): 13 11 14";
