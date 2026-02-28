import { StockData } from '../types/index.js';

export type SetupStatus = '🎯' | '👀' | '—';

/**
 * Full setup: near SMA21, near ATH, in 6mo-3y window
 */
export function isFullSetup(s: StockData): boolean {
    return !!(s.nearSMA21 && s.nearAth && s.inConsolidationWindow);
}

/**
 * Close setup: flexible - e.g. 4mo base, 17% from ATH - worth watching
 */
export function isCloseSetup(s: StockData): boolean {
    // Note: This returns true if the stock meets the "Close" criteria.
    // In many contexts, we check isFullSetup first.
    const smaOk = s.nearSMA21 || s.nearSMA21Close;
    const athOk = s.nearAth || s.nearAthClose;
    const baseOk = s.inConsolidationWindow || s.inConsolidationClose;
    return !!(smaOk && athOk && baseOk);
}

/**
 * Get setup status as an emoji string
 */
export function getSetupStatus(s: StockData): SetupStatus {
    if (isFullSetup(s)) return '🎯';
    if (isCloseSetup(s)) return '👀';
    return '—';
}
