/**
 * Smart Volume Radar - Telegram Bot Service
 * Sends formatted reports via Telegram Bot API
 */

import { RVOLResult, StockData } from '../types/index.js';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

const TELEGRAM_MAX_LENGTH = 4096;

/**
 * Format setup indicator with clear status: met ✓, close ~, or far ✗
 * Shows actual value and how close/far from threshold when relevant
 */
function formatSetupIndicator(
    stock: StockData,
    athThreshold: number,
    athCloseThreshold: number,
    smaTouch: number,
    smaClose: number,
    baseMin: number,
    baseMax: number,
    baseCloseMin: number
): string[] {
    const lines: string[] = [];

    // SMA21
    if (stock.sma21 != null && stock.sma21 > 0) {
        const pctFromSMA = Math.abs(stock.lastPrice - stock.sma21) / stock.sma21 * 100;
        const met = pctFromSMA <= smaTouch;
        const close = !met && pctFromSMA <= smaClose;
        let detail = `${pctFromSMA.toFixed(1)}%`;
        if (met) detail += ` ✓ (req ≤${smaTouch}%)`;
        else if (close) detail += ` ~ (${(pctFromSMA - smaTouch).toFixed(1)}% over ${smaTouch}%, under ${smaClose}% close)`;
        else detail += ` ✗ (${(pctFromSMA - smaTouch).toFixed(1)}% over ${smaTouch}% threshold)`;
        lines.push(`<b>SMA21</b> ${detail}`);
    }

    // ATH / High
    if (stock.pctFromAth != null) {
        const absPct = Math.abs(stock.pctFromAth);
        const highLabel = stock.athSource === '52w' ? '52w' : '5y';
        const met = absPct <= athThreshold;
        const close = absPct > athThreshold && absPct <= athCloseThreshold;
        let detail = `${stock.pctFromAth.toFixed(0)}% from ${highLabel}`;
        if (met) detail += ` ✓ (req ≤${athThreshold}%)`;
        else if (close) detail += ` ~ (${(absPct - athThreshold).toFixed(0)}% over ${athThreshold}%, under ${athCloseThreshold}% close)`;
        else detail += ` ✗ (${(absPct - athThreshold).toFixed(0)}% over ${athThreshold}% threshold)`;
        lines.push(`<b>High</b> ${detail}`);
    }

    // Base (months in consolidation)
    if (stock.monthsInConsolidation != null) {
        const mo = stock.monthsInConsolidation;
        const moRounded = Math.round(mo);
        const met = mo >= baseMin && mo <= baseMax;
        const close = mo >= baseCloseMin && mo < baseMin;
        let detail = `${moRounded}mo base`;
        if (met) detail += ` ✓ (req ${baseMin}–${baseMax}mo)`;
        else if (close) detail += ` ~ (${(baseMin - mo).toFixed(1)}mo short of ${baseMin}mo, above ${baseCloseMin}mo)`;
        else if (mo < baseCloseMin) detail += ` ✗ (${(baseCloseMin - mo).toFixed(1)}mo short of ${baseCloseMin}mo threshold)`;
        else detail += ` ✗ (${(mo - baseMax).toFixed(1)}mo over ${baseMax}mo)`;
        lines.push(`<b>Base</b> ${detail}`);
    }

    return lines;
}

/**
 * Truncate string to max length with ellipsis
 */
function truncate(str: string, maxLen: number): string {
    return str.length > maxLen ? str.slice(0, maxLen - 3) + '...' : str;
}

/**
 * Send a message via Telegram Bot API
 * @param message - HTML formatted message
 */
export async function sendTelegramMessage(message: string): Promise<void> {
    const { telegramBotToken, telegramChatId } = config;

    if (!telegramBotToken || !telegramChatId) {
        logger.warn('Telegram credentials not configured, skipping send');
        console.log('\n--- TELEGRAM MESSAGE PREVIEW ---\n');
        console.log(message.replace(/<[^>]*>/g, '')); // Strip HTML for console
        console.log('\n--- END PREVIEW ---\n');
        return;
    }

    const url = `https://api.telegram.org/bot${telegramBotToken}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: telegramChatId,
                text: message,
                parse_mode: 'HTML',
                disable_web_page_preview: true,
            }),
        });

        if (!response.ok) {
            const error = (await response.json()) as any;
            let errorMessage = `Telegram API error: ${JSON.stringify(error)}`;

            if (error.description === 'Bad Request: chat not found') {
                errorMessage += '\n💡 TIP: Ensure your TELEGRAM_CHAT_ID is correct and the bot has been started by the user or added to the group.';
            }

            throw new Error(errorMessage);
        }

        logger.info('Telegram message sent successfully');
    } catch (error: any) {
        logger.error('Failed to send Telegram message', error);
        throw error;
    }
}

/**
 * Split message into chunks that fit Telegram's limit
 */
function chunkMessage(message: string, maxLen: number = TELEGRAM_MAX_LENGTH): string[] {
    if (message.length <= maxLen) {
        return [message];
    }

    const chunks: string[] = [];
    const lines = message.split('\n');
    let currentChunk = '';

    for (const line of lines) {
        if (currentChunk.length + line.length + 1 > maxLen) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
            }
            currentChunk = line + '\n';
        } else {
            currentChunk += line + '\n';
        }
    }

    if (currentChunk.trim()) {
        chunks.push(currentChunk.trim());
    }

    return chunks;
}

/**
 * Format the daily report message
 */
export function formatDailyReport(
    date: string,
    topSignals: RVOLResult[],
    volumeWithoutPrice: StockData[]
): string {
    if (topSignals.length === 0) {
        return `📊 <b>Smart Volume Radar</b>\n📅 ${date}\n\n📭 No high-volume signals detected today.\n\nEverything within normal range.`;
    }

    // Sort signals by RVOL descending
    const sortedSignals = [...topSignals].sort((a, b) => b.rvol - a.rvol);

    // Stats
    const bullish = topSignals.filter(s => s.priceChange > 0).length;
    const bearish = topSignals.filter(s => s.priceChange < 0).length;

    let message = `🛰 <b>SMART VOLUME RADAR</b>\n`;
    message += `📅 <code>${date}</code>\n`;
    message += `🎭 Sentiment: ${bullish} 🟢 | ${bearish} 🔴\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    // Group by sector
    const sectors: Record<string, RVOLResult[]> = {};
    for (const stock of sortedSignals) {
        const sector = stock.sector || 'Other';
        if (!sectors[sector]) sectors[sector] = [];
        sectors[sector].push(stock);
    }

    for (const [sectorName, stocks] of Object.entries(sectors)) {
        message += `📍 <b>${sectorName.toUpperCase()}</b>\n`;
        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;

        for (const stock of stocks) {
            // Determine tier and emoji
            let statusEmoji = stock.priceChange >= 0 ? '↗️' : '↘️';
            if (stock.rvol > 4) statusEmoji = '⚡️';
            else if (stock.rvol > 2) statusEmoji = '🔥';

            const trendColor = stock.priceChange >= 0 ? '🟢' : '🔴';
            const sign = stock.priceChange >= 0 ? '+' : '';

            // Chart links
            const isIsraeli = stock.ticker.endsWith('.TA');
            const tvTicker = stock.ticker.replace('.TA', '');
            const yahooUrl = `https://finance.yahoo.com/quote/${stock.ticker}`;
            const tvUrl = `https://www.tradingview.com/symbols/${isIsraeli ? 'TASE-' + tvTicker : tvTicker}`;
            const xUrl = `https://x.com/search?q=%24${tvTicker}`;
            const newsUrl = isIsraeli
                ? `https://www.bizportal.co.il/searchresult?q=${tvTicker}`
                : xUrl;

            // Header: ticker + main signal
            message += `${statusEmoji} <b><a href="${tvUrl}">${stock.ticker}</a></b>\n`;

            // Section 1: Core metrics (RVOL + Price)
            message += `├ 📊 <b>RVOL</b> ${stock.rvol.toFixed(2)}x  •  <b>Price</b> ${trendColor} ${sign}${stock.priceChange.toFixed(2)}%\n`;

            // Section 2: Technicals
            const techParts: string[] = [];
            if (stock.rsi != null) {
                const rsiContext = stock.rsi > 70 ? ' ⚠️' : stock.rsi < 30 ? ' ✅' : '';
                techParts.push(`RSI ${stock.rsi.toFixed(0)}${rsiContext}`);
            }
            if (stock.sma50 != null) {
                const trend = stock.lastPrice > stock.sma50 ? 'Above SMA50' : 'Below SMA50';
                techParts.push(trend);
            }
            if (techParts.length > 0) {
                message += `├ 📈 ${techParts.join('  •  ')}\n`;
            }

            // Section 3: Setup (consolidation) – detailed per-indicator status
            const setupLines = formatSetupIndicator(
                stock,
                config.athThresholdPct,
                config.athCloseThresholdPct,
                config.sma21TouchThresholdPct,
                config.sma21CloseThresholdPct,
                config.consolidationMinMonths,
                config.consolidationMaxMonths,
                config.consolidationCloseMinMonths
            );
            if (setupLines.length > 0) {
                const fullSetup = stock.nearSMA21 && stock.nearAth && stock.inConsolidationWindow;
                const closeSetup = (stock.nearSMA21 || stock.nearSMA21Close) && (stock.nearAth || stock.nearAthClose) && (stock.inConsolidationWindow || stock.inConsolidationClose);
                const setupEmoji = fullSetup ? ' 🎯' : closeSetup ? ' 👀' : '';
                message += `├ 🎯 Setup${setupEmoji}\n`;
                for (const line of setupLines) {
                    message += `│   ${line}\n`;
                }
            }

            // Section 4: Links
            const newsLabel = isIsraeli ? 'BIZ' : 'X';
            message += `├ ⛓ <a href="${tvUrl}">TV</a>  <a href="${yahooUrl}">YF</a>  <a href="${newsUrl}">${newsLabel}</a>\n`;

            // Section 5: News
            if (stock.news && stock.news.length > 0) {
                message += `└ 📑\n`;
                for (const news of stock.news.slice(0, 2)) {
                    const source = news.source ? `[${news.source}] ` : '';
                    message += `   • <a href="${news.url}">${source}${truncate(news.headline, 55)}</a>\n`;
                }
            } else {
                message += isIsraeli ? `└ 📑 <a href="${newsUrl}">BizPortal news</a>\n` : `└ <i>No recent news</i>\n`;
            }
            message += `\n`;
        }
    }

    // Volume without Price section (Actionable Watchlist)
    if (volumeWithoutPrice.length > 0) {
        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `👀 <b>SILENT ACTIVITY WATCHLIST</b>\n`;
        message += `<i>(High RVOL, low price change - potential breakouts)</i>\n`;

        const isFullSetup = (s: StockData) => !!(s.nearSMA21 && s.nearAth && s.inConsolidationWindow);
        const isCloseSetup = (s: StockData) => (s.nearSMA21 || s.nearSMA21Close) && (s.nearAth || s.nearAthClose) && (s.inConsolidationWindow || s.inConsolidationClose);
        const items = volumeWithoutPrice
            .sort((a, b) => b.rvol - a.rvol)
            .slice(0, 5)
            .map((s) => `• <b>${s.ticker}</b> (${s.rvol.toFixed(1)}x)${isFullSetup(s) ? ' 🎯' : isCloseSetup(s) ? ' 👀' : ''}`)
            .join('\n');

        message += items;
    }

    return message;
}

/**
 * Format legend explaining each field, source (API vs calculated), and calculation method
 */
export function formatLegend(): string {
    return `📖 <b>Field Guide</b>

<b>From APIs:</b>
• <b>Price, Volume</b> – Yahoo / Twelve Data
• <b>RSI, SMA21</b> – Twelve Data (if API key set), else calculated
• <b>52w high</b> – Twelve Data (fallback only)
• <b>News</b> – Finnhub

<b>Calculated locally:</b>
• <b>RVOL</b> = today's volume ÷ 63-day avg volume
• <b>Price Change %</b> = (close − prev close) ÷ prev close × 100
• <b>SMA50, SMA200</b> = SMA of last 50/200 closes
• <b>5y ATH</b> = max of 5-year history (Yahoo)
• <b>pctFromAth</b> = (price − ATH) ÷ ATH × 100
• <b>monthsInConsolidation</b> = days since ATH touch ÷ 21

<b>Setup symbols:</b>
✓ = met condition | ~ = close | 🎯 = full setup | 👀 = close to setup`;
}

/**
 * Send the daily report, splitting if necessary
 */
export async function sendDailyReport(
    date: string,
    topSignals: RVOLResult[],
    volumeWithoutPrice: StockData[]
): Promise<void> {
    const report = formatDailyReport(date, topSignals, volumeWithoutPrice);
    const chunks = chunkMessage(report);

    logger.info(`Sending ${chunks.length} message(s) to Telegram`);

    for (let i = 0; i < chunks.length; i++) {
        if (chunks.length > 1) {
            const header = `📄 <b>Part ${i + 1}/${chunks.length}</b>\n\n`;
            await sendTelegramMessage(header + chunks[i]);
        } else {
            await sendTelegramMessage(chunks[i]);
        }
    }
}
