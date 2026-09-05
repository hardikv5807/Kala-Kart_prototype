/**
 * Kala-Kart Decision Tree Regressor
 *
 * Implements a CART (Classification and Regression Tree) regression model.
 * Uses Mean Squared Error (variance reduction) split criterion.
 * Supports random subspace feature selection for Random Forest ensembles.
 */

export interface RegressionTreeNode {
  isLeaf: boolean;
  featureIndex?: number;
  threshold?: number;
  prediction: number;
  variance: number;
  sampleCount: number;
  left?: RegressionTreeNode | null;
  right?: RegressionTreeNode | null;
}

export interface TreeTrainConfig {
  maxDepth: number;
  minSamplesSplit: number;
  minSamplesLeaf: number;
  maxFeatures?: number; // Number of random features to evaluate at each split
}

export class DecisionTreeRegressor {
  public root: RegressionTreeNode | null = null;
  private config: TreeTrainConfig;

  constructor(config?: Partial<TreeTrainConfig>) {
    this.config = {
      maxDepth: config?.maxDepth ?? 8,
      minSamplesSplit: config?.minSamplesSplit ?? 3,
      minSamplesLeaf: config?.minSamplesLeaf ?? 2,
      maxFeatures: config?.maxFeatures,
    };
  }

  /**
   * Fits a regression tree on feature matrix X and continuous target vector y.
   */
  public fit(
    X: number[][],
    y: number[],
    featureImportances?: number[]
  ): void {
    if (X.length === 0 || y.length === 0 || X.length !== y.length) {
      throw new Error("Invalid training data dimensions provided to DecisionTreeRegressor.");
    }
    const sampleIndices = Array.from({ length: X.length }, (_, i) => i);
    this.root = this.buildTree(X, y, sampleIndices, 0, featureImportances);
  }

  /**
   * Predicts a continuous scalar for a single feature vector.
   */
  public predictSample(x: number[]): number {
    if (!this.root) {
      throw new Error("Decision tree model has not been trained.");
    }
    return this.traverse(this.root, x);
  }

  private traverse(node: RegressionTreeNode, x: number[]): number {
    if (node.isLeaf || node.featureIndex === undefined || node.threshold === undefined) {
      return node.prediction;
    }

    if (x[node.featureIndex] <= node.threshold) {
      return node.left ? this.traverse(node.left, x) : node.prediction;
    } else {
      return node.right ? this.traverse(node.right, x) : node.prediction;
    }
  }

  private buildTree(
    X: number[][],
    y: number[],
    indices: number[],
    depth: number,
    featureImportances?: number[]
  ): RegressionTreeNode {
    const numSamples = indices.length;
    const values = indices.map((i) => y[i]);

    const mean = values.reduce((a, b) => a + b, 0) / numSamples;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / numSamples;

    // Termination conditions
    if (
      depth >= this.config.maxDepth ||
      numSamples < this.config.minSamplesSplit ||
      variance < 1e-7
    ) {
      return {
        isLeaf: true,
        prediction: mean,
        variance,
        sampleCount: numSamples,
      };
    }

    const numFeatures = X[0].length;
    const featureIndices: number[] = Array.from({ length: numFeatures }, (_, i) => i);

    // Random subspace feature sampling if configured
    let featuresToTry = featureIndices;
    if (this.config.maxFeatures && this.config.maxFeatures < numFeatures) {
      featuresToTry = this.sampleWithoutReplacement(featureIndices, this.config.maxFeatures);
    }

    let bestGain = -Infinity;
    let bestFeature = -1;
    let bestThreshold = 0;
    let bestLeftIndices: number[] = [];
    let bestRightIndices: number[] = [];

    const parentMSE = variance;

    for (const featIdx of featuresToTry) {
      // Gather unique thresholds
      const featValues = indices.map((i) => X[i][featIdx]);
      const uniqueSorted = Array.from(new Set(featValues)).sort((a, b) => a - b);

      if (uniqueSorted.length <= 1) continue;

      // Evaluate midpoint splits
      for (let s = 0; s < uniqueSorted.length - 1; s++) {
        const threshold = (uniqueSorted[s] + uniqueSorted[s + 1]) / 2;

        const left: number[] = [];
        const right: number[] = [];

        for (const idx of indices) {
          if (X[idx][featIdx] <= threshold) {
            left.push(idx);
          } else {
            right.push(idx);
          }
        }

        if (
          left.length < this.config.minSamplesLeaf ||
          right.length < this.config.minSamplesLeaf
        ) {
          continue;
        }

        const leftVals = left.map((i) => y[i]);
        const rightVals = right.map((i) => y[i]);

        const leftMean = leftVals.reduce((a, b) => a + b, 0) / left.length;
        const rightMean = rightVals.reduce((a, b) => a + b, 0) / right.length;

        const leftVar = leftVals.reduce((acc, v) => acc + Math.pow(v - leftMean, 2), 0) / left.length;
        const rightVar = rightVals.reduce((acc, v) => acc + Math.pow(v - rightMean, 2), 0) / right.length;

        const weightedChildMSE = (left.length / numSamples) * leftVar + (right.length / numSamples) * rightVar;
        const varianceGain = parentMSE - weightedChildMSE;

        if (varianceGain > bestGain) {
          bestGain = varianceGain;
          bestFeature = featIdx;
          bestThreshold = threshold;
          bestLeftIndices = left;
          bestRightIndices = right;
        }
      }
    }

    // If no valid split yields positive variance reduction, create leaf
    if (bestGain <= 0 || bestFeature === -1) {
      return {
        isLeaf: true,
        prediction: mean,
        variance,
        sampleCount: numSamples,
      };
    }

    // Accumulate empirical feature importance
    if (featureImportances && bestFeature >= 0) {
      featureImportances[bestFeature] += bestGain * (numSamples / X.length);
    }

    const leftNode = this.buildTree(X, y, bestLeftIndices, depth + 1, featureImportances);
    const rightNode = this.buildTree(X, y, bestRightIndices, depth + 1, featureImportances);

    return {
      isLeaf: false,
      featureIndex: bestFeature,
      threshold: bestThreshold,
      prediction: mean,
      variance,
      sampleCount: numSamples,
      left: leftNode,
      right: rightNode,
    };
  }

  private sampleWithoutReplacement<T>(arr: T[], k: number): T[] {
    const copy = [...arr];
    const result: T[] = [];
    for (let i = 0; i < k && copy.length > 0; i++) {
      const idx = Math.floor(Math.random() * copy.length);
      result.push(copy.splice(idx, 1)[0]);
    }
    return result;
  }

  public toJSON(): RegressionTreeNode | null {
    return this.root;
  }

  public fromJSON(data: RegressionTreeNode): void {
    this.root = data;
  }
}
