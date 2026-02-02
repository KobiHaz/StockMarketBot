/**
 * Smart Volume Radar - Market Data Service
 * Fetches stock data from Yahoo Finance with retry logic and batch processing
 */

import yahooFinance from 'yahoo-finance2';
import { StockData } from '../types/index.js';
import { config } from '../config/index.js';
import { withRetry, sleep } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Suppress Yahoo Finance validation warnings
 */
yahooFinance.setGlobalConfig({
    validation: { logErrors: false }
});

/**
 * Fetch data for a single ticker using the quote endpoint
 * This is more lightweight and less likely to trigger 429 errors than historical data
 * @param ticker - Ticker symbol
 * @returns StockData object or null if fetch fails
 */
async function fetchStockData(ticker: string): Promise<StockData | null> {
    try {
        const quote = await yahooFinance.quote(ticker);

        if (!quote) {
            logger.warn(`No quote data found for ${ticker}`);
            return null;
        }

        // Use pre-calculated volume data from Yahoo
        const currentVolume = quote.regularMarketVolume || 0;
        const avgVolume = quote.averageDailyVolume3Month || 0;
        const priceChange = quote.regularMarketChangePercent || 0;

        if (avgVolume === 0) {
            logger.warn(`Average volume is 0 for ${ticker}, skipping...`);
            return null;
        }

        const rvol = currentVolume / avgVolume;

        return {
            ticker,
            currentVolume,
            avgVolume,
            rvol,
            priceChange,
            lastPrice: quote.regularMarketPrice || 0,
        };
    } catch (error) {
        logger.error(`Failed to fetch data for ${ticker}`, error);
        return null;
    }
}

/**
 * Fetch stock data for a single ticker with retry logic
 */
async function fetchStockDataWithRetry(ticker: string): Promise<StockData | null> {
    return withRetry(
        () => fetchStockData(ticker),
        config.maxRetries,
        config.retryDelayMs,
        `Fetch ${ticker}`
    ).catch(() => null); // Return null on final failure, don't throw
}

/**
 * Fetch stock data for all tickers sequentially with delays
 * @param tickers - Array of ticker symbols
 * @returns Array of StockData (excludes failed fetches)
 */
export async function fetchAllStocks(tickers: string[]): Promise<StockData[]> {
    const results: StockData[] = [];
    const { batchDelayMs } = config;

    logger.info(`Starting sequential fetch for ${tickers.length} tickers...`);

    for (let i = 0; i < tickers.length; i++) {
        const ticker = tickers[i];
        const progress = `${i + 1}/${tickers.length}`;

        logger.info(`[${progress}] Fetching ${ticker}...`);

        const result = await fetchStockDataWithRetry(ticker);
        if (result) {
            results.push(result);
        }

        // Delay between EVERY ticker to respect Yahoo rate limits
        // Use batchDelayMs as the baseline (e.g., 1s or 2s)
        if (i < tickers.length - 1) {
            const jitter = Math.random() * 500; // Add 0-500ms jitter
            await sleep(batchDelayMs + jitter);
        }
    }

    logger.info(`Fetched data for ${results.length}/${tickers.length} tickers successfully`);
    return results;
}
