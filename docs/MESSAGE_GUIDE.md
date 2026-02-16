# Smart Volume Radar – Complete Message Guide

A reference for everything shown in the daily Telegram report.

---

## 1. Entry Conditions

### Main Signals (Top Section)
A stock appears in the report only if:
- **RVOL ≥ MIN_RVOL** (default: 2.0)
- It’s among the **top TOP_N** stocks by RVOL (default: 15)
- Sorting: by RVOL descending, with consolidation setups ranked higher when RVOL is similar

### Silent Activity Watchlist (Bottom Section)
A stock appears here only if:
- It meets the main signal conditions above, **and**
- **|Price Change| < PRICE_CHANGE_THRESHOLD** (default: 2%)
- Up to 5 stocks are shown

---

## 2. Per-Stock Message Format

Each stock appears in this structure:

```
↗️ TICKER (link to TV)
├ 📊 RVOL X.XXx  •  Price ±X.XX%
├ 📈 RSI XX  •  Above/Below SMA50
├ 🎯 Setup [🎯/👀]
│   SMA21  X.X% ✓ (req ≤3%)   or  X.X% ~ (X.X% over 3%, under 5% close)   or  ✗
│   High   -X% from 5y ✓ (req ≤20%)   or  ~   or  ✗
│   Base   Xmo base ✓ (req 6–36mo)   or  ~   or  ✗
├ ⛓ TV  YF  BIZ/X
└ 📑 News or link
```

Each setup indicator shows:
- **✓** – Met the condition
- **~** – Close (within flexible threshold); shows how far from meeting
- **✗** – Not met; shows how far from the threshold

### Fields

| Field | Meaning | Source |
|-------|---------|--------|
| **RVOL** | Relative Volume = today’s volume ÷ 63-day SMA of volume | Calculated |
| **Price** | Daily % change (vs previous close) | Calculated |
| **RSI** | Relative Strength Index (0–100) | Twelve Data API or calculated |
| **Trend** | Price above or below 50-day SMA | Calculated (SMA50) |
| **Setup** | Consolidation / pre-breakout metrics | See section 3 |

---

## 3. Setup Indicators (Pre-Breakout)

Each indicator shows the actual value plus status:

| Indicator | ✓ Met | ~ Close | ✗ Not Met |
|-----------|-------|---------|-----------|
| **SMA21** | Distance ≤3% from SMA21 | 3–5% from SMA21 (shows how much over 3%) | &gt;5% (shows how far over) |
| **High** | Within 20% of 5y/52w high | 20–25% from high | &gt;25% from high |
| **Base** | 6–36 months in consolidation | 4–6 months (1–2mo short) | &lt;4mo or &gt;36mo |

**Labels:** `5y` = Yahoo 5-year high; `52w` = Twelve Data 52-week high (fallback)

---

## 4. Symbols & Emojis

### Status
| Emoji | Meaning |
|-------|---------|
| ↗️ | Price up today |
| ↘️ | Price down today |
| 🔥 | RVOL > 2x |
| ⚡️ | RVOL > 4x |
| 🟢 | Bullish (positive price change) |
| 🔴 | Bearish (negative price change) |

### Setup Quality
| Emoji | Meaning |
|-------|---------|
| 🎯 | Full consolidation setup (near SMA21 + near ATH + 6mo–3y base) |
| 👀 | Close to full setup (flexible thresholds) |

### Technical
| Emoji | Meaning |
|-------|---------|
| 📈 | Price above SMA50 |
| 📉 | Price below SMA50 |
| ⚠️ | RSI > 70 (overbought) |
| ✅ | RSI < 30 (oversold) |

---

## 5. Config Variables (from .env)

| Variable | Default | Description |
|----------|---------|-------------|
| `MIN_RVOL` | 2.0 | Minimum RVOL to appear in the report |
| `TOP_N` | 15 | Maximum number of stocks in the main signals |
| `PRICE_CHANGE_THRESHOLD` | 2 | Max |price change| % for Silent Activity list |
| `CONSOLIDATION_MIN_MONTHS` | 6 | Minimum months in base for full setup |
| `CONSOLIDATION_MAX_MONTHS` | 36 | Maximum months in base for full setup |
| `CONSOLIDATION_CLOSE_MIN_MONTHS` | 4 | Min months for “close” setup (e.g. 4–6mo) |
| `ATH_THRESHOLD_PCT` | 20 | Within X% of ATH = full setup |
| `ATH_CLOSE_THRESHOLD_PCT` | 25 | 20–25% from ATH = close setup |
| `SMA21_TOUCH_THRESHOLD_PCT` | 3 | Within X% of SMA21 = touching |
| `SMA21_CLOSE_THRESHOLD_PCT` | 5 | 3–5% from SMA21 = close |
| `GOOGLE_SHEET_ID` | — | Watchlist source |
| `TWELVE_DATA_API_KEY` | — | Optional; fetch RSI/SMA instead of calculating |
| `USE_FETCHED_INDICATORS` | true | Set to `false` to always calculate RSI/SMA |

---

## 6. Calculation Details

For exact formulas and verification, see **[CALCULATIONS.md](CALCULATIONS.md)**.

---

## 7. Data Sources

### From APIs
- **Price, Volume** – Yahoo Finance (primary) or Twelve Data (fallback)
- **RSI, SMA21** – Twelve Data (when API key is set), otherwise calculated
- **52w high** – Twelve Data (fallback only)
- **News** – Finnhub

### Calculated Locally
- **RVOL** = today’s volume ÷ 63-day SMA of volume
- **Price Change %** = (close − previous close) ÷ previous close × 100
- **SMA50, SMA200** = simple moving average of last 50/200 closes
- **5y ATH** = max of 5-year price history (Yahoo)
- **pctFromAth** = (price − ATH) ÷ ATH × 100
- **monthsInConsolidation** = trading days since last ATH touch ÷ 21
- **nearSMA21, nearAth, inConsolidationWindow** = comparisons vs thresholds above

---

## 8. Links

| Link | Target |
|------|--------|
| **TV** | TradingView chart |
| **YF** | Yahoo Finance quote |
| **X** | X (Twitter) search for ticker (US stocks) |
| **BIZ** | BizPortal (Israeli stocks) |

---

## 9. Tips

- **🎯** – Stocks that meet all consolidation criteria are ranked higher when RVOL is similar.
- **Silent Activity** – High volume with little price change can mean accumulation or distribution.
- Stocks with `.TA` suffix are Israeli (TASE); news links go to BizPortal.
- Long reports are split into multiple Telegram messages (max 4096 chars per message).
