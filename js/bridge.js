// bridge.js
// 从 UI/index.html 内嵌脚本拆分而来（2026-09-06）

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
