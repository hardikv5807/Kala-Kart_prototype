/**
 * Kala-Kart Pricing Dataset Transformation & Provenance Layer
 *
 * Implements Step 4C.9 & 4C.10:
 * - Transforms verified artisan product records + verified market observations into canonical training rows
 * - Strictly maintains the 28-column canonical training dataset schema
 * - Preserves complete provenance via market_observation_ids mapping
 * - Never executes automatically; strictly invoked on verified batches
 */

import { MarketPriceObservation, ProductDimensions, ArtisanCostData } from "../../types/pricing";
import { MarketDataService } from "./marketDataService";

export interface VerifiedArtisanProductInput {
  id: string;
  category: string;
  subcategory: string;
  material: string;
  craftTechnique: string;
  color: string;
  dimensions?: ProductDimensions | null;
  weightGrams?: number | null;
  quantity: number;
  handmade: boolean;
  productionTimeHours?: number | null;
  artisanCosts: ArtisanCostData;
  descriptionLength?: number;
  designComplexityScore?: number;
  imageQualityScore?: number;
  targetSellingPriceINR: number;
}

/**
 * Derived Training Record containing the 28 canonical columns
 * plus audit/provenance metadata.
 */
export interface DerivedTrainingRecord {
  // Canonical 28 columns
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
  target_selling_price_inr: number;

  // Provenance metadata (4C.10)
  market_observation_ids: string[];
  provenance_sources: string[];
  transformation_timestamp: string;
}

export const CANONICAL_CSV_HEADERS: readonly string[] = [
  "id",
  "category",
  "subcategory",
  "material",
  "craft_technique",
  "color",
  "length_cm",
  "width_cm",
  "height_cm",
  "diameter_cm",
  "weight_g",
  "quantity",
  "handmade",
  "production_time_hours",
  "raw_material_cost_inr",
  "labor_cost_inr",
  "packaging_cost_inr",
  "other_cost_inr",
  "market_median_price_inr",
  "market_min_price_inr",
  "market_max_price_inr",
  "market_sample_count",
  "market_trend_score",
  "market_observation_date",
  "description_length",
  "design_complexity_score",
  "image_quality_score",
  "target_selling_price_inr",
] as const;

export class PricingDatasetTransformer {
  /**
   * Transforms a verified artisan product record along with relevant verified market observations.
   * Preserves full provenance of which specific market observation IDs contributed to the market features.
   */
  public static transformProductWithMarketData(
    product: VerifiedArtisanProductInput,
    availableObservations: MarketPriceObservation[]
  ): DerivedTrainingRecord {
    // 1. Query market data for matching craft criteria
    const matchingObs = availableObservations.filter((obs) => {
      const catMatch = obs.productCategory.toLowerCase() === product.category.toLowerCase();
      const typeMatch =
        obs.productType.toLowerCase().includes(product.subcategory.toLowerCase()) ||
        product.subcategory.toLowerCase().includes(obs.productType.toLowerCase());
      const matMatch = obs.material.toLowerCase() === product.material.toLowerCase();
      return catMatch && (typeMatch || matMatch);
    });

    const marketFeatures = MarketDataService.aggregateMarketObservations(
      {
        category: product.category,
        productType: product.subcategory,
        material: product.material,
      },
      matchingObs
    );

    const observationIds = matchingObs
      .map((obs) => obs.id || obs.fingerprint || "")
      .filter((id) => id.length > 0);

    const provenanceSources = Array.from(new Set(matchingObs.map((obs) => obs.source)));

    // Latest observation date
    let latestObsDate: string | null = null;
    if (matchingObs.length > 0) {
      const dates = matchingObs.map((o) => o.observationDate).sort();
      latestObsDate = dates[dates.length - 1];
    }

    return {
      id: product.id,
      category: product.category,
      subcategory: product.subcategory,
      material: product.material,
      craft_technique: product.craftTechnique,
      color: product.color,
      length_cm: product.dimensions?.lengthCm ?? null,
      width_cm: product.dimensions?.widthCm ?? null,
      height_cm: product.dimensions?.heightCm ?? null,
      diameter_cm: product.dimensions?.diameterCm ?? null,
      weight_g: product.weightGrams ?? null,
      quantity: product.quantity ?? 1,
      handmade: product.handmade !== false,
      production_time_hours: product.productionTimeHours ?? null,
      raw_material_cost_inr: product.artisanCosts.rawMaterialCostINR,
      labor_cost_inr: product.artisanCosts.laborCostINR,
      packaging_cost_inr: product.artisanCosts.packagingCostINR,
      other_cost_inr: product.artisanCosts.otherCostINR,
      market_median_price_inr: marketFeatures.available ? marketFeatures.medianPriceINR : null,
      market_min_price_inr: marketFeatures.available ? marketFeatures.minPriceINR : null,
      market_max_price_inr: marketFeatures.available ? marketFeatures.maxPriceINR : null,
      market_sample_count: marketFeatures.available ? marketFeatures.sampleCount : null,
      market_trend_score: marketFeatures.available ? marketFeatures.recentTrendScore : null,
      market_observation_date: latestObsDate,
      description_length: product.descriptionLength ?? 120,
      design_complexity_score: product.designComplexityScore ?? 0.5,
      image_quality_score: product.imageQualityScore ?? 0.8,
      target_selling_price_inr: product.targetSellingPriceINR,

      // Provenance tracking
      market_observation_ids: observationIds,
      provenance_sources: provenanceSources,
      transformation_timestamp: new Date().toISOString(),
    };
  }

  /**
   * Transforms a batch of verified artisan products into derived training records.
   */
  public static transformBatch(
    artisanProducts: VerifiedArtisanProductInput[],
    availableObservations: MarketPriceObservation[]
  ): {
    records: DerivedTrainingRecord[];
    provenanceMap: Record<string, string[]>;
  } {
    const records: DerivedTrainingRecord[] = [];
    const provenanceMap: Record<string, string[]> = {};

    for (const prod of artisanProducts) {
      const derived = this.transformProductWithMarketData(prod, availableObservations);
      records.push(derived);
      provenanceMap[derived.id] = derived.market_observation_ids;
    }

    return { records, provenanceMap };
  }

  /**
   * Formats derived records into strict 28-column canonical CSV format.
   */
  public static formatCanonicalCsv(records: DerivedTrainingRecord[]): string {
    const headerLine = CANONICAL_CSV_HEADERS.join(",");
    const rows = records.map((r) => {
      return [
        r.id,
        r.category,
        r.subcategory,
        r.material,
        r.craft_technique,
        r.color,
        r.length_cm ?? "",
        r.width_cm ?? "",
        r.height_cm ?? "",
        r.diameter_cm ?? "",
        r.weight_g ?? "",
        r.quantity,
        r.handmade,
        r.production_time_hours ?? "",
        r.raw_material_cost_inr,
        r.labor_cost_inr,
        r.packaging_cost_inr,
        r.other_cost_inr,
        r.market_median_price_inr ?? "",
        r.market_min_price_inr ?? "",
        r.market_max_price_inr ?? "",
        r.market_sample_count ?? "",
        r.market_trend_score ?? "",
        r.market_observation_date ?? "",
        r.description_length,
        r.design_complexity_score,
        r.image_quality_score,
        r.target_selling_price_inr,
      ].join(",");
    });

    return [headerLine, ...rows].join("\n");
  }

  /**
   * Generates a provenance manifest JSON linking each training record ID to its source observation IDs.
   */
  public static formatProvenanceManifest(records: DerivedTrainingRecord[]): string {
    const manifest = {
      generatedAt: new Date().toISOString(),
      totalRecords: records.length,
      records: records.map((r) => ({
        id: r.id,
        category: r.category,
        material: r.material,
        market_observation_ids: r.market_observation_ids,
        provenance_sources: r.provenance_sources,
      })),
    };
    return JSON.stringify(manifest, null, 2);
  }
}
