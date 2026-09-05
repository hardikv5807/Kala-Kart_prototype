#!/usr/bin/env tsx
/**
 * Kala-Kart Step 4C Market Ingestion Verification Test Suite
 *
 * Validates:
 * 1. Valid observation accepted
 * 2. Missing price rejected
 * 3. Zero/negative price rejected
 * 4. Future date rejected
 * 5. Missing source rejected
 * 6. Missing reference rejected
 * 7. Duplicate detection with stable fingerprint
 * 8. Normalization (categories, materials, types, dates, price)
 * 9. Aggregation (median, min, max, sample count)
 * 10. No-data behavior ("Market data unavailable")
 * 11. Insufficient-data trend behavior (trendScore: null)
 * 12. Synthetic data rejection (zero synthetic data accepted)
 * 13. Dataset transformation & provenance traceability
 */

import fs from "fs";
import path from "path";
import {
  validateMarketObservation,
  normalizeMarketObservation,
  generateObservationFingerprint,
} from "../src/services/pricing/marketObservationSchema";
import {
  FileMarketObservationRepository,
} from "../src/services/pricing/marketObservationStore";
import {
  MarketIngestionService,
} from "../src/services/pricing/marketIngestionService";
import { MarketDataService } from "../src/services/pricing/marketDataService";
import {
  PricingDatasetTransformer,
  VerifiedArtisanProductInput,
} from "../src/services/pricing/datasetTransformer";
import { MarketPriceObservation } from "../src/types/pricing";

console.log("==================================================");
console.log("KALA-KART STEP 4C: MARKET DATA INGESTION TEST");
console.log("==================================================");

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    console.log(`[PASS] ${testName}`);
    passedTests++;
  } else {
    console.error(`[FAIL] ${testName}${detail ? ` - ${detail}` : ""}`);
    process.exitCode = 1;
  }
}

async function runTests() {
  // Use isolated test repository file to avoid polluting any existing data
  const testRepoPath = path.join(process.cwd(), "data", "pricing", "test_market_observations.json");
  if (fs.existsSync(testRepoPath)) {
    fs.unlinkSync(testRepoPath);
  }
  const testRepo = new FileMarketObservationRepository(testRepoPath);
  const ingestionService = new MarketIngestionService(testRepo);

  console.log("\n--- 1. Validation: Valid Observation Acceptance ---");
  const validRecord: MarketPriceObservation = {
    source: "All India Handicrafts Board Market Survey 2026",
    sourceType: "GOVERNMENT",
    productCategory: "pottery",
    productType: "blue pottery floral vase",
    material: "blue_pottery",
    craftTechnique: "hand_glazed",
    observedPriceINR: 1850,
    observationDate: "2026-02-15",
    location: "Jaipur, Rajasthan",
    urlOrReference: "AIHB/BULLETIN/2026/FEB/POTTERY/04",
    confidence: 0.95,
  };

  const validationResult = validateMarketObservation(validRecord);
  assert(validationResult.isValid === true, "Valid observation passes schema validation");
  assert(validationResult.errors.length === 0, "No errors returned for valid observation");

  const ingestAccepted = await ingestionService.ingestObservation(validRecord);
  assert(ingestAccepted.status === "ACCEPTED", "Valid observation accepted by ingestion layer");
  assert(
    typeof ingestAccepted.fingerprint === "string" && ingestAccepted.fingerprint.length === 64,
    "Valid observation receives 64-character SHA-256 fingerprint"
  );

  console.log("\n--- 2. Validation: Missing Price Rejection ---");
  const missingPrice = { ...validRecord, observedPriceINR: undefined };
  const valMissingPrice = validateMarketObservation(missingPrice);
  assert(valMissingPrice.isValid === false, "Missing price is rejected");
  assert(
    valMissingPrice.errors.some((e) => e.includes("Missing observed price")),
    "Explicit validation error for missing price"
  );
  const ingestMissingPrice = await ingestionService.ingestObservation(missingPrice);
  assert(ingestMissingPrice.status === "REJECTED", "Ingestion service rejects missing price");

  console.log("\n--- 3. Validation: Zero/Negative Price Rejection ---");
  const zeroPrice = { ...validRecord, observedPriceINR: 0 };
  const valZeroPrice = validateMarketObservation(zeroPrice);
  assert(valZeroPrice.isValid === false, "Zero price is rejected");
  assert(
    valZeroPrice.errors.some((e) => e.includes("strictly positive")),
    "Explicit validation error for zero price"
  );

  const negPrice = { ...validRecord, observedPriceINR: -450 };
  const valNegPrice = validateMarketObservation(negPrice);
  assert(valNegPrice.isValid === false, "Negative price is rejected");
  assert(
    valNegPrice.errors.some((e) => e.includes("strictly positive")),
    "Explicit validation error for negative price"
  );

  console.log("\n--- 4. Validation: Future Date Rejection ---");
  const futureRecord = { ...validRecord, observationDate: "2035-12-31" };
  const valFutureDate = validateMarketObservation(futureRecord);
  assert(valFutureDate.isValid === false, "Future observation date is rejected");
  assert(
    valFutureDate.errors.some((e) => e.includes("Future observation date rejected")),
    "Explicit validation error for future date"
  );

  console.log("\n--- 5. Validation: Missing Source Rejection ---");
  const missingSource = { ...validRecord, source: "" };
  const valMissingSource = validateMarketObservation(missingSource);
  assert(valMissingSource.isValid === false, "Missing source is rejected");
  assert(
    valMissingSource.errors.some((e) => e.includes("Missing source")),
    "Explicit validation error for missing source"
  );

  console.log("\n--- 6. Validation: Missing Reference Rejection ---");
  const missingRef = { ...validRecord, urlOrReference: "" };
  const valMissingRef = validateMarketObservation(missingRef);
  assert(valMissingRef.isValid === false, "Missing reference is rejected");
  assert(
    valMissingRef.errors.some((e) => e.includes("Missing reference")),
    "Explicit validation error for missing reference citation"
  );

  console.log("\n--- 7. Duplicate Detection ---");
  // Ingest identical record again
  const ingestDuplicate = await ingestionService.ingestObservation(validRecord);
  assert(ingestDuplicate.status === "DUPLICATE", "Identical observation flagged as DUPLICATE");
  assert(
    ingestDuplicate.fingerprint === ingestAccepted.fingerprint,
    "Duplicate fingerprint matches original accepted fingerprint"
  );
  const repoCount = await testRepo.count();
  assert(repoCount === 1, "Duplicate observation not duplicated in repository storage");

  console.log("\n--- 8. Data Normalization ---");
  const rawUnnormalized: MarketPriceObservation = {
    source: "  Export Promotion Council for Handicrafts  ",
    sourceType: "CRAFT_COUNCIL",
    productCategory: "Terracotta Clay Pottery",
    productType: "blue_pottery_FLORAL_VASE",
    material: "Blue Pottery",
    craftTechnique: "Hand Glazed",
    observedPriceINR: 1950.001,
    observationDate: "2026-01-20",
    location: "  Jaipur,   Rajasthan  ",
    urlOrReference: "EPCH/BULLETIN/2026/01/99",
    confidence: 0.9,
  };
  const normalized = normalizeMarketObservation(rawUnnormalized);
  assert(normalized.productCategory === "pottery", "Category normalized to 'pottery'");
  assert(normalized.productType === "blue pottery floral vase", "Product type normalized to lowercase spaced string");
  assert(normalized.material === "blue_pottery", "Material normalized to snake_case 'blue_pottery'");
  assert(normalized.craftTechnique === "hand_glazed", "Technique normalized to snake_case 'hand_glazed'");
  assert(normalized.location === "Jaipur, Rajasthan", "Location whitespace normalized");
  assert(normalized.observedPriceINR === 1950, "Numeric price parsed cleanly without alteration");
  assert(
    normalized.source === "Export Promotion Council for Handicrafts",
    "Original source string preserved with trimmed bounds"
  );
  assert(
    normalized.urlOrReference === "EPCH/BULLETIN/2026/01/99",
    "Original reference string preserved unaltered"
  );

  console.log("\n--- 9. Market Aggregation ---");
  const sampleObservations: MarketPriceObservation[] = [
    {
      id: "obs_01",
      source: "Jaipur Craft Council",
      productCategory: "pottery",
      productType: "blue pottery vase",
      material: "blue_pottery",
      observedPriceINR: 1500,
      observationDate: "2026-01-10",
      urlOrReference: "REF-01",
      confidence: 0.9,
    },
    {
      id: "obs_02",
      source: "Jaipur Artisan Cooperative",
      productCategory: "pottery",
      productType: "blue pottery vase",
      material: "blue_pottery",
      observedPriceINR: 1800,
      observationDate: "2026-01-25",
      urlOrReference: "REF-02",
      confidence: 0.9,
    },
    {
      id: "obs_03",
      source: "State Handicrafts Emporium",
      productCategory: "pottery",
      productType: "blue pottery vase",
      material: "blue_pottery",
      observedPriceINR: 2100,
      observationDate: "2026-02-15",
      urlOrReference: "REF-03",
      confidence: 0.95,
    },
  ];

  const aggregated = MarketDataService.aggregateMarketObservations(
    { category: "pottery", productType: "vase", material: "blue_pottery" },
    sampleObservations
  );
  assert(aggregated.available === true, "Aggregation available when matching observations exist");
  assert(aggregated.medianPriceINR === 1800, "Median price accurately calculated as ₹1800");
  assert(aggregated.minPriceINR === 1500, "Minimum price accurately identified as ₹1500");
  assert(aggregated.maxPriceINR === 2100, "Maximum price accurately identified as ₹2100");
  assert(aggregated.sampleCount === 3, "Sample count accurately recorded as 3");

  console.log("\n--- 10. No-Data Behavior ---");
  const noData = MarketDataService.aggregateMarketObservations(
    { category: "woodcraft", productType: "box" },
    sampleObservations
  );
  assert(noData.available === false, "Reports available: false when zero matching observations exist");
  assert(noData.medianPriceINR === null, "Median price is strictly null when no observations match");
  assert(noData.sampleCount === 0, "Sample count is 0 when no observations match");
  assert(
    noData.statusMessage === "Market data unavailable",
    "Status message is exactly 'Market data unavailable'"
  );

  console.log("\n--- 11. Insufficient-Data Trend Behavior ---");
  // With 3 observations: insufficient for trend
  assert(aggregated.recentTrendScore === null, "trendScore is strictly null with < 4 observations");
  assert(
    aggregated.statusMessage.includes("trend unavailable"),
    "Explicitly indicates trend is unavailable when observations < 4"
  );

  // Now test with 4 observations spanning > 7 days
  const fourObservations: MarketPriceObservation[] = [
    ...sampleObservations,
    {
      id: "obs_04",
      source: "Dastkar Craft Fair Official Record",
      productCategory: "pottery",
      productType: "blue pottery vase",
      material: "blue_pottery",
      observedPriceINR: 2400,
      observationDate: "2026-03-01",
      urlOrReference: "REF-04",
      confidence: 0.95,
    },
  ];

  const trendAgg = MarketDataService.aggregateMarketObservations(
    { category: "pottery", productType: "vase", material: "blue_pottery" },
    fourObservations
  );
  assert(trendAgg.sampleCount === 4, "Sample count is 4");
  assert(
    trendAgg.recentTrendScore !== null && trendAgg.recentTrendScore > 0,
    `Calculates valid trend score (${trendAgg.recentTrendScore}) across temporal span`
  );

  console.log("\n--- 12. Synthetic Data Rejection ---");
  const syntheticRecord1 = {
    ...validRecord,
    isSynthetic: true,
  };
  const valSynth1 = validateMarketObservation(syntheticRecord1);
  assert(valSynth1.isValid === false, "Explicit isSynthetic: true rejected");
  assert(
    valSynth1.errors.some((e) => e.includes("Synthetic demo data must NEVER be accepted")),
    "Explicit error message rejecting synthetic demo data"
  );

  const syntheticRecord2 = {
    ...validRecord,
    source: "synthetic_demo_generator_v1",
  };
  const valSynth2 = validateMarketObservation(syntheticRecord2);
  assert(valSynth2.isValid === false, "Source containing 'synthetic' rejected");

  const ingestSynth = await ingestionService.ingestObservation(syntheticRecord1);
  assert(ingestSynth.status === "REJECTED", "Ingestion service rejects synthetic observation");

  console.log("\n--- 13. Dataset Transformation & Provenance Traceability ---");
  const sampleArtisanProduct: VerifiedArtisanProductInput = {
    id: "prod_pottery_001",
    category: "pottery",
    subcategory: "vase",
    material: "blue_pottery",
    craftTechnique: "hand_glazed",
    color: "cobalt_blue",
    dimensions: { heightCm: 30, diameterCm: 16 },
    weightGrams: 1400,
    quantity: 1,
    handmade: true,
    productionTimeHours: 10,
    artisanCosts: {
      rawMaterialCostINR: 250,
      laborCostINR: 500,
      packagingCostINR: 80,
      otherCostINR: 30,
      quantity: 1,
    },
    descriptionLength: 150,
    designComplexityScore: 0.8,
    imageQualityScore: 0.85,
    targetSellingPriceINR: 1800,
  };

  const derivedRecord = PricingDatasetTransformer.transformProductWithMarketData(
    sampleArtisanProduct,
    fourObservations
  );

  assert(derivedRecord.id === "prod_pottery_001", "Derived record preserves product ID");
  assert(derivedRecord.market_median_price_inr !== null && derivedRecord.market_median_price_inr > 0, "Derived record incorporates aggregated market median");
  assert(
    Array.isArray(derivedRecord.market_observation_ids) && derivedRecord.market_observation_ids.length === 4,
    "Derived record includes exact source market observation IDs for provenance"
  );
  assert(
    derivedRecord.provenance_sources.includes("Jaipur Craft Council") &&
      derivedRecord.provenance_sources.includes("Dastkar Craft Fair Official Record"),
    "Derived record tracks provenance source citations"
  );

  // Verify canonical CSV formatting
  const csvFormatted = PricingDatasetTransformer.formatCanonicalCsv([derivedRecord]);
  const lines = csvFormatted.trim().split("\n");
  assert(lines.length === 2, "Canonical CSV contains header and 1 data row");
  const cols = lines[0].split(",");
  assert(cols.length === 28, "Canonical CSV format strictly preserves the 28-column schema");

  // Verify test cleanup
  if (fs.existsSync(testRepoPath)) {
    fs.unlinkSync(testRepoPath);
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
  console.error("Test execution error:", err);
  process.exit(1);
});
