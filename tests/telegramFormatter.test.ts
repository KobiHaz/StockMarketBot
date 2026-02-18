/**
 * Telegram Formatter Tests
 */

// Mock config before importing telegramBot
jest.mock('../src/config/index.js', () => ({
    config: {
        telegramBotToken: 'mock-token',
        telegramChatId: 'mock-chat-id',
    },
}));

import { formatDailyReport } from '../src/services/telegramBot';
import { RVOLResult, StockData } from '../src/types';

describe('Telegram Formatter', () => {
    const mockSignals: RVOLResult[] = [
        {
            ticker: 'NVDA',
            lastPrice: 850.0,
            priceChange: 6.25,
            currentVolume: 80000000,
            avgVolume: 16000000,
            rvol: 5.0,
            news: [
                {
                    headline: 'NVIDIA Reports Record Q4 Revenue',
                    url: 'https://example.com/news1',
                    source: 'Reuters',
                    publishedAt: new Date(),
                },
            ],
            isVolumeWithoutPrice: false,
        },
        {
            ticker: 'AMD',
            lastPrice: 145.0,
            priceChange: -3.33,
            currentVolume: 60000000,
            avgVolume: 20000000,
            rvol: 3.0,
            news: [],
            isVolumeWithoutPrice: false,
        },
    ];

    const mockVolumeWithoutPrice: StockData[] = [
        {
            ticker: 'MSFT',
            lastPrice: 405.0,
            priceChange: 0.25,
            currentVolume: 50000000,
            avgVolume: 23000000,
            rvol: 2.17,
        },
    ];

    describe('formatDailyReport', () => {
        it('should format report with signals correctly', () => {
            const report = formatDailyReport('2026-02-01', mockSignals, mockVolumeWithoutPrice);

            expect(report).toContain('SMART VOLUME RADAR');
            expect(report).toContain('2026-02-01');
            expect(report).toContain('Sentiment:');
            expect(report).toContain('NVDA');
            expect(report).toContain('5.00');
            expect(report).toContain('🟢'); // Bullish NVDA
            expect(report).toContain('🔴'); // Bearish AMD
            expect(report).toContain('SILENT ACTIVITY WATCHLIST');
            expect(report).toContain('MSFT');
        });

        it('should include news when available', () => {
            const report = formatDailyReport('2026-02-01', mockSignals, []);

            expect(report).toContain('📑');
            expect(report).toContain('NVIDIA Reports Record Q4 Revenue');
        });

        it('should handle empty signals', () => {
            const report = formatDailyReport('2026-02-01', [], []);

            expect(report).toContain('No high-volume signals detected today');
            expect(report).not.toContain('Sentiment:');
        });

        it('should handle empty volume without price', () => {
            const report = formatDailyReport('2026-02-01', mockSignals, []);

            expect(report).not.toContain('SILENT ACTIVITY WATCHLIST');
        });

        it('should use correct emoji for price direction', () => {
            const report = formatDailyReport('2026-02-01', mockSignals, []);

            // NVDA is up (6.25%) - has high RVOL so gets ⚡️ emoji
            expect(report).toContain('NVDA');
            expect(report).toContain('🟢 +6.25%');
            // AMD is down (-3.33%)
            expect(report).toContain('AMD');
            expect(report).toContain('🔴 -3.33%');
        });
    });
});
