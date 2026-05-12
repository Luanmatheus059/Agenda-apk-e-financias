// AGENTE FINANCEIRO — Cloudflare Worker
// Cron 1min, sem GitHub Actions, sem lag.
// Cola ESTE arquivo no editor do Cloudflare e clica Deploy.

const T1='8224992163';
const T2='AAF1B80laJI';
const T3='P9Re4f6mcAU5F5DRnhmiYG4';
const TOKEN=T1+':'+T2+'_'+T3;
const CHAT='5933857921';

async function quote(s){
  try{
    const r=await fetch('https://query1.finance.yahoo.com/v8/finance/chart/'+s+'?interval=15m&range=1d');
    const d=await r.json();
    const m=d.chart.result[0].meta;
    return {p:m.regularMarketPrice, c:(m.regularMarketPrice-m.previousClose)/m.previousClose*100};
  }catch(e){return null}
}

function pct(c){return c==null?'-':(c>=0?'🟢 +':'🔴 ')+c.toFixed(2)+'%'}
function intf(p){return p?Math.round(p).toLocaleString('de-DE'):'-'}

async function run(){
  const [ibov,usd,btc,petr,vale]=await Promise.all([
    quote('^BVSP'), quote('USDBRL=X'), quote('BTC-USD'),
    quote('PETR4.SA'), quote('VALE3.SA')
  ]);
  const t=new Date(Date.now()-3*3600*1000).toISOString().slice(11,16);
  const txt='📊 <b>'+t+' BR</b>\n\n'+
    'Ibov: '+intf(ibov?.p)+' '+pct(ibov?.c)+'\n'+
    'USD: '+(usd?'R$ '+usd.p.toFixed(4):'-')+' '+pct(usd?.c)+'\n'+
    'BTC: $'+intf(btc?.p)+' '+pct(btc?.c)+'\n'+
    'PETR4: '+(petr?'R$ '+petr.p.toFixed(2):'-')+' '+pct(petr?.c)+'\n'+
    'VALE3: '+(vale?'R$ '+vale.p.toFixed(2):'-')+' '+pct(vale?.c);
  await fetch('https://api.telegram.org/bot'+TOKEN+'/sendMessage', {
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({chat_id:CHAT, text:txt, parse_mode:'HTML'})
  });
}

export default {
  async fetch(){ await run(); return new Response('OK'); },
  async scheduled(ev, env, ctx){ ctx.waitUntil(run()); }
};
