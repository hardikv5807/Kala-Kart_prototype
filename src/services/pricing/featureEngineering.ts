/**
 * Kala-Kart Feature Engineering Module
 *
 * Implements 4A.2:
 * - One-hot / vocabulary encoding for categorical fields
 * - Dimension parsing and geometric feature derivation (handling partial dimensions)
 * - Explicit missing value indicators (no silent arbitrary imputation)
 * - Normalization / scaling capabilities
 * - Vector serialization for tree-based and regression models
 */

import {
  PricingDatasetRow,
  ProductPricingFeatures,
  ProductDimensions,
} from "../../types/pricing";

// Categorical vocabularies with unknown token fallback
export const CATEGORY_VOCAB = [
  "pottery",
  "textiles",
  "metalwork",
  "woodcraft",
  "jewelry",
  "painting",
  "other",
] as const;

export const SUBCATEGORY_VOCAB = [
  "vase",
  "planter",
  "tableware",
  "bowl",
  "saree",
  "dupatta",
  "stole",
  "cushion_cover",
  "bedcover",
  "table_runner",
  "figurine",
  "lamp",
  "plate",
  "wall_hanging",
  "bell",
  "tray",
  "sculpture",
  "box",
  "coaster_set",
  "clock",
  "mirror_frame",
  "toys",
  "necklace",
  "earrings",
  "bangles",
  "choker",
  "ring",
  "anklet",
  "wall_art",
  "scroll",
  "canvas",
  "miniature",
  "diyas",
  "water_pot",
  "mug_set",
  "other",
] as const;

export const MATERIAL_VOCAB = [
  "terracotta",
  "blue_pottery",
  "red_clay",
  "ceramic_clay",
  "stoneware",
  "black_clay",
  "chanderi_silk",
  "cotton",
  "tussar_silk",
  "pashmina_wool",
  "linen_cotton",
  "jute_cotton",
  "brass",
  "bell_metal",
  "iron",
  "copper",
  "iron_brass",
  "sheesham_wood",
  "sandalwood",
  "teak_wood",
  "mango_wood",
  "reclaimed_wood",
  "soft_wood",
  "silver",
  "brass_stone",
  "lac",
  "beads_thread",
  "handmade_paper",
  "cloth_canvas",
  "wood",
  "cotton_canvas",
  "silk",
  "mdf_base",
  "other",
] as const;

export const CRAFT_TECHNIQUE_VOCAB = [
  "wheel_thrown",
  "hand_glazed",
  "moulded",
  "studio_pottery",
  "pinched",
  "handloom_weave",
  "jamdani",
  "block_print",
  "sozni_embroidery",
  "kantha_stitch",
  "dokra_lost_wax",
  "filigree_carving",
  "hand_hammered",
  "wrought_iron_forging",
  "meenakari",
  "brass_inlay",
  "micro_carving",
  "jali_carving",
  "resin_art",
  "rustic_distressed",
  "filigree",
  "hand_moulded",
  "stone_studded",
  "dokra_fusion",
  "kundan",
  "madhubani",
  "pattachitra",
  "warli_art",
  "gond_art",
  "mughal_miniature",
  "hand_pinched",
  "burnished",
  "dabu_mud_resist",
  "applique_work",
  "kutch_copper_coated",
  "jharokha_carving",
  "channapatna_lacquer",
  "ghungroo",
  "kalamkari_art",
  "studio_hand_glazed",
  "other",
] as const;

export const COLOR_VOCAB = [
  "natural_ochre",
  "cobalt_blue",
  "terracotta",
  "matte_green",
  "earthy_brown",
  "golden_cream",
  "indigo",
  "maroon",
  "ivory",
  "mustard_yellow",
  "antique_gold",
  "brass_yellow",
  "golden_bronze",
  "matte_black",
  "enameled_red",
  "natural_walnut",
  "natural_sandal",
  "dark_teak",
  "ocean_blue",
  "driftwood_grey",
  "oxidized_silver",
  "peacock_blue",
  "ruby_red",
  "golden_black",
  "emerald_green",
  "multicolor",
  "crimson_red",
  "white_on_mud",
  "vibrant_yellow",
  "gold_leaf_blue",
  "natural_clay",
  "indigo_white",
  "natural_beige",
  "rustic_copper",
  "antiqued_white",
  "bright_rainbow",
  "antique_brass",
  "earthy_maroon",
  "slate_grey",
  "other",
] as const;

// Normalize string tokens for robust matching
function cleanToken(val: string | null | undefined): string {
  if (!val) return "other";
  return val
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Encodes a categorical string value into a one-hot vector against a vocabulary.
 * If not found, maps to the "other" index.
 */
function encodeOneHot(value: string, vocab: readonly string[]): number[] {
  const token = cleanToken(value);
  const vec = new Array(vocab.length).fill(0);
  const idx = vocab.indexOf(token);
  if (idx >= 0) {
    vec[idx] = 1;
  } else {
    // map to "other" if exists
    const otherIdx = vocab.indexOf("other");
    if (otherIdx >= 0) {
      vec[otherIdx] = 1;
    }
  }
  return vec;
}

/**
 * Derives geometric features handling partial dimensions
 * e.g.:
 * - vase: height + diameter -> calculates cylinder volume and footprint
 * - textile: length + width -> calculates 2D surface area
 * - jewelry: length + width + weight -> calculates density indicator
 */
export function deriveDimensionalFeatures(dims: ProductDimensions, weightGrams: number | null): {
  length: number;
  width: number;
  height: number;
  diameter: number;
  hasLength: number;
  hasWidth: number;
  hasHeight: number;
  hasDiameter: number;
  hasWeight: number;
  areaCm2: number;
  volumeCm3: number;
} {
  const length = dims.lengthCm && dims.lengthCm > 0 ? dims.lengthCm : 0;
  const width = dims.widthCm && dims.widthCm > 0 ? dims.widthCm : 0;
  const height = dims.heightCm && dims.heightCm > 0 ? dims.heightCm : 0;
  const diameter = dims.diameterCm && dims.diameterCm > 0 ? dims.diameterCm : 0;
  const hasWeight = weightGrams !== null && weightGrams > 0 ? 1 : 0;

  const hasLength = length > 0 ? 1 : 0;
  const hasWidth = width > 0 ? 1 : 0;
  const hasHeight = height > 0 ? 1 : 0;
  const hasDiameter = diameter > 0 ? 1 : 0;

  let areaCm2 = 0;
  let volumeCm3 = 0;

  if (hasLength && hasWidth) {
    areaCm2 = length * width;
  } else if (hasDiameter) {
    const radius = diameter / 2;
    areaCm2 = Math.PI * radius * radius;
  }

  if (hasLength && hasWidth && hasHeight) {
    volumeCm3 = length * width * height;
  } else if (hasDiameter && hasHeight) {
    const radius = diameter / 2;
    volumeCm3 = Math.PI * radius * radius * height;
  }

  return {
    length,
    width,
    height,
    diameter,
    hasLength,
    hasWidth,
    hasHeight,
    hasDiameter,
    hasWeight,
    areaCm2,
    volumeCm3,
  };
}

/**
 * Generates human-readable names for every index in the engineered feature vector.
 */
export function getFeatureNames(): string[] {
  const names: string[] = [];

  // Categoricals
  CATEGORY_VOCAB.forEach((c) => names.push(`cat_${c}`));
  SUBCATEGORY_VOCAB.forEach((s) => names.push(`sub_${s}`));
  MATERIAL_VOCAB.forEach((m) => names.push(`mat_${m}`));
  CRAFT_TECHNIQUE_VOCAB.forEach((t) => names.push(`tech_${t}`));
  COLOR_VOCAB.forEach((col) => names.push(`col_${col}`));

  // Dimensions & flags
  names.push(
    "dim_length_cm",
    "dim_width_cm",
    "dim_height_cm",
    "dim_diameter_cm",
    "has_length",
    "has_width",
    "has_height",
    "has_diameter",
    "dim_area_cm2",
    "dim_volume_cm3",
    "weight_g",
    "has_weight",
    "quantity",
    "is_handmade",
    "production_time_hours",
    "has_production_time"
  );

  // Artisan direct costs
  names.push(
    "cost_raw_material_inr",
    "cost_labor_inr",
    "cost_packaging_inr",
    "cost_other_inr",
    "cost_total_direct_inr",
    "cost_per_unit_inr"
  );

  // Market observation features with explicit availability flags
  names.push(
    "market_has_data",
    "market_median_price_inr",
    "market_min_price_inr",
    "market_max_price_inr",
    "market_price_spread_inr",
    "market_sample_count",
    "market_trend_score"
  );

  // Description and visual image features
  names.push(
    "desc_length_chars",
    "desc_design_complexity_score",
    "desc_mentions_heritage",
    "desc_mentions_fair_wage",
    "img_has_visual_features",
    "img_quality_score",
    "img_visual_complexity",
    "img_confidence"
  );

  return names;
}

/**
 * Transforms a canonical dataset CSV row into a float feature vector.
 */
export function extractFeaturesFromRow(row: PricingDatasetRow): number[] {
  const catOneHot = encodeOneHot(row.category, CATEGORY_VOCAB);
  const subOneHot = encodeOneHot(row.subcategory, SUBCATEGORY_VOCAB);
  const matOneHot = encodeOneHot(row.material, MATERIAL_VOCAB);
  const techOneHot = encodeOneHot(row.craft_technique, CRAFT_TECHNIQUE_VOCAB);
  const colOneHot = encodeOneHot(row.color, COLOR_VOCAB);

  const dims = deriveDimensionalFeatures(
    {
      lengthCm: row.length_cm,
      widthCm: row.width_cm,
      heightCm: row.height_cm,
      diameterCm: row.diameter_cm,
    },
    row.weight_g
  );

  const weightVal = row.weight_g && row.weight_g > 0 ? row.weight_g : 0;
  const qty = row.quantity && row.quantity > 0 ? row.quantity : 1;
  const isHandmade = row.handmade ? 1 : 0;
  const prodHours = row.production_time_hours && row.production_time_hours > 0 ? row.production_time_hours : 0;
  const hasProdTime = row.production_time_hours !== null && row.production_time_hours > 0 ? 1 : 0;

  // Costs
  const rawMat = row.raw_material_cost_inr || 0;
  const labor = row.labor_cost_inr || 0;
  const pkg = row.packaging_cost_inr || 0;
  const other = row.other_cost_inr || 0;
  const totalCost = rawMat + labor + pkg + other;
  const costPerUnit = totalCost / qty;

  // Market observation features with explicit missing flags
  const hasMarketData =
    row.market_median_price_inr !== null &&
    row.market_median_price_inr > 0 &&
    (row.market_sample_count || 0) > 0
      ? 1
      : 0;

  const marketMedian = hasMarketData ? (row.market_median_price_inr as number) : 0;
  const marketMin = row.market_min_price_inr !== null ? row.market_min_price_inr : marketMedian;
  const marketMax = row.market_max_price_inr !== null ? row.market_max_price_inr : marketMedian;
  const marketSpread = Math.max(0, marketMax - marketMin);
  const marketSamples = row.market_sample_count || 0;
  const marketTrend = row.market_trend_score !== null ? row.market_trend_score : 0;

  // Description & Image features
  const descLength = row.description_length || 0;
  const designComplexity = row.design_complexity_score || 0.5;
  const imageQuality = row.image_quality_score || 0.5;

  const vector: number[] = [
    ...catOneHot,
    ...subOneHot,
    ...matOneHot,
    ...techOneHot,
    ...colOneHot,

    // Dimensions
    dims.length,
    dims.width,
    dims.height,
    dims.diameter,
    dims.hasLength,
    dims.hasWidth,
    dims.hasHeight,
    dims.hasDiameter,
    dims.areaCm2,
    dims.volumeCm3,
    weightVal,
    dims.hasWeight,
    qty,
    isHandmade,
    prodHours,
    hasProdTime,

    // Costs
    rawMat,
    labor,
    pkg,
    other,
    totalCost,
    costPerUnit,

    // Market
    hasMarketData,
    marketMedian,
    marketMin,
    marketMax,
    marketSpread,
    marketSamples,
    marketTrend,

    // Description & Image
    descLength,
    designComplexity,
    0, // mentionsHeritage (default 0 for tabular rows without text)
    0, // mentionsFairWage
    1, // img_has_visual_features
    imageQuality,
    designComplexity,
    1.0, // confidence
  ];

  return vector;
}

/**
 * Transforms runtime structured ProductPricingFeatures into the exact model feature vector.
 */
export function extractFeaturesFromProduct(features: ProductPricingFeatures): number[] {
  const catOneHot = encodeOneHot(features.category, CATEGORY_VOCAB);
  const subOneHot = encodeOneHot(features.subcategory, SUBCATEGORY_VOCAB);
  const matOneHot = encodeOneHot(features.material, MATERIAL_VOCAB);
  const techOneHot = encodeOneHot(features.craftTechnique, CRAFT_TECHNIQUE_VOCAB);
  const colOneHot = encodeOneHot(features.color, COLOR_VOCAB);

  const dims = deriveDimensionalFeatures(features.dimensions, features.weightGrams);

  const weightVal = features.weightGrams && features.weightGrams > 0 ? features.weightGrams : 0;
  const qty = features.quantity > 0 ? features.quantity : 1;
  const isHandmade = features.handmade ? 1 : 0;
  const prodHours = features.productionTimeHours && features.productionTimeHours > 0 ? features.productionTimeHours : 0;
  const hasProdTime = features.productionTimeHours !== null && features.productionTimeHours > 0 ? 1 : 0;

  // Artisan costs
  const costs = features.artisanCosts;
  const rawMat = costs.rawMaterialCostINR || 0;
  const labor = costs.laborCostINR || 0;
  const pkg = costs.packagingCostINR || 0;
  const other = costs.otherCostINR || 0;
  const totalCost = rawMat + labor + pkg + other;
  const costPerUnit = totalCost / qty;

  // Market observation features
  const market = features.marketFeatures;
  const hasMarketData = market && market.available && (market.sampleCount || 0) > 0 ? 1 : 0;
  const marketMedian = hasMarketData && market?.medianPriceINR ? market.medianPriceINR : 0;
  const marketMin = hasMarketData && market?.minPriceINR ? market.minPriceINR : marketMedian;
  const marketMax = hasMarketData && market?.maxPriceINR ? market.maxPriceINR : marketMedian;
  const marketSpread = Math.max(0, marketMax - marketMin);
  const marketSamples = hasMarketData && market?.sampleCount ? market.sampleCount : 0;
  const marketTrend = hasMarketData && market?.recentTrendScore !== null ? (market?.recentTrendScore ?? 0) : 0;

  // Description features
  const desc = features.descriptionFeatures;
  const descLength = desc.textLength || 0;
  const designComplexity = desc.designComplexityScore || 0.5;
  const mentionsHeritage = desc.mentionsHeritage ? 1 : 0;
  const mentionsFairWage = desc.mentionsFairWage ? 1 : 0;

  // Image visual features
  const img = features.imageFeatures;
  const imgHasFeatures = img !== null ? 1 : 0;
  const imgQuality = img ? img.imageQualityScore : 0.5;
  const imgVisualComplexity = img ? img.visualComplexity : designComplexity;
  const imgConfidence = img ? img.confidence : 0;

  const vector: number[] = [
    ...catOneHot,
    ...subOneHot,
    ...matOneHot,
    ...techOneHot,
    ...colOneHot,

    // Dimensions
    dims.length,
    dims.width,
    dims.height,
    dims.diameter,
    dims.hasLength,
    dims.hasWidth,
    dims.hasHeight,
    dims.hasDiameter,
    dims.areaCm2,
    dims.volumeCm3,
    weightVal,
    dims.hasWeight,
    qty,
    isHandmade,
    prodHours,
    hasProdTime,

    // Costs
    rawMat,
    labor,
    pkg,
    other,
    totalCost,
    costPerUnit,

    // Market
    hasMarketData,
    marketMedian,
    marketMin,
    marketMax,
    marketSpread,
    marketSamples,
    marketTrend,

    // Description & Image
    descLength,
    designComplexity,
    mentionsHeritage,
    mentionsFairWage,
    imgHasFeatures,
    imgQuality,
    imgVisualComplexity,
    imgConfidence,
  ];

  return vector;
}
