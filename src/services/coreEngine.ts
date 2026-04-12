import { prdDB } from '../lib/db';

/**
 * PRD-AGI Core Engine
 * Implements Feature 4 (Self-Learning) and Feature 5 (Core Protection)
 */

const PACC_NAMES = [
  "Hetu", "Arammana", "Adhipati", "Anantara", "Samanantara", "Sahajata",
  "Annamanna", "Nissaya", "Upanissaya", "Purejata", "Pacchajata", "Asevana",
  "Kamma", "Vipaka", "Ahara", "Indriya", "Jhana", "Magga", "Sampayutta",
  "Vippayutta", "Atthi", "Natthi", "Vigata", "Avigata"
];

class CoreEngine {
  private weights: number[] = new Array(24).fill(1/24);
  private interactionCount = 0;
  private rollbackCount = 0;
  private lastSnapshotTime: number | null = null;
  private integrityStatus: 'Secure' | 'Corrupted' | 'Restored' = 'Secure';
  private currentKappa = 0.15;

  // Closure to protect weights from direct console access
  private getProtectedWeights() {
    return Object.freeze([...this.weights]);
  }

  async init() {
    const saved = await prdDB.getWeights();
    if (saved) {
      this.weights = saved;
    }
    await this.verifyIntegrity();
  }

  // Feature 4: Self-Learning (Gradient Descent)
  async updateWeights(feedback: 'up' | 'down', kappa: number) {
    this.currentKappa = kappa;
    const eta0 = 0.05;
    const S_causal = 0.2; // Simulated causal entropy
    const rho_awareness = 1 / (1 + kappa + S_causal);
    const eta = eta0 * rho_awareness;

    // Gradient descent simulation: w_a(t+1) = w_a(t) - eta * dkappa/dw_a
    // If feedback is 'down' or kappa is high, we shift weights away from current dominant ones
    const direction = feedback === 'down' || kappa > 0.4 ? 1 : -1;
    
    const newWeights = this.weights.map(w => {
      const gradient = (Math.random() - 0.5) * direction;
      return Math.max(0.01, Math.min(1, w - eta * gradient));
    });

    // Normalize
    const sum = newWeights.reduce((a, b) => a + b, 0);
    this.weights = newWeights.map(w => w / sum);

    await prdDB.saveWeights(this.weights);
    this.interactionCount++;

    if (this.interactionCount % 10 === 0) {
      await this.createSnapshot();
    }

    if (this.currentKappa > 0.6) {
      await this.rollback();
    }
  }

  // Feature 5: Core Protection
  private async createSnapshot() {
    const snapshot = {
      weights: [...this.weights],
      checksum: this.calculateChecksum(this.weights)
    };
    await prdDB.saveSnapshot(snapshot);
    this.lastSnapshotTime = Date.now();
    console.log("Core Snapshot created.");
  }

  private calculateChecksum(obj: any): string {
    return btoa(JSON.stringify(obj)).slice(0, 16);
  }

  async verifyIntegrity() {
    const currentChecksum = this.calculateChecksum(this.weights);
    const lastSnapshot = await prdDB.getLastSnapshot();
    
    if (lastSnapshot && lastSnapshot.checksum !== this.calculateChecksum(lastSnapshot.weights)) {
      this.integrityStatus = 'Corrupted';
      await this.rollback();
    } else {
      this.integrityStatus = 'Secure';
    }
  }

  async rollback() {
    const lastSnapshot = await prdDB.getLastSnapshot();
    if (lastSnapshot) {
      this.weights = lastSnapshot.weights;
      this.rollbackCount++;
      this.integrityStatus = 'Restored';
      await prdDB.saveWeights(this.weights);
      console.warn("Core Rollback triggered due to corruption or high curvature.");
    }
  }

  // Feature 7: Model Validation & Holdout Testing
  async runValidation() {
    const history = await prdDB.getRecentConversations(50);
    if (history.length < 5) return null;

    // Pick 5 random samples
    const samples = history.sort(() => 0.5 - Math.random()).slice(0, 5);
    let totalSimilarity = 0;
    let totalKappa = 0;

    for (const sample of samples) {
      // Simple keyword overlap similarity for demo
      const qWords = new Set(sample.query.toLowerCase().split(/\s+/));
      const rWords = new Set(sample.response.toLowerCase().split(/\s+/));
      const intersection = new Set([...qWords].filter(x => rWords.has(x)));
      const similarity = intersection.size / Math.max(qWords.size, 1);
      
      totalSimilarity += similarity;
      totalKappa += sample.kappa || 0.1;
    }

    const avgScore = totalSimilarity / samples.length;
    const avgKappa = totalKappa / samples.length;

    const log = {
      score: avgScore,
      kappa: avgKappa,
      status: (avgScore < 0.7 || avgKappa > 0.3) ? 'Alert' : 'Healthy'
    };

    await prdDB.saveValidationLog(log);

    if (log.status === 'Alert') {
      await this.rollback();
    }

    return log;
  }

  // Feature 8: Knowledge Distillation
  exportKnowledge() {
    const data = {
      version: '3.0',
      weights: this.weights,
      timestamp: Date.now(),
      metadata: {
        interactionCount: this.interactionCount,
        rollbackCount: this.rollbackCount
      }
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `prd-agi-knowledge-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async importKnowledge(jsonStr: string, strategy: 'replace' | 'average' | 'weighted' = 'average') {
    try {
      const data = JSON.parse(jsonStr);
      if (!data.weights || !Array.isArray(data.weights) || data.weights.length !== 24) {
        throw new Error("Invalid knowledge file format.");
      }

      const importedWeights = data.weights;

      if (strategy === 'replace') {
        this.weights = importedWeights;
      } else if (strategy === 'average') {
        this.weights = this.weights.map((w, i) => (w + importedWeights[i]) / 2);
      } else if (strategy === 'weighted') {
        // Weighted by interaction count if available
        const currentWeight = 0.7;
        const importedWeight = 0.3;
        this.weights = this.weights.map((w, i) => (w * currentWeight + importedWeights[i] * importedWeight));
      }

      // Re-normalize
      const sum = this.weights.reduce((a, b) => a + b, 0);
      this.weights = this.weights.map(w => w / sum);

      await prdDB.saveWeights(this.weights);
      await this.createSnapshot();
      this.integrityStatus = 'Restored';
      return true;
    } catch (error) {
      console.error("Import Error:", error);
      return false;
    }
  }

  getStats() {
    const sorted = this.weights
      .map((w, i) => ({ name: PACC_NAMES[i], weight: w }))
      .sort((a, b) => b.weight - a.weight);

    return {
      topPaccayas: sorted.slice(0, 3),
      integrityStatus: this.integrityStatus,
      lastSnapshotTime: this.lastSnapshotTime,
      rollbackCount: this.rollbackCount,
      currentKappa: this.currentKappa,
      weights: this.getProtectedWeights()
    };
  }

  async runDiagnostic() {
    await this.verifyIntegrity();
    return this.getStats();
  }
}

export const coreEngine = new CoreEngine();
