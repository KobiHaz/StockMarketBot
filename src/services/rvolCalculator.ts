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

/**
 * Calculate RVOL and filter/rank stocks
 * @param stocks - Array of stock data
 * @param config - RVOL configuration
 * @returns Top signals and volume-without-price stocks
 */
export function calculateRVOL(stocks: StockData[], rvolConfig: RVOLConfig): RVOLCalcResult {
    const { minRVOL, topN, priceChangeThreshold } = rvolConfig;

    // Filter stocks with RVOL >= threshold
    const highRVOL = stocks.filter((s) => s.rvol >= minRVOL);

    logger.info(`Found ${highRVOL.length} stocks with RVOL >= ${minRVOL}`);

    // Sort by RVOL descending
    highRVOL.sort((a, b) => b.rvol - a.rvol);

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
