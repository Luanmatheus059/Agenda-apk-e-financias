// Engine de análise técnica — RSI, médias móveis, cruzamentos.
// Mesmas regras matemáticas que os melhores traders usam.
// Funciona offline depois de ter os preços.

export function calcRSI(prices, period = 14) {
  if (prices.length < period + 1) return null;
  let gains = 0, losses = 0;
  for (let i = 1; i <= period; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) gains += diff; else losses -= diff;
  }
  let avgGain = gains / period, avgLoss = losses / period;
  for (let i = period + 1; i < prices.length; i++) {
    const diff = prices[i] - prices[i - 1];
    if (diff > 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) - diff) / period;
    }
  }
  if (avgLoss === 0) return 100;
  return 100 - (100 / (1 + avgGain / avgLoss));
}

export function calcMA(prices, period) {
  if (prices.length < period) return null;
  const slice = prices.slice(-period);
  return slice.reduce((a, b) => a + b, 0) / period;
}

export function calcVolatility(prices, period = 20) {
  if (prices.length < period + 1) return null;
  const returns = [];
  for (let i = 1; i < prices.length; i++) {
    returns.push((prices[i] - prices[i - 1]) / prices[i - 1]);
  }
  const slice = returns.slice(-period);
  const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
  const variance = slice.reduce((s, r) => s + (r - mean) ** 2, 0) / slice.length;
  return Math.sqrt(variance) * Math.sqrt(252) * 100;
}

/**
 * Analisa um ativo e retorna lista de setups detectados.
 * Cada setup tem: type, severity, title, description, emoji.
 */
export function analyzeAsset(symbol, prices) {
  if (!prices || prices.length < 50) return { symbol, valid: false };
  const last = prices[prices.length - 1];
  const prev = prices[prices.length - 2];
  const rsi = calcRSI(prices);
  const ma9 = calcMA(prices, 9);
  const ma21 = calcMA(prices, 21);
  const ma50 = calcMA(prices, 50);
  const ma200 = calcMA(prices, 200);
  const ma50Prev = calcMA(prices.slice(0, -1), 50);
  const ma200Prev = calcMA(prices.slice(0, -1), 200);
  const vol = calcVolatility(prices);
  const p7 = prices.length >= 7 ? (last / prices[prices.length - 7] - 1) * 100 : null;
  const p30 = prices.length >= 30 ? (last / prices[prices.length - 30] - 1) * 100 : null;

  const setups = [];

  if (rsi !== null) {
    if (rsi < 25) setups.push({
      type: 'rsi-extreme-oversold', severity: 'high', emoji: '🔥',
      title: `${symbol} sobrevendido extremo (RSI ${rsi.toFixed(0)})`,
      description: `RSI<25 historicamente marca pontos de inversão. Zona clássica de compra, mas pode continuar caindo se houver notícia negativa.`
    });
    else if (rsi < 30) setups.push({
      type: 'rsi-oversold', severity: 'medium', emoji: '📈',
      title: `${symbol} sobrevendido (RSI ${rsi.toFixed(0)})`,
      description: `RSI<30 = zona de compra histórica. Confirme com suporte técnico e volume.`
    });
    if (rsi > 75) setups.push({
      type: 'rsi-extreme-overbought', severity: 'high', emoji: '⚠️',
      title: `${symbol} sobrecomprado extremo (RSI ${rsi.toFixed(0)})`,
      description: `RSI>75 = zona crítica de realização. Risco de correção forte.`
    });
    else if (rsi > 70) setups.push({
      type: 'rsi-overbought', severity: 'medium', emoji: '📉',
      title: `${symbol} sobrecomprado (RSI ${rsi.toFixed(0)})`,
      description: `RSI>70 = zona de realização. Tendência forte pode continuar, não venda só por isso.`
    });
  }

  if (ma50 && ma200 && ma50Prev && ma200Prev) {
    if (ma50Prev < ma200Prev && ma50 >= ma200) setups.push({
      type: 'golden-cross', severity: 'high', emoji: '🌟',
      title: `${symbol} fez CRUZ DOURADA`,
      description: `MM50 cruzou MM200 pra cima HOJE. Sinal clássico de início de tendência de alta de médio/longo prazo.`
    });
    if (ma50Prev > ma200Prev && ma50 <= ma200) setups.push({
      type: 'death-cross', severity: 'high', emoji: '💀',
      title: `${symbol} fez CRUZ DA MORTE`,
      description: `MM50 cruzou MM200 pra baixo HOJE. Sinal de início de tendência de baixa. Cautela com posições compradas.`
    });
  }

  if (ma9 && ma21) {
    if (last > ma9 && ma9 > ma21 && prev <= ma9) setups.push({
      type: 'trend-up-short', severity: 'medium', emoji: '⬆️',
      title: `${symbol} entrou em tendência curta de alta`,
      description: `Preço cruzou MM9 pra cima e MM9>MM21. Momentum positivo se confirma.`
    });
    if (last < ma9 && ma9 < ma21 && prev >= ma9) setups.push({
      type: 'trend-down-short', severity: 'medium', emoji: '⬇️',
      title: `${symbol} entrou em tendência curta de baixa`,
      description: `Preço cruzou MM9 pra baixo e MM9<MM21. Momentum negativo se confirma.`
    });
  }

  if (ma50 && last > ma50 * 1.20) setups.push({
    type: 'overextended', severity: 'medium', emoji: '⚠️',
    title: `${symbol} muito esticado`,
    description: `${((last/ma50-1)*100).toFixed(0)}% acima da MM50. Risco de correção pra média.`
  });

  // Variação muito forte do dia
  if (p7 !== null && p7 > 15) setups.push({
    type: 'rally-7d', severity: 'low', emoji: '🚀',
    title: `${symbol} subiu ${p7.toFixed(1)}% em 7 dias`,
    description: `Rally forte. Pode ser FOMO ou movimento legítimo. Combine com fundamentos.`
  });
  if (p7 !== null && p7 < -15) setups.push({
    type: 'crash-7d', severity: 'low', emoji: '🩸',
    title: `${symbol} caiu ${Math.abs(p7).toFixed(1)}% em 7 dias`,
    description: `Queda forte. Pode ser oportunidade ou início de tendência baixista — investigue causa.`
  });

  return {
    symbol, valid: true,
    indicators: { last, rsi, ma9, ma21, ma50, ma200, vol, p7, p30 },
    setups
  };
}

const SEVERITY = { low: 1, medium: 2, high: 3 };

export function filterByLevel(setups, minLevel = 'medium') {
  const min = SEVERITY[minLevel] || 2;
  return setups.filter(s => (SEVERITY[s.severity] || 1) >= min);
}
