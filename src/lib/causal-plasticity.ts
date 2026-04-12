/**
 * PRDCausalPlasticity
 * Implements the Dynamic Paccaya Weighting system.
 * 
 * The system maintains 24 weights representing the 24 Paccayas (conditions).
 * These weights are updated via gradient descent based on the 'curvature' (kappa) 
 * of the causal manifold, which is influenced by user queries and context.
 */

export class PRDCausalPlasticity {
  // 24 Paccaya weights, initialized to uniform distribution
  private weights: number[] = new Array(24).fill(1 / 24);
  
  // Learning rate parameters
  private readonly eta0 = 0.01;
  private rhoAwareness = 1.0; // Can be adjusted based on system "focus"
  
  // Perturbation for gradient approximation
  private readonly epsilon = 1e-4;

  // Paccaya Names (for display)
  public static readonly PACCAYA_NAMES = [
    "Hetu", "Arammana", "Adhipati", "Anantara", "Samanantara", "Sahajata",
    "Annamanna", "Nissaya", "Upanissaya", "Purejata", "Pacchajata", "Asevana",
    "Kamma", "Vipaka", "Ahara", "Indriya", "Jhana", "Magga",
    "Sampayutta", "Vippayutta", "Atthi", "Natthi", "Vigata", "Avigata"
  ];

  constructor() {
    // Load from localStorage if available
    const saved = localStorage.getItem('prd_paccaya_weights');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 24) {
          this.weights = parsed;
        }
      } catch (e) {
        console.error("Failed to load Paccaya weights", e);
      }
    }
  }

  /**
   * η = η₀ * ρ_awareness
   */
  private get learningRate(): number {
    return this.eta0 * this.rhoAwareness;
  }

  /**
   * Computes a simulated curvature κ based on weights and context.
   * In a real system, this would be derived from tensor confidence and embedding distance.
   */
  private computeKappa(weights: number[], contextVector: number[]): number {
    // κ = Σ (w_a * context_contribution_a)
    // We simulate a complex non-linear relationship
    let kappa = 0;
    for (let i = 0; i < weights.length; i++) {
      // Each Paccaya has a different "affinity" for different domains
      const affinity = Math.sin((i * 0.5) + (contextVector[i % contextVector.length] || 0));
      kappa += weights[i] * affinity;
    }
    // Add some non-linearity
    return Math.tanh(kappa);
  }

  /**
   * Update rule: w_a(t+1) = w_a(t) - η * (∂κ/∂w_a)
   * Uses gradient descent with small perturbation approximation.
   */
  public updateWeights(contextVector: number[]): void {
    const currentKappa = this.computeKappa(this.weights, contextVector);
    const gradients = new Array(24).fill(0);

    // 1. Compute gradients for each weight
    for (let i = 0; i < 24; i++) {
      const perturbedWeights = [...this.weights];
      perturbedWeights[i] += this.epsilon;
      
      const perturbedKappa = this.computeKappa(perturbedWeights, contextVector);
      
      // ∂κ/∂w_a ≈ (κ(w+ε) - κ(w)) / ε
      gradients[i] = (perturbedKappa - currentKappa) / this.epsilon;
    }

    // 2. Apply update: w = w - η * grad
    const lr = this.learningRate;
    for (let i = 0; i < 24; i++) {
      this.weights[i] -= lr * gradients[i];
      // Ensure weight stays in [0, 1]
      this.weights[i] = Math.max(0, Math.min(1, this.weights[i]));
    }

    // 3. Normalize to ensure sum = 1
    const sum = this.weights.reduce((a, b) => a + b, 0);
    this.weights = this.weights.map(w => w / sum);

    // 4. Persist
    localStorage.setItem('prd_paccaya_weights', JSON.stringify(this.weights));
  }

  /**
   * Returns the index and name of the dominant Paccaya for a given context.
   */
  public getDominantPaccaya(contextVector: number[]): { index: number; name: string; weight: number } {
    let maxVal = -1;
    let maxIdx = 0;

    for (let i = 0; i < 24; i++) {
      // Dominance is a function of current weight and context affinity
      const affinity = Math.abs(Math.sin((i * 0.5) + (contextVector[i % contextVector.length] || 0)));
      const score = this.weights[i] * affinity;
      
      if (score > maxVal) {
        maxVal = score;
        maxIdx = i;
      }
    }

    return {
      index: maxIdx,
      name: PRDCausalPlasticity.PACCAYA_NAMES[maxIdx],
      weight: this.weights[maxIdx]
    };
  }

  public getWeights(): number[] {
    return [...this.weights];
  }

  public setAwareness(rho: number): void {
    this.rhoAwareness = Math.max(0, Math.min(5, rho));
  }
}

export const plasticity = new PRDCausalPlasticity();
