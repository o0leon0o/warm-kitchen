/**
 * theme.js —— 主题与文案常量（代码里需要用到颜色的地方统一从这里取）
 *
 * 想换配色？改这一个文件即可（改完保存，开发者工具会自动重新编译）。
 * 想改界面上的文字？不用改这里，去云开发控制台的 config 集合改 ui 字段（改完不用重新上传代码）。
 */

const theme = {
  // ---- 主色 ----
  primary: '#F76B8A',        // 主色（按钮、选中态）
  primaryLight: '#FCE4EA',   // 主色浅版（标签底色）
  primaryDark: '#E44E70',    // 按下态

  // ---- 背景 ----
  bg: '#FFF7F9',             // 页面背景（浅浅的粉）
  card: '#FFFFFF',           // 卡片背景
  border: '#F0E4E8',         // 分隔线

  // ---- 文字 ----
  text: '#2B2B2B',           // 主要文字
  textSub: '#7A7A7A',        // 次要文字
  textLight: '#B5B5B5',      // 提示文字 / 占位
  textOnPrimary: '#FFFFFF',  // 主色底上的文字

  // ---- 状态色 ----
  favorite: '#F76B8A',       // 「她爱吃 ♥」
  warning: '#E8A33D',
  danger: '#E45B5B',
  success: '#4CAF7D'
};

/** 把这些颜色同时写进 WXSS 变量，方便 wxml 里用 class 而不是内联样式 */
const cssVars = [
  `--c-primary:${theme.primary}`,
  `--c-primary-light:${theme.primaryLight}`,
  `--c-bg:${theme.bg}`,
  `--c-card:${theme.card}`,
  `--c-border:${theme.border}`,
  `--c-text:${theme.text}`,
  `--c-text-sub:${theme.textSub}`,
  `--c-text-light:${theme.textLight}`
].join(';');

/** 界面文案的兜底默认值。真正的文案在云数据库 config/app.ui 里，改了不用重新上传代码。 */
const defaultCopy = {
  appTitle: '小厨房',
  emptyMenuText: '菜单还在准备中～',
  orderButton: '就吃这些',
  successTitle: '今晚有口福啦 ❤',
  successSubtitle: '我们马上开火 🔥',
  cartBarEmpty: '还没选菜哦',
  cartBarCount: '已选 {n} 道菜',
  remarkPlaceholder: '想说的话（可不写）：比如少放辣～'
};

/**
 * 主菜二级筛选的兜底定义（正常从云端 config.subCategories 读）。
 *
 * 顺序即界面上的按钮顺序 —— 故意**不按菜品数量动态排序**，
 * 否则她点一下按钮就会跳一下位置，很难受。
 */
const defaultSubCategories = [
  { key: 'pork', name: '猪肉', icon: '🐷' },
  { key: 'beef', name: '牛肉', icon: '🐮' },
  { key: 'lamb', name: '羊肉', icon: '🐑' },
  { key: 'chicken', name: '鸡肉', icon: '🐔' },
  { key: 'fish', name: '鱼虾', icon: '🦐' },
  { key: 'egg', name: '蛋类', icon: '🥚' },
  { key: 'other', name: '其他', icon: '🍽' }
];

/** 分类数量超过这个数，tab 才变成可横向滚动；否则等分铺满一行 */
const CAT_SCROLL_THRESHOLD = 5;

module.exports = {
  theme,
  cssVars,
  defaultCopy,
  defaultSubCategories,
  CAT_SCROLL_THRESHOLD
};
