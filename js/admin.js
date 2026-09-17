/* =========================================================================
   後台（講師／輔導／驗收／陪跑／總部）
   ========================================================================= */
var ADMIN_NAV = [
  {g:'總覽', items:[
    {k:'dash',    t:'儀表板',      ic:'📊'},
    {k:'approve', t:'待核准',      ic:'✅', badge:true}
  ]},
  {g:'輔導作業', items:[
    {k:'stores',  t:'門店進度',    ic:'🏬'},
    {k:'checkin', t:'今日簽到',    ic:'📌'},
    {k:'courses', t:'課程管理',    ic:'🎓'},
    {k:'pay',     t:'費用與收款',  ic:'🧾', paybadge:true}
  ]},
  {g:'設定', items:[
    {k:'stages',  t:'階段與標準',  ic:'🧩'},
    {k:'users',   t:'人員與權限',  ic:'👥'},
    {k:'logs',    t:'稽核紀錄',    ic:'🧾'}
  ]}
];

function renderAdmin(page,arg){
  var body =
    page==='dash'   ? admDash() :
    page==='approve'? admApprove() :
    page==='stores' ? (arg?admStore(arg):admStores()) :
    page==='checkin'? admCheckin(arg) :
    page==='courses'? admCourses() :
    page==='pay'    ? admPay() :
    page==='stages' ? admStages() :
    page==='users'  ? admUsers() :
                      admLogs();
  var pend=pendingApprovals(me().role).length;
  var payPend=receivables().nChecking;
  el('app').innerHTML =
   '<div class="shell">'+topbar([],page,true)+
     '<div class="adm">'+
       '<nav class="side">'+ADMIN_NAV.map(function(g){
         return '<div class="grp">'+g.g+'</div>'+g.items.map(function(i){
           var n = i.badge?pend : (i.paybadge?payPend:0);
           return '<a class="'+(page===i.k?'on':'')+'" onclick="go(\''+i.k+'\')">'+
             '<span>'+i.ic+'</span><span>'+i.t+'</span>'+
             (n?'<span class="bdg">'+n+'</span>':'')+'</a>';
         }).join('');
       }).join('')+'</nav>'+
       '<main>'+body+'</main>'+
     '</div></div>';
}

/* =============== 儀表板 =============== */
function admDash(){
  var u=me();
  var stores=DB.stores, pend=pendingApprovals(u.role);
  var late=stores.filter(isLate);
  var tc=todayCourses();
  var totAtt=0, totPre=0;
  tc.forEach(function(c){ var r=roster(c.id); totAtt+=r.length; totPre+=r.filter(function(a){return a.status==='present';}).length; });
  var byStage=DB.stages.map(function(s){ return {s:s,n:stores.filter(function(x){return x.stage===s.id;}).length}; });
  var maxN=Math.max.apply(null,byStage.map(function(x){return x.n;}))||1;
  var opened=stores.filter(function(s){return s.openDate&&s.openDate<=todayStr();});

  return '<div class="page-head"><h2>營運儀表板</h2><p>'+fmtFull(todayStr())+'　·　'+esc(u.title)+'　'+esc(u.name)+'　·　'+ROLES[u.role].label+'視角</p></div>'+

  '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-bottom:18px">'+
    stat('輔導中門店',stores.length,' 家')+
    stat('待我核准',pend.length,' 件',true)+
    stat('進度落後',late.length,' 家')+
    stat('今日應到／已到',totPre+'/'+totAtt,' 人')+
    stat('未收款項',money(receivables().unpaid),'')+
    stat('已開幕陪跑中',opened.length,' 家')+
  '</div>'+

  '<div class="grid" style="grid-template-columns:minmax(0,1.35fr) minmax(280px,.9fr);align-items:start;margin-bottom:18px">'+

    /* 各階段分布 */
    '<div class="card pad">'+
      '<div class="spread" style="margin-bottom:14px"><h3>各階段門店分布</h3><span class="small muted">點擊查看該階段門店</span></div>'+
      byStage.map(function(x){
        return '<div class="row" style="margin-bottom:11px;cursor:pointer" onclick="go(\'stores\')">'+
          '<div style="width:170px;flex:none"><b class="small">第 '+x.s.no+' 　'+esc(x.s.name)+'</b>'+
            '<div class="tiny muted">'+ROLES[x.s.approver].label+'核准</div></div>'+
          '<div class="bar" style="height:22px;border-radius:6px"><i style="width:'+(x.n/maxN*100)+'%;border-radius:6px"></i></div>'+
          '<b class="mono" style="width:44px;text-align:right">'+x.n+' 家</b></div>';
      }).join('')+
      '<hr>'+
      '<div class="sec-title">最常卡關項目</div>'+
      '<div style="overflow-x:auto"><table><thead><tr><th>項目</th><th>階段</th><th>退件</th><th>審核中</th></tr></thead><tbody>'+
        blockers().map(function(b){
          return '<tr><td class="small"><b>'+esc(b.task.title)+'</b></td>'+
            '<td class="small muted">'+esc(stage(b.task.stageId).name)+'</td>'+
            '<td>'+(b.rejected?'<span class="tag bad">'+b.rejected+'</span>':'<span class="muted">—</span>')+'</td>'+
            '<td>'+(b.submitted?'<span class="tag warn">'+b.submitted+'</span>':'<span class="muted">—</span>')+'</td></tr>';
        }).join('')+'</tbody></table></div>'+
    '</div>'+

    /* 右欄 */
    '<div class="grid" style="gap:16px">'+
      '<div class="card pad">'+
        '<div class="spread" style="margin-bottom:12px"><h3 style="font-size:17px">今日課程出席</h3>'+
          '<button class="btn xs" onclick="go(\'checkin\')">前往簽到</button></div>'+
        (tc.length? tc.map(function(c){
          var r=roster(c.id), p=r.filter(function(a){return a.status==='present';}).length;
          return '<div style="padding:11px 0;border-bottom:1px solid var(--line-soft)">'+
            '<div class="spread"><b class="small">'+esc(c.name)+'</b><span class="mono small">'+p+'/'+r.length+'</span></div>'+
            '<div class="row" style="margin-top:6px">'+bar(r.length?Math.round(p/r.length*100):0)+'</div>'+
            '<div class="tiny muted" style="margin-top:5px">'+c.time+'　'+esc(c.room)+'　'+esc((user(c.instructor)||{}).name||'')+'</div></div>';
        }).join('') : '<div class="empty small"><span class="em">📅</span>今天沒有排課</div>')+
      '</div>'+
      '<div class="card pad" style="background:var(--ink);color:#fff;border-color:var(--ink)">'+
        '<div class="sec-title" style="color:#C9AE9C">AI 輔導摘要 <span class="aibadge" style="background:rgba(255,255,255,.14);color:#EADBCC">依即時資料</span></div>'+
        aiHQSummary()+
      '</div>'+
    '</div>'+
  '</div>'+

  /* 需要關注 */
  '<div class="card pad">'+
    '<div class="spread" style="margin-bottom:14px"><h3>需要關注的門店</h3><span class="small muted">逾期或有退件</span></div>'+
    (function(){
      var rows=stores.filter(function(s){
        return isLate(s)||stageStat(s.id,s.stage).rejected>0;
      });
      if(!rows.length) return '<div class="empty small"><span class="em">🌿</span>目前所有門店都在期程內</div>';
      return '<div style="overflow-x:auto"><table><thead><tr><th>門店</th><th>加盟主</th><th>階段</th><th>本階段完成度</th><th>階段期限</th><th>狀況</th><th></th></tr></thead><tbody>'+
        rows.map(function(s){
          var dl=stageDeadline(s), ss=stageStat(s.id,s.stage);
          return '<tr><td><b>'+esc(s.name)+'</b><div class="tiny muted">'+esc(s.code)+'</div></td>'+
            '<td class="small">'+esc(s.owner)+'</td>'+
            '<td class="small">第 '+stage(s.stage).no+' '+esc(stage(s.stage).name)+'</td>'+
            '<td style="min-width:130px"><div class="row">'+bar(ss.pct,dl.left<0)+'<span class="mono tiny">'+ss.pct+'%</span></div></td>'+
            '<td class="small mono">'+fmt(dl.due)+'</td>'+
            '<td>'+(dl.left<0?'<span class="tag bad">逾期 '+Math.abs(dl.left)+' 天</span> ':'')+
                 (ss.rejected?'<span class="tag warn">退件 '+ss.rejected+'</span>':'')+'</td>'+
            '<td><button class="btn xs" onclick="go(\'stores\',\''+s.id+'\')">查看</button></td></tr>';
        }).join('')+'</tbody></table></div>';
    })()+
  '</div>';
}
function aiHQSummary(){
  var late=DB.stores.filter(isLate), pend=pendingApprovals(me().role);
  var bl=blockers()[0];
  var lines=[];
  lines.push('目前 <b>'+DB.stores.length+'</b> 家門店輔導中，待核准 <b>'+pend.length+'</b> 件。');
  if(late.length) lines.push('⚠ <b>'+late.map(function(s){return esc(s.name);}).join('、')+'</b> 已超過該階段建議天數，建議本週安排一次輔導訪談。');
  else lines.push('✓ 所有門店都在期程內。');
  if(bl) lines.push('最常卡關：<b>'+esc(bl.task.title)+'</b>（退件 '+bl.rejected+' 件／審核中 '+bl.submitted+' 件），建議補一份填寫範例與檢查清單。');
  var noOpen=DB.stores.filter(function(s){return !s.openDate&&s.stage!=='S1';});
  if(noOpen.length) lines.push('有 <b>'+noOpen.length+'</b> 家尚未排定開幕日，將影響 90 天陪跑排程。');
  return '<div class="small" style="display:grid;gap:9px;color:#EFE0D3">'+lines.map(function(l){return '<div>'+l+'</div>';}).join('')+'</div>';
}

/* =============== 待核准 =============== */
var apvFilter='all';
function admApprove(){
  var u=me(), all=pendingApprovals(u.role);
  var rows = apvFilter==='all'?all:all.filter(function(x){return x.stage.id===apvFilter;});
  var stageSet={}; all.forEach(function(x){ stageSet[x.stage.id]=(stageSet[x.stage.id]||0)+1; });
  return '<div class="page-head"><h2>待核准</h2><p>'+
    (u.role==='hq'||u.role==='admin'?'總部視角可見全部階段':'僅顯示由「'+ROLES[u.role].label+'」負責核准的階段')+
    '　·　共 '+all.length+' 件</p></div>'+
  '<div class="row wrap" style="margin-bottom:14px">'+
    '<span class="chip'+(apvFilter==='all'?' ':' ')+'" style="'+(apvFilter==='all'?'background:var(--ink);color:#fff;border-color:var(--ink)':'')+'" onclick="apvFilter=\'all\';render()">全部 '+all.length+'</span>'+
    DB.stages.filter(function(s){return stageSet[s.id];}).map(function(s){
      return '<span class="chip" style="'+(apvFilter===s.id?'background:var(--ink);color:#fff;border-color:var(--ink)':'')+'" onclick="apvFilter=\''+s.id+'\';render()">'+esc(s.name)+' '+stageSet[s.id]+'</span>';
    }).join('')+
  '</div>'+
  (rows.length? rows.map(function(x){
    var ty=TASK_TYPE[x.task.type], days=daysBetween(x.p.submittedAt,todayStr());
    return '<div class="card pad" style="margin-bottom:12px">'+
      '<div class="spread wrap" style="align-items:flex-start;gap:14px;flex-wrap:wrap">'+
        '<div style="flex:1;min-width:260px">'+
          '<div class="row" style="gap:8px;margin-bottom:6px"><span class="tag sand">'+ty.icon+' '+ty.label+'</span>'+
            '<span class="tag clay">第 '+x.stage.no+' 階段</span>'+
            (days>=3?'<span class="tag bad">已等待 '+days+' 天</span>':'<span class="tag info">'+days+' 天前送審</span>')+'</div>'+
          '<h3 style="font-size:17px">'+esc(x.task.title)+'</h3>'+
          '<div class="small muted" style="margin-top:3px">'+esc(x.store.name)+'　·　'+esc(x.store.owner)+'　·　'+esc(x.store.code)+'</div>'+
          (x.p.note?'<div class="small" style="margin-top:9px;background:var(--sand);padding:9px 12px;border-radius:7px">學員備註：'+esc(x.p.note)+'</div>':'')+
          ((x.p.files&&x.p.files.length)?'<div class="small" style="margin-top:8px">📎 '+x.p.files.map(function(f){return '<a style="color:var(--clay);text-decoration:underline" onclick="toast(\'DEMO 未提供實際檔案預覽\')">'+esc(f.name)+'</a>';}).join('　')+'</div>':'')+
        '</div>'+
        '<div class="row" style="gap:8px;flex:none">'+
          '<button class="btn sm" onclick="go(\'stores\',\''+x.store.id+'\')">門店全貌</button>'+
          '<button class="btn sm bad" onclick="openReject(\''+x.store.id+'\',\''+x.task.id+'\')">退回補件</button>'+
          '<button class="btn sm ok" onclick="doApprove(\''+x.store.id+'\',\''+x.task.id+'\')">核准通過</button>'+
        '</div>'+
      '</div></div>';
  }).join('') : '<div class="card pad"><div class="empty"><span class="em">🎉</span>目前沒有待核准項目</div></div>');
}
function doApprove(storeId,taskId){
  var before=store(storeId).stage;
  decide(storeId,taskId,true);
  var after=store(storeId).stage;
  if(before!==after) toast('已核准，'+store(storeId).name+' 推進到「'+stage(after).name+'」','ok');
  else toast('已核准通過','ok');
  render();
}
function openReject(storeId,taskId){
  var t=taskDef(taskId);
  var presets=['資料不完整，請補齊缺漏欄位','附件不清晰／非正本，請重新上傳','未符合品牌標準，請依 SOP 修正後再送','現場查核未通過，需改善後複驗'];
  openModal('<h3>退回補件</h3><div class="small muted">'+esc(store(storeId).name)+'　·　'+esc(t.title)+'</div>',
    '<label class="fl">退回原因（學員端會直接看到）</label>'+
    '<textarea id="rj" rows="4" placeholder="請具體說明需要補正的內容"></textarea>'+
    '<div class="chips">'+presets.map(function(p){
      return '<span class="chip" onclick="document.getElementById(\'rj\').value=\''+p+'\'">'+p+'</span>'; }).join('')+'</div>'+
    '<div class="small muted" style="margin-top:14px">退回後該項目狀態變為「退回補件」，學員補正後可重新送審。</div>',
    '<button class="btn" onclick="closeModal()">取消</button>'+
    '<button class="btn bad" onclick="doReject(\''+storeId+'\',\''+taskId+'\')">確認退回</button>');
}
function doReject(storeId,taskId){
  var r=el('rj').value.trim();
  if(!r){ toast('請填寫退回原因','bad'); return; }
  decide(storeId,taskId,false,r); closeModal(); toast('已退回補件'); render();
}

/* =============== 門店列表 =============== */
var storeQ='', storeStage='all', storeRegion='all';
function admStores(){
  var rows=DB.stores.filter(function(s){
    if(storeStage!=='all'&&s.stage!==storeStage) return false;
    if(storeRegion!=='all'&&s.region!==storeRegion) return false;
    if(storeQ && (s.name+s.owner+s.code).indexOf(storeQ)<0) return false;
    return true;
  });
  var regions={}; DB.stores.forEach(function(s){ regions[s.region]=1; });
  return '<div class="page-head"><div class="spread wrap"><div><h2>門店進度總覽</h2>'+
    '<p>共 '+DB.stores.length+' 家輔導中門店，顯示 '+rows.length+' 家</p></div>'+
    '<div class="row"><button class="btn" onclick="exportCSV()">匯出 CSV</button>'+
    '<button class="btn primary" onclick="openNewStore()">＋ 新增門店</button></div></div></div>'+
  '<div class="card pad" style="margin-bottom:16px">'+
    '<div class="row wrap">'+
      '<div style="flex:1;min-width:200px"><input type="text" placeholder="搜尋門店 / 加盟主 / 編號" value="'+esc(storeQ)+'" oninput="storeQ=this.value;render();document.querySelector(\'input\').focus()"></div>'+
      '<select onchange="storeStage=this.value;render()" style="width:auto;min-width:170px">'+
        '<option value="all">全部階段</option>'+DB.stages.map(function(s){
          return '<option value="'+s.id+'"'+(storeStage===s.id?' selected':'')+'>第 '+s.no+' '+esc(s.name)+'</option>'; }).join('')+'</select>'+
      '<select onchange="storeRegion=this.value;render()" style="width:auto;min-width:120px">'+
        '<option value="all">全部區域</option>'+Object.keys(regions).map(function(r){
          return '<option value="'+r+'"'+(storeRegion===r?' selected':'')+'>'+r+'</option>'; }).join('')+'</select>'+
    '</div></div>'+
  '<div class="card" style="overflow-x:auto">'+
    '<table><thead><tr><th>門店</th><th>加盟主</th><th>區域</th><th>目前階段</th><th style="min-width:160px">整體完成度</th><th>時數</th><th>期限</th><th>狀態</th><th></th></tr></thead><tbody>'+
    rows.map(function(s){
      var dl=stageDeadline(s), pct=overallPct(s.id), ss=stageStat(s.id,s.stage), d9=day90(s);
      return '<tr style="cursor:pointer" onclick="go(\'stores\',\''+s.id+'\')">'+
        '<td><b>'+esc(s.name)+'</b><div class="tiny muted">'+esc(s.code)+'</div></td>'+
        '<td class="small">'+esc(s.owner)+'<div class="tiny muted">'+esc(s.phone)+'</div></td>'+
        '<td class="small">'+esc(s.region)+'</td>'+
        '<td class="small">第 '+stage(s.stage).no+'　'+esc(stage(s.stage).name)+'<div class="tiny muted">'+ss.done+'/'+ss.total+' 項</div></td>'+
        '<td><div class="row">'+bar(pct,dl.left<0)+'<span class="mono tiny" style="width:34px">'+pct+'%</span></div></td>'+
        '<td class="mono small">'+hoursOf(s.id)+'h</td>'+
        '<td class="small mono">'+(d9?'D+'+d9.day:fmt(dl.due))+'</td>'+
        '<td>'+(dl.left<0&&s.stage!=='S5'?'<span class="tag bad">逾期</span>':
               ss.rejected?'<span class="tag warn">退件</span>':
               ss.submitted?'<span class="tag info">審核中</span>':'<span class="tag ok">正常</span>')+'</td>'+
        '<td><button class="btn xs" onclick="event.stopPropagation();go(\'stores\',\''+s.id+'\')">詳情</button></td></tr>';
    }).join('')+'</tbody></table>'+
    (rows.length?'':'<div class="empty"><span class="em">🔍</span>找不到符合條件的門店</div>')+
  '</div>';
}
function openNewStore(){
  openModal('<h3>新增門店</h3><div class="small muted">建立後自動開通加盟主帳號與第一階段待辦</div>',
    '<div class="grid" style="grid-template-columns:1fr 1fr">'+
      '<div><label class="fl">門店名稱</label><input id="ns-name" type="text" placeholder="例：板橋府中店"></div>'+
      '<div><label class="fl">加盟主姓名</label><input id="ns-owner" type="text" placeholder="例：王小美"></div>'+
      '<div><label class="fl">區域</label><select id="ns-region"><option>北區</option><option>中區</option><option>南區</option><option>東區</option></select></div>'+
      '<div><label class="fl">聯絡電話</label><input id="ns-phone" type="text" placeholder="09xx-xxx-xxx"></div>'+
    '</div>'+
    '<div class="small muted" style="margin-top:14px">建立後：加盟主可登入前台看到「第一階段 新人報到與基礎訓練」的 6 項待辦。</div>',
    '<button class="btn" onclick="closeModal()">取消</button>'+
    '<button class="btn primary" onclick="doNewStore()">建立門店與帳號</button>');
}
function doNewStore(){
  var n=el('ns-name').value.trim(), o=el('ns-owner').value.trim();
  if(!n||!o){ toast('請填寫門店名稱與加盟主姓名','bad'); return; }
  var s=addStore({name:n,owner:o,region:el('ns-region').value,phone:el('ns-phone').value.trim()||'—'});
  closeModal(); toast('已建立 '+n+'，帳號已開通','ok'); go('stores',s.id);
}
function exportCSV(){
  var head=['門店編號','門店名稱','加盟主','區域','目前階段','整體完成度','累計時數','本階段期限','狀態'];
  var lines=[head.join(',')];
  DB.stores.forEach(function(s){
    var dl=stageDeadline(s), ss=stageStat(s.id,s.stage);
    lines.push([s.code,s.name,s.owner,s.region,'第'+stage(s.stage).no+' '+stage(s.stage).name,
      overallPct(s.id)+'%',hoursOf(s.id)+'h',dl.due,
      dl.left<0?'逾期':(ss.rejected?'退件':(ss.submitted?'審核中':'正常'))].join(','));
  });
  var blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='門店開店進度_'+todayStr()+'.csv'; a.click();
  toast('已匯出 CSV','ok');
}

/* =============== 門店詳情 =============== */
function admStore(id){
  var s=store(id); if(!s) return '<div class="empty">找不到門店</div>';
  var dl=stageDeadline(s), d9=day90(s), t=traineeOfStore(id);
  var hist=DB.progress.filter(function(p){return p.storeId===id&&(p.approvedAt||p.submittedAt);})
    .sort(function(a,b){ return (b.approvedAt||b.submittedAt).localeCompare(a.approvedAt||a.submittedAt); }).slice(0,14);
  var att=DB.attendance.filter(function(a){return a.storeId===id;});

  return '<div class="row" style="margin-bottom:12px"><button class="btn sm" onclick="go(\'stores\')">← 回門店列表</button>'+
    '<button class="btn sm ghost" onclick="window.print()">列印輔導紀錄</button></div>'+
  '<div class="page-head"><div class="spread wrap"><div>'+
    '<h2>'+esc(s.name)+'　<span class="tag clay">'+esc(s.code)+'</span></h2>'+
    '<p>'+esc(s.owner)+'　·　'+esc(s.phone)+'　·　'+esc(s.region)+'　·　加盟起始 '+fmtFull(s.joined)+
      (s.openDate?'　·　開幕 '+fmtFull(s.openDate):'　·　開幕日未定')+'</p></div>'+
    '<div class="row"><button class="btn sm" onclick="openSetOpen(\''+id+'\')">設定開幕日</button></div></div></div>'+

  '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr));margin-bottom:18px">'+
    stat('整體完成度',overallPct(id),'%',true)+
    stat('累計訓練時數',hoursOf(id),' 小時')+
    stat('本階段期限',dl.left<0?'逾期 '+Math.abs(dl.left):'剩 '+dl.left,' 天')+
    stat('90 天陪跑',d9?'D+'+d9.day:'未開始','')+
    stat('待核准項目',stageStat(id,s.stage).submitted,' 件')+
  '</div>'+

  '<div class="card pad" style="margin-bottom:18px">'+stepsBar(s.stage,id)+'</div>'+

  '<div class="grid" style="grid-template-columns:minmax(0,1.4fr) minmax(270px,.85fr);align-items:start">'+
    '<div class="grid" style="gap:16px">'+
      DB.stages.map(function(st){
        var ss=stageStat(id,st.id), can=canApprove(st.id);
        return '<div class="card pad">'+
          '<div class="spread" style="margin-bottom:10px">'+
            '<h3 style="font-size:17px">第 '+st.no+'　'+esc(st.name)+
              (st.id===s.stage?' <span class="tag ink">進行中</span>':(ss.complete?' <span class="tag ok">已通過</span>':''))+'</h3>'+
            '<span class="small mono muted">'+ss.done+'/'+ss.total+'</span></div>'+
          '<div class="grid" style="gap:8px">'+stageTasks(id,st.id).map(function(x){
            return taskRow(x,id,{actions:function(y){
              if(y.p.status==='submitted'&&can)
                return '<button class="btn xs bad" onclick="openReject(\''+id+'\',\''+y.def.id+'\')">退回</button>'+
                       '<button class="btn xs ok" onclick="doApprove(\''+id+'\',\''+y.def.id+'\')">核准</button>';
              if(y.p.status==='submitted') return '<span class="tiny muted">待 '+ROLES[st.approver].label+' 核准</span>';
              if(y.p.status==='todo'&&can&&y.def.type==='field')
                return '<button class="btn xs" onclick="fieldPass(\''+id+'\',\''+y.def.id+'\')">現場通過</button>';
              return '';
            }});
          }).join('')+'</div></div>';
      }).join('')+
    '</div>'+

    '<div class="grid" style="gap:16px">'+
      '<div class="card pad"><div class="sec-title">輔導窗口</div>'+
        '<div class="grid" style="gap:9px">'+
          [['加盟主',s.owner+'　'+s.phone],['店務輔導',(user(s.ops)||{}).name||'—'],['陪跑顧問',(user(s.coach)||{}).name||'—'],
           ['前台帳號',t?t.name+'（可登入查看自己的進度）':'—']].map(function(p){
            return '<div class="spread small"><span class="muted">'+p[0]+'</span><b style="font-weight:500">'+esc(p[1])+'</b></div>'; }).join('')+
        '</div></div>'+
      '<div class="card pad"><div class="sec-title">出席紀錄（'+att.filter(function(a){return a.status==='present';}).length+' 堂）</div>'+
        (att.length?'<div class="grid" style="gap:7px">'+att.sort(function(a,b){return (b.at||'').localeCompare(a.at||'');}).map(function(a){
          var c=course(a.courseId); if(!c) return '';
          return '<div class="spread small" style="padding:6px 0;border-bottom:1px solid var(--line-soft)">'+
            '<div><b style="font-weight:500">'+esc(c.name)+'</b><div class="tiny muted">'+fmtFull(c.date)+'　'+c.hours+' 小時</div></div>'+
            (a.status==='present'?'<span class="tag ok">出席</span>':a.status==='absent'?'<span class="tag bad">缺席</span>':'<span class="tag sand">已報名</span>')+'</div>';
        }).join('')+'</div>':'<div class="small muted">尚無紀錄</div>')+
      '</div>'+
      '<div class="card pad"><div class="sec-title">輔導歷程</div>'+
        '<div class="tl">'+hist.map(function(p){
          var t2=taskDef(p.taskId), when=p.approvedAt||p.submittedAt;
          return '<div class="tli '+(p.status==='approved'?'done':(p.status==='submitted'?'now':''))+'">'+
            '<div class="small"><b style="font-weight:500">'+esc(t2?t2.title:'')+'</b></div>'+
            '<div class="tiny muted">'+fmtFull(when)+'　'+ST[p.status].label+(p.reason?'　·　'+esc(p.reason):'')+'</div></div>';
        }).join('')+'</div></div>'+
    '</div>'+
  '</div>';
}
function fieldPass(storeId,taskId){
  submitTask(storeId,taskId,'現場輔導人員代填：已完成確認');
  decide(storeId,taskId,true);
  toast('已記錄現場通過','ok'); render();
}
function openSetOpen(id){
  var s=store(id);
  openModal('<h3>設定開幕日</h3><div class="small muted">'+esc(s.name)+'</div>',
    '<label class="fl">開幕日期</label><input id="od" type="date" value="'+(s.openDate||'')+'">'+
    '<div class="small muted" style="margin-top:12px">設定後系統自動啟動 90 天陪跑排程（D+1 / D+7 / D+30 / D+60 / D+90）。</div>',
    '<button class="btn" onclick="closeModal()">取消</button>'+
    '<button class="btn primary" onclick="doSetOpen(\''+id+'\')">儲存</button>');
}
function doSetOpen(id){
  var v=el('od').value; if(!v){ toast('請選擇日期','bad'); return; }
  store(id).openDate=v; log('設定開幕日',store(id).name,v); commit();
  closeModal(); toast('開幕日已設定，90 天陪跑排程啟動','ok'); render();
}

/* =============== 今日簽到 =============== */
function admCheckin(courseId){
  var tc=todayCourses();
  if(!tc.length&&!courseId) return '<div class="page-head"><h2>今日簽到</h2><p>'+fmtFull(todayStr())+'</p></div>'+
    '<div class="card pad"><div class="empty"><span class="em">📅</span>今天沒有排課<br>'+
    '<span class="small">可至「課程管理」新增梯次</span></div></div>';
  var c = courseId?course(courseId):tc[0];
  var r=roster(c.id);
  var pre=r.filter(function(a){return a.status==='present';}).length;
  var abs=r.filter(function(a){return a.status==='absent';}).length;
  var pen=r.filter(function(a){return a.status==='pending';}).length;

  return '<div class="page-head"><h2>今日簽到</h2><p>'+fmtFull(todayStr())+'　·　即時掌握誰到了、誰還沒到</p></div>'+
  (tc.length>1?'<div class="row wrap" style="margin-bottom:14px">'+tc.map(function(x){
    return '<span class="chip" style="'+(x.id===c.id?'background:var(--ink);color:#fff;border-color:var(--ink)':'')+'" onclick="go(\'checkin\',\''+x.id+'\')">'+esc(x.name)+'</span>';
  }).join('')+'</div>':'')+

  '<div class="grid" style="grid-template-columns:minmax(0,1.5fr) minmax(250px,.8fr);align-items:start;margin-bottom:18px">'+
    '<div class="card pad">'+
      '<div class="spread wrap" style="gap:14px;margin-bottom:14px">'+
        '<div><h3>'+esc(c.name)+'</h3>'+
          '<div class="small muted" style="margin-top:3px">'+c.time+'　·　'+esc(c.room)+'　·　'+esc((user(c.instructor)||{}).name||'')+' 講師　·　'+c.hours+' 小時</div></div>'+
        '<div class="row" style="gap:18px;flex:none">'+
          '<div style="text-align:center"><div class="mono" style="font-family:var(--serif);font-size:26px;color:var(--ok)">'+pre+'</div><div class="tiny muted">已報到</div></div>'+
          '<div style="text-align:center"><div class="mono" style="font-family:var(--serif);font-size:26px;color:var(--warn)">'+pen+'</div><div class="tiny muted">未到</div></div>'+
          '<div style="text-align:center"><div class="mono" style="font-family:var(--serif);font-size:26px;color:var(--bad)">'+abs+'</div><div class="tiny muted">缺席</div></div>'+
        '</div></div>'+
      '<div class="row">'+bar(r.length?Math.round(pre/r.length*100):0)+'<span class="mono small">'+pre+' / '+r.length+'</span></div>'+
      '<hr>'+
      '<div style="overflow-x:auto"><table><thead><tr><th>學員</th><th>門店</th><th>目前階段</th><th>繳費</th><th>狀態</th><th>報到方式</th><th style="text-align:right">講師操作</th></tr></thead><tbody>'+
      r.map(function(a){
        var s=store(a.storeId); if(!s) return '';
        var o=courseOrder(s.id,c.id);
        var paid=isCoursePaid(s.id,c.id);
        var payCell = !o?'<span class="tiny muted">免費</span>':
          o.status==='paid'?'<span class="tag ok">已繳</span>':
          o.status==='processing'?'<span class="tag info">確認中</span>':
          '<span class="tag bad">未繳 '+money(o.amount)+'</span>';
        return '<tr><td><b>'+esc(s.owner)+'</b></td>'+
          '<td class="small">'+esc(s.name)+'<div class="tiny muted">'+esc(s.code)+'</div></td>'+
          '<td class="small muted">第 '+stage(s.stage).no+' '+esc(stage(s.stage).name)+'</td>'+
          '<td>'+payCell+'</td>'+
          '<td>'+(a.status==='present'?'<span class="tag ok">已報到 '+(a.at?fmt(a.at):'')+'</span>':
                  a.status==='absent'?'<span class="tag bad">缺席</span>':'<span class="tag warn">尚未報到</span>')+'</td>'+
          '<td class="small muted">'+(a.status==='present'?(a.method==='qr'?'📱 掃碼':'✍ 講師確認'):'—')+'</td>'+
          '<td style="text-align:right"><div class="row" style="justify-content:flex-end;gap:6px">'+
            (a.status!=='present'? (paid
              ? '<button class="btn xs ok" onclick="checkin(\''+c.id+'\',\''+s.id+'\',\'manual\');toast(\'已標記出席\',\'ok\');render()">標記出席</button>'
              : '<button class="btn xs" disabled title="尚未繳費">未繳費</button>'):'')+
            (a.status!=='absent'?'<button class="btn xs bad" onclick="markAbsent(\''+c.id+'\',\''+s.id+'\');toast(\'已標記缺席\');render()">標記缺席</button>':'')+
          '</div></td></tr>';
      }).join('')+'</tbody></table></div>'+
      (r.length?'':'<div class="empty small">本梯次尚無報名學員</div>')+
    '</div>'+

    '<div class="grid" style="gap:16px">'+
      '<div class="card pad" style="text-align:center">'+
        '<div class="sec-title">現場報到條碼</div>'+
        '<canvas class="qr" id="qr-adm-'+c.id+'" width="170" height="170" style="margin:6px auto"></canvas>'+
        '<div class="small">現場代碼 <b class="mono">'+c.checkinCode+'</b></div>'+
        '<div class="tiny muted" style="margin-top:6px">投影或列印此碼，學員以手機掃描即完成報到</div>'+
        '<button class="btn sm" style="margin-top:10px" onclick="window.print()">列印簽到表</button>'+
      '</div>'+
      '<div class="card pad">'+
        '<div class="sec-title">尚未報到名單</div>'+
        (pen? '<div class="grid" style="gap:8px">'+r.filter(function(a){return a.status==='pending';}).map(function(a){
            var s=store(a.storeId);
            return '<div class="spread small"><span><b style="font-weight:500">'+esc(s.owner)+'</b><span class="muted">　'+esc(s.name)+'</span></span>'+
              '<span class="tiny muted">'+esc(s.phone)+'</span></div>';
          }).join('')+'<button class="btn sm" style="margin-top:6px" onclick="toast(\'DEMO：正式版會發送 LINE／簡訊提醒\')">一鍵提醒未到學員</button>'
          : '<div class="small" style="color:var(--ok)">✓ 全員已完成報到</div>')+
      '</div>'+
    '</div>'+
  '</div>';
}

/* =============== 課程管理 =============== */
function admCourses(){
  var today=todayStr();
  var rows=DB.courses.slice().sort(function(a,b){ return b.date.localeCompare(a.date); });
  return '<div class="page-head"><div class="spread wrap"><div><h2>課程管理</h2>'+
    '<p>共 '+DB.courses.length+' 個梯次　·　時數會自動累計到學員的階段門檻</p></div>'+
    '<button class="btn primary" onclick="openNewCourse()">＋ 新增梯次</button></div></div>'+
  '<div class="card" style="overflow-x:auto">'+
  '<table><thead><tr><th>日期</th><th>課程</th><th>時數</th><th>對應階段</th><th>講師</th><th>教室</th><th>報名／出席</th><th></th></tr></thead><tbody>'+
  rows.map(function(c){
    var r=roster(c.id), p=r.filter(function(a){return a.status==='present';}).length;
    var isToday=c.date===today, future=c.date>today;
    return '<tr>'+
      '<td class="mono small">'+fmtFull(c.date)+(isToday?'<div><span class="tag ink tiny">今天</span></div>':(future?'<div class="tiny muted">未開課</div>':''))+'</td>'+
      '<td><b>'+esc(c.name)+'</b><div class="tiny muted">'+c.time+'</div></td>'+
      '<td class="mono">'+c.hours+'h</td>'+
      '<td class="small muted">'+esc(stage(c.stageId).name)+'</td>'+
      '<td class="small">'+esc((user(c.instructor)||{}).name||'')+'</td>'+
      '<td class="small muted">'+esc(c.room)+'</td>'+
      '<td style="min-width:130px"><div class="row">'+bar(r.length?Math.round(p/r.length*100):0)+'<span class="mono tiny">'+p+'/'+r.length+'</span></div></td>'+
      '<td><button class="btn xs" onclick="go(\'checkin\',\''+c.id+'\')">'+(isToday?'簽到':'名單')+'</button></td></tr>';
  }).join('')+'</tbody></table></div>';
}
function openNewCourse(){
  openModal('<h3>新增課程梯次</h3>',
    '<div class="grid" style="grid-template-columns:1fr 1fr">'+
      '<div style="grid-column:1/-1"><label class="fl">課程名稱</label><input id="nc-name" type="text" placeholder="例：品牌與營運概論（第三梯）"></div>'+
      '<div><label class="fl">上課日期</label><input id="nc-date" type="date" value="'+todayStr()+'"></div>'+
      '<div><label class="fl">時數</label><input id="nc-hours" type="number" value="6" min="1"></div>'+
      '<div><label class="fl">對應階段</label><select id="nc-stage">'+DB.stages.map(function(s){
        return '<option value="'+s.id+'">第 '+s.no+' '+esc(s.name)+'</option>'; }).join('')+'</select></div>'+
      '<div><label class="fl">講師</label><select id="nc-instr">'+DB.users.filter(function(u){return u.role==='instructor';}).map(function(u){
        return '<option value="'+u.id+'">'+esc(u.name)+'</option>'; }).join('')+'</select></div>'+
      '<div><label class="fl">教室</label><input id="nc-room" type="text" value="總部 A 教室"></div>'+
      '<div><label class="fl">時段</label><input id="nc-time" type="text" value="09:30–16:30"></div>'+
    '</div>',
    '<button class="btn" onclick="closeModal()">取消</button>'+
    '<button class="btn primary" onclick="doNewCourse()">建立梯次</button>');
}
function doNewCourse(){
  var n=el('nc-name').value.trim(); if(!n){ toast('請填寫課程名稱','bad'); return; }
  addCourse({name:n,date:el('nc-date').value,hours:parseInt(el('nc-hours').value||6,10),
    stageId:el('nc-stage').value,instructor:el('nc-instr').value,room:el('nc-room').value,
    time:el('nc-time').value,capacity:12,code:''});
  closeModal(); toast('梯次已建立，學員可在前台報名','ok'); render();
}

/* =============== 階段與標準 =============== */
function admStages(){
  return '<div class="page-head"><h2>階段與完成標準</h2>'+
    '<p>定義每一階段的完成條件、核准角色與建議天數。修改後立即套用到所有門店的判定邏輯。</p></div>'+
  '<div class="card pad" style="margin-bottom:16px;background:var(--sand);border-color:var(--sand-deep)">'+
    '<div class="row wrap" style="gap:24px">'+
      '<div><div class="sec-title">核准邏輯</div><b>完成事項 → 送審 → 核准人審核 → 通過 → 解鎖下一階段</b>'+
        '<div class="small muted" style="margin-top:4px">學員無法自行勾選完成，杜絕虛報進度。</div></div>'+
      '<div><div class="sec-title">自動推進</div>'+
        '<label class="row small" style="cursor:pointer"><input type="checkbox" style="width:auto" '+(DB.settings.rules.autoUnlock?'checked':'')+
          ' onchange="DB.settings.rules.autoUnlock=this.checked;commit();toast(\'已更新\')"> 本階段全數通過且時數達標時自動進入下一階段</label></div>'+
    '</div></div>'+
  DB.stages.map(function(st){
    var cnt=DB.stores.filter(function(s){return s.stage===st.id;}).length;
    return '<div class="card pad" style="margin-bottom:14px">'+
      '<div class="spread wrap" style="gap:12px;margin-bottom:12px">'+
        '<div><h3 style="font-size:18px">第 '+st.no+' 階段　'+esc(st.name)+'</h3>'+
          '<div class="small muted" style="margin-top:3px">'+esc(st.desc)+'</div></div>'+
        '<span class="tag sand">'+cnt+' 家門店在此階段</span></div>'+
      '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(180px,1fr));margin-bottom:14px">'+
        '<div><label class="fl">核准角色</label><select onchange="DB.stages['+(st.no-1)+'].approver=this.value;commit();toast(\'已更新核准角色\');render()">'+
          ['instructor','ops','inspector','coach','hq'].map(function(r){
            return '<option value="'+r+'"'+(st.approver===r?' selected':'')+'>'+ROLES[r].label+'</option>'; }).join('')+'</select></div>'+
        '<div><label class="fl">建議天數</label><input type="number" value="'+st.days+'" onchange="DB.stages['+(st.no-1)+'].days=parseInt(this.value||0,10);commit();toast(\'已更新期程\');render()"></div>'+
        '<div><label class="fl">訓練時數門檻</label><input type="number" value="'+st.reqHours+'" onchange="DB.stages['+(st.no-1)+'].reqHours=parseInt(this.value||0,10);commit();toast(\'已更新時數門檻\');render()"></div>'+
        '<div><label class="fl">任務項目數</label><input type="text" value="'+st.tasks.length+' 項" disabled></div>'+
      '</div>'+
      '<div class="sec-title">完成條件（必須逐項通過核准）</div>'+
      '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px">'+
        st.tasks.map(function(t){
          var done=DB.stores.filter(function(s){ var p=prog(s.id,t.id); return p&&p.status==='approved'; }).length;
          return '<div class="row small" style="padding:9px 12px;border:1px solid var(--line-soft);border-radius:7px;background:#fff">'+
            '<span>'+TASK_TYPE[t.type].icon+'</span><span style="flex:1">'+esc(t.title)+'</span>'+
            '<span class="tiny muted mono">'+done+'/'+DB.stores.length+'</span></div>';
        }).join('')+
      '</div></div>';
  }).join('');
}

/* =============== 人員與權限 =============== */
function admUsers(){
  var byRole={};
  DB.users.forEach(function(u){ (byRole[u.role]=byRole[u.role]||[]).push(u); });
  var matrix=[
    ['檢視自己的門店進度',        ['trainee','instructor','ops','inspector','coach','hq','admin']],
    ['送審任務／上傳文件',        ['trainee']],
    ['課程報名與掃碼報到',        ['trainee']],
    ['後台勾選出席／標記缺席',    ['instructor','hq','admin']],
    ['核准第一階段（基礎訓練）',  ['instructor','hq','admin']],
    ['核准第二／三階段（店務）',  ['ops','hq','admin']],
    ['核准第四階段（驗收）',      ['inspector','hq','admin']],
    ['核准第五階段（陪跑）',      ['coach','hq','admin']],
    ['檢視全部門店與報表',        ['hq','admin','ops','coach']],
    ['新增門店／開通帳號',        ['hq','admin']],
    ['修改階段定義與標準',        ['hq','admin']],
    ['查看稽核紀錄',              ['hq','admin']]
  ];
  var roleKeys=['trainee','instructor','ops','inspector','coach','hq','admin'];
  return '<div class="page-head"><h2>人員與權限</h2><p>不同角色看到不同畫面與操作；此表為 DEMO 的權限設計草案。</p></div>'+
  '<div class="card pad" style="margin-bottom:16px">'+
    '<h3 style="margin-bottom:12px">權限矩陣</h3>'+
    '<div style="overflow-x:auto"><table><thead><tr><th style="min-width:200px">功能</th>'+
      roleKeys.map(function(r){ return '<th style="text-align:center">'+ROLES[r].label+'</th>'; }).join('')+'</tr></thead><tbody>'+
      matrix.map(function(m){
        return '<tr><td class="small">'+m[0]+'</td>'+roleKeys.map(function(r){
          return '<td style="text-align:center">'+(m[1].indexOf(r)>=0?'<span style="color:var(--ok)">●</span>':'<span style="color:var(--line)">○</span>')+'</td>';
        }).join('')+'</tr>';
      }).join('')+'</tbody></table></div>'+
  '</div>'+
  '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(280px,1fr))">'+
    Object.keys(byRole).map(function(r){
      return '<div class="card pad"><div class="spread" style="margin-bottom:10px">'+
        '<h3 style="font-size:16px">'+ROLES[r].label+'</h3><span class="tag sand">'+byRole[r].length+' 人</span></div>'+
        '<div class="grid" style="gap:8px">'+byRole[r].slice(0,10).map(function(u){
          return '<div class="row small" style="gap:9px"><span class="me"><span class="av" style="width:28px;height:28px;font-size:12px">'+esc(initials(u.name))+'</span></span>'+
            '<span style="flex:1"><b style="font-weight:500">'+esc(u.name)+'</b><div class="tiny muted">'+esc(u.title)+'</div></span>'+
            '<button class="btn xs" onclick="login(\''+u.id+'\');toast(\'已切換為 '+esc(u.name)+'\');go(\''+(ROLES[r].side==='front'?'dash':'dash')+'\')">以此身分檢視</button></div>';
        }).join('')+(byRole[r].length>10?'<div class="tiny muted">…另有 '+(byRole[r].length-10)+' 人</div>':'')+'</div></div>';
    }).join('')+
  '</div>';
}

/* =============== 稽核紀錄 =============== */
function admLogs(){
  return '<div class="page-head"><div class="spread wrap"><div><h2>稽核紀錄</h2>'+
    '<p>所有核准、退回、報到與階段推進都會留痕，供日後查核。</p></div>'+
    '<button class="btn bad" onclick="if(confirm(\'確定要清除所有 DEMO 資料並回到初始狀態？\')){resetDB();toast(\'已重置示範資料\',\'ok\');render();}">重置 DEMO 資料</button></div></div>'+
  '<div class="card" style="overflow-x:auto"><table><thead><tr><th>時間</th><th>操作人</th><th>動作</th><th>對象</th><th>說明</th></tr></thead><tbody>'+
  DB.logs.slice(0,80).map(function(l){
    return '<tr><td class="small mono muted">'+esc(l.at)+'</td><td class="small">'+esc(l.actor)+'</td>'+
      '<td><span class="tag '+(l.action==='核准通過'?'ok':l.action==='退回補件'?'bad':l.action==='階段推進'?'clay':'sand')+'">'+esc(l.action)+'</span></td>'+
      '<td class="small">'+esc(l.target)+'</td><td class="small muted">'+esc(l.detail)+'</td></tr>';
  }).join('')+'</tbody></table>'+(DB.logs.length?'':'<div class="empty">尚無紀錄</div>')+'</div>';
}
