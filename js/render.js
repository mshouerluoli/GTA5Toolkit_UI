// render.js
// 从 UI/index.html 内嵌脚本拆分而来（2026-09-06）

// ============ 渲染 ============
function renderSidebar(){
  const sb=document.getElementById("sidebarScroll"); sb.innerHTML="";
  CATEGORIES.forEach((c,i)=>{
    const d=document.createElement("div");
    d.className="cat"+(i===currentCat?" active":""); d.textContent=c.name;
    d.onclick=()=>{ currentCat=i; subPath=null; scrollStack=[]; renderAll(); scrollPanel(0); };
    sb.appendChild(d);
  });
}

// 生成一个统一开关行
function makeSwitchRow(cat, idx, name){
  const row=document.createElement("div");
  row.className="option";
  const key=cat+":"+idx;
  const on=!!state[key];
  row.innerHTML = '<span class="name">'+name+'</span>'+
    '<label class="switch"><input type="checkbox"'+(on?' checked':'')+'><span class="slider"></span></label>';
  const cb=row.querySelector("input");
  row.onclick=(e)=>{ e.preventDefault(); cb.checked=!cb.checked; state[key]=cb.checked; send("command",{category:cat,option:idx,state:cb.checked}); };
  cb.onchange=()=>{ state[key]=cb.checked; send("command",{category:cat,option:idx,state:cb.checked}); };
  return row;
}

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
