// main.js
// 从 UI/index.html 内嵌脚本拆分而来（2026-09-06）

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
