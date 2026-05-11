// Telegram notifier — manda mensagens com formatação rica pro chat do usuário.
// Push nativo no celular, sem precisar do app aberto.

import TelegramBot from 'node-telegram-bot-api';

const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

if (!TOKEN || !CHAT_ID) {
  console.error('❌ Configure TELEGRAM_BOT_TOKEN e TELEGRAM_CHAT_ID no .env');
  process.exit(1);
}

const bot = new TelegramBot(TOKEN, { polling: false });

export async function sendMessage(text, opts = {}) {
  try {
    await bot.sendMessage(CHAT_ID, text, {
      parse_mode: 'HTML',
      disable_web_page_preview: opts.preview === false,
      ...opts
    });
  } catch (e) {
    console.error('Erro Telegram:', e.message);
  }
}

export async function notifySetup(setup, indicators) {
  const emoji = setup.emoji || '📡';
  const sev = setup.severity === 'high' ? '🔴 ALTA' : setup.severity === 'medium' ? '🟡 MÉDIA' : '⚪️ BAIXA';
  const last = indicators?.last?.toFixed(2) || '?';
  const rsi = indicators?.rsi?.toFixed(0) || '?';
  const p7 = indicators?.p7 ? `${indicators.p7 >= 0 ? '+' : ''}${indicators.p7.toFixed(1)}%` : '?';

  const text = `${emoji} <b>${setup.title}</b>

📊 <b>Preço:</b> R$ ${last}
📈 <b>7d:</b> ${p7} · <b>RSI:</b> ${rsi}
🚨 <b>Severidade:</b> ${sev}

${setup.description}

<i>⚠️ Análise educacional, não recomendação. Sempre use gestão de risco (2% por trade).</i>`;
  await sendMessage(text);
}

export async function notifyDailySummary(snapshots, setupsBySym) {
  const date = new Date().toLocaleDateString('pt-BR');
  const totalSetups = Object.values(setupsBySym).reduce((s, arr) => s + arr.length, 0);
  let body = `🌅 <b>Bom dia! Resumo do mercado · ${date}</b>\n\n`;

  // Top variações
  const sorted = [...snapshots].sort((a, b) => Math.abs(b.change) - Math.abs(a.change));
  const top = sorted.slice(0, 5);
  body += '<b>📊 Maiores variações:</b>\n';
  for (const s of top) {
    const arrow = s.change >= 0 ? '🟢' : '🔴';
    body += `${arrow} <b>${s.symbol}</b> R$ ${(s.price || 0).toFixed(2)} (${s.change >= 0 ? '+' : ''}${s.change.toFixed(2)}%)\n`;
  }

  body += `\n<b>📡 Setups detectados:</b> ${totalSetups}\n`;
  for (const sym of Object.keys(setupsBySym)) {
    if (setupsBySym[sym].length) {
      body += `\n<b>${sym}:</b>\n`;
      for (const s of setupsBySym[sym]) {
        body += `  ${s.emoji} ${s.title}\n`;
      }
    }
  }

  body += '\n<i>⚠️ Educacional. Não é recomendação.</i>';
  await sendMessage(body);
}

export async function notifyMarketClose(snapshots) {
  const top = [...snapshots].sort((a, b) => b.change - a.change).slice(0, 3);
  const bot3 = [...snapshots].sort((a, b) => a.change - b.change).slice(0, 3);
  let body = `🏁 <b>Pregão encerrado · ${new Date().toLocaleDateString('pt-BR')}</b>\n\n`;
  body += '<b>🟢 Top altas:</b>\n';
  for (const s of top) body += `  ${s.symbol}: +${s.change.toFixed(2)}%\n`;
  body += '\n<b>🔴 Top quedas:</b>\n';
  for (const s of bot3) body += `  ${s.symbol}: ${s.change.toFixed(2)}%\n`;
  await sendMessage(body);
}

export async function sendStartup() {
  await sendMessage(
    `✅ <b>Agente Financeiro online</b>\n\n` +
    `Watchlist: <b>${(process.env.WATCHLIST || '').split(',').length} ativos</b>\n` +
    `Intervalo: <b>${process.env.CHECK_INTERVAL_MINUTES || 5} min</b>\n` +
    `Modo: <b>${process.env.NOTIFY_24_7 === 'true' ? '24/7' : 'pregão (10h-18h)'}</b>\n` +
    `Nível mínimo: <b>${process.env.ALERT_LEVEL || 'medium'}</b>\n\n` +
    `Vou monitorar o mercado e te avisar quando houver setup técnico forte.\n\n` +
    `<i>⚠️ Análises são educacionais. Nenhum sistema prevê o mercado com 100% de acerto.</i>`
  );
}
