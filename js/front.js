/* =========================================================================
   前台（加盟主／新人）
   ========================================================================= */
var FRONT_NAV = [
  {k:'dash',   t:'我的進度'},
  {k:'tasks',  t:'階段任務'},
  {k:'courses',t:'我的課程'},
  {k:'day90',  t:'90 天陪跑'},
  {k:'ai',     t:'AI 助理'}
];

function renderFront(page){
  var u=me(), s=store(u.storeId);
  var body =
    page==='dash'   ? frontDash(s) :
    page==='tasks'  ? frontTasks(s) :
    page==='courses'? frontCourses(s) :
    page==='day90'  ? frontDay90(s) :
                      frontAI(s);
  el('app').innerHTML =
   '<div class="shell">'+
     topbar(FRONT_NAV,page,false)+
     '<main>'+body+'</main>'+
   '</div>';
}

/* ---------- 我的進度 ---------- */
function frontDash(s){
  var pct=overallPct(s.id), st=stage(s.stage), ss=stageStat(s.id,s.stage);
  var na=nextAction(s.id), dl=stageDeadline(s), late=dl.left<0;
  var hrs=hoursOf(s.id), d9=day90(s);
  var miss=missingOf(s.id);

  var alertHtml='';
  if(late) alertHtml='<div class="card pad" style="border-color:var(--bad);background:var(--bad-bg);margin-bottom:16px">'+
     '<b style="color:var(--bad)">⚠ 本階段已逾期 '+Math.abs(dl.left)+' 天</b>'+
     '<div class="small" style="margin-top:4px">預計 '+fmtFull(dl.due)+' 前完成「'+esc(st.name)+'」，請優先處理下方待辦，或聯繫輔導人員調整期程。</div></div>';
  else if(na.kind==='rejected') alertHtml='<div class="card pad" style="border-color:var(--bad);background:var(--bad-bg);margin-bottom:16px">'+
     '<b style="color:var(--bad)">✎ 有項目被退回，需要補件</b>'+
     '<div class="small" style="margin-top:4px">'+esc(na.why||'')+'</div></div>';

  return alertHtml+
  '<div class="page-head"><h2>'+esc(s.name)+'　開店進度</h2>'+
   '<p>'+esc(s.owner)+'　·　'+esc(s.code)+'　·　加盟起始 '+fmtFull(s.joined)+'　·　'+esc(s.region)+'</p></div>'+

  '<div class="grid" style="grid-template-columns:minmax(300px,1fr) minmax(280px,.9fr);align-items:start;margin-bottom:18px">'+
    /* 左：總進度 */
    '<div class="card pad">'+
      '<div class="row" style="gap:24px;align-items:center">'+
        ring(pct,'整體完成度')+
        '<div style="flex:1;min-width:0">'+
          '<div class="sec-title">目前階段</div>'+
          '<h3 style="font-size:20px">第 '+st.no+' 階段　'+esc(st.name)+'</h3>'+
          '<p class="small muted" style="margin:6px 0 12px">'+esc(st.desc)+'</p>'+
          '<div class="row"><span class="small mono">'+ss.done+' / '+ss.total+' 項</span>'+bar(ss.pct,late)+'</div>'+
          '<div class="row small muted" style="margin-top:10px;gap:16px;flex-wrap:wrap">'+
            '<span>核准人：'+ROLES[st.approver].label+'</span>'+
            '<span>期限：'+fmtFull(dl.due)+(late?'　<b style="color:var(--bad)">逾期 '+Math.abs(dl.left)+' 天</b>':'　剩 '+dl.left+' 天')+'</span>'+
          '</div>'+
        '</div>'+
      '</div>'+
      '<hr>'+stepsBar(s.stage,s.id)+
    '</div>'+
    /* 右：下一步 */
    '<div class="card pad" style="background:var(--ink);color:#fff;border-color:var(--ink)">'+
      '<div class="sec-title" style="color:#C9AE9C">下一步該做什麼 <span class="aibadge" style="background:rgba(255,255,255,.14);color:#EADBCC">AI 建議</span></div>'+
      '<h3 style="color:#fff;font-size:19px;line-height:1.5">'+esc(na.text)+'</h3>'+
      (na.why?'<p class="small" style="color:#E0CBBC;margin-top:8px">'+esc(na.why)+'</p>':'')+
      '<div style="margin-top:16px;display:flex;gap:9px;flex-wrap:wrap">'+
        (na.task?'<button class="btn clay" onclick="openSubmit(\''+na.task.def.id+'\')">前往處理</button>':'')+
        '<button class="btn ghost" style="color:#EADBCC;border-color:#75534F" onclick="go(\'tasks\')">看全部任務</button>'+
      '</div>'+
      '<hr style="border-color:#6B4A46">'+
      '<div class="grid" style="grid-template-columns:1fr 1fr;gap:12px">'+
        '<div><div class="tiny" style="color:#C9AE9C">累計訓練時數</div>'+
          '<div class="mono" style="font-family:var(--serif);font-size:24px;color:var(--gold)">'+hrs+'<small style="font-size:13px;color:#C9AE9C"> / '+DB.settings.totalHours+' 小時</small></div></div>'+
        '<div><div class="tiny" style="color:#C9AE9C">'+(d9?'90 天陪跑':'預計開幕')+'</div>'+
          '<div class="mono" style="font-family:var(--serif);font-size:24px;color:var(--gold)">'+
            (d9?'D+'+d9.day:(s.openDate?fmt(s.openDate):'待定'))+'</div></div>'+
      '</div>'+
    '</div>'+
  '</div>'+

  /* 缺件提醒 */
  '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(290px,1fr));margin-bottom:18px">'+
    missCard('尚未完成的文件',miss.docs,'📄')+
    missCard('尚未完成的課程',miss.courses,'🎓')+
    missCard('尚待現場確認',miss.fields,'🏬')+
    missCard('尚未填報的表單',miss.forms,'📝')+
  '</div>'+

  /* 本階段任務 */
  '<div class="card pad">'+
    '<div class="spread" style="margin-bottom:14px"><h3>本階段任務</h3>'+
      '<span class="small muted">由 '+ROLES[st.approver].label+' 核准後才會標記完成</span></div>'+
    '<div class="grid" style="gap:9px">'+
      stageTasks(s.id,s.stage).map(function(x){ return taskRow(x,s.id,{actions:frontAction}); }).join('')+
    '</div>'+
  '</div>';
}
function missCard(title,arr,icon){
  return '<div class="card pad">'+
    '<div class="sec-title">'+icon+'　'+title+'</div>'+
    (arr.length? '<ul style="list-style:none;display:grid;gap:7px">'+arr.map(function(x){
        return '<li class="small row" style="gap:7px;align-items:flex-start">'+
          '<span style="color:var(--clay)">•</span><span>'+esc(x.def.title)+'　'+stTag(x.p.status)+'</span></li>';
      }).join('')+'</ul>'
      : '<div class="small" style="color:var(--ok)">✓ 本階段無缺漏</div>')+
  '</div>';
}
function frontAction(x){
  var p=x.p;
  if(p.status==='todo'||p.status==='rejected')
    return '<button class="btn sm clay" onclick="openSubmit(\''+x.def.id+'\')">'+(p.status==='rejected'?'重新送審':'送審')+'</button>';
  if(p.status==='submitted') return '<span class="tiny muted">審核中</span>';
  return '';
}

/* ---------- 送審 Modal ---------- */
function openSubmit(taskId){
  var u=me(), s=store(u.storeId), t=taskDef(taskId), p=prog(s.id,taskId), ty=TASK_TYPE[t.type];
  if(t.type==='course'){
    var c=course(t.courseCode);
    openModal('<h3>'+esc(t.title)+'</h3><div class="small muted">課程型任務由出席紀錄認定</div>',
      '<div class="card pad" style="background:var(--sand);border-color:var(--sand-deep)">'+
        '<b>'+esc(c?c.name:'')+'</b>　<span class="tag sand">'+(c?c.hours:0)+' 小時</span>'+
        '<p class="small muted" style="margin-top:8px">此項目無法自行勾選完成。請至「我的課程」報名並於上課當天完成報到；'+
        '出席紀錄成立後系統會自動送審，再由講師確認核准。</p>'+
      '</div>',
      '<button class="btn" onclick="closeModal()">關閉</button>'+
      '<button class="btn primary" onclick="closeModal();go(\'courses\')">前往我的課程</button>');
    return;
  }
  var need = t.type==='doc'?'請上傳檔案（PDF／JPG／PNG，10MB 內）':
             t.type==='field'?'請填寫現場自檢結果，輔導人員會到場複核':'請填寫表單內容';
  openModal('<h3>送審　'+esc(t.title)+'</h3><div class="small muted">'+ty.icon+' '+ty.label+'　·　核准人：'+ROLES[stage(t.stageId).approver].label+'</div>',
    (p.status==='rejected'?'<div class="card pad" style="background:var(--bad-bg);border-color:var(--bad);margin-bottom:14px">'+
        '<b class="small" style="color:var(--bad)">上次退回原因</b><div class="small">'+esc(p.reason)+'</div></div>':'')+
    (t.type==='doc'?
      '<div style="margin-bottom:14px"><label class="fl">上傳檔案</label>'+
        '<div id="dropzone" style="border:1.5px dashed var(--line);border-radius:10px;padding:26px;text-align:center;background:#fff;cursor:pointer" onclick="fakeUpload()">'+
          '<div style="font-size:26px">📎</div><div class="small muted" style="margin-top:6px">'+need+'</div>'+
          '<div class="small" style="color:var(--clay);margin-top:4px">點此選擇檔案</div></div>'+
        '<div id="fname" class="small" style="margin-top:8px"></div></div>' : '')+
    '<label class="fl">'+(t.type==='doc'?'補充說明（選填）':need)+'</label>'+
    '<textarea id="note" rows="4" placeholder="例：已完成 3 家競品盤點，假日人流另附表"></textarea>'+
    '<div class="small muted" style="margin-top:12px">送出後狀態變為「待核准」，需由 '+ROLES[stage(t.stageId).approver].label+' 審核通過才算完成。</div>',
    '<button class="btn" onclick="closeModal()">取消</button>'+
    '<button class="btn primary" onclick="doSubmit(\''+taskId+'\')">送出審核</button>');
}
var _fakeFile='';
function fakeUpload(){
  var names=['商圈調查表_v2.pdf','店面平面圖_28.5坪.pdf','租約草案_簽章版.pdf','設備到貨簽收單.jpg','現場照片_合併.pdf'];
  _fakeFile=names[Math.floor(Math.random()*names.length)];
  el('fname').innerHTML='<span class="tag ok">已選擇</span> '+esc(_fakeFile)+' <span class="muted tiny">（示範用，未實際上傳）</span>';
}
function doSubmit(taskId){
  var u=me(), note=(el('note')?el('note').value:'');
  submitTask(u.storeId,taskId,note,_fakeFile); _fakeFile='';
  closeModal(); toast('已送出審核，等待核准','ok'); render();
}

/* ---------- 階段任務 ---------- */
function frontTasks(s){
  var order=['S1','S2','S3','S4','S5'], ci=order.indexOf(s.stage);
  return '<div class="page-head"><h2>階段任務</h2><p>共 5 階段，每階段需由指定核准人審核通過才會解鎖下一階段。</p></div>'+
  '<div class="card pad" style="margin-bottom:18px">'+stepsBar(s.stage,s.id)+'</div>'+
  DB.stages.map(function(st,i){
    var ss=stageStat(s.id,st.id), locked=i>ci;
    var hr=hoursByStage(s.id,st.id);
    return '<div class="card pad" style="margin-bottom:14px;'+(locked?'opacity:.62':'')+'">'+
      '<div class="spread" style="margin-bottom:6px">'+
        '<div><h3 style="font-size:18px">第 '+st.no+' 階段　'+esc(st.name)+
          (i===ci?' <span class="tag ink">進行中</span>':(i<ci?' <span class="tag ok">已通過</span>':' <span class="tag sand">未開放</span>'))+'</h3>'+
          '<div class="small muted" style="margin-top:3px">'+esc(st.desc)+'</div></div>'+
        '<div style="text-align:right;flex:none"><div class="mono" style="font-family:var(--serif);font-size:22px">'+ss.pct+'%</div>'+
          '<div class="tiny muted">'+ss.done+'/'+ss.total+' 項</div></div>'+
      '</div>'+
      '<div class="row small muted" style="gap:16px;flex-wrap:wrap;margin:10px 0 14px">'+
        '<span>核准人：<b style="color:var(--ink)">'+ROLES[st.approver].label+'</b></span>'+
        '<span>建議天數：'+st.days+' 天</span>'+
        (st.reqHours?'<span>時數門檻：'+hr+' / '+st.reqHours+' 小時'+(hr>=st.reqHours?' <span class="tag ok">達標</span>':' <span class="tag warn">未達標</span>')+'</span>':'')+
      '</div>'+
      '<div class="grid" style="gap:9px">'+
        stageTasks(s.id,st.id).map(function(x){ return taskRow(x,s.id,{actions:locked?function(){return '';}:frontAction}); }).join('')+
      '</div>'+
    '</div>';
  }).join('');
}

/* ---------- 我的課程 ---------- */
function frontCourses(s){
  var mine=DB.attendance.filter(function(a){return a.storeId===s.id;});
  var hrs=hoursOf(s.id);
  var today=todayStr();
  var rows=mine.map(function(a){ var c=course(a.courseId); return c?{a:a,c:c}:null; }).filter(Boolean)
            .sort(function(x,y){ return y.c.date.localeCompare(x.c.date); });
  var upcoming=DB.courses.filter(function(c){ return c.date>=today && !mine.filter(function(a){return a.courseId===c.id;}).length; });

  return '<div class="page-head"><h2>我的課程與報到</h2><p>報到僅能透過掃碼或由講師於後台確認，無法自行勾選完成。</p></div>'+
  '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr));margin-bottom:18px">'+
    stat('累計出席時數',hrs,' 小時',true)+
    stat('基礎訓練門檻',DB.settings.baseHours,' 小時')+
    stat('完整訓練門檻',DB.settings.totalHours,' 小時')+
    stat('缺席次數',mine.filter(function(a){return a.status==='absent';}).length,' 次')+
  '</div>'+

  (todayCourses().filter(function(c){ return mine.filter(function(a){return a.courseId===c.id;}).length; }).map(function(c){
    var a=mine.filter(function(x){return x.courseId===c.id;})[0];
    return '<div class="card pad" style="margin-bottom:18px;background:var(--sand);border-color:var(--sand-deep)">'+
      '<div class="spread wrap" style="flex-wrap:wrap;gap:16px">'+
        '<div><div class="sec-title">今日課程</div><h3>'+esc(c.name)+'</h3>'+
          '<div class="small muted" style="margin-top:4px">'+c.time+'　·　'+esc(c.room)+'　·　'+esc((user(c.instructor)||{}).name)+' 講師　·　'+c.hours+' 小時</div>'+
          '<div style="margin-top:12px">'+(a.status==='present'
            ? '<span class="tag ok">✓ 已於 '+fmt(a.at)+' 完成報到（'+(a.method==='qr'?'掃碼':'講師確認')+'）</span>'
            : '<button class="btn primary" onclick="openScan(\''+c.id+'\')">📷 掃碼報到</button>')+'</div>'+
        '</div>'+
        '<div style="text-align:center"><canvas class="qr" id="qr-'+c.id+'" width="170" height="170"></canvas>'+
          '<div class="tiny muted" style="margin-top:5px">現場條碼　代碼 '+c.checkinCode+'</div></div>'+
      '</div></div>';
  }).join(''))+

  '<div class="card pad" style="margin-bottom:18px">'+
    '<h3 style="margin-bottom:12px">上課與出席紀錄</h3>'+
    (rows.length?'<div style="overflow-x:auto"><table><thead><tr><th>日期</th><th>課程</th><th>時數</th><th>講師</th><th>出席</th><th>方式</th></tr></thead><tbody>'+
      rows.map(function(r){
        var stt = r.a.status==='present'?'<span class="tag ok">出席</span>':
                  r.a.status==='absent'?'<span class="tag bad">缺席</span>':'<span class="tag sand">已報名</span>';
        return '<tr><td class="mono small">'+fmtFull(r.c.date)+'</td><td><b>'+esc(r.c.name)+'</b><div class="tiny muted">'+esc(r.c.room)+'</div></td>'+
          '<td class="mono">'+r.c.hours+'</td><td class="small">'+esc((user(r.c.instructor)||{}).name||'')+'</td>'+
          '<td>'+stt+'</td><td class="small muted">'+(r.a.status==='present'?(r.a.method==='qr'?'掃碼報到':'講師確認'):'—')+'</td></tr>';
      }).join('')+'</tbody></table></div>':'<div class="empty"><span class="em">🎓</span>尚無課程紀錄</div>')+
  '</div>'+

  '<div class="card pad">'+
    '<h3 style="margin-bottom:12px">可報名的梯次</h3>'+
    (upcoming.length?'<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(250px,1fr))">'+
      upcoming.map(function(c){
        return '<div class="card pad" style="box-shadow:none">'+
          '<b>'+esc(c.name)+'</b>'+
          '<div class="small muted" style="margin:5px 0 10px">'+fmtFull(c.date)+'　'+c.time+'<br>'+esc(c.room)+'　·　'+c.hours+' 小時</div>'+
          '<button class="btn sm clay" onclick="enroll(\''+c.id+'\')">報名此梯次</button></div>';
      }).join('')+'</div>':'<div class="empty"><span class="em">📅</span>目前沒有可報名的梯次</div>')+
  '</div>';
}
function enroll(courseId){
  var u=me();
  if(DB.attendance.filter(function(a){return a.courseId===courseId&&a.storeId===u.storeId;}).length){ toast('已報名過此梯次'); return; }
  DB.attendance.push({id:'A'+Date.now(),courseId:courseId,storeId:u.storeId,userId:u.id,status:'pending',method:'',by:'',at:''});
  log('報名課程',course(courseId).name); commit(); toast('報名成功，請於上課當天完成報到','ok'); render();
}
function openScan(courseId){
  var c=course(courseId);
  openModal('<h3>掃碼報到</h3><div class="small muted">'+esc(c.name)+'</div>',
    '<div style="text-align:center;padding:10px 0">'+
      '<div style="width:200px;height:200px;margin:0 auto;border:2px solid var(--clay);border-radius:14px;display:grid;place-items:center;background:#2A1A19;color:var(--sand);position:relative;overflow:hidden">'+
        '<div style="position:absolute;left:0;right:0;height:2px;background:var(--gold);top:50%;box-shadow:0 0 14px var(--gold)"></div>'+
        '<span class="small">模擬相機取景中…</span></div>'+
      '<p class="small muted" style="margin:16px 0 4px">將鏡頭對準教室現場的報到條碼</p>'+
      '<p class="tiny muted">或輸入現場代碼：<b class="mono">'+c.checkinCode+'</b></p>'+
    '</div>',
    '<button class="btn" onclick="closeModal()">取消</button>'+
    '<button class="btn primary" onclick="doScan(\''+courseId+'\')">模擬掃描成功</button>');
}
function doScan(courseId){
  var u=me(); checkin(courseId,u.storeId,'qr'); closeModal();
  toast('報到成功！出席紀錄已送交講師確認','ok'); render();
}

/* ---------- 90 天陪跑 ---------- */
function frontDay90(s){
  var d9=day90(s);
  if(!d9) return '<div class="page-head"><h2>90 天陪跑</h2></div>'+
    '<div class="card pad"><div class="empty"><span class="em">🏁</span>'+
    '尚未開幕，開幕日確定後自動啟動 90 天陪跑計畫。<br><span class="small">目前階段：'+esc(stage(s.stage).name)+'</span></div></div>';
  var st=stage('S5'), tasks=stageTasks(s.id,'S5');
  var milestones=[{d:1,t:'開幕日'},{d:2,t:'現場陪跑第 2 天'},{d:7,t:'首週營運回報'},{d:30,t:'第 30 天經營健檢'},{d:60,t:'第 60 天複盤'},{d:90,t:'結案報告'}];
  return '<div class="page-head"><h2>開店後 90 天陪跑</h2><p>開幕日 '+fmtFull(s.openDate)+'　·　陪跑顧問 '+esc((user(s.coach)||{}).name)+'</p></div>'+
  '<div class="card pad" style="margin-bottom:18px">'+
    '<div class="row" style="gap:26px;align-items:center;flex-wrap:wrap">'+
      ring(d9.pct,'第 '+d9.day+' 天')+
      '<div style="flex:1;min-width:220px">'+
        '<div class="sec-title">陪跑進度</div>'+
        '<h3>目前是開幕後第 '+d9.day+' 天，還有 '+Math.max(0,d9.left)+' 天結案</h3>'+
        '<div class="row" style="margin:12px 0">'+bar(d9.pct)+'<span class="small mono">'+d9.pct+'%</span></div>'+
        '<div class="tl" style="margin-top:14px">'+milestones.map(function(m){
            var cls=d9.day>m.d?'done':(d9.day>=m.d-2&&d9.day<=m.d+2?'now':'');
            return '<div class="tli '+cls+'"><b class="small">D+'+m.d+'　'+m.t+'</b>'+
              '<div class="tiny muted">'+fmtFull(ymd(addDays(new Date(s.openDate),m.d-1)))+'</div></div>';
          }).join('')+'</div>'+
      '</div>'+
    '</div>'+
  '</div>'+
  '<div class="card pad"><div class="spread" style="margin-bottom:14px"><h3>陪跑任務</h3>'+
    '<span class="small muted">由陪跑顧問核准</span></div>'+
    '<div class="grid" style="gap:9px">'+tasks.map(function(x){ return taskRow(x,s.id,{actions:frontAction}); }).join('')+'</div></div>';
}

/* ---------- AI 助理 ---------- */
var chatLog=[];
function frontAI(s){
  if(!chatLog.length){
    chatLog=[{r:'ai',t:aiGreeting(s)}];
  }
  return '<div class="page-head"><h2>AI 開店助理</h2><p>依你目前的實際進度回答；所有建議僅供參考，實際完成與否仍以核准人審核為準。</p></div>'+
  '<div class="grid" style="grid-template-columns:minmax(0,1.5fr) minmax(260px,.85fr);align-items:start">'+
    '<div class="card pad">'+
      '<div class="chat" id="chat">'+chatLog.map(function(m){
        return '<div class="msg '+(m.r==='ai'?'ai':'u')+'">'+m.t+'</div>'; }).join('')+'</div>'+
      '<hr>'+
      '<div class="row"><input id="ask" type="text" placeholder="問我：我還差什麼？下一步做什麼？" onkeydown="if(event.key===\'Enter\')sendAsk()">'+
        '<button class="btn primary" onclick="sendAsk()">送出</button></div>'+
      '<div class="chips">'+
        ['我目前缺什麼？','下一步該做什麼？','我的時數夠了嗎？','這階段誰負責核准？','為什麼被退回？','90 天陪跑進度'].map(function(q){
          return '<span class="chip" onclick="ask(\''+q+'\')">'+q+'</span>'; }).join('')+'</div>'+
    '</div>'+
    '<div class="card pad">'+
      '<div class="sec-title">AI 能做什麼</div>'+
      '<ul class="small" style="list-style:none;display:grid;gap:10px">'+
        ['📋 依進度算出你「還缺哪幾項」','🧭 給出下一步具體動作與負責窗口','⏰ 提醒逾期與尚未送審的項目','📊 產生個人／門店進度摘要','🔎 解釋退件原因與補正方式']
          .map(function(x){ return '<li>'+x+'</li>'; }).join('')+'</ul>'+
      '<hr>'+
      '<div class="sec-title">AI 不做什麼</div>'+
      '<ul class="small muted" style="list-style:none;display:grid;gap:8px">'+
        ['✕ 不代替講師或主管核准','✕ 不自動標記任何任務完成','✕ 不修改出席與時數紀錄']
          .map(function(x){ return '<li>'+x+'</li>'; }).join('')+'</ul>'+
      '<div class="tiny muted" style="margin-top:14px">本 DEMO 的回覆由規則引擎依真實資料組成，尚未接上語言模型。</div>'+
    '</div>'+
  '</div>';
}
function aiGreeting(s){
  var na=nextAction(s.id), st=stage(s.stage);
  return '你好，'+esc(s.owner)+'。<br>你目前在<b>第 '+st.no+' 階段「'+esc(st.name)+'」</b>，整體完成度 <b>'+overallPct(s.id)+'%</b>。<br>'+
    '最近要處理的是：<b>'+esc(na.text)+'</b><br><span style="color:var(--muted);font-size:13px">可以直接點下方的常見問題，或輸入你的問題。</span>';
}
function ask(q){ el('ask').value=q; sendAsk(); }
function sendAsk(){
  var v=el('ask').value.trim(); if(!v) return;
  el('ask').value='';
  chatLog.push({r:'u',t:esc(v)});
  chatLog.push({r:'ai',t:aiAnswer(v)});
  render();
  setTimeout(function(){ var c=el('chat'); if(c) c.scrollTop=c.scrollHeight; },30);
}
function aiAnswer(q){
  var u=me(), s=store(u.storeId), st=stage(s.stage), na=nextAction(s.id), miss=missingOf(s.id), dl=stageDeadline(s);
  function list(arr){ return arr.map(function(x){ return '・'+esc(x.def.title)+'（'+ST[x.p.status].label+'）'; }).join('<br>'); }
  if(/缺|少|還差|沒完成|未完成/.test(q)){
    var parts=[];
    if(miss.docs.length) parts.push('<b>文件</b><br>'+list(miss.docs));
    if(miss.courses.length) parts.push('<b>課程</b><br>'+list(miss.courses));
    if(miss.fields.length) parts.push('<b>現場確認</b><br>'+list(miss.fields));
    if(miss.forms.length) parts.push('<b>表單</b><br>'+list(miss.forms));
    if(st.reqHours) parts.push('<b>訓練時數</b><br>・目前 '+miss.hours+' 小時 / 門檻 '+st.reqHours+' 小時'+(miss.hours>=st.reqHours?'（已達標）':'（尚差 '+(st.reqHours-miss.hours)+' 小時）'));
    return parts.length? '在「'+esc(st.name)+'」你還缺這些：<br><br>'+parts.join('<br><br>') : '本階段項目都已核准通過，等待推進到下一階段。';
  }
  if(/下一步|接下來|要做什麼|該做/.test(q)){
    var extra='';
    if(na.kind==='todo'&&na.task&&na.task.def.type==='doc') extra='<br><br>提醒：文件請一次附齊，退件最常見原因是缺少法規附件或圖面標示不完整。';
    if(na.kind==='nextStage') extra='<br><br>下一階段的核准人會在解鎖後收到通知。';
    return '下一步：<b>'+esc(na.text)+'</b>'+(na.why?'<br>原因：'+esc(na.why):'')+
      '<br><br>本階段期限 '+fmtFull(dl.due)+(dl.left<0?'（<b style="color:var(--bad)">已逾期 '+Math.abs(dl.left)+' 天</b>）':'（剩 '+dl.left+' 天）')+extra;
  }
  if(/時數|小時|上課/.test(q)){
    var h=hoursOf(s.id);
    return '你目前累計出席 <b>'+h+' 小時</b>。<br>基礎訓練門檻 '+DB.settings.baseHours+' 小時'+(h>=DB.settings.baseHours?' ✓ 已達標':'（尚差 '+(DB.settings.baseHours-h)+' 小時）')+
      '<br>完整訓練門檻 '+DB.settings.totalHours+' 小時'+(h>=DB.settings.totalHours?' ✓ 已達標':'（尚差 '+(DB.settings.totalHours-h)+' 小時）')+
      '<br><br>時數只採計「出席已成立」的課程，報名但未報到不列入。';
  }
  if(/核准|審核|誰負責|窗口/.test(q)){
    return '「'+esc(st.name)+'」由 <b>'+ROLES[st.approver].label+'</b> 核准。<br>'+
      '流程是：你完成事項 → 送審 → 核准人審核 → 通過後才會顯示完成並解鎖下一階段。<br>'+
      '目前有 <b>'+stageStat(s.id,s.stage).submitted+'</b> 項在審核中。';
  }
  if(/退回|補件|不通過|為什麼/.test(q)){
    var rej=stageTasks(s.id,s.stage).filter(function(x){return x.p.status==='rejected';});
    if(!rej.length) return '目前沒有被退回的項目。';
    return '有 '+rej.length+' 項被退回：<br><br>'+rej.map(function(x){
      return '<b>'+esc(x.def.title)+'</b><br>退回原因：'+esc(x.p.reason)+'<br>建議：依原因補正後於「階段任務」重新送審。';
    }).join('<br><br>');
  }
  if(/90|陪跑|開幕/.test(q)){
    var d9=day90(s);
    if(!d9) return '尚未設定開幕日，90 天陪跑會在開幕後自動啟動。目前預計開幕：'+(s.openDate?fmtFull(s.openDate):'待定')+'。';
    return '開幕日 '+fmtFull(s.openDate)+'，今天是第 <b>'+d9.day+' 天</b>（'+d9.pct+'%），距結案還有 '+Math.max(0,d9.left)+' 天。<br>'+
      '陪跑任務完成 '+stageStat(s.id,'S5').done+' / '+stageStat(s.id,'S5').total+' 項。';
  }
  if(/進度|摘要|報告/.test(q)){
    return '<b>'+esc(s.name)+' 進度摘要</b><br>整體完成度 '+overallPct(s.id)+'%<br>目前階段：'+esc(st.name)+'（'+stageStat(s.id,s.stage).done+'/'+stageStat(s.id,s.stage).total+' 項）<br>'+
      '累計時數：'+hoursOf(s.id)+' 小時<br>期限：'+fmtFull(dl.due)+'<br>下一步：'+esc(na.text);
  }
  return '我可以回答這些：目前缺什麼、下一步做什麼、時數是否達標、誰負責核准、退件原因、90 天陪跑進度。<br>'+
    '（本 DEMO 以規則引擎回覆，正式版可接語言模型處理自由問答。）';
}
