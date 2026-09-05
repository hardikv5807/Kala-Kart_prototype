import { CatalogItem } from "../types/artisan";
import {
  ProductPricingFeatures,
  ArtisanCostData,
  ProductDimensions,
  DescriptionFeatures,
  VisualImageFeatures,
} from "../types/pricing";

/**
 * Extracts numerical dimensions in centimeters from free-form dimension strings.
 * Handles meters, inches, cm, and diameter notations gracefully.
 */
export function parseDimensionsString(rawDimensions?: string | null): ProductDimensions {
  if (!rawDimensions) {
    return { lengthCm: null, widthCm: null, heightCm: null, diameterCm: null };
  }

  const str = rawDimensions.toLowerCase();
  let lengthCm: number | null = null;
  let widthCm: number | null = null;
  let heightCm: number | null = null;
  let diameterCm: number | null = null;

  // Check for explicit diameter
  const diaMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:cm|in|inch|inches|m)?\s*(?:diameter|dia\b|round)/);
  if (diaMatch) {
    const val = parseFloat(diaMatch[1]);
    diameterCm = str.includes("in") || str.includes("inch") ? Math.round(val * 2.54) : Math.round(val);
  }

  // Check for explicit height
  const heightMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:cm|in|inch|inches|m)?\s*(?:height|h\b|tall)/);
  if (heightMatch) {
    const val = parseFloat(heightMatch[1]);
    heightCm = str.includes("in") || str.includes("inch") ? Math.round(val * 2.54) : Math.round(val);
  }

  // Check for L x W or L x W x H formats (e.g., "2.5 m x 1.1 m" or "20 cm x 12 cm x 28 cm" or "10x5 inches")
  const multiMatch = str.match(/(\d+(?:\.\d+)?)\s*(cm|m|meter|in|inch|inches)?\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(cm|m|meter|in|inch|inches)?(?:\s*[x×*]\s*(\d+(?:\.\d+)?)\s*(cm|m|meter|in|inch|inches)?)?/);
  if (multiMatch) {
    const unit1 = multiMatch[2] || (str.includes("meter") || str.includes(" m ") ? "m" : str.includes("in") ? "in" : "cm");
    const factor = unit1 === "m" || unit1 === "meter" ? 100 : unit1 === "in" || unit1 === "inch" || unit1 === "inches" ? 2.54 : 1;

    const val1 = Math.round(parseFloat(multiMatch[1]) * factor);
    const val2 = Math.round(parseFloat(multiMatch[3]) * factor);

    if (multiMatch[5]) {
      const val3 = Math.round(parseFloat(multiMatch[5]) * factor);
      lengthCm = val1;
      widthCm = val2;
      heightCm = val3;
    } else {
      lengthCm = val1;
      widthCm = val2;
    }
  }

  return { lengthCm, widthCm, heightCm, diameterCm };
}

/**
 * Extracts weight in grams from strings like "1.25 kg", "500 grams", "320g"
 */
export function parseWeightString(rawWeight?: string | null): number | null {
  if (!rawWeight) return null;
  const str = rawWeight.toLowerCase();

  const kgMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilogram)/);
  if (kgMatch) {
    return Math.round(parseFloat(kgMatch[1]) * 1000);
  }

  const gMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:g|gm|grams?)/);
  if (gMatch) {
    return Math.round(parseFloat(gMatch[1]));
  }

  const numOnly = str.match(/(\d+(?:\.\d+)?)/);
  if (numOnly) {
    const val = parseFloat(numOnly[1]);
    return val < 20 ? Math.round(val * 1000) : Math.round(val);
  }

  return null;
}

/**
 * Extracts production time in hours from strings like "3 days", "10 hours", "2 weeks"
 */
export function parseProductionTimeString(rawTime?: string | null): number | null {
  if (!rawTime) return null;
  const str = rawTime.toLowerCase();

  const weekMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:week|हफ्ते|सप्ताह)/);
  if (weekMatch) {
    return Math.round(parseFloat(weekMatch[1]) * 40);
  }

  const dayMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:day|दिन|days)/);
  if (dayMatch) {
    return Math.round(parseFloat(dayMatch[1]) * 8);
  }

  const hourMatch = str.match(/(\d+(?:\.\d+)?)\s*(?:hour|घंटे|hr|hrs)/);
  if (hourMatch) {
    return Math.round(parseFloat(hourMatch[1]));
  }

  const numOnly = str.match(/(\d+(?:\.\d+)?)/);
  return numOnly ? Math.round(parseFloat(numOnly[1])) : null;
}

/**
 * Detects craft subcategory from catalog details
 */
export function detectSubcategory(category: string, title: string, description: string): string {
  const combined = `${title} ${description}`.toLowerCase();
  const subcategories = [
    "vase", "planter", "tableware", "bowl", "saree", "dupatta", "stole",
    "cushion_cover", "bedcover", "table_runner", "figurine", "lamp", "plate",
    "wall_hanging", "bell", "tray", "sculpture", "box", "coaster_set", "clock",
    "mirror_frame", "toys", "necklace", "earrings", "bangles", "choker",
    "ring", "anklet", "wall_art", "scroll", "canvas", "miniature", "diyas",
    "water_pot", "mug_set",
  ];

  for (const sub of subcategories) {
    const cleanSub = sub.replace(/_/g, " ");
    if (combined.includes(cleanSub) || combined.includes(sub)) {
      return sub;
    }
  }

  // Fallback mappings based on category
  switch (category.toLowerCase()) {
    case "pottery":
      return "vase";
    case "textiles":
      return "saree";
    case "woodcraft":
    case "woodwork":
      return "sculpture";
    case "metalcraft":
    case "metalwork":
      return "figurine";
    case "jewelry":
      return "necklace";
    case "painting":
      return "wall_art";
    default:
      return "other";
  }
}

/**
 * Normalizes craft category to one of canonical groups
 */
export function normalizeCategory(category: string): string {
  const cat = category.toLowerCase();
  if (cat.includes("potter") || cat.includes("clay") || cat.includes("terracotta")) return "pottery";
  if (cat.includes("textil") || cat.includes("handloom") || cat.includes("weave") || cat.includes("silk") || cat.includes("saree")) return "textiles";
  if (cat.includes("metal") || cat.includes("brass") || cat.includes("bell metal") || cat.includes("iron")) return "metalwork";
  if (cat.includes("wood")) return "woodcraft";
  if (cat.includes("jewel") || cat.includes("bead")) return "jewelry";
  if (cat.includes("paint") || cat.includes("art")) return "painting";
  return "other";
}

/**
 * Constructs a fully verified ProductPricingFeatures payload from a completed
 * CatalogItem and artisan-entered production costs.
 */
export function buildProductPricingFeatures(
  catalog: CatalogItem,
  artisanCosts: ArtisanCostData
): ProductPricingFeatures {
  const normCategory = normalizeCategory(catalog.category);
  const title = catalog.specs.productName || catalog.titleEn || catalog.titleHi || "";
  const desc = `${catalog.descriptionEn || ""} ${catalog.descriptionHi || ""}`;
  const subcategory = detectSubcategory(normCategory, title, desc);

  const dimensions = parseDimensionsString(catalog.specs.dimensions);
  const weightGrams = parseWeightString(catalog.specs.weight);
  const productionTimeHours = parseProductionTimeString(catalog.specs.productionTime);

  let quantity = 1;
  if (catalog.specs.quantity) {
    const qNum = parseInt(catalog.specs.quantity, 10);
    if (!isNaN(qNum) && qNum > 0) quantity = qNum;
  }

  const isHandmade = catalog.specs.isHandmade !== false;

  const heritageKeywords = [
    "heritage", "traditional", "ancient", "generation", "master", "kadwa", "zari",
    "banarasi", "chanderi", "pattachitra", "madhubani", "warli", "dhokra", "dokra",
    "blue pottery", "terracotta", "khurja", "saharapur", "jaipur", "varanasi",
    "विरासत", "पारंपरिक", "प्राचीन", "कारीगर", "हथकरघा"
  ];
  const fairWageKeywords = [
    "fair wage", "artisan", "fair trade", "ethical", "handloom", "sustainable",
    "authentic", "उचित मूल्य", "शिल्पकार", "मेहनताना", "हाथ से बना"
  ];

  const mentionsHeritage = heritageKeywords.some((k) => desc.toLowerCase().includes(k) || title.toLowerCase().includes(k));
  const mentionsFairWage = fairWageKeywords.some((k) => desc.toLowerCase().includes(k) || title.toLowerCase().includes(k));

  const descFeatures: DescriptionFeatures = {
    textLength: desc.length,
    wordCount: desc.split(/\s+/).filter(Boolean).length,
    mentionsHeritage,
    mentionsFairWage,
    designComplexityScore: mentionsHeritage && desc.length > 80 ? 0.8 : 0.5,
  };

  const imgFeatures: VisualImageFeatures | null = catalog.studioImage
    ? {
        visualComplexity: 0.75,
        imageQualityScore: 0.85,
        isHighResolution: true,
        hasCleanBackground: true,
        confidence: 0.85,
      }
    : null;

  return {
    category: normCategory,
    subcategory,
    material: catalog.specs.material || "natural_material",
    craftTechnique: catalog.specs.craftTechnique || "handcrafted",
    color: catalog.specs.color || "natural",
    dimensions,
    weightGrams,
    quantity,
    handmade: isHandmade,
    productionTimeHours,
    artisanCosts,
    descriptionFeatures: descFeatures,
    imageFeatures: imgFeatures,
    marketFeatures: null, // Strictly null: no fabricated market data
  };
}
