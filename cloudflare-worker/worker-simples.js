// AGENTE FINANCEIRO — Cloudflare Worker v3 COMPLETO
// • Snapshot mercado (sempre)
// • Notícias PT-BR com FOTO (1x por hora)
// • Dashboard PNG via QuickChart (1x por hora)
// • Sala de sinais (a cada 30 min)
// Cron: * * * * * (cada minuto, mas envia diferente baseado no horário)

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

// Notícias PT-BR via rss2json (sem CORS issue)
async function getNews(){
  const sources = [
    {url:'https://www.infomoney.com.br/feed/', name:'InfoMoney'},
    {url:'https://www.moneytimes.com.br/feed/', name:'MoneyTimes'},
    {url:'https://valor.globo.com/valor-investe/rss/', name:'Valor'},
  ];
  const all = [];
  for(const s of sources){
    try{
      const r = await fetch('https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(s.url));
      const d = await r.json();
      for(const item of (d.items||[]).slice(0,2)){
        let img = item.thumbnail || item.enclosure?.link;
        if(!img && item.description){
          const m = item.description.match(/<img[^>]+src=["']([^"']+)["']/);
          if(m) img = m[1];
        }
        all.push({title:item.title, link:item.link, source:s.name, image:img, date:item.pubDate});
      }
    }catch(e){}
  }
  return all.slice(0, 5);
}

function pct(c){return c==null?'-':(c>=0?'🟢 +':'🔴 ')+c.toFixed(2)+'%'}
function intf(p){return p?Math.round(p).toLocaleString('de-DE'):'-'}

async function send(text){
  await fetch('https://api.telegram.org/bot'+TOKEN+'/sendMessage', {
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({chat_id:CHAT, text:text, parse_mode:'HTML'})
  });
}

async function sendPhoto(photoUrl, caption){
  await fetch('https://api.telegram.org/bot'+TOKEN+'/sendPhoto', {
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({chat_id:CHAT, photo:photoUrl, caption:caption.slice(0,1024), parse_mode:'HTML'})
  });
}

async function sendSnapshot(){
  const [stocks, cg, usd] = await Promise.all([
    brapi(['IBOV','PETR4','VALE3','ITUB4','BBAS3']),
    coingecko(), awesome()
  ]);
  const ibov = stocks.IBOV, petr = stocks.PETR4, vale = stocks.VALE3, itub = stocks.ITUB4, bbas = stocks.BBAS3;
  const btc = cg.btc;
  const t = new Date(Date.now()-3*3600*1000).toISOString().slice(11,16);

  let txt = '📊 <b>SNAPSHOT — '+t+' BR</b>\n━━━━━━━━━━━━━━━━━━━\n\n';
  txt += '<b>📊 ÍNDICES</b>\n';
  txt += 'Ibov: '+intf(ibov?.p)+' pts '+pct(ibov?.c)+'\n';
  txt += 'USD: '+(usd?'R$ '+usd.p.toFixed(4):'-')+' '+pct(usd?.c)+'\n';
  txt += 'BTC: US$ '+intf(btc?.p)+' '+pct(btc?.c)+'\n\n';
  txt += '<b>📈 BLUE CHIPS</b>\n';
  txt += 'PETR4: '+(petr?'R$ '+petr.p.toFixed(2):'-')+' '+pct(petr?.c)+'\n';
  txt += 'VALE3: '+(vale?'R$ '+vale.p.toFixed(2):'-')+' '+pct(vale?.c)+'\n';
  txt += 'ITUB4: '+(itub?'R$ '+itub.p.toFixed(2):'-')+' '+pct(itub?.c)+'\n';
  txt += 'BBAS3: '+(bbas?'R$ '+bbas.p.toFixed(2):'-')+' '+pct(bbas?.c)+'\n\n';
  txt += '🤖 <b>AGENTE IA</b>\n';
  const score = (ibov?.c||0) - (usd?.c||0)*0.5 + (btc?.c||0)*0.3;
  if(score > 0.5) txt += '🟢 <b>TENDÊNCIA ALTA</b> — Procurar entrada em pullback';
  else if(score < -0.5) txt += '🔴 <b>TENDÊNCIA QUEDA</b> — Defender posições';
  else txt += '⚪ <b>LATERAL</b> — DCA funciona melhor';
  await send(txt);
}

async function sendNews(){
  const news = await getNews();
  if(!news.length) return;
  for(let i=0; i<Math.min(3, news.length); i++){
    const n = news[i];
    const cap = '📰 <b>NOTÍCIA '+(i+1)+'/'+Math.min(3,news.length)+'</b>\n━━━━━━━━━━━━━━━━━━━\n<b>'+n.title.slice(0,250)+'</b>\n\n📡 '+n.source+(n.link?'\n🔗 <a href="'+n.link+'">Ler matéria</a>':'');
    if(n.image){
      try{ await sendPhoto(n.image, cap); }catch(e){ await send(cap); }
    } else {
      await send(cap);
    }
  }
}

async function sendChart(){
  const stocks = await brapi(['PETR4','VALE3','ITUB4','BBAS3','MGLU3','WEGE3','BBDC4','ABEV3','ITSA4','BBSE3']);
  const items = Object.entries(stocks).filter(([s,d])=>d.c!=null).sort((a,b)=>b[1].c-a[1].c);
  if(!items.length) return;
  const labels = items.map(([s])=>s);
  const data = items.map(([s,d])=>d.c.toFixed(2));
  const colors = items.map(([s,d])=>d.c>=0?'#22c55e':'#ef4444');
  const cfg = {
    type:'horizontalBar',
    data:{labels, datasets:[{label:'Variação %', data, backgroundColor:colors}]},
    options:{
      title:{display:true, text:'📊 VARIAÇÃO % POR AÇÃO HOJE', fontColor:'#d4af37', fontSize:18},
      legend:{display:false},
      scales:{xAxes:[{ticks:{fontColor:'#fff'}}], yAxes:[{ticks:{fontColor:'#fff'}}]},
      plugins:{datalabels:{anchor:'end', align:'end', color:'#fff', font:{weight:'bold'}}}
    }
  };
  const chartUrl = 'https://quickchart.io/chart?bkg=%230a0a0a&w=800&h=500&c='+encodeURIComponent(JSON.stringify(cfg));
  await sendPhoto(chartUrl, '📊 <b>DASHBOARD AO VIVO</b>\nVariação de hoje · 10 blue chips\n<i>Atualizado automaticamente</i>');
}

async function run(){
  const min = new Date().getUTCMinutes();
  await sendSnapshot();
  if(min === 0 || min === 30) await sendNews();
  if(min === 15 || min === 45) await sendChart();
}

export default {
  async fetch(){ await run(); return new Response('OK\n'); },
  async scheduled(ev, env, ctx){ ctx.waitUntil(run()); }
};
