/* =========================================================================
   UI 共用元件
   ========================================================================= */
function h(html){ return html; }
function esc(s){ return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];}); }
function el(id){ return document.getElementById(id); }
function initials(n){ return String(n||'').slice(0,1); }

/* ---- Toast ---- */
function toast(msg,kind){
  var t=document.createElement('div'); t.className='toast '+(kind||''); t.textContent=msg;
  el('toast').appendChild(t);
  setTimeout(function(){ t.style.transition='.3s'; t.style.opacity=0; t.style.transform='translateY(8px)';
    setTimeout(function(){ t.remove(); },320); },2400);
}

/* ---- Modal ---- */
function openModal(title,bodyHtml,footHtml,wide){
  el('modal-root').innerHTML =
   '<div class="mask" onclick="if(event.target===this)closeModal()">'+
     '<div class="modal'+(wide?' wide':'')+'">'+
       '<div class="hd"><div>'+title+'</div><button class="x" onclick="closeModal()">✕</button></div>'+
       '<div class="bd">'+bodyHtml+'</div>'+
       (footHtml?'<div class="ft">'+footHtml+'</div>':'')+
     '</div></div>';
}
function closeModal(){ el('modal-root').innerHTML=''; }
document.addEventListener('keydown',function(e){ if(e.key==='Escape') closeModal(); });

/* ---- 進度環 ---- */
function ring(pct,label,size,color){
  size=size||132; var r=(size/2)-9, c=2*Math.PI*r, off=c*(1-pct/100);
  color=color||'var(--clay)';
  return '<div class="ring" style="width:'+size+'px;height:'+size+'px">'+
    '<svg width="'+size+'" height="'+size+'">'+
      '<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="var(--sand)" stroke-width="9"/>'+
      '<circle cx="'+size/2+'" cy="'+size/2+'" r="'+r+'" fill="none" stroke="'+color+'" stroke-width="9" '+
        'stroke-linecap="round" stroke-dasharray="'+c+'" stroke-dashoffset="'+off+'" style="transition:stroke-dashoffset .8s"/>'+
    '</svg><div class="c"><b>'+pct+'%</b><span>'+(label||'')+'</span></div></div>';
}

/* ---- 進度條 ---- */
function bar(pct,late){ return '<div class="bar'+(late?' late':'')+'"><i style="width:'+pct+'%"></i></div>'; }

/* ---- 狀態標籤 ---- */
function stTag(s){ var d=ST[s]||ST.todo; return '<span class="tag '+d.tag+'">'+d.label+'</span>'; }

/* ---- 階段流程條 ---- */
function stepsBar(curStageId,storeId){
  var order=['S1','S2','S3','S4','S5'], ci=order.indexOf(curStageId);
  return '<div class="steps">'+DB.stages.map(function(s,i){
    var cls = i<ci?'done':(i===ci?'cur done':'');
    var st = storeId?stageStat(storeId,s.id):null;
    var sub = st? (i<ci?'已完成':(i===ci? st.done+'/'+st.total+' 項':'尚未開放')) : ROLES[s.approver].label+'核准';
    return '<div class="step '+cls+'"><div class="dot">'+(i<ci?'✓':s.no)+'</div>'+
           '<b>'+esc(s.name)+'</b><small>'+sub+'</small></div>';
  }).join('')+'</div>';
}

/* ---- 統計卡 ---- */
function stat(label,val,unit,accent){
  return '<div class="stat'+(accent?' accent':'')+'"><div class="lb">'+label+'</div>'+
         '<div class="vl mono">'+val+(unit?'<small>'+unit+'</small>':'')+'</div></div>';
}

/* ---- 偽 QR（示意用，實際導入時改為真實 QR 產生器）---- */
function drawQR(canvas,seedStr){
  var n=25, s=canvas.width/n, ctx=canvas.getContext('2d');
  ctx.fillStyle='#fff'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.fillStyle='#4F2F2E';
  var seed=0; for(var i=0;i<seedStr.length;i++) seed=(seed*31+seedStr.charCodeAt(i))>>>0;
  function rnd(){ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }
  function finder(ox,oy){
    ctx.fillRect(ox*s,oy*s,7*s,7*s);
    ctx.fillStyle='#fff'; ctx.fillRect((ox+1)*s,(oy+1)*s,5*s,5*s);
    ctx.fillStyle='#4F2F2E'; ctx.fillRect((ox+2)*s,(oy+2)*s,3*s,3*s);
  }
  for(var y=0;y<n;y++) for(var x=0;x<n;x++){
    var inF=(x<8&&y<8)||(x>n-9&&y<8)||(x<8&&y>n-9);
    if(inF) continue;
    if(rnd()>0.52) ctx.fillRect(x*s,y*s,s,s);
  }
  finder(0,0); finder(n-7,0); finder(0,n-7);
}

/* ---- 任務列 ---- */
function taskRow(x,storeId,opts){
  opts=opts||{};
  var t=x.def,p=x.p,ty=TASK_TYPE[t.type];
  var meta=[];
  if(t.type==='course'&&t.courseCode){ var c=course(t.courseCode); if(c) meta.push(ty.label+'・'+c.hours+' 小時'); }
  else meta.push(ty.label);
  if(p.approvedAt) meta.push('核准 '+fmt(p.approvedAt));
  else if(p.submittedAt) meta.push('送審 '+fmt(p.submittedAt));
  var right='';
  if(opts.actions) right=opts.actions(x);
  return '<div class="task '+p.status+'">'+
    '<div class="ic">'+ty.icon+'</div>'+
    '<div class="bd"><div class="spread" style="align-items:flex-start">'+
      '<div><b>'+esc(t.title)+'</b>'+
        '<div class="tiny muted">'+meta.join('　·　')+'</div>'+
        (p.status==='rejected'&&p.reason?'<div class="tiny" style="margin-top:6px;background:var(--bad-bg);color:var(--bad);padding:6px 10px;border-radius:6px">退回原因：'+esc(p.reason)+'</div>':'')+
        (p.status==='submitted'&&p.note?'<div class="tiny muted" style="margin-top:5px">備註：'+esc(p.note)+'</div>':'')+
        ((p.files&&p.files.length)?'<div class="tiny muted" style="margin-top:5px">📎 '+p.files.map(function(f){return esc(f.name);}).join('、')+'</div>':'')+
      '</div>'+
      '<div class="row" style="gap:8px;flex:none">'+stTag(p.status)+right+'</div>'+
    '</div></div></div>';
}
