import { openDB, IDBPDatabase } from 'idb';

export interface Conversation {
  id?: number;
  query: string;
  response: string;
  timestamp: number;
  kappa?: number;
}

export interface KnowledgeChunk {
  id?: number;
  source: string; // filename or URL
  content: string;
  keywords: string[];
  timestamp: number;
}

export interface DreamLog {
  id?: number;
  topic: string;
  summary: string;
  relevance: number;
  timestamp: number;
}

class PRDDatabase {
  private dbName = 'prd_agi_v3_db';
  private version = 2;
  private db: IDBPDatabase | null = null;

  async getDB() {
    if (this.db) return this.db;
    this.db = await openDB(this.dbName, this.version, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('conversations')) {
          db.createObjectStore('conversations', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('knowledge')) {
          db.createObjectStore('knowledge', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('dream_logs')) {
          db.createObjectStore('dream_logs', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('paccaya_weights')) {
          db.createObjectStore('paccaya_weights', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('core_snapshots')) {
          db.createObjectStore('core_snapshots', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('refinements')) {
          db.createObjectStore('refinements', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('validation_logs')) {
          db.createObjectStore('validation_logs', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('learning_logs')) {
          db.createObjectStore('learning_logs', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('meta_params')) {
          db.createObjectStore('meta_params', { keyPath: 'id', autoIncrement: true });
        }
      },
    });
    return this.db;
  }

  // Feature 1: Conversations
  async saveConversation(conv: Conversation) {
    const db = await this.getDB();
    return db.add('conversations', conv);
  }

  async getRecentConversations(limit = 20) {
    const db = await this.getDB();
    const tx = db.transaction('conversations', 'readonly');
    const store = tx.objectStore('conversations');
    const all = await store.getAll();
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  async searchConversations(query: string) {
    const db = await this.getDB();
    const all = await db.getAll('conversations');
    const q = query.toLowerCase();
    return all.filter(c => 
      c.query.toLowerCase().includes(q) || 
      c.response.toLowerCase().includes(q)
    );
  }

  // Feature 2: Knowledge Base
  async saveKnowledgeChunk(chunk: KnowledgeChunk) {
    const db = await this.getDB();
    return db.add('knowledge', chunk);
  }

  async searchKnowledge(query: string) {
    const db = await this.getDB();
    const all = await db.getAll('knowledge');
    const keywords = query.toLowerCase().split(/\s+/).filter(k => k.length > 2);
    
    return all.filter(chunk => {
      const content = chunk.content.toLowerCase();
      return keywords.some(k => content.includes(k) || chunk.keywords.includes(k));
    }).slice(0, 5);
  }

  async getKnowledge(limit = 50) {
    const db = await this.getDB();
    const all = await db.getAll('knowledge');
    return all.slice(0, limit);
  }

  // Feature 3: Dream Logs
  async saveDreamLog(log: DreamLog) {
    const db = await this.getDB();
    return db.add('dream_logs', log);
  }

  async getDreamLogs(limit = 50) {
    const db = await this.getDB();
    const all = await db.getAll('dream_logs');
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  // Feature 4 & 5: Core & Weights
  async saveWeights(weights: number[]) {
    const db = await this.getDB();
    return db.put('paccaya_weights', { id: 'current', weights, timestamp: Date.now() });
  }

  async getWeights() {
    const db = await this.getDB();
    const data = await db.get('paccaya_weights', 'current');
    return data?.weights || null;
  }

  async saveSnapshot(snapshot: any) {
    const db = await this.getDB();
    return db.add('core_snapshots', { ...snapshot, timestamp: Date.now() });
  }

  async getLastSnapshot() {
    const db = await this.getDB();
    const all = await db.getAll('core_snapshots');
    return all.sort((a, b) => b.timestamp - a.timestamp)[0] || null;
  }

  // Feature 6: Self-Refinement
  async saveRefinement(log: any) {
    const db = await this.getDB();
    return db.add('refinements', { ...log, timestamp: Date.now() });
  }

  async getRefinements(limit = 20) {
    const db = await this.getDB();
    const all = await db.getAll('refinements');
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  // Feature 7: Validation
  async saveValidationLog(log: any) {
    const db = await this.getDB();
    return db.add('validation_logs', { ...log, timestamp: Date.now() });
  }

  async getValidationLogs(limit = 20) {
    const db = await this.getDB();
    const all = await db.getAll('validation_logs');
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  // Feature 9: Learning Logs
  async saveLearningLog(log: any) {
    const db = await this.getDB();
    return db.add('learning_logs', { ...log, timestamp: Date.now() });
  }

  async getLearningLogs(limit = 50) {
    const db = await this.getDB();
    const all = await db.getAll('learning_logs');
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }

  // Feature 10: Meta Params
  async saveMetaParams(params: any) {
    const db = await this.getDB();
    return db.add('meta_params', { ...params, timestamp: Date.now() });
  }

  async getMetaHistory(limit = 20) {
    const db = await this.getDB();
    const all = await db.getAll('meta_params');
    return all.sort((a, b) => b.timestamp - a.timestamp).slice(0, limit);
  }
}

export const prdDB = new PRDDatabase();
