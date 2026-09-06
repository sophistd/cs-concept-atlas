/**
 * [INPUT]: 依赖树视图的节点、选中导航与绘制工具，消费组合和内联图标数据。
 * [OUTPUT]: 提供 mgShow、mgToggleBig 与 mgPop，协调关联图布局、导航、弹层及平移缩放。
 * [POS]: src 的关联视图，与 tree.js 共享选中对象；弹层自己消费输入，避免污染图谱状态。
 * [PROTOCOL]: 变更时更新此头部，然后检查 CLAUDE.md
 */
// ── 右栏 · 关联图谱 ────────────────────────────────────────────
// 树只画得出「罩住」这一层，跨罩子的关联在树里是断的。这块面板把它接上：
// 以选中的节点为圆心，按跳数往外铺最多三圈，圈与圈之间的线就是关系本身。
// 一跳 = 一条关系。三跳 = 关系的关系的关系，再远就没有可读性了。
// 关系按相似、配合和依赖三族组织，具体标签仍区分实现语言与运行环境。
// 是从「一团乱麻」里捞回可读性最省力的办法。
const MREL={
 '同一个东西'  :{f:'same',c:'#E8590C',d:'',      w:2,  a:0},
 '同一类的东西':{f:'same',c:'#E8590C',d:'4 3',   w:1.2,a:0},
 '可以互相替代':{f:'same',c:'#E8590C',d:'1.5 3', w:1.2,a:0},
 '固定搭配'    :{f:'pair',c:'#2F7D74',d:'',      w:1.4,a:0},
 '底下用的是'  :{f:'dep', c:'#3B6FA0',d:'',      w:1.4,a:1},
 '被谁当底座'  :{f:'dep', c:'#3B6FA0',d:'',      w:1.4,a:2},
 '跑在……之上' :{f:'dep', c:'#3B6FA0',d:'',      w:1.4,a:1},
 '跑在它之上的':{f:'dep', c:'#3B6FA0',d:'',      w:1.4,a:2},
 '用什么语言实现':{f:'dep',c:'#3B6FA0',d:'',     w:1.4,a:1},
 '用于实现'    :{f:'dep', c:'#3B6FA0',d:'',      w:1.4,a:2}};
const MINV={'被谁当底座':'底下用的是','跑在它之上的':'跑在……之上','用于实现':'用什么语言实现'};
const MTRE={f:'tree',c:'#C7C2B8',d:'',w:.9,a:0};

// 同一个东西常常同时挂在好几个概念下 —— 树里它们是几个不同的点，图谱里得是一个。
// 并查集只吃「同一个东西」这一种边，把散落的落点缝成一个代表；关系取各落点的并集。
const MREP=new Int32Array(N.length), MFAM=new Map();
(function(){
  for(let i=0;i<N.length;i++) MREP[i]=i;
  const find=x=>{ while(MREP[x]!==x){ MREP[x]=MREP[MREP[x]]; x=MREP[x]; } return x; };
  N.forEach(n=>(n.r||[]).forEach(([j,l])=>{
    if(l!=='同一个东西'||!N[j]) return;
    const a=find(n.i), b=find(j); if(a!==b) MREP[a]=b; }));
  const fam=new Map();
  for(let i=0;i<N.length;i++){ const r=find(i); let a=fam.get(r); if(!a) fam.set(r,a=[]); a.push(i); }
  fam.forEach(mem=>{
    let head=mem[0];
    if(mem.length>1){
      // 代表取类里最常见的那个名字（JavaScript ×3 + JavaScript（动作）→ 取 JavaScript），
      // 同名的取关联最多的那一份，再平手取下标最小的
      const cnt=new Map(); mem.forEach(i=>cnt.set(N[i].n,(cnt.get(N[i].n)||0)+1));
      let bc=0, bn=N[mem[0]].n;
      cnt.forEach((c,nm)=>{ if(c>bc||(c===bc&&nm.length<bn.length)){ bc=c; bn=nm; } });
      head=mem.filter(i=>N[i].n===bn)
              .sort((x,y)=>((N[y].r||[]).length-(N[x].r||[]).length)||x-y)[0];
    }
    mem.forEach(i=>MREP[i]=head); MFAM.set(head,mem);
  });
})();
const mrep=i=>MREP[i];

// 关联边建一次索引（在代表空间里）：反向标签折成正向，同一对节点的同一种关系只留一条
const MNBR=new Map(), MEDG=new Map();
(function(){
  const seen=new Set();
  // 邻接表记到「族」这一层：关掉某一族之后，BFS 得据此重算谁还够得着
  const link=(k,v,f)=>{ let m=MNBR.get(k); if(!m) MNBR.set(k,m=new Map());
    let s=m.get(v); if(!s) m.set(v,s=new Set()); s.add(f); };
  N.forEach(n=>(n.r||[]).forEach(([j,lab])=>{
    let a=n.i,b=j,l=lab; if(MINV[l]){ a=j; b=n.i; l=MINV[l]; }
    const st=MREL[l]; if(!st||!N[b]) return;
    a=mrep(a); b=mrep(b); if(a===b) return;   // 类内部的「同一个东西」已被合并，自然消失
    const key = st.a ? 'd'+a+'>'+b+'|'+l : 's'+Math.min(a,b)+'~'+Math.max(a,b)+'|'+l;
    if(seen.has(key)) return; seen.add(key);
    const pk=Math.min(a,b)+'~'+Math.max(a,b);
    let arr=MEDG.get(pk); if(!arr) MEDG.set(pk,arr=[]);
    arr.push({a,b,lab:l,st}); link(a,b,st.f); link(b,a,st.f);
  }));
})();

const mgP=document.getElementById('mgp'), mgWrap=document.getElementById('mgwrap'),
      mgVP=document.getElementById('mgvp'), mgEg=document.getElementById('mge'),
      mgNg=document.getElementById('mgn'), mgCrumb=document.getElementById('mgc'),
      mgEmpty=document.getElementById('mgempty'), mgMore=document.getElementById('mgmore'),
      mgBar=document.getElementById('mgbar'), mgPop=document.getElementById('mgpop'),
      mgFoot=document.getElementById('mgfoot'),
      mgTip=document.getElementById('mgtip');
let mgCenter=0, mgSel=0, mgHops=3,
    mgOff=new Set(),        // 关掉的关系族（图例上点灭的那些）
    mgHide=new Set(),       // 手工摘掉的点（⌥点）
    mgPin=new Set(),        // 手工钉进来的点（＋），跳数够不着也照画
    mgBundle=null,          // 当前组合的下标；非空时不按跳数铺，只画这一组
    mgLive=new Map(), mgEls={n:new Map(),e:[]}, mgRaf=null, mgBox=[],
    mgTx=0, mgTy=0, mgK=1, mgPos=null;
const mgTree=()=>!mgOff.has('tree');

const mgBig=()=>document.body.classList.contains('mgbig');
function mgCap(){ return mgBig()?170:25; }          // 一屏能读的上限。25 = 根节点那 1+24 个域正好铺满一圈
function mgFamN(i){ const f=MFAM.get(i); return f?f.length:1; }
// 节点属于哪个域（往上走到 d===1 那一层）。域是图标挂靠的维度。
const mgDomCache=new Map();
function mgDom(i){ if(mgDomCache.has(i)) return mgDomCache.get(i);
  let x=N[i]; while(x.p!=null && x.d>1) x=N[x.p];
  const v = x.d===1 ? x.n : null; mgDomCache.set(i,v); return v; }
function mgName(i){ return (i===mgCenter && N[mgSel]) ? N[mgSel].n : N[i].n; }
function mgBadge(i){ const c=mgFamN(i); return c>1?'×'+c:''; }
function mgR(h){ return h===0?9:h===1?7:h===2?6:5.5; }   // 图标半边长（旧版是圆点半径）
function mgTW(t,fs){ mc.font=fs+'px '+FAM; return mc.measureText(t).width; }
function mgLbl(i,h){ const t=mgName(i), m=h<=1?15:9; return t.length>m ? t.slice(0,m)+'…' : t; }

// 一条关联边只要还剩至少一个没被关掉的族，两端就算连着
function mgOn(i,j){ const m=MNBR.get(i); if(!m) return false;
  const fs=m.get(j); if(!fs) return false;
  for(const f of fs) if(!mgOff.has(f)) return true;
  return false; }

// 把一组固定的点按图上的距离排进圈里（组合模式用：点集是给定的，只需要定谁在第几圈）
function mgRank(ids, ci){
  const set=new Set(ids), hop=new Map([[ci,0]]), par=new Map([[ci,null]]);
  let fr=[ci];
  for(let h=1; fr.length && hop.size<set.size; h++){
    const nx=[];
    fr.forEach(x=>{
      const m=MNBR.get(x); if(m) m.forEach((_,j)=>{ if(set.has(j)&&!hop.has(j)&&mgOn(x,j)){
        hop.set(j,Math.min(h,3)); par.set(j,x); nx.push(j); } });
      if(mgTree()) MFAM.get(x).forEach(mi=>{ const n=N[mi];
        [n.p!=null?mrep(n.p):null, ...n.c.map(mrep)].forEach(y=>{
          if(y!=null&&set.has(y)&&!hop.has(y)){ hop.set(y,Math.min(h,3)); par.set(y,x); nx.push(y); } }); });
    });
    fr=nx;
  }
  // 组合里够不着中心的，挂在最外圈 —— 它仍是这一组的成员，不能不画
  ids.forEach(i=>{ if(!hop.has(i)){ hop.set(i,3); par.set(i,ci); } });
  return {hop,par};
}

// 广度优先铺圈。关联边权重 3、罩住边权重 1 —— 名额不够时先保关联。
function mgWalk(ci){
  if(mgBundle!=null) return mgBundleWalk(ci);
  const hop=new Map([[ci,0]]), par=new Map([[ci,null]]);
  let fr=[ci], cut=0;
  for(let h=1;h<=mgHops;h++){
    const cand=new Map();
    const bump=(j,p,s)=>{ if(mgHide.has(j)||hop.has(j)) return;
      const v=cand.get(j); if(v){ v.s+=s; } else cand.set(j,{s,p}); };
    fr.forEach(x=>{
      const m=MNBR.get(x); if(m) m.forEach((_,j)=>{ if(mgOn(x,j)) bump(j,x,3); });
      // 「罩住」只在头两跳里当背景板：给中心补树上的邻居，但不拿它继续往外探。
      // 合并过的节点有好几个落点，每个落点的父与子都算。
      if(mgTree() && h<=2) MFAM.get(x).forEach(mi=>{ const n=N[mi];
        if(n.p!=null){ const p=mrep(n.p); if(p!==x) bump(p,x,1); }
        n.c.forEach(kk=>{ const c=mrep(kk); if(c!==x) bump(c,x,1); }); });
    });
    if(!cand.size) break;
    const list=[...cand].sort((p,q)=> q[1].s-p[1].s || p[0]-q[0]);
    const take=list.slice(0, Math.max(0, mgCap()-hop.size-mgPin.size));
    cut += list.length-take.length;
    if(!take.length) break;
    take.forEach(([j,v])=>{ hop.set(j,h); par.set(j,v.p); });
    fr=take.map(x=>x[0]);
  }
  // 钉住的点：跳数够不着也要画，挂最外圈
  mgPin.forEach(i=>{ if(i!==ci && !hop.has(i) && !mgHide.has(i)){
    hop.set(i,Math.min(mgHops,3)); par.set(i,ci); } });
  return mgEdges([...hop.keys()], hop, par, cut);
}

// 组合模式：点集由 data/bundles.json 定死，不按跳数铺
function mgBundleWalk(ci){
  const b=BUNDLES[mgBundle];
  const ids=[...new Set(b.members.map(m=>mrep(m.i)).concat([...mgPin]))]
    .filter(i=>!mgHide.has(i));
  if(!ids.includes(ci)) ids.unshift(ci);
  const {hop,par}=mgRank(ids, ci);
  return mgEdges(ids, hop, par, 0);
}

// 收边：点集定了之后，把这些点之间还亮着的边都捡出来
function mgEdges(ids, hop, par, cut){
  const set=new Set(ids), es=[], done=new Set();
  ids.forEach(i=>{ const m=MNBR.get(i); if(!m) return;
    m.forEach((_,j)=>{ if(!set.has(j)) return;
      const pk=Math.min(i,j)+'~'+Math.max(i,j); if(done.has(pk)) return; done.add(pk);
      MEDG.get(pk).forEach(e=>{ if(!mgOff.has(e.st.f)) es.push(e); }); }); });
  if(mgTree()){ const td=new Set();
    ids.forEach(i=> MFAM.get(i).forEach(mi=>{ const n=N[mi]; if(n.p==null) return;
      const p=mrep(n.p); if(p===i||!set.has(p)||td.has(p+'>'+i)) return;
      td.add(p+'>'+i); es.push({a:p,b:i,lab:'罩住',st:MTRE}); })); }
  return {hop,par,ids,es,cut};
}

// 径向布局：每圈一个半径，孩子按子树大小分扇区 —— 同一支血脉留在同一个方向上
function mgLay(nb){
  const {hop,par,ids}=nb, kid=new Map(); ids.forEach(i=>kid.set(i,[]));
  ids.forEach(i=>{ const p=par.get(i); if(p!=null && kid.has(p)) kid.get(p).push(i); });
  const wt=new Map();
  const wof=i=>{ if(wt.has(i)) return wt.get(i);
    wt.set(i,1); const k=kid.get(i)||[];
    const v=k.length? k.reduce((s,x)=>s+wof(x),0) : 1; wt.set(i,v); return v; };
  wof(mgCenter);
  const cnt=[0,0,0,0]; ids.forEach(i=>cnt[hop.get(i)]++);
  const gap=mgBig()?112:88, step=mgBig()?28:24, R=[0];
  for(let h=1;h<=3;h++) R[h]=Math.max(R[h-1]+gap, cnt[h]*step/(2*Math.PI));
  const pos=new Map([[mgCenter,{x:0,y:0,h:0,a:0}]]);
  (function place(i,a0,a1){
    const k=kid.get(i)||[]; if(!k.length) return;
    const tot=k.reduce((s,x)=>s+wof(x),0)||1; let a=a0;
    k.forEach(x=>{ const sp=(a1-a0)*wof(x)/tot, mid=a+sp/2, r=R[hop.get(x)];
      pos.set(x,{x:Math.cos(mid)*r, y:Math.sin(mid)*r, h:hop.get(x), a:mid});
      place(x, a+sp*.05, a+sp*.95); a+=sp; });
  })(mgCenter, -Math.PI/2, -Math.PI/2+Math.PI*2);
  return pos;
}

// 标签能挂就挂，挂不下的省掉 —— 圆点还在，名字悬停时从 tooltip 里出来
function mgLabels(nb,pos){
  mgBox=[]; const show=new Set();
  [...nb.ids].sort((a,b)=>pos.get(a).h-pos.get(b).h || a-b).forEach(i=>{
    const p=pos.get(i); if(!p) return;
    const fs=p.h===0?13:p.h===1?12.5:11.5, r=mgR(p.h), bd=mgBadge(i);
    const w=mgTW(mgLbl(i,p.h),fs)+(bd?4+mgTW(bd,10.5):0), hh=fs+5;
    let x,y=p.y;
    if(p.h===0){ x=p.x-w/2; y=p.y+r+15; }
    else if(Math.cos(p.a)<0) x=p.x-r-5-w;
    else x=p.x+r+5;
    const b={x,y:y-hh/2,w,h:hh};
    if(mgBox.some(o=>!(b.x+b.w<o.x||o.x+o.w<b.x||b.y+b.h<o.y||o.y+o.h<b.y))) return;
    mgBox.push(b); show.add(i);
  });
  return show;
}

function mgApply(){ mgVP.setAttribute('transform','translate('+mgTx+','+mgTy+') scale('+mgK+')'); }
function mgFit(pos){
  let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;
  pos.forEach(p=>{ const r=mgR(p.h)+4;
    x0=Math.min(x0,p.x-r); x1=Math.max(x1,p.x+r); y0=Math.min(y0,p.y-r); y1=Math.max(y1,p.y+r); });
  mgBox.forEach(b=>{ x0=Math.min(x0,b.x); x1=Math.max(x1,b.x+b.w); y0=Math.min(y0,b.y); y1=Math.max(y1,b.y+b.h); });
  const W=mgWrap.clientWidth||360, H=mgWrap.clientHeight||220;
  mgK=Math.max(.1, Math.min((W-16)/Math.max(x1-x0,1), (H-16)/Math.max(y1-y0,1), 1.45));
  mgTx=W/2-(x0+x1)/2*mgK; mgTy=H/2-(y0+y1)/2*mgK; mgApply();
}
function mgD(p,q,trim,bend){
  let cx=(p.x+q.x)/2, cy=(p.y+q.y)/2;
  if(bend){ cx*=.5; cy*=.5; }              // 控制点往圆心收 —— 弦线成束，不再满屏乱穿
  let x=q.x,y=q.y;
  if(trim){ const dx=q.x-cx,dy=q.y-cy,L=Math.hypot(dx,dy)||1; x-=dx/L*trim; y-=dy/L*trim; }
  return 'M'+p.x+','+p.y+'Q'+cx+','+cy+' '+x+','+y; }

function mgShow(n){
  if(!n) return;
  mgSel=n.i; mgCenter=mrep(n.i);
  mgCrumb.textContent='以 '+n.n+' 为心';
  const nb=mgWalk(mgCenter);
  mgP.classList.toggle('empty', nb.ids.length<=1);
  mgEmpty.innerHTML = mgTree()
    ? '这个节点是孤点：<br>既没有跨罩子的关联，也没有下一层'
    : '这个节点没有跨罩子的关联<br><span style="color:var(--or)">底下把「罩住」点亮，看它在树里的邻居</span>';
  if(nb.cut && !mgBig()){ mgMore.textContent='还有 '+nb.cut+' 个没画下，放大看全 ⤢'; mgMore.dataset.on='1'; }
  else { mgMore.textContent = nb.cut ? ('还有 '+nb.cut+' 个没画下') : ''; delete mgMore.dataset.on; }
  mgPaintBar();
  const pos=mgLay(nb), show=mgLabels(nb,pos); mgPos=pos;
  mgEg.innerHTML=''; mgNg.innerHTML='';
  const cur=new Map(), nEls=new Map(), eEls=[];
  nb.ids.forEach(i=>{ const p=pos.get(i); if(!p) return;
    const f=mgLive.get(i)||mgLive.get(nb.par.get(i))||{x:0,y:0};
    cur.set(i,{x:f.x,y:f.y,fx:f.x,fy:f.y,tx:p.x,ty:p.y,h:p.h,a:p.a}); });
  nb.es.forEach(e=>{ if(!cur.has(e.a)||!cur.has(e.b)) return;
    const el=document.createElementNS(NS,'path'); el.setAttribute('class','mge');
    el.setAttribute('stroke',e.st.c); el.setAttribute('stroke-width',e.st.w);
    if(e.st.d) el.setAttribute('stroke-dasharray',e.st.d);
    el.setAttribute('opacity', e.st===MTRE?.34:.72);
    if(e.st.a) el.setAttribute('marker-end','url(#mgarr)');
    const rad = nb.par.get(e.b)===e.a || nb.par.get(e.a)===e.b;
    mgEg.appendChild(el); eEls.push({el,e,bend:!rad}); });
  nb.ids.forEach(i=>{ const c=cur.get(i); if(!c) return;
    const g=document.createElementNS(NS,'g');
    g.setAttribute('class','mgn h'+Math.min(c.h,3)+(mgPin.has(i)?' pin':''));
    g.setAttribute('data-i',i);
    mgPaint(g, i, mgR(c.h)*2, c.h);
    if(show.has(i)){ const t=document.createElementNS(NS,'text'), r=mgR(c.h), bd=mgBadge(i);
      if(c.h===0){ t.setAttribute('x',0); t.setAttribute('y',r+15); t.setAttribute('text-anchor','middle'); }
      else if(Math.cos(c.a)<0){ t.setAttribute('x',-r-5); t.setAttribute('text-anchor','end'); }
      else t.setAttribute('x',r+5);
      t.appendChild(document.createTextNode(mgLbl(i,c.h)));
      if(bd){ const b=document.createElementNS(NS,'tspan'); b.setAttribute('class','mgx');
        b.setAttribute('dx',4); b.textContent=bd; t.appendChild(b); }
      g.appendChild(t); }
    mgNg.appendChild(g); nEls.set(i,g); });
  mgEls={n:nEls,e:eEls};
  mgFit(pos);
  if(mgRaf) cancelAnimationFrame(mgRaf);
  const t0=performance.now(), go=mgLive.size>0;
  (function step(now){
    const t=go?ease(Math.min(1,(now-t0)/380)):1;
    cur.forEach((c,i)=>{ c.x=lerp(c.fx,c.tx,t); c.y=lerp(c.fy,c.ty,t);
      nEls.get(i).setAttribute('transform','translate('+c.x+','+c.y+')'); });
    eEls.forEach(o=>{ const p=cur.get(o.e.a), q=cur.get(o.e.b);
      o.el.setAttribute('d', mgD(p,q, o.e.st.a ? mgR(q.h)+7 : 0, o.bend)); });
    if(t<1) mgRaf=requestAnimationFrame(step);
    else { mgRaf=null; mgLive=new Map([...cur].map(([i,c])=>[i,{x:c.tx,y:c.ty}])); }
  })(performance.now());
}

// 悬停：把不相干的线和点压暗，只留这个节点身上挂着的那些
function mgFocus(i){
  const keep=new Set([i]);
  mgEls.e.forEach(o=>{ if(o.e.a===i||o.e.b===i){ keep.add(o.e.a); keep.add(o.e.b); } });
  mgEls.e.forEach(o=>{ const on=(o.e.a===i||o.e.b===i);
    o.el.setAttribute('opacity', on?1:.08);
    o.el.setAttribute('stroke-width', on?o.e.st.w+.7:o.e.st.w); });
  mgEls.n.forEach((el,j)=> el.style.opacity = keep.has(j)?1:.22);
}
function mgBlur(){
  mgEls.e.forEach(o=>{ o.el.setAttribute('opacity', o.e.st===MTRE?.34:.72);
    o.el.setAttribute('stroke-width', o.e.st.w); });
  mgEls.n.forEach(el=> el.style.opacity=1);
}
mgNg.addEventListener('mouseover',e=>{ const g=e.target.closest('.mgn'); if(!g) return;
  const i=+g.dataset.i, n=N[i], fam=MFAM.get(i);
  mgFocus(i);
  const rel=(MNBR.get(i)||new Set()).size;
  const where = fam.length>1
    ? '出现在 '+fam.length+' 处：<br>'+fam.slice(0,5).map(m=>esc(crumb(N[m])||'根')).join('<br>')
      +(fam.length>5?'<br>…':'')
    : esc(crumb(n)||'根');
  mgTip.innerHTML='<b>'+esc(mgName(i))+'</b>'+(n.e?' '+esc(n.e):'')
    +'<br>'+where+'<br>'+(rel?rel+' 个关联对象':'尚无跨领域关联')
    +'<br><span style="color:#9A958C">点＝换中心　·　⌥点＝摘掉</span>';
  mgTip.style.opacity=1; });
mgNg.addEventListener('mouseout',e=>{ if(e.target.closest('.mgn')){ mgBlur(); mgTip.style.opacity=0; } });
mgWrap.addEventListener('mousemove',e=>{
  const w=mgTip.offsetWidth||200, x=Math.min(e.clientX+14, innerWidth-w-10);
  mgTip.style.left=x+'px'; mgTip.style.top=(e.clientY+16)+'px'; });
mgNg.addEventListener('click',e=>{ const g=e.target.closest('.mgn'); if(!g) return;
  const i=+g.dataset.i; mgTip.style.opacity=0;
  if(e.altKey){                                  // ⌥点＝把这个点从图里摘掉
    if(i===mgCenter) return;                     // 圆心摘不得，摘了这张图就没了
    mgPin.delete(i); mgHide.add(i);
    mgLive.delete(i); mgShow(N[mgSel]); return; }
  if(i!==mgCenter) goto(i); });

// 圈数 / 罩住 / 放大
document.querySelectorAll('#mghops .gb').forEach(b=>b.addEventListener('click',()=>{
  mgHops=+b.dataset.h;
  document.querySelectorAll('#mghops .gb').forEach(o=>o.classList.toggle('on',o===b));
  mgLive.clear(); mgShow(N[mgSel]); }));
// 图例上的四个色块就是四个开关：点灭一族，这一族的边连同它带出来的点一起消失。
// 这是从「一团乱麻」里捞回可读性最省力的一档。
mgFoot.addEventListener('click',e=>{ const k=e.target.closest('.mgk'); if(!k) return;
  const f=k.dataset.k;
  if(mgOff.has(f)) mgOff.delete(f); else mgOff.add(f);
  k.classList.toggle('on', !mgOff.has(f));
  mgLive.clear(); mgShow(N[mgSel]); });
function mgToggleBig(){
  document.body.classList.toggle('mgbig');
  document.getElementById('mgbig').classList.toggle('on', mgBig());
  mgClosePop();
  mgLive.clear();
  mgShow(N[mgSel]);                                  // 点集立刻重算，不等下一帧
  requestAnimationFrame(()=>{ if(mgPos) mgFit(mgPos); });   // 面板尺寸下一帧才准，到时再套一次
}
document.getElementById('mgbig').addEventListener('click',mgToggleBig);
mgMore.addEventListener('click',()=>{ if(mgMore.dataset.on) mgToggleBig(); });

// 面板自己的平移缩放，跟主画布互不干扰
let mgDrag=false, mgSx=0, mgSy=0, mgPointer=null;
mgWrap.addEventListener('pointerdown',e=>{
  if(e.button!==0 || mgDrag || e.target.closest('#mgpop') || e.target.closest('.mgn')) return;
  mgDrag=true; mgPointer=e.pointerId; mgWrap.classList.add('drag');
  mgWrap.setPointerCapture(e.pointerId);
  mgSx=e.clientX-mgTx; mgSy=e.clientY-mgTy; e.stopPropagation(); });
window.addEventListener('pointermove',e=>{ if(!mgDrag || e.pointerId!==mgPointer) return;
  mgTx=e.clientX-mgSx; mgTy=e.clientY-mgSy; mgApply(); });
function mgEndDrag(e){ if(e.pointerId!==mgPointer) return;
  mgDrag=false; mgPointer=null; mgWrap.classList.remove('drag'); }
window.addEventListener('pointerup',mgEndDrag);
window.addEventListener('pointercancel',mgEndDrag);
mgWrap.addEventListener('lostpointercapture',mgEndDrag);
mgWrap.addEventListener('wheel',e=>{ if(e.target.closest('#mgpop')) return; e.preventDefault();
  const r=mgWrap.getBoundingClientRect(), mx=e.clientX-r.left, my=e.clientY-r.top;
  const nk=Math.min(3,Math.max(.08, mgK*(e.deltaY<0?1.12:1/1.12)));
  mgTx=mx-(mx-mgTx)*(nk/mgK); mgTy=my-(my-mgTy)*(nk/mgK); mgK=nk; mgApply(); },{passive:false});
mgWrap.addEventListener('dblclick',e=>{ if(e.target.closest('#mgpop')) return;
  mgLive.clear(); mgShow(N[mgSel]); });
addEventListener('resize',()=>{ if(mgPos) mgFit(mgPos); });


// ── 画一个节点：域图标 + 透明命中区 ──────────────────────────────
// 图标挂在「域」上（24 个域各一个 lucide 图标）——这样一圈点扫过去，
// 哪些是前端、哪些是数据库、哪些是基础设施，不用读字就看得出来。
function mgPaint(g, i, size, hop){
  if(hop===0){                                   // 圆心衬一块橙底，图标反白
    const disc=document.createElementNS(NS,'circle');
    disc.setAttribute('class','disc'); disc.setAttribute('r',size*.62); g.appendChild(disc);
  }
  const spec=ICON[mgDom(i)];
  if(spec){
    const w=document.createElementNS(NS,'g'); w.setAttribute('class','mgi');
    w.setAttribute('transform','translate('+(-size/2)+','+(-size/2)+') scale('+(size/24)+')');
    spec.forEach(([tag,at])=>{ const e=document.createElementNS(NS,tag);
      for(const k in at) e.setAttribute(k,at[k]); w.appendChild(e); });
    g.appendChild(w);
  } else {                                       // 根节点不属于任何域，退回圆点
    const c=document.createElementNS(NS,'circle');
    c.setAttribute('class','dot'); c.setAttribute('r',size*.34); g.appendChild(c);
  }
  if(mgPin.has(i)){                              // 钉住的点描一圈，跟顺路走到的区分开
    const r=document.createElementNS(NS,'circle');
    r.setAttribute('class','pinr'); r.setAttribute('r',size*.78); g.appendChild(r);
  }
  const hit=document.createElementNS(NS,'circle');
  hit.setAttribute('class','hit'); hit.setAttribute('r',Math.max(size*.7,8)); g.appendChild(hit);
}

// ── 加减状态条：手工改过的东西要看得见，也要能一键还原 ────────────
function mgPaintBar(){
  const bits=[];
  if(mgBundle!=null) bits.push('<b class="bun">组合 · '+esc(BUNDLES[mgBundle].name)+'</b>');
  if(mgPin.size)  bits.push('钉住 '+mgPin.size);
  if(mgHide.size) bits.push('摘掉 '+mgHide.size);
  if(mgOff.size)  bits.push('关了 '+mgOff.size+' 族关系');
  mgBar.innerHTML = bits.length
    ? bits.join('　·　')+'　<button class="gb" id="mgreset">还原</button>' : '';
  mgBar.style.display = bits.length ? 'flex' : 'none';
  const r=document.getElementById('mgreset');
  if(r) r.onclick=()=>{ mgBundle=null; mgPin.clear(); mgHide.clear(); mgOff.clear();
    document.querySelectorAll('#mgfoot .mgk').forEach(k=>k.classList.add('on'));
    document.getElementById('mgbun').classList.remove('on');
    mgLive.clear(); mgShow(N[mgSel]); };
}

// ── 弹层：加点 与 选组合 共用一个 ───────────────────────────────
function mgClosePop(){ mgPop.style.display='none'; mgPop.innerHTML=''; mgPop.onclick=null;
  delete mgPop.dataset.kind;
  document.getElementById('mgadd').classList.remove('on');
  if(mgBundle==null) document.getElementById('mgbun').classList.remove('on'); }
function mgOpenPop(html){ mgPop.innerHTML=html; mgPop.style.display='block'; }

// ＋ 把某个节点钉进这张图。跳数够不着也照画 —— 这是「增加关联对象」那一半。
document.getElementById('mgadd').addEventListener('click',function(){
  if(mgPop.style.display==='block' && mgPop.dataset.kind==='add'){ mgClosePop(); return; }
  mgClosePop(); this.classList.add('on'); mgPop.dataset.kind='add';
  mgOpenPop('<input id="mgq" placeholder="加谁进来？搜名字…"/><div id="mgres"></div>');
  const q=document.getElementById('mgq'), res=document.getElementById('mgres');
  const draw=()=>{
    const v=q.value.trim().toLowerCase();
    if(!v){ res.innerHTML='<div class="mgh">打字搜，回车加第一个</div>'; return; }
    const seen=new Set(), hit=[];
    for(const n of N){
      if(n.d===0||hit.length>=9) continue;
      const r=mrep(n.i); if(seen.has(r)) continue;
      if(txt(n).includes(v)){ seen.add(r); hit.push(r); }
    }
    res.innerHTML = hit.length
      ? hit.map(r=>'<div class="mgr" data-i="'+r+'"><b>'+esc(N[r].n)+'</b>'
          +(mgFamN(r)>1?' <span class="x">×'+mgFamN(r)+'</span>':'')
          +'<span class="p">'+esc(crumb(N[r])||'根')+'</span></div>').join('')
      : '<div class="mgh">没有这个</div>';
  };
  const add=i=>{ if(!Number.isInteger(i) || !N[i]) return;
    mgHide.delete(i); mgPin.add(i); mgClosePop(); mgLive.clear(); mgShow(N[mgSel]); };
  q.addEventListener('input',draw);
  q.addEventListener('keydown',e=>{ if(e.key==='Enter'){ const f=res.querySelector('.mgr'); if(f) add(+f.dataset.i); }
    else if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); mgClosePop(); } });
  res.addEventListener('click',e=>{ const r=e.target.closest('.mgr[data-i]'); if(r) add(+r.dataset.i); });
  draw(); q.focus();
});

// 组合：现成的一组对象，一次调出来。不按跳数铺 —— 成员是谁由 data/bundles.json 定死。
document.getElementById('mgbun').addEventListener('click',function(){
  if(mgPop.style.display==='block' && mgPop.dataset.kind==='bun'){ mgClosePop(); return; }
  mgClosePop(); this.classList.add('on'); mgPop.dataset.kind='bun';
  mgOpenPop('<div class="mgh">现成的组合 —— 挑一个，图上只画这一组</div>'
    + (mgBundle!=null?'<div class="mgr" data-b="-1"><b>← 退出组合，回到按跳数铺</b></div>':'')
    + BUNDLES.map((b,k)=>'<div class="mgr'+(k===mgBundle?' on':'')+'" data-b="'+k+'"><b>'+esc(b.name)
        +'</b><span class="x">'+b.members.length+' 个</span>'
        +'<span class="p">'+esc(b.note)+'</span></div>').join(''));
  mgPop.onclick=e=>{ if(mgPop.dataset.kind!=='bun') return;
    const r=e.target.closest('.mgr[data-b]'); if(!r) return;
    const k=+r.dataset.b;
    if(!/^-?\d+$/.test(r.dataset.b) || !Number.isInteger(k) || k < -1 || k >= BUNDLES.length) return;
    mgBundle = k<0 ? null : k;
    document.getElementById('mgbun').classList.toggle('on', mgBundle!=null);
    mgClosePop(); mgLive.clear();
    // 进组合就把圆心挪到这一组的头号成员上，否则会以一个组外的点为心
    if(mgBundle!=null){ const first=mrep(BUNDLES[mgBundle].members[0].i);
      if(!BUNDLES[mgBundle].members.some(m=>mrep(m.i)===mrep(mgSel))) goto(first); else mgShow(N[mgSel]); }
    else mgShow(N[mgSel]); };
});
document.addEventListener('keydown',e=>{ if(e.key==='Escape' && mgPop.style.display==='block'){
  e.preventDefault(); mgClosePop(); } });
