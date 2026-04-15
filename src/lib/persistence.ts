// src/lib/persistence.ts
import { prdDB } from './db';

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
  saveChat: async (message: ChatMessage) => {
    const history = await persistence.loadChat();
    history.push(message);
    if (history.length > 50) history.shift();
    const db = await prdDB.getDB();
    await db.put('keyval', history, STORAGE_KEYS.HISTORY);
  },

  loadChat: async (): Promise<ChatMessage[]> => {
    const db = await prdDB.getDB();
    const saved = await db.get('keyval', STORAGE_KEYS.HISTORY);
    return saved || [];
  },

  trackKeywords: async (text: string) => {
    const keywords = await persistence.loadKeywords();
    const words = text.toLowerCase().match(/\b\w{4,}\b/g) || [];
    words.forEach(word => {
      keywords[word] = (keywords[word] || 0) + 1;
    });
    const db = await prdDB.getDB();
    await db.put('keyval', keywords, STORAGE_KEYS.KEYWORDS);
  },

  loadKeywords: async (): Promise<Record<string, number>> => {
    const db = await prdDB.getDB();
    const saved = await db.get('keyval', STORAGE_KEYS.KEYWORDS);
    return saved || {};
  },

  trackKappa: async (kappa: number) => {
    const trend = await persistence.loadKappaTrend();
    trend.push({ timestamp: Date.now(), kappa });
    if (trend.length > 100) trend.shift();
    const db = await prdDB.getDB();
    await db.put('keyval', trend, STORAGE_KEYS.KAPPA_TREND);
  },

  saveSessionEnd: async (kappa: number) => {
    const db = await prdDB.getDB();
    await db.put('keyval', kappa, STORAGE_KEYS.LAST_KAPPA);
  },

  loadKappaTrend: async (): Promise<KappaEntry[]> => {
    const db = await prdDB.getDB();
    const saved = await db.get('keyval', STORAGE_KEYS.KAPPA_TREND);
    return saved || [];
  },

  incrementOptSteps: async (count: number = 1) => {
    const steps = await persistence.loadOptSteps();
    const db = await prdDB.getDB();
    await db.put('keyval', steps + count, STORAGE_KEYS.OPT_STEPS);
  },

  loadOptSteps: async (): Promise<number> => {
    const db = await prdDB.getDB();
    const saved = await db.get('keyval', STORAGE_KEYS.OPT_STEPS);
    return saved || 0;
  },

  getLastSessionKappa: async (): Promise<number> => {
    const db = await prdDB.getDB();
    const saved = await db.get('keyval', STORAGE_KEYS.LAST_KAPPA);
    return saved !== undefined ? saved : 0.45;
  }
};
