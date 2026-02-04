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
 * Tickers JSON structure
 */
interface TickerConfig {
    symbol: string;
    sector: string;
    description?: string;
}

interface TickersFile {
    tickers: TickerConfig[];
    lastUpdated: string;
}

// Internal cache for ticker data
let tickerCache: TickerConfig[] | null = null;

function getTickers(): TickerConfig[] {
    if (tickerCache) return tickerCache;

    const tickersPath = path.join(__dirname, 'tickers.json');
    if (!fs.existsSync(tickersPath)) {
        throw new Error(`Tickers config not found at ${tickersPath}`);
    }

    const rawData = fs.readFileSync(tickersPath, 'utf-8');
    const data: TickersFile = JSON.parse(rawData);
    tickerCache = data.tickers;
    return tickerCache;
}

/**
 * Load tickers for scanning
 * @returns Array of ticker symbols
 */
export function loadWatchlist(): string[] {
    const tickers = getTickers();
    return tickers.map(t => t.symbol.toUpperCase());
}

/**
 * Get sector for a ticker
 */
export function getSectorForTicker(symbol: string): string {
    const tickers = getTickers();
    const ticker = tickers.find(t => t.symbol.toUpperCase() === symbol.toUpperCase());
    return ticker?.sector || 'Other';
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
