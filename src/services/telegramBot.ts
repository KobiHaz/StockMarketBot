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
            const error = await response.json();
            throw new Error(`Telegram API error: ${JSON.stringify(error)}`);
        }

        logger.info('Telegram message sent successfully');
    } catch (error) {
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
 * @param date - Report date (YYYY-MM-DD)
 * @param topSignals - Top RVOL signals with news
 * @param volumeWithoutPrice - Stocks with high volume but low price change
 * @returns HTML formatted message
 */
export function formatDailyReport(
    date: string,
    topSignals: RVOLResult[],
    volumeWithoutPrice: StockData[]
): string {
    // Handle no signals case
    if (topSignals.length === 0) {
        return `📊 <b>Smart Volume Radar</b>\n📅 ${date}\n\n📭 No signals found today.\n\nNo stocks met the RVOL ≥ 2.0 threshold.`;
    }

    let message = `📊 <b>Smart Volume Radar</b>\n`;
    message += `📅 ${date} | ${topSignals.length} Signals Found\n`;
    message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

    for (const stock of topSignals) {
        const emoji = stock.priceChange >= 0 ? '🟢' : '🔴';
        const sign = stock.priceChange >= 0 ? '+' : '';

        message += `${emoji} <b>${stock.ticker}</b> ${sign}${stock.priceChange.toFixed(2)}%\n`;
        message += `📈 RVOL: <b>${stock.rvol.toFixed(2)}x</b>\n`;

        if (stock.news && stock.news.length > 0) {
            message += `📰 News:\n`;
            for (const news of stock.news) {
                message += `   • <a href="${news.url}">${truncate(news.headline, 60)}</a>\n`;
            }
        }
        message += `\n`;
    }

    // Volume without Price section
    if (volumeWithoutPrice.length > 0) {
        message += `━━━━━━━━━━━━━━━━━━━━━━\n`;
        message += `🔕 <b>Volume w/o Price</b> (Silent Activity)\n`;
        const tickers = volumeWithoutPrice
            .map((s) => `${s.ticker} (${s.rvol.toFixed(1)}x)`)
            .join(', ');
        message += tickers;
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
            const header = `(${i + 1}/${chunks.length})\n`;
            await sendTelegramMessage(header + chunks[i]);
        } else {
            await sendTelegramMessage(chunks[i]);
        }
    }
}
