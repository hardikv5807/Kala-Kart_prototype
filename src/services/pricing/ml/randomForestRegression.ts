/**
 * Kala-Kart Random Forest Regressor
 *
 * Implements 4A.5:
 * - Ensemble of DecisionTreeRegressors with bootstrap aggregating (bagging)
 * - Random subspace feature selection at each node (maxFeatures = sqrt(M) or M/3)
 * - Empirical confidence interval estimation from tree variance
 * - Quantitative feature importance tracking
 * - Full JSON model serialization and runtime hydration
 */

import { DecisionTreeRegressor, RegressionTreeNode } from "./decisionTreeRegression";

export interface RandomForestConfig {
  numTrees: number;
  maxDepth: number;
  minSamplesSplit: number;
  minSamplesLeaf: number;
  featureSubspaceRatio: number; // e.g. 0.33 to evaluate M/3 features at each split
}

export interface SerializedRandomForest {
  modelType: string;
  config: RandomForestConfig;
  featureNames: string[];
  featureImportances: number[];
  trees: (RegressionTreeNode | null)[];
}

export class RandomForestRegressor {
  private trees: DecisionTreeRegressor[] = [];
  private config: RandomForestConfig;
  private featureNames: string[] = [];
  private featureImportances: number[] = [];

  constructor(config?: Partial<RandomForestConfig>) {
    this.config = {
      numTrees: config?.numTrees ?? 25,
      maxDepth: config?.maxDepth ?? 7,
      minSamplesSplit: config?.minSamplesSplit ?? 3,
      minSamplesLeaf: config?.minSamplesLeaf ?? 2,
      featureSubspaceRatio: config?.featureSubspaceRatio ?? 0.35,
    };
  }

  /**
   * Fits a Random Forest Regression ensemble on training matrix X and target y.
   */
  public fit(X: number[][], y: number[], featureNames?: string[]): void {
    const numSamples = X.length;
    if (numSamples === 0 || y.length === 0 || numSamples !== y.length) {
      throw new Error("Invalid training data passed to RandomForestRegressor.");
    }

    const numFeatures = X[0].length;
    this.featureNames = featureNames || Array.from({ length: numFeatures }, (_, i) => `f_${i}`);
    this.featureImportances = new Array(numFeatures).fill(0);
    this.trees = [];

    const maxFeatures = Math.max(
      1,
      Math.floor(numFeatures * this.config.featureSubspaceRatio)
    );

    for (let t = 0; t < this.config.numTrees; t++) {
      // 1. Bootstrap sample (sampling N items with replacement)
      const bootstrapX: number[][] = [];
      const bootstrapY: number[] = [];

      for (let s = 0; s < numSamples; s++) {
        const randIdx = Math.floor(Math.random() * numSamples);
        bootstrapX.push(X[randIdx]);
        bootstrapY.push(y[randIdx]);
      }

      // 2. Train individual CART tree on bootstrap sample
      const tree = new DecisionTreeRegressor({
        maxDepth: this.config.maxDepth,
        minSamplesSplit: this.config.minSamplesSplit,
        minSamplesLeaf: this.config.minSamplesLeaf,
        maxFeatures,
      });

      tree.fit(bootstrapX, bootstrapY, this.featureImportances);
      this.trees.push(tree);
    }

    // Normalize feature importances to sum to 1.0
    const totalImportance = this.featureImportances.reduce((a, b) => a + b, 0);
    if (totalImportance > 0) {
      this.featureImportances = this.featureImportances.map(
        (v) => parseFloat((v / totalImportance).toFixed(4))
      );
    }
  }

  /**
   * Evaluates the ensemble prediction for a single feature vector.
   */
  public predict(x: number[]): number {
    if (this.trees.length === 0) {
      throw new Error("RandomForestRegressor has not been trained.");
    }
    const predictions = this.trees.map((tree) => tree.predictSample(x));
    const mean = predictions.reduce((a, b) => a + b, 0) / predictions.length;
    return Math.round(mean);
  }

  /**
   * Evaluates prediction with empirical confidence interval and agreement confidence.
   */
  public predictWithInterval(
    x: number[],
    zMultiplier = 1.96
  ): {
    predictedPriceINR: number;
    lowerBoundINR: number;
    upperBoundINR: number;
    stdDevINR: number;
    confidence: number;
  } {
    if (this.trees.length === 0) {
      throw new Error("RandomForestRegressor has not been trained.");
    }

    const predictions = this.trees.map((tree) => tree.predictSample(x));
    const n = predictions.length;
    const mean = predictions.reduce((a, b) => a + b, 0) / n;

    const variance =
      predictions.reduce((acc, p) => acc + Math.pow(p - mean, 2), 0) / (n - 1 || 1);
    const stdDev = Math.sqrt(variance);

    const lower = Math.max(50, Math.round(mean - zMultiplier * stdDev));
    const upper = Math.round(mean + zMultiplier * stdDev);

    // Coefficient of variation (CV = stdDev / mean).
    // Lower relative dispersion implies higher tree consensus.
    const cv = mean > 0 ? stdDev / mean : 1.0;
    const rawConfidence = Math.max(0.2, Math.min(0.95, 1.0 - cv * 1.2));
    const confidence = parseFloat(rawConfidence.toFixed(2));

    return {
      predictedPriceINR: Math.round(mean),
      lowerBoundINR: lower,
      upperBoundINR: upper,
      stdDevINR: Math.round(stdDev),
      confidence,
    };
  }

  /**
   * Returns top ranked feature importances.
   */
  public getTopFeatureImportances(topK = 10): Array<{ feature: string; importance: number }> {
    return this.featureNames
      .map((name, i) => ({
        feature: name,
        importance: this.featureImportances[i] || 0,
      }))
      .sort((a, b) => b.importance - a.importance)
      .slice(0, topK);
  }

  /**
   * Serializes the trained ensemble into a JSON structure.
   */
  public toJSON(): SerializedRandomForest {
    return {
      modelType: "RandomForestRegressor",
      config: this.config,
      featureNames: this.featureNames,
      featureImportances: this.featureImportances,
      trees: this.trees.map((t) => t.toJSON()),
    };
  }

  /**
   * Deserializes and hydrates a trained ensemble from JSON.
   */
  public static fromJSON(data: SerializedRandomForest): RandomForestRegressor {
    const rf = new RandomForestRegressor(data.config);
    rf.featureNames = data.featureNames;
    rf.featureImportances = data.featureImportances;
    rf.trees = data.trees.map((nodeData) => {
      const tree = new DecisionTreeRegressor(data.config);
      if (nodeData) {
        tree.fromJSON(nodeData);
      }
      return tree;
    });
    return rf;
  }
}
