/* =========================================================================
   繳費與收款層（DEMO 模擬版，未接真金流）
   正式版把 payOrder() 換成呼叫金流商 API，把 confirmOrder() 換成接收背景通知即可，
   其餘畫面與流程完全不用改。
   ========================================================================= */

var FEE_KIND = {
  course   :{label:'課程費',   gate:true },
  enroll   :{label:'報名費',   gate:true },
  material :{label:'教材費',   gate:false},
  franchise:{label:'加盟金',   gate:false},
  deposit  :{label:'保證金',   gate:false},
  other    :{label:'其他費用', gate:false}
};

/* 付款方式：DEMO 只模擬流程，費率為市場行情參考值，正式簽約以金流商報價為準 */
var PAY_METHOD = {
  credit  :{label:'信用卡',        fee:'約 2.8%',    cap:'',            auto:true,
            note:'即時入帳。萬元級的課程費適合，十萬元以上不建議（手續費太貴）。'},
  atm     :{label:'ATM 虛擬帳號',  fee:'約 NT$15/筆', cap:'',            auto:true,
            note:'每人一組專屬帳號，匯入後系統自動認人銷帳，財務不用再比對帳單。大額首選。'},
  cvs     :{label:'超商代碼繳費',  fee:'約 NT$30/筆', cap:'上限 2 萬',   auto:true,
            note:'不用網銀也能繳，適合小額報名費。'},
  transfer:{label:'匯款／臨櫃',    fee:'免手續費',    cap:'',            auto:false,
            note:'現行作法。學員上傳收據，財務在後台人工確認銷帳。'}
};

var ORDER_ST = {
  unpaid    :{label:'待繳費',   tag:'warn'},
  processing:{label:'確認中',   tag:'info'},
  paid      :{label:'已繳費',   tag:'ok'},
  refunded  :{label:'已退費',   tag:'sand'},
  cancelled :{label:'已取消',   tag:'sand'}
};

/* ---------- 初始化：補上繳費資料表，並依既有出席／報名回填繳費單 ---------- */
function ensurePay(){
  var dirty=false;
  if(!DB.orders){ DB.orders=[]; dirty=true; }
  if(!DB.feeItems){
    DB.feeItems=[
      {id:'F1',kind:'course',   name:'訓練課程費（每小時）', price:1000, unit:'小時', note:'依課程時數計價'},
      {id:'F2',kind:'material', name:'教材與工具包',        price:3500, unit:'份',   note:'第一階段一次性'},
      {id:'F3',kind:'enroll',   name:'開店輔導報名費',      price:5000, unit:'式',   note:'加盟簽約時收取'},
      {id:'F4',kind:'franchise',name:'加盟金',              price:0,    unit:'式',   note:'【金額待確認】合約檔與教戰手冊數字不一致，需總部定案'},
      {id:'F5',kind:'deposit',  name:'履約保證金',          price:0,    unit:'式',   note:'【金額待確認】'}
    ];
    dirty=true;
  }
  /* 回填：每一筆課程報名都該有一張繳費單 */
  DB.attendance.forEach(function(a){
    var c=course(a.courseId); if(!c) return;
    if(DB.orders.filter(function(o){return o.storeId===a.storeId&&o.courseId===a.courseId;}).length) return;
    var paid = a.status==='present' || a.status==='absent';   /* 已上過課的視為已繳費 */
    var o=newOrder(a.storeId,[{kind:'course',refId:c.id,name:c.name+'（'+c.hours+' 小時）',qty:1,price:coursePrice(c)}],c.id);
    if(paid){
      o.status='paid';
      o.method = (a.storeId.charCodeAt(4)%2)? 'atm':'credit';
      o.paidAt = a.at||c.date;
      o.tradeNo='DEMO'+o.no.replace(/-/g,'');
      o.invoiceNo='AB-'+(10000000+Math.floor(Math.random()*8999999));
      o.invoiceAt=o.paidAt;
    }
    DB.orders.push(o); dirty=true;
  });
  /* 今日課程：讓一位已繳費（講師可直接勾選）、一位未繳費（示範未繳擋報到） */
  todayCourses().forEach(function(c){
    var rs=DB.orders.filter(function(o){return o.courseId===c.id&&o.status!=='paid';});
    if(rs.length>=1){
      var o=rs[0];
      o.status='paid'; o.method='credit'; o.paidAt=todayStr(); o.receipt='';
      o.tradeNo='DEMO'+o.no.replace(/-/g,'');
      o.invoiceNo='AB-'+(10000000+Math.floor(Math.random()*8999999)); o.invoiceAt=o.paidAt;
      dirty=true;
    }
  });
  /* 讓 DEMO 有一筆「已上傳收據等財務確認」的狀態（避開今日課程，免得擋住簽到示範） */
  if(!DB.orders.filter(function(o){return o.status==='processing';}).length){
    var td=todayCourses().map(function(c){return c.id;});
    var pend=DB.orders.filter(function(o){return o.status==='unpaid'&&td.indexOf(o.courseId)<0;});
    if(pend.length){
      pend[0].status='processing'; pend[0].method='transfer';
      pend[0].receipt='匯款收據_0917.jpg'; pend[0].submittedAt=todayStr(); dirty=true;
    }
  }
  if(dirty) commit();
}
function coursePrice(c){
  var per=(DB.feeItems.filter(function(f){return f.id==='F1';})[0]||{price:1000}).price;
  return c.hours*per;
}
function orderSeq(){
  var y=new Date(), p=String(y.getFullYear()).slice(2)+String(y.getMonth()+1).padStart(2,'0');
  var n=DB.orders.filter(function(o){return o.no.indexOf('FR'+p)===0;}).length+1;
  return 'FR'+p+'-'+String(n).padStart(4,'0');
}
function newOrder(storeId,items,courseId){
  var amt=items.reduce(function(a,x){return a+x.price*x.qty;},0);
  var s=store(storeId);
  return {id:'O'+Math.random().toString(36).slice(2,9), no:orderSeq(), storeId:storeId, courseId:courseId||'',
    items:items, amount:amt, status:'unpaid', method:'', vAccount:'', tradeNo:'',
    invoiceNo:'', invoiceAt:'', taxId:'', title:s?s.name:'', receipt:'', submittedAt:'',
    createdAt:todayStr(), dueAt:ymd(addDays(d0(),7)), paidAt:'', confirmedBy:''};
}

/* ---------- 查詢 ---------- */
function ordersOf(storeId){ return (DB.orders||[]).filter(function(o){return o.storeId===storeId;}); }
function orderById(id){ return (DB.orders||[]).filter(function(o){return o.id===id;})[0]; }
function courseOrder(storeId,courseId){
  return (DB.orders||[]).filter(function(o){return o.storeId===storeId&&o.courseId===courseId;})[0];
}
function isCoursePaid(storeId,courseId){
  var o=courseOrder(storeId,courseId);
  return !o || o.status==='paid';       /* 沒有繳費單視為免費課程 */
}
function unpaidOf(storeId){
  return ordersOf(storeId).filter(function(o){return o.status==='unpaid'||o.status==='processing';});
}
function receivables(){
  var all=DB.orders||[];
  var sum=function(f){ return all.filter(f).reduce(function(a,o){return a+o.amount;},0); };
  return {
    total    : sum(function(o){return o.status!=='cancelled'&&o.status!=='refunded';}),
    paid     : sum(function(o){return o.status==='paid';}),
    unpaid   : sum(function(o){return o.status==='unpaid';}),
    checking : sum(function(o){return o.status==='processing';}),
    overdue  : sum(function(o){return o.status==='unpaid'&&o.dueAt<todayStr();}),
    nUnpaid  : all.filter(function(o){return o.status==='unpaid';}).length,
    nChecking: all.filter(function(o){return o.status==='processing';}).length
  };
}
function money(n){ return 'NT$'+String(n).replace(/\B(?=(\d{3})+(?!\d))/g,','); }

/* ---------- 異動 ---------- */
function createCourseOrder(storeId,courseId){
  var c=course(courseId); if(!c) return null;
  var ex=courseOrder(storeId,courseId); if(ex) return ex;
  var o=newOrder(storeId,[{kind:'course',refId:c.id,name:c.name+'（'+c.hours+' 小時）',qty:1,price:coursePrice(c)}],c.id);
  DB.orders.push(o); log('產生繳費單',store(storeId).name+' / '+c.name,money(o.amount)); commit();
  return o;
}
/* 線上付款（DEMO 模擬）：正式版改為導向金流商，並以背景通知回寫狀態 */
function payOrder(orderId,method){
  var o=orderById(orderId); if(!o) return;
  o.method=method;
  if(method==='atm'){
    o.status='unpaid';
    o.vAccount='(013) 8888-'+String(1000000000+Math.floor(Math.random()*899999999)).slice(0,10);
    log('取得虛擬帳號',o.no,o.vAccount);
  }else if(method==='transfer'){
    o.status='processing'; o.submittedAt=todayStr();
    log('上傳匯款收據',o.no,'等待財務確認');
  }else{
    o.status='paid'; o.paidAt=todayStr();
    o.tradeNo='DEMO'+Date.now();
    o.invoiceNo='AB-'+(10000000+Math.floor(Math.random()*8999999)); o.invoiceAt=todayStr();
    log('繳費完成',o.no,PAY_METHOD[method].label+' '+money(o.amount));
  }
  commit();
}
/* 模擬「匯款進來了」：ATM 虛擬帳號自動銷帳 */
function simulateBankIn(orderId){
  var o=orderById(orderId); if(!o) return;
  o.status='paid'; o.paidAt=todayStr(); o.tradeNo='ATM'+Date.now();
  o.invoiceNo='AB-'+(10000000+Math.floor(Math.random()*8999999)); o.invoiceAt=todayStr();
  log('虛擬帳號自動銷帳',o.no,money(o.amount)); commit();
}
/* 財務人工銷帳 */
function confirmOrder(orderId,ok,reason){
  var o=orderById(orderId); if(!o) return;
  if(ok){
    o.status='paid'; o.paidAt=todayStr(); o.confirmedBy=(me()?me().name:'');
    o.invoiceNo='AB-'+(10000000+Math.floor(Math.random()*8999999)); o.invoiceAt=todayStr();
    log('確認收款',o.no,money(o.amount)+'（人工銷帳）');
  }else{
    o.status='unpaid'; o.receipt=''; o.note=reason||'收據無法辨識';
    log('退回收據',o.no,reason||'');
  }
  commit();
}
function cancelOrder(orderId){
  var o=orderById(orderId); if(!o) return;
  o.status='cancelled'; log('取消繳費單',o.no); commit();
}

/* =========================================================================
   前台：我的繳費
   ========================================================================= */
function frontPay(s){
  var os=ordersOf(s.id).sort(function(a,b){ return (b.createdAt||'').localeCompare(a.createdAt||''); });
  var un=unpaidOf(s.id);
  var paidSum=os.filter(function(o){return o.status==='paid';}).reduce(function(a,o){return a+o.amount;},0);
  var unSum=un.reduce(function(a,o){return a+o.amount;},0);

  return '<div class="page-head"><h2>我的繳費</h2><p>課程報名後會產生繳費單，繳費完成才能報到上課。</p></div>'+
  (un.length? '<div class="card pad" style="border-color:var(--warn);background:var(--warn-bg);margin-bottom:18px">'+
    '<div class="spread wrap"><div><b style="color:var(--warn)">⚠ 有 '+un.length+' 筆尚未完成繳費，合計 '+money(unSum)+'</b>'+
    '<div class="small" style="margin-top:4px">未繳費的課程無法掃碼報到，時數也不會計入。</div></div></div></div>':'')+

  '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(190px,1fr));margin-bottom:18px">'+
    stat('累計已繳',money(paidSum),'',true)+
    stat('待繳金額',money(unSum),'')+
    stat('繳費單數',os.length,' 筆')+
    stat('已開立發票',os.filter(function(o){return o.invoiceNo;}).length,' 張')+
  '</div>'+

  '<div class="card" style="overflow-x:auto">'+
  '<table><thead><tr><th>繳費單號</th><th>項目</th><th>金額</th><th>期限</th><th>狀態</th><th>付款方式</th><th>發票</th><th></th></tr></thead><tbody>'+
  os.map(function(o){
    var late=o.status==='unpaid'&&o.dueAt<todayStr();
    return '<tr>'+
      '<td class="mono small">'+esc(o.no)+'<div class="tiny muted">'+fmtFull(o.createdAt)+'</div></td>'+
      '<td class="small">'+o.items.map(function(i){return esc(i.name);}).join('<br>')+'</td>'+
      '<td class="mono"><b>'+money(o.amount)+'</b></td>'+
      '<td class="small mono'+(late?'" style="color:var(--bad)':'')+'">'+fmt(o.dueAt)+(late?'<div class="tiny">已逾期</div>':'')+'</td>'+
      '<td><span class="tag '+ORDER_ST[o.status].tag+'">'+ORDER_ST[o.status].label+'</span></td>'+
      '<td class="small muted">'+(o.method?PAY_METHOD[o.method].label:'—')+
        (o.vAccount?'<div class="tiny mono">'+esc(o.vAccount)+'</div>':'')+'</td>'+
      '<td class="small mono muted">'+(o.invoiceNo?esc(o.invoiceNo):'—')+'</td>'+
      '<td>'+(o.status==='unpaid'?'<button class="btn xs clay" onclick="openPay(\''+o.id+'\')">前往繳費</button>':
              o.status==='processing'?'<span class="tiny muted">財務確認中</span>':
              o.status==='paid'?'<button class="btn xs" onclick="openReceipt(\''+o.id+'\')">明細</button>':'')+'</td>'+
    '</tr>';
  }).join('')+'</tbody></table>'+
  (os.length?'':'<div class="empty"><span class="em">🧾</span>尚無繳費紀錄</div>')+'</div>'+

  '<div class="card pad" style="margin-top:18px">'+
    '<div class="sec-title">可用的繳費方式</div>'+
    '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(230px,1fr))">'+
    Object.keys(PAY_METHOD).map(function(k){ var m=PAY_METHOD[k];
      return '<div style="padding:12px 14px;border:1px solid var(--line-soft);border-radius:8px;background:#fff">'+
        '<b class="small">'+m.label+'</b><div class="tiny muted" style="margin-top:4px">'+m.note+'</div></div>';
    }).join('')+'</div>'+
    '<div class="tiny muted" style="margin-top:12px">※ DEMO 為模擬流程，未連接真實金流，不會產生任何實際扣款。</div>'+
  '</div>';
}

function openPay(orderId){
  var o=orderById(orderId);
  openModal('<h3>繳費　'+esc(o.no)+'</h3><div class="small muted">'+o.items.map(function(i){return esc(i.name);}).join('、')+'</div>',
    '<div class="card pad" style="background:var(--sand);border-color:var(--sand-deep);margin-bottom:16px">'+
      '<div class="spread"><span class="small">應繳金額</span>'+
        '<b class="mono" style="font-family:var(--serif);font-size:26px">'+money(o.amount)+'</b></div>'+
      '<div class="spread small muted" style="margin-top:6px"><span>繳費期限</span><span class="mono">'+fmtFull(o.dueAt)+'</span></div>'+
    '</div>'+
    '<label class="fl">發票開立</label>'+
    '<div class="grid" style="grid-template-columns:1fr 1fr;margin-bottom:16px">'+
      '<input type="text" id="pay-title" value="'+esc(o.title)+'" placeholder="發票抬頭">'+
      '<input type="text" id="pay-tax" value="'+esc(o.taxId)+'" placeholder="統一編號（B2B 必填）">'+
    '</div>'+
    '<label class="fl">選擇付款方式</label>'+
    '<div class="grid" style="gap:8px">'+
    Object.keys(PAY_METHOD).map(function(k){ var m=PAY_METHOD[k];
      return '<button class="rolecard" style="margin:0" onclick="doPay(\''+orderId+'\',\''+k+'\')">'+
        '<span class="av">'+(k==='credit'?'💳':k==='atm'?'🏦':k==='cvs'?'🏪':'📄')+'</span>'+
        '<span style="flex:1"><b>'+m.label+'</b><small>'+m.note+'</small></span>'+
        '<span class="tag sand tiny">'+m.fee+'</span></button>';
    }).join('')+'</div>',
    '<button class="btn" onclick="closeModal()">稍後再繳</button>');
}
function doPay(orderId,method){
  var o=orderById(orderId);
  o.title=(el('pay-title')||{}).value||o.title;
  o.taxId=(el('pay-tax')||{}).value||'';
  payOrder(orderId,method);
  closeModal();
  var r=orderById(orderId);
  if(method==='atm'){
    openModal('<h3>虛擬帳號已產生</h3>',
      '<div class="card pad" style="background:var(--sand);border-color:var(--sand-deep);text-align:center">'+
        '<div class="sec-title">請於期限前轉帳至此專屬帳號</div>'+
        '<div class="mono" style="font-family:var(--serif);font-size:24px;letter-spacing:.04em">'+esc(r.vAccount)+'</div>'+
        '<div class="small" style="margin-top:8px">金額 <b>'+money(r.amount)+'</b>　期限 '+fmtFull(r.dueAt)+'</div>'+
      '</div>'+
      '<div class="small muted" style="margin-top:14px">這組帳號只屬於你這一筆。錢匯進來系統會自動認人銷帳，不需要再通知財務或傳收據。</div>',
      '<button class="btn" onclick="closeModal();render()">知道了</button>'+
      '<button class="btn clay" onclick="simulateBankIn(\''+orderId+'\');closeModal();toast(\'模擬：款項已入帳，自動銷帳完成\',\'ok\');render()">模擬匯款入帳</button>');
  }else if(method==='transfer'){
    toast('已送出，等待財務確認收款'); render();
  }else{
    toast('繳費完成，發票已開立','ok'); render();
  }
}
function openReceipt(orderId){
  var o=orderById(orderId);
  openModal('<h3>繳費明細</h3><div class="small muted">'+esc(o.no)+'</div>',
    '<div class="grid" style="gap:10px">'+
    [['繳費單號',o.no],['項目',o.items.map(function(i){return i.name;}).join('、')],
     ['金額',money(o.amount)],['付款方式',o.method?PAY_METHOD[o.method].label:'—'],
     ['繳費日期',fmtFull(o.paidAt)],['交易序號',o.tradeNo||'—'],
     ['發票號碼',o.invoiceNo||'—'],['發票抬頭',o.title||'—'],['統一編號',o.taxId||'—'],
     ['銷帳方式',o.confirmedBy?('財務人工確認（'+o.confirmedBy+'）'):'系統自動']]
      .map(function(p){ return '<div class="spread small" style="padding:7px 0;border-bottom:1px solid var(--line-soft)">'+
        '<span class="muted">'+p[0]+'</span><b style="font-weight:500">'+esc(p[1])+'</b></div>'; }).join('')+
    '</div>',
    '<button class="btn" onclick="closeModal()">關閉</button>'+
    '<button class="btn primary" onclick="window.print()">列印</button>');
}

/* =========================================================================
   後台：費用與收款
   ========================================================================= */
var payFilter='all';
function admPay(){
  var r=receivables();
  var all=(DB.orders||[]).slice().sort(function(a,b){
    var rank={processing:0,unpaid:1,paid:2,cancelled:3,refunded:4};
    if(rank[a.status]!==rank[b.status]) return rank[a.status]-rank[b.status];
    return (b.createdAt||'').localeCompare(a.createdAt||'');
  });
  var rows = payFilter==='all'?all:all.filter(function(o){return o.status===payFilter;});

  return '<div class="page-head"><div class="spread wrap"><div><h2>費用與收款</h2>'+
    '<p>課程報名自動產生繳費單；繳費完成才可報到。匯款需財務確認銷帳。</p></div>'+
    '<button class="btn" onclick="exportPayCSV()">匯出對帳 CSV</button></div></div>'+

  '<div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(165px,1fr));margin-bottom:18px">'+
    stat('應收總額',money(r.total),'')+
    stat('已收',money(r.paid),'',true)+
    stat('未收',money(r.unpaid),'')+
    stat('待確認收據',r.nChecking,' 筆')+
    stat('逾期未繳',money(r.overdue),'')+
  '</div>'+

  (r.nChecking? '<div class="card pad" style="border-color:var(--info);background:var(--info-bg);margin-bottom:16px">'+
    '<b style="color:var(--info)">📄 有 '+r.nChecking+' 筆匯款收據待財務確認</b>'+
    '<div class="small" style="margin-top:3px">確認後學員端才會顯示已繳費並解鎖報到。</div></div>':'')+

  '<div class="row wrap" style="margin-bottom:14px">'+
    [['all','全部',all.length],['processing','待確認',r.nChecking],['unpaid','待繳費',r.nUnpaid],
     ['paid','已繳費',all.filter(function(o){return o.status==='paid';}).length]].map(function(f){
      return '<span class="chip" style="'+(payFilter===f[0]?'background:var(--ink);color:#fff;border-color:var(--ink)':'')+
        '" onclick="payFilter=\''+f[0]+'\';render()">'+f[1]+' '+f[2]+'</span>'; }).join('')+
  '</div>'+

  '<div class="card" style="overflow-x:auto">'+
  '<table><thead><tr><th>繳費單號</th><th>門店／加盟主</th><th>項目</th><th>金額</th><th>期限</th><th>付款方式</th><th>狀態</th><th>發票</th><th style="text-align:right">財務操作</th></tr></thead><tbody>'+
  rows.map(function(o){
    var s=store(o.storeId); if(!s) return '';
    var late=o.status==='unpaid'&&o.dueAt<todayStr();
    return '<tr>'+
      '<td class="mono small">'+esc(o.no)+'<div class="tiny muted">'+fmtFull(o.createdAt)+'</div></td>'+
      '<td class="small"><b>'+esc(s.name)+'</b><div class="tiny muted">'+esc(s.owner)+'</div></td>'+
      '<td class="small">'+o.items.map(function(i){return esc(i.name);}).join('<br>')+'</td>'+
      '<td class="mono"><b>'+money(o.amount)+'</b></td>'+
      '<td class="small mono"'+(late?' style="color:var(--bad)"':'')+'>'+fmt(o.dueAt)+'</td>'+
      '<td class="small muted">'+(o.method?PAY_METHOD[o.method].label:'—')+
        (o.receipt?'<div class="tiny" style="color:var(--clay)">📎 '+esc(o.receipt)+'</div>':'')+
        (o.vAccount?'<div class="tiny mono">'+esc(o.vAccount)+'</div>':'')+'</td>'+
      '<td><span class="tag '+ORDER_ST[o.status].tag+'">'+ORDER_ST[o.status].label+'</span>'+
        (late?'<div class="tiny" style="color:var(--bad)">逾期</div>':'')+'</td>'+
      '<td class="small mono muted">'+(o.invoiceNo?esc(o.invoiceNo):'—')+'</td>'+
      '<td style="text-align:right"><div class="row" style="justify-content:flex-end;gap:6px">'+
        (o.status==='processing'?
          '<button class="btn xs bad" onclick="confirmOrder(\''+o.id+'\',false,\'收據無法辨識\');toast(\'已退回收據\');render()">退回</button>'+
          '<button class="btn xs ok" onclick="confirmOrder(\''+o.id+'\',true);toast(\'已確認收款，學員端已解鎖\',\'ok\');render()">確認收款</button>':'')+
        (o.status==='unpaid'?
          '<button class="btn xs" onclick="toast(\'DEMO：正式版會發送 LINE／Email 催繳通知\')">催繳</button>'+
          '<button class="btn xs ok" onclick="confirmOrder(\''+o.id+'\',true);toast(\'已登錄收款\',\'ok\');render()">登錄收款</button>':'')+
      '</div></td>'+
    '</tr>';
  }).join('')+'</tbody></table>'+
  (rows.length?'':'<div class="empty"><span class="em">🧾</span>沒有符合條件的繳費單</div>')+'</div>'+

  '<div class="card pad" style="margin-top:18px">'+
    '<div class="spread" style="margin-bottom:12px"><h3>費用項目主檔</h3>'+
      '<span class="small muted">改價立即套用到之後產生的繳費單</span></div>'+
    '<div style="overflow-x:auto"><table><thead><tr><th>類別</th><th>項目</th><th>單價</th><th>單位</th><th>備註</th></tr></thead><tbody>'+
    DB.feeItems.map(function(f,i){
      return '<tr><td><span class="tag sand">'+FEE_KIND[f.kind].label+'</span></td>'+
        '<td class="small"><b>'+esc(f.name)+'</b></td>'+
        '<td style="width:150px"><input type="number" value="'+f.price+'" onchange="DB.feeItems['+i+'].price=parseInt(this.value||0,10);commit();toast(\'已更新單價\')"></td>'+
        '<td class="small muted">'+esc(f.unit)+'</td>'+
        '<td class="small muted">'+esc(f.note)+'</td></tr>';
    }).join('')+'</tbody></table></div>'+
  '</div>';
}
function exportPayCSV(){
  var head=['繳費單號','建立日','門店','加盟主','項目','金額','期限','付款方式','狀態','繳費日','交易序號','發票號碼','統編'];
  var lines=[head.join(',')];
  (DB.orders||[]).forEach(function(o){
    var s=store(o.storeId); if(!s) return;
    lines.push([o.no,o.createdAt,s.name,s.owner,o.items.map(function(i){return i.name;}).join('/'),
      o.amount,o.dueAt,o.method?PAY_METHOD[o.method].label:'',ORDER_ST[o.status].label,
      o.paidAt,o.tradeNo,o.invoiceNo,o.taxId].join(','));
  });
  var blob=new Blob(['\ufeff'+lines.join('\n')],{type:'text/csv;charset=utf-8'});
  var a=document.createElement('a'); a.href=URL.createObjectURL(blob);
  a.download='收款對帳_'+todayStr()+'.csv'; a.click(); toast('已匯出對帳 CSV','ok');
}

ensurePay();
