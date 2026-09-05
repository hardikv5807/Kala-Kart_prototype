/**
 * Kala-Kart Verified Artisan Market Data Ingestion Layer
 *
 * Implements Step 4C:
 * - Accepts legitimate artisan/handicraft market price observations
 * - Validates input fields and rejects invalid/future/synthetic records
 * - Normalizes taxonomy and formats without altering prices
 * - Detects duplicates via stable cryptographic fingerprinting
 * - Persists to local repository abstraction (data/pricing/market_observations.json)
 * - Guarantees zero synthetic or fabricated data in production store
 */

import { MarketPriceObservation } from "../../types/pricing";
import {
  validateMarketObservation,
  normalizeMarketObservation,
  generateObservationFingerprint,
} from "./marketObservationSchema";
import {
  IMarketObservationRepository,
  defaultMarketRepo,
} from "./marketObservationStore";
import { MarketDataService } from "./marketDataService";

export type IngestionStatus = "ACCEPTED" | "DUPLICATE" | "REJECTED";

export interface IngestionResult {
  status: IngestionStatus;
  fingerprint?: string;
  observation?: MarketPriceObservation;
  errors?: string[];
  message: string;
}

export interface BatchIngestionResult {
  totalProcessed: number;
  acceptedCount: number;
  duplicateCount: number;
  rejectedCount: number;
  results: IngestionResult[];
}

export class MarketIngestionService {
  private repository: IMarketObservationRepository;

  constructor(repository?: IMarketObservationRepository) {
    this.repository = repository || defaultMarketRepo;
  }

  /**
   * Ingests a single market observation candidate.
   *
   * 1. Validates strict schema and integrity constraints (rejecting synthetic/future/malformed records)
   * 2. Normalizes taxonomy while preserving authentic price & reference
   * 3. Calculates deduplication fingerprint and checks for duplicates
   * 4. Persists accepted observation to storage
   */
  public async ingestObservation(
    raw: unknown,
    options: { allowOverwriteDuplicate?: boolean } = {}
  ): Promise<IngestionResult> {
    // Step 1: Validation
    const validation = validateMarketObservation(raw);
    if (!validation.isValid) {
      return {
        status: "REJECTED",
        errors: validation.errors,
        message: `Observation rejected with ${validation.errors.length} validation error(s): ${validation.errors.join("; ")}`,
      };
    }

    // Step 2: Normalization
    const normalized = normalizeMarketObservation(raw as MarketPriceObservation);
    const fingerprint = normalized.fingerprint || generateObservationFingerprint(normalized);

    // Step 3: Duplicate Detection
    const existing = await this.repository.getByFingerprint(fingerprint);
    if (existing) {
      if (!options.allowOverwriteDuplicate) {
        return {
          status: "DUPLICATE",
          fingerprint,
          observation: existing,
          message: `Duplicate observation detected with fingerprint: ${fingerprint}. Source: ${existing.source} (${existing.observationDate})`,
        };
      }
    }

    // Step 4: Storage
    await this.repository.save(normalized);

    // Synchronize in-memory MarketDataService cache
    MarketDataService.registerObservations([normalized]);

    return {
      status: "ACCEPTED",
      fingerprint,
      observation: normalized,
      message: `Observation accepted and verified: ${normalized.productType} (₹${normalized.observedPriceINR}) from ${normalized.source}`,
    };
  }

  /**
   * Ingests a batch of market observation candidates.
   */
  public async ingestBatch(
    rawList: unknown[],
    options: { allowOverwriteDuplicate?: boolean } = {}
  ): Promise<BatchIngestionResult> {
    const results: IngestionResult[] = [];
    let acceptedCount = 0;
    let duplicateCount = 0;
    let rejectedCount = 0;

    for (const raw of rawList) {
      const res = await this.ingestObservation(raw, options);
      results.push(res);
      if (res.status === "ACCEPTED") acceptedCount++;
      else if (res.status === "DUPLICATE") duplicateCount++;
      else if (res.status === "REJECTED") rejectedCount++;
    }

    return {
      totalProcessed: rawList.length,
      acceptedCount,
      duplicateCount,
      rejectedCount,
      results,
    };
  }
}

// Default singleton instance
export const defaultMarketIngestion = new MarketIngestionService();
