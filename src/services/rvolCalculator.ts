/**
 * Smart Volume Radar - RVOL Calculator
 * Calculates Relative Volume and identifies high-volume signals
 */

import { StockData, RVOLConfig } from '../types/index.js';
import logger from '../utils/logger.js';

/**
 * RVOL calculation results
 */
export interface RVOLCalcResult {
    topSignals: StockData[];
    volumeWithoutPrice: StockData[];
}

/** Full setup: near SMA21, near ATH, in 6mo-3y window */
function isFullConsolidationSetup(s: StockData): boolean {
    return !!(s.nearSMA21 && s.nearAth && s.inConsolidationWindow);
}

/** Close setup: flexible - e.g. 4mo base, 17% from ATH - worth watching */
function isCloseConsolidationSetup(s: StockData): boolean {
    const smaOk = s.nearSMA21 || s.nearSMA21Close;
    const athOk = s.nearAth || s.nearAthClose;
    const baseOk = s.inConsolidationWindow || s.inConsolidationClose;
    return !!(smaOk && athOk && baseOk);
}

/**
 * Calculate RVOL and filter/rank stocks
 * Boosts stocks in consolidation setup (near SMA21, near ATH, 6mo-3y base)
 * @param stocks - Array of stock data
 * @param config - RVOL configuration
 * @returns Top signals and volume-without-price stocks
 */
export function calculateRVOL(stocks: StockData[], rvolConfig: RVOLConfig): RVOLCalcResult {
    const { minRVOL, topN, priceChangeThreshold } = rvolConfig;

    // Filter stocks with RVOL >= threshold
    const highRVOL = stocks.filter((s) => s.rvol >= minRVOL);

    logger.info(`Found ${highRVOL.length} stocks with RVOL >= ${minRVOL}`);

    // Sort by RVOL descending, with consolidation setup as tie-breaker (full > close > none)
    highRVOL.sort((a, b) => {
        const rvolDiff = b.rvol - a.rvol;
        if (Math.abs(rvolDiff) >= 0.5) return rvolDiff > 0 ? 1 : -1; // RVOL dominates
        const boostA = isFullConsolidationSetup(a) ? 2 : isCloseConsolidationSetup(a) ? 1 : 0;
        const boostB = isFullConsolidationSetup(b) ? 2 : isCloseConsolidationSetup(b) ? 1 : 0;
        return boostB - boostA || rvolDiff;
    });

    const fullCount = highRVOL.filter(isFullConsolidationSetup).length;
    const closeCount = highRVOL.filter(isCloseConsolidationSetup).length;
    if (fullCount > 0 || closeCount > 0) {
        logger.info(`Identified ${fullCount} full + ${closeCount} close consolidation setup(s)`);
    }

    // Top N signals
    const topSignals = highRVOL.slice(0, topN);

    // Volume without Price (high volume, low price change = silent accumulation/distribution)
    // This is a subset of highRVOL stocks where price didn't move much despite high volume
    const volumeWithoutPrice = highRVOL.filter(
        (s) => Math.abs(s.priceChange) < priceChangeThreshold
    );

    if (volumeWithoutPrice.length > 0) {
        logger.info(
            `Identified ${volumeWithoutPrice.length} "Volume w/o Price" stocks (|change| < ${priceChangeThreshold}%)`
        );
    }

    return { topSignals, volumeWithoutPrice };
}

/**
 * Format RVOL for display (e.g., "3.25x")
 */
export function formatRVOL(rvol: number): string {
    return `${rvol.toFixed(2)}x`;
}

/**
 * Format price change for display (e.g., "+5.42%" or "-2.31%")
 */
export function formatPriceChange(change: number): string {
    const sign = change >= 0 ? '+' : '';
    return `${sign}${change.toFixed(2)}%`;
}

/**
 * Determine if stock is bullish or bearish based on price change
 */
export function isBullish(stock: StockData): boolean {
    return stock.priceChange >= 0;
}
