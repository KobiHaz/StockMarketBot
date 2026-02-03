/**
 * Smart Volume Radar - Configuration Loader
 * Loads environment variables and watchlist configuration
 */

import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

/**
 * Application configuration with sensible defaults
 */
export const config = {
    // RVOL thresholds
    minRVOL: parseFloat(process.env.MIN_RVOL || '2.0'),
    topN: parseInt(process.env.TOP_N || '15', 10),
    priceChangeThreshold: parseFloat(process.env.PRICE_CHANGE_THRESHOLD || '2'),

    // API Keys
    finnhubApiKey: process.env.FINNHUB_API_KEY || '',

    // Telegram
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',

    // Rate limiting
    batchSize: 10,
    batchDelayMs: 500, // 500ms between tickers - Chart API is less restrictive
    newsDelayMs: 500,

    // Retry settings
    maxRetries: 3,
    retryDelayMs: 2000,
} as const;

/**
 * Watchlist JSON structure
 */
interface WatchlistFile {
    tickers: string[];
    lastUpdated: string;
    description?: string;
}

/**
 * Load tickers from watchlist.json
 * @returns Array of ticker symbols
 */
export function loadWatchlist(): string[] {
    const watchlistPath = path.join(__dirname, 'watchlist.json');

    if (!fs.existsSync(watchlistPath)) {
        throw new Error(`Watchlist not found at ${watchlistPath}`);
    }

    const rawData = fs.readFileSync(watchlistPath, 'utf-8');
    const watchlist: WatchlistFile = JSON.parse(rawData);

    // Validate tickers
    if (!Array.isArray(watchlist.tickers) || watchlist.tickers.length === 0) {
        throw new Error('Watchlist must contain at least one ticker');
    }

    // Normalize tickers (uppercase, trim)
    const tickers = watchlist.tickers
        .map((t) => t.trim().toUpperCase())
        .filter((t) => t.length > 0);

    console.log(`📋 Loaded ${tickers.length} tickers (updated: ${watchlist.lastUpdated})`);
    return tickers;
}

/**
 * Validate required configuration
 * @throws Error if critical config is missing
 */
export function validateConfig(): void {
    const missing: string[] = [];

    if (!config.finnhubApiKey) missing.push('FINNHUB_API_KEY');
    if (!config.telegramBotToken) missing.push('TELEGRAM_BOT_TOKEN');
    if (!config.telegramChatId) missing.push('TELEGRAM_CHAT_ID');

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}
