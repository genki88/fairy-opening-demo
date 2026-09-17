/* =========================================================================
   路由 / 外框 / 登入
   ========================================================================= */
var PAGE='dash', ARG=null;

function go(page,arg){
  PAGE=page; ARG=arg||null;
  try{ location.hash='#'+page+(arg?'/'+arg:''); }catch(e){}
  render(); window.scrollTo(0,0);
}
function readHash(){
  var h=(location.hash||'').replace(/^#/,''); if(!h) return false;
  var p=h.split('/'); PAGE=p[0]; ARG=p[1]||null; return true;
}
window.addEventListener('hashchange',function(){ if(readHash()) render(); });

function topbar(nav,page,dark){
  var u=me(), isAdmin=ROLES[u.role].side==='admin';
  return '<header class="topbar'+(dark?' dark':'')+'">'+
    '<div class="brand" style="cursor:pointer" onclick="go(\'dash\')">'+
      '<img src="assets/'+(dark?'logo-sand':'logo-clay')+'.png" alt="FAIRY">'+
      '<span><b>門店開店輔導平台</b><small>90-DAY OPENING PROGRAM</small></span></div>'+
    (nav.length?'<nav class="nav">'+nav.map(function(n){
      return '<span class="navlink'+(page===n.k?' on':'')+'" onclick="go(\''+n.k+'\')">'+n.t+'</span>';
    }).join('')+'</nav>':'<div style="flex:1"></div>')+
    '<div class="me" onclick="openSwitch()">'+
      '<span class="av">'+esc(initials(u.name))+'</span>'+
      '<span class="nm"><b style="font-weight:500">'+esc(u.name)+'</b><small>'+ROLES[u.role].label+'</small></span>'+
      '<span style="opacity:.5;font-size:11px">▾</span></div>'+
  '</header>';
}

function openSwitch(){
  var u=me();
  var groups=[
    {t:'前台　加盟主／新人', us:DB.users.filter(function(x){return x.role==='trainee';}).slice(0,8)},
    {t:'後台　輔導與管理團隊', us:DB.users.filter(function(x){return x.role!=='trainee';})}
  ];
  openModal('<h3>切換身分</h3><div class="small muted">DEMO 用：同一份資料，不同角色看到不同畫面與權限</div>',
    groups.map(function(g){
      return '<div class="sec-title" style="margin-top:6px">'+g.t+'</div>'+
        g.us.map(function(x){
          var s=x.storeId?store(x.storeId):null;
          return '<button class="rolecard" onclick="switchTo(\''+x.id+'\')">'+
            '<span class="av'+(ROLES[x.role].side==='admin'?' dark':'')+'">'+esc(initials(x.name))+'</span>'+
            '<span style="flex:1"><b>'+esc(x.name)+(x.id===u.id?' <span class="tag clay tiny">目前</span>':'')+'</b>'+
            '<small>'+ROLES[x.role].label+'　·　'+esc(x.title)+(s?'　·　'+overallPct(s.id)+'%':'')+'</small></span>'+
            '<span class="muted">›</span></button>';
        }).join('');
    }).join(''),
    '<button class="btn" onclick="closeModal()">關閉</button>'+
    '<button class="btn bad" onclick="logout();closeModal();render()">登出</button>', true);
}
function switchTo(id){ login(id); PAGE='dash'; ARG=null; chatLog=[]; try{location.hash='#dash';}catch(e){} closeModal(); render(); }

/* ---------- 登入頁 ---------- */
function renderLogin(){
  var trainees=DB.users.filter(function(u){return u.role==='trainee';});
  var staff=DB.users.filter(function(u){return u.role!=='trainee';});
  var opened=DB.stores.filter(function(s){return s.openDate&&s.openDate<=todayStr();}).length;
  el('app').innerHTML =
  '<div class="login">'+
    '<div class="left">'+
      '<div style="position:relative;z-index:2">'+
        '<img src="assets/logo-sand.png" alt="FAIRY">'+
        '<h1>門店開店輔導<br>90 天平台</h1>'+
        '<p class="lead">從前期評估、教育訓練、開店準備到驗收開幕，'+
          '每個階段都有明確完成標準，由講師與輔導人員核准後才進入下一關。'+
          '開幕後 90 天持續陪跑，不再只是報名表與簽到表。</p>'+
        '<div class="kpis">'+
          '<div><b>'+DB.stores.length+'</b><span>輔導中門店</span></div>'+
          '<div><b>5</b><span>核准階段</span></div>'+
          '<div><b>'+DB.courses.length+'</b><span>課程梯次</span></div>'+
          '<div><b>'+opened+'</b><span>陪跑中</span></div>'+
        '</div>'+
      '</div>'+
      '<div class="small" style="color:#B69C8C;position:relative;z-index:2">'+
        '完成事項 → 講師／管理者驗收 → 核准 → 進入下一階段</div>'+
    '</div>'+
    '<div class="right">'+
      '<div class="sec-title">DEMO 登入　·　選擇身分即可進入</div>'+
      '<h2 style="font-size:24px;margin-bottom:4px">前台　加盟主／新人</h2>'+
      '<p class="small muted" style="margin-bottom:14px">看自己的開店流程、缺什麼、下一步做什麼</p>'+
      trainees.slice(0,4).map(function(u){
        var s=store(u.storeId);
        return '<button class="rolecard" onclick="switchTo(\''+u.id+'\')">'+
          '<span class="av">'+esc(initials(u.name))+'</span>'+
          '<span style="flex:1"><b>'+esc(u.name)+'</b><small>'+esc(s.name)+'　·　'+esc(stage(s.stage).name)+'　·　'+overallPct(s.id)+'%</small></span>'+
          '<span class="tag '+(isLate(s)?'bad':'sand')+'">'+(isLate(s)?'逾期':'第 '+stage(s.stage).no+' 階段')+'</span></button>';
      }).join('')+
      '<div class="tiny muted" style="margin:2px 0 22px">另有 '+(trainees.length-4)+' 位加盟主，登入後可由右上角切換</div>'+

      '<h2 style="font-size:24px;margin-bottom:4px">後台　輔導與管理</h2>'+
      '<p class="small muted" style="margin-bottom:14px">核准驗收、簽到管理、全門店儀表板</p>'+
      staff.filter(function(u){return u.role!=='admin';}).map(function(u){
        var n=pendingApprovalsFor(u).length;
        return '<button class="rolecard" onclick="switchTo(\''+u.id+'\')">'+
          '<span class="av dark">'+esc(initials(u.name))+'</span>'+
          '<span style="flex:1"><b>'+esc(u.name)+'</b><small>'+ROLES[u.role].label+'　·　'+esc(u.title)+'</small></span>'+
          (n?'<span class="tag warn">'+n+' 件待核</span>':'<span class="tag sand">—</span>')+'</button>';
      }).join('')+
      '<div class="tiny muted" style="margin-top:18px;line-height:1.8">'+
        '※ 這是功能示範版：資料存在你這台電腦的瀏覽器裡，換一台裝置會回到初始狀態，也不是多人共用的線上系統。<br>'+
        '※ 正式版需要接後端資料庫與帳號密碼登入。</div>'+
    '</div>'+
  '</div>';
}
function pendingApprovalsFor(u){
  var out=[];
  DB.stores.forEach(function(s){ DB.stages.forEach(function(st){ st.tasks.forEach(function(t){
    var p=prog(s.id,t.id);
    if(p&&p.status==='submitted'&&(u.role==='hq'||u.role==='admin'||st.approver===u.role)) out.push(1);
  });});});
  return out;
}

/* ---------- 主 render ---------- */
function render(){
  var u=me();
  if(!u){ renderLogin(); return; }
  if(ROLES[u.role].side==='front'){
    if(['dash','tasks','courses','pay','day90','ai'].indexOf(PAGE)<0) PAGE='dash';
    renderFront(PAGE);
  }else{
    if(['dash','approve','stores','checkin','courses','pay','stages','users','logs'].indexOf(PAGE)<0) PAGE='dash';
    renderAdmin(PAGE,ARG);
  }
  drawAllQR();
}
function drawAllQR(){
  DB.courses.forEach(function(c){
    ['qr-'+c.id,'qr-adm-'+c.id].forEach(function(id){
      var cv=el(id); if(cv) drawQR(cv,c.checkinCode+c.id);
    });
  });
}

readHash();
render();
