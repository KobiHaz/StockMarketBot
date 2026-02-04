/**
 * Smart Volume Radar - Type Definitions
 * Core interfaces for stock data, news, and RVOL results
 */

/**
 * Raw stock data from market API
 */
export interface StockData {
    ticker: string;
    currentVolume: number;
    avgVolume: number;
    rvol: number;
    priceChange: number;
    lastPrice: number;
    sma50?: number;
    sma200?: number;
    rsi?: number;
    sector?: string;
}

/**
 * News article from Finnhub
 */
export interface NewsItem {
    headline: string;
    url: string;
    source: string;
    publishedAt: Date;
}

/**
 * RVOL result with news enrichment
 */
export interface RVOLResult extends StockData {
    news: NewsItem[];
    isVolumeWithoutPrice: boolean;
}

/**
 * Configuration for RVOL calculation
 */
export interface RVOLConfig {
    minRVOL: number;
    topN: number;
    priceChangeThreshold: number;
}

/**
 * Daily scan results
 */
export interface ScanResults {
    date: string;
    totalScanned: number;
    signalsFound: number;
    topSignals: RVOLResult[];
    volumeWithoutPrice: StockData[];
    executionTimeMs: number;
}

/**
 * API response from Finnhub news endpoint
 */
export interface FinnhubNewsResponse {
    category: string;
    datetime: number;
    headline: string;
    id: number;
    image: string;
    related: string;
    source: string;
    summary: string;
    url: string;
}

/**
 * Market status for checking if market is open
 */
export interface MarketStatus {
    isOpen: boolean;
    exchange: string;
    currentTime: Date;
    message?: string;
}
