/**
 * Telegram Formatter Tests
 */

import { formatDailyReport } from '../src/services/telegramBot';
import { RVOLResult, StockData } from '../src/types';

describe('Telegram Formatter', () => {
    const mockSignals: RVOLResult[] = [
        {
            ticker: 'NVDA',
            currentPrice: 850.0,
            previousClose: 800.0,
            priceChangePercent: 6.25,
            todayVolume: 80000000,
            avgVolume20D: 16000000,
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
            currentPrice: 145.0,
            previousClose: 150.0,
            priceChangePercent: -3.33,
            todayVolume: 60000000,
            avgVolume20D: 20000000,
            rvol: 3.0,
            news: [],
            isVolumeWithoutPrice: false,
        },
    ];

    const mockVolumeWithoutPrice: StockData[] = [
        {
            ticker: 'MSFT',
            currentPrice: 405.0,
            previousClose: 404.0,
            priceChangePercent: 0.25,
            todayVolume: 50000000,
            avgVolume20D: 23000000,
            rvol: 2.17,
        },
    ];

    describe('formatDailyReport', () => {
        it('should format report with signals correctly', () => {
            const report = formatDailyReport('2026-02-01', mockSignals, mockVolumeWithoutPrice);

            expect(report).toContain('Smart Volume Radar');
            expect(report).toContain('2026-02-01');
            expect(report).toContain('2 Signals Found');
            expect(report).toContain('NVDA');
            expect(report).toContain('5.00x');
            expect(report).toContain('🟢'); // Bullish NVDA
            expect(report).toContain('🔴'); // Bearish AMD
            expect(report).toContain('Volume w/o Price');
            expect(report).toContain('MSFT');
        });

        it('should include news when available', () => {
            const report = formatDailyReport('2026-02-01', mockSignals, []);

            expect(report).toContain('📰 News:');
            expect(report).toContain('NVIDIA Reports Record Q4 Revenue');
        });

        it('should handle empty signals', () => {
            const report = formatDailyReport('2026-02-01', [], []);

            expect(report).toContain('No signals found today');
            expect(report).not.toContain('Signals Found');
        });

        it('should handle empty volume without price', () => {
            const report = formatDailyReport('2026-02-01', mockSignals, []);

            expect(report).not.toContain('Volume w/o Price');
        });

        it('should use correct emoji for price direction', () => {
            const report = formatDailyReport('2026-02-01', mockSignals, []);

            // NVDA is up (6.25%)
            expect(report).toMatch(/🟢.*NVDA/);
            // AMD is down (-3.33%)
            expect(report).toMatch(/🔴.*AMD/);
        });
    });
});
