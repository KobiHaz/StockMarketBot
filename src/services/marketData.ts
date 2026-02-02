/**
 * Smart Volume Radar - Market Data Service
 * Fetches stock data with Yahoo Finance as primary and Alpha Vantage as fallback
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
 * Fetch stock data from Alpha Vantage API (fallback provider)
 * Alpha Vantage provides volume data which is essential for RVOL calculation
 */
async function fetchFromAlphaVantage(ticker: string): Promise<StockData | null> {
    const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
    if (!apiKey) {
        return null;
    }

    try {
        // Convert Tel Aviv suffix if needed (LUMI.TA -> LUMI.TAE for Alpha Vantage)
        const avTicker = ticker.replace('.TA', '.TLV');

        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${avTicker}&apikey=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json() as Record<string, any>;

        if (data['Global Quote'] && data['Global Quote']['05. price']) {
            const quote = data['Global Quote'] as Record<string, string>;
            const currentVolume = parseFloat(quote['06. volume']) || 0;
            const lastPrice = parseFloat(quote['05. price']) || 0;
            const priceChange = parseFloat(quote['10. change percent']?.replace('%', '')) || 0;

            // Alpha Vantage doesn't provide avg volume, so we'll estimate from current
            // This is a limitation - for proper RVOL we need historical data
            return {
                ticker,
                currentVolume,
                avgVolume: currentVolume, // Placeholder - will show RVOL of 1.0
                rvol: 1.0,
                priceChange,
                lastPrice,
            };
        }
        return null;
    } catch (error) {
        logger.warn(`Alpha Vantage fetch failed for ${ticker}:`, error);
        return null;
    }
}

/**
 * Fetch data for a single ticker using Yahoo Finance
 */
async function fetchFromYahoo(ticker: string): Promise<StockData | null> {
    try {
        const quote = await yahooFinance.quote(ticker);

        if (!quote) {
            return null;
        }

        const currentVolume = quote.regularMarketVolume || 0;
        const avgVolume = quote.averageDailyVolume3Month || 0;
        const priceChange = quote.regularMarketChangePercent || 0;

        if (avgVolume === 0) {
            return null;
        }

        return {
            ticker,
            currentVolume,
            avgVolume,
            rvol: currentVolume / avgVolume,
            priceChange,
            lastPrice: quote.regularMarketPrice || 0,
        };
    } catch (error) {
        const err = error as any;
        if (err.message?.includes('Too Many Requests') || err.message?.includes('429')) {
            logger.warn(`Yahoo rate-limited for ${ticker}, trying fallback...`);
        }
        return null;
    }
}

/**
 * Fetch stock data with fallback strategy
 */
async function fetchStockDataWithFallback(ticker: string): Promise<StockData | null> {
    // Try Yahoo first
    let result = await fetchFromYahoo(ticker);
    if (result) return result;

    // Try Alpha Vantage as fallback
    result = await fetchFromAlphaVantage(ticker);
    if (result) {
        logger.info(`✅ Got ${ticker} from Alpha Vantage fallback`);
        return result;
    }

    return null;
}

/**
 * Fetch stock data for all tickers
 * Uses batch request for Yahoo, falls back to sequential with Alpha Vantage
 */
export async function fetchAllStocks(tickers: string[]): Promise<StockData[]> {
    logger.info(`🚀 Starting fetch for ${tickers.length} tickers...`);

    // First, try Yahoo Finance batch request
    try {
        const quotes = await yahooFinance.quote(tickers);
        const quoteArray = Array.isArray(quotes) ? quotes : [quotes];

        const results: StockData[] = quoteArray
            .filter(quote => quote && quote.symbol)
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

        if (results.length > 0) {
            logger.info(`✅ Yahoo Finance returned ${results.length}/${tickers.length} stocks`);
            return results;
        }
    } catch (error) {
        logger.warn('⚠️ Yahoo Finance batch failed, trying sequential with fallback...');
    }

    // Fallback: Sequential fetch with Alpha Vantage backup
    const results: StockData[] = [];
    for (let i = 0; i < tickers.length; i++) {
        const ticker = tickers[i];
        logger.info(`[${i + 1}/${tickers.length}] Fetching ${ticker}...`);

        const result = await fetchStockDataWithFallback(ticker);
        if (result) {
            results.push(result);
        }

        // Rate limit delay
        if (i < tickers.length - 1) {
            await sleep(1500);
        }
    }

    logger.info(`📊 Final result: ${results.length}/${tickers.length} stocks fetched`);
    return results;
}
