// AGENTE FINANCEIRO — Cloudflare Worker v4
// Snapshot mercado + Dashboard PNG + Notícias com foto

const T1='8224992163';
const T2='AAF1B80laJI';
const T3='P9Re4f6mcAU5F5DRnhmiYG4';
const TOKEN=T1+':'+T2+'_'+T3;
const CHAT='5933857921';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

// Yahoo Finance via /v8/chart com User-Agent
async function yh(sym){
  try{
    const r = await fetch('https://query1.finance.yahoo.com/v8/finance/chart/'+sym+'?interval=15m&range=1d', {
      headers: {'User-Agent': UA, 'Accept': 'application/json'}
    });
    const d = await r.json();
    const m = d?.chart?.result?.[0]?.meta;
    if(m?.regularMarketPrice && m?.previousClose){
      return {p: m.regularMarketPrice, c: (m.regularMarketPrice - m.previousClose)/m.previousClose*100};
    }
  }catch(e){}
  return null;
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

async function getNews(){
  const sources = [
    {url:'https://www.infomoney.com.br/feed/', name:'InfoMoney'},
    {url:'https://www.moneytimes.com.br/feed/', name:'MoneyTimes'},
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
        all.push({title:item.title, link:item.link, source:s.name, image:img});
      }
    }catch(e){}
  }
  return all.slice(0,4);
}

function pct(c){return c==null?'-':(c>=0?'🟢 +':'🔴 ')+c.toFixed(2)+'%'}
function intf(p){return p?Math.round(p).toLocaleString('de-DE'):'-'}

async function send(text){
  await fetch('https://api.telegram.org/bot'+TOKEN+'/sendMessage', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({chat_id:CHAT, text, parse_mode:'HTML'})
  });
}
async function sendPhoto(photo, caption){
  await fetch('https://api.telegram.org/bot'+TOKEN+'/sendPhoto', {
    method:'POST', headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body: new URLSearchParams({chat_id:CHAT, photo, caption:caption.slice(0,1024), parse_mode:'HTML'})
  });
}

async function sendSnapshot(){
  const [ibov,petr,vale,itub,bbas,cg,usd] = await Promise.all([
    yh('^BVSP'), yh('PETR4.SA'), yh('VALE3.SA'), yh('ITUB4.SA'), yh('BBAS3.SA'),
    coingecko(), awesome()
  ]);
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
  const score = (ibov?.c||0) - (usd?.c||0)*0.5 + (btc?.c||0)*0.3;
  txt += '🤖 <b>AGENTE IA</b>\n';
  if(score>0.5) txt += '🟢 <b>TENDÊNCIA ALTA</b>';
  else if(score<-0.5) txt += '🔴 <b>TENDÊNCIA QUEDA</b>';
  else txt += '⚪ <b>LATERAL</b>';
  await send(txt);
}

async function sendNews(){
  const news = await getNews();
  for(let i=0; i<news.length; i++){
    const n = news[i];
    const cap = '📰 <b>NOTÍCIA '+(i+1)+'/'+news.length+'</b>\n━━━━━━━━━━━━━━━━━━━\n<b>'+n.title.slice(0,250)+'</b>\n\n📡 '+n.source+(n.link?'\n🔗 <a href="'+n.link+'">Ler matéria</a>':'');
    if(n.image){ try{ await sendPhoto(n.image, cap); }catch(e){ await send(cap); } }
    else await send(cap);
  }
}

async function sendChart(){
  const syms = ['PETR4.SA','VALE3.SA','ITUB4.SA','BBAS3.SA','MGLU3.SA','WEGE3.SA','BBDC4.SA','ABEV3.SA','ITSA4.SA','BBSE3.SA'];
  const res = await Promise.all(syms.map(s=>yh(s)));
  const items = syms.map((s,i)=>({sym:s.replace('.SA',''), d:res[i]})).filter(x=>x.d).sort((a,b)=>b.d.c-a.d.c);
  if(!items.length) return;
  const cfg = {
    type:'horizontalBar',
    data:{labels:items.map(x=>x.sym), datasets:[{data:items.map(x=>x.d.c.toFixed(2)), backgroundColor:items.map(x=>x.d.c>=0?'#22c55e':'#ef4444')}]},
    options:{title:{display:true,text:'📊 VARIAÇÃO % HOJE',fontColor:'#d4af37',fontSize:18},legend:{display:false},
      scales:{xAxes:[{ticks:{fontColor:'#fff'}}],yAxes:[{ticks:{fontColor:'#fff'}}]}}
  };
  const url = 'https://quickchart.io/chart?bkg=%230a0a0a&w=800&h=500&c='+encodeURIComponent(JSON.stringify(cfg));
  await sendPhoto(url, '📊 <b>DASHBOARD AO VIVO</b>\n'+items.length+' blue chips ranqueadas');
}

async function run(){
  const min = new Date().getUTCMinutes();
  await sendSnapshot();
  if(min===0 || min===30) await sendNews();
  if(min===15 || min===45) await sendChart();
}

export default {
  async fetch(){ await run(); return new Response('OK\n'); },
  async scheduled(ev,env,ctx){ ctx.waitUntil(run()); }
};
