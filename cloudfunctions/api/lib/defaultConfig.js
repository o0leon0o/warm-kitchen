/**
 * defaultConfig.js —— 默认配置与结构补全
 *
 * 为什么要"补全"（normalize）：
 *   你以后会在云开发控制台手改 config 文档。手改难免删错字段或写成字符串，
 *   如果代码直接读 doc.ui.orderButton，一旦这个字段没了页面就会显示 undefined。
 *   所以每次读出来都跟默认值合并一次 —— 少一个字段不会崩，只是回到默认文案。
 */

function defaultConfig() {
  return {
    couple: {
      meOpenid: '',
      meName: '大厨',
      herOpenid: '',
      herName: '你',
      anniversary: ''
    },
    ui: {
      appTitle: '小厨房',
      emptyMenuText: '菜单还在准备中～',
      orderButton: '就吃这些',
      successTitle: '今晚有口福啦 ❤',
      successSubtitle: '我们马上开火 🔥',
      cartBarCount: '已选 {n} 道菜',
      remarkPlaceholder: '想说的话（可不写）：比如少放辣～'
    },
    notify: {
      wecomWebhook: '',
      enabled: false,
      atMobiles: []
    },
    /**
     * 分类（只有一级，5 个）。
     *
     * 为什么不多不少就这 5 个：分类的作用是"让她点得快"，不是把菜分清楚。
     * 每多一个分类她就要多划一下，两个人吃饭 5 个是上限。
     *
     * 顺序有讲究：主菜放第一个，因为它的菜最多、也最常点。
     * 汤排在素菜后面，因为你说"素菜有可能做汤有可能炒"，
     * 单独出来比混在素菜里更好找。
     *
     * ⚠️ "点外卖 / 出去吃" 已经删掉。它们是另一个维度（吃饭方式），
     *    将来要做的话应该做成页面顶部的模式切换，而不是塞进分类里。
     */
    categories: [
      { key: 'main', name: '主菜', icon: '🍗', enabled: true },
      { key: 'veg', name: '素菜', icon: '🥗', enabled: true },
      { key: 'soup', name: '汤', icon: '🍲', enabled: true },
      { key: 'staple', name: '主食', icon: '🍜', enabled: true },
      { key: 'dessert', name: '甜品', icon: '🍰', enabled: true }
    ],

    /**
     * 主菜的二级筛选（只对 category='main' 生效）。
     *
     * 为什么需要它：主菜会越加越多（估计 25~35 道），一个长列表翻了半天没用。
     * 为什么不做成"二级分类"：那会让数据结构变成树，录菜、改分类、
     * 迁移都要多一层。二级筛选只是"在结果里再滤一下"，成本低得多。
     *
     * 顺序即界面上按钮的顺序（不按菜品数量动态排序，免得按一下跳一下）。
     * 图标都挑的主流 emoji —— 生僻的在不同机型上会渲染成方块或怪东西。
     */
    subCategories: [
      { key: 'pork', name: '猪肉', icon: '🐷' },
      { key: 'beef', name: '牛肉', icon: '🐮' },
      { key: 'lamb', name: '羊肉', icon: '🐑' },
      { key: 'chicken', name: '鸡肉', icon: '🐔' },
      { key: 'fish', name: '鱼虾', icon: '🦐' },
      { key: 'egg', name: '蛋类', icon: '🥚' },
      { key: 'other', name: '其他', icon: '🍽' }
    ],
    /** 二级筛选默认停在哪个（空字符串 = 不筛，全部主菜） */
    defaultSubKey: '',
    /** 预置菜品是否已经灌过（防止 initData 跑两次把菜灌重） */
    seeded: false
  };
}

function normalizeConfig(doc) {
  if (!doc) return defaultConfig();
  const base = defaultConfig();
  const c = Object.assign({}, base, doc);
  c.couple = Object.assign({}, base.couple, doc.couple || {});
  c.ui = Object.assign({}, base.ui, doc.ui || {});
  c.notify = Object.assign({}, base.notify, doc.notify || {});
  if (!Array.isArray(doc.categories) || doc.categories.length === 0) {
    c.categories = base.categories;
  }
  return c;
}

module.exports = { defaultConfig, normalizeConfig };
