/**
 * Kala-Kart Market Observation Storage Abstraction & JSON Repository
 *
 * Implements Step 4C.6:
 * - Local JSON-backed repository at data/pricing/market_observations.json
 * - Kept strictly separate from data/pricing/pricing_training.csv
 * - Does NOT copy observations to training CSV automatically
 */

import fs from "fs";
import path from "path";
import { MarketPriceObservation } from "../../types/pricing";

export interface IMarketObservationRepository {
  getAll(): Promise<MarketPriceObservation[]>;
  getById(id: string): Promise<MarketPriceObservation | null>;
  getByFingerprint(fingerprint: string): Promise<MarketPriceObservation | null>;
  save(observation: MarketPriceObservation): Promise<void>;
  saveBatch(observations: MarketPriceObservation[]): Promise<number>;
  count(): Promise<number>;
  clear(): Promise<void>;
}

export class FileMarketObservationRepository implements IMarketObservationRepository {
  private filePath: string;
  private cache: MarketPriceObservation[] | null = null;
  private fingerprintIndex: Map<string, MarketPriceObservation> = new Map();

  constructor(customPath?: string) {
    this.filePath =
      customPath ||
      path.join(process.cwd(), "data", "pricing", "market_observations.json");
  }

  private ensureDirectory(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadSync(): MarketPriceObservation[] {
    if (this.cache !== null) {
      return this.cache;
    }

    if (!fs.existsSync(this.filePath)) {
      this.cache = [];
      this.fingerprintIndex.clear();
      return this.cache;
    }

    try {
      const raw = fs.readFileSync(this.filePath, "utf-8").trim();
      if (!raw) {
        this.cache = [];
      } else {
        const parsed = JSON.parse(raw);
        this.cache = Array.isArray(parsed) ? parsed : [];
      }
    } catch (err) {
      console.error(`Failed to read market observations from ${this.filePath}:`, err);
      this.cache = [];
    }

    this.fingerprintIndex.clear();
    for (const obs of this.cache) {
      if (obs.fingerprint) {
        this.fingerprintIndex.set(obs.fingerprint, obs);
      }
    }

    return this.cache;
  }

  private saveSync(): void {
    this.ensureDirectory();
    const data = this.cache || [];
    fs.writeFileSync(this.filePath, JSON.stringify(data, null, 2), "utf-8");
  }

  public async getAll(): Promise<MarketPriceObservation[]> {
    return [...this.loadSync()];
  }

  public async getById(id: string): Promise<MarketPriceObservation | null> {
    const items = this.loadSync();
    return items.find((item) => item.id === id) || null;
  }

  public async getByFingerprint(fingerprint: string): Promise<MarketPriceObservation | null> {
    this.loadSync();
    return this.fingerprintIndex.get(fingerprint) || null;
  }

  public async save(observation: MarketPriceObservation): Promise<void> {
    const items = this.loadSync();
    const existingIdx = items.findIndex(
      (item) =>
        item.id === observation.id ||
        (item.fingerprint && item.fingerprint === observation.fingerprint)
    );

    if (existingIdx >= 0) {
      items[existingIdx] = observation;
    } else {
      items.push(observation);
    }

    if (observation.fingerprint) {
      this.fingerprintIndex.set(observation.fingerprint, observation);
    }

    this.saveSync();
  }

  public async saveBatch(observations: MarketPriceObservation[]): Promise<number> {
    const items = this.loadSync();
    let savedCount = 0;

    for (const obs of observations) {
      const existingIdx = items.findIndex(
        (item) =>
          item.id === obs.id ||
          (item.fingerprint && item.fingerprint === obs.fingerprint)
      );

      if (existingIdx >= 0) {
        items[existingIdx] = obs;
      } else {
        items.push(obs);
        savedCount++;
      }

      if (obs.fingerprint) {
        this.fingerprintIndex.set(obs.fingerprint, obs);
      }
    }

    this.saveSync();
    return savedCount;
  }

  public async count(): Promise<number> {
    return this.loadSync().length;
  }

  public async clear(): Promise<void> {
    this.cache = [];
    this.fingerprintIndex.clear();
    this.saveSync();
  }
}

// Default singleton instance
export const defaultMarketRepo = new FileMarketObservationRepository();
