// init.js
// 从 UI/index.html 内嵌脚本拆分而来（2026-09-06）

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
