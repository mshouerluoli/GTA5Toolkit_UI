// match.js
// 从 UI/index.html 内嵌脚本拆分而来（2026-09-06）

// ---- 模糊匹配：忽略空格/大小写/符号，支持子串+子序列+罗马数字 ----
function normText(s){
  let t=String(s).toLowerCase();
  // 独立罗马数字词 → 数字（mk ii -> mk 2）
  t=t.replace(/(?<![a-z])viii(?![a-z])/g,'8')
     .replace(/(?<![a-z])vii(?![a-z])/g,'7')
     .replace(/(?<![a-z])iii(?![a-z])/g,'3')
     .replace(/(?<![a-z])ii(?![a-z])/g,'2')
     .replace(/(?<![a-z])iv(?![a-z])/g,'4')
     .replace(/(?<![a-z])vi(?![a-z])/g,'6')
     .replace(/(?<![a-z])ix(?![a-z])/g,'9')
     .replace(/(?<![a-z])i(?![a-z])/g,'1')
     .replace(/(?<![a-z])v(?![a-z])/g,'5')
     .replace(/(?<![a-z])x(?![a-z])/g,'10');
  // 去空格/符号，保留数字/字母/中文
  return t.replace(/[^a-z0-9\u4e00-\u9fff]+/g,'');
}
function isSubseq(q,t){
  let i=0;
  for(let j=0;j<t.length && i<q.length;j++){ if(t[j]===q[i]) i++; }
  return i===q.length;
}
function fuzzyMatch(name, model, query){
  const q=normText(query); if(!q) return true;
  const n=normText(name), m=normText(model);
  // 子串（忽略空格/大小写/符号后）
  if (n.includes(q) || m.includes(q)) return true;
  // 子序列容错（仅查询词 >=3 字符时用，避免短词刷屏）
  if (q.length>=3 && (isSubseq(q,n) || isSubseq(q,m))) return true;
  return false;
}

function renderPanel(){
  const cat=CATEGORIES[currentCat];
  const title=document.getElementById("panelTitle");
  const list=document.getElementById("optionList");
  const searchWrap=document.getElementById("searchWrap");
  list.innerHTML="";

  // 搜索栏：仅在「载具」分类顶层显示
  const showSearch = (cat.id==="vehicle" && subPath==null);
  if (searchWrap) searchWrap.style.display = showSearch ? "block" : "none";

  // 子页面显示「返回上一级」
  if (subPath != null){
    const back=document.createElement("div");
    back.className="backbar";
    back.innerHTML='<span>&#8249;</span> 返回上一级';
    back.onclick=()=>{ subPath=null; renderAll(); scrollPanel(scrollStack.length ? scrollStack.pop() : 0); };
    list.appendChild(back);
  }

  // 载具 → 车型列表（每行一个「生成」按钮）
  if (cat.id==="vehicle" && subPath){
    const cls=VEHICLE_DATA[subPath.classIdx];
    if (!cls){
      title.innerHTML="载具设置";
      appendEmpty(list);
      return;
    }
    title.innerHTML=cls.name;
    cls.vehicles.forEach(v=> list.appendChild(makeSpawnRow(v)));
    return;
  }

  title.innerHTML=cat.name;

  // 「日志」分类：实时显示后端日志
  if (cat.id==="log"){
    renderLogs(list);
    return;
  }

  // 载具顶层 + 有搜索词 → 全库模糊搜索结果
  if (showSearch && searchQuery.trim()!==""){
    const q=searchQuery.trim();
    const results=[];
    VEHICLE_DATA.forEach(c=> c.vehicles.forEach(v=>{
      if (fuzzyMatch(v.n, v.m, q))
        results.push({n:v.n, m:v.m, mods:v.mods});
    }));
    if (results.length===0){ appendEmpty(list); return; }
    results.forEach(v=> list.appendChild(makeSpawnRow(v)));
    return;
  }

  if (cat.items.length===0){ appendEmpty(list); return; }

  cat.items.forEach((it,i)=>{
    if (it.sub){
      // 子菜单入口：名字 + 右箭头
      const row=document.createElement("div");
      row.className="option";
      row.innerHTML='<span class="name">'+it.n+'</span><span class="chev">&#8250;</span>';
      row.onclick=(e)=>{ e.preventDefault(); scrollStack.push(getPanelScroll()); const classIdx=i-1; subPath={classIdx}; renderAll(); scrollPanel(0); };
      list.appendChild(row);
    } else {
      list.appendChild( makeSwitchRow(cat.id, i, it.n) );
    }
  });
}

function appendEmpty(list){
  const d=document.createElement("div");
  d.style.color="#8b98a8"; d.style.padding="20px 0";
  d.textContent="（该分类暂无功能项）";
  list.appendChild(d);
}

// 「日志」分类：逐行显示后端日志
function renderLogs(list){
  // 空日志：不显示任何提示，直接留白
  if (g_logs.length===0){ return; }
  const pre=document.createElement("div");
  pre.style.cssText="white-space:pre-wrap; word-break:break-all; font-family:'GTAFont'; font-size:12px; line-height:1.5; color:#9ae6b4; padding:10px; background:rgba(0,0,0,.35); border-radius:8px; border:1px solid rgba(255,255,255,.08);";
  pre.textContent=g_logs.join("\n");
  list.appendChild(pre);
}

// 生成按钮点击反馈：弹出动画 + 变「✓ 已生成」，700ms 后恢复
function spawnFeedback(btn){
  if (btn.dataset.busy) return;
  btn.dataset.busy="1";
  const orig=btn.textContent;
  btn.classList.add("spawned");
  btn.textContent="✓ 已生成";
  setTimeout(()=>{ btn.classList.remove("spawned"); btn.textContent=orig; delete btn.dataset.busy; }, 700);
}

// 生成行（名字 + 生成按钮）；供车型列表和搜索结果复用
function makeSpawnRow(v){
  const row=document.createElement("div");
  row.className="option";
  row.innerHTML='<span class="name">'+v.n+'</span><button class="spawn-btn">生成</button>';
  const btn=row.querySelector(".spawn-btn");
  const fire=(e)=>{ e.preventDefault(); spawnFeedback(btn); send("spawnVehicle",{model:v.m,mods:v.mods}); };
  row.onclick=fire;
  btn.onclick=(e)=>{ e.stopPropagation(); fire(e); };
  return row;
}

function getPanelScroll(){ const p=document.querySelector('.panel'); return p ? p.scrollTop : 0; }
function scrollPanel(top){ const p=document.querySelector('.panel'); if(p) p.scrollTop=top; }

// ============ 窗口控制按钮 + 顶栏拖拽（复刻 WebView2 Launcher） ============
['minimizeBtn','maximizeBtn','closeBtn'].forEach(id=>{
  const btn=document.getElementById(id);
  if (!btn) return;
  btn.addEventListener('click', ()=>{
    const action = id==='minimizeBtn' ? 'minimize' : (id==='maximizeBtn' ? 'maximize' : 'close');
    send('windowControl', { action });
  });
});

const topBar=document.getElementById('topBar');
if (topBar){
  topBar.addEventListener('mousedown', (e)=>{
    if (e.button!==0) return;
    if (e.target.closest('button')) return;  // 按钮不触发拖拽
    send('windowControl', { action:'move' });
    e.preventDefault();
  });
  topBar.addEventListener('dblclick', (e)=>{
    if (e.target.closest('button')) return;
    send('windowControl', { action:'maximize' });  // C++ maximize 自带切换
    e.preventDefault();
  });
}

function renderAll(){ renderSidebar(); renderPanel(); }

// ============ 通信层 ============
// 分工：
//   · 业务消息（init / command / spawnVehicle）→ WebSocket 直连游戏进程内的 DLL
//   · 窗口控制（minimize / maximize / close / move）→ 仍走 WebView2 宿主桥接
//     （窗口是宿主的，游戏里的 DLL 管不了浏览器/宿主窗口，所以这条不动）
const WS_PORT = 9002;

let ws = null;
let wsTimer = null;
let wsAutoReconnect = true;
let wsConnected = false;

function isHost(){
  return !!(window.chrome && window.chrome.webview && window.chrome.webview.postMessage);
}
function postToHost(text){
  if (isHost()) window.chrome.webview.postMessage(text);
}

// 顶栏右上角的状态灯
function setConn(text, color){
  const el = document.getElementById("connStatus");
  if (!el) return;
  el.innerHTML = '<span style="display:inline-block;width:8px;height:8px;border-radius:50%;'+
                 'background:'+color+';margin-right:6px;vertical-align:middle;'+
                 'box-shadow:0 0 6px '+color+';"></span>'+text;
}

function wsConnect(){
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;
  setConn("连接中…", "#f59e0b");

  let sock;
  try { sock = new WebSocket("ws://127.0.0.1:" + WS_PORT + "/"); }
  catch (err){ setConn("地址错误", "#ef4444"); return; }

  ws = sock;
  sock.onopen = ()=>{ wsConnected = true; setConn("已连接 " + WS_PORT, "#22c55e"); };
  sock.onmessage = (ev)=> onBackendMessage(ev.data);
  sock.onerror = ()=>{ wsConnected = false; setConn("连接错误", "#ef4444"); };
  sock.onclose = ()=>{
    wsConnected = false;
    setConn("未连接", "#8b98a8");
    if (ws === sock) ws = null;
    if (wsAutoReconnect && !wsTimer){
      wsTimer = setTimeout(()=>{ wsTimer = null; wsConnect(); }, 2000);
    }
  };
}

// 所有对外发送统一走这里
function send(cmd, payload){
  const text = JSON.stringify({ cmd, payload });

  // 窗口控制：维持原 WebView2 通道不变
  if (cmd === "windowControl"){
    postToHost(text);
    return;
  }

  // 业务消息：走 WebSocket
  if (ws && ws.readyState === WebSocket.OPEN){
    ws.send(text);
  } else {
    console.log("[ws] 未连接，消息未发送:", text);
  }
}

// ============ 初始化按钮 ============
// 原 C++ 是启动就自动初始化；现在改成由用户点击触发，点击后向后端发 {cmd:"init"}
let initState = "idle";  // idle | init | ok | fail
const initBtn = document.getElementById("initBtn");
function setInitBtn(label, cls){
  if (!initBtn) return;
  initBtn.textContent = label;
  initBtn.className = "init-btn" + (cls ? " "+cls : "");
}
function doInit(){
  // 没连上游戏时先尝试连一次，别让用户干等 5 秒超时
  if (!(ws && ws.readyState === WebSocket.OPEN)){
    wsConnect();
    initState = "fail";
    setInitBtn("未连接游戏", "fail");
    setTimeout(()=>{ if (initState === "fail") setInitBtn("初始化", ""); }, 1600);
    return;
  }
  if (initState === "init") return;  // 防止重复触发
  initState = "init";
  setInitBtn("初始化中…", "busy");
  send("init", {});
  // 真正等待后端 initResult；若超时仍未收到回应，兜底为失败（不乐观抢答成成功）
  setTimeout(()=>{
    if (initState === "init"){ initState = "fail"; setInitBtn("初始化失败", "fail"); }
  }, 5000);
}
if (initBtn) initBtn.addEventListener("click", doInit);

// 监听后端下发的初始化结果（后端写完 initResult 后生效）
function onBackendMessage(raw){
  let msg;
  try{
    if (typeof raw === "string") msg = JSON.parse(raw);
    else if (raw && raw.data != null) msg = typeof raw.data === "string" ? JSON.parse(raw.data) : raw.data;
    else msg = raw;
  }catch(err){ return; }
  if (msg && msg.cmd === "initResult"){
    const ok = !!(msg.payload && msg.payload.ok);
    initState = ok ? "ok" : "fail";
    setInitBtn(ok ? "✓ 已初始化" : "初始化失败", ok ? "ok" : "fail");
  }
  if (msg && msg.cmd === "log"){
    const text = (msg.payload && msg.payload.text) || "";
    g_logs.push(text);
    // 当前在「日志」分类时实时刷新，否则切到日志分类时一次性显示
    if (CATEGORIES[currentCat] && CATEGORIES[currentCat].id === "log"){
      const list=document.getElementById("optionList");
      if (list) renderLogs(list);
    }
  }
}
if (window.chrome && window.chrome.webview && window.chrome.webview.addEventListener){
  window.chrome.webview.addEventListener("message", onBackendMessage);
}
// 纯浏览器预览/调试：允许通过 window.postMessage 模拟后端消息（生产 WebView2 不受影响）
window.addEventListener("message", (e)=>onBackendMessage(e.data));

// 搜索框输入 → 实时过滤
const searchInput=document.getElementById("searchInput");
if (searchInput){
  searchInput.addEventListener("input", ()=>{ searchQuery=searchInput.value; renderPanel(); scrollPanel(0); });
}

renderAll();

// 启动 WebSocket（业务消息通道）；窗口控制仍由 WebView2 宿主处理
setConn("未连接", "#8b98a8");
wsConnect();
console.log("[ui ready] GTA5 Toolkit HTML UI (WebSocket 通道)");
