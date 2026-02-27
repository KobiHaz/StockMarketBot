# Smart Volume Radar

🚀 **Automated stock volume monitoring system** that identifies unusual trading activity and delivers daily intelligence reports via Telegram.

## Features

- 📊 **RVOL Analysis**: Calculates Relative Volume (today's volume / 63-day average)
- 🎯 **Signal Detection**: Identifies stocks with RVOL ≥ 2.0 (configurable)
- 🔕 **Silent Accumulation**: Flags high-volume stocks with minimal price movement
- 📈 **Technical Context**: RSI, trend vs SMA50, and pre-breakout setup (SMA21, distance from high, base length)
- 📰 **News Enrichment**: Attaches recent headlines from Finnhub
- 📱 **Telegram Delivery**: Formatted reports with TradingView/Yahoo/BIZ links
- ⏰ **Automated Scheduling**: Runs daily via GitHub Actions
- 📋 **Google Sheet Watchlist**: Manage symbols and sectors in a sheet; no code changes needed

## Quick Start

### 1. Clone and Install

```bash
cd smart-volume-radar
npm install
```

### 2. Configure Environment

Copy `.env.example` to `.env` and fill in your credentials:

```bash
cp .env.example .env
```

Required secrets:
- `FINNHUB_API_KEY` - Get from [finnhub.io](https://finnhub.io/)
- `TELEGRAM_BOT_TOKEN` - Create via [@BotFather](https://t.me/botfather)
- `TELEGRAM_CHAT_ID` - Your personal chat ID
- `GOOGLE_SHEET_ID` - Your watchlist Google Sheet ID (see [Watchlist](#watchlist) below)

### 3. Run Locally

```bash
npm run start
```

### 4. Deploy to GitHub Actions

1. Push to GitHub
2. Add secrets in repo Settings → Secrets → Actions
3. Enable the workflow

## Watchlist

The watchlist is loaded from a **Google Sheet** at each run. You manage symbols (and optional sectors) in the sheet; the bot fetches it automatically.

### Setup

1. **Create a Google Sheet** with two columns:
   - **Column A:** Symbol (e.g. `AAPL`, `META`, `EXA.PA`)
   - **Column B:** Sector (optional; e.g. `Technology`, `Healthcare`). Leave empty for "Other".
2. **First row** can be a header: `Symbol`, `Sector` (case-insensitive).
3. **Share the sheet:** Click Share → "Anyone with the link" → **Viewer**.
4. **Get the Sheet ID** from the URL:
   `https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit`
5. Set `GOOGLE_SHEET_ID=<SHEET_ID>` in your `.env` and in GitHub Actions secrets.

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_SHEET_ID` | — | **Required.** Google Sheet ID for watchlist (Column A = symbol, B = sector) |
| `MIN_RVOL` | 2.0 | Minimum RVOL to trigger signal |
| `TOP_N` | 15 | Max signals to include in report |
| `PRICE_CHANGE_THRESHOLD` | 2 | % threshold for "volume w/o price" (silent activity) |
| `TWELVE_DATA_API_KEY` | — | **Optional.** Fetch RSI/SMA from Twelve Data; also used as fallback when Yahoo fails |
| `USE_FETCHED_INDICATORS` | true | Set to `false` to always calculate RSI/SMA locally |
| `CONSOLIDATION_MIN_MONTHS` | 6 | Min base length (months) for full setup ✓ |
| `CONSOLIDATION_MAX_MONTHS` | 36 | Max base length for full setup ✓ |
| `CONSOLIDATION_CLOSE_MIN_MONTHS` | 4 | Min base for "close" setup ~ |
| `ATH_THRESHOLD_PCT` | 20 | Within this % of high = full ✓ |
| `ATH_CLOSE_THRESHOLD_PCT` | 25 | 20–25% = close ~ |
| `SMA21_TOUCH_THRESHOLD_PCT` | 3 | Within 3% of SMA21 = full ✓ |
| `SMA21_CLOSE_THRESHOLD_PCT` | 5 | 3–5% = close ~ |
| `ENABLE_LLM_SUMMARY` | true | Set to `false` to disable AI-generated summary as first Telegram message |
| `LLM_PROVIDER` | openai | LLM for summary: `openai`, `perplexity`, or `gemini` |
| `LLM_MIN_RVOL` | 2 | Min RVOL for LLM analysis; only stocks with RVOL > this get sent. Set 0 to include all signals. |
| `LLM_PER_STOCK` | true | If true, send each signal to LLM separately (parallel). If false, use single batch summary. |
| `OPENAI_API_KEY` | — | **Optional.** For LLM summary when `LLM_PROVIDER=openai`; [platform.openai.com](https://platform.openai.com/api-keys) |
| `PERPLEXITY_API_KEY` | — | **Optional.** For LLM summary when `LLM_PROVIDER=perplexity`; [perplexity.ai](https://www.perplexity.ai/settings/api) |
| `GEMINI_API_KEY` | — | **Optional.** For LLM summary when `LLM_PROVIDER=gemini`; [Google AI Studio](https://aistudio.google.com/apikey) |

**Documentation:** In Obsidian vault `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Maestro` → `04-knowledge/reference/`, `02-projects/smart-volume-radar/README.md`.

## Sample Output

```
📊 Smart Volume Radar
📅 2026-02-01 | 12 Signals Found
━━━━━━━━━━━━━━━━━━━━━━

↗️ NVDA
📊 RVOL 4.82x  •  Price +8.42%
📈 RSI 68  •  Above SMA50
🎯 Setup 🎯
   SMA21  1.2% ✓   High  -12% from 52w ✓   Base  14mo ✓
⛓ TV  YF  BIZ
📑 News: NVIDIA Reports Record Q4 Revenue...

↘️ AMD
📊 RVOL 3.15x  •  Price -3.21%
📈 RSI 42  •  Below SMA50
🎯 Setup 👀
   SMA21  4.1% ~   High  -18% from 52w ✓   Base  8mo ✓
⛓ TV  YF
📑 AMD Faces Supply Chain Challenges...

━━━━━━━━━━━━━━━━━━━━━━
🔕 Volume w/o Price (Silent Activity)
MSFT (2.1x), ORCL (2.3x)
```

## Documentation

**מקור אמת:** הכספת (Obsidian vault). אין כפילות — כל התיעוד בכספת.

**נתיב הכספת:** `~/Library/Mobile Documents/iCloud~md~obsidian/Documents/Maestro`

- **Reference:** `04-knowledge/reference/` — architecture, calculations, message guide, indicator sources
- **Standards:** `04-knowledge/standards/smart-volume-radar-standards.md`
- **Plans:** `docs/plans/` — remaining tasks (e.g. `2026-02-27-smart-volume-radar-remaining-tasks.md`)

**הנחיה:** אחרי סיום משימה — עדכן תיעוד בכספת, מחק plan ישן.

אינדקס: `02-projects/smart-volume-radar/README.md`

## Project Structure

```
smart-volume-radar/
├── src/
│   ├── index.ts           # Main entry
│   ├── config/            # Configuration & Google Sheet watchlist
│   ├── services/          # Core business logic
│   │   ├── marketData.ts  # Yahoo Finance (and Twelve Data fallback)
│   │   ├── rvolCalculator.ts
│   │   ├── newsService.ts # Finnhub integration
│   │   └── telegramBot.ts # Telegram messaging
│   ├── types/             # TypeScript interfaces
│   └── utils/             # Helpers, technical analysis, error handling
├── scripts/               # Utilities (e.g. send-legend to Telegram)
├── tests/                 # Unit tests
└── .github/workflows/     # GitHub Actions
```

## Scripts

- **Send legend to Telegram**: `npx tsx scripts/send-legend.ts` (sends the report legend once; requires env vars).

## License

MIT
