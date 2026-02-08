# Smart Volume Radar

🚀 **Automated stock volume monitoring system** that identifies unusual trading activity and delivers daily intelligence reports via Telegram.

## Features

- 📊 **RVOL Analysis**: Calculates Relative Volume (today's volume / 20-day average)
- 🎯 **Signal Detection**: Identifies stocks with RVOL ≥ 2.0
- 🔕 **Silent Accumulation**: Flags high-volume stocks with minimal price movement
- 📰 **News Enrichment**: Attaches recent headlines from Finnhub
- 📱 **Telegram Delivery**: Sends formatted reports to your phone
- ⏰ **Automated Scheduling**: Runs daily via GitHub Actions

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
| `PRICE_CHANGE_THRESHOLD` | 2 | % threshold for "volume w/o price" |

## Sample Output

```
📊 Smart Volume Radar
📅 2026-02-01 | 12 Signals Found
━━━━━━━━━━━━━━━━━━━━━━

🟢 NVDA +8.42%
📈 RVOL: 4.82x
📰 News:
   • NVIDIA Reports Record Q4 Revenue...

🔴 AMD -3.21%
📈 RVOL: 3.15x
📰 News:
   • AMD Faces Supply Chain Challenges...

━━━━━━━━━━━━━━━━━━━━━━
🔕 Volume w/o Price (Silent Activity)
MSFT (2.1x), ORCL (2.3x)
```

## Project Structure

```
smart-volume-radar/
├── src/
│   ├── index.ts           # Main entry
│   ├── config/            # Configuration & watchlist
│   ├── services/          # Core business logic
│   │   ├── marketData.ts  # Yahoo Finance integration
│   │   ├── rvolCalculator.ts
│   │   ├── newsService.ts # Finnhub integration
│   │   └── telegramBot.ts # Telegram messaging
│   ├── types/             # TypeScript interfaces
│   └── utils/             # Helpers & error handling
├── tests/                 # Unit tests
└── .github/workflows/     # GitHub Actions
```

## License

MIT
