/**
 * Smart Volume Radar - Telegram Bot Service
 * Sends formatted reports via Telegram Bot API
 */

import { RVOLResult, StockData } from '../types/index.js';
import { config } from '../config/index.js';
import logger from '../utils/logger.js';

const TELEGRAM_MAX_LENGTH = 4096;

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

            message += `${statusEmoji} <b><a href="${tvUrl}">${stock.ticker}</a></b>\n`;
            message += `├ RVOL: <b>${stock.rvol.toFixed(2)}x</b>\n`;
            message += `├ Price: ${trendColor} <b>${sign}${stock.priceChange.toFixed(2)}%</b>\n`;

            // Technicals
            if (stock.rsi) {
                const rsiVal = stock.rsi.toFixed(0);
                const rsiContext = stock.rsi > 70 ? ' ⚠️' : (stock.rsi < 30 ? ' ✅' : '');
                message += `├ RSI: <code>${rsiVal}</code>${rsiContext}\n`;
            }

            if (stock.sma50) {
                const smaContext = stock.lastPrice > stock.sma50 ? '📈' : '📉';
                message += `├ Trend: ${smaContext} (vs SMA50)\n`;
            }

            const newsLabel = isIsraeli ? 'BIZ' : 'X';
            message += `├ ⛓ <b>Links:</b> <a href="${tvUrl}">TV</a> | <a href="${yahooUrl}">YF</a> | <a href="${newsUrl}">${newsLabel}</a>\n`;

            if (stock.news && stock.news.length > 0) {
                message += `└ 📑 <b>News:</b>\n`;
                for (const news of stock.news.slice(0, 2)) {
                    const source = news.source ? `[${news.source}] ` : '';
                    message += `  • <a href="${news.url}">${source}${truncate(news.headline, 50)}</a>\n`;
                }
            } else {
                const manualNews = isIsraeli ? `└ 🔍 <a href="${newsUrl}">בזפורטל: חדשות אחרונות</a>\n` : `└ <i>No recent news found</i>\n`;
                message += manualNews;
            }
            message += `\n`;
        }
    }

    // Volume without Price section (Actionable Watchlist)
    if (volumeWithoutPrice.length > 0) {
        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `👀 <b>SILENT ACTIVITY WATCHLIST</b>\n`;
        message += `<i>(High RVOL, low price change - potential breakouts)</i>\n`;

        const items = volumeWithoutPrice
            .sort((a, b) => b.rvol - a.rvol)
            .slice(0, 5)
            .map((s) => `• <b>${s.ticker}</b> (${s.rvol.toFixed(1)}x)`)
            .join('\n');

        message += items;
    }

    return message;
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
