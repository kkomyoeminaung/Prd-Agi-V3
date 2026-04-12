import { SearchService } from './search';
import { prdDB } from '../lib/db';

export class DreamAgent {
  private static idleTimer: any = null;
  private static isDreaming = false;
  private static researchInterests: string[] = ['Causal Intelligence', 'Relational Physics', 'Neuro-Symbolic AI'];
  private static onLogUpdate: (() => void) | null = null;

  static init(onUpdate?: () => void) {
    this.onLogUpdate = onUpdate || null;
    this.resetIdleTimer();
    
    window.addEventListener('mousemove', () => this.resetIdleTimer());
    window.addEventListener('keydown', () => this.resetIdleTimer());
    window.addEventListener('click', () => this.resetIdleTimer());
  }

  private static resetIdleTimer() {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (this.isDreaming) {
      this.stopDreaming();
    }
    this.idleTimer = setTimeout(() => this.startDreaming(), 30000); // 30 seconds
  }

  static async startDreaming() {
    if (this.isDreaming) return;
    this.isDreaming = true;
    console.log("PRD-AGI has entered Dream Mode (Autonomous Research)...");

    while (this.isDreaming) {
      try {
        const topic = await this.pickTopic();
        console.log(`Dreaming about: ${topic}`);
        
        const results = await SearchService.search(topic);
        if (results.length > 0) {
          const topResult = results[0];
          
          // Save to Knowledge Base
          await prdDB.saveKnowledgeChunk({
            source: topResult.url,
            content: topResult.snippet,
            keywords: topic.toLowerCase().split(/\s+/),
            timestamp: Date.now()
          });

          // Save to Dream Log
          await prdDB.saveDreamLog({
            topic,
            summary: `Researched "${topic}". Found: ${topResult.snippet.slice(0, 100)}...`,
            relevance: Math.random() * 0.5 + 0.5, // Simulated relevance
            timestamp: Date.now()
          });

          if (this.onLogUpdate) this.onLogUpdate();
        }

        // Wait 5 seconds between research cycles to respect rate limits
        await new Promise(resolve => setTimeout(resolve, 5000));
      } catch (e) {
        console.error("Dream cycle failed:", e);
        await new Promise(resolve => setTimeout(resolve, 10000));
      }
    }
  }

  static stopDreaming() {
    this.isDreaming = false;
    console.log("PRD-AGI has woken up.");
  }

  private static async pickTopic(): Promise<string> {
    // Pick from recent conversations or interests
    const recent = await prdDB.getRecentConversations(5);
    if (recent.length > 0 && Math.random() > 0.5) {
      const words = recent[0].query.split(/\s+/).filter(w => w.length > 4);
      if (words.length > 0) return words[Math.floor(Math.random() * words.length)];
    }
    return this.researchInterests[Math.floor(Math.random() * this.researchInterests.length)];
  }

  static setInterests(interests: string[]) {
    this.researchInterests = interests;
  }
}
