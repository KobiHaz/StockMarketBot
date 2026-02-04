/**
 * Smart Volume Radar - Technical Analysis Utility
 * Calculates SMA and RSI from price history
 */

/**
 * Calculate Simple Moving Average
 */
export function calculateSMA(prices: number[], periods: number): number | undefined {
    if (prices.length < periods) return undefined;
    const slice = prices.slice(-periods);
    const sum = slice.reduce((a, b) => a + b, 0);
    return sum / periods;
}

/**
 * Calculate Relative Strength Index (RSI)
 */
export function calculateRSI(prices: number[], periods: number = 14): number | undefined {
    if (prices.length < periods + 1) return undefined;

    let gains = 0;
    let losses = 0;

    for (let i = prices.length - periods; i < prices.length; i++) {
        const diff = prices[i] - prices[i - 1];
        if (diff >= 0) {
            gains += diff;
        } else {
            losses -= diff;
        }
    }

    if (losses === 0) return 100;

    const rs = gains / losses;
    return 100 - (100 / (1 + rs));
}
