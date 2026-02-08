# Execution Phases: Google Sheets Watchlist Integration

## Phase 1: Google Sheets Fetch & Parse

**Goal:** Replace `getTickers()` to fetch from Google Sheet CSV instead of `tickers.json`.

### Tasks:
1. Add HTTP fetch function for Google Sheets CSV export URL
2. Add CSV parsing function (handle header row, skip empty rows, trim whitespace)
3. Update `getTickers()` to use Google Sheet fetch (keep same return type: `TickerConfig[]`)
4. Add `GOOGLE_SHEET_ID` to config and `validateConfig()`
5. Remove dependency on `tickers.json` file reading (keep file in repo as reference)

### Implementation Notes:
- Use Node.js built-in `fetch` (Node 20+) or `https` module for HTTP GET
- Parse CSV manually or use a lightweight library (check if one exists in package.json)
- Handle errors: if fetch fails or sheet is empty, throw error (no fallback to tickers.json)
- Maintain same `TickerConfig` interface: `{ symbol: string, sector: string, description?: string }`
- Map CSV rows: Column A → symbol, Column B → sector (default "Other" if empty)
- Skip first row if it looks like a header (e.g., contains "Symbol" or "Sector")

### Files to Modify:
- `src/config/index.ts` — update `getTickers()`, add fetch/parse functions, update `validateConfig()`
- `package.json` — add CSV parser if needed (or use built-in)

### Status Report Format:
After completing, return:
- ✅ What functions were added/modified
- ✅ What dependencies were added (if any)
- ✅ How CSV parsing handles edge cases (empty rows, missing columns, etc.)
- ✅ Error messages if fetch fails
- ⚠️ Any breaking changes or risks

---

## Phase 2: Testing & Documentation

**Goal:** Add tests and update documentation for Google Sheets integration.

### Tasks:
1. Add unit tests for CSV parsing (various formats: with/without header, empty rows, missing sectors)
2. Add integration test for `loadWatchlist()` fetching from a test sheet (or mock HTTP response)
3. Update README.md with Google Sheet setup instructions
4. Update `.github/workflows/daily-scan.yml` to include `GOOGLE_SHEET_ID` secret

### Implementation Notes:
- Mock HTTP responses in tests (don't hit real Google Sheets)
- Test edge cases: empty sheet, malformed CSV, network errors
- Document: how to create sheet, share it, get SHEET_ID, add to env vars
- Update workflow: add `GOOGLE_SHEET_ID: ${{ secrets.GOOGLE_SHEET_ID }}` to env section

### Files to Modify:
- `tests/` — add new test file for watchlist loading
- `README.md` — add Google Sheet setup section
- `.github/workflows/daily-scan.yml` — add `GOOGLE_SHEET_ID` env var

### Status Report Format:
After completing, return:
- ✅ What tests were added and what they cover
- ✅ Documentation updates made
- ✅ Workflow changes
- ⚠️ Any manual steps users need to do (create sheet, share it, etc.)

---

## Overall Progress Tracking

- **Phase 1:** 🟩 Complete (fetch, parse, getTickers, config, validation)
- **Phase 2:** 🟩 Complete (tests, README, workflow)

**Total Progress: 100%**
