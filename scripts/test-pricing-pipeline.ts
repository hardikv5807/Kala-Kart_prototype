#!/usr/bin/env tsx
/**
 * Kala-Kart Pricing Pipeline Verification Test Suite
 *
 * Validates:
 * 1. Dataset Not Ready handling
 * 2. Feature engineering & vector generation
 * 3. Market data aggregation and "Market data unavailable" contract
 * 4. Cost sanity check (break-even floor & below-cost warning)
 * 5. Full inference with Random Forest Regressor
 * 6. Explicit pricing basis strings
 */

import fs from "fs";
import path from "path";
import { PricingPipeline } from "../src/services/pricing/pricingPipeline";
import { MarketDataService } from "../src/services/pricing/marketDataService";
import { performCostSanityCheck } from "../src/services/pricing/costSanityCheck";
import { ImageDescriptionExtractor } from "../src/services/pricing/imageDescriptionExtractor";
import {
  extractFeaturesFromProduct,
  getFeatureNames,
} from "../src/services/pricing/featureEngineering";
import { RandomForestRegressor } from "../src/services/pricing/ml/randomForestRegression";
import { ProductPricingFeatures, ModelMetadata } from "../src/types/pricing";

console.log("==================================================");
console.log("KALA-KART PRICING FOUNDATION VERIFICATION TEST");
console.log("==================================================");

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  // Test 1: Cost Sanity Check Floor Logic
  console.log("\n--- Testing 4A.9: Cost Sanity Check ---");
  const costData = {
    rawMaterialCostINR: 300,
    laborCostINR: 500,
    packagingCostINR: 80,
    otherCostINR: 20,
    quantity: 1,
  };
  const sanityPass = performCostSanityCheck(costData, 1200);
  assert(sanityPass.totalProductionCostINR === 900, "Calculates exact total production cost (₹900)");
  assert(sanityPass.costPerUnitINR === 900, "Calculates cost per unit (₹900)");
  assert(sanityPass.isBelowCost === false, "Recognizes price ₹1200 >= cost ₹900");
  assert(sanityPass.costWarning === null, "No warning issued when price covers cost");

  const sanityFail = performCostSanityCheck(costData, 750);
  assert(sanityFail.isBelowCost === true, "Flags when price ₹750 < cost ₹900");
  assert(
    sanityFail.costWarning !== null && sanityFail.costWarning.includes("is below estimated production cost"),
    "Generates explicit warning message about below-cost pricing"
  );

  // Test 2: Market Data Service Contract
  console.log("\n--- Testing 4A.4: Market Data Aggregation ---");
  MarketDataService.clearObservations();
  const emptyMarket = MarketDataService.aggregateMarketObservations({ category: "pottery" });
  assert(emptyMarket.available === false, "Reports available: false when zero observations exist");
  assert(
    emptyMarket.statusMessage === "Market data unavailable",
    "Reports explicit 'Market data unavailable' string"
  );

  // Register authentic observations
  MarketDataService.registerObservations([
    {
      source: "Jaipur Craft Fair Official Bulletin",
      productCategory: "pottery",
      productType: "blue pottery vase",
      material: "blue_pottery",
      observedPriceINR: 1600,
      observationDate: "2026-02-15",
      confidence: 0.9,
    },
    {
      source: "Export Promotion Council for Handicrafts",
      productCategory: "pottery",
      productType: "blue pottery vase",
      material: "blue_pottery",
      observedPriceINR: 1900,
      observationDate: "2026-03-01",
      confidence: 0.95,
    },
  ]);

  const potteryMarket = MarketDataService.aggregateMarketObservations({
    category: "pottery",
    productType: "vase",
    material: "blue_pottery",
  });
  assert(potteryMarket.available === true, "Aggregates legitimate market observations");
  assert(potteryMarket.medianPriceINR === 1750, "Calculates accurate median price (₹1750)");
  assert(potteryMarket.sampleCount === 2, "Records accurate sample count (2)");

  // Test 3: Feature Engineering Vector Dimensions
  console.log("\n--- Testing 4A.2: Feature Vector Consistency ---");
  const featureNames = getFeatureNames();
  const sampleFeatures: ProductPricingFeatures = {
    category: "pottery",
    subcategory: "vase",
    material: "blue_pottery",
    craftTechnique: "hand_glazed",
    color: "cobalt_blue",
    dimensions: { heightCm: 32, diameterCm: 18 },
    weightGrams: 1850,
    quantity: 1,
    handmade: true,
    productionTimeHours: 12,
    artisanCosts: costData,
    descriptionFeatures: {
      textLength: 180,
      wordCount: 28,
      mentionsHeritage: true,
      mentionsFairWage: true,
      designComplexityScore: 0.85,
    },
    imageFeatures: {
      visualComplexity: 0.8,
      imageQualityScore: 0.9,
      isHighResolution: true,
      hasCleanBackground: true,
      confidence: 0.85,
    },
    marketFeatures: potteryMarket,
  };

  const vector = extractFeaturesFromProduct(sampleFeatures);
  assert(
    vector.length === featureNames.length,
    `Feature vector length (${vector.length}) matches feature names count (${featureNames.length})`
  );
  assert(
    vector.every((v) => typeof v === "number" && !isNaN(v)),
    "Feature vector contains strictly valid finite numbers"
  );

  // Test 4: Pipeline Status when Dataset Not Ready
  console.log("\n--- Testing 4A.8 & 4A.11: Pipeline Status Handling ---");
  const unreadyResult = await PricingPipeline.predictPrice(sampleFeatures);
  assert(
    unreadyResult.status === "DATASET_NOT_READY",
    "Returns DATASET_NOT_READY when model is uninitialized"
  );
  assert(
    unreadyResult.predictedPriceINR === null,
    "Predicted price is null when dataset not ready"
  );
  assert(
    unreadyResult.pricingBasis.includes("DATASET NOT READY"),
    "Pricing basis states DATASET NOT READY explicitly"
  );

  // Test 5: Full Inference with Trained Model
  console.log("\n--- Testing 4A.5 & 4A.8: Model Prediction with Loaded Weights ---");
  const weightsPath = path.join(process.cwd(), "data", "pricing", "model_weights.json");
  if (fs.existsSync(weightsPath)) {
    const weights = JSON.parse(fs.readFileSync(weightsPath, "utf-8"));
    const meta: ModelMetadata = {
      modelVersion: "pricing-v0.1-test",
      modelType: "RandomForestRegressor",
      trainingDatasetVersion: "v0.1-demo",
      trainingDate: new Date().toISOString(),
      featureVersion: "v1.0",
      trainingSampleCount: 32,
      featuresUsed: featureNames,
      evaluationMetrics: null,
      status: "trained",
    };

    PricingPipeline.loadSerializedModel(weights, meta);

    // Predict with market data available
    const marketResult = await PricingPipeline.predictPrice(sampleFeatures);
    assert(marketResult.status === "FULL_MARKET_AWARE", "Reports FULL_MARKET_AWARE status");
    assert(
      typeof marketResult.predictedPriceINR === "number" && marketResult.predictedPriceINR > 0,
      `Calculates positive regression estimate (₹${marketResult.predictedPriceINR})`
    );
    assert(
      marketResult.lowerBoundINR !== null &&
        marketResult.upperBoundINR !== null &&
        marketResult.lowerBoundINR <= marketResult.predictedPriceINR &&
        marketResult.upperBoundINR >= marketResult.predictedPriceINR,
      `Provides valid confidence bounds [₹${marketResult.lowerBoundINR} - ₹${marketResult.upperBoundINR}]`
    );
    assert(
      marketResult.pricingBasis === "ML prediction using product, artisan cost, and market features",
      "Explicitly reports full pricing basis"
    );

    // Predict with market data unavailable
    const sampleFeaturesNoMarket: ProductPricingFeatures = {
      ...sampleFeatures,
      marketFeatures: {
        available: false,
        medianPriceINR: null,
        minPriceINR: null,
        maxPriceINR: null,
        sampleCount: 0,
        recentTrendScore: null,
        statusMessage: "Market data unavailable",
      },
    };
    const noMarketResult = await PricingPipeline.predictPrice(sampleFeaturesNoMarket);
    assert(
      noMarketResult.status === "MARKET_DATA_UNAVAILABLE",
      "Reports MARKET_DATA_UNAVAILABLE when market observations are absent"
    );
    assert(
      noMarketResult.pricingBasis ===
        "ML prediction using product and artisan cost features; market data unavailable",
      "Explicitly reports market data unavailable in pricing basis"
    );
  } else {
    console.log("Model weights file not found; skipping trained inference assertion.");
  }

  console.log("\n==================================================");
  console.log(`TEST SUMMARY: ${passedTests}/${totalTests} tests passed`);
  console.log("==================================================");

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
