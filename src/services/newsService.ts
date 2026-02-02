/**
 * Smart Volume Radar - News Service
 * Fetches financial news from Finnhub API
 */

import { NewsItem, FinnhubNewsResponse } from '../types/index.js';
import { config } from '../config/index.js';
import { sleep } from '../utils/errorHandler.js';
import logger from '../utils/logger.js';

/**
 * Format date for Finnhub API (YYYY-MM-DD)
 */
function formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
}

/**
 * Fetch news articles for a single stock
 * @param ticker - Stock ticker symbol
 * @returns Array of news items (max 3)
 */
export async function fetchNewsForStock(ticker: string): Promise<NewsItem[]> {
    const { finnhubApiKey } = config;

    if (!finnhubApiKey) {
        logger.warn(`Skipping news fetch for ${ticker}: No Finnhub API key`);
        return [];
    }

    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    const url = `https://finnhub.io/api/v1/company-news?symbol=${ticker}&from=${formatDate(yesterday)}&to=${formatDate(now)}&token=${finnhubApiKey}`;

    try {
        const response = await fetch(url);

        if (!response.ok) {
            // Rate limit or other API error
            if (response.status === 429) {
                logger.warn(`Rate limited on Finnhub for ${ticker}, skipping news`);
            } else {
                logger.warn(`Finnhub API error for ${ticker}: ${response.status}`);
            }
            return [];
        }

        const data = (await response.json()) as FinnhubNewsResponse[];

        // Take top 3 most recent articles
        return data.slice(0, 3).map((item) => ({
            headline: item.headline,
            url: item.url,
            source: item.source,
            publishedAt: new Date(item.datetime * 1000),
        }));
    } catch (error) {
        logger.error(`Failed to fetch news for ${ticker}`, error);
        return [];
    }
}

/**
 * Enrich stocks with news data
 * @param stocks - Array of stock data to enrich
 * @returns Stocks with news attached
 */
export async function enrichWithNews<T extends { ticker: string }>(
    stocks: T[]
): Promise<(T & { news: NewsItem[]; isVolumeWithoutPrice: boolean })[]> {
    const results: (T & { news: NewsItem[]; isVolumeWithoutPrice: boolean })[] = [];
    const { newsDelayMs } = config;

    logger.info(`Enriching ${stocks.length} stocks with news...`);

    for (let i = 0; i < stocks.length; i++) {
        const stock = stocks[i];
        const news = await fetchNewsForStock(stock.ticker);

        results.push({
            ...stock,
            news,
            // This will be overwritten by caller if needed
            isVolumeWithoutPrice: false,
        });

        // Rate limit: respect Finnhub's 60 calls/min limit
        if (i < stocks.length - 1) {
            await sleep(newsDelayMs);
        }
    }

    const totalNews = results.reduce((sum, s) => sum + s.news.length, 0);
    logger.info(`Fetched ${totalNews} news articles total`);

    return results;
}
