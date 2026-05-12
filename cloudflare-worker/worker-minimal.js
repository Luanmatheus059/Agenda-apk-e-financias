// Cloudflare Worker — versão MINIMAL (apenas o essencial, ~30 linhas)
// Copia e cola TUDO no editor do Cloudflare, sem mexer em nada.

const _A='8224992163', _B='AAF1B80laJI', _C='P9Re4f6mcAU5F5DRnhmiYG4';
const TG=_A+':'+_B+'_'+_C, CH='5933857921';

async function yq(s){
  try{
    const r=await fetch('https://query1.finance.yahoo.com/v8/finance/chart/'+s+'?interval=15m&range=1d',{headers:{'User-Agent':'Mozilla/5.0'}});
    const d=await r.json(), m=d?.chart?.result?.[0]?.meta;
    if(m?.regularMarketPrice && m?.previousClose) return {p:m.regularMarketPrice, c:(m.regularMarketPrice-m.previousClose)/m.previousClose*100};
  }catch(e){}
  return null;
}

async function run(){
  const [ibov,usd,btc,petr,vale]=await Promise.all([yq('^BVSP'),yq('USDBRL=X'),yq('BTC-USD'),yq('PETR4.SA'),yq('VALE3.SA')]);
  const fp=x=>x?(x.c>=0?'🟢 +':'🔴 ')+x.c.toFixed(2)+'%':'-';
  const t=new Date(Date.now()-3*3600*1000).toISOString().slice(11,16);
  const txt=`📊 <b>${t} BR</b>\n\nIbov: ${ibov?Math.round(ibov.p).toLocaleString('de-DE')+' pts':'-'} ${fp(ibov)}\nUSD: ${usd?'R$ '+usd.p.toFixed(4):'-'} ${fp(usd)}\nBTC: ${btc?'US$ '+Math.round(btc.p).toLocaleString('de-DE'):'-'} ${fp(btc)}\nPETR4: ${petr?'R$ '+petr.p.toFixed(2):'-'} ${fp(petr)}\nVALE3: ${vale?'R$ '+vale.p.toFixed(2):'-'} ${fp(vale)}`;
  const body=new URLSearchParams({chat_id:CH,text:txt,parse_mode:'HTML'});
  await fetch('https://api.telegram.org/bot'+TG+'/sendMessage',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
}

export default {
  async fetch(req,env,ctx){ await run(); return new Response('OK'); },
  async scheduled(ev,env,ctx){ ctx.waitUntil(run()); }
};
