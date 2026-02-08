# Plan: Watchlist via Google Sheets (no code changes in this phase)

## Decisions (from product)

| Topic | Decision |
|-------|----------|
| Where user edits watchlist | **Google Sheet** — user manages a simple symbol (and optional sector) sheet |
| How CLI gets the list | GET the sheet (CSV export or Google Sheets API) once per run |
| Multi-user | Single list (one watchlist for the bot) |
| Fallback if sheet unreachable | **None** — no fallback to `tickers.json` |
| Rate / cost | One fetch per scan run; no extra infra (Google Sheets is the source) |

---

## Google Sheet as watchlist source

- **No custom backend.** User keeps one Google Sheet; CLI fetches it at the start of each run.
- **Sheet structure (simple):**
  - **Column A:** Symbol (e.g. `AAPL`, `META`, `EXA.PA`). Required.
  - **Column B (optional):** Sector (e.g. `Technology`, `Healthcare`). For grouping in Telegram; default `"Other"` if empty.
  - First row can be a header row (e.g. `Symbol`, `Sector`); implementation will treat first row as header and skip it, or use it to detect columns.
- **User workflow:** Edit the sheet (add/remove rows, change symbols or sectors); next bot run uses the updated list.

---

## How we fetch the sheet

**Option A — CSV export (simplest, recommended)**  
- Sheet is shared **"Anyone with the link can view"**.
- URL: `https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv`
- `SHEET_ID` = the ID from the sheet URL (between `/d/` and `/edit`).
- CLI: one GET request, parse CSV, map rows to `{ symbol, sector }`. No API key.
- **Secret:** Store `GOOGLE_SHEET_ID` (or full export URL) in GitHub Actions secrets / `.env`.

**Option B — Private sheet**  
- Sheet stays private. Use **Google Sheets API** with a **service account**.
- Share the sheet with the service account email (e.g. `xxx@project.iam.gserviceaccount.com`).
- CLI uses a serverless-friendly flow (e.g. JWT from service account key). Store key JSON in GitHub Secrets.
- More setup; use only if the sheet must stay private.

**Recommendation:** Start with Option A (public CSV export). Move to Option B only if you need the sheet to be private.

---

## Params we get from the sheet

| Param     | Source        | Notes                                      |
|----------|---------------|--------------------------------------------|
| `symbol` | Column A      | Required; trim whitespace; skip empty rows  |
| `sector` | Column B      | Optional; default `"Other"` if empty       |

No `description` in the minimal sheet; can add a third column later if needed.

---

## Implementation summary (for next phase)

1. **Config:** New env var `GOOGLE_SHEET_ID` (or `WATCHLIST_SHEET_URL`). CLI fails at startup if missing (same as other required vars).
2. **Fetch:** At start of scan, GET CSV export URL, parse CSV (handle header row, commas in cells if any).
3. **Shape:** Convert rows to same shape as today: `{ symbol: string, sector: string }[]`. `loadWatchlist()` returns symbols; `getSectorForTicker(symbol)` uses sector from fetched list.
4. **Remove:** Stop reading `src/config/tickers.json` for the watchlist. File can remain in repo as reference or be removed.
5. **Secrets:** Add `GOOGLE_SHEET_ID` to GitHub Actions secrets and document in README.
6. **No fallback:** If the GET fails or sheet is empty, fail the run (no fallback to tickers.json).

---

## What we need before implementation

1. **Confirm sheet structure:** Column A = Symbol, Column B = Sector (optional). First row = header?
2. **Confirm access:** Option A (public CSV) acceptable? If not, we use Option B (Sheets API + service account).
3. **Sheet ID:** You'll create the sheet and put the ID (or export URL) in env; no need to decide now.

---

---

## Implementation Tasks

### Phase 1: Google Sheets Integration
- 🟩 Add CSV fetch function (HTTP GET to Google Sheets CSV export URL)
- 🟩 Add CSV parsing (handle header row, empty rows, trim whitespace)
- 🟩 Update `getTickers()` to fetch from Google Sheet instead of `tickers.json`
- 🟩 Add `GOOGLE_SHEET_ID` to config and validation
- 🟩 Update error handling (fail if sheet unreachable, no fallback)

### Phase 2: Testing & Documentation
- 🟩 Add tests for CSV parsing and fetch logic
- 🟩 Update README with Google Sheet setup instructions
- 🟩 Update GitHub Actions workflow to include `GOOGLE_SHEET_ID` secret

**Progress: 100%** (7/7 tasks complete)

---

## Summary

- **Planning phase:** ✅ Complete. Decisions confirmed: Google Sheet (public CSV), Column A=Symbol, Column B=Sector, first row=header.
- **Implementation:** ✅ Complete. Watchlist is fetched from Google Sheets CSV; `GOOGLE_SHEET_ID` required; no fallback to `tickers.json`. Tests, README, and workflow updated.
