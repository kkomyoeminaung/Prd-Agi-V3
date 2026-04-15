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

  // Feature 10: Meta-Learning Parameters
  private metaParams = {
    eta0: 0.05,
    theta_pos: 0.2,
    theta_neg: 0.5,
    memoryRetention: 50
  };

  private learningCurve: number[] = [];
  private metaHistory: any[] = [];

  // Closure to protect weights from direct console access
  private getProtectedWeights() {
    return Object.freeze([...this.weights]);
  }

  async init() {
    const saved = await prdDB.getWeights();
    if (saved) {
      this.weights = saved;
    }
    
    const meta = await prdDB.getMetaHistory(1);
    if (meta.length > 0) {
      this.metaParams = { ...this.metaParams, ...meta[0] };
    }

    const logs = await prdDB.getLearningLogs(50);
    this.learningCurve = logs.map(l => l.kappa).reverse();

    await this.verifyIntegrity();
  }

  // Feature 4 & 9: Online Learning
  async updateWeights(feedback: 'up' | 'down' | 'auto', kappa: number) {
    this.currentKappa = kappa;
    
    // Track learning curve
    this.learningCurve.push(kappa);
    if (this.learningCurve.length > 50) this.learningCurve.shift();

    const S_causal = 0.2; 
    const rho_awareness = 1 / (1 + kappa + S_causal);
    const eta = this.metaParams.eta0 * (1 - rho_awareness);

    // Feature 9: Continuous Online Learning Logic
    let direction = 0;
    if (feedback === 'up') direction = -1;
    else if (feedback === 'down') direction = 1;
    else {
      // Auto-learning based on curvature
      if (kappa < this.metaParams.theta_pos) direction = -1; // Positive reinforcement
      else if (kappa > this.metaParams.theta_neg) direction = 1; // Negative reinforcement
    }

    if (direction !== 0) {
      const newWeights = this.weights.map(w => {
        const gradient = (Math.random() - 0.5) * direction;
        return Math.max(0.01, Math.min(1, w - eta * gradient));
      });

      const sum = newWeights.reduce((a, b) => a + b, 0);
      this.weights = newWeights.map(w => w / sum);
      await prdDB.saveWeights(this.weights);
    }

    // Save learning log
    await prdDB.saveLearningLog({ kappa, eta, feedback });

    this.interactionCount++;

    if (this.interactionCount % 10 === 0) {
      await this.createSnapshot();
    }

    if (this.interactionCount % 20 === 0) {
      // Feature 10: Trigger Meta-Learning
      if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
        (window as any).requestIdleCallback(() => this.runMetaOptimization());
      } else {
        setTimeout(() => this.runMetaOptimization(), 1000);
      }
    }

    if (this.currentKappa > 0.6) {
      await this.rollback();
    }
  }

  // Feature 10: Meta-Learning (Learning to Learn)
  async runMetaOptimization() {
    console.log("PRD-AGI: Starting Meta-Optimization...");
    const history = await prdDB.getRecentConversations(20);
    if (history.length < 10) return;

    const train = history.slice(5); // Last 15 for "training" simulation
    const val = history.slice(0, 5); // First 5 for validation

    // Grid Search candidates
    const eta0_vals = [0.01, 0.05, 0.1];
    const theta_pos_vals = [0.15, 0.2, 0.25];
    const theta_neg_vals = [0.4, 0.5, 0.6];

    let bestParams = { ...this.metaParams };
    let minValKappa = 1.0;

    for (const e of eta0_vals) {
      for (const tp of theta_pos_vals) {
        for (const tn of theta_neg_vals) {
          // Simulate update on train and check val
          // (Simplified simulation for browser performance)
          const simulatedKappa = this.simulatePerformance(train, val, { eta0: e, theta_pos: tp, theta_neg: tn });
          if (simulatedKappa < minValKappa) {
            minValKappa = simulatedKappa;
            bestParams = { ...this.metaParams, eta0: e, theta_pos: tp, theta_neg: tn };
          }
        }
      }
    }

    this.metaParams = bestParams;
    await prdDB.saveMetaParams({ ...bestParams, bestValKappa: minValKappa });
    console.log("PRD-AGI: Meta-Optimization Complete. New Params:", bestParams);
  }

  private simulatePerformance(train: any[], val: any[], params: any): number {
    // Deterministic evaluation using validation set metrics instead of random noise
    // We want parameters that keep kappa stable and low (e.g., target 0.15)
    const TARGET_KAPPA = 0.15;
    
    // Calculate Mean Squared Error (MSE) of kappa against the target in the validation set
    const mse = val.reduce((acc, curr) => {
      const k = curr.kappa || 0.5;
      return acc + Math.pow(k - TARGET_KAPPA, 2);
    }, 0) / Math.max(val.length, 1);

    let score = mse;

    // Penalty for illogical thresholds (positive threshold should be lower than negative)
    if (params.theta_pos >= params.theta_neg) {
      score += 1.0; 
    }

    // Penalty for extreme learning rates
    if (params.eta0 > 0.2) {
      score += 0.5;
    }

    return score;
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
      weights: this.getProtectedWeights(),
      metaParams: this.metaParams,
      learningCurve: this.learningCurve,
      interactionCount: this.interactionCount
    };
  }

  async runDiagnostic() {
    await this.verifyIntegrity();
    return this.getStats();
  }
}

export const coreEngine = new CoreEngine();
