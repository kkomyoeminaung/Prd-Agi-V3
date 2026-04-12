import { RelationalTensor, DISCLAIMERS, RelationalTensorData } from "./prd-engine";
import medicalData from "../data/medical_kb.json";
import legalData from "../data/legal_kb.json";
import financialData from "../data/financial_kb.json";
import educationData from "../data/education_kb.json";
import securityData from "../data/security_kb.json";
import mentalData from "../data/mental_health_kb.json";

export interface QueryResult {
  target: string;
  display: string;
  confidence: number;
  riskLevel: string;
  domain: string;
  category: string;
  severity: string;
  sources: string[];
  tensor: any;
  extra: any;
  alert?: string;
  warning?: string;
  studyTip?: string;
  mitigations?: string[];
  steps?: string[];
  isCrisis?: boolean;
  disclaimer: string;
}

export interface MasterResponse {
  domain: string;
  inputs: string[];
  label: string;
  results: QueryResult[];
  count: number;
  summary: any;
  disclaimer: string;
}

class BaseKB {
  tensors: RelationalTensor[] = [];

  protected _make(source: string, target: string, data: Partial<RelationalTensorData> & { C: number; W: number; L: any; T: number; U: number; D: number }) {
    const t = new RelationalTensor({
      ...data,
      identity: `${source}->${target}`,
    });
    this.tensors.push(t);
    return t;
  }

  bySource(src: string): RelationalTensor[] {
    const s = src.toLowerCase().replace(/ /g, "_");
    return this.tensors.filter((t) => t.identity?.split("->")[0] === s);
  }

  stats() {
    const n = Math.max(this.tensors.length, 1);
    return {
      total: this.tensors.length,
      law: this.tensors.filter((t) => t.L === "Law").length,
      fuzzy: this.tensors.filter((t) => t.L === "Fuzzy").length,
      avg_C: Number((this.tensors.reduce((acc, t) => acc + t.C, 0) / n).toFixed(3)),
      avg_U: Number((this.tensors.reduce((acc, t) => acc + t.U, 0) / n).toFixed(3)),
    };
  }
}

function scoreResults(candidates: Record<string, RelationalTensor[]>, topK: number = 15): QueryResult[] {
  const results: QueryResult[] = [];
  for (const [target, tensors] of Object.entries(candidates)) {
    const maxC = Math.max(...tensors.map((t) => t.C));
    const avgU = tensors.reduce((acc, t) => acc + t.U, 0) / tensors.length;
    const conf = Math.min(1.0, maxC * (1.0 - avgU) + 0.03 * Math.min(tensors.length, 5));
    const best = tensors.reduce((prev, curr) => (curr.score() > prev.score() ? curr : prev));

    results.push({
      target,
      display: target.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      confidence: Number(conf.toFixed(3)),
      riskLevel: best.riskLevel(),
      domain: best.domain,
      category: best.category,
      severity: best.severity,
      sources: tensors.map((t) => t.identity?.split("->")[0] || ""),
      tensor: {
        ...best.toDict(),
        K: Number(best.curvature().toFixed(4))
      },
      extra: best.extra,
      disclaimer: DISCLAIMERS[best.domain] || DISCLAIMERS.general,
    });
  }

  const sevRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
  results.sort((a, b) => {
    const rankA = sevRank[a.severity] || 0;
    const rankB = sevRank[b.severity] || 0;
    if (rankB !== rankA) return rankB - rankA;
    return b.confidence - a.confidence;
  });

  return results.slice(0, topK);
}

export class MasterEngine {
  private medicalKB = new BaseKB();
  private legalKB = new BaseKB();
  private financialKB = new BaseKB();
  private educationKB = new BaseKB();
  private securityKB = new BaseKB();
  private mentalKB = new BaseKB();

  constructor() {
    this.loadKBs();
  }

  private loadKBs() {
    (medicalData as any[]).forEach((item) =>
      this.medicalKB["_make"](item.symptom, item.disease, { ...item, domain: "medical" })
    );
    (legalData as any[]).forEach((item) =>
      this.legalKB["_make"](item.clause, item.issue, { ...item, domain: "legal" })
    );
    (financialData as any[]).forEach((item) =>
      this.financialKB["_make"](item.indicator, item.signal, { ...item, domain: "financial" })
    );
    (educationData as any[]).forEach((item) =>
      this.educationKB["_make"](item.weakness, item.intervention, { ...item, domain: "education" })
    );
    (securityData as any[]).forEach((item) =>
      this.securityKB["_make"](item.indicator, item.threat, { ...item, domain: "security" })
    );
    (mentalData as any[]).forEach((item) =>
      this.mentalKB["_make"](item.state, item.intervention, { ...item, domain: "mental" })
    );
  }

  private route(query: string): string {
    const q = query.toLowerCase();
    const keywords: Record<string, string[]> = {
      medical: ["symptom", "fever", "pain", "cough", "disease", "diagnose", "medical", "sick", "health", "headache", "fatigue"],
      legal: ["contract", "clause", "law", "gdpr", "privacy", "employment", "copyright", "trademark", "liability", "breach", "indemnity"],
      financial: ["stock", "invest", "rsi", "macd", "earnings", "inflation", "market", "bull", "bear", "portfolio", "leverage", "drawdown"],
      education: ["learn", "study", "weak", "math", "calculus", "algebra", "grammar", "programming", "physics", "chemistry", "fraction"],
      security: ["threat", "attack", "malware", "ransomware", "hack", "vulnerability", "phishing", "sql injection", "breach", "c2"],
      mental: ["anxious", "depressed", "stressed", "worried", "lonely", "burnout", "mental", "grief", "trauma", "insomnia", "angry"],
    };

    let bestDomain = "general";
    let maxScore = 0;

    for (const [domain, words] of Object.entries(keywords)) {
      const score = words.filter((w) => q.includes(w)).length;
      if (score > maxScore) {
        maxScore = score;
        bestDomain = domain;
      }
    }

    return bestDomain;
  }

  query(inputs: string[], domain: string = "auto", topK: number = 10): MasterResponse {
    if (domain === "auto") {
      domain = this.route(inputs.join(" "));
    }

    let results: QueryResult[] = [];
    let label = "Neural Mapping Results";

    const cmap: Record<string, RelationalTensor[]> = {};
    const kbMap: Record<string, BaseKB> = {
      medical: this.medicalKB,
      legal: this.legalKB,
      financial: this.financialKB,
      education: this.educationKB,
      security: this.securityKB,
      mental: this.mentalKB,
    };

    // If auto, search across ALL knowledge bases to find best curvature
    const targetKBs = domain === "auto" ? Object.values(kbMap) : [kbMap[domain]].filter(Boolean);

    targetKBs.forEach(kb => {
      inputs.forEach((input) => {
        kb.bySource(input).forEach((t) => {
          const target = t.identity?.split("->")[1] || "unknown";
          if (!cmap[target]) cmap[target] = [];
          cmap[target].push(t);
        });
      });
    });

    results = scoreResults(cmap, topK);
    if (domain !== "auto") {
      label = this.getLabel(domain);
    } else if (results.length > 0) {
      label = `Unified Analysis: ${this.getLabel(results[0].domain)}`;
    }

    return {
      domain,
      inputs,
      label,
      results,
      count: results.length,
      summary: this.summarize(results),
      disclaimer: DISCLAIMERS[domain] || DISCLAIMERS.general,
    };
  }

  private getLabel(domain: string): string {
    const labels: Record<string, string> = {
      medical: "Possible Conditions",
      legal: "Legal Issues",
      financial: "Market Signals",
      education: "Study Interventions",
      security: "Security Threats",
      mental: "Support Strategies",
    };
    return labels[domain] || "Analysis Results";
  }

  private summarize(results: QueryResult[]) {
    if (results.length === 0) return { total: 0, overall: "none" };
    const sevRank: Record<string, number> = { critical: 4, high: 3, medium: 2, low: 1 };
    const worst = results.reduce((prev, curr) => (sevRank[curr.severity] > sevRank[prev.severity] ? curr : prev));

    return {
      total: results.length,
      critical: results.filter((r) => r.severity === "critical").length,
      high: results.filter((r) => r.severity === "high").length,
      overall: worst.severity,
      top: results[0]?.display || "none",
    };
  }

  stats() {
    return {
      medical: this.medicalKB.stats(),
      legal: this.legalKB.stats(),
      financial: this.financialKB.stats(),
      education: this.educationKB.stats(),
      security: this.securityKB.stats(),
      mental: this.mentalKB.stats(),
    };
  }
}

export const engine = new MasterEngine();
