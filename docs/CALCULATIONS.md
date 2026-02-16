# Calculation Reference – Exact Formulas

Aligned with standard technical analysis practices. Every calculated parameter, step-by-step, for verification.

---

## Input Data (Yahoo Chart API)

- **Source:** `https://query1.finance.yahoo.com/v8/finance/chart/{ticker}?interval=1d&range=5y`
- **Arrays:** `volumes[]`, `closes[]` – chronological order, newest last
- **Index 0** = oldest (~5 years ago), **Index N-1** = most recent (today/latest)

---

## 1. RVOL (Relative Volume)

```
currentVolume = volumes[volumes.length - 1]
historicalVolumes = volumes.slice(0, -1)
lookbackVolumes = historicalVolumes.slice(-63)
avgVolume = sum(lookbackVolumes) / lookbackVolumes.length
RVOL = currentVolume / avgVolume
```

**Notes:**
- **63-day SMA** baseline (~3-month lookback) – industry standard for RVOL
- Using 5 years of history would distort data for stocks that changed liquidity tiers
- Today is excluded from the average
- If fewer than 63 historical days exist, uses all available
- Units: multiple (e.g. 2.5x = 2.5× average volume)

---

## 2. Price Change (%)

```
currentClose = closes[closes.length - 1]
previousClose = closes[closes.length - 2]
priceChange = ((currentClose - previousClose) / previousClose) * 100
```

**Notes:**
- One-day percent change

---

## 3. SMA (Simple Moving Average)

```
SMA(prices, periods) =
  if length(prices) < periods: undefined
  else: sum(prices[length-periods : length]) / periods
```

**Used for:** SMA21, SMA50, SMA200 (periods = 21, 50, 200)

**Example (SMA21):**
```
SMA21 = (close[-21] + close[-20] + ... + close[-1]) / 21
```

---

## 4. RSI (Relative Strength Index), 14-period – Wilder's Smoothing

```
RSI(prices, 14):

  // First 14 periods: simple average
  sumGain = 0, sumLoss = 0
  for i = 1 to 14:
    diff = prices[i] - prices[i-1]
    sumGain += (diff >= 0 ? diff : 0)
    sumLoss += (diff < 0 ? -diff : 0)
  
  avgGain = sumGain / 14
  avgLoss = sumLoss / 14

  // Subsequent periods: Wilder's smoothing
  // Formula: ((PreviousAvg * 13) + Current) / 14
  for i = 15 to length-1:
    diff = prices[i] - prices[i-1]
    gain = (diff >= 0 ? diff : 0)
    loss = (diff < 0 ? -diff : 0)
    avgGain = (avgGain * 13 + gain) / 14
    avgLoss = (avgLoss * 13 + loss) / 14

  if avgLoss == 0: return 100
  RS = avgGain / avgLoss
  return 100 - (100 / (1 + RS))
```

**Notes:**
- Wilder's smoothing (exponential-style) – matches TradingView and standard platforms
- Simple average (Cutler) was replaced; it was too volatile
- Output range: 0–100

---

## 5. PeriodHigh_5Y (Period High, 5-Year)

```
PeriodHigh_5Y = max(closes)
```

**Notes:**
- **Not true All-Time High** – input is limited to 5 years
- For stocks with higher peaks >5 years ago, this understates the high
- Variable name in code: `ath` (legacy); meaning: PeriodHigh_5Y
- Twelve Data fallback: uses 52-week high from quote instead

---

## 6. pctFromAth (Distance from Period High, %)

```
pctFromAth = ((lastClose - PeriodHigh_5Y) / PeriodHigh_5Y) * 100
```

**Notes:**
- `lastClose` = most recent close
- Negative when below the period high

---

## 7. monthsInConsolidation

```
periodHighThreshold = PeriodHigh_5Y * 0.98
periodHighIndex = last index i (from end) where closes[i] >= periodHighThreshold
tradingDaysSinceHigh = (closes.length - 1) - periodHighIndex
monthsInConsolidation = tradingDaysSinceHigh / 21
```

**Notes:**
- `21` = trading days per month
- `periodHighIndex` = most recent bar within 2% of PeriodHigh_5Y
- If no such bar exists, `periodHighIndex = -1` → `tradingDaysSinceHigh = closes.length - 1`

---

## 8. nearAth

```
absPct = |pctFromAth|
nearAth = (absPct <= athThresholdPct)
```

**Config:** `ATH_THRESHOLD_PCT` (default 20)

---

## 9. nearAthClose

```
nearAthClose = (absPct > athThresholdPct) AND (absPct <= athCloseThresholdPct)
```

**Config:** `ATH_THRESHOLD_PCT` = 20, `ATH_CLOSE_THRESHOLD_PCT` = 25  
→ "close" if 20% < distance ≤ 25%

---

## 10. inConsolidationWindow

```
inConsolidationWindow =
  (monthsInConsolidation >= consolidationMinMonths) AND
  (monthsInConsolidation <= consolidationMaxMonths)
```

**Config:** `CONSOLIDATION_MIN_MONTHS` = 6, `CONSOLIDATION_MAX_MONTHS` = 36  
→ true for 6–36 months

---

## 11. inConsolidationClose

```
inConsolidationClose =
  NOT inConsolidationWindow AND
  (monthsInConsolidation >= consolidationCloseMinMonths) AND
  (monthsInConsolidation < consolidationMinMonths)
```

**Config:** `CONSOLIDATION_CLOSE_MIN_MONTHS` = 4, `CONSOLIDATION_MIN_MONTHS` = 6  
→ "close" if 4 ≤ months < 6

---

## 12. nearSMA21

```
pctDiff = |lastPrice - sma21| / sma21 * 100
nearSMA21 = (pctDiff <= sma21TouchThresholdPct)
```

**Config:** `SMA21_TOUCH_THRESHOLD_PCT` = 3

---

## 13. nearSMA21Close

```
nearSMA21Close = (NOT nearSMA21) AND (pctDiff <= sma21CloseThresholdPct)
```

**Config:** `SMA21_CLOSE_THRESHOLD_PCT` = 5  
→ "close" if 3% < distance ≤ 5%

---

## Twelve Data Fallback (when Yahoo fails)

| Parameter          | Source / Formula                                          |
|--------------------|-----------------------------------------------------------|
| volume             | `data.volume` from quote                                  |
| avgVolume          | `data.average_volume` from quote (Twelve Data's average)  |
| RVOL               | `volume / avgVolume`                                      |
| priceChange        | `data.percent_change` from quote                          |
| lastPrice          | `data.close` from quote                                   |
| ath (52w high)     | `data.fifty_two_week.high`                                |
| pctFromAth         | `((lastPrice - ath) / ath) * 100`                         |
| RSI, SMA21         | Twelve Data API                                           |
| monthsInConsolidation | Not available                                         |
| inConsolidationWindow | Not set                                               |

---

## Config Defaults Summary

| Variable                       | Default | Used in               |
|--------------------------------|---------|------------------------|
| VOLUME_RVOL_LOOKBACK (code)    | 63      | RVOL avgVolume         |
| ATH_THRESHOLD_PCT              | 20      | nearAth                |
| ATH_CLOSE_THRESHOLD_PCT        | 25      | nearAthClose           |
| SMA21_TOUCH_THRESHOLD_PCT      | 3       | nearSMA21              |
| SMA21_CLOSE_THRESHOLD_PCT      | 5       | nearSMA21Close         |
| CONSOLIDATION_MIN_MONTHS       | 6       | inConsolidationWindow  |
| CONSOLIDATION_MAX_MONTHS       | 36      | inConsolidationWindow  |
| CONSOLIDATION_CLOSE_MIN_MONTHS | 4       | inConsolidationClose   |
| TRADING_DAYS_PER_MONTH (code)  | 21      | monthsInConsolidation  |
| Period high "touch" (code)     | 0.98    | monthsInConsolidation (2%) |
