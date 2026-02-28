import { StockData } from '../types/index.js';

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
