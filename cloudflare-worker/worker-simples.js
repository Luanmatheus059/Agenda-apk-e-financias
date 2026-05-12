// AGENTE FINANCEIRO — Cloudflare Worker v2 (fontes confiáveis)
// Cron 1min, sem GitHub Actions, sem lag.

const T1='8224992163';
const T2='AAF1B80laJI';
const T3='P9Re4f6mcAU5F5DRnhmiYG4';
const TOKEN=T1+':'+T2+'_'+T3;
const CHAT='5933857921';

async function brapi(syms){
  try{
    const r = await fetch('https://brapi.dev/api/quote/'+syms.join(','));
    const d = await r.json();
    const out = {};
    for(const x of (d.results||[])){
      out[x.symbol] = {p: x.regularMarketPrice, c: x.regularMarketChangePercent||0};
    }
    return out;
  }catch(e){return {}}
}

async function coingecko(){
  try{
    const r = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd&include_24hr_change=true');
    const d = await r.json();
    return {
      btc: d.bitcoin ? {p: d.bitcoin.usd, c: d.bitcoin.usd_24h_change||0} : null,
      eth: d.ethereum ? {p: d.ethereum.usd, c: d.ethereum.usd_24h_change||0} : null
    };
  }catch(e){return {}}
}

async function awesome(){
  try{
    const r = await fetch('https://economia.awesomeapi.com.br/last/USD-BRL');
    const d = await r.json();
    if(d.USDBRL) return {p: parseFloat(d.USDBRL.bid), c: parseFloat(d.USDBRL.pctChange)||0};
  }catch(e){}
  return null;
}

function pct(c){return c==null?'-':(c>=0?'🟢 +':'🔴 ')+c.toFixed(2)+'%'}
function intf(p){return p?Math.round(p).toLocaleString('de-DE'):'-'}

async function run(){
  const [stocks, cg, usd] = await Promise.all([
    brapi(['IBOV','PETR4','VALE3','ITUB4','BBAS3']),
    coingecko(),
    awesome()
  ]);

  const ibov = stocks.IBOV, petr = stocks.PETR4, vale = stocks.VALE3, itub = stocks.ITUB4, bbas = stocks.BBAS3, btc = cg.btc;

  const t = new Date(Date.now()-3*3600*1000).toISOString().slice(11,16);
  const txt = '📊 <b>'+t+' BR</b>\n\n' +
    '<b>📊 ÍNDICES</b>\n' +
    'Ibov: '+intf(ibov?.p)+' pts '+pct(ibov?.c)+'\n' +
    'USD: '+(usd?'R$ '+usd.p.toFixed(4):'-')+' '+pct(usd?.c)+'\n' +
    'BTC: $'+intf(btc?.p)+' '+pct(btc?.c)+'\n\n' +
    '<b>📈 BLUE CHIPS</b>\n' +
    'PETR4: '+(petr?'R$ '+petr.p.toFixed(2):'-')+' '+pct(petr?.c)+'\n' +
    'VALE3: '+(vale?'R$ '+vale.p.toFixed(2):'-')+' '+pct(vale?.c)+'\n' +
    'ITUB4: '+(itub?'R$ '+itub.p.toFixed(2):'-')+' '+pct(itub?.c)+'\n' +
    'BBAS3: '+(bbas?'R$ '+bbas.p.toFixed(2):'-')+' '+pct(bbas?.c);

  const res = await fetch('https://api.telegram.org/bot'+TOKEN+'/sendMessage', {
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({chat_id:CHAT, text:txt, parse_mode:'HTML'})
  });
  return res.ok;
}

export default {
  async fetch(){
    const ok = await run();
    return new Response(ok ? 'OK\n' : 'FAIL\n', {status: ok?200:500});
  },
  async scheduled(ev, env, ctx){ ctx.waitUntil(run()); }
};
