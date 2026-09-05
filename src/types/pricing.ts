/**
 * Kala-Kart Machine Learning Pricing Foundation Types
 * Schema definition, feature models, market data interfaces, and prediction contracts.
 */

export type ModelStatus =
  | "DATASET_NOT_READY"
  | "MODEL_TRAINED"
  | "MARKET_DATA_UNAVAILABLE"
  | "FULL_MARKET_AWARE";

/**
 * 4A.1 Dataset Schema
 * Canonical representation of records in data/pricing/pricing_training.csv
 */
export interface PricingDatasetRow {
  id: string;
  category: string;
  subcategory: string;
  material: string;
  craft_technique: string;
  color: string;
  length_cm: number | null;
  width_cm: number | null;
  height_cm: number | null;
  diameter_cm: number | null;
  weight_g: number | null;
  quantity: number;
  handmade: boolean;
  production_time_hours: number | null;
  raw_material_cost_inr: number;
  labor_cost_inr: number;
  packaging_cost_inr: number;
  other_cost_inr: number;
  market_median_price_inr: number | null;
  market_min_price_inr: number | null;
  market_max_price_inr: number | null;
  market_sample_count: number | null;
  market_trend_score: number | null;
  market_observation_date: string | null;
  description_length: number;
  design_complexity_score: number;
  image_quality_score: number;
  target_selling_price_inr: number; // ML regression target
}

/**
 * 4A.3 Product Dimensions supporting partial dimension structures
 * (e.g. vases use height+diameter; textiles use length+width; jewelry uses length+width+weight)
 */
export interface ProductDimensions {
  lengthCm?: number | null;
  widthCm?: number | null;
  heightCm?: number | null;
  diameterCm?: number | null;
}

/**
 * Artisan cost breakdown for cost sanity check and regression input
 */
export interface ArtisanCostData {
  rawMaterialCostINR: number;
  laborCostINR: number;
  packagingCostINR: number;
  otherCostINR: number;
  quantity: number;
}

/**
 * 4A.3 Textual Description Features
 */
export interface DescriptionFeatures {
  textLength: number;
  wordCount: number;
  mentionsHeritage: boolean;
  mentionsFairWage: boolean;
  designComplexityScore: number; // 0.0 - 1.0
  verifiedStoryLength?: number;
}

/**
 * 4A.3 Image Features extracted via Gemini Visual Analysis
 * NOTE: These are visual observations, NOT verified artisan facts.
 */
export interface VisualImageFeatures {
  visualComplexity: number; // 0.0 - 1.0
  imageQualityScore: number; // 0.0 - 1.0
  detectedCategoryGuess?: string;
  detectedMaterialGuess?: string;
  detectedColorGuess?: string;
  craftTechniqueGuess?: string;
  isHighResolution: boolean;
  hasCleanBackground: boolean;
  confidence: number; // 0.0 - 1.0
}

/**
 * 4C.2 Verified Source Classification
 */
export type MarketDataSourceType =
  | "GOVERNMENT"
  | "ARTISAN_COOPERATIVE"
  | "CRAFT_COUNCIL"
  | "OFFICIAL_MARKETPLACE"
  | "VERIFIED_FAIR_OR_EXHIBITION"
  | "OTHER_VERIFIED";

/**
 * 4A.4 & 4C.1 Market Observation Interface
 */
export interface MarketPriceObservation {
  id?: string;
  source: string;
  sourceType?: MarketDataSourceType;
  productCategory: string;
  productType: string;
  material: string;
  craftTechnique?: string;
  observedPriceINR: number;
  currency?: string; // Must be "INR"
  observationDate: string; // ISO date YYYY-MM-DD
  location?: string;
  urlOrReference?: string;
  confidence: number;
  fingerprint?: string;
  createdAt?: string;
  isSynthetic?: boolean;
}

/**
 * 4A.4 Aggregated Market Features
 */
export interface AggregatedMarketFeatures {
  available: boolean;
  medianPriceINR: number | null;
  minPriceINR: number | null;
  maxPriceINR: number | null;
  sampleCount: number;
  recentTrendScore: number | null; // e.g. -1.0 to +1.0
  statusMessage: string;
}

/**
 * 4A.3 Complete Structured Product Pricing Features
 * Unifies verified artisan facts, visual observations, costs, and market data.
 */
export interface ProductPricingFeatures {
  // Verified artisan facts
  category: string;
  subcategory: string;
  material: string;
  craftTechnique: string;
  color: string;
  dimensions: ProductDimensions;
  weightGrams: number | null;
  quantity: number;
  handmade: boolean;
  productionTimeHours: number | null;

  // Artisan costs
  artisanCosts: ArtisanCostData;

  // Extracted description features
  descriptionFeatures: DescriptionFeatures;

  // Extracted image visual features (null if no image supplied)
  imageFeatures: VisualImageFeatures | null;

  // Market observation features (null if unavailable)
  marketFeatures: AggregatedMarketFeatures | null;
}

/**
 * 4A.8 Prediction Interface Contract
 */
export interface PricingPredictionResult {
  predictedPriceINR: number | null;
  lowerBoundINR: number | null;
  upperBoundINR: number | null;
  modelVersion: string;
  confidence: number | null;
  pricingBasis: string;
  status: ModelStatus;
  costSanityCheck: CostSanityCheckResult;
  featureImportance?: Array<{ feature: string; importance: number }>;
}

/**
 * 4A.9 Cost Sanity Check Contract
 */
export interface CostSanityCheckResult {
  totalProductionCostINR: number;
  costPerUnitINR: number;
  isBelowCost: boolean;
  costWarning: string | null;
  breakdown: {
    rawMaterial: number;
    labor: number;
    packaging: number;
    other: number;
    quantity: number;
  };
}

/**
 * 4A.6 Evaluation Metrics
 */
export interface ModelEvaluationMetrics {
  maeINR: number;
  rmseINR: number;
  r2Score: number;
  smapePercent: number;
  testSamplesCount: number;
  trainSamplesCount: number;
}

/**
 * 4A.7 Model Metadata File Contract
 */
export interface ModelMetadata {
  modelVersion: string;
  modelType: string;
  trainingDatasetVersion: string;
  trainingDate: string | null;
  featureVersion: string;
  trainingSampleCount: number;
  featuresUsed: string[];
  evaluationMetrics: ModelEvaluationMetrics | null;
  status: "dataset_required" | "trained" | "evaluated";
  hyperparameters?: {
    numTrees: number;
    maxDepth: number;
    minSamplesSplit: number;
    featureSubspaceRatio: number;
  };
}
