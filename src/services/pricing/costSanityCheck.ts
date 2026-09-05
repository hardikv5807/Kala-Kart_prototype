/**
 * Kala-Kart Cost Sanity Check Module
 *
 * Implements 4A.9:
 * - Deterministic economic floor calculation
 * - Calculates total cost = rawMaterial + labor + packaging + other
 * - Calculates costPerUnit = totalCost / quantity
 * - Flags if ML predicted price is below artisan's actual production cost
 * - CRITICAL: Never silently overrides the ML prediction
 */

import { ArtisanCostData, CostSanityCheckResult } from "../../types/pricing";

export function performCostSanityCheck(
  costs: ArtisanCostData,
  predictedPriceINR: number | null
): CostSanityCheckResult {
  const raw = Math.max(0, costs.rawMaterialCostINR || 0);
  const labor = Math.max(0, costs.laborCostINR || 0);
  const packaging = Math.max(0, costs.packagingCostINR || 0);
  const other = Math.max(0, costs.otherCostINR || 0);
  const quantity = Math.max(1, costs.quantity || 1);

  const totalProductionCostINR = raw + labor + packaging + other;
  const costPerUnitINR = Math.round((totalProductionCostINR / quantity) * 100) / 100;

  let isBelowCost = false;
  let costWarning: string | null = null;

  if (predictedPriceINR !== null && predictedPriceINR > 0) {
    if (predictedPriceINR < costPerUnitINR) {
      isBelowCost = true;
      const deficit = Math.round(costPerUnitINR - predictedPriceINR);
      costWarning = `Predicted price (₹${Math.round(predictedPriceINR)}) is below estimated production cost (₹${Math.round(costPerUnitINR)} by ₹${deficit}).`;
    }
  }

  return {
    totalProductionCostINR,
    costPerUnitINR,
    isBelowCost,
    costWarning,
    breakdown: {
      rawMaterial: raw,
      labor,
      packaging,
      other,
      quantity,
    },
  };
}
