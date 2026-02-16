# Indicator Data Sources – Fetch vs Calculate

This document compares APIs that provide pre-calculated technical indicators vs. our current calculation approach.

## Summary

| Indicator | Fetch Available? | Best Source | Notes |
|-----------|------------------|-------------|-------|
| **RVOL** | Partial | Twelve Data Quote | `volume` / `average_volume` from quote endpoint |
| **RSI** | ✅ Yes | Twelve Data, Alpha Vantage, Finnhub | Pre-calculated |
| **SMA21** | ✅ Yes | Twelve Data, Alpha Vantage, Finnhub | Pre-calculated |
| **ATH** | Partial | Twelve Data Quote (52w high) | True ATH: calculate from history; 52w high is a common proxy |

---

## 1. Twelve Data (already in project)

**API key:** `TWELVE_DATA_API_KEY`

| Indicator | Endpoint | Example |
|-----------|----------|---------|
| RSI | `GET /rsi` | `?symbol=AAPL&interval=1day&time_period=14` |
| SMA21 | `GET /sma` | `?symbol=AAPL&interval=1day&time_period=21&series_type=close` |
| RVOL | From `GET /quote` | `rvol = volume / average_volume` |
| 52w High (ATH proxy) | From `GET /quote` | `fifty_two_week.high` |

**Pros:** Already integrated, free tier, RSI/SMA/RVOL/52w high all available  
**Cons:** Rate limits on free tier; 52w high is not true all-time high  

---

## 2. Alpha Vantage

**API key:** `ALPHAVANTAGE_API_KEY` (free at alphavantage.co)

| Indicator | Endpoint | Example |
|-----------|----------|---------|
| RSI | `GET /query?function=RSI` | `&symbol=AAPL&interval=daily&time_period=14` |
| SMA | `GET /query?function=SMA` | `&symbol=AAPL&interval=daily&time_period=21&series_type=close` |
| RVOL | Calculate from TIME_SERIES_DAILY | volume vs avg volume |
| 52w High | GLOBAL_QUOTE (if available) | Check quote response |

**Pros:** 50+ technical indicators, official provider  
**Cons:** Free tier ~25 requests/day; may need multiple calls per symbol  

---

## 3. Finnhub

**API key:** `FINNHUB_API_KEY` (already used for news)

| Indicator | Endpoint | Notes |
|-----------|----------|-------|
| RSI, SMA | `/indicator` | Technical indicators API |
| Quote | `/quote` | volume, etc. |
| Candles | `/stock/candle` | OHLCV for custom calculations |

**Pros:** Single key for news + indicators  
**Cons:** Need to confirm exact indicator params and rate limits  

---

## 4. RVOL – No Dedicated Endpoint

No mainstream free API exposes “relative volume” as a standalone metric. It is always derived as:

```text
RVOL = current_volume / average_volume
```

So we keep calculating RVOL from raw volume, regardless of data source.

---

## Implementation (Current)

The app now **fetches** RSI and SMA21 from Twelve Data when possible:

| Scenario | RSI | SMA21 | RVOL | ATH/52w |
|----------|-----|-------|------|---------|
| **Yahoo primary** | Fetched from Twelve Data* | Fetched from Twelve Data* | Calculated | Calculated from 5y history |
| **Twelve Data fallback** | Fetched | Fetched | From quote | 52w high from quote |

\* When `USE_FETCHED_INDICATORS` is not `false` and `TWELVE_DATA_API_KEY` is set.

**Config:**
- `USE_FETCHED_INDICATORS` – Set to `false` to always calculate RSI/SMA locally (default: `true`).

**Recommendation:** Keep `TWELVE_DATA_API_KEY` set and `USE_FETCHED_INDICATORS=true` to use Twelve Data for RSI and SMA. Yahoo remains the primary data source; Twelve Data provides pre-calculated indicators.
