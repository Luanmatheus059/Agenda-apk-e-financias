// Múltiplas fontes de dados gratuitos — tenta em sequência se uma falha.
// Brapi (BR), Stooq (global), CoinGecko (cripto), Yahoo (fallback geral).

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (compatible; FinancasBot/1.0)'
};

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, { headers: HEADERS, ...opts });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function fetchText(url, opts = {}) {
  const res = await fetch(url, { headers: HEADERS, ...opts });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/**
 * Tenta múltiplas fontes em sequência. Retorna array de fechamentos (cronológico).
 */
export async function getHistoricalCloses(symbol, lookbackDays = 200) {
  // 1. Brapi (gratuito BR)
  try {
    const range = lookbackDays > 90 ? '1y' : '3mo';
    const d = await fetchJSON(`https://brapi.dev/api/quote/${symbol}?range=${range}&interval=1d`);
    const arr = (d.results?.[0]?.historicalDataPrice || [])
      .map(x => x.close).filter(x => x > 0);
    if (arr.length >= 20) return { source: 'brapi', closes: arr };
  } catch (e) { /* tries next */ }

  // 2. Stooq (sem auth, formato CSV) — usa .sa pra tickers B3
  try {
    const stooqSym = /^[A-Z]{4}\d+$/i.test(symbol)
      ? `${symbol.toLowerCase()}.sa`
      : symbol.toLowerCase();
    const csv = await fetchText(`https://stooq.com/q/d/l/?s=${stooqSym}&i=d`);
    const lines = csv.split(/\r?\n/).slice(1).filter(l => l.trim());
    const closes = lines.map(l => {
      const cols = l.split(',');
      return parseFloat(cols[4]);
    }).filter(x => !isNaN(x) && x > 0);
    if (closes.length >= 20) return { source: 'stooq', closes };
  } catch (e) { /* tries next */ }

  // 3. CoinGecko pra crypto
  const cgMap = {
    BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana',
    ADA: 'cardano', XRP: 'ripple', DOGE: 'dogecoin',
    BNB: 'binancecoin', MATIC: 'matic-network', AVAX: 'avalanche-2'
  };
  if (cgMap[symbol.toUpperCase()]) {
    try {
      const days = Math.min(lookbackDays, 365);
      const d = await fetchJSON(
        `https://api.coingecko.com/api/v3/coins/${cgMap[symbol.toUpperCase()]}/market_chart?vs_currency=brl&days=${days}&interval=daily`
      );
      const closes = (d.prices || []).map(p => p[1]).filter(x => x > 0);
      if (closes.length >= 20) return { source: 'coingecko', closes };
    } catch (e) { /* tries next */ }
  }

  // 4. Yahoo Finance Chart API (sem auth, fallback global)
  try {
    const yahooSym = /^[A-Z]{4}\d+$/i.test(symbol) ? `${symbol}.SA` : symbol;
    const period = lookbackDays * 86400;
    const now = Math.floor(Date.now() / 1000);
    const r = await fetchJSON(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSym}?period1=${now - period}&period2=${now}&interval=1d`
    );
    const quotes = r.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [];
    const closes = quotes.filter(x => x != null && x > 0);
    if (closes.length >= 20) return { source: 'yahoo', closes };
  } catch (e) { /* end */ }

  return { source: null, closes: [] };
}

/**
 * Último preço + variação % via Brapi (rápido, 1 request por watchlist).
 */
export async function getSnapshot(symbols) {
  try {
    const r = await fetchJSON(
      `https://brapi.dev/api/quote/${symbols.join(',')}?range=1d`
    );
    return (r.results || []).map(it => ({
      symbol: it.symbol,
      price: it.regularMarketPrice,
      change: it.regularMarketChangePercent || 0,
      volume: it.regularMarketVolume,
      name: it.shortName || it.longName || it.symbol
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Notícias do dia (Brapi v2 endpoint — gratuito).
 */
export async function getNews(symbol = 'PETR4') {
  try {
    const d = await fetchJSON(`https://brapi.dev/api/v2/quote/${symbol}?modules=news`);
    const news = d.news || d.results?.[0]?.news || [];
    return news.slice(0, 5).map(n => ({
      title: n.title,
      url: n.url || n.link,
      source: n.source || n.publisher,
      date: n.publishedAt || n.pubDate
    }));
  } catch (e) {
    return [];
  }
}

/**
 * Status do mercado B3 (true = aberto, false = fechado).
 */
export function isMarketOpen() {
  const now = new Date();
  // ajusta pra hora de Brasília (UTC-3)
  const brTime = new Date(now.getTime() - 3 * 3600 * 1000 + now.getTimezoneOffset() * 60 * 1000);
  const day = brTime.getDay();
  const hour = brTime.getHours() + brTime.getMinutes() / 60;
  const openH = parseInt(process.env.MARKET_OPEN_HOUR || '10');
  const closeH = parseInt(process.env.MARKET_CLOSE_HOUR || '18');
  return day >= 1 && day <= 5 && hour >= openH && hour < closeH;
}
