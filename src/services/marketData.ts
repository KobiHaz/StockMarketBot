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
    validation: { logErrors: false },
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
        const err = error as any;
        if (err.message?.includes('Too Many Requests') || err.response?.status === 429) {
            logger.error(`❌ Yahoo Finance RATE LIMIT (429) for ${ticker}. The IP is blocked.`);
        } else if (err.message?.includes('Not Found') || err.response?.status === 404) {
            logger.error(`❌ Ticker NOT FOUND: ${ticker}. Check the symbol on finance.yahoo.com`);
        } else {
            logger.error(`❌ Error fetching ${ticker}:`, err.message || err);
        }
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
 * Fetch stock data for all tickers using a single batch request
 * This is much more efficient and less likely to trigger rate limits than sequential calls
 * @param tickers - Array of ticker symbols
 * @returns Array of StockData (excludes failed fetches)
 */
export async function fetchAllStocks(tickers: string[]): Promise<StockData[]> {
    logger.info(`🚀 Starting batch fetch for ${tickers.length} tickers...`);

    return withRetry(
        async () => {
            // yahooFinance.quote can take an array of symbols
            const quotes = await yahooFinance.quote(tickers);

            // quotes is either a single Quote (if 1 ticker) or an array of Quotes
            const quoteArray = Array.isArray(quotes) ? quotes : [quotes];

            const results: StockData[] = quoteArray
                .map(quote => {
                    const currentVolume = quote.regularMarketVolume || 0;
                    const avgVolume = quote.averageDailyVolume3Month || 0;

                    if (avgVolume === 0) return null;

                    return {
                        ticker: quote.symbol,
                        currentVolume,
                        avgVolume,
                        rvol: currentVolume / avgVolume,
                        priceChange: quote.regularMarketChangePercent || 0,
                        lastPrice: quote.regularMarketPrice || 0,
                    } as StockData;
                })
                .filter((s): s is StockData => s !== null);

            logger.info(`✅ Successfully fetched ${results.length}/${tickers.length} symbols in one batch`);
            return results;
        },
        config.maxRetries,
        config.retryDelayMs * 2,
        'Batch quote fetch'
    ).catch((error) => {
        logger.error('❌ Batch fetch failed completely after retries:', error.message);
        return [];
    });
}
