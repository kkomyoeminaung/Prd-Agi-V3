// src/lib/persistence.ts

export interface ChatMessage {
  role: 'user' | 'ai';
  content: string;
  kappa?: number;
  timestamp: number;
}

export interface KappaEntry {
  timestamp: number;
  kappa: number;
}

const STORAGE_KEYS = {
  HISTORY: 'prd_chat_history',
  KEYWORDS: 'prd_keywords',
  KAPPA_TREND: 'prd_kappa_trend',
  OPT_STEPS: 'prd_opt_steps',
  LAST_KAPPA: 'prd_last_session_kappa'
};

export const persistence = {
  saveChat: (message: ChatMessage) => {
    const history = persistence.loadChat();
    history.push(message);
    if (history.length > 50) history.shift();
    localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
  },

  loadChat: (): ChatMessage[] => {
    const saved = localStorage.getItem(STORAGE_KEYS.HISTORY);
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch (e) {
      return [];
    }
  },

  trackKeywords: (text: string) => {
    const keywords = persistence.loadKeywords();
    // Simple keyword extraction: words > 4 chars
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
    words.forEach(word => {
      // Filter out common stop words if needed, but keeping it simple for now
      keywords[word] = (keywords[word] || 0) + 1;
    });
    localStorage.setItem(STORAGE_KEYS.KEYWORDS, JSON.stringify(keywords));
  },

  loadKeywords: (): Record<string, number> => {
    const saved = localStorage.getItem(STORAGE_KEYS.KEYWORDS);
    if (!saved) return {};
    try {
      return JSON.parse(saved);
    } catch (e) {
      return {};
    }
  },

  trackKappa: (kappa: number) => {
    const trend = persistence.loadKappaTrend();
    trend.push({ timestamp: Date.now(), kappa });
    if (trend.length > 100) trend.shift();
    localStorage.setItem(STORAGE_KEYS.KAPPA_TREND, JSON.stringify(trend));
    // We don't overwrite LAST_KAPPA here, we do it at the end of session or use it for comparison
  },

  saveSessionEnd: (kappa: number) => {
    localStorage.setItem(STORAGE_KEYS.LAST_KAPPA, kappa.toString());
  },

  loadKappaTrend: (): KappaEntry[] => {
    const saved = localStorage.getItem(STORAGE_KEYS.KAPPA_TREND);
    if (!saved) return [];
    try {
      return JSON.parse(saved);
    } catch (e) {
      return [];
    }
  },

  incrementOptSteps: (count: number = 1) => {
    const steps = persistence.loadOptSteps();
    localStorage.setItem(STORAGE_KEYS.OPT_STEPS, (steps + count).toString());
  },

  loadOptSteps: (): number => {
    const saved = localStorage.getItem(STORAGE_KEYS.OPT_STEPS);
    return saved ? parseInt(saved, 10) : 0;
  },

  getLastSessionKappa: (): number => {
    const saved = localStorage.getItem(STORAGE_KEYS.LAST_KAPPA);
    return saved ? parseFloat(saved) : 0.45; // Default starting kappa
  }
};
