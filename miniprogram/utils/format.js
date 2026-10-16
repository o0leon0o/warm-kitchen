/**
 * format.js —— 格式化小工具（日期、口味标签、文案占位符）
 */

function pad2(n) {
  return n < 10 ? '0' + n : '' + n;
}

/** 时间戳/日期 → '2026-10-16' */
function toDateStr(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** 时间戳 → '10月16日 19:30' */
function toNiceTime(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '';
  return `${d.getMonth() + 1}月${d.getDate()}日 ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

/** 时间戳 → '刚刚 / 3分钟前 / 昨天 19:30 / 10月16日 19:30' */
function toRelative(input) {
  const d = input instanceof Date ? input : new Date(input);
  if (isNaN(d.getTime())) return '';
  const now = Date.now();
  const diff = now - d.getTime();
  const min = 60 * 1000;
  const hour = 60 * min;

  if (diff < min) return '刚刚';
  if (diff < hour) return `${Math.floor(diff / min)} 分钟前`;

  const today = toDateStr(now);
  const that = toDateStr(d);
  if (that === today) return `今天 ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

  const yesterday = toDateStr(now - 24 * hour);
  if (that === yesterday) return `昨天 ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

  return toNiceTime(d);
}

/** 辣度数字 → 显示文字与辣椒图标 */
function spicyLabel(level) {
  const n = Number(level) || 0;
  if (n <= 0) return '';
  const chili = '🌶'.repeat(Math.min(n, 3));
  const text = ['', '微辣', '中辣', '重辣'][Math.min(n, 3)];
  return `${chili} ${text}`;
}

/** '已选 {n} 道菜' → '已选 3 道菜' */
function fill(template, vars) {
  if (!template) return '';
  return template.replace(/\{(\w+)\}/g, (m, key) => {
    return vars && vars[key] !== undefined && vars[key] !== null ? String(vars[key]) : m;
  });
}

/** 秒 → '30 分钟' / '1 小时 20 分钟' */
function toDuration(seconds) {
  const s = Number(seconds) || 0;
  if (s < 60) return `${s} 秒`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} 分钟`;
  return `${Math.floor(m / 60)} 小时 ${m % 60} 分钟`;
}

/** 统一的小提示（比 wx.showToast 更克制，不弹图标） */
function toast(title, icon) {
  wx.showToast({ title: String(title || ''), icon: icon || 'none', duration: 1800 });
}

module.exports = {
  pad2,
  toDateStr,
  toNiceTime,
  toRelative,
  spicyLabel,
  fill,
  toDuration,
  toast
};
