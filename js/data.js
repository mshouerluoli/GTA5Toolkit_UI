// data.js
// 从 UI/index.html 内嵌脚本拆分而来（2026-09-06）

// ============ 数据模型（与 C++ MenuItems.h 对齐） ============
// 这里t只用于JS内部判断是否是"子菜单导航"，不显示在界面上
// 循环/执行/开关的区别一律交给 C++ 处理，HTML 只管一个开关
const CATEGORIES = [
  { id:"player", name:"玩家", items:[
    {n:"无敌模式"},{n:"自动消星"},{n:"无碰撞体积"},
    {n:"角色防子弹"},{n:"角色防火烧"},{n:"角色防撞击"},{n:"角色防近战"},
    {n:"角色防无敌"},{n:"角色防爆炸"},{n:"角色防蒸汽"},{n:"角色防溺水"},{n:"角色防海水"},
    {n:"补满血量"},{n:"补满护甲"},{n:"玩家自杀"},{n:"雷达影踪"},{n:"无布娃娃"},{n:"角色隐形"},{n:"消除星星"},
  ]},
  { id:"world", name:"世界", items:[] },
  { id:"teleport", name:"传送", items:[
    {n:"【F4】坐标向前微调"},{n:"【F5】传送至导航点"},{n:"【F6】传送至目标点"},
  ]},
  { id:"weapon", name:"武器", items:[ {n:"无限弹药"} ]},
  { id:"mission", name:"任务", items:[ {n:"跳过任务"} ]},
  { id:"vehicle", name:"载具", items:[
    {n:"载具设置",sub:true},{n:"小型汽车",sub:true},{n:"轿车",sub:true},{n:"SUV",sub:true},{n:"轿跑车",sub:true},
    {n:"肌肉车",sub:true},{n:"经典跑车",sub:true},{n:"跑车",sub:true},{n:"超级跑车",sub:true},
    {n:"摩托车",sub:true},{n:"越野车",sub:true},{n:"工业用车",sub:true},{n:"公共事业用车",sub:true},
    {n:"厢型车",sub:true},{n:"自行车",sub:true},{n:"船",sub:true},{n:"直升机",sub:true},{n:"飞机",sub:true},
    {n:"服务用车",sub:true},{n:"特种车",sub:true},{n:"军用车",sub:true},{n:"商用车",sub:true},
    {n:"火车",sub:true},{n:"开轮式",sub:true},
  ]},
  { id:"protect", name:"保护", items:[ {n:"防弹"} ]},
  { id:"outfit", name:"装扮", items:[ {n:"更换装扮"} ]},
  { id:"setting", name:"设置", items:[ {n:"显示FPS"} ]},
  { id:"lua", name:"LUA", items:[ {n:"LUA脚本"} ]},
  { id:"log", name:"日志", items:[] },
];

// 车型数据从 vehicles.js 加载（由 VehicleHashData.h 自动生成）
// 全局 VEHICLE_DATA：23 分类，每项含 name + vehicles[{n:显示名, m:模型, mods:49项改装}]

const state = {}; // "catId:idx" -> true/false
CATEGORIES.forEach(c => c.items.forEach((it,i)=> state[c.id+":"+i]=false));

let currentCat = 0;
let subPath = null; // {classIdx}
let searchQuery = "";
let scrollStack = []; // 记录进入二级菜单前的滚动位置
const g_logs = [];   // 后端日志数组（「日志」分类显示）
