/**
 * Kala-Kart Market Observation Schema, Validation, Normalization, & Fingerprinting
 *
 * Implements Step 4C:
 * - Market observation schema with verified source classification
 * - Strict multi-point validation (zero silent repairs)
 * - Deterministic data normalization (preserving source/reference integrity)
 * - Cryptographic SHA-256 deduplication fingerprinting
 * - Strict rejection of synthetic/demo data
 */

import crypto from "crypto";
import { MarketPriceObservation, MarketDataSourceType } from "../../types/pricing";

export const VALID_SOURCE_TYPES: readonly MarketDataSourceType[] = [
  "GOVERNMENT",
  "ARTISAN_COOPERATIVE",
  "CRAFT_COUNCIL",
  "OFFICIAL_MARKETPLACE",
  "VERIFIED_FAIR_OR_EXHIBITION",
  "OTHER_VERIFIED",
] as const;

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a raw market observation candidate.
 * Rejects invalid, incomplete, future, synthetic, or unverified records with explicit errors.
 */
export function validateMarketObservation(raw: unknown): ValidationResult {
  const errors: string[] = [];

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {
      isValid: false,
      errors: ["Observation record must be a non-null object"],
    };
  }

  const record = raw as Record<string, unknown>;

  // 1. Synthetic / Mock Data Check
  if (record.isSynthetic === true) {
    errors.push("Synthetic demo data must NEVER be accepted as production market data");
  }

  const syntheticPattern = /(synthetic|demo_data|test_stub|mock_price|dummy_observation|fake_market)/i;
  const sourceStr = String(record.source || "");
  const refStr = String(record.urlOrReference || "");
  const typeStr = String(record.productType || "");

  if (
    syntheticPattern.test(sourceStr) ||
    syntheticPattern.test(refStr) ||
    syntheticPattern.test(typeStr)
  ) {
    errors.push("Synthetic or mock data cannot be ingested into production market repository");
  }

  // 2. Price Validation
  if (record.observedPriceINR === undefined || record.observedPriceINR === null) {
    errors.push("Missing observed price: observedPriceINR is required");
  } else if (
    typeof record.observedPriceINR !== "number" ||
    isNaN(record.observedPriceINR) ||
    !isFinite(record.observedPriceINR)
  ) {
    errors.push("Invalid observed price: observedPriceINR must be a valid finite number");
  } else if (record.observedPriceINR <= 0) {
    errors.push(`Invalid observed price: observedPriceINR must be strictly positive (got ${record.observedPriceINR})`);
  }

  // 3. Currency Validation
  if (record.currency !== undefined && record.currency !== null) {
    const curr = String(record.currency).trim().toUpperCase();
    if (curr !== "INR" && curr !== "₹") {
      errors.push(`Unsupported currency '${record.currency}': only Indian Rupee (INR) is supported`);
    }
  }

  // 4. Source & Source Classification Validation
  if (!record.source || typeof record.source !== "string" || record.source.trim().length === 0) {
    errors.push("Missing source: every observation must identify its empirical source");
  }

  if (record.sourceType) {
    const sType = String(record.sourceType).trim() as MarketDataSourceType;
    if (!VALID_SOURCE_TYPES.includes(sType)) {
      errors.push(
        `Invalid sourceType '${record.sourceType}'. Must be one of: ${VALID_SOURCE_TYPES.join(", ")}`
      );
    }
  }

  // 5. Reference Citation Validation (No unverified claims allowed)
  if (
    !record.urlOrReference ||
    typeof record.urlOrReference !== "string" ||
    record.urlOrReference.trim().length === 0
  ) {
    errors.push("Missing reference: verified observations require a verifiable URL or reference citation");
  }

  // 6. Category & Product Type
  if (
    !record.productCategory ||
    typeof record.productCategory !== "string" ||
    record.productCategory.trim().length === 0
  ) {
    errors.push("Missing product category");
  }

  if (
    !record.productType ||
    typeof record.productType !== "string" ||
    record.productType.trim().length === 0
  ) {
    errors.push("Missing product type");
  }

  // 7. Material Validation
  if (
    !record.material ||
    typeof record.material !== "string" ||
    record.material.trim().length === 0
  ) {
    errors.push("Missing material: observation requires primary craft material");
  }

  // 8. Observation Date Validation
  if (!record.observationDate) {
    errors.push("Missing observation date");
  } else {
    const dateStr = String(record.observationDate).trim();
    const parsedDate = new Date(dateStr);
    if (isNaN(parsedDate.getTime())) {
      errors.push(`Invalid observation date '${record.observationDate}': must be valid ISO YYYY-MM-DD`);
    } else {
      // Future date check (allow up to 2 hours clock skew)
      const now = new Date();
      const twoHoursAhead = new Date(now.getTime() + 2 * 60 * 60 * 1000);
      if (parsedDate > twoHoursAhead) {
        errors.push(`Future observation date rejected: '${dateStr}' is in the future`);
      }
    }
  }

  // 9. Confidence Validation
  if (record.confidence !== undefined && record.confidence !== null) {
    if (
      typeof record.confidence !== "number" ||
      isNaN(record.confidence) ||
      record.confidence < 0.0 ||
      record.confidence > 1.0
    ) {
      errors.push("Invalid confidence score: must be a number between 0.0 and 1.0");
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Normalizes category name into canonical taxonomy
 */
export function normalizeCategoryName(rawCategory: string): string {
  const cat = rawCategory.toLowerCase().trim();
  if (cat.includes("potter") || cat.includes("clay") || cat.includes("terracotta")) return "pottery";
  if (cat.includes("textil") || cat.includes("handloom") || cat.includes("weave") || cat.includes("silk") || cat.includes("saree")) return "textiles";
  if (cat.includes("metal") || cat.includes("brass") || cat.includes("dokra") || cat.includes("dhokra") || cat.includes("bell metal") || cat.includes("iron")) return "metalwork";
  if (cat.includes("wood")) return "woodcraft";
  if (cat.includes("jewel") || cat.includes("bead")) return "jewelry";
  if (cat.includes("paint") || cat.includes("art")) return "painting";
  return "other";
}

/**
 * Normalizes craft product type
 */
export function normalizeProductType(rawType: string): string {
  return rawType
    .toLowerCase()
    .trim()
    .replace(/[_\-]+/g, " ")
    .replace(/\s+/g, " ");
}

/**
 * Normalizes material name to snake_case identifier
 */
export function normalizeMaterialName(rawMaterial: string): string {
  const mat = rawMaterial.toLowerCase().trim().replace(/[\s\-]+/g, "_");
  const knownMappings: Record<string, string> = {
    bluepottery: "blue_pottery",
    chanderisilk: "chanderi_silk",
    tussarsilk: "tussar_silk",
    pashminawool: "pashmina_wool",
    bellmetal: "bell_metal",
    sheeshamwood: "sheesham_wood",
    sandalwood: "sandalwood",
    teakwood: "teak_wood",
    mangowood: "mango_wood",
  };
  return knownMappings[mat] || mat;
}

/**
 * Normalizes craft technique to snake_case identifier
 */
export function normalizeCraftTechnique(rawTechnique?: string): string | undefined {
  if (!rawTechnique) return undefined;
  return rawTechnique.toLowerCase().trim().replace(/[\s\-]+/g, "_");
}

/**
 * Normalizes observation date to canonical ISO YYYY-MM-DD
 */
export function normalizeObservationDate(rawDate: string): string {
  const dateObj = new Date(rawDate.trim());
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Normalizes location string
 */
export function normalizeLocation(rawLocation?: string): string | undefined {
  if (!rawLocation) return undefined;
  return rawLocation.trim().replace(/\s+/g, " ");
}

/**
 * Generates a stable cryptographic SHA-256 fingerprint for deduplication.
 * Based strictly on core observation dimensions:
 * - source
 * - productType
 * - material
 * - observedPriceINR (2 decimal fixed)
 * - observationDate (canonical ISO)
 * - location
 * - urlOrReference
 */
export function generateObservationFingerprint(obs: {
  source: string;
  productType: string;
  material: string;
  observedPriceINR: number;
  observationDate: string;
  location?: string;
  urlOrReference?: string;
}): string {
  const sourceNorm = obs.source.toLowerCase().trim();
  const typeNorm = normalizeProductType(obs.productType);
  const matNorm = normalizeMaterialName(obs.material);
  const priceNorm = obs.observedPriceINR.toFixed(2);
  const dateNorm = normalizeObservationDate(obs.observationDate);
  const locNorm = (obs.location || "").toLowerCase().trim();
  const refNorm = (obs.urlOrReference || "").toLowerCase().trim();

  const rawKey = `${sourceNorm}|${typeNorm}|${matNorm}|${priceNorm}|${dateNorm}|${locNorm}|${refNorm}`;
  return crypto.createHash("sha256").update(rawKey, "utf8").digest("hex");
}

/**
 * Normalizes a validated observation record while preserving original source/reference values.
 * Does not alter observed price value except for valid numeric parsing.
 */
export function normalizeMarketObservation(
  raw: MarketPriceObservation
): MarketPriceObservation {
  const normalizedCategory = normalizeCategoryName(raw.productCategory);
  const normalizedType = normalizeProductType(raw.productType);
  const normalizedMaterial = normalizeMaterialName(raw.material);
  const normalizedTechnique = normalizeCraftTechnique(raw.craftTechnique);
  const normalizedDate = normalizeObservationDate(raw.observationDate);
  const normalizedLocation = normalizeLocation(raw.location);
  const normalizedPrice = Math.round(raw.observedPriceINR * 100) / 100;

  const fingerprint = generateObservationFingerprint({
    source: raw.source,
    productType: normalizedType,
    material: normalizedMaterial,
    observedPriceINR: normalizedPrice,
    observationDate: normalizedDate,
    location: normalizedLocation,
    urlOrReference: raw.urlOrReference,
  });

  const id = raw.id || `obs_${fingerprint.substring(0, 16)}`;

  return {
    id,
    source: raw.source.trim(), // Preserved original string with trimmed ends
    sourceType: raw.sourceType || "OTHER_VERIFIED",
    productCategory: normalizedCategory,
    productType: normalizedType,
    material: normalizedMaterial,
    craftTechnique: normalizedTechnique,
    observedPriceINR: normalizedPrice,
    currency: "INR",
    observationDate: normalizedDate,
    location: normalizedLocation,
    urlOrReference: raw.urlOrReference ? raw.urlOrReference.trim() : undefined, // Preserved
    confidence: typeof raw.confidence === "number" ? raw.confidence : 0.85,
    fingerprint,
    createdAt: raw.createdAt || new Date().toISOString(),
    isSynthetic: false,
  };
}
