/**
 * One-time script: Send the legend (מדריך) to Telegram
 */
import { sendTelegramMessage, formatLegend } from '../src/services/telegramBot.js';

async function main() {
    await sendTelegramMessage(formatLegend());
    console.log('✅ Legend sent to Telegram');
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});
