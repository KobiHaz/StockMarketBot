# Discovery Prompt: Google Sheets Watchlist Integration

## Context

We're migrating the watchlist from a hardcoded `src/config/tickers.json` file to fetching it from a Google Sheet via CSV export. The user will manage the watchlist in Google Sheets (Column A = Symbol, Column B = Sector), and the CLI will fetch it once per run.

## What I Need You to Discover

Please analyze the codebase and provide the following information:

### 1. Current Watchlist Loading Flow
- **File:** `src/config/index.ts`
  - How does `getTickers()` currently work? (line numbers, exact logic)
  - How does `loadWatchlist()` transform tickers to symbols? (line numbers)
  - How does `getSectorForTicker()` look up sectors? (line numbers)
  - What is the `TickerConfig` interface structure? (exact fields)
  - Is there any caching (`tickerCache`)? How does it work?

### 2. Usage Points
- **File:** `src/index.ts`
  - Where is `loadWatchlist()` called? (line number, context)
  - Where is `getSectorForTicker()` called? (line number, context)
  - What happens if these functions throw errors?

### 3. Configuration & Validation
- **File:** `src/config/index.ts`
  - How does `validateConfig()` work? (line numbers, what it checks)
  - What env vars are currently required?
  - Where is `config` object defined and how are env vars read?

### 4. Error Handling Patterns
- **Files:** `src/utils/errorHandler.ts`, `src/index.ts`
  - How are errors currently handled in the main flow?
  - What happens if `loadWatchlist()` fails today?
  - Are there any retry patterns for external API calls?

### 5. Dependencies & HTTP
- **File:** `package.json`
  - What HTTP libraries are currently used? (if any)
  - What's the Node.js version requirement?
  - Are there any CSV parsing libraries already installed?

### 6. Testing Patterns
- **Files:** `tests/`, `jest.config.cjs`
  - How are config functions tested today?
  - Are there existing tests for `loadWatchlist()` or `getSectorForTicker()`?
  - What's the test setup pattern?

### 7. GitHub Actions
- **File:** `.github/workflows/daily-scan.yml`
  - How are secrets currently passed to the workflow?
  - What env vars are set in the workflow?

## Expected Output Format

Please return:
1. **Exact line numbers** for all functions mentioned above
2. **Code snippets** (minimal, relevant parts) showing current implementation
3. **Dependencies** needed (e.g., do we need to add a CSV parser or can we use Node built-ins?)
4. **Error handling patterns** currently used
5. **Any edge cases** you notice (empty arrays, missing fields, etc.)

## Constraints

- **No code changes** — this is discovery only
- **Be specific** — include line numbers and file paths
- **Highlight risks** — what could break if we change the loading mechanism?

---

**Return this information so I can create a precise execution plan with phase prompts.**
