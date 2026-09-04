const N = RAW.nodes;
N.forEach(n=>{ n.open = (n.d===0); });
const FAM = '"PingFang SC","Hiragino Sans GB","Source Han Sans SC","Noto Sans CJK SC","Microsoft YaHei",sans-serif';
const ROWH={0:38,1:34,2:26,3:21}, RAD={0:7,1:6.5,2:5.5,3:4.5},
      FONT={0:'700 20px',1:'700 18px',2:'500 15px',3:'13.5px'}, GAP=56, PADG=16;

let nG=0,nC=0,nI=0,nR=0;
N.forEach(n=>{ if(n.t==='group')nG++; else if(n.t==='concept'&&n.n!=='最容易混的')nC++;
               else if(n.t==='item')nI++; if(n.r)nR+=n.r.length; });
document.getElementById('stat').textContent =
  nG+' 域 · '+nC+' 概念 · '+nI+' 实体 · '+Math.round(nR/2)+' 条关联';

const mc=document.createElement('canvas').getContext('2d');
function measure(t,d){ mc.font=FONT[Math.min(d,3)]+' '+FAM; return mc.measureText(t).width; }
function labelW(n){ let w=measure(n.n,n.d); if(n.e) w+=9+measure(n.e,3)*.92; return w; }
function crumb(n){ const p=[]; let x=N[n.p]; while(x){ p.unshift(x.n); x=(x.p!=null)?N[x.p]:null; }
  return p.slice(1).join(' › '); }

let searching=false, sel=null, graph=true;
function txt(n){ return (n.n+' '+(n.e||'')+' '+(n.g||'')+' '+(n.m||'')).toLowerCase(); }

function visible(){
  const out=[];
  (function rec(n){ out.push(n);
    if(n.open) n.c.forEach(ci=>{ const c=N[ci];
      if(!searching || c.show || n.hit || c.reveal) rec(c); });
  })(N[0]);
  return out;
}
function layout(vis){
  let cur=0;
  (function rec(n){
    const ks = n.open ? n.c.map(i=>N[i]).filter(c=>!searching||c.show||n.hit||c.reveal) : [];
    if(ks.length){ if(n.d===1) cur+=PADG; ks.forEach(rec);
      n.x=(ks[0].x+ks[ks.length-1].x)/2; if(n.d===1) cur+=PADG; }
    else { const h=ROWH[Math.min(n.d,3)]; n.x=cur+h/2; cur+=h; }
  })(N[0]);
  const md=Math.max(...vis.map(n=>n.d)), cw=[];
  for(let i=0;i<=md;i++){ const a=vis.filter(n=>n.d===i); cw[i]=a.length?Math.max(...a.map(labelW)):0; }
  const cx=[0]; for(let i=1;i<=md;i++) cx[i]=cx[i-1]+cw[i-1]+GAP;
  vis.forEach(n=> n.y=cx[n.d]);
  return {h:cur, w:cx[md]+cw[md]+40};
}

const NS='http://www.w3.org/2000/svg';
const vp=document.getElementById('vp'), gA=document.getElementById('garcs'),
      gL=document.getElementById('glinks'), gN=document.getElementById('gnodes'),
      stage=document.getElementById('stage');
let tx=70,ty=40,k=1, BOX={w:1,h:1};
function applyVP(){ vp.setAttribute('transform','translate('+tx+','+ty+') scale('+k+')'); }
const nodeEl=new Map(), linkEl=new Map();
const DUR=420, AMAX=900;
function ease(t){ return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2; }
function lerp(a,b,t){ return a+(b-a)*t; }
function opOf(n){ return (searching && !n.hit && !n.onpath) ? .25 : 1; }
function pathD(p,c){ const m=(p.cy+c.cy)/2; return 'M'+p.cy+','+p.cx+'C'+m+','+p.cx+' '+m+','+c.cx+' '+c.cy+','+c.cx; }
function arcD(a,b){ const o=Math.min(460, 90+Math.abs(a.cx-b.cx)*.16);
  return 'M'+a.cy+','+a.cx+'C'+(a.cy+o)+','+a.cx+' '+(b.cy+o)+','+b.cx+' '+b.cy+','+b.cx; }

function mkNode(n){
  const g=document.createElementNS(NS,'g'); g.setAttribute('data-id',n.i);
  const r=RAD[Math.min(n.d,3)];
  const ring=document.createElementNS(NS,'circle'); ring.setAttribute('class','ring'); ring.setAttribute('r',r+4.5); g.appendChild(ring);
  const c=document.createElementNS(NS,'circle'); c.setAttribute('class','c'); c.setAttribute('r',r); g.appendChild(c);
  const t=document.createElementNS(NS,'text'); t.setAttribute('x',r+11); t.setAttribute('y',0);
  t.appendChild(document.createTextNode(n.n));
  if(n.e){ const s=document.createElementNS(NS,'tspan'); s.setAttribute('class','en');
    s.setAttribute('dx',9); s.setAttribute('font-size',12.5); s.textContent=n.e; t.appendChild(s); }
  g.appendChild(t); return g;
}
function clsOf(n){ let c='node lv'+Math.min(n.d,3);
  if(!n.c.length) c+=' leaf'; if(n.c.length&&!n.open) c+=' closed';
  if(searching&&n.hit) c+=' hit'; if(n.r&&n.r.length) c+=' rel'; if(sel===n) c+=' sel'; return c; }

let raf=null;
function render(src, instant){
  const vis=visible(); BOX=layout(vis);
  const want=new Set(vis.map(n=>n.i));
  const sox=src?(src.cx!=null?src.cx:src.x):N[0].x, soy=src?(src.cy!=null?src.cy:src.y):N[0].y;
  const snx=src?src.x:N[0].x, sny=src?src.y:N[0].y;
  const items=[], dead=[], dl=[];
  vis.forEach(n=>{ let el=nodeEl.get(n.i), en=false;
    if(!el){ el=mkNode(n); gN.appendChild(el); nodeEl.set(n.i,el); n.cx=sox; n.cy=soy; en=true; }
    el.setAttribute('class',clsOf(n));
    items.push({n,el,fx:n.cx,fy:n.cy,tx:n.x,ty:n.y,fo:en?0:(el.__o!=null?el.__o:1),to:opOf(n)}); });
  nodeEl.forEach((el,id)=>{ if(want.has(id))return; const n=N[id];
    items.push({n,el,fx:(n.cx!=null?n.cx:snx),fy:(n.cy!=null?n.cy:sny),tx:snx,ty:sny,
                fo:(el.__o!=null?el.__o:1),to:0}); dead.push(id); });
  const links=[];
  vis.forEach(n=>{ if(n.p==null)return; let el=linkEl.get(n.i);
    if(!el){ el=document.createElementNS(NS,'path'); el.setAttribute('class','link'); gL.appendChild(el); linkEl.set(n.i,el); }
    links.push({el,p:N[n.p],c:n,fo:(el.__o!=null?el.__o:1),to:opOf(n)}); });
  linkEl.forEach((el,id)=>{ if(want.has(id)&&N[id].p!=null)return; const n=N[id];
    links.push({el,p:(n.p!=null?N[n.p]:n),c:n,fo:(el.__o!=null?el.__o:1),to:0}); dl.push(id); });

  const arcs=[];
  gA.innerHTML='';
  if(graph && sel && sel.r){
    sel.r.forEach(([j])=>{ const o=N[j]; if(!want.has(j))return;
      const p=document.createElementNS(NS,'path'); p.setAttribute('class','arc'); gA.appendChild(p);
      arcs.push({el:p,a:sel,b:o}); });
  }
  const go = !instant && items.length<=AMAX;
  if(raf) cancelAnimationFrame(raf);
  const t0=performance.now();
  (function step(now){
    const t = go ? ease(Math.min(1,(now-t0)/DUR)) : 1;
    items.forEach(it=>{ it.n.cx=lerp(it.fx,it.tx,t); it.n.cy=lerp(it.fy,it.ty,t);
      it.el.setAttribute('transform','translate('+it.n.cy+','+it.n.cx+')');
      const o=lerp(it.fo,it.to,t); it.el.style.opacity=o; it.el.__o=o; });
    links.forEach(l=>{ l.el.setAttribute('d',pathD(l.p,l.c));
      const o=lerp(l.fo,l.to,t); l.el.style.opacity=o; l.el.__o=o; });
    arcs.forEach(a=> a.el.setAttribute('d',arcD(a.a,a.b)));
    if(t<1) raf=requestAnimationFrame(step);
    else { dead.forEach(i=>{const e=nodeEl.get(i); if(e)e.remove(); nodeEl.delete(i);});
           dl.forEach(i=>{const e=linkEl.get(i); if(e)e.remove(); linkEl.delete(i);}); raf=null; }
  })(performance.now());
  applyVP();
}

// ── 面板 ──────────────────────────────────────────────────────
const card=document.getElementById('card');
function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function paint(n){
  let h='<div class="crumb">'+(crumb(n)||'根')+'</div>';
  h+='<div class="nm">'+esc(n.n)+'</div>';
  if(n.e) h+='<div class="en2">'+esc(n.e)+'</div>';
  h+='<div class="rule"></div>';
  if(n.g) h+='<div class="gl">'+esc(n.g)+'</div>';
  if(n.m) h+='<div class="note">'+esc(n.m)+'</div>';
  // 草稿不美化：释义是起草的，判断句还没定稿，界面上就得说出来
  if(n.draft) h+='<div class="draftmark">草稿 · 事实已核，判断句待定稿</div>';
  if(n.c.length) h+='<div class="cnt">罩住 '+n.c.length+' 个'+(n.d===0?'域':n.d===1?'概念':'实体')+'</div>';
  else if(!n.m) h+='<div class="cnt">到底了，这是一个能指着看的东西</div>';
  if(n.r && n.r.length){
    const by={}; n.r.forEach(([j,lab])=>{ (by[lab]=by[lab]||[]).push(j); });
    let first=true;
    for(const lab in by){
      h+='<div class="relh'+(first?' first':'')+'"><b>'+esc(lab)+'</b>　'+by[lab].length+' 个</div>'; first=false;
      by[lab].forEach(j=>{ const o=N[j];
        h+='<div class="ri" data-go="'+j+'"><span class="rn">'+esc(o.n)+'</span>'
         + '<span class="rp">'+esc(crumb(o))+'</span></div>'; });
    }
  }
  card.innerHTML=h;
  mgShow(n);
}
card.addEventListener('click',e=>{ const r=e.target.closest('.ri'); if(!r)return; goto(+r.dataset.go); });
function reveal(n){ let p=(n.p!=null)?N[n.p]:null; while(p){ p.open=true; p.reveal=true; p=(p.p!=null)?N[p.p]:null; } n.reveal=true; }
function select(n){
  sel=n;
  if(graph && n.r) n.r.forEach(([j])=> reveal(N[j]));
  paint(n); render(n);
}
function goto(i){ const n=N[i]; reveal(n); select(n);
  viewTo((stage.clientWidth-444)/2 - n.y*k, stage.clientHeight/2 - n.x*k, k); }

gN.addEventListener('click', e=>{
  const g=e.target.closest('.node'); if(!g) return;
  const n=N[+g.dataset.id];
  if(e.target.tagName==='circle' && n.c.length){ n.open=!n.open; if(sel!==n){sel=n; paint(n);} render(n); }
  else select(n);
});

// ── 搜索 / 按钮 / 视图 ────────────────────────────────────────
const qEl=document.getElementById('q'), hitsEl=document.getElementById('hits');
qEl.addEventListener('input',()=>{
  const q=qEl.value.trim().toLowerCase();
  N.forEach(n=>{ n.hit=false; n.show=false; n.onpath=false; n.reveal=false; });
  if(!q){ searching=false; hitsEl.textContent=''; N.forEach(n=>n.open=(n.d===0)); sel=null; card.innerHTML=''; paint(N[0]); render(N[0]); viewTo(70,40,1); return; }
  searching=true; let c=0;
  N.forEach(n=>{ if(n.d>0 && txt(n).includes(q)){ n.hit=true; c++; } });
  N.forEach(n=>{ if(n.hit){ n.open=false; n.show=true; let p=(n.p!=null)?N[n.p]:null;
    while(p){ p.show=true; p.open=true; p.onpath=true; p=(p.p!=null)?N[p.p]:null; } } });
  hitsEl.textContent = c?('命中 '+c):'没有';
  render(N[0]); fit();
});
// Esc 有三个去处，按「最贴身的先响应」排：弹层 → 放大 → 清搜索
document.addEventListener('keydown',e=>{ if(e.key!=='Escape') return;
  if(mgPop.style.display==='block') return;      // 弹层开着，Esc 归弹层（graph.js 里接）
  if(document.body.classList.contains('mgbig')){ mgToggleBig(); return; }
  qEl.value=''; qEl.dispatchEvent(new Event('input')); });
document.querySelectorAll('.btn[data-a]').forEach(b=>b.addEventListener('click',()=>{
  const a=b.dataset.a; if(a==='fit'){ fit(); return; }
  searching=false; qEl.value=''; hitsEl.textContent='';
  N.forEach(n=>{ n.hit=false; n.show=false; n.onpath=false; n.reveal=false; });
  if(a==='groups') N.forEach(n=> n.open=(n.d===0));
  if(a==='concepts') N.forEach(n=> n.open=(n.d<=1));
  if(a==='all') N.forEach(n=> n.open=true);
  render(N[0], a==='all'); if(a==='all'){ viewTo(40,30,.5); } else fit();
}));
const bg=document.getElementById('bgraph');
bg.addEventListener('click',()=>{ graph=!graph; bg.classList.toggle('on',graph);
  stage.classList.toggle('graph',graph); if(sel) select(sel); else render(N[0]); });

let vraf=null;
function viewTo(x,y,z){ if(vraf) cancelAnimationFrame(vraf);
  const x0=tx,y0=ty,z0=k,t0=performance.now();
  (function st(now){ const t=ease(Math.min(1,(now-t0)/460));
    tx=lerp(x0,x,t); ty=lerp(y0,y,t); k=lerp(z0,z,t); applyVP();
    if(t<1) vraf=requestAnimationFrame(st); else vraf=null; })(performance.now()); }
function fit(){ const W=stage.clientWidth-474, H=stage.clientHeight-60;
  let z=Math.min(W/Math.max(BOX.w,1), H/Math.max(BOX.h,1), 1.6); z=Math.max(z,.06);
  viewTo(40, 30+Math.max(0,(H-BOX.h*z)/2), z); }
let drag=false,sx=0,sy=0;
stage.addEventListener('mousedown',e=>{ if(e.target.closest('.node'))return;
  if(vraf){cancelAnimationFrame(vraf);vraf=null;} drag=true; stage.classList.add('drag'); sx=e.clientX-tx; sy=e.clientY-ty; });
window.addEventListener('mousemove',e=>{ if(!drag)return; tx=e.clientX-sx; ty=e.clientY-sy; applyVP(); });
window.addEventListener('mouseup',()=>{ drag=false; stage.classList.remove('drag'); });
stage.addEventListener('wheel',e=>{ e.preventDefault(); if(vraf){cancelAnimationFrame(vraf);vraf=null;}
  const r=stage.getBoundingClientRect(), mx=e.clientX-r.left, my=e.clientY-r.top;
  const nk=Math.min(2.6,Math.max(.03,k*(e.deltaY<0?1.12:1/1.12)));
  tx=mx-(mx-tx)*(nk/k); ty=my-(my-ty)*(nk/k); k=nk; applyVP(); },{passive:false});
