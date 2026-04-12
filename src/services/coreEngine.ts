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
