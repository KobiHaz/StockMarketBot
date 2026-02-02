/**
 * RVOL Calculator Tests
 */

import { calculateRVOL, formatRVOL, formatPriceChange, isBullish } from '../src/services/rvolCalculator';
import { StockData } from '../src/types';

describe('RVOL Calculator', () => {
    const mockStocks: StockData[] = [
        {
            ticker: 'AAPL',
            currentPrice: 180.5,
            previousClose: 171.5,
            priceChangePercent: 5.25,
            todayVolume: 100000000,
            avgVolume20D: 28571428,
            rvol: 3.5,
        },
        {
            ticker: 'MSFT',
            currentPrice: 405.2,
            previousClose: 404.0,
            priceChangePercent: 0.3,
            todayVolume: 50000000,
            avgVolume20D: 23809523,
            rvol: 2.1,
        },
        {
            ticker: 'GOOGL',
            currentPrice: 145.0,
            previousClose: 148.1,
            priceChangePercent: -2.1,
            todayVolume: 30000000,
            avgVolume20D: 20000000,
            rvol: 1.5,
        },
        {
            ticker: 'NVDA',
            currentPrice: 850.0,
            previousClose: 800.0,
            priceChangePercent: 6.25,
            todayVolume: 80000000,
            avgVolume20D: 16000000,
            rvol: 5.0,
        },
    ];

    describe('calculateRVOL', () => {
        it('should filter stocks with RVOL >= minRVOL', () => {
            const result = calculateRVOL(mockStocks, {
                minRVOL: 2.0,
                topN: 15,
                priceChangeThreshold: 2,
            });

            expect(result.topSignals).toHaveLength(3);
            expect(result.topSignals.map(s => s.ticker)).toContain('AAPL');
            expect(result.topSignals.map(s => s.ticker)).toContain('MSFT');
            expect(result.topSignals.map(s => s.ticker)).toContain('NVDA');
            expect(result.topSignals.map(s => s.ticker)).not.toContain('GOOGL');
        });

        it('should sort by RVOL descending', () => {
            const result = calculateRVOL(mockStocks, {
                minRVOL: 2.0,
                topN: 15,
                priceChangeThreshold: 2,
            });

            expect(result.topSignals[0].ticker).toBe('NVDA'); // 5.0x
            expect(result.topSignals[1].ticker).toBe('AAPL'); // 3.5x
            expect(result.topSignals[2].ticker).toBe('MSFT'); // 2.1x
        });

        it('should respect topN limit', () => {
            const result = calculateRVOL(mockStocks, {
                minRVOL: 2.0,
                topN: 2,
                priceChangeThreshold: 2,
            });

            expect(result.topSignals).toHaveLength(2);
        });

        it('should identify volume without price stocks', () => {
            const result = calculateRVOL(mockStocks, {
                minRVOL: 2.0,
                topN: 15,
                priceChangeThreshold: 2,
            });

            expect(result.volumeWithoutPrice).toHaveLength(1);
            expect(result.volumeWithoutPrice[0].ticker).toBe('MSFT'); // 0.3% change
        });

        it('should return empty arrays when no stocks meet threshold', () => {
            const result = calculateRVOL(mockStocks, {
                minRVOL: 10.0,
                topN: 15,
                priceChangeThreshold: 2,
            });

            expect(result.topSignals).toHaveLength(0);
            expect(result.volumeWithoutPrice).toHaveLength(0);
        });
    });

    describe('formatRVOL', () => {
        it('should format RVOL with 2 decimal places and x suffix', () => {
            expect(formatRVOL(3.5)).toBe('3.50x');
            expect(formatRVOL(2.0)).toBe('2.00x');
            expect(formatRVOL(10.123)).toBe('10.12x');
        });
    });

    describe('formatPriceChange', () => {
        it('should format positive changes with + sign', () => {
            expect(formatPriceChange(5.25)).toBe('+5.25%');
        });

        it('should format negative changes with - sign', () => {
            expect(formatPriceChange(-2.1)).toBe('-2.10%');
        });

        it('should format zero as positive', () => {
            expect(formatPriceChange(0)).toBe('+0.00%');
        });
    });

    describe('isBullish', () => {
        it('should return true for positive price change', () => {
            expect(isBullish(mockStocks[0])).toBe(true); // AAPL +5.25%
        });

        it('should return false for negative price change', () => {
            expect(isBullish(mockStocks[2])).toBe(false); // GOOGL -2.1%
        });

        it('should return true for zero change', () => {
            const flatStock = { ...mockStocks[0], priceChangePercent: 0 };
            expect(isBullish(flatStock)).toBe(true);
        });
    });
});
