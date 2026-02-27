/**
 * Smart Volume Radar - Configuration Loader
 * Loads environment variables and watchlist configuration (Google Sheets)
 */

import * as dotenv from 'dotenv';

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

    // Consolidation / pre-breakout indicators (flexible: show full ✓ and close ~)
    consolidationMinMonths: parseInt(process.env.CONSOLIDATION_MIN_MONTHS || '6', 10),
    consolidationMaxMonths: parseInt(process.env.CONSOLIDATION_MAX_MONTHS || '36', 10),
    consolidationCloseMinMonths: parseInt(process.env.CONSOLIDATION_CLOSE_MIN_MONTHS || '4', 10), // 4–6mo = close
    athThresholdPct: parseFloat(process.env.ATH_THRESHOLD_PCT || '20'), // within 20% of ATH
    athCloseThresholdPct: parseFloat(process.env.ATH_CLOSE_THRESHOLD_PCT || '25'), // 20–25% = close
    sma21TouchThresholdPct: parseFloat(process.env.SMA21_TOUCH_THRESHOLD_PCT || '3'), // within 3% = touching
    sma21CloseThresholdPct: parseFloat(process.env.SMA21_CLOSE_THRESHOLD_PCT || '5'), // 3–5% = close

    // Prefer fetching RSI/SMA from Twelve Data instead of calculating (when key is set)
    useFetchedIndicators: process.env.USE_FETCHED_INDICATORS !== 'false',

    // API Keys
    finnhubApiKey: process.env.FINNHUB_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    perplexityApiKey: process.env.PERPLEXITY_API_KEY || '',
    geminiApiKey: process.env.GEMINI_API_KEY || '',

    // LLM summary: on when API key exists for chosen provider (set ENABLE_LLM_SUMMARY=false to disable)
    llmProvider: (process.env.LLM_PROVIDER || 'openai').toLowerCase() as 'openai' | 'perplexity' | 'gemini',
    enableLlmSummary: process.env.ENABLE_LLM_SUMMARY !== 'false',
    /** Min RVOL for LLM analysis – only stocks with RVOL > this get sent (default 2). Set 0 to include all signals. */
    llmMinRvol: parseFloat(process.env.LLM_MIN_RVOL || '2'),
    /** Per-stock LLM: send each signal to LLM separately (parallel). If false, use single batch summary. */
    llmPerStock: process.env.LLM_PER_STOCK !== 'false',

    // Telegram
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN || '',
    telegramChatId: process.env.TELEGRAM_CHAT_ID || '',

    // Watchlist: Google Sheet (public CSV export)
    googleSheetId: process.env.GOOGLE_SHEET_ID || '',

    // Rate limiting
    batchSize: 10,
    batchDelayMs: 500, // 500ms between tickers - Chart API is less restrictive
    newsDelayMs: 500,

    // Retry settings
    maxRetries: 3,
    retryDelayMs: 2000,
} as const;

/**
 * Ticker entry: symbol (required) and optional sector for grouping in reports
 */
export interface TickerConfig {
    symbol: string;
    sector: string;
    description?: string;
}

// Internal cache set by fetchAndCacheWatchlist(); must be called before loadWatchlist()
let tickerCache: TickerConfig[] | null = null;

const GOOGLE_SHEETS_CSV_URL = 'https://docs.google.com/spreadsheets/d/{id}/export?format=csv';

/**
 * Fetch CSV content from a public Google Sheet
 * @param sheetId - ID from sheet URL (between /d/ and /edit)
 * @throws Error if request fails or non-2xx response
 */
export async function fetchWatchlistCsv(sheetId: string): Promise<string> {
    const url = GOOGLE_SHEETS_CSV_URL.replace('{id}', sheetId);
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) {
        throw new Error(
            `Failed to fetch watchlist: ${res.status} ${res.statusText}. Check GOOGLE_SHEET_ID and that the sheet is shared "Anyone with the link can view".`
        );
    }
    return res.text();
}

/**
 * Parse CSV from Google Sheets into TickerConfig[].
 * - First row: treated as header if it looks like "Symbol" / "Sector" (case-insensitive), then skipped
 * - Column A: symbol (required); empty rows skipped
 * - Column B: sector (optional); default "Other" if empty
 */
export function parseWatchlistCsv(csv: string): TickerConfig[] {
    const lines = csv.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length === 0) {
        throw new Error('Watchlist sheet is empty.');
    }

    const rows: string[][] = [];
    for (const line of lines) {
        // Simple CSV: split by comma; strip surrounding quotes from each cell
        const cells = line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''));
        rows.push(cells);
    }

    const isHeaderRow = (cells: string[]): boolean => {
        const first = (cells[0] || '').toLowerCase();
        return first === 'symbol' || first === 'sector' || first.includes('symbol') || first.includes('sector');
    };

    const startIndex = rows.length > 0 && isHeaderRow(rows[0]) ? 1 : 0;
    const tickers: TickerConfig[] = [];

    for (let i = startIndex; i < rows.length; i++) {
        const cells = rows[i];
        const symbol = (cells[0] || '').trim();
        if (!symbol) continue;
        const sector = (cells[1] || '').trim() || 'Other';
        tickers.push({ symbol, sector });
    }

    if (tickers.length === 0) {
        throw new Error('Watchlist sheet has no valid ticker rows (Column A = symbol).');
    }

    return tickers;
}

/**
 * Fetch watchlist from Google Sheet and cache it. Must be called once before loadWatchlist() / getSectorForTicker().
 * @throws Error if GOOGLE_SHEET_ID is missing, fetch fails, or sheet is empty
 */
export async function fetchAndCacheWatchlist(): Promise<void> {
    const sheetId = config.googleSheetId.trim();
    if (!sheetId) {
        throw new Error('GOOGLE_SHEET_ID is required. Set it to your Google Sheet ID (from the sheet URL).');
    }
    const csv = await fetchWatchlistCsv(sheetId);
    tickerCache = parseWatchlistCsv(csv);
}

function getTickers(): TickerConfig[] {
    if (tickerCache === null) {
        throw new Error(
            'Watchlist not loaded. Call fetchAndCacheWatchlist() once before loadWatchlist() or getSectorForTicker().'
        );
    }
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
    if (!config.googleSheetId?.trim()) missing.push('GOOGLE_SHEET_ID');

    if (missing.length > 0) {
        throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
    }
}
