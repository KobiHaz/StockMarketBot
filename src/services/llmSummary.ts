/**
 * Smart Volume Radar - LLM Summary Service
 * Optional: asks an LLM to summarize the daily scan report for analyst-style commentary.
 * Supports OpenAI, Perplexity, and Google Gemini via LLM_PROVIDER and corresponding API keys.
 */

import { config } from '../config/index.js';
import logger from '../utils/logger.js';

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions';
const PERPLEXITY_API_URL = 'https://api.perplexity.ai/chat/completions';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_REPORT_CHARS = 5500; // Keep prompt under ~6k chars for context + response

const SYSTEM_PROMPT = 'You are a concise market analyst. You identify stocks that match the exact "full setup" (🎯) or "close setup" (👀) defined in the user message. Only refer to tickers and facts that appear in the report. Reply in plain text only, no markdown.';

/**
 * Build prompt for the LLM using the same setup definition as the app (config-driven).
 * When codeRows provided, LLM must output same tickers in same format (for direct comparison).
 */
function buildPrompt(reportExcerpt: string, date: string): string {
    const {
        sma21TouchThresholdPct,
        sma21CloseThresholdPct,
        athThresholdPct,
        athCloseThresholdPct,
        consolidationMinMonths,
        consolidationMaxMonths,
        consolidationCloseMinMonths,
    } = config;

    return `You are a concise market analyst. Below is a daily scan report from Smart Volume Radar (${date}): stocks with high relative volume (RVOL), with technical context.

SETUP DEFINITION (use this exact definition when you refer to "full setup" or "close setup"):

• Full setup (marked 🎯 in the report) = ALL three conditions MET:
  1. SMA21: price within ${sma21TouchThresholdPct}% of SMA21 (shown as ✓ in report)
  2. High (52w): price within ${athThresholdPct}% of 52-week high (✓)
  3. Base: consolidation between ${consolidationMinMonths} and ${consolidationMaxMonths} months (✓)

• Close setup (marked 👀 in the report) = all three in "close" band (shown as ~ in report):
  1. SMA21: ${sma21TouchThresholdPct}–${sma21CloseThresholdPct}% from SMA21
  2. High (52w): ${athThresholdPct}–${athCloseThresholdPct}% from 52w high
  3. Base: ${consolidationCloseMinMonths}–${consolidationMinMonths} months (short of ${consolidationMinMonths}mo)

Report excerpt (may be truncated):
---
${reportExcerpt}
---

The code already produced the structured rows (shown above in Data). Your job: write a short analyst commentary.

OUTPUT: 2–3 short sentences max. Mention key setup tickers, sectors, and tone. Plain text only.`;
}

/** OpenAI-style response shape (OpenAI + Perplexity) */
interface ChatChoice {
    message?: { content?: string };
}

async function callOpenAI(prompt: string): Promise<string | null> {
    const apiKey = config.openaiApiKey;
    if (!apiKey) {
        logger.warn('LLM summary skipped: OPENAI_API_KEY not set');
        return null;
    }
    try {
        const response = await fetch(OPENAI_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'gpt-4o-mini',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 600,
                temperature: 0.3,
            }),
        });
        if (!response.ok) {
            logger.warn(`LLM summary (OpenAI) failed: ${response.status} ${(await response.text()).slice(0, 200)}`);
            return null;
        }
        const data = (await response.json()) as { choices?: ChatChoice[] };
        return data?.choices?.[0]?.message?.content?.trim() ?? null;
    } catch (error) {
        logger.warn('LLM summary (OpenAI) error', (error as Error).message);
        return null;
    }
}

/** Perplexity uses OpenAI-compatible chat completions. */
async function callPerplexity(prompt: string): Promise<string | null> {
    const apiKey = config.perplexityApiKey;
    if (!apiKey) {
        logger.warn('LLM summary skipped: PERPLEXITY_API_KEY not set');
        return null;
    }
    try {
        const response = await fetch(PERPLEXITY_API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
                model: 'sonar',
                messages: [
                    { role: 'system', content: SYSTEM_PROMPT },
                    { role: 'user', content: prompt },
                ],
                max_tokens: 600,
                temperature: 0.3,
            }),
        });
        if (!response.ok) {
            logger.warn(`LLM summary (Perplexity) failed: ${response.status} ${(await response.text()).slice(0, 200)}`);
            return null;
        }
        const data = (await response.json()) as { choices?: ChatChoice[] };
        return data?.choices?.[0]?.message?.content?.trim() ?? null;
    } catch (error) {
        logger.warn('LLM summary (Perplexity) error', (error as Error).message);
        return null;
    }
}

/** Google Gemini generateContent API. */
async function callGemini(prompt: string): Promise<string | null> {
    const apiKey = config.geminiApiKey;
    if (!apiKey) {
        logger.warn('LLM summary skipped: GEMINI_API_KEY not set');
        return null;
    }
    const model = 'gemini-3-flash-preview';
    const url = `${GEMINI_API_BASE}/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    maxOutputTokens: 800,
                    temperature: 0.2,
                },
            }),
        });
        if (!response.ok) {
            logger.warn(`LLM summary (Gemini) failed: ${response.status} ${(await response.text()).slice(0, 200)}`);
            return null;
        }
        const data = (await response.json()) as {
            candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim();
        return text ?? null;
    } catch (error) {
        logger.warn('LLM summary (Gemini) error', (error as Error).message);
        return null;
    }
}

function callLlm(prompt: string): Promise<string | null> {
    const provider = config.llmProvider;
    if (provider === 'perplexity') return callPerplexity(prompt);
    if (provider === 'gemini') return callGemini(prompt);
    return callOpenAI(prompt);
}

/** Strip HTML tags so the LLM sees readable text */
function stripHtml(html: string): string {
    return html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Get an LLM-generated summary of the daily report.
 * Returns null if disabled, no API key, or on any failure (report is still sent without summary).
 */
export async function getReportSummary(reportText: string, date: string): Promise<string | null> {
    if (!config.enableLlmSummary) {
        logger.info('LLM summary disabled. Set ENABLE_LLM_SUMMARY=true in .env to enable.');
        return null;
    }

    const provider = config.llmProvider;
    const hasKey = provider === 'gemini' ? !!config.geminiApiKey : provider === 'perplexity' ? !!config.perplexityApiKey : !!config.openaiApiKey;
    if (!hasKey) {
        const keyName = provider === 'gemini' ? 'GEMINI_API_KEY' : provider === 'perplexity' ? 'PERPLEXITY_API_KEY' : 'OPENAI_API_KEY';
        logger.warn(`LLM summary skipped: ${keyName} not set (LLM_PROVIDER=${provider})`);
        return null;
    }

    logger.info(`Generating LLM summary (provider: ${provider})...`);
    const plain = stripHtml(reportText);
    const excerpt = plain.slice(0, MAX_REPORT_CHARS);
    if (reportText.length > MAX_REPORT_CHARS) {
        logger.info(`LLM summary: using first ${MAX_REPORT_CHARS} chars of report`);
    }

    const prompt = buildPrompt(excerpt, date);
    const summary = await callLlm(prompt);

    if (summary) {
        logger.info(`LLM summary generated (${provider})`);
    } else {
        logger.warn(`LLM summary not sent: no response from ${provider} (check logs above for API errors)`);
    }

    return summary;
}
