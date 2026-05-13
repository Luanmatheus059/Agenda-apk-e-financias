// Agente Financeiro Worker v12 - compact paste-safe
const T='8224992163:AAF1B80laJI_P9Re4f6mcAU5F5DRnhmiYG4';
const C='5933857921';
const UA='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

const BR=['PETR4.SA','VALE3.SA','ITUB4.SA','BBAS3.SA','BBDC4.SA','MGLU3.SA','WEGE3.SA','ABEV3.SA','ITSA4.SA','BBSE3.SA','TAEE11.SA','VIVT3.SA','RENT3.SA','SUZB3.SA','EGIE3.SA','PRIO3.SA'];
const US=['AAPL','MSFT','GOOGL','AMZN','TSLA','NVDA','META'];
const ETF=['BOVA11.SA','IVVB11.SA','HASH11.SA','BRAX11.SA'];
const FII=['MXRF11.SA','HGLG11.SA','KNRI11.SA','VISC11.SA','XPLG11.SA'];
const CRI=['BTC-USD','ETH-USD','SOL-USD','BNB-USD','XRP-USD','ADA-USD','DOGE-USD','AVAX-USD'];
const FX=['USDBRL=X','EURBRL=X','GBPBRL=X','JPYBRL=X'];
const IDX=['^BVSP','^GSPC','^IXIC','^DJI','^N225','^FTSE','^GDAXI'];
const COM=['GC=F','CL=F','SI=F'];

const NEWS=[
'https://www.infomoney.com.br/feed/',
'https://br.investing.com/rss/news_25.rss',
'https://www.moneytimes.com.br/feed/',
'https://www.infomoney.com.br/mercados/feed/',
'https://valor.globo.com/valor-investe/rss/',
'https://br.investing.com/rss/news_11.rss',
'https://br.investing.com/rss/news_301.rss',
'https://www.moneytimes.com.br/category/economia/feed/'
];

async function yh(s){
  try{
    const r=await fetch('https://query1.finance.yahoo.com/v8/finance/chart/'+s+'?interval=1d&range=30d',{headers:{'User-Agent':UA}});
    const d=await r.json();
    const x=d&&d.chart&&d.chart.result&&d.chart.result[0];
    if(!x)return null;
    const m=x.meta;
    const q=x.indicators&&x.indicators.quote&&x.indicators.quote[0];
    if(!m||!m.regularMarketPrice||!m.previousClose)return null;
    const o=((q&&q.open)||[]).filter(v=>v!=null);
    const c=((q&&q.close)||[]).filter(v=>v!=null);
    return{p:m.regularMarketPrice,c:(m.regularMarketPrice-m.previousClose)/m.previousClose*100,o,cl:c,n:s.replace('.SA','').replace('=X','').replace('-USD','').replace('^','')};
  }catch(e){return null}
}

async function tg(t){
  await fetch('https://api.telegram.org/bot'+T+'/sendMessage',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({chat_id:C,text:t,parse_mode:'HTML',disable_web_page_preview:'true'})
  });
}

async function tp(p,cap){
  await fetch('https://api.telegram.org/bot'+T+'/sendPhoto',{
    method:'POST',
    headers:{'Content-Type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({chat_id:C,photo:p,caption:cap.slice(0,1024),parse_mode:'HTML'})
  });
}

function pct(c){if(c==null)return'-';return(c>=0?'🟢 +':'🔴 ')+c.toFixed(2)+'%'}
function f2(p){return p?p.toFixed(2):'-'}
function f4(p){return p?p.toFixed(4):'-'}
function intf(p){return p?Math.round(p).toLocaleString('de-DE'):'-'}

function bt(){return new Date(Date.now()-3*3600*1000)}
function ts(){return bt().toISOString().slice(11,16)}

function st(){
  const t=bt(),h=t.getUTCHours(),d=t.getUTCDay();
  if(d===0||d===6)return'fim';
  if(h<10)return'pre';
  if(h<17)return'aberto';
  if(h<18)return'leilao';
  return'fechado';
}

function candle(name,o,cl){
  const n=Math.min(15,o.length);
  const op=o.slice(-n),clo=cl.slice(-n);
  const cfg={type:'bar',data:{labels:op.map((_,i)=>'D'+(n-i)),datasets:[{label:name,data:clo.map((c,i)=>[op[i],c]),backgroundColor:clo.map((c,i)=>c>=op[i]?'#22c55e':'#ef4444')}]},options:{title:{display:true,text:name+' '+n+'d',fontColor:'#d4af37'},legend:{display:false}}};
  return'https://quickchart.io/chart?bkg=%230a0a0a&w=900&h=500&c='+encodeURIComponent(JSON.stringify(cfg));
}

function pressao(name,o,cl){
  let bu=0,be=0;
  for(let i=0;i<cl.length;i++){if(cl[i]>=o[i])bu++;else be++}
  const tot=bu+be;
  const bp=tot?Math.round(bu/tot*100):50;
  const ep=tot?Math.round(be/tot*100):50;
  const cfg={type:'doughnut',data:{labels:['Compradores '+bp+'%','Vendedores '+ep+'%'],datasets:[{data:[bu,be],backgroundColor:['#22c55e','#ef4444']}]},options:{title:{display:true,text:'Pressao '+name,fontColor:'#d4af37'},legend:{labels:{fontColor:'#fff'}}}};
  return{url:'https://quickchart.io/chart?bkg=%230a0a0a&w=700&h=500&c='+encodeURIComponent(JSON.stringify(cfg)),bp,ep};
}

async function sc(sym,name){
  const r=await yh(sym);
  if(!r||r.o.length<3)return;
  const url=candle(name,r.o,r.cl);
  const p=r.p<10?f4(r.p):f2(r.p);
  await tp(url,'🕯️ <b>'+name+'</b> '+p+' '+pct(r.c));
}

async function sp(sym,name){
  const r=await yh(sym);
  if(!r||r.o.length<5)return;
  const{url,bp,ep}=pressao(name,r.o,r.cl);
  let an;
  if(bp>=65)an='🟢 FORCA COMPRADORA dominante.';
  else if(bp>=55)an='🟢 Leve vantagem compradores.';
  else if(ep>=65)an='🔴 FORCA VENDEDORA dominante.';
  else if(ep>=55)an='🔴 Leve vantagem vendedores.';
  else an='⚪ EQUILIBRIO.';
  await tp(url,'⚖️ <b>PRESSAO '+name+'</b>\nCompradores: '+bp+'%\nVendedores: '+ep+'%\n'+an);
}

async function cat(arr,emoji,titulo,prefix,fmt){
  const data=await Promise.all(arr.map(s=>yh(s)));
  const valid=data.filter(x=>x);
  if(!valid.length)return;
  valid.sort((a,b)=>b.c-a.c);
  let txt=emoji+' <b>'+titulo+' '+ts()+'</b>\n\n';
  for(const x of valid)txt+=x.n+': '+prefix+(fmt==='int'?intf(x.p):fmt==='4'?f4(x.p):f2(x.p))+' '+pct(x.c)+'\n';
  await tg(txt);
  const top=valid[0];
  await sc(arr[data.indexOf(top)],top.n);
  await sp(arr[data.indexOf(top)],top.n);
}

async function sendIdx(){await cat(IDX,'🌍','INDICES MUNDIAIS','','int')}
async function sendBR(){await cat(BR,'📈','ACOES BR','R$ ','2')}
async function sendUS(){await cat(US,'🇺🇸','ACOES USA','$','2')}
async function sendCri(){await cat(CRI,'₿','CRIPTO 24/7','$','int')}
async function sendFx(){await cat(FX,'💱','FOREX','R$ ','4')}
async function sendETF(){await cat(ETF.concat(FII),'📊','ETFs e FIIs','R$ ','2')}
async function sendCom(){await cat(COM,'🏆','COMMODITIES','$','2')}

async function sendNews(idx){
  const got=[];
  for(const off of [0,4]){
    try{
      const url=NEWS[(idx+off)%NEWS.length];
      const r=await fetch('https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(url));
      const d=await r.json();
      const items=(d&&d.items||[]).slice(0,3);
      for(const it of items){
        let img=it.thumbnail||(it.enclosure&&it.enclosure.link);
        if(!img&&it.description){const m=it.description.match(/<img[^>]+src=["']([^"']+)["']/);if(m)img=m[1]}
        got.push({t:it.title,l:it.link,i:img});
      }
    }catch(e){}
  }
  const seen=new Set(),uniq=[];
  for(const n of got){
    const k=(n.t||'').toLowerCase().replace(/[^a-z0-9]/g,'').slice(0,40);
    if(k&&!seen.has(k)){seen.add(k);uniq.push(n)}
  }
  for(let i=0;i<Math.min(3,uniq.length);i++){
    const n=uniq[i];
    const cap='📰 <b>NOTICIA '+(i+1)+'</b>\n<b>'+(n.t||'').slice(0,200)+'</b>\n🔗 <a href="'+n.l+'">Ler</a>';
    if(n.i){try{await tp(n.i,cap)}catch(e){await tg(cap)}}else await tg(cap);
  }
}

function rsi(c){
  if(c.length<15)return null;
  let g=0,l=0;
  for(let i=c.length-14;i<c.length;i++){const d=c[i]-c[i-1];if(d>0)g+=d;else l-=d}
  if(l===0)return 100;
  return 100-100/(1+g/l);
}

function sma(c,n){if(c.length<n)return null;return c.slice(-n).reduce((a,b)=>a+b,0)/n}

async function sendSig(){
  const data=await Promise.all(BR.slice(0,15).map(s=>yh(s)));
  const sin=[];
  for(const x of data){
    if(!x||!x.cl||x.cl.length<20)continue;
    const r=rsi(x.cl),s20=sma(x.cl,20),s50=sma(x.cl,50);
    let setup,desc;
    if(r&&r<30&&x.c<-1){setup='🟢 COMPRA sobrevenda';desc='RSI '+Math.round(r)+' reversao provavel'}
    else if(r&&r>75&&x.c>1){setup='🔴 TOPO';desc='RSI '+Math.round(r)+' correcao provavel'}
    else if(s20&&s50&&s20>s50*1.005&&x.p>s20&&x.c>0.5){setup='🟢 TENDENCIA ALTA';desc='MM20>MM50 bull'}
    else if(s20&&s50&&s20<s50*0.995&&x.p<s20&&x.c<-0.5){setup='🔴 TENDENCIA QUEDA';desc='MM20<MM50 fraqueza'}
    if(setup){
      const lg=setup.indexOf('🟢')>=0;
      const stp=lg?+(x.p*0.97).toFixed(2):+(x.p*1.03).toFixed(2);
      const tgt=lg?+(x.p*1.05).toFixed(2):+(x.p*0.95).toFixed(2);
      sin.push({n:x.n,p:x.p,c:x.c,r,setup,desc,stp,tgt});
    }
  }
  if(!sin.length){await tg('⚪ <b>SEM SETUPS</b> Mercado equilibrado tecnicamente.');return}
  let t='🎯 <b>SINAIS '+ts()+'</b>\n\n';
  for(const s of sin.slice(0,5)){
    t+='<b>'+s.n+'</b> R$ '+s.p.toFixed(2)+' '+pct(s.c)+'\n'+s.setup+' RSI '+Math.round(s.r)+'\n<i>'+s.desc+'</i>\n🛑 '+s.stp+' 🎯 '+s.tgt+'\n\n';
  }
  await tg(t+'⚠️ <i>Educacional. Stop obrigatorio.</i>');
}

async function sendRank(){
  const arr=BR.concat(ETF);
  const data=await Promise.all(arr.map(s=>yh(s)));
  const valid=data.filter(x=>x);
  valid.sort((a,b)=>b.c-a.c);
  const top=valid.slice(0,10);
  const cfg={type:'horizontalBar',data:{labels:top.map(x=>x.n),datasets:[{data:top.map(x=>+x.c.toFixed(2)),backgroundColor:top.map(x=>x.c>=0?'#22c55e':'#ef4444')}]},options:{title:{display:true,text:'TOP 10 BR',fontColor:'#d4af37'},legend:{display:false}}};
  const url='https://quickchart.io/chart?bkg=%230a0a0a&w=800&h=500&c='+encodeURIComponent(JSON.stringify(cfg));
  await tp(url,'🏆 <b>RANKING BR HOJE</b>');
}

const EST=[];
EST.push('📚 RSI varia 0-100. >70 sobrecomprado <30 sobrevendido. Em uptrend forte RSI 50 ja e compra.');
EST.push('📚 DY = dividendo/preco. Top BR: PETR4 12% BBAS3 10% TAEE11 9% VALE3 8%. Cheque payout e divida.');
EST.push('📚 MM20>MM50 ALTA. MM20 cruza MM50 cima = GOLDEN CROSS. Cruza baixo = DEATH CROSS.');
EST.push('📚 Diversifique: 60% RV (acoes ETF FII) 30% RF (Selic CDB) 10% Cripto+Ouro. Rebalanceie 6/6 meses.');
EST.push('📚 COMPRA: RSI<30 uptrend pullback MM20. VENDA: RSI>75 stop atingido fundamento mudou.');
EST.push('📚 R/R = (alvo-entrada)/(entrada-stop). Nunca opere R/R abaixo de 1:2.');
EST.push('📚 P/L preco/lucro. P/VP preco/patrim. ROE >15%. Divida/EBITDA <3. Margem >10%.');
EST.push('📚 B3: 09h45-10h pre-abertura. 10h-17h pregao. 17h-17h25 leilao. Apos: after-market.');
EST.push('📚 Pressao: verde% dias em alta vermelho% em queda. >65% verde = tendencia forte alta.');
EST.push('📚 Candle verde fechou acima abertura. Vermelho abaixo. Corpo grande = forca. Pavio = rejeicao.');

async function sendEst(){
  const t=bt(),i=(t.getUTCHours()*60+t.getUTCMinutes())%EST.length;
  await tg('🎓 <b>ESTUDO</b>\n\n'+EST[i]);
}

async function run(){
  const s=st(),m=new Date().getUTCMinutes();
  if(s==='fim'){
    if(m===0)await sendCri();
    else if(m===15)await sendNews(0);
    else if(m===30)await sendEst();
    else if(m===45)await sendNews(2);
    return;
  }
  if(s==='pre'){
    if(m===0)await sendIdx();
    else if(m===10)await sendNews(0);
    else if(m===20)await sendCri();
    else if(m===30)await sendFx();
    else if(m===40)await sendNews(3);
    else if(m===50)await sendEst();
    return;
  }
  if(s==='leilao'||s==='fechado'){
    if(m===0)await sendRank();
    else if(m===15)await sendNews(1);
    else if(m===30)await sendEst();
    else if(m===45)await sendNews(5);
    else if(m===5||m===25||m===50)await sendCri();
    return;
  }
  if(m===0)await sendIdx();
  else if(m===5)await sendBR();
  else if(m===10)await sendNews(0);
  else if(m===15)await sendCri();
  else if(m===20)await sendFx();
  else if(m===25)await sendETF();
  else if(m===30)await sendSig();
  else if(m===35)await sendUS();
  else if(m===40)await sendNews(4);
  else if(m===45)await sendCom();
  else if(m===50)await sendRank();
  else if(m===55)await sendEst();
}

export default{
  async fetch(r,e,c){return new Response('Agente Financeiro ativo. Cron 1min via scheduled handler.')},
  async scheduled(e,n,c){c.waitUntil(run())}
};
