# Feature Implementation Plan: Project Hardening & Optimization

**Overall Progress:** `100%`

## TLDR
Modernizing the **Smart Volume Radar** by optimizing data fetching performance, cleaning up architectural documentation to match the actual project, and improving configuration management for better scaling.

## Critical Decisions
- **Decision 1: Concurrency Control** – Use `p-limit` instead of simple sequential `sleep` to maximize throughput while respecting strict API limits (Finnhub/Yahoo).
- **Decision 2: Documentation Alignment** – Prune the "Leadslords React/Firebase" residues from `maestro` instructions to ensure the AI assistant accurately understands it's working on a Node/TS CLI tool.
- **Decision 3: Local Config Consolidation** – Keep configuration local for now (low infra cost) but improve the schema to reduce manual JSON editing errors.

## Tasks:

- [x] 🟩 **Step 1: Align Maestro Documentation**
  - [x] 🟩 Update `maestro/cto.md` to remove React/Vite/Firebase web app references.
  - [x] 🟩 Redefine the tech stack in `cto.md` as Node.js, TypeScript, and GitHub Actions.
  - [x] 🟩 Update preferred tools to include local file manipulation and CLI debugging.

- [x] 🟩 **Step 2: Optimize Data Fetching Performance**
  - [x] 🟩 Install `p-limit` to handle concurrent HTTP requests.
  - [x] 🟩 Refactor `src/services/marketData.ts`: Implement concurrent fetching with a limit of 3–5 tickers.
  - [x] 🟩 Refactor `src/services/newsService.ts`: Implement concurrent news enrichment while respecting the 60 calls/min Finnhub limit.

- [x] 🟩 **Step 3: Configuration & Logic Hardening**
  - [x] 🟩 Improve `checkMarketStatus` in `src/index.ts` to better handle timezones and edge cases (readying for holiday awareness).
  - [x] 🟩 Merge `watchlist.json` and `sectors.json` into a more manageable `tickers.json` with metadata tags to reduce maintenance overhead.

- [x] � **Step 4: Verification & Testing**
  - [x] � Run a full test scan using `FORCE_SCAN=true`.
  - [x] � Verify that Telegram reports are correctly grouped by the updated sector configuration.
  - [x] � Measure execution time to confirm performance improvement from concurrency.
