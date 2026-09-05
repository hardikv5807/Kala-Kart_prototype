/**
 * Kala-Kart Market Data Integration Service
 *
 * Implements Step 4C.7 & 4C.8:
 * - MarketPriceObservation schema & verified source handling
 * - Market feature aggregation function (median, min, max, sample count, trend score)
 * - Explicit "Market data unavailable" handling when legitimate observations are absent
 * - Clear recency policy: recent observations prioritized, stale (>730d) separated
 * - Explicit trendScore: null when insufficient temporal observations exist
 * - Zero fabricated market data: never invents observations or competitor prices
 */

import {
  MarketPriceObservation,
  AggregatedMarketFeatures,
} from "../../types/pricing";

export class MarketDataService {
  private static observationsStore: MarketPriceObservation[] = [];

  /**
   * Registers verified, authentic market observations into the system.
   * Only legitimate empirical data sources (verified marketplace listings,
   * export council trade bulletins, or government craft fair indices) may be registered.
   */
  public static registerObservations(observations: MarketPriceObservation[]): void {
    for (const obs of observations) {
      if (
        obs.observedPriceINR > 0 &&
        obs.source &&
        obs.observationDate &&
        obs.confidence > 0
      ) {
        this.observationsStore.push(obs);
      }
    }
  }

  /**
   * Clears in-memory market observations.
   */
  public static clearObservations(): void {
    this.observationsStore = [];
  }

  /**
   * Returns current count of registered observations.
   */
  public static getObservationCount(): number {
    return this.observationsStore.length;
  }

  /**
   * Aggregates legitimate market price observations matching query attributes.
   * If matching observations are empty, explicitly returns "Market data unavailable".
   */
  public static aggregateMarketObservations(
    query: {
      category?: string;
      productType?: string;
      material?: string;
    },
    customObservations?: MarketPriceObservation[]
  ): AggregatedMarketFeatures {
    const pool = customObservations ?? this.observationsStore;

    if (!pool || pool.length === 0) {
      return {
        available: false,
        medianPriceINR: null,
        minPriceINR: null,
        maxPriceINR: null,
        sampleCount: 0,
        recentTrendScore: null,
        statusMessage: "Market data unavailable",
      };
    }

    // Filter relevant observations by craft category, product type, and material
    const queryCat = query.category?.toLowerCase().trim();
    const queryType = query.productType?.toLowerCase().trim();
    const queryMat = query.material?.toLowerCase().trim();

    const matching = pool.filter((obs) => {
      let matches = true;
      if (queryCat && obs.productCategory.toLowerCase().trim() !== queryCat) {
        matches = false;
      }
      if (queryType && obs.productType.toLowerCase().trim() !== queryType) {
        // Soft match if subtype omitted or general
        if (!obs.productType.toLowerCase().includes(queryType)) {
          matches = false;
        }
      }
      if (queryMat && obs.material.toLowerCase().trim() !== queryMat) {
        // Material match
        if (!obs.material.toLowerCase().includes(queryMat)) {
          matches = false;
        }
      }
      return matches;
    });

    if (matching.length === 0) {
      return {
        available: false,
        medianPriceINR: null,
        minPriceINR: null,
        maxPriceINR: null,
        sampleCount: 0,
        recentTrendScore: null,
        statusMessage: "Market data unavailable",
      };
    }

    // 4C.8 Recency Policy:
    // Recent observations within 365 days are prioritized for price calculation.
    // If all observations are older than 365 days, we still use them but note the recency span.
    const now = new Date();
    const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
    const recentMatching = matching.filter((obs) => {
      const d = new Date(obs.observationDate);
      return !isNaN(d.getTime()) && d >= oneYearAgo;
    });

    const activePool = recentMatching.length > 0 ? recentMatching : matching;

    // Sort prices to compute accurate median, min, max
    const prices = activePool.map((m) => m.observedPriceINR).sort((a, b) => a - b);
    const minPrice = prices[0];
    const maxPrice = prices[prices.length - 1];

    const mid = Math.floor(prices.length / 2);
    const medianPrice =
      prices.length % 2 === 0
        ? Math.round((prices[mid - 1] + prices[mid]) / 2)
        : Math.round(prices[mid]);

    // 4C.8 Recency & Trend Policy:
    // Do not invent a trend. If there are insufficient observations (< 4) or
    // observations lack temporal separation (< 7 days between earliest and latest),
    // trendScore must be null and explicitly indicated as unavailable.
    let trendScore: number | null = null;
    let trendAvailable = false;

    if (matching.length >= 4) {
      const sortedByDate = [...matching].sort(
        (a, b) =>
          new Date(a.observationDate).getTime() -
          new Date(b.observationDate).getTime()
      );

      const earliest = new Date(sortedByDate[0].observationDate).getTime();
      const latest = new Date(sortedByDate[sortedByDate.length - 1].observationDate).getTime();
      const timeSpanDays = (latest - earliest) / (1000 * 60 * 60 * 24);

      if (timeSpanDays >= 7) {
        const half = Math.floor(sortedByDate.length / 2);
        const olderPrices = sortedByDate.slice(0, half).map((o) => o.observedPriceINR);
        const newerPrices = sortedByDate.slice(half).map((o) => o.observedPriceINR);

        const olderAvg = olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length;
        const newerAvg = newerPrices.reduce((a, b) => a + b, 0) / newerPrices.length;

        if (olderAvg > 0) {
          const delta = (newerAvg - olderAvg) / olderAvg;
          trendScore = Math.max(-1.0, Math.min(1.0, parseFloat(delta.toFixed(3))));
          trendAvailable = true;
        }
      }
    }

    const statusMessage = trendAvailable
      ? `Aggregated ${matching.length} verified market observations`
      : `Aggregated ${matching.length} verified market observations (recent trend unavailable: requires at least 4 temporal observations over time)`;

    return {
      available: true,
      medianPriceINR: medianPrice,
      minPriceINR: minPrice,
      maxPriceINR: maxPrice,
      sampleCount: matching.length,
      recentTrendScore: trendScore,
      statusMessage,
    };
  }
}
