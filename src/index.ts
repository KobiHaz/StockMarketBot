/**
 * Smart Volume Radar - Main Entry Point
 * Orchestrates the daily stock volume scan and reporting
 */

import { loadWatchlist, validateConfig, config } from './config/index.js';
import { fetchAllStocks } from './services/marketData.js';
import { calculateRVOL } from './services/rvolCalculator.js';
import { enrichWithNews } from './services/newsService.js';
import { sendDailyReport, sendTelegramMessage } from './services/telegramBot.js';
import { RVOLResult, MarketStatus } from './types/index.js';
import logger from './utils/logger.js';
import { formatErrorForTelegram } from './utils/errorHandler.js';

/**
 * Check if US market is open/closed for the day
 * Returns true if we should run the scan (after market close on a weekday)
 */
function checkMarketStatus(): MarketStatus {
    const now = new Date();
    const dayOfWeek = now.getUTCDay(); // 0 = Sunday, 6 = Saturday

    // Skip weekends
    if (dayOfWeek === 0 || dayOfWeek === 6) {
        return {
            isOpen: false,
            exchange: 'NYSE/NASDAQ',
            currentTime: now,
            message: 'Market closed (weekend)',
        };
    }

    // For standard runs, we expect to run after 4 PM EST (21:00 UTC)
    // This is just a warning, not a blocker
    const utcHour = now.getUTCHours();
    if (utcHour < 21) {
        logger.warn('Running before market close (21:00 UTC). Data may be incomplete.');
    }

    return {
        isOpen: true,
        exchange: 'NYSE/NASDAQ',
        currentTime: now,
    };
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
    console.log('\n🚀 Smart Volume Radar starting...\n');
    const startTime = Date.now();

    try {
        // 1. Check market status
        const marketStatus = checkMarketStatus();
        if (!marketStatus.isOpen && marketStatus.message && process.env.FORCE_SCAN !== 'true') {
            logger.info(marketStatus.message);
            await sendTelegramMessage(`📊 Smart Volume Radar\n\n${marketStatus.message}\nNo scan performed.`);
            return;
        } else if (process.env.FORCE_SCAN === 'true') {
            logger.info(`${marketStatus.message} - FORCING scan using last available data.`);
        }

        // 2. Validate configuration
        try {
            validateConfig();
        } catch (error) {
            // Don't fail completely if config is missing, just warn
            logger.warn('Config validation warning: ' + (error as Error).message);
            logger.info('Continuing with available configuration...');
        }

        // 3. Load watchlist
        const tickers = loadWatchlist();
        logger.info(`📋 Loaded ${tickers.length} tickers to scan`);

        // 4. Fetch market data
        logger.info('📊 Fetching market data...');
        const stocks = await fetchAllStocks(tickers);
        logger.info(`✅ Fetched data for ${stocks.length}/${tickers.length} stocks`);

        if (stocks.length === 0) {
            await sendTelegramMessage('❌ Smart Volume Radar: No stock data available. Check API status.');
            return;
        }

        // 5. Calculate RVOL and filter
        logger.info('🔢 Calculating RVOL...');
        const { topSignals, volumeWithoutPrice } = calculateRVOL(stocks, {
            minRVOL: config.minRVOL,
            topN: config.topN,
            priceChangeThreshold: config.priceChangeThreshold,
        });
        logger.info(`🎯 Found ${topSignals.length} signals (RVOL ≥ ${config.minRVOL})`);

        // 6. Enrich with news
        logger.info('📰 Enriching with news...');
        const enrichedSignals = await enrichWithNews(topSignals);

        // Mark volume without price stocks
        const finalSignals: RVOLResult[] = enrichedSignals.map((s) => ({
            ...s,
            isVolumeWithoutPrice: volumeWithoutPrice.some((v) => v.ticker === s.ticker),
        }));

        // 7. Send report
        const today = new Date().toISOString().split('T')[0];
        await sendDailyReport(today, finalSignals, volumeWithoutPrice);

        // 8. Log completion
        const duration = ((Date.now() - startTime) / 1000).toFixed(1);
        logger.info(`\n✅ Report sent successfully in ${duration}s`);
        logger.info(`   Scanned: ${stocks.length} | Signals: ${topSignals.length} | Silent: ${volumeWithoutPrice.length}`);

    } catch (error) {
        const errorMessage = formatErrorForTelegram(error);
        logger.error('❌ Fatal error:', error);

        // Try to notify via Telegram
        try {
            await sendTelegramMessage(`❌ Smart Volume Radar failed:\n\n${errorMessage}`);
        } catch {
            logger.error('Failed to send error notification to Telegram');
        }

        process.exit(1);
    }
}

// Run
main();
