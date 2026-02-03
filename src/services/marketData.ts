/**
 * Smart Volume Radar - Market Data Service
 * Uses direct HTTP requests to avoid library-specific rate limiting issues
 */

import { StockData } from '../types/index.js';
import { config } from '../config/index.js';
import { sleep } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Direct fetch from Yahoo Finance chart API
 * This endpoint is sometimes less restricted than the quote API
 */
async function fetchFromYahooChart(ticker: string): Promise<StockData | null> {
    try {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?interval=1d&range=1mo`;

        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
                'Accept': 'application/json',
            },
        });

        if (!response.ok) {
            if (response.status === 429) {
                logger.warn(`⚠️ Yahoo Chart API rate limited for ${ticker}`);
            }
            return null;
        }

        const data = await response.json() as any;
        const result = data?.chart?.result?.[0];

        if (!result) {
            logger.warn(`No chart data for ${ticker}`);
            return null;
        }

        const meta = result.meta;
        const indicators = result.indicators?.quote?.[0];

        if (!indicators?.volume || indicators.volume.length === 0) {
            return null;
        }

        // Get volumes (filter out nulls)
        const volumes = indicators.volume.filter((v: number | null) => v !== null && v > 0);
        if (volumes.length < 5) return null;

        // Current volume is the last entry
        const currentVolume = volumes[volumes.length - 1] || 0;

        // Average volume from previous days (exclude today)
        const historicalVolumes = volumes.slice(0, -1);
        const avgVolume = historicalVolumes.reduce((a: number, b: number) => a + b, 0) / historicalVolumes.length;

        if (avgVolume === 0) return null;

        const rvol = currentVolume / avgVolume;
        const priceChange = meta.regularMarketChangePercent || 0;

        return {
            ticker,
            currentVolume,
            avgVolume,
            rvol,
            priceChange,
            lastPrice: meta.regularMarketPrice || 0,
        };
    } catch (error) {
        logger.error(`❌ Chart fetch failed for ${ticker}:`, (error as Error).message);
        return null;
    }
}

/**
 * Fetch from Twelve Data API (reliable free tier)
 */
async function fetchFromTwelveData(ticker: string): Promise<StockData | null> {
    const apiKey = process.env.TWELVE_DATA_API_KEY;
    if (!apiKey) return null;

    try {
        const url = `https://api.twelvedata.com/quote?symbol=${ticker}&apikey=${apiKey}`;
        const response = await fetch(url);
        const data = await response.json() as any;

        if (data.status === 'error' || !data.close) {
            return null;
        }

        return {
            ticker,
            currentVolume: parseFloat(data.volume) || 0,
            avgVolume: parseFloat(data.average_volume) || parseFloat(data.volume) || 1,
            rvol: parseFloat(data.volume) / (parseFloat(data.average_volume) || 1),
            priceChange: parseFloat(data.percent_change) || 0,
            lastPrice: parseFloat(data.close) || 0,
        };
    } catch (error) {
        return null;
    }
}

/**
 * Fetch all stocks with multiple fallback strategies
 */
export async function fetchAllStocks(tickers: string[]): Promise<StockData[]> {
    logger.info(`🚀 Starting fetch for ${tickers.length} tickers...`);

    const results: StockData[] = [];
    let successSource = 'unknown';

    for (let i = 0; i < tickers.length; i++) {
        const ticker = tickers[i];
        logger.info(`[${i + 1}/${tickers.length}] Fetching ${ticker}...`);

        // Try Yahoo Chart API first
        let result = await fetchFromYahooChart(ticker);
        if (result) {
            successSource = 'Yahoo Chart';
            results.push(result);
            logger.info(`✅ ${ticker}: RVOL=${result.rvol.toFixed(2)}x (${successSource})`);
        } else {
            // Try Twelve Data as fallback
            result = await fetchFromTwelveData(ticker);
            if (result) {
                successSource = 'Twelve Data';
                results.push(result);
                logger.info(`✅ ${ticker}: RVOL=${result.rvol.toFixed(2)}x (${successSource})`);
            } else {
                logger.warn(`❌ ${ticker}: No data from any source`);
            }
        }

        // Rate limiting delay between requests
        if (i < tickers.length - 1) {
            await sleep(config.batchDelayMs);
        }
    }

    logger.info(`📊 Final: ${results.length}/${tickers.length} stocks fetched successfully`);
    return results;
}
