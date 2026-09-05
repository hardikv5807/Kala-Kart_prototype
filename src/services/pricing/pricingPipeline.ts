/**
 * Kala-Kart Machine Learning Pricing Pipeline
 *
 * Implements 4A.8, 4A.9, 4A.11:
 * - End-to-end inference pipeline: Product Features + Artisan Costs + Market Features -> ML Regression -> Recommendation
 * - Strict support for states:
 *     DATASET NOT READY
 *     MODEL TRAINED
 *     MARKET DATA UNAVAILABLE
 *     FULL MARKET-AWARE MODEL
 * - Integrates deterministic cost sanity check without overriding ML outputs
 * - Provides empirical confidence interval bounds
 */

import {
  ProductPricingFeatures,
  PricingPredictionResult,
  ModelStatus,
  ModelMetadata,
} from "../../types/pricing";
import { extractFeaturesFromProduct } from "./featureEngineering";
import { performCostSanityCheck } from "./costSanityCheck";
import { RandomForestRegressor, SerializedRandomForest } from "./ml/randomForestRegression";

export class PricingPipeline {
  private static activeModel: RandomForestRegressor | null = null;
  private static activeMetadata: ModelMetadata | null = null;

  /**
   * Sets the active trained model instance and metadata in memory.
   */
  public static setTrainedModel(
    model: RandomForestRegressor,
    metadata: ModelMetadata
  ): void {
    this.activeModel = model;
    this.activeMetadata = metadata;
  }

  /**
   * Hydrates model from a serialized JSON payload.
   */
  public static loadSerializedModel(
    serialized: SerializedRandomForest,
    metadata: ModelMetadata
  ): void {
    this.activeModel = RandomForestRegressor.fromJSON(serialized);
    this.activeMetadata = metadata;
  }

  /**
   * Resets the active model and optionally updates metadata.
   */
  public static resetModel(metadata?: ModelMetadata | null): void {
    this.activeModel = null;
    this.activeMetadata = metadata || null;
  }

  /**
   * Determines the operational status based on model availability and market data presence.
   */
  public static getPipelineStatus(features: ProductPricingFeatures): ModelStatus {
    if (
      !this.activeModel ||
      this.activeMetadata?.status === "dataset_required" ||
      (this.activeMetadata?.trainingSampleCount ?? 0) === 0 ||
      this.activeMetadata?.trainingDatasetVersion?.includes("synthetic")
    ) {
      return "DATASET_NOT_READY";
    }

    const hasMarketData =
      features.marketFeatures &&
      features.marketFeatures.available &&
      (features.marketFeatures.sampleCount || 0) > 0;

    if (hasMarketData) {
      return "FULL_MARKET_AWARE";
    }

    return "MARKET_DATA_UNAVAILABLE";
  }

  /**
   * Primary prediction interface (4A.8).
   * Predicts competitive selling price, calculates empirical bounds, confidence,
   * pricing basis, and runs cost sanity check.
   */
  public static async predictPrice(
    features: ProductPricingFeatures
  ): Promise<PricingPredictionResult> {
    const status = this.getPipelineStatus(features);
    const modelVersion = this.activeMetadata?.modelVersion || "pricing-v0.1";

    // 1. If dataset is not ready or model is not trained
    if (status === "DATASET_NOT_READY" || !this.activeModel) {
      const sanityCheck = performCostSanityCheck(features.artisanCosts, null);
      return {
        predictedPriceINR: null,
        lowerBoundINR: null,
        upperBoundINR: null,
        modelVersion,
        confidence: null,
        pricingBasis: "DATASET NOT READY — ML model cannot be trained until legitimate empirical observations are ingested.",
        status: "DATASET_NOT_READY",
        costSanityCheck: sanityCheck,
      };
    }

    // 2. Feature engineering: transform features to numerical vector
    const featureVector = extractFeaturesFromProduct(features);

    // 3. ML Model prediction with confidence intervals
    const {
      predictedPriceINR,
      lowerBoundINR,
      upperBoundINR,
      confidence,
    } = this.activeModel.predictWithInterval(featureVector);

    // 4. Cost Sanity Check (4A.9)
    const costSanityCheck = performCostSanityCheck(
      features.artisanCosts,
      predictedPriceINR
    );

    // 5. Formulation of explicit pricing basis
    let pricingBasis: string;
    if (status === "FULL_MARKET_AWARE") {
      pricingBasis = "ML prediction using product, artisan cost, and market features";
    } else {
      pricingBasis = "ML prediction using product and artisan cost features; market data unavailable";
    }

    // 6. Feature importances for explainability
    const featureImportance = this.activeModel.getTopFeatureImportances(6);

    return {
      predictedPriceINR,
      lowerBoundINR,
      upperBoundINR,
      modelVersion,
      confidence,
      pricingBasis,
      status,
      costSanityCheck,
      featureImportance,
    };
  }
}
