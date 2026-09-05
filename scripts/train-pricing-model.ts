#!/usr/bin/env tsx
/**
 * Kala-Kart ML Pricing Model Training Pipeline
 *
 * Implements 4A.6 & 4A.7:
 * 1. Loads and parses pricing dataset CSV
 * 2. Validates schema and dataset readiness
 * 3. Preprocesses and engineers numerical feature vectors
 * 4. Performs reproducible 80/20 train/test split
 * 5. Trains RandomForestRegressor ensemble
 * 6. Evaluates on held-out test data reporting MAE, RMSE, R², and SMAPE
 * 7. Exports model weights and metadata JSON
 */

import fs from "fs";
import path from "path";
import { PricingDatasetRow, ModelEvaluationMetrics, ModelMetadata } from "../src/types/pricing";
import {
  extractFeaturesFromRow,
  getFeatureNames,
} from "../src/services/pricing/featureEngineering";
import { RandomForestRegressor } from "../src/services/pricing/ml/randomForestRegression";

// Parse CLI flags
const args = process.argv.slice(2);
const useSynthetic = args.includes("--synthetic") || args.includes("--demo");
const customPathIdx = args.indexOf("--dataset");
const datasetPath =
  customPathIdx >= 0 && args[customPathIdx + 1]
    ? args[customPathIdx + 1]
    : useSynthetic
    ? path.join(process.cwd(), "data", "pricing", "synthetic_demo_data.csv")
    : path.join(process.cwd(), "data", "pricing", "pricing_training.csv");

console.log("==================================================");
console.log("KALA-KART ML PRICING MODEL TRAINING PIPELINE");
console.log("==================================================");
console.log(`Target Dataset: ${datasetPath}`);
if (useSynthetic) {
  console.log("MODE: DEMO / SYNTHETIC DATA — VALIDATING PIPELINE MECHANICS");
} else {
  console.log("MODE: PRODUCTION CANONICAL DATASET");
}

function parseCSV(filePath: string): { headers: string[]; rows: PricingDatasetRow[] } {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Dataset file not found at: ${filePath}`);
  }

  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith("#"));

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows: PricingDatasetRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",").map((c) => c.trim());
    if (cols.length < headers.length) continue;

    const rowObj: any = {};
    headers.forEach((h, idx) => {
      const val = cols[idx];
      if (val === "" || val === undefined) {
        rowObj[h] = null;
      } else if (val === "true") {
        rowObj[h] = true;
      } else if (val === "false") {
        rowObj[h] = false;
      } else if (!isNaN(Number(val))) {
        rowObj[h] = Number(val);
      } else {
        rowObj[h] = val;
      }
    });

    if (rowObj.target_selling_price_inr !== null && !isNaN(rowObj.target_selling_price_inr)) {
      rows.push(rowObj as PricingDatasetRow);
    }
  }

  return { headers, rows };
}

function computeMetrics(yTrue: number[], yPred: number[]): {
  maeINR: number;
  rmseINR: number;
  r2Score: number;
  smapePercent: number;
} {
  const n = yTrue.length;
  if (n === 0) {
    return { maeINR: 0, rmseINR: 0, r2Score: 0, smapePercent: 0 };
  }

  let absErrorSum = 0;
  let sqErrorSum = 0;
  let smapeSum = 0;
  const yMean = yTrue.reduce((a, b) => a + b, 0) / n;
  let ssTot = 0;

  for (let i = 0; i < n; i++) {
    const actual = yTrue[i];
    const pred = yPred[i];
    const diff = actual - pred;

    absErrorSum += Math.abs(diff);
    sqErrorSum += diff * diff;
    ssTot += Math.pow(actual - yMean, 2);

    const denom = (Math.abs(actual) + Math.abs(pred)) / 2;
    if (denom > 0) {
      smapeSum += Math.abs(diff) / denom;
    }
  }

  const mae = absErrorSum / n;
  const rmse = Math.sqrt(sqErrorSum / n);
  const r2 = ssTot > 0 ? 1 - sqErrorSum / ssTot : 0;
  const smape = (smapeSum / n) * 100;

  return {
    maeINR: Math.round(mae * 100) / 100,
    rmseINR: Math.round(rmse * 100) / 100,
    r2Score: Math.round(r2 * 1000) / 1000,
    smapePercent: Math.round(smape * 100) / 100,
  };
}

async function runTraining() {
  const { headers, rows } = parseCSV(datasetPath);

  // Validate required schema columns
  const requiredColumns = [
    "id",
    "category",
    "subcategory",
    "material",
    "craft_technique",
    "color",
    "quantity",
    "handmade",
    "raw_material_cost_inr",
    "labor_cost_inr",
    "packaging_cost_inr",
    "other_cost_inr",
    "target_selling_price_inr",
  ];

  const missingCols = requiredColumns.filter((c) => !headers.includes(c));
  if (missingCols.length > 0) {
    console.error(`ERROR: Dataset schema missing required columns: ${missingCols.join(", ")}`);
    process.exit(1);
  }

  console.log(`Schema verified. Found ${headers.length} columns in CSV.`);
  console.log(`Total sample count: ${rows.length}`);

  // Check dataset readiness
  if (rows.length === 0) {
    console.log("\n--------------------------------------------------");
    console.log("STATUS: DATASET NOT READY FOR TRAINING");
    console.log("The canonical dataset contains 0 empirical observations.");
    console.log("ML model cannot be trained without legitimate data.");
    console.log("Training pipeline is fully operational; waiting for real field observations.");
    console.log("To run pipeline mechanics test with synthetic data: npm run train:pricing:demo");
    console.log("--------------------------------------------------\n");

    const metadata: ModelMetadata = {
      modelVersion: "pricing-v0.1",
      modelType: "RandomForestRegressor",
      trainingDatasetVersion: "v0.1",
      trainingDate: null,
      featureVersion: "v1.0",
      trainingSampleCount: 0,
      featuresUsed: getFeatureNames(),
      evaluationMetrics: null,
      status: "dataset_required",
      hyperparameters: {
        numTrees: 35,
        maxDepth: 7,
        minSamplesSplit: 3,
        featureSubspaceRatio: 0.35,
      },
    };

    const metaPath = path.join(process.cwd(), "data", "pricing", "model_metadata.json");
    fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));
    console.log(`Updated metadata file at: ${metaPath}`);
    return;
  }

  if (rows.length < 15) {
    console.log("\n--------------------------------------------------");
    console.log("WARNING: DATASET TOO SMALL FOR MEANINGFUL TRAINING");
    console.log(`Sample count (${rows.length}) is below the statistical threshold (minimum 15-20 samples).`);
    console.log("Metrics generated will not be statistically reliable.");
    console.log("--------------------------------------------------\n");
  }

  // Preprocessing & Feature Engineering
  console.log("Extracting engineered numerical feature vectors...");
  const featureNames = getFeatureNames();
  const X: number[][] = [];
  const y: number[] = [];

  for (const row of rows) {
    const featVector = extractFeaturesFromRow(row);
    X.push(featVector);
    y.push(row.target_selling_price_inr);
  }

  console.log(`Extracted ${X[0].length} features across ${X.length} samples.`);

  // Train / Test Split (80% train, 20% test) with seeded pseudo-random shuffle
  const indices = Array.from({ length: X.length }, (_, i) => i);
  // deterministic pseudo-random shuffle
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor((Math.sin(i + 42) * 10000 - Math.floor(Math.sin(i + 42) * 10000)) * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  const trainSize = Math.max(1, Math.floor(indices.length * 0.8));
  const trainIndices = indices.slice(0, trainSize);
  const testIndices = indices.slice(trainSize);

  const trainX = trainIndices.map((i) => X[i]);
  const trainY = trainIndices.map((i) => y[i]);
  const testX = testIndices.map((i) => X[i]);
  const testY = testIndices.map((i) => y[i]);

  console.log(`Training samples: ${trainX.length}`);
  console.log(`Test samples: ${testX.length}`);

  // Train Random Forest Regression model
  console.log("\nTraining Random Forest Regressor (35 trees, max depth 7)...");
  const rf = new RandomForestRegressor({
    numTrees: 35,
    maxDepth: 7,
    minSamplesSplit: 3,
    minSamplesLeaf: 2,
    featureSubspaceRatio: 0.35,
  });

  rf.fit(trainX, trainY, featureNames);
  console.log("Ensemble training complete.");

  // Evaluate on held-out test data
  console.log("\nEvaluating on held-out test set...");
  const predictions = testX.map((x) => rf.predict(x));
  const metrics = computeMetrics(testY, predictions);

  console.log("==================================================");
  console.log("EVALUATION RESULTS (HELD-OUT TEST SET):");
  console.log("==================================================");
  console.log(`Training samples: ${trainX.length}`);
  console.log(`Test samples:     ${testX.length}`);
  console.log(`MAE:              ₹${metrics.maeINR}`);
  console.log(`RMSE:             ₹${metrics.rmseINR}`);
  console.log(`R²:               ${metrics.r2Score}`);
  console.log(`SMAPE:            ${metrics.smapePercent}%`);
  console.log("==================================================");

  console.log("\nTop 5 Influential Features Learned by Model:");
  const topFeatures = rf.getTopFeatureImportances(5);
  topFeatures.forEach((tf, i) => {
    console.log(`  ${i + 1}. ${tf.feature.padEnd(28)} : ${(tf.importance * 100).toFixed(1)}%`);
  });

  // Save model weights and metadata
  const weightsPath = path.join(process.cwd(), "data", "pricing", "model_weights.json");
  const metaPath = path.join(process.cwd(), "data", "pricing", "model_metadata.json");

  fs.writeFileSync(weightsPath, JSON.stringify(rf.toJSON(), null, 2));

  const evaluationMetrics: ModelEvaluationMetrics = {
    ...metrics,
    testSamplesCount: testX.length,
    trainSamplesCount: trainX.length,
  };

  const metadata: ModelMetadata = {
    modelVersion: "pricing-v0.1",
    modelType: "RandomForestRegressor",
    trainingDatasetVersion: useSynthetic ? "v0.1-synthetic-demo" : "v0.1-empirical",
    trainingDate: new Date().toISOString(),
    featureVersion: "v1.0",
    trainingSampleCount: trainX.length,
    featuresUsed: featureNames,
    evaluationMetrics,
    status: useSynthetic ? "dataset_required" : "trained",
    hyperparameters: {
      numTrees: 35,
      maxDepth: 7,
      minSamplesSplit: 3,
      featureSubspaceRatio: 0.35,
    },
  };

  fs.writeFileSync(metaPath, JSON.stringify(metadata, null, 2));

  console.log(`\nModel weights exported to: ${weightsPath}`);
  console.log(`Model metadata updated at: ${metaPath}`);

  if (useSynthetic) {
    console.log("\nNOTE: Model was trained on DEMO / SYNTHETIC DATA for testing.");
    console.log("Metadata status remains 'dataset_required' until trained on legitimate field data.");
  }
}

runTraining().catch((err) => {
  console.error("Fatal error in training pipeline:", err);
  process.exit(1);
});
