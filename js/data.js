/* =========================================================================
   法芮 FAIRY 門店開店輔導 90 天平台 — 資料層
   全部資料存在瀏覽器 localStorage（key: fairy-osp-v1）
   之後要接真後端（Supabase / 公司資料庫）只需要替換這一層的讀寫函式，
   畫面與流程邏輯完全不用改。
   ========================================================================= */
var DB_KEY = 'fairy-osp-v1';
var SESSION_KEY = 'fairy-osp-session';

/* ---------- 日期工具 ---------- */
function d0(){ var d=new Date(); d.setHours(0,0,0,0); return d; }
function addDays(d,n){ var x=new Date(d); x.setDate(x.getDate()+n); return x; }
function ymd(d){ var m=d.getMonth()+1,dd=d.getDate(); return d.getFullYear()+'-'+(m<10?'0':'')+m+'-'+(dd<10?'0':'')+dd; }
function fmt(s){ if(!s) return '—'; var p=String(s).split('-'); return p[1]+'/'+p[2]; }
function fmtFull(s){ if(!s) return '—'; var p=String(s).split('-'); return p[0]+'/'+p[1]+'/'+p[2]; }
function daysBetween(a,b){ return Math.round((new Date(b)-new Date(a))/86400000); }
function todayStr(){ return ymd(d0()); }

/* ---------- 角色 ---------- */
var ROLES = {
  trainee  :{label:'加盟主／新人',  side:'front', color:'sand'},
  instructor:{label:'講師',         side:'admin', color:'clay'},
  ops      :{label:'店務輔導人員',  side:'admin', color:'clay'},
  inspector:{label:'驗收主管',      side:'admin', color:'clay'},
  coach    :{label:'陪跑顧問',      side:'admin', color:'clay'},
  hq       :{label:'總部管理者',    side:'admin', color:'ink'},
  admin    :{label:'系統管理員',    side:'admin', color:'ink'}
};
var TASK_TYPE = {
  form :{icon:'📝', label:'表單填報'},
  doc  :{icon:'📄', label:'文件上傳'},
  course:{icon:'🎓',label:'課程時數'},
  field:{icon:'🏬', label:'現場確認'}
};
var ST = {
  locked   :{label:'未開放', tag:'sand'},
  todo     :{label:'待處理', tag:'sand'},
  submitted:{label:'待核准', tag:'warn'},
  approved :{label:'已通過', tag:'ok'},
  rejected :{label:'退回補件', tag:'bad'}
};

/* =========================================================================
   種子資料
   ========================================================================= */
function seed(){
  var T = d0();

  /* --- 五大階段（可在後台「階段設定」編輯）--- */
  var stages = [
    {id:'S1', no:1, name:'新人報到與基礎訓練', approver:'instructor', reqHours:18, days:21,
     desc:'完成報到、建立帳號與基本資料，並修畢品牌與營運基礎課程共 18 小時。',
     tasks:[
       {id:'T101',title:'完成新人報到與帳號建立',type:'form'},
       {id:'T102',title:'填寫加盟主基本資料表',type:'form'},
       {id:'T103',title:'簽署加盟意向書',type:'doc'},
       {id:'T104',title:'修畢「品牌與營運概論」6 小時',type:'course',courseCode:'C1'},
       {id:'T105',title:'修畢「產品知識與服務流程」6 小時',type:'course',courseCode:'C2'},
       {id:'T106',title:'修畢「門市經營基礎」6 小時',type:'course',courseCode:'C3'}
     ]},
    {id:'S2', no:2, name:'選址與店面評估', approver:'ops', reqHours:0, days:30,
     desc:'完成商圈調查、店面條件、租賃與法規文件確認，取得營運主管核准後始得簽約。',
     tasks:[
       {id:'T201',title:'商圈與人流調查表',type:'doc'},
       {id:'T202',title:'競業與市場評估報告',type:'doc'},
       {id:'T203',title:'店面坪數與平面格局圖',type:'doc'},
       {id:'T204',title:'水電、管線與載重條件確認',type:'field'},
       {id:'T205',title:'租賃條件與租約草案',type:'doc'},
       {id:'T206',title:'消防／使用執照等法規文件',type:'doc'}
     ]},
    {id:'S3', no:3, name:'開店準備', approver:'ops', reqHours:36, days:45,
     desc:'裝修、設備、人員到位，並完成實作技術訓練，累計訓練時數達 36 小時。',
     tasks:[
       {id:'T301',title:'裝修設計圖與工程排程',type:'doc'},
       {id:'T302',title:'設備採購清單與到貨確認',type:'doc'},
       {id:'T303',title:'人員招募與編制表',type:'form'},
       {id:'T304',title:'修畢「實作技術訓練」12 小時',type:'course',courseCode:'C4'},
       {id:'T305',title:'修畢「門市管理與數據」6 小時',type:'course',courseCode:'C5'},
       {id:'T306',title:'開幕行銷與預售方案',type:'doc'}
     ]},
    {id:'S4', no:4, name:'門店驗收與開幕', approver:'inspector', reqHours:0, days:14,
     desc:'現場逐項驗收，符合品牌標準並完成試營運，由驗收主管核准後排定開幕日。',
     tasks:[
       {id:'T401',title:'硬體工程與安全現場驗收',type:'field'},
       {id:'T402',title:'品牌識別與陳列驗收',type:'field'},
       {id:'T403',title:'人員服務流程驗收',type:'field'},
       {id:'T404',title:'試營運模擬（半日）',type:'field'},
       {id:'T405',title:'開幕日程與物料確認',type:'form'}
     ]},
    {id:'S5', no:5, name:'開店後 90 天陪跑', approver:'coach', reqHours:0, days:90,
     desc:'開幕現場陪跑 2 天，並於第 7／30／60／90 天完成回報與健檢，由陪跑顧問結案。',
     tasks:[
       {id:'T501',title:'開幕現場陪跑 2 天',type:'field'},
       {id:'T502',title:'第 7 天首週營運回報',type:'form'},
       {id:'T503',title:'第 30 天經營健檢',type:'form'},
       {id:'T504',title:'第 60 天行銷與人力複盤',type:'form'},
       {id:'T505',title:'第 90 天結案報告',type:'doc'}
     ]}
  ];

  /* --- 人員 --- */
  var users = [
    {id:'U01',name:'周雅筑',role:'hq',        title:'總部營運部 經理'},
    {id:'U02',name:'李昀珊',role:'instructor',title:'品牌訓練講師'},
    {id:'U03',name:'王建霖',role:'instructor',title:'技術訓練講師'},
    {id:'U04',name:'許家瑜',role:'ops',       title:'店務輔導專員'},
    {id:'U05',name:'何柏勳',role:'inspector', title:'工程驗收主管'},
    {id:'U06',name:'蕭淑芬',role:'coach',     title:'開店陪跑顧問'},
    {id:'U07',name:'系統管理員',role:'admin', title:'資訊部'}
  ];

  /* --- 門店（加盟主）--- */
  var stores = [
    {id:'FR001',code:'FR-001',name:'台北信義店',owner:'陳品妍',region:'北區',phone:'0912-334-101',joined:ymd(addDays(T,-168)),stage:'S5',openDate:ymd(addDays(T,-42)),coach:'U06',ops:'U04'},
    {id:'FR002',code:'FR-002',name:'台中七期店',owner:'林彥廷',region:'中區',phone:'0922-551-207',joined:ymd(addDays(T,-104)),stage:'S4',openDate:ymd(addDays(T,12)),coach:'U06',ops:'U04'},
    {id:'FR003',code:'FR-003',name:'高雄美術館店',owner:'黃瀞怡',region:'南區',phone:'0933-772-318',joined:ymd(addDays(T,-80)),stage:'S3',openDate:ymd(addDays(T,38)),coach:'U06',ops:'U04'},
    {id:'FR004',code:'FR-004',name:'桃園藝文店',owner:'張書豪',region:'北區',phone:'0955-208-644',joined:ymd(addDays(T,-118)),stage:'S3',openDate:ymd(addDays(T,20)),coach:'U06',ops:'U04'},
    {id:'FR005',code:'FR-005',name:'新竹巨城店',owner:'吳采蓁',region:'北區',phone:'0966-410-882',joined:ymd(addDays(T,-44)),stage:'S2',openDate:'',coach:'U06',ops:'U04'},
    {id:'FR006',code:'FR-006',name:'台南安平店',owner:'鄭偉誠',region:'南區',phone:'0977-630-159',joined:ymd(addDays(T,-60)),stage:'S2',openDate:'',coach:'U06',ops:'U04'},
    {id:'FR007',code:'FR-007',name:'嘉義文化店',owner:'劉宜蓁',region:'南區',phone:'0988-114-273',joined:ymd(addDays(T,-16)),stage:'S1',openDate:'',coach:'U06',ops:'U04'},
    {id:'FR008',code:'FR-008',name:'宜蘭礁溪店',owner:'蔡明翰',region:'東區',phone:'0910-905-736',joined:ymd(addDays(T,-6)),stage:'S1',openDate:'',coach:'U06',ops:'U04'}
  ];
  stores.forEach(function(s,i){
    users.push({id:'UT'+(i+1),name:s.owner,role:'trainee',title:s.name+'　加盟主',storeId:s.id});
  });

  /* --- 課程 --- */
  function C(code,name,hours,stageId,instr,dayOffset,room){
    return {id:code,code:code,name:name,hours:hours,stageId:stageId,instructor:instr,
            date:ymd(addDays(T,dayOffset)),time:'09:30–16:30',room:room,capacity:12,
            checkinCode:String(100000+Math.floor(Math.abs(Math.sin(code.charCodeAt(1)*97+dayOffset))*899999))};
  }
  var courses = [
    C('C1','品牌與營運概論',6,'S1','U02',-45,'總部 A 教室'),
    C('C2','產品知識與服務流程',6,'S1','U02',-38,'總部 A 教室'),
    C('C3','門市經營基礎',6,'S1','U02',-31,'總部 A 教室'),
    C('C4','實作技術訓練',12,'S3','U03',-20,'技術實作室'),
    C('C5','門市管理與數據',6,'S3','U02',-13,'總部 B 教室'),
    C('C1B','品牌與營運概論（第二梯）',6,'S1','U02',0,'總部 A 教室'),
    C('C2B','產品知識與服務流程（第二梯）',6,'S1','U02',7,'總部 A 教室'),
    C('C4B','實作技術訓練（第二梯）',12,'S3','U03',14,'技術實作室'),
    C('C3B','門市經營基礎（第二梯）',6,'S1','U02',21,'總部 A 教室')
  ];
  courses[5].name='品牌與營運概論（第二梯）';

  /* --- 進度：依門店所在階段鋪設 --- */
  var progress=[], attendance=[], logs=[];
  var order=['S1','S2','S3','S4','S5'];
  function stageOf(id){ for(var i=0;i<stages.length;i++) if(stages[i].id===id) return stages[i]; return null; }
  function push(storeId,taskId,status,extra){
    var p={storeId:storeId,taskId:taskId,status:status,submittedAt:'',approvedAt:'',by:'',note:'',reason:'',files:[]};
    if(extra) for(var k in extra) p[k]=extra[k];
    progress.push(p);
  }
  stores.forEach(function(s){
    var si=order.indexOf(s.stage);
    order.forEach(function(sid,idx){
      var st=stageOf(sid);
      st.tasks.forEach(function(t,ti){
        if(idx<si){
          push(s.id,t.id,'approved',{submittedAt:ymd(addDays(T,-(si-idx)*26-ti)),approvedAt:ymd(addDays(T,-(si-idx)*26-ti+1)),by:st.approver});
        }else if(idx===si){
          push(s.id,t.id,'todo');
        }else{
          push(s.id,t.id,'locked');
        }
      });
    });
  });
  function setP(storeId,taskId,status,extra){
    for(var i=0;i<progress.length;i++) if(progress[i].storeId===storeId&&progress[i].taskId===taskId){
      progress[i].status=status; if(extra) for(var k in extra) progress[i][k]=extra[k]; return;
    }
  }
  /* 讓 demo 有各種真實狀態 */
  // FR001 陪跑中：前兩項已核准，第三項待核准
  setP('FR001','T501','approved',{approvedAt:ymd(addDays(T,-40)),by:'coach'});
  setP('FR001','T502','approved',{approvedAt:ymd(addDays(T,-34)),by:'coach'});
  setP('FR001','T503','submitted',{submittedAt:ymd(addDays(T,-2)),note:'首月營收達標 108%，客單價偏低需討論'});
  // FR002 驗收中：三項通過、一項待核准、一項退回
  setP('FR002','T401','approved',{approvedAt:ymd(addDays(T,-8)),by:'inspector'});
  setP('FR002','T402','submitted',{submittedAt:ymd(addDays(T,-1)),note:'已補齊門面燈箱與立牌'});
  setP('FR002','T403','rejected',{submittedAt:ymd(addDays(T,-5)),reason:'服務流程走位有 3 處未依 SOP，請重新錄影送審'});
  // FR003 開店準備
  setP('FR003','T301','approved',{approvedAt:ymd(addDays(T,-16)),by:'ops'});
  setP('FR003','T302','submitted',{submittedAt:ymd(addDays(T,-3)),note:'設備已到 8 成，冷藏櫃延後一週'});
  setP('FR003','T304','approved',{approvedAt:ymd(addDays(T,-18)),by:'ops'});
  // FR004 落後：文件退回兩次
  setP('FR004','T301','rejected',{submittedAt:ymd(addDays(T,-21)),reason:'平面圖未標示逃生動線與消防設備位置'});
  setP('FR004','T302','todo');
  setP('FR004','T303','submitted',{submittedAt:ymd(addDays(T,-9)),note:'店長人選待確認'});
  // FR005 選址中
  setP('FR005','T201','approved',{approvedAt:ymd(addDays(T,-12)),by:'ops'});
  setP('FR005','T202','submitted',{submittedAt:ymd(addDays(T,-2)),note:'競品 3 家已盤點'});
  // FR006 退回補件
  setP('FR006','T201','rejected',{submittedAt:ymd(addDays(T,-11)),reason:'人流計數僅採樣平日，請補假日兩個時段'});
  setP('FR006','T203','submitted',{submittedAt:ymd(addDays(T,-4)),note:'室內 28.5 坪'});
  // FR007 基礎訓練中
  setP('FR007','T101','approved',{approvedAt:ymd(addDays(T,-23)),by:'instructor'});
  setP('FR007','T102','approved',{approvedAt:ymd(addDays(T,-22)),by:'instructor'});
  setP('FR007','T103','submitted',{submittedAt:ymd(addDays(T,-2)),note:'已用電子簽章回傳'});
  // FR008 剛報到
  setP('FR008','T101','approved',{approvedAt:ymd(addDays(T,-5)),by:'instructor'});

  /* --- 出席紀錄 --- */
  function traineeOf(storeId){ for(var i=0;i<users.length;i++) if(users[i].storeId===storeId) return users[i].id; return ''; }
  function att(courseId,storeId,status,method,by,offset){
    attendance.push({id:'A'+attendance.length,courseId:courseId,storeId:storeId,userId:traineeOf(storeId),
      status:status,method:method||'manual',by:by||'U02',at:ymd(addDays(T,offset||0))});
  }
  ['FR001','FR002','FR003','FR004','FR005','FR006'].forEach(function(s,i){
    att('C1',s,'present','qr','U02',-45); att('C2',s,'present',i%3===0?'manual':'qr','U02',-38);
    att('C3',s,i===3?'absent':'present','qr','U02',-31);
  });
  ['FR001','FR002','FR003','FR004'].forEach(function(s,i){
    att('C4',s,'present','qr','U03',-20); att('C5',s,i===3?'absent':'present','manual','U02',-13);
  });
  att('C1',  'FR007','present','qr','U02',-45);
  // 今日課程 C1B：報名 4 位，2 位已報到
  att('C1B','FR007','present','qr','U02',0);
  att('C1B','FR008','present','manual','U02',0);
  att('C1B','FR005','pending','','',0);
  att('C1B','FR006','pending','','',0);
  // 未來課程報名（pending）
  att('C2B','FR007','pending','','',7); att('C2B','FR008','pending','','',7);
  att('C4B','FR003','pending','','',14); att('C4B','FR004','pending','','',14);

  logs.push({at:ymd(T),actor:'系統',action:'初始化',target:'—',detail:'載入示範資料（8 家門店 / 9 門課程）'});

  return {v:1, stages:stages, users:users, stores:stores, courses:courses,
          progress:progress, attendance:attendance, logs:logs,
          settings:{brand:'法芮 FAIRY', day90:90, baseHours:18, totalHours:36,
                    rules:{lateDays:14, autoUnlock:true}}};
}

/* =========================================================================
   讀寫
   ========================================================================= */
function load(){
  try{ var raw=localStorage.getItem(DB_KEY); if(raw){ var d=JSON.parse(raw); if(d&&d.v===1) return d; } }catch(e){}
  var s=seed(); save(s); return s;
}
function save(d){ try{ localStorage.setItem(DB_KEY,JSON.stringify(d)); }catch(e){ console.warn('儲存失敗',e); } }
var DB = load();
function commit(){ save(DB); }
function resetDB(){ localStorage.removeItem(DB_KEY); DB=load(); }

/* ---------- 查詢 ---------- */
function stage(id){ return DB.stages.filter(function(s){return s.id===id;})[0]; }
function store(id){ return DB.stores.filter(function(s){return s.id===id;})[0]; }
function user(id){ return DB.users.filter(function(u){return u.id===id;})[0]; }
function course(id){ return DB.courses.filter(function(c){return c.id===id;})[0]; }
function taskDef(tid){
  for(var i=0;i<DB.stages.length;i++){ var t=DB.stages[i].tasks.filter(function(x){return x.id===tid;})[0];
    if(t){ t=JSON.parse(JSON.stringify(t)); t.stageId=DB.stages[i].id; return t; } }
  return null;
}
function prog(storeId,taskId){ return DB.progress.filter(function(p){return p.storeId===storeId&&p.taskId===taskId;})[0]; }
function stageTasks(storeId,stageId){
  var st=stage(stageId);
  return st.tasks.map(function(t){ var p=prog(storeId,t.id)||{status:'locked'}; 
    return {def:t, p:p, stageId:stageId}; });
}
function traineeOfStore(storeId){ return DB.users.filter(function(u){return u.storeId===storeId;})[0]; }

/* ---------- 計算 ---------- */
function stageStat(storeId,stageId){
  var ts=stageTasks(storeId,stageId), done=0, sub=0, rej=0;
  ts.forEach(function(x){ if(x.p.status==='approved')done++; else if(x.p.status==='submitted')sub++; else if(x.p.status==='rejected')rej++; });
  return {total:ts.length, done:done, submitted:sub, rejected:rej,
          pct:ts.length?Math.round(done/ts.length*100):0, complete:done===ts.length};
}
function overallPct(storeId){
  var all=0,done=0;
  DB.stages.forEach(function(s){ var st=stageStat(storeId,s.id); all+=st.total; done+=st.done; });
  return all?Math.round(done/all*100):0;
}
function hoursOf(storeId){
  var h=0;
  DB.attendance.forEach(function(a){ if(a.storeId===storeId&&a.status==='present'){ var c=course(a.courseId); if(c) h+=c.hours; } });
  return h;
}
function hoursByStage(storeId,stageId){
  var h=0;
  DB.attendance.forEach(function(a){ if(a.storeId===storeId&&a.status==='present'){ var c=course(a.courseId); if(c&&c.stageId===stageId) h+=c.hours; } });
  return h;
}
/* 距離目前階段的期限天數（負數＝已逾期） */
function stageDeadline(s){
  var st=stage(s.stage), idx=DB.stages.map(function(x){return x.id;}).indexOf(s.stage);
  var base=new Date(s.joined), acc=0;
  for(var i=0;i<idx;i++) acc+=DB.stages[i].days;
  var start=addDays(base,acc);
  return {start:ymd(start), due:ymd(addDays(start,st.days)), left:daysBetween(todayStr(),ymd(addDays(start,st.days)))};
}
function isLate(s){ return stageDeadline(s).left<0 && s.stage!=='S5'; }
function day90(s){
  if(!s.openDate||s.openDate>todayStr()) return null;  /* 未來開幕日不算陪跑 */
  var n=daysBetween(s.openDate,todayStr());
  return {day:n+1, pct:Math.min(100,Math.round((n+1)/DB.settings.day90*100)), left:DB.settings.day90-(n+1)};
}
function nextAction(storeId){
  var s=store(storeId), order=['S1','S2','S3','S4','S5'], si=order.indexOf(s.stage);
  var ts=stageTasks(storeId,s.stage);
  var rej=ts.filter(function(x){return x.p.status==='rejected';});
  if(rej.length) return {kind:'rejected',task:rej[0],text:'補正「'+rej[0].def.title+'」並重新送審',why:rej[0].p.reason};
  var todo=ts.filter(function(x){return x.p.status==='todo';});
  if(todo.length) return {kind:'todo',task:todo[0],text:'完成並送審「'+todo[0].def.title+'」'};
  var sub=ts.filter(function(x){return x.p.status==='submitted';});
  if(sub.length) return {kind:'waiting',task:sub[0],text:'等待'+ROLES[stage(s.stage).approver].label+'核准（共 '+sub.length+' 項審核中）'};
  if(si<4) return {kind:'nextStage',text:'本階段全部通過，等待進入「'+stage(order[si+1]).name+'」'};
  return {kind:'done',text:'90 天陪跑項目已全數完成，可辦理結案'};
}
function missingOf(storeId){
  var s=store(storeId), out={docs:[],courses:[],fields:[],forms:[],hours:0,hoursNeed:0};
  var st=stage(s.stage);
  out.hoursNeed=st.reqHours; out.hours=hoursOf(storeId);
  stageTasks(storeId,s.stage).forEach(function(x){
    if(x.p.status==='approved') return;
    var bucket = x.def.type==='doc'?out.docs : x.def.type==='course'?out.courses : x.def.type==='field'?out.fields : out.forms;
    bucket.push(x);
  });
  return out;
}
function todayCourses(){ var t=todayStr(); return DB.courses.filter(function(c){return c.date===t;}); }
function roster(courseId){ return DB.attendance.filter(function(a){return a.courseId===courseId;}); }
function pendingApprovals(role){
  var out=[];
  DB.stores.forEach(function(s){
    DB.stages.forEach(function(st){
      st.tasks.forEach(function(t){
        var p=prog(s.id,t.id);
        if(p&&p.status==='submitted'){
          if(!role || role==='hq' || role==='admin' || st.approver===role)
            out.push({store:s,stage:st,task:t,p:p});
        }
      });
    });
  });
  out.sort(function(a,b){ return (a.p.submittedAt||'').localeCompare(b.p.submittedAt||''); });
  return out;
}
function blockers(){   /* 最常卡關項目 */
  var map={};
  DB.progress.forEach(function(p){
    if(p.status==='rejected'||p.status==='submitted'){
      var t=taskDef(p.taskId); if(!t) return;
      var k=p.taskId; map[k]=map[k]||{task:t,rejected:0,submitted:0,total:0};
      map[k][p.status]++; map[k].total++;
    }
  });
  var arr=[]; for(var k in map) arr.push(map[k]);
  arr.sort(function(a,b){ return (b.rejected*2+b.submitted)-(a.rejected*2+a.submitted); });
  return arr.slice(0,6);
}

/* ---------- 異動 ---------- */
function log(action,target,detail){
  DB.logs.unshift({at:new Date().toLocaleString('zh-TW',{hour12:false}),
    actor:(me()?me().name:'訪客'),action:action,target:target,detail:detail||''});
  if(DB.logs.length>300) DB.logs.length=300;
}
function submitTask(storeId,taskId,note,fileName){
  var p=prog(storeId,taskId); if(!p) return;
  p.status='submitted'; p.submittedAt=todayStr(); p.note=note||''; p.reason='';
  if(fileName) p.files=(p.files||[]).concat([{name:fileName,at:todayStr()}]);
  log('送審', store(storeId).name+' / '+taskDef(taskId).title, note||'');
  commit();
}
function decide(storeId,taskId,ok,reason){
  var p=prog(storeId,taskId); if(!p) return;
  if(ok){ p.status='approved'; p.approvedAt=todayStr(); p.by=(me()?me().role:''); p.reason=''; }
  else  { p.status='rejected'; p.reason=reason||'請補充資料'; }
  log(ok?'核准通過':'退回補件', store(storeId).name+' / '+taskDef(taskId).title, reason||'');
  commit();
  if(ok) tryAdvance(storeId);
}
function tryAdvance(storeId){
  if(!DB.settings.rules.autoUnlock) return false;
  var s=store(storeId), order=['S1','S2','S3','S4','S5'], si=order.indexOf(s.stage);
  var st=stageStat(storeId,s.stage);
  var stg=stage(s.stage);
  if(!st.complete) return false;
  if(stg.reqHours && hoursOf(storeId)<stg.reqHours) return false;
  if(si>=4) return false;
  s.stage=order[si+1];
  stage(s.stage).tasks.forEach(function(t){ var p=prog(storeId,t.id); if(p&&p.status==='locked') p.status='todo'; });
  log('階段推進', s.name, '進入「'+stage(s.stage).name+'」');
  commit();
  return true;
}
function checkin(courseId,storeId,method){
  var a=DB.attendance.filter(function(x){return x.courseId===courseId&&x.storeId===storeId;})[0];
  if(!a){ a={id:'A'+Date.now(),courseId:courseId,storeId:storeId,userId:(traineeOfStore(storeId)||{}).id,status:'pending'}; DB.attendance.push(a); }
  a.status='present'; a.method=method||'manual'; a.by=(me()?me().id:''); a.at=todayStr();
  log('完成報到', course(courseId).name+' / '+store(storeId).name, method==='qr'?'掃碼報到':'後台勾選');
  commit(); autoCourseTask(storeId);
}
function markAbsent(courseId,storeId){
  var a=DB.attendance.filter(function(x){return x.courseId===courseId&&x.storeId===storeId;})[0];
  if(a){ a.status='absent'; a.at=todayStr(); a.by=(me()?me().id:''); log('標記缺席',course(courseId).name+' / '+store(storeId).name); commit(); }
}
/* 課程出席達標 → 對應課程型任務自動變成「待核准」（仍需講師核准，不由學員自行打勾）*/
function autoCourseTask(storeId){
  DB.stages.forEach(function(st){
    st.tasks.forEach(function(t){
      if(t.type!=='course'||!t.courseCode) return;
      var p=prog(storeId,t.id); if(!p||p.status==='approved') return;
      var hit=DB.attendance.filter(function(a){
        return a.storeId===storeId&&a.status==='present'&&(a.courseId===t.courseCode||a.courseId===t.courseCode+'B');})[0];
      if(hit&&p.status!=='submitted'){ p.status='submitted'; p.submittedAt=todayStr(); p.note='系統依出席紀錄自動送審'; }
    });
  });
  commit();
  /* 出席後時數可能剛好跨過門檻，若任務也都已核准就推進 */
  tryAdvance(storeId);
}
function addCourse(c){ c.id='C'+Date.now(); c.checkinCode=String(100000+Math.floor(Math.random()*899999)); DB.courses.push(c); log('新增課程',c.name); commit(); }
function addStore(s){
  s.id='FR'+String(DB.stores.length+1).padStart(3,'0'); s.code='FR-'+String(DB.stores.length+1).padStart(3,'0');
  s.stage='S1'; s.joined=todayStr(); s.openDate=''; s.coach='U06'; s.ops='U04';
  DB.stores.push(s);
  DB.users.push({id:'UT'+Date.now(),name:s.owner,role:'trainee',title:s.name+'　加盟主',storeId:s.id});
  DB.stages.forEach(function(st){ st.tasks.forEach(function(t){
    DB.progress.push({storeId:s.id,taskId:t.id,status:st.id==='S1'?'todo':'locked',submittedAt:'',approvedAt:'',by:'',note:'',reason:'',files:[]});
  });});
  log('新增門店',s.name,'已建立帳號與第一階段待辦');
  commit(); return s;
}

/* ---------- Session ---------- */
function me(){ try{ var id=localStorage.getItem(SESSION_KEY); return id?user(id):null; }catch(e){ return null; } }
function login(id){ localStorage.setItem(SESSION_KEY,id); }
function logout(){ localStorage.removeItem(SESSION_KEY); }
function canApprove(stageId){
  var u=me(); if(!u) return false;
  if(u.role==='hq'||u.role==='admin') return true;
  return stage(stageId).approver===u.role;
}
